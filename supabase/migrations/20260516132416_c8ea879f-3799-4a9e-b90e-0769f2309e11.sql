
-- 1. Add boosted_until to suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_suppliers_boosted_until ON public.suppliers (boosted_until DESC NULLS LAST);

-- 2. business_boosts table
CREATE TABLE IF NOT EXISTS public.business_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  package_key text NOT NULL,
  duration_days integer NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners & admins view boosts"
  ON public.business_boosts FOR SELECT
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = business_id AND s.submitted_by = auth.uid())
  );

CREATE POLICY "Owners create boosts for own business"
  ON public.business_boosts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = business_id AND s.submitted_by = auth.uid())
    )
  );

CREATE POLICY "Admins manage boosts"
  ON public.business_boosts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. business_events table (analytics)
CREATE TABLE IF NOT EXISTS public.business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('view','call','whatsapp','email','website','share','directions')),
  visitor_hash text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_events_business_id_created ON public.business_events (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_type ON public.business_events (type);

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record events"
  ON public.business_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners & admins view events"
  ON public.business_events FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = business_id AND s.submitted_by = auth.uid())
  );

-- 4. Seed boost packages in site_settings
INSERT INTO public.site_settings (key, value) VALUES
  ('boost_packages', '[{"key":"7d","days":7,"price":2000,"label":"7 Days Boost"},{"key":"30d","days":30,"price":7000,"label":"30 Days Boost"},{"key":"90d","days":90,"price":18000,"label":"90 Days Boost"}]')
ON CONFLICT (key) DO NOTHING;
