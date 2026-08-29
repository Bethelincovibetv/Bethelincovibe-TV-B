-- Migration: Fix notification isolation and broadcast delivery
-- 1. Drop the dangerous unconditional fanout trigger on push_notifications
DROP TRIGGER IF EXISTS trg_fanout_push_notification ON public.push_notifications;
DROP FUNCTION IF EXISTS public.fanout_push_notification();

-- 2. Secure RLS policies on push_notifications table (Admins only)
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.push_notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.push_notifications;

CREATE POLICY "Admins can view push notifications"
  ON public.push_notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert push notifications"
  ON public.push_notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

CREATE POLICY "Admins can update push notifications"
  ON public.push_notifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete push notifications"
  ON public.push_notifications FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Secure and harden RLS on user_notifications table
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.user_notifications;

-- Each user can strictly view only their own notifications
CREATE POLICY "Users view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Each user can update only their own notifications (e.g. mark as read)
CREATE POLICY "Users update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Each user can delete only their own notifications
CREATE POLICY "Users delete own notifications"
  ON public.user_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Authenticated users (or admins/service_role) can insert notifications (e.g. transfers, inquiries, reactions)
CREATE POLICY "Authenticated users can insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 4. Secure broadcast notification function for Admin broadcasts
CREATE OR REPLACE FUNCTION public.broadcast_notification(_title text, _body text, _url text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can broadcast notifications';
  END IF;

  INSERT INTO public.user_notifications (user_id, title, body, url, type, is_read, created_at)
    SELECT user_id, _title, _body, COALESCE(_url, '/dashboard'), 'system', false, now()
    FROM public.profiles
    WHERE user_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- Grant execute to authenticated users (internal admin role check is enforced inside function)
GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text) TO authenticated;
