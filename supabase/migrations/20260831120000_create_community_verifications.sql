-- Migration: 20260831120000_create_community_verifications.sql
-- Description: Step 3 - Community Verification & Admin Review audit table, RLS policies, and atomic secure verification RPC

-- 1. Safely extend whatsapp_communities verification_status check constraint to support 'suspended'
DO $$
BEGIN
  -- Drop existing check constraint if present and re-add with 'suspended'
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_communities_verification_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_communities DROP CONSTRAINT whatsapp_communities_verification_status_check;
  END IF;

  ALTER TABLE public.whatsapp_communities
    ADD CONSTRAINT whatsapp_communities_verification_status_check
    CHECK (verification_status IN ('submitted', 'under_review', 'verified', 'rejected', 'suspended'));
EXCEPTION
  WHEN others THEN
    NULL; -- Ignore if constraint is already satisfied or altered
END $$;

-- 2. Create community_verifications audit table
CREATE TABLE IF NOT EXISTS public.community_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.whatsapp_communities(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'submitted_for_review',
    'approved',
    'rejected',
    'suspended'
  )),
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_community_verifications_community_id ON public.community_verifications(community_id);
CREATE INDEX IF NOT EXISTS idx_community_verifications_admin_id ON public.community_verifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_community_verifications_created_at ON public.community_verifications(created_at);

-- 3. Enable RLS on community_verifications
ALTER TABLE public.community_verifications ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Admins can view all verification records; promoters can view audits for their own communities
DROP POLICY IF EXISTS "Admins can view all verification logs" ON public.community_verifications;
CREATE POLICY "Admins can view all verification logs"
  ON public.community_verifications
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR community_id IN (
      SELECT id FROM public.whatsapp_communities
      WHERE promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT Policy: Only authorized administrators or SECURITY DEFINER functions can create audit records
DROP POLICY IF EXISTS "Only admins can insert verification logs" ON public.community_verifications;
CREATE POLICY "Only admins can insert verification logs"
  ON public.community_verifications
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- Direct client UPDATE and DELETE on audit logs are strictly forbidden
DROP POLICY IF EXISTS "No updates on verification logs" ON public.community_verifications;
DROP POLICY IF EXISTS "No deletes on verification logs" ON public.community_verifications;

-- 4. Atomic Concurrency-Safe Verification RPC Function
CREATE OR REPLACE FUNCTION public.admin_verify_community(
  p_community_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_comm RECORD;
  v_promoter_user_id UUID;
  v_comm_name TEXT;
  v_audit_id UUID;
  v_notif_title TEXT;
  v_notif_body TEXT;
BEGIN
  v_admin_id := auth.uid();

  -- 1. Enforce admin role check server-side
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can verify communities.';
  END IF;

  -- 2. Validate action input
  IF p_action NOT IN ('submitted_for_review', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid verification action: %', p_action;
  END IF;

  -- 3. Lock row for concurrency safety
  SELECT c.*, p.user_id AS promoter_user_id
  INTO v_comm
  FROM public.whatsapp_communities c
  JOIN public.promoter_profiles p ON p.id = c.promoter_id
  WHERE c.id = p_community_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community with ID % not found.', p_community_id;
  END IF;

  v_promoter_user_id := v_comm.promoter_user_id;
  v_comm_name := v_comm.name;

  -- 4. Execute atomic state change based on action
  IF p_action = 'submitted_for_review' THEN
    UPDATE public.whatsapp_communities
    SET
      verification_status = 'under_review',
      is_published = false,
      updated_at = now()
    WHERE id = p_community_id;

    v_notif_title := 'Community Under Review';
    v_notif_body := 'Your WhatsApp community "' || v_comm_name || '" has been placed under administrative review.';

  ELSIF p_action = 'approved' THEN
    UPDATE public.whatsapp_communities
    SET
      verification_status = 'verified',
      is_published = true,
      verified_at = now(),
      rejection_reason = NULL,
      updated_at = now()
    WHERE id = p_community_id;

    v_notif_title := '🎉 WhatsApp Community Approved & Published!';
    v_notif_body := 'Congratulations! Your WhatsApp community "' || v_comm_name || '" has been verified and published to the promotion network.';

  ELSIF p_action = 'rejected' THEN
    IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
      RAISE EXCEPTION 'A meaningful rejection reason is mandatory when rejecting a community.';
    END IF;

    UPDATE public.whatsapp_communities
    SET
      verification_status = 'rejected',
      is_published = false,
      rejection_reason = trim(p_rejection_reason),
      updated_at = now()
    WHERE id = p_community_id;

    v_notif_title := 'WhatsApp Community Submission Update';
    v_notif_body := 'Your community "' || v_comm_name || '" was not approved. Reason: ' || trim(p_rejection_reason);

  ELSIF p_action = 'suspended' THEN
    UPDATE public.whatsapp_communities
    SET
      verification_status = 'suspended',
      is_published = false,
      updated_at = now()
    WHERE id = p_community_id;

    v_notif_title := 'WhatsApp Community Suspended';
    v_notif_body := 'Your WhatsApp community "' || v_comm_name || '" has been suspended by platform administration.';
  END IF;

  -- 5. Insert audit log record
  INSERT INTO public.community_verifications (
    community_id,
    admin_id,
    action,
    verification_notes,
    created_at
  ) VALUES (
    p_community_id,
    v_admin_id,
    p_action,
    COALESCE(p_notes, p_rejection_reason),
    now()
  ) RETURNING id INTO v_audit_id;

  -- 6. Insert notification for the affected promoter if user exists
  IF v_promoter_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id,
      title,
      body,
      type,
      url,
      is_read,
      created_at
    ) VALUES (
      v_promoter_user_id,
      v_notif_title,
      v_notif_body,
      'community_verification',
      '/dashboard/promoter/profile?tab=communities',
      false,
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'action', p_action,
    'audit_id', v_audit_id,
    'status', (CASE
      WHEN p_action = 'approved' THEN 'verified'
      WHEN p_action = 'rejected' THEN 'rejected'
      WHEN p_action = 'suspended' THEN 'suspended'
      ELSE 'under_review'
    END)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
