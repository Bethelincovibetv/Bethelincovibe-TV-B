
CREATE TABLE public.directory_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  slug text unique,
  description text,
  price numeric default 0,
  currency text default 'NGN',
  condition text default 'new',
  stock integer default 1,
  location text,
  whatsapp text,
  phone text,
  category_id uuid references public.categories(id) on delete set null,
  images jsonb default '[]'::jsonb,
  cover_image text,
  views_count integer default 0,
  active boolean default true,
  featured boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.directory_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_products TO authenticated;
GRANT ALL ON public.directory_products TO service_role;

ALTER TABLE public.directory_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.directory_products FOR SELECT
  USING (active = true OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Owners can insert"
  ON public.directory_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins can update"
  ON public.directory_products FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Owners or admins can delete"
  ON public.directory_products FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER directory_products_updated_at
  BEFORE UPDATE ON public.directory_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_directory_products_active ON public.directory_products(active, created_at DESC);
CREATE INDEX idx_directory_products_user ON public.directory_products(user_id);
CREATE INDEX idx_directory_products_category ON public.directory_products(category_id);

INSERT INTO public.site_settings (key, value) VALUES ('directory_listing_style', 'product')
ON CONFLICT (key) DO NOTHING;
