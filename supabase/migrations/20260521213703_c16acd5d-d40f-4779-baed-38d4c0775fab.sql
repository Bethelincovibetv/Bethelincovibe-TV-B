
-- Re-seed blog categories
INSERT INTO public.categories (name, slug, type, description) VALUES
  ('Startup Guides', 'startup-guides', 'blog', 'Step-by-step guides to launch your business in Lagos'),
  ('Marketing and Sales', 'marketing-sales', 'blog', 'Grow your customers with proven marketing and sales strategies'),
  ('Funding and Loans', 'funding-loans', 'blog', 'Where and how to raise funding, grants and loans for your business'),
  ('Food and Retail Business Ideas', 'food-retail', 'blog', 'Profitable food and retail business ideas for Lagos entrepreneurs'),
  ('Featured Businesses', 'featured-businesses', 'blog', 'Spotlight on standout Lagos businesses'),
  ('Business Tips', 'business-tips', 'blog', 'Practical tips to grow your business')
ON CONFLICT (slug) DO NOTHING;

-- Re-seed business directory categories
INSERT INTO public.categories (name, slug, type, description) VALUES
  ('Fashion & Tailoring', 'fashion-tailoring', 'business', 'Fashion designers, tailors, and clothing stores'),
  ('Food & Restaurants', 'food-restaurants', 'business', 'Restaurants, caterers, and food vendors'),
  ('Beauty & Wellness', 'beauty-wellness', 'business', 'Salons, spas, barbers and wellness services'),
  ('Logistics & Delivery', 'logistics-delivery', 'business', 'Delivery, dispatch, and logistics providers'),
  ('Tech & Digital Services', 'tech-digital', 'business', 'Web design, software, marketing agencies'),
  ('Retail & Wholesale', 'retail-wholesale', 'business', 'Shops, supermarkets, and wholesale traders'),
  ('Construction & Real Estate', 'construction-real-estate', 'business', 'Builders, agents, and property services'),
  ('Education & Training', 'education-training', 'business', 'Schools, tutors, and skill training centres'),
  ('Health & Pharmacy', 'health-pharmacy', 'business', 'Clinics, pharmacies, and health services'),
  ('Agro & Farm Produce', 'agro-farm', 'business', 'Farms, agro-processors and produce sellers'),
  ('Automobile Services', 'automobile', 'business', 'Mechanics, car dealers and auto parts'),
  ('Professional Services', 'professional-services', 'business', 'Legal, accounting, consulting and business services')
ON CONFLICT (slug) DO NOTHING;

-- Helper to generate unique username from email
CREATE OR REPLACE FUNCTION public.generate_username(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 0;
BEGIN
  base := regexp_replace(lower(split_part(_email, '@', 1)), '[^a-z0-9_-]', '', 'g');
  IF base IS NULL OR length(base) = 0 THEN base := 'user'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Update handle_new_user to auto-assign username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    public.generate_username(NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF LOWER(NEW.email) IN ('bethelgoodgift3@gmail.com','bethelincovibetv@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill usernames for existing profiles missing one
UPDATE public.profiles p
SET username = public.generate_username(COALESCE(p.email, 'user'))
WHERE p.username IS NULL OR p.username = '';
