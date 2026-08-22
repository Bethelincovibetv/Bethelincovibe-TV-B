INSERT INTO public.site_settings (key, value) VALUES
  ('feature_blog','on'),
  ('feature_businesses','on'),
  ('feature_business_listing','on'),
  ('feature_business_boost','on'),
  ('feature_tools','on'),
  ('feature_inventory','on'),
  ('feature_coach','on'),
  ('feature_advertise','on'),
  ('feature_wallet','on'),
  ('feature_favorites','on'),
  ('feature_comments','on'),
  ('feature_push','on'),
  ('feature_daily_rewards','on'),
  ('feature_guest_blog','on'),
  ('feature_tv_videos','on'),
  ('feature_hero_slider','on'),
  ('feature_pwa_install','on'),
  ('feature_email_subscribe','on'),
  ('feature_search','on'),
  ('feature_register','on')
ON CONFLICT (key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;