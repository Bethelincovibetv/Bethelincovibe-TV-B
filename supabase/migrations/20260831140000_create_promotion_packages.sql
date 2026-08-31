-- Migration: 20260831140000_create_promotion_packages.sql
-- Description: Step 4 — Promotion Packages for Bethelincovibe Business Promotion Network

-- 1. Create promotion_packages table
CREATE TABLE IF NOT EXISTS public.promotion_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.whatsapp_communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 500),
  duration_hours INTEGER NOT NULL DEFAULT 24 CHECK (duration_hours > 0),
  deliverables JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_active_orders INTEGER NOT NULL DEFAULT 5 CHECK (max_active_orders > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_promotion_packages_promoter_id ON public.promotion_packages(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promotion_packages_community_id ON public.promotion_packages(community_id);
CREATE INDEX IF NOT EXISTS idx_promotion_packages_is_active ON public.promotion_packages(is_active);

-- Enable Row Level Security
ALTER TABLE public.promotion_packages ENABLE ROW LEVEL SECURITY;

-- 2. Trigger Function for DB-Level Security & Verified Community Requirement
CREATE OR REPLACE FUNCTION public.protect_promotion_package_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_promoter_user_id UUID;
  v_comm_record RECORD;
BEGIN
  NEW.updated_at = now();

  -- Admin bypass check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    -- A: Confirm promoter profile ownership
    SELECT user_id INTO v_promoter_user_id
    FROM public.promoter_profiles
    WHERE id = NEW.promoter_id;

    IF v_promoter_user_id IS NULL OR v_promoter_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: Package must belong to your own promoter profile.';
    END IF;

    -- B: Confirm target community belongs to same promoter and is verified + published
    SELECT id, promoter_id, verification_status, is_published
    INTO v_comm_record
    FROM public.whatsapp_communities
    WHERE id = NEW.community_id;

    IF v_comm_record.id IS NULL THEN
      RAISE EXCEPTION 'Invalid Community: Selected WhatsApp community does not exist.';
    END IF;

    IF v_comm_record.promoter_id != NEW.promoter_id THEN
      RAISE EXCEPTION 'Unauthorized: Target community does not belong to your promoter profile.';
    END IF;

    IF v_comm_record.verification_status != 'verified' OR v_comm_record.is_published != true THEN
      RAISE EXCEPTION 'Forbidden: Promotion packages can only be created for verified and published communities.';
    END IF;

    -- C: Enforce immutability on update
    IF TG_OP = 'UPDATE' THEN
      IF NEW.promoter_id != OLD.promoter_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot change promoter_id of an existing package.';
      END IF;

      IF NEW.community_id != OLD.community_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot change community_id of an existing package.';
      END IF;

      NEW.created_at = OLD.created_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind trigger on INSERT OR UPDATE
DROP TRIGGER IF EXISTS trg_protect_promotion_package ON public.promotion_packages;

CREATE TRIGGER trg_protect_promotion_package
  BEFORE INSERT OR UPDATE ON public.promotion_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_promotion_package_fields();

-- 3. RLS Policies

-- SELECT: Promoters can see their own packages; Public/Advertisers can see active packages on verified communities; Admins can see all.
DROP POLICY IF EXISTS "Promoters and admins can view packages" ON public.promotion_packages;
CREATE POLICY "Promoters and admins can view packages"
  ON public.promotion_packages
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
    OR (
      is_active = true
      AND community_id IN (
        SELECT id FROM public.whatsapp_communities
        WHERE verification_status = 'verified' AND is_published = true
      )
    )
  );

-- INSERT: Promoter can only insert for their own verified & published community
DROP POLICY IF EXISTS "Promoters can insert own packages on verified communities" ON public.promotion_packages;
CREATE POLICY "Promoters can insert own packages on verified communities"
  ON public.promotion_packages
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
      AND community_id IN (
        SELECT id FROM public.whatsapp_communities
        WHERE promoter_id = promotion_packages.promoter_id
          AND verification_status = 'verified'
          AND is_published = true
      )
    )
  );

-- UPDATE: Promoters can update their own packages; Admins can update any
DROP POLICY IF EXISTS "Promoters can update own packages" ON public.promotion_packages;
CREATE POLICY "Promoters can update own packages"
  ON public.promotion_packages
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: Promoters can delete their own packages; Admins can delete any
DROP POLICY IF EXISTS "Promoters can delete own packages" ON public.promotion_packages;
CREATE POLICY "Promoters can delete own packages"
  ON public.promotion_packages
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
  );
