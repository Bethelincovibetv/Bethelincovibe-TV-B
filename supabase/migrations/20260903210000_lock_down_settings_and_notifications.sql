-- Migration: Lock down site_settings and restrict user_notifications INSERT
-- 1. Lock down public.site_settings SELECT policy to admin users only
DROP POLICY IF EXISTS "Settings viewable by everyone" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can select settings" ON public.site_settings;

CREATE POLICY "Admins can select settings"
  ON public.site_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict public.user_notifications INSERT policy so regular users can only notify themselves
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.user_notifications;

CREATE POLICY "Authenticated users can insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR 
    (auth.role() = 'authenticated' AND user_id = auth.uid())
  );
