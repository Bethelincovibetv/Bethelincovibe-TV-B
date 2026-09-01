-- Migration: 20260901110000_promotion_reviews_and_disputes.sql
-- Purpose: Step 10 Post-Order Verified Reviews, Promoter Rating Recalculation & Admin Dispute Arbitration

-- 1. Create promotion_reviews table
CREATE TABLE IF NOT EXISTS public.promotion_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.promotion_orders(id) ON DELETE CASCADE,
  order_reference TEXT NOT NULL,
  business_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promoter_id UUID NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  promoter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating NUMERIC(3,2) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  review_text TEXT NOT NULL CHECK (length(trim(review_text)) >= 5 AND length(trim(review_text)) <= 1000),
  communication_rating NUMERIC(3,2) NULL CHECK (communication_rating IS NULL OR (communication_rating >= 1.0 AND communication_rating <= 5.0)),
  delivery_rating NUMERIC(3,2) NULL CHECK (delivery_rating IS NULL OR (delivery_rating >= 1.0 AND delivery_rating <= 5.0)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_promotion_review_order UNIQUE (order_id)
);

-- Indexing for high-performance lookup & analytics
CREATE INDEX IF NOT EXISTS idx_promotion_reviews_promoter ON public.promotion_reviews(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promotion_reviews_business ON public.promotion_reviews(business_user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_reviews_order ON public.promotion_reviews(order_id);

-- Enable RLS
ALTER TABLE public.promotion_reviews ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies on promotion_reviews
-- Anyone (authenticated or public) can read verified reviews
CREATE POLICY "Anyone can view verified promotion reviews"
  ON public.promotion_reviews
  FOR SELECT
  USING (true);

-- Ordering business can create exactly one review for their completed order
CREATE POLICY "Ordering business can create verified review for completed order"
  ON public.promotion_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = business_user_id
    AND EXISTS (
      SELECT 1 FROM public.promotion_orders o
      WHERE o.id = order_id
        AND o.business_user_id = auth.uid()
        AND o.status = 'completed'
    )
  );

-- Only platform admins can modify/delete reviews
CREATE POLICY "Admins can manage promotion reviews"
  ON public.promotion_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. Stored Procedure: submit_promotion_order_review
-- Atomically inserts verified review and updates promoter average rating & review count
CREATE OR REPLACE FUNCTION public.submit_promotion_order_review(
  p_order_id UUID,
  p_rating NUMERIC,
  p_review_text TEXT,
  p_communication_rating NUMERIC DEFAULT NULL,
  p_delivery_rating NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_promoter_user_id UUID;
  v_review_id UUID;
  v_avg_rating NUMERIC(3,2);
  v_review_count INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: Please log in to submit a review.');
  END IF;

  -- 1. Fetch & lock order
  SELECT * INTO v_order FROM public.promotion_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Promotion order not found.');
  END IF;

  -- 2. Validate Ownership & Status
  IF v_order.business_user_id <> v_caller_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden: Only the ordering business can review this order.');
  END IF;

  IF v_order.status <> 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot review order: Order must be in completed status.');
  END IF;

  -- 3. Validate Rating bounds
  IF p_rating < 1.0 OR p_rating > 5.0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid rating: Rating must be between 1.0 and 5.0 stars.');
  END IF;

  IF length(trim(p_review_text)) < 5 OR length(trim(p_review_text)) > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Review feedback must be between 5 and 1,000 characters.');
  END IF;

  -- 4. Check duplicate
  IF EXISTS (SELECT 1 FROM public.promotion_reviews WHERE order_id = p_order_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Duplicate review rejected: You have already reviewed this order.');
  END IF;

  -- Get promoter user ID
  SELECT user_id INTO v_promoter_user_id FROM public.promoter_profiles WHERE id = v_order.promoter_id;

  -- 5. Insert review
  INSERT INTO public.promotion_reviews (
    order_id,
    order_reference,
    business_user_id,
    promoter_id,
    promoter_user_id,
    rating,
    review_text,
    communication_rating,
    delivery_rating
  ) VALUES (
    v_order.id,
    v_order.order_reference,
    v_caller_id,
    v_order.promoter_id,
    v_promoter_user_id,
    round(p_rating, 2),
    trim(p_review_text),
    p_communication_rating,
    p_delivery_rating
  ) RETURNING id INTO v_review_id;

  -- 6. Recalculate average rating & count
  SELECT
    round(avg(rating), 2),
    count(*)
  INTO v_avg_rating, v_review_count
  FROM public.promotion_reviews
  WHERE promoter_id = v_order.promoter_id;

  -- Update promoter profile
  UPDATE public.promoter_profiles
  SET
    rating = COALESCE(v_avg_rating, 5.0),
    review_count = v_review_count,
    updated_at = now()
  WHERE id = v_order.promoter_id;

  RETURN jsonb_build_object(
    'ok', true,
    'review_id', v_review_id,
    'average_rating', v_avg_rating,
    'review_count', v_review_count
  );
END;
$$;

-- 4. Stored Procedure: resolve_disputed_promotion_order
-- Admin-only dispute arbitration with Option A (release to promoter) and Option B (refund business)
CREATE OR REPLACE FUNCTION public.resolve_disputed_promotion_order(
  p_order_id UUID,
  p_resolution TEXT, -- 'release_to_promoter' or 'refund_business'
  p_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_order RECORD;
  v_refund_ref TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: Please log in.');
  END IF;

  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden: Only administrators can arbitrate disputes.');
  END IF;

  IF length(trim(p_reason)) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Arbitration reason must be at least 10 characters.');
  END IF;

  -- Fetch & lock order
  SELECT * INTO v_order FROM public.promotion_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Promotion order not found.');
  END IF;

  IF v_order.status <> 'disputed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order is not in disputed status.');
  END IF;

  IF p_resolution = 'refund_business' THEN
    v_refund_ref := 'BTV-REFUND-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));

    -- Credit business wallet
    INSERT INTO public.user_wallets (user_id, balance, total_earned, total_withdrawn, currency)
    VALUES (v_order.business_user_id, v_order.amount, 0, 0, 'NGN')
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_wallets.balance + v_order.amount,
        updated_at = v_now;

    -- Record immutable ledger entry
    INSERT INTO public.wallet_ledger (
      user_id,
      order_id,
      settlement_reference,
      amount,
      currency,
      direction,
      type,
      balance_before,
      balance_after,
      status,
      description,
      metadata
    ) VALUES (
      v_order.business_user_id,
      v_order.id,
      v_refund_ref,
      v_order.amount,
      'NGN',
      'credit',
      'settlement_credit',
      0,
      v_order.amount,
      'completed',
      'Dispute Refund for Order #' || v_order.order_reference || '. Reason: ' || p_reason,
      jsonb_build_object('refund_reference', v_refund_ref, 'admin_id', v_caller_id, 'reason', p_reason)
    );

    -- Update order to cancelled
    UPDATE public.promotion_orders
    SET
      status = 'cancelled',
      dispute_resolution = 'refunded_to_business',
      dispute_resolution_reason = p_reason,
      dispute_resolved_at = v_now,
      dispute_resolved_by = v_caller_id,
      refund_reference = v_refund_ref,
      refunded_at = v_now,
      updated_at = v_now
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'ok', true,
      'resolution', 'refund_business',
      'refund_reference', v_refund_ref,
      'refund_amount', v_order.amount
    );

  ELSIF p_resolution = 'release_to_promoter' THEN
    -- Mark order as approved so Step 9 escrow settlement can be processed
    UPDATE public.promotion_orders
    SET
      status = 'approved',
      dispute_resolution = 'released_to_promoter',
      dispute_resolution_reason = p_reason,
      dispute_resolved_at = v_now,
      dispute_resolved_by = v_caller_id,
      approved_at = v_now,
      updated_at = v_now
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'ok', true,
      'resolution', 'release_to_promoter',
      'order_id', p_order_id
    );

  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid resolution parameter.');
  END IF;
END;
$$;
