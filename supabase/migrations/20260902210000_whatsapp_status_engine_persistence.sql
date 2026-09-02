-- Production persistence for WhatsApp Status Engine.
-- Removes browser-only state and demo bookings from the engine service.

CREATE TABLE IF NOT EXISTS public.whatsapp_engine_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_exchange_enabled BOOLEAN NOT NULL DEFAULT true,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  target_categories TEXT[] NOT NULL DEFAULT '{}',
  target_locations TEXT[] NOT NULL DEFAULT '{}',
  open_for_ads BOOLEAN NOT NULL DEFAULT false,
  rate_per_post INTEGER NOT NULL DEFAULT 0 CHECK (rate_per_post >= 0),
  bundle_price INTEGER NOT NULL DEFAULT 0 CHECK (bundle_price >= 0),
  audience_niche TEXT NOT NULL DEFAULT '',
  estimated_views INTEGER NOT NULL DEFAULT 0 CHECK (estimated_views >= 0),
  custom_whatsapp_number TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_engine_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('google_api', 'vcf_export')),
  google_resource_name TEXT,
  mutual_confirmed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, contact_id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_status_ad_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  advertiser_name TEXT NOT NULL,
  advertiser_phone TEXT NOT NULL,
  advertiser_email TEXT,
  campaign_title TEXT NOT NULL,
  caption TEXT NOT NULL,
  media_url TEXT,
  target_date DATE NOT NULL,
  slot_count INTEGER NOT NULL DEFAULT 1 CHECK (slot_count > 0),
  total_amount INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'posted_with_proof', 'completed')),
  proof_screenshot_url TEXT,
  proof_submitted_at TIMESTAMPTZ,
  proof_viewer_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_engine_logs_user ON public.whatsapp_engine_connection_logs(user_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status_bookings_creator ON public.whatsapp_status_ad_bookings(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status_bookings_advertiser ON public.whatsapp_status_ad_bookings(advertiser_id, created_at DESC);

ALTER TABLE public.whatsapp_engine_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_engine_connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_status_ad_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own WhatsApp engine preferences" ON public.whatsapp_engine_preferences;
CREATE POLICY "Users manage own WhatsApp engine preferences" ON public.whatsapp_engine_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own WhatsApp connection logs" ON public.whatsapp_engine_connection_logs;
CREATE POLICY "Users manage own WhatsApp connection logs" ON public.whatsapp_engine_connection_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own status bookings" ON public.whatsapp_status_ad_bookings;
CREATE POLICY "Users view own status bookings" ON public.whatsapp_status_ad_bookings
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = advertiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Advertisers create status bookings" ON public.whatsapp_status_ad_bookings;
CREATE POLICY "Advertisers create status bookings" ON public.whatsapp_status_ad_bookings
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);

DROP POLICY IF EXISTS "Booking participants update status bookings" ON public.whatsapp_status_ad_bookings;
CREATE POLICY "Booking participants update status bookings" ON public.whatsapp_status_ad_bookings
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = advertiser_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = advertiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete status bookings" ON public.whatsapp_status_ad_bookings;
CREATE POLICY "Admins delete status bookings" ON public.whatsapp_status_ad_bookings
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_whatsapp_engine_preferences()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_touch_whatsapp_engine_preferences ON public.whatsapp_engine_preferences;
CREATE TRIGGER trg_touch_whatsapp_engine_preferences
BEFORE UPDATE ON public.whatsapp_engine_preferences
FOR EACH ROW EXECUTE FUNCTION public.touch_whatsapp_engine_preferences();
