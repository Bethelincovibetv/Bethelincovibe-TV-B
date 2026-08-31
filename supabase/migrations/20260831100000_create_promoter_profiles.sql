-- Migration: 20260831100000_create_promoter_profiles.sql
-- Description: Creates promoter_profiles table with RLS, uniqueness, and tamper-proof field protections

CREATE TABLE IF NOT EXISTS public.promoter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone_whatsapp TEXT NOT NULL,
  bio TEXT,
  niche TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  total_completed_orders INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'vacation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_user_id ON public.promoter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_status_verified ON public.promoter_profiles(status, is_verified);

-- Trigger function: Update timestamp and prevent non-admin tampering with sensitive fields
CREATE OR REPLACE FUNCTION public.protect_promoter_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- If not admin, enforce that critical fields cannot be modified
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.user_id = auth.uid();
      NEW.is_verified = false;
      NEW.rating = 5.00;
      NEW.total_completed_orders = 0;
      NEW.status = 'active';
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.user_id = OLD.user_id;
      NEW.is_verified = OLD.is_verified;
      NEW.rating = OLD.rating;
      NEW.total_completed_orders = OLD.total_completed_orders;
      NEW.status = OLD.status;
      NEW.created_at = OLD.created_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_promoter_profile ON public.promoter_profiles;

CREATE TRIGGER trg_protect_promoter_profile
  BEFORE INSERT OR UPDATE ON public.promoter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_promoter_profile_fields();

-- Enable Row Level Security
ALTER TABLE public.promoter_profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can view their own profile, public can view verified active profiles, admins can view all
DROP POLICY IF EXISTS "Promoters can view own profile or verified active or admin" ON public.promoter_profiles;
CREATE POLICY "Promoters can view own profile or verified active or admin"
  ON public.promoter_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR (status = 'active' AND is_verified = true)
  );

-- 2. INSERT: Authenticated users can insert their own promoter profile
DROP POLICY IF EXISTS "Users can create their own promoter profile" ON public.promoter_profiles;
CREATE POLICY "Users can create their own promoter profile"
  ON public.promoter_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- 3. UPDATE: Promoters can update their own profile, admins can update any
DROP POLICY IF EXISTS "Promoters can update their own profile" ON public.promoter_profiles;
CREATE POLICY "Promoters can update their own profile"
  ON public.promoter_profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
  );

-- 4. DELETE: Only admins can delete promoter profiles
DROP POLICY IF EXISTS "Admins can delete promoter profiles" ON public.promoter_profiles;
CREATE POLICY "Admins can delete promoter profiles"
  ON public.promoter_profiles
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
  );
