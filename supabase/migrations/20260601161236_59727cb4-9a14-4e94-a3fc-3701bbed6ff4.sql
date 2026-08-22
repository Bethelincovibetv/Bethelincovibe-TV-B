
-- Sales Pages
CREATE TABLE public.sales_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid,
  slug text NOT NULL UNIQUE,
  product_name text NOT NULL,
  product_description text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  contact_whatsapp text,
  contact_phone text,
  contact_email text,
  product_image_url text,
  image_source text DEFAULT 'upload',
  headline text,
  subheadline text,
  problem text,
  solution text,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_proof jsonb NOT NULL DEFAULT '[]'::jsonb,
  urgency text,
  cta_text text DEFAULT 'Order Now',
  seo_title text,
  seo_description text,
  og_image_url text,
  countdown_ends_at timestamptz,
  views_count integer NOT NULL DEFAULT 0,
  clicks_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sales_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_pages TO authenticated;
GRANT ALL ON public.sales_pages TO service_role;

ALTER TABLE public.sales_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active sales pages"
ON public.sales_pages FOR SELECT
USING ((active = true AND status = 'active') OR auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Owners create their own pages"
ON public.sales_pages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update own pages"
ON public.sales_pages FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Owners delete own pages"
ON public.sales_pages FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER sales_pages_updated_at
BEFORE UPDATE ON public.sales_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sales_pages_user ON public.sales_pages(user_id);
CREATE INDEX idx_sales_pages_slug ON public.sales_pages(slug);

-- Events
CREATE TABLE public.sales_page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_page_id uuid NOT NULL,
  type text NOT NULL,
  visitor_hash text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.sales_page_events TO anon, authenticated;
GRANT SELECT ON public.sales_page_events TO authenticated;
GRANT ALL ON public.sales_page_events TO service_role;

ALTER TABLE public.sales_page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone records events"
ON public.sales_page_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners & admins view events"
ON public.sales_page_events FOR SELECT
USING (has_role(auth.uid(),'admin'::app_role) OR EXISTS (
  SELECT 1 FROM public.sales_pages p WHERE p.id = sales_page_events.sales_page_id AND p.user_id = auth.uid()
));

CREATE INDEX idx_sales_page_events_page ON public.sales_page_events(sales_page_id);

-- Storage bucket for sales page product images
INSERT INTO storage.buckets (id, name, public) VALUES ('sales-pages', 'sales-pages', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Sales pages bucket public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'sales-pages');

CREATE POLICY "Users upload to own sales page folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sales-pages' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own sales page files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sales-pages' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own sales page files"
ON storage.objects FOR DELETE
USING (bucket_id = 'sales-pages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('sales_page_first_free', 'true'),
  ('sales_page_price', '500')
ON CONFLICT (key) DO NOTHING;

-- RPC: create a sales page atomically with wallet deduction
CREATE OR REPLACE FUNCTION public.create_sales_page(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_first_free boolean;
  v_price numeric;
  v_count int;
  v_paid boolean;
  v_slug text;
  v_id uuid;
  v_charged numeric := 0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login_required'; END IF;

  SELECT (value IN ('true','on','1')) INTO v_first_free FROM site_settings WHERE key = 'sales_page_first_free';
  SELECT COALESCE(NULLIF(value,'')::numeric, 0) INTO v_price FROM site_settings WHERE key = 'sales_page_price';

  SELECT count(*) INTO v_count FROM sales_pages WHERE user_id = v_user;

  IF NOT (COALESCE(v_first_free,false) AND v_count = 0) AND v_price > 0 THEN
    v_paid := deduct_wallet(v_user, v_price, 'Sales page creation', NULL);
    IF NOT v_paid THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'price', v_price); END IF;
    v_charged := v_price;
  END IF;

  v_slug := lower(regexp_replace(coalesce(_payload->>'product_name','page'), '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

  INSERT INTO sales_pages (
    user_id, business_id, slug, product_name, product_description, price, currency,
    contact_whatsapp, contact_phone, contact_email, product_image_url, image_source,
    headline, subheadline, problem, solution, benefits, social_proof, urgency, cta_text,
    seo_title, seo_description, countdown_ends_at
  ) VALUES (
    v_user,
    NULLIF(_payload->>'business_id','')::uuid,
    v_slug,
    _payload->>'product_name',
    _payload->>'product_description',
    COALESCE((_payload->>'price')::numeric, 0),
    COALESCE(_payload->>'currency','NGN'),
    _payload->>'contact_whatsapp',
    _payload->>'contact_phone',
    _payload->>'contact_email',
    _payload->>'product_image_url',
    COALESCE(_payload->>'image_source','upload'),
    _payload->>'headline',
    _payload->>'subheadline',
    _payload->>'problem',
    _payload->>'solution',
    COALESCE(_payload->'benefits','[]'::jsonb),
    COALESCE(_payload->'social_proof','[]'::jsonb),
    _payload->>'urgency',
    COALESCE(_payload->>'cta_text','Order Now'),
    _payload->>'seo_title',
    _payload->>'seo_description',
    NULLIF(_payload->>'countdown_ends_at','')::timestamptz
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'slug', v_slug, 'charged', v_charged);
END $$;

GRANT EXECUTE ON FUNCTION public.create_sales_page(jsonb) TO authenticated;
