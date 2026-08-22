-- 1. Seller payment accounts (public-safe metadata)
CREATE TABLE IF NOT EXISTS public.seller_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'paystack',
  public_key text,
  merchant_id text,
  business_name text,
  status text NOT NULL DEFAULT 'not_connected',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_payment_accounts TO authenticated;
GRANT ALL ON public.seller_payment_accounts TO service_role;
ALTER TABLE public.seller_payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own payment account" ON public.seller_payment_accounts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_seller_payment_accounts_updated BEFORE UPDATE ON public.seller_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Secret storage (backend only)
CREATE TABLE IF NOT EXISTS public.seller_payment_secrets (
  user_id uuid PRIMARY KEY,
  secret_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seller_payment_secrets TO service_role;
ALTER TABLE public.seller_payment_secrets ENABLE ROW LEVEL SECURITY;

-- 3. Digital product fields
ALTER TABLE public.directory_products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS delivery_method text,
  ADD COLUMN IF NOT EXISTS delivery_url text,
  ADD COLUMN IF NOT EXISTS delivery_file_path text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue numeric NOT NULL DEFAULT 0;

-- 4. Subcategories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- 5. Purchases
CREATE TABLE IF NOT EXISTS public.product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.directory_products(id) ON DELETE CASCADE,
  buyer_id uuid,
  buyer_email text NOT NULL,
  buyer_name text,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'paystack',
  downloads integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT, INSERT ON public.product_purchases TO authenticated;
GRANT ALL ON public.product_purchases TO service_role;
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own purchases" ON public.product_purchases
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers view own sales" ON public.product_purchases
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Admins view all purchases" ON public.product_purchases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));