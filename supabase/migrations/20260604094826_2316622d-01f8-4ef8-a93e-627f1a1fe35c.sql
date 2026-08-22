
-- ============ SALES PAGE TEMPLATES ============
CREATE TABLE IF NOT EXISTS public.sales_page_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  enabled boolean not null default true,
  is_premium boolean not null default false,
  premium_price numeric not null default 0,
  is_default boolean not null default false,
  preview_thumbnail text,
  accent_color text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.sales_page_templates TO anon, authenticated;
GRANT ALL ON public.sales_page_templates TO service_role;
ALTER TABLE public.sales_page_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates viewable by all" ON public.sales_page_templates FOR SELECT USING (true);
CREATE POLICY "admins manage templates" ON public.sales_page_templates FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.sales_page_templates (key, name, description, accent_color, display_order, is_default) VALUES
  ('lagos_bold','Lagos Bold','Dark background, large hero, bold headline, bright CTA. Best for fashion, food, lifestyle.','#f43f5e',1,true),
  ('clean_pro','Clean Pro','Light minimal layout, professional typography. Best for services and digital products.','#2563eb',2,false),
  ('fire_sale','Fire Sale','Urgent red/orange tones, prominent countdown, scarcity messaging.','#ef4444',3,false),
  ('premium_gold','Premium Gold','Dark navy with gold accents, luxury feel. Best for high-ticket products.','#d4af37',4,false),
  ('trust_builder','Trust Builder','Testimonial-heavy with trust badges and FAQ. Best for new businesses.','#10b981',5,false),
  ('story_seller','Story Seller','Narrative problem→solution layout. Best for coaching and courses.','#8b5cf6',6,false)
ON CONFLICT (key) DO NOTHING;

-- ============ SALES PAGE COLUMNS ============
ALTER TABLE public.sales_pages
  ADD COLUMN IF NOT EXISTS template_key text NOT NULL DEFAULT 'lagos_bold',
  ADD COLUMN IF NOT EXISTS lead_capture_enabled boolean NOT NULL DEFAULT true;

-- ============ SALES PAGE LEADS ============
CREATE TABLE IF NOT EXISTS public.sales_page_leads (
  id uuid primary key default gen_random_uuid(),
  sales_page_id uuid not null,
  user_id uuid not null, -- owner of the sales page (denormalized for RLS)
  name text not null,
  phone text not null,
  email text,
  message text,
  status text not null default 'new', -- new|contacted|converted|rejected
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_sales_page_leads_page ON public.sales_page_leads(sales_page_id);
CREATE INDEX IF NOT EXISTS idx_sales_page_leads_user ON public.sales_page_leads(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_page_leads TO authenticated;
GRANT INSERT ON public.sales_page_leads TO anon;
GRANT ALL ON public.sales_page_leads TO service_role;
ALTER TABLE public.sales_page_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead" ON public.sales_page_leads FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Owners & admins view leads" ON public.sales_page_leads FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owners & admins update leads" ON public.sales_page_leads FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owners & admins delete leads" ON public.sales_page_leads FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

-- ============ SALES PAGE EVENTS extras ============
ALTER TABLE public.sales_page_events
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS source text;

-- ============ SUPPLIERS boost warning ============
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS boost_warning_sent boolean NOT NULL DEFAULT false;

-- ============ SEED SETTINGS ============
INSERT INTO public.site_settings (key, value) VALUES
  ('leads_enabled_global','true'),
  ('site_logo_url','https://gndcgttnpxsjufmehgyi.supabase.co/storage/v1/object/public/slider-images/logo.png'),
  ('boost_packages','[{"key":"1d","days":1,"price":500,"label":"1 Day"},{"key":"3d","days":3,"price":1200,"label":"3 Days"},{"key":"7d","days":7,"price":2500,"label":"1 Week"},{"key":"14d","days":14,"price":4500,"label":"2 Weeks"},{"key":"30d","days":30,"price":8000,"label":"1 Month"},{"key":"90d","days":90,"price":20000,"label":"3 Months"}]')
ON CONFLICT (key) DO NOTHING;

-- ============ LEAD PUSH TRIGGER ============
CREATE OR REPLACE FUNCTION public.notify_sales_page_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_page text;
BEGIN
  SELECT user_id, product_name INTO v_owner, v_page
  FROM public.sales_pages WHERE id = NEW.sales_page_id;
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.user_notifications (user_id, title, body, url, type)
  VALUES (v_owner, 'New lead captured 🎯',
          NEW.name || ' is interested in ' || COALESCE(v_page,'your product'),
          '/dashboard/leads','lead');

  PERFORM public.send_push_to_user_via_onesignal(
    v_owner,
    'New lead captured 🎯',
    NEW.name || ' (' || NEW.phone || ') is interested in ' || COALESCE(v_page,'your product'),
    '/dashboard/leads'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_lead ON public.sales_page_leads;
CREATE TRIGGER trg_notify_lead
AFTER INSERT ON public.sales_page_leads
FOR EACH ROW EXECUTE FUNCTION public.notify_sales_page_lead();

-- ============ BOOST EXPIRY ============
CREATE OR REPLACE FUNCTION public.expire_business_boosts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  -- 24h warning
  FOR r IN
    SELECT s.id, s.name, s.submitted_by, s.boosted_until, s.slug
    FROM public.suppliers s
    WHERE s.boosted_until IS NOT NULL
      AND s.boost_warning_sent = false
      AND s.boosted_until > now()
      AND s.boosted_until <= now() + interval '24 hours'
  LOOP
    PERFORM public.send_push_to_user_via_onesignal(
      r.submitted_by,
      'Boost expiring soon ⏰',
      'Your boost for ' || r.name || ' expires in 24 hours. Renew to stay featured.',
      '/dashboard/businesses/' || r.id::text || '/boost'
    );
    INSERT INTO public.user_notifications (user_id, title, body, url, type)
    VALUES (r.submitted_by,'Boost expiring soon',
      'Your boost for ' || r.name || ' expires in 24 hours.',
      '/dashboard/businesses/' || r.id::text || '/boost','boost');
    UPDATE public.suppliers SET boost_warning_sent = true WHERE id = r.id;
  END LOOP;

  -- Expire & notify
  FOR r IN
    SELECT s.id, s.name, s.submitted_by
    FROM public.suppliers s
    WHERE s.boosted_until IS NOT NULL
      AND s.boosted_until <= now()
      AND (s.featured = true OR s.boost_warning_sent = true)
  LOOP
    UPDATE public.suppliers SET featured = false, boost_warning_sent = false WHERE id = r.id;
    UPDATE public.business_boosts SET status='expired' WHERE business_id = r.id AND status='active';
    PERFORM public.send_push_to_user_via_onesignal(
      r.submitted_by,
      'Boost expired',
      'Your boost for ' || r.name || ' has expired. Renew now to keep top placement.',
      '/dashboard/businesses/' || r.id::text || '/boost'
    );
    INSERT INTO public.user_notifications (user_id, title, body, url, type)
    VALUES (r.submitted_by,'Boost expired',
      'Your boost for ' || r.name || ' has expired.',
      '/dashboard/businesses/' || r.id::text || '/boost','boost');
  END LOOP;
END $$;

-- ============ updated_at trigger for leads & templates ============
DROP TRIGGER IF EXISTS trg_leads_updated ON public.sales_page_leads;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.sales_page_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_templates_updated ON public.sales_page_templates;
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.sales_page_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
