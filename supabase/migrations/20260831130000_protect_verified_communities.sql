-- Migration: 20260831130000_protect_verified_communities.sql
-- Description: Step 3 Security Fix - Strict database-level and RLS lock on verified and published communities against promoter edits

-- 1. Redefine trigger function to strictly forbid updates on verified & published communities by non-admins
CREATE OR REPLACE FUNCTION public.protect_whatsapp_community_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_promoter_user_id UUID;
BEGIN
  NEW.updated_at = now();

  -- Non-admin authorization and data validation
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    -- Check that promoter_id belongs to the calling authenticated user
    SELECT user_id INTO v_promoter_user_id
    FROM public.promoter_profiles
    WHERE id = NEW.promoter_id;

    IF v_promoter_user_id IS NULL OR v_promoter_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: Community must belong to your own promoter profile.';
    END IF;

    IF TG_OP = 'INSERT' THEN
      -- Fresh submissions always enter as unverified and unpublished
      NEW.verification_status = 'submitted';
      NEW.is_published = false;
      NEW.verified_at = NULL;
      NEW.rejection_reason = NULL;
      NEW.created_at = now();

    ELSIF TG_OP = 'UPDATE' THEN
      -- CRITICAL SECURITY RULE: Verified and published communities are strictly locked against non-admin edits
      IF OLD.verification_status = 'verified' AND OLD.is_published = true THEN
        RAISE EXCEPTION 'Forbidden: Verified and published communities are locked against edits. Contact an administrator for assistance.';
      END IF;

      -- Suspended communities cannot be modified directly by promoters
      IF OLD.verification_status = 'suspended' THEN
        RAISE EXCEPTION 'Forbidden: Suspended communities cannot be modified directly.';
      END IF;

      -- Non-admins cannot alter ownership or creation timestamp
      NEW.promoter_id = OLD.promoter_id;
      NEW.created_at = OLD.created_at;

      -- Non-admins cannot manipulate verification status, publication flags, or admin notes
      IF OLD.verification_status = 'rejected' THEN
        -- Editing a rejected community preserves rejected and unpublished status
        NEW.verification_status = 'rejected';
        NEW.is_published = false;
        NEW.verified_at = NULL;
        NEW.rejection_reason = OLD.rejection_reason;
      ELSIF OLD.verification_status = 'under_review' THEN
        NEW.verification_status = 'under_review';
        NEW.is_published = false;
        NEW.verified_at = NULL;
        NEW.rejection_reason = NULL;
      ELSE
        NEW.verification_status = 'submitted';
        NEW.is_published = false;
        NEW.verified_at = NULL;
        NEW.rejection_reason = NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-bind trigger on public.whatsapp_communities
DROP TRIGGER IF EXISTS trg_protect_whatsapp_community ON public.whatsapp_communities;

CREATE TRIGGER trg_protect_whatsapp_community
  BEFORE INSERT OR UPDATE ON public.whatsapp_communities
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_whatsapp_community_fields();

-- 2. Update RLS UPDATE Policy to forbid updating verified/published communities at the RLS query boundary
DROP POLICY IF EXISTS "Promoters can update their own communities or admin" ON public.whatsapp_communities;
DROP POLICY IF EXISTS "Promoters can update their own unverified communities or admin" ON public.whatsapp_communities;

CREATE POLICY "Promoters can update their own unverified communities or admin"
  ON public.whatsapp_communities
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
      AND NOT (verification_status = 'verified' AND is_published = true)
      AND verification_status != 'suspended'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
      AND NOT (verification_status = 'verified' AND is_published = true)
      AND verification_status != 'suspended'
    )
  );

-- 3. Ensure DELETE policy prevents deleting verified or published communities for non-admins
DROP POLICY IF EXISTS "Promoters can delete own unverified communities, admin can delete any" ON public.whatsapp_communities;

CREATE POLICY "Promoters can delete own unverified communities, admin can delete any"
  ON public.whatsapp_communities
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
      AND verification_status != 'verified'
      AND is_published = false
    )
  );
