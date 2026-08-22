-- Update the type check constraint to allow 'business'
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check CHECK (type IN ('blog', 'business', 'supplier'));

-- Add unique constraint on slug if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key') THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Seed blog categories
INSERT INTO public.categories (name, slug, type, description) VALUES
  ('Startup Guides', 'startup-guides', 'blog', 'Step-by-step guides to launch your business in Lagos'),
  ('Marketing and Sales', 'marketing-sales', 'blog', 'Grow your customers with proven marketing and sales strategies'),
  ('Funding and Loans', 'funding-loans', 'blog', 'Where and how to raise funding, grants and loans for your business'),
  ('Food and Retail Business Ideas', 'food-retail', 'blog', 'Profitable food and retail business ideas for Lagos entrepreneurs'),
  ('Featured Businesses', 'featured-businesses', 'blog', 'Spotlight on standout Lagos businesses')
ON CONFLICT (slug) DO NOTHING;

-- Seed business directory categories
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

-- Migrate any existing supplier-typed categories to business
UPDATE public.categories SET type = 'business' WHERE type = 'supplier';