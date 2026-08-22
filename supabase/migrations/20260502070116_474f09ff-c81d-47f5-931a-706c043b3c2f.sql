
-- =========== PROFILES additions ===========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- =========== WALLETS ===========
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage wallets" ON public.wallets
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own wallet" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create wallet on signup (extend existing handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  IF NEW.email = 'bethelgoodgift3@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill wallets for existing users
INSERT INTO public.wallets (user_id, balance)
SELECT user_id, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- =========== WALLET TRANSACTIONS ===========
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('topup','deduct','refund','bonus')),
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage transactions" ON public.wallet_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =========== AFFILIATE LINKS ===========
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active affiliate links viewable" ON public.affiliate_links
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage affiliate links" ON public.affiliate_links
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== GUEST BLOG SUBMISSIONS ===========
CREATE TABLE IF NOT EXISTS public.guest_blog_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_name text NOT NULL,
  description text NOT NULL,
  banner_url text,
  website text,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  category_id uuid,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','generating','review','approved','rejected','published')),
  cost_credits numeric(12,2) NOT NULL DEFAULT 1000,
  generated_post_id uuid,
  rejection_reason text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guest_blog_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions" ON public.guest_blog_submissions
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own submissions" ON public.guest_blog_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending" ON public.guest_blog_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending_payment','rejected'));
CREATE POLICY "Admins manage submissions" ON public.guest_blog_submissions
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_guest_submissions_updated_at
  BEFORE UPDATE ON public.guest_blog_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== GUEST SUBMISSION PHOTOS ===========
CREATE TABLE IF NOT EXISTS public.guest_submission_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.guest_blog_submissions(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guest_submission_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos viewable with submission" ON public.guest_submission_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.guest_blog_submissions s WHERE s.id = submission_id AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
  );
CREATE POLICY "Users add own submission photos" ON public.guest_submission_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.guest_blog_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Admins manage submission photos" ON public.guest_submission_photos
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own submission photos" ON public.guest_submission_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.guest_blog_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid() AND s.status IN ('pending_payment','rejected'))
  );

-- =========== AUTOBLOG SCHEDULE upgrades ===========
ALTER TABLE public.autoblog_schedule
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'single' CHECK (mode IN ('single','multi')),
  ADD COLUMN IF NOT EXISTS posts_per_run int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT true;

-- Many-to-many: schedule -> categories (for multi mode)
CREATE TABLE IF NOT EXISTS public.autoblog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.autoblog_schedule(id) ON DELETE CASCADE,
  category_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, category_id)
);
ALTER TABLE public.autoblog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage autoblog categories" ON public.autoblog_categories
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone view autoblog categories" ON public.autoblog_categories
  FOR SELECT USING (true);

-- =========== STORAGE BUCKETS for guest submissions ===========
INSERT INTO storage.buckets (id, name, public) VALUES ('guest-submissions', 'guest-submissions', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read guest submission images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guest-submissions');

CREATE POLICY "Users upload own guest submission images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'guest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own guest submission images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'guest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own guest submission images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'guest-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========== Wallet helper: secure deduction ===========
CREATE OR REPLACE FUNCTION public.deduct_wallet(_user_id uuid, _amount numeric, _description text, _reference_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
BEGIN
  SELECT balance INTO current_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, 0);
    current_balance := 0;
  END IF;
  IF current_balance < _amount THEN
    RETURN false;
  END IF;
  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = _user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, reference_id)
  VALUES (_user_id, -_amount, 'deduct', _description, _reference_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.topup_wallet(_user_id uuid, _amount numeric, _description text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + _amount;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (_user_id, _amount, 'topup', _description);
  RETURN true;
END;
$$;
