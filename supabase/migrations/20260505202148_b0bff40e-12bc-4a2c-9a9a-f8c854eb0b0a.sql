
-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Email subscribers table
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid()
);
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.email_subscribers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage subscribers" ON public.email_subscribers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add VAPID-friendly columns to push_subscriptions if missing (already has endpoint/p256dh/auth)
-- Add notified flag to blog_posts so push isn't sent twice
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS push_notified boolean NOT NULL DEFAULT false;
