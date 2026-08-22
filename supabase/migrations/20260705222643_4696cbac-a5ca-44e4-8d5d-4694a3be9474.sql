
CREATE TABLE public.amazon_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asin TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  price TEXT,
  description TEXT,
  category TEXT,
  marketplace TEXT NOT NULL DEFAULT 'com',
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.amazon_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amazon_products TO authenticated;
GRANT ALL ON public.amazon_products TO service_role;

ALTER TABLE public.amazon_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active amazon products"
  ON public.amazon_products FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert amazon products"
  ON public.amazon_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update amazon products"
  ON public.amazon_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete amazon products"
  ON public.amazon_products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_amazon_products_updated_at
  BEFORE UPDATE ON public.amazon_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
