-- Migration: Service Bookings & Matchmaker Realtime Publication
-- Enables realtime sync for provider opportunity preferences and service bookings

CREATE TABLE IF NOT EXISTS public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  customer_email text,
  service_title text NOT NULL,
  service_price text,
  preferred_date text,
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled
  source text NOT NULL DEFAULT 'web_direct',
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_provider ON public.service_bookings(provider_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_bookings_customer ON public.service_bookings(customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_bookings_business ON public.service_bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON public.service_bookings(status);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers manage own service bookings" ON public.service_bookings;
CREATE POLICY "Providers manage own service bookings" ON public.service_bookings
  FOR ALL TO authenticated
  USING (auth.uid() = provider_user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = provider_user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Customers view own service bookings" ON public.service_bookings;
CREATE POLICY "Customers view own service bookings" ON public.service_bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users create service bookings" ON public.service_bookings;
CREATE POLICY "Authenticated users create service bookings" ON public.service_bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_user_id OR customer_user_id IS NULL OR auth.uid() = provider_user_id);

-- Realtime publication: clients receive new/changed bookings and preferences immediately.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bookings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_opportunity_preferences; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE OR REPLACE FUNCTION public.touch_service_bookings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS service_bookings_updated_at ON public.service_bookings;
CREATE TRIGGER service_bookings_updated_at BEFORE UPDATE ON public.service_bookings FOR EACH ROW EXECUTE FUNCTION public.touch_service_bookings_updated_at();
