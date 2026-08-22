ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb;
INSERT INTO public.site_settings (key, value) VALUES ('notification_template', 'card') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_settings (key, value) VALUES ('notification_accent', 'primary') ON CONFLICT (key) DO NOTHING;