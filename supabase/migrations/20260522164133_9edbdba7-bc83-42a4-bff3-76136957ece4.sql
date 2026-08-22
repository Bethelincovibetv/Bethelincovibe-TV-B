
-- Extend user_ads for native ad server
ALTER TABLE public.user_ads
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS impressions bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS external_origin text,
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'blog';

CREATE INDEX IF NOT EXISTS idx_user_ads_active_window
  ON public.user_ads (status, starts_at, ends_at) WHERE status = 'active';

-- Event log
CREATE TABLE IF NOT EXISTS public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.user_ads(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('impression','click')),
  page_path text,
  referrer text,
  origin text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON public.ad_events (ad_id, created_at DESC);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view ad events" ON public.ad_events
  FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owners view own ad events" ON public.ad_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_ads a WHERE a.id = ad_events.ad_id AND a.user_id = auth.uid()));

-- Developer API keys
CREATE TABLE IF NOT EXISTS public.ad_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes jsonb NOT NULL DEFAULT '["read"]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ad api keys" ON public.ad_api_keys
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Functions
CREATE OR REPLACE FUNCTION public.serve_random_ad(_placement text DEFAULT 'blog')
RETURNS TABLE (id uuid, title text, description text, image_url text, target_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT a.id, a.title, a.description, a.image_url, a.target_url INTO r
  FROM public.user_ads a
  WHERE a.status = 'active'
    AND (a.starts_at IS NULL OR a.starts_at <= now())
    AND (a.ends_at IS NULL OR a.ends_at >= now())
    AND (a.placement = _placement OR a.placement = 'all')
  ORDER BY random() LIMIT 1;
  IF r.id IS NULL THEN RETURN; END IF;
  UPDATE public.user_ads SET impressions = impressions + 1 WHERE user_ads.id = r.id;
  id := r.id; title := r.title; description := r.description;
  image_url := r.image_url; target_url := r.target_url;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.record_ad_click(_ad_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  UPDATE public.user_ads SET clicks = clicks + 1 WHERE id = _ad_id RETURNING target_url INTO v_url;
  RETURN v_url;
END $$;

CREATE OR REPLACE FUNCTION public.approve_user_ad(_ad_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days int;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT duration_days INTO v_days FROM public.user_ads WHERE id = _ad_id;
  IF v_days IS NULL THEN RETURN false; END IF;
  UPDATE public.user_ads
    SET status = 'active', approved_at = now(), approved_by = auth.uid(),
        starts_at = now(), ends_at = now() + make_interval(days => v_days),
        rejection_reason = NULL
    WHERE id = _ad_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.reject_user_ad(_ad_id uuid, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_cost numeric; v_status text;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT user_id, cost_amount, status INTO v_user, v_cost, v_status FROM public.user_ads WHERE id = _ad_id;
  IF v_user IS NULL THEN RETURN false; END IF;
  UPDATE public.user_ads SET status = 'rejected', rejection_reason = _reason WHERE id = _ad_id;
  IF v_status <> 'rejected' AND v_cost > 0 THEN
    PERFORM public.topup_wallet(v_user, v_cost, 'Refund: ad rejected');
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.verify_ad_api_key(_key text)
RETURNS TABLE (id uuid, scopes jsonb) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hash text;
BEGIN
  v_hash := encode(digest(_key, 'sha256'), 'hex');
  RETURN QUERY
    SELECT k.id, k.scopes FROM public.ad_api_keys k
    WHERE k.key_hash = v_hash AND k.active = true;
END $$;

-- pgcrypto needed for digest
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed settings
INSERT INTO public.site_settings (key, value) VALUES
  ('ai_provider', 'lovable'),
  ('ai_text_model', 'google/gemini-2.5-flash'),
  ('ad_server_enabled', 'true')
ON CONFLICT DO NOTHING;

-- Remove obsolete GGD setting (best effort)
DELETE FROM public.site_settings WHERE key = 'ggd_ad_network_api_key';
