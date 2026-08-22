
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onesignal_player_id text;
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id ON public.profiles(onesignal_player_id);

INSERT INTO public.site_settings (key, value) VALUES
  ('onesignal_app_id', '9feae3e2-da34-441b-8bf6-ecffe4040375'),
  ('onesignal_prompt_style', 'modal'),
  ('onesignal_custom_message', 'Join our Lagos business community to get updates'),
  ('onesignal_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
