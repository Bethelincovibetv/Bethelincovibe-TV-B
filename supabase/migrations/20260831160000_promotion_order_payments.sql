-- Migration: 20260831160000_promotion_order_payments.sql
-- Description: Step 7 — Payment Integration & Payment Verification (Paystack & Escrow) for Bethelincovibe Business Promotion Network

-- 1. Ensure unique index on payment_reference for non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_orders_payment_ref 
  ON public.promotion_orders(payment_reference) 
  WHERE payment_reference IS NOT NULL;

-- 2. Create promotion_payment_logs table for audit trail and webhook idempotency
CREATE TABLE IF NOT EXISTS public.promotion_payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.promotion_orders(id) ON DELETE CASCADE,
  order_reference TEXT NOT NULL,
  payment_reference TEXT NOT NULL UNIQUE,
  paystack_transaction_id TEXT NULL,
  business_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_naira NUMERIC(12,2) NOT NULL CHECK (amount_naira > 0),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'initialized' CHECK (status IN ('initialized', 'verified', 'failed', 'duplicate_ignored')),
  paystack_response JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_promotion_payment_logs_order ON public.promotion_payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_promotion_payment_logs_ref ON public.promotion_payment_logs(payment_reference);

ALTER TABLE public.promotion_payment_logs ENABLE ROW LEVEL SECURITY;

-- Payment logs RLS: Business user can view their logs, Admin can view all
DROP POLICY IF EXISTS "Business users can view own payment logs" ON public.promotion_payment_logs;
CREATE POLICY "Business users can view own payment logs"
  ON public.promotion_payment_logs
  FOR SELECT
  USING (
    business_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Update the trigger function to allow status transition from pending_payment to paid_escrow during verification
CREATE OR REPLACE FUNCTION public.protect_promotion_order_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_pkg_record RECORD;
  v_comm_record RECORD;
  v_generated_ref TEXT;
BEGIN
  NEW.updated_at = now();

  -- ON INSERT
  IF TG_OP = 'INSERT' THEN
    -- Confirm business_user_id matches authenticated user if not admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Must be logged in to create a promotion order.';
      END IF;
      NEW.business_user_id = auth.uid();
    END IF;

    -- Ensure brief is provided and not empty
    IF NEW.promotion_brief IS NULL OR trim(NEW.promotion_brief) = '' THEN
      RAISE EXCEPTION 'Validation Error: Promotion brief is required.';
    END IF;

    -- Enforce initial status to 'pending_payment'
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      IF NEW.status IS NULL OR NEW.status != 'pending_payment' THEN
        NEW.status = 'pending_payment';
      END IF;
      NEW.payment_reference = NULL;
      NEW.paid_at = NULL;
      NEW.evidence_submitted_at = NULL;
      NEW.approved_at = NULL;
      NEW.completed_at = NULL;
    END IF;

    -- Validate Package, Community & Promoter consistency
    SELECT id, promoter_id, community_id, price, is_active
    INTO v_pkg_record
    FROM public.promotion_packages
    WHERE id = NEW.package_id;

    IF v_pkg_record.id IS NULL THEN
      RAISE EXCEPTION 'Invalid Package: Selected promotion package does not exist.';
    END IF;

    IF v_pkg_record.is_active != true THEN
      RAISE EXCEPTION 'Unavailable Package: Selected promotion package is inactive.';
    END IF;

    IF v_pkg_record.price < 500 THEN
      RAISE EXCEPTION 'Invalid Price: Package price must be at least 500 Naira.';
    END IF;

    IF NEW.promoter_id != v_pkg_record.promoter_id THEN
      RAISE EXCEPTION 'Forbidden: Promoter does not match package owner.';
    END IF;

    IF NEW.community_id != v_pkg_record.community_id THEN
      RAISE EXCEPTION 'Forbidden: Community does not match package community.';
    END IF;

    SELECT id, promoter_id, verification_status, is_published
    INTO v_comm_record
    FROM public.whatsapp_communities
    WHERE id = NEW.community_id;

    IF v_comm_record.id IS NULL THEN
      RAISE EXCEPTION 'Invalid Community: Selected community does not exist.';
    END IF;

    IF v_comm_record.verification_status != 'verified' OR v_comm_record.is_published != true THEN
      RAISE EXCEPTION 'Forbidden: Cannot book a package on an unverified or unpublished community.';
    END IF;

    -- Enforce snapshot price directly from package
    NEW.amount = v_pkg_record.price;
    NEW.platform_fee = round(v_pkg_record.price * 0.10, 2);
    NEW.promoter_net_earning = NEW.amount - NEW.platform_fee;

    -- Ensure Order Reference is formatted and present
    IF NEW.order_reference IS NULL OR trim(NEW.order_reference) = '' THEN
      v_generated_ref = 'BTV-PROM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      NEW.order_reference = v_generated_ref;
    END IF;

  -- ON UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      -- Immutable fields protection
      IF NEW.business_user_id != OLD.business_user_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify business_user_id.';
      END IF;

      IF NEW.promoter_id != OLD.promoter_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify promoter_id.';
      END IF;

      IF NEW.community_id != OLD.community_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify community_id.';
      END IF;

      IF NEW.package_id != OLD.package_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify package_id.';
      END IF;

      IF NEW.amount != OLD.amount THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify order amount.';
      END IF;

      IF NEW.platform_fee != OLD.platform_fee THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify platform fee.';
      END IF;

      IF NEW.promoter_net_earning != OLD.promoter_net_earning THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify promoter net earning.';
      END IF;

      IF NEW.order_reference != OLD.order_reference THEN
        RAISE EXCEPTION 'Forbidden: Cannot modify order_reference.';
      END IF;

      -- Allow updating payment_reference when transitioning or preparing payment
      -- Status transition rules:
      IF NEW.status != OLD.status THEN
        -- Only pending_payment -> paid_escrow is permitted when paid_at is supplied
        IF OLD.status = 'pending_payment' AND NEW.status = 'paid_escrow' THEN
          IF NEW.paid_at IS NULL THEN
            RAISE EXCEPTION 'Forbidden: paid_at timestamp is required for paid_escrow status.';
          END IF;
          IF NEW.payment_reference IS NULL THEN
            RAISE EXCEPTION 'Forbidden: payment_reference is required for paid_escrow status.';
          END IF;
        ELSE
          RAISE EXCEPTION 'Forbidden: Direct status transition from % to % is restricted.', OLD.status, NEW.status;
        END IF;
      END IF;

      NEW.created_at = OLD.created_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Secure RPC Function: Initialize Promotion Order Payment
CREATE OR REPLACE FUNCTION public.init_promotion_order_payment(
  p_order_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_payment_ref TEXT;
  v_amount_kobo BIGINT;
  v_user_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Please log in to initialize payment.';
  END IF;

  -- Fetch and lock the order
  SELECT * INTO v_order
  FROM public.promotion_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order Not Found: Promotion order does not exist.';
  END IF;

  -- Validate ownership
  IF v_order.business_user_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: You do not have permission to pay for this order.';
  END IF;

  -- Validate status
  IF v_order.status = 'paid_escrow' THEN
    RAISE EXCEPTION 'Order Already Paid: This promotion order has already been funded in escrow.';
  END IF;

  IF v_order.status != 'pending_payment' THEN
    RAISE EXCEPTION 'Invalid Order State: Cannot pay for order with status %.', v_order.status;
  END IF;

  -- Validate amount
  IF v_order.amount IS NULL OR v_order.amount <= 0 THEN
    RAISE EXCEPTION 'Invalid Order Amount: Order amount must be greater than zero.';
  END IF;

  -- Generate secure payment reference
  v_payment_ref = 'BTV-PAY-PROM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  v_amount_kobo = (v_order.amount * 100)::BIGINT;

  -- Get user email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- Update order with new payment reference
  UPDATE public.promotion_orders
  SET 
    payment_reference = v_payment_ref,
    payment_method = 'paystack'
  WHERE id = v_order.id;

  -- Log payment initialization
  INSERT INTO public.promotion_payment_logs (
    order_id,
    order_reference,
    payment_reference,
    business_user_id,
    amount_naira,
    amount_kobo,
    currency,
    status
  ) VALUES (
    v_order.id,
    v_order.order_reference,
    v_payment_ref,
    auth.uid(),
    v_order.amount,
    v_amount_kobo,
    'NGN',
    'initialized'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_reference', v_order.order_reference,
    'payment_reference', v_payment_ref,
    'amount', v_order.amount,
    'amount_kobo', v_amount_kobo,
    'currency', 'NGN',
    'email', v_user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Secure RPC Function: Verify and Confirm Promotion Order Payment
CREATE OR REPLACE FUNCTION public.verify_and_confirm_promotion_order_payment(
  p_order_id UUID,
  p_payment_reference TEXT,
  p_paystack_tx_id TEXT DEFAULT NULL,
  p_verified_amount_naira NUMERIC DEFAULT NULL,
  p_verified_currency TEXT DEFAULT 'NGN',
  p_paystack_raw_response JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_updated_order public.promotion_orders;
  v_promoter_user_id UUID;
  v_business_email TEXT;
BEGIN
  -- Fetch order
  SELECT * INTO v_order
  FROM public.promotion_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order Not Found: Promotion order does not exist.';
  END IF;

  -- Idempotency check: if order is already paid_escrow with matching payment_reference
  IF v_order.status = 'paid_escrow' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_paid', true,
      'order_id', v_order.id,
      'order_reference', v_order.order_reference,
      'status', v_order.status,
      'paid_at', v_order.paid_at,
      'amount', v_order.amount
    );
  END IF;

  IF v_order.status != 'pending_payment' THEN
    RAISE EXCEPTION 'Invalid Order State: Cannot verify payment for order with status %.', v_order.status;
  END IF;

  -- Currency check
  IF p_verified_currency != 'NGN' THEN
    RAISE EXCEPTION 'Invalid Currency: Expected NGN, received %.', p_verified_currency;
  END IF;

  -- Amount check: verified amount must match or exceed trusted order amount
  IF p_verified_amount_naira IS NOT NULL AND p_verified_amount_naira < v_order.amount THEN
    RAISE EXCEPTION 'Payment Amount Mismatch: Expected at least ₦%, received ₦%.', v_order.amount, p_verified_amount_naira;
  END IF;

  -- Transition order to paid_escrow atomically
  UPDATE public.promotion_orders
  SET
    status = 'paid_escrow',
    paid_at = now(),
    payment_method = 'paystack',
    payment_reference = p_payment_reference
  WHERE id = v_order.id
  RETURNING * INTO v_updated_order;

  -- Update payment log
  UPDATE public.promotion_payment_logs
  SET
    status = 'verified',
    paystack_transaction_id = p_paystack_tx_id,
    verified_at = now(),
    paystack_response = p_paystack_raw_response
  WHERE payment_reference = p_payment_reference;

  -- Get promoter's user_id to send notification
  SELECT user_id INTO v_promoter_user_id
  FROM public.promoter_profiles
  WHERE id = v_order.promoter_id;

  -- Send In-App Notifications
  IF v_promoter_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id,
      title,
      body,
      url,
      type
    ) VALUES (
      v_promoter_user_id,
      'Promotion Order Funded 🎉',
      'A business has completed payment of ₦' || to_char(v_order.amount, 'FM999,999,990.00') || ' for order ' || v_order.order_reference || '. Escrow is funded. You can now prepare your broadcast.',
      '/dashboard/promoter-orders/' || v_order.id,
      'order_funded'
    );
  END IF;

  -- Notify Business
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    url,
    type
  ) VALUES (
    v_order.business_user_id,
    'Payment Confirmed ✅',
    'Your promotion order ' || v_order.order_reference || ' payment of ₦' || to_char(v_order.amount, 'FM999,999,990.00') || ' is secured in escrow.',
    '/dashboard/promotion-orders/' || v_order.id,
    'payment_confirmed'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'order_id', v_updated_order.id,
    'order_reference', v_updated_order.order_reference,
    'status', v_updated_order.status,
    'paid_at', v_updated_order.paid_at,
    'amount', v_updated_order.amount,
    'payment_reference', v_updated_order.payment_reference
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
