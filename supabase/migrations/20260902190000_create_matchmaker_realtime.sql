-- Smart Opportunity Matchmaker: shared realtime persistence.
-- Requests/offers must be available across devices and authenticated sessions.

CREATE TABLE IF NOT EXISTS public.business_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  customer_avatar text,
  customer_phone text,
  customer_email text,
  raw_prompt text NOT NULL,
  category text NOT NULL,
  category_slug text NOT NULL DEFAULT '',
  service_title text NOT NULL,
  service_type text NOT NULL DEFAULT 'service',
  purpose text NOT NULL DEFAULT '',
  budget numeric,
  budget_formatted text NOT NULL DEFAULT '',
  budget_type text NOT NULL DEFAULT 'negotiable',
  deadline text NOT NULL DEFAULT '',
  deadline_date timestamptz,
  urgency text NOT NULL DEFAULT 'medium',
  location_preference text NOT NULL DEFAULT '',
  specific_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  clarification_notes text,
  status text NOT NULL DEFAULT 'OPEN',
  matched_provider_ids uuid[] NOT NULL DEFAULT '{}',
  matched_provider_count integer NOT NULL DEFAULT 0,
  expanded_search boolean NOT NULL DEFAULT false,
  selected_offer_id uuid,
  selected_provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  selected_business_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  selected_business_name text,
  agreed_price numeric,
  payment_status text NOT NULL DEFAULT 'unpaid',
  views_count integer NOT NULL DEFAULT 0,
  offers_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE TABLE IF NOT EXISTS public.provider_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.business_requests(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name text NOT NULL DEFAULT '',
  provider_avatar text,
  business_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  business_slug text NOT NULL DEFAULT '',
  business_logo_url text,
  business_category text NOT NULL DEFAULT '',
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  proposed_price numeric NOT NULL,
  delivery_time text NOT NULL DEFAULT '',
  proposal text NOT NULL,
  portfolio_samples jsonb NOT NULL DEFAULT '[]'::jsonb,
  clarification_question text,
  status text NOT NULL DEFAULT 'submitted',
  ai_match_score numeric,
  ai_match_badge text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, provider_user_id)
);

CREATE TABLE IF NOT EXISTS public.provider_opportunity_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  notifications_enabled boolean NOT NULL DEFAULT true,
  subscribed_categories text[] NOT NULL DEFAULT '{}',
  min_budget numeric NOT NULL DEFAULT 5000,
  max_budget numeric NOT NULL DEFAULT 1000000,
  preferred_locations text[] NOT NULL DEFAULT '{}',
  instant_push_alerts boolean NOT NULL DEFAULT true,
  instant_sound_alerts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opportunity_matching_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  system_enabled boolean NOT NULL DEFAULT true,
  ai_understanding_enabled boolean NOT NULL DEFAULT true,
  auto_matching_enabled boolean NOT NULL DEFAULT true,
  provider_notifications_enabled boolean NOT NULL DEFAULT true,
  max_providers_per_request integer NOT NULL DEFAULT 20,
  min_match_score numeric NOT NULL DEFAULT 70,
  request_expiration_days integer NOT NULL DEFAULT 7,
  allow_sponsored_providers boolean NOT NULL DEFAULT true,
  require_verified_providers boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.opportunity_matching_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS business_requests_user_id_idx ON public.business_requests(user_id);
CREATE INDEX IF NOT EXISTS business_requests_status_idx ON public.business_requests(status);
CREATE INDEX IF NOT EXISTS business_requests_created_at_idx ON public.business_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS provider_offers_request_id_idx ON public.provider_offers(request_id);
CREATE INDEX IF NOT EXISTS provider_offers_provider_user_id_idx ON public.provider_offers(provider_user_id);

ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_opportunity_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_matching_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can create own requests" ON public.business_requests;
CREATE POLICY "Customers can create own requests" ON public.business_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view relevant requests" ON public.business_requests;
CREATE POLICY "Users can view relevant requests" ON public.business_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = ANY(matched_provider_ids) OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "Customers can update own requests" ON public.business_requests;
CREATE POLICY "Customers can update own requests" ON public.business_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Matched providers can submit offers" ON public.provider_offers;
CREATE POLICY "Matched providers can submit offers" ON public.provider_offers FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = provider_user_id AND EXISTS (
    SELECT 1 FROM public.business_requests r WHERE r.id = request_id AND (auth.uid() = ANY(r.matched_provider_ids) OR public.has_role(auth.uid(),'admin'::app_role))
  )
);
DROP POLICY IF EXISTS "Offer participants can view offers" ON public.provider_offers;
CREATE POLICY "Offer participants can view offers" ON public.provider_offers FOR SELECT TO authenticated USING (
  auth.uid() = provider_user_id OR EXISTS (SELECT 1 FROM public.business_requests r WHERE r.id = request_id AND r.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
);
DROP POLICY IF EXISTS "Offer owners can update offers" ON public.provider_offers;
CREATE POLICY "Offer owners can update offers" ON public.provider_offers FOR UPDATE TO authenticated USING (auth.uid() = provider_user_id OR public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (auth.uid() = provider_user_id OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Users manage own opportunity preferences" ON public.provider_opportunity_preferences;
CREATE POLICY "Users manage own opportunity preferences" ON public.provider_opportunity_preferences FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users read matchmaker config" ON public.opportunity_matching_config;
CREATE POLICY "Authenticated users read matchmaker config" ON public.opportunity_matching_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage matchmaker config" ON public.opportunity_matching_config;
CREATE POLICY "Admins manage matchmaker config" ON public.opportunity_matching_config FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Realtime publication: clients receive new/changed requests and offers immediately.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.business_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_offers; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE OR REPLACE FUNCTION public.touch_matchmaker_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS business_requests_updated_at ON public.business_requests;
CREATE TRIGGER business_requests_updated_at BEFORE UPDATE ON public.business_requests FOR EACH ROW EXECUTE FUNCTION public.touch_matchmaker_updated_at();
DROP TRIGGER IF EXISTS provider_offers_updated_at ON public.provider_offers;
CREATE TRIGGER provider_offers_updated_at BEFORE UPDATE ON public.provider_offers FOR EACH ROW EXECUTE FUNCTION public.touch_matchmaker_updated_at();
