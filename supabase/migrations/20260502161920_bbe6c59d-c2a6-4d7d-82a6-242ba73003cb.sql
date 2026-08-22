
-- Promo Popups table
CREATE TABLE public.promo_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  cta_label text,
  cta_url text,
  image_url text,
  background_url text,
  template text NOT NULL DEFAULT 'classic',
  bg_color text DEFAULT '#7c3aed',
  text_color text DEFAULT '#ffffff',
  active boolean NOT NULL DEFAULT true,
  show_on text NOT NULL DEFAULT 'all',
  display_delay_seconds int NOT NULL DEFAULT 5,
  frequency text NOT NULL DEFAULT 'session',
  starts_at timestamptz,
  ends_at timestamptz,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active popups viewable" ON public.promo_popups
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage popups" ON public.promo_popups
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_promo_popups_updated_at
  BEFORE UPDATE ON public.promo_popups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed blog categories (Startup Guide, Marketing & Sales, Business Tips)
INSERT INTO public.categories (name, slug, type, description) VALUES
  ('Startup Guide', 'startup-guide', 'blog', 'Step-by-step guides for launching your startup'),
  ('Marketing & Sales', 'marketing-and-sales', 'blog', 'Marketing strategies and sales techniques'),
  ('Business Tips', 'business-tips', 'blog', 'Practical tips to grow your business')
ON CONFLICT DO NOTHING;
