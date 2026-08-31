-- Migration: 20260831110000_create_whatsapp_communities.sql
-- Description: Creates whatsapp_communities table with strict RLS, trigger safeguards, and ownership verification

-- 1. Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for business-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload business-media'
  ) THEN
    CREATE POLICY "Authenticated users can upload business-media"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'business-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can read business-media'
  ) THEN
    CREATE POLICY "Public can read business-media"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'business-media');
  END IF;
END $$;

-- 2. Create whatsapp_communities table
CREATE TABLE IF NOT EXISTS public.whatsapp_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID REFERENCES public.promoter_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  community_type TEXT NOT NULL CHECK (community_type IN ('group', 'channel', 'status_audience')),
  member_count INTEGER NOT NULL CHECK (member_count > 0),
  active_daily_views INTEGER NOT NULL DEFAULT 0 CHECK (active_daily_views >= 0),
  country_primary TEXT NOT NULL DEFAULT 'Nigeria',
  demographics_summary TEXT,
  proof_screenshot_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'submitted' CHECK (verification_status IN ('submitted', 'under_review', 'verified', 'rejected')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_communities_promoter_id ON public.whatsapp_communities(promoter_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_communities_category_id ON public.whatsapp_communities(category_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_communities_status_published ON public.whatsapp_communities(verification_status, is_published);
CREATE INDEX IF NOT EXISTS idx_whatsapp_communities_type ON public.whatsapp_communities(community_type);

-- 3. Database Trigger: Protect community fields & ownership
CREATE OR REPLACE FUNCTION public.protect_whatsapp_community_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_promoter_user_id UUID;
BEGIN
  NEW.updated_at = now();

  -- Non-admin authorization and data validation
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    -- Check that promoter_id belongs to the calling user
    SELECT user_id INTO v_promoter_user_id
    FROM public.promoter_profiles
    WHERE id = NEW.promoter_id;

    IF v_promoter_user_id IS NULL OR v_promoter_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: Community must belong to your own promoter profile.';
    END IF;

    IF TG_OP = 'INSERT' THEN
      NEW.verification_status = 'submitted';
      NEW.is_published = false;
      NEW.verified_at = NULL;
      NEW.rejection_reason = NULL;
      NEW.created_at = now();
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.promoter_id = OLD.promoter_id;
      NEW.created_at = OLD.created_at;

      -- If promoter edits a verified community, revert or require re-verification
      IF OLD.verification_status = 'verified' AND (
        NEW.name != OLD.name OR
        NEW.member_count != OLD.member_count OR
        NEW.community_type != OLD.community_type OR
        NEW.proof_screenshot_url != OLD.proof_screenshot_url
      ) THEN
        NEW.verification_status = 'submitted';
        NEW.is_published = false;
        NEW.verified_at = NULL;
      ELSE
        NEW.verification_status = OLD.verification_status;
        NEW.is_published = OLD.is_published;
        NEW.verified_at = OLD.verified_at;
      END IF;

      NEW.rejection_reason = OLD.rejection_reason;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_whatsapp_community ON public.whatsapp_communities;

CREATE TRIGGER trg_protect_whatsapp_community
  BEFORE INSERT OR UPDATE ON public.whatsapp_communities
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_whatsapp_community_fields();

-- 4. Enable Row Level Security
ALTER TABLE public.whatsapp_communities ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Public can view verified published communities, promoters view own, admins view all" ON public.whatsapp_communities;
CREATE POLICY "Public can view verified published communities, promoters view own, admins view all"
  ON public.whatsapp_communities
  FOR SELECT
  USING (
    (is_published = true AND verification_status = 'verified')
    OR (
      auth.uid() IS NOT NULL AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- INSERT Policy
DROP POLICY IF EXISTS "Promoters can insert their own communities" ON public.whatsapp_communities;
CREATE POLICY "Promoters can insert their own communities"
  ON public.whatsapp_communities
  FOR INSERT
  WITH CHECK (
    (
      auth.uid() IS NOT NULL AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- UPDATE Policy
DROP POLICY IF EXISTS "Promoters can update their own communities or admin" ON public.whatsapp_communities;
CREATE POLICY "Promoters can update their own communities or admin"
  ON public.whatsapp_communities
  FOR UPDATE
  USING (
    (
      auth.uid() IS NOT NULL AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (
      auth.uid() IS NOT NULL AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- DELETE Policy
DROP POLICY IF EXISTS "Promoters can delete own unverified communities, admin can delete any" ON public.whatsapp_communities;
CREATE POLICY "Promoters can delete own unverified communities, admin can delete any"
  ON public.whatsapp_communities
  FOR DELETE
  USING (
    (
      auth.uid() IS NOT NULL AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
      AND verification_status != 'verified'
    )
    OR public.has_role(auth.uid(), 'admin')
  );
