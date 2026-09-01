-- Migration: 20260901100000_escrow_settlements_and_payouts.sql
-- Description: Step 9 — Escrow Settlement, Platform Fee Deduction, Wallet Crediting, Payout State Machine & Double-Spend Protection

-- 1. Ensure promotion_settlements table exists
CREATE TABLE IF NOT EXISTS public.promotion_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_reference TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.promotion_orders(id) ON DELETE RESTRICT,
  order_reference TEXT NOT NULL,
  business_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promoter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promoter_id UUID NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee NUMERIC(12,2) NOT NULL CHECK (platform_fee >= 0),
  platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  promoter_net_amount NUMERIC(12,2) NOT NULL CHECK (promoter_net_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'settled' CHECK (status IN ('settled', 'reversed', 'disputed')),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NULL,
  CONSTRAINT uq_promotion_settlement_order UNIQUE (order_id),
  CONSTRAINT chk_settlement_math CHECK (ROUND((platform_fee + promoter_net_amount) * 100) = ROUND(gross_amount * 100))
);

CREATE INDEX IF NOT EXISTS idx_promotion_settlements_order ON public.promotion_settlements(order_id);
CREATE INDEX IF NOT EXISTS idx_promotion_settlements_promoter ON public.promotion_settlements(promoter_user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_settlements_business ON public.promotion_settlements(business_user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_settlements_ref ON public.promotion_settlements(settlement_reference);

-- Enable RLS on promotion_settlements
ALTER TABLE public.promotion_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settlements" ON public.promotion_settlements;
CREATE POLICY "Users can view their own settlements"
  ON public.promotion_settlements
  FOR SELECT
  USING (
    promoter_user_id = auth.uid() OR
    business_user_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  );

-- 2. Create payout_requests table for promoters & users
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_reference TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promoter_id UUID NULL REFERENCES public.promoter_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 1000.00), -- Enforce minimum ₦1,000 threshold
  currency TEXT NOT NULL DEFAULT 'NGN',
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  account_number TEXT NOT NULL CHECK (length(account_number) = 10),
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'pending', 'processing', 'paid', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  paid_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,
  failure_reason TEXT NULL,
  provider_reference TEXT NULL,
  provider_transfer_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_ref ON public.payout_requests(payout_reference);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- Enable RLS on payout_requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view their own payout requests"
  ON public.payout_requests
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  );

-- 3. Atomic Database Function: release_promotion_order_escrow
-- Ensures atomic, idempotent settlement, fee deduction, wallet crediting, and status transition
CREATE OR REPLACE FUNCTION public.release_promotion_order_escrow(
  _order_id UUID,
  _caller_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_promoter_user_id UUID;
  v_existing_settlement RECORD;
  v_gross NUMERIC(12,2);
  v_fee_pct NUMERIC(5,2);
  v_fee NUMERIC(12,2);
  v_net NUMERIC(12,2);
  v_settlement_ref TEXT;
  v_now TIMESTAMPTZ := now();
  v_settlement_id UUID;
  v_wallet RECORD;
BEGIN
  -- 1. Lock and fetch order
  SELECT * INTO v_order
  FROM public.promotion_orders
  WHERE id = _order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promotion order not found');
  END IF;

  -- 2. Check existing settlement for idempotency
  SELECT * INTO v_existing_settlement
  FROM public.promotion_settlements
  WHERE order_id = _order_id;

  IF v_existing_settlement.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_settled', true,
      'settlement_reference', v_existing_settlement.settlement_reference,
      'promoter_net_amount', v_existing_settlement.promoter_net_amount
    );
  END IF;

  -- 3. Invariant Checks
  IF v_order.status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order cannot be settled. Current status is: ' || v_order.status || '. Must be in approved status.'
    );
  END IF;

  -- 4. Determine promoter user_id
  SELECT user_id INTO v_promoter_user_id
  FROM public.promoter_profiles
  WHERE id = v_order.promoter_id;

  IF v_promoter_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not locate promoter profile user account');
  END IF;

  -- 5. Calculate Server-Authoritative Platform Fee & Net
  v_gross := v_order.amount;
  v_fee_pct := COALESCE(v_order.platform_fee_percent, 10.00);
  v_fee := ROUND((v_gross * (v_fee_pct / 100.00)), 2);
  v_net := v_gross - v_fee;

  v_settlement_ref := 'BTV-SETTLE-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));
  v_settlement_id := gen_random_uuid();

  -- 6. Insert Settlement Record
  INSERT INTO public.promotion_settlements (
    id,
    settlement_reference,
    order_id,
    order_reference,
    business_user_id,
    promoter_user_id,
    promoter_id,
    gross_amount,
    platform_fee,
    platform_fee_percent,
    promoter_net_amount,
    currency,
    status,
    settled_at,
    created_at
  ) VALUES (
    v_settlement_id,
    v_settlement_ref,
    v_order.id,
    v_order.order_reference,
    v_order.business_user_id,
    v_promoter_user_id,
    v_order.promoter_id,
    v_gross,
    v_fee,
    v_fee_pct,
    v_net,
    'NGN',
    'settled',
    v_now,
    v_now
  );

  -- 7. Credit Promoter Wallet atomically
  INSERT INTO public.wallets (user_id, balance, currency, updated_at)
  VALUES (v_promoter_user_id, v_net, 'NGN', v_now)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.wallets.balance + v_net,
      updated_at = v_now;

  -- 8. Insert Immutable Ledger / Transaction Record
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id,
    created_at
  ) VALUES (
    v_promoter_user_id,
    v_net,
    'settlement_credit',
    'Settlement for Promotion Order #' || v_order.order_reference,
    v_settlement_ref,
    v_now
  );

  -- 9. Update Order to Completed State
  UPDATE public.promotion_orders
  SET status = 'completed',
      settlement_status = 'settled',
      settlement_id = v_settlement_id,
      settlement_reference = v_settlement_ref,
      settled_at = v_now,
      completed_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  -- 10. Targeted Notification to Promoter
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    url,
    type,
    is_read
  ) VALUES (
    v_promoter_user_id,
    'Promotion Settlement Credited (₦' || to_char(v_net, 'FM999,999,999.00') || ')',
    'Earnings for Promotion Order #' || v_order.order_reference || ' have been deposited to your wallet.',
    '/dashboard/wallet',
    'wallet',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_settled', false,
    'settlement_reference', v_settlement_ref,
    'gross_amount', v_gross,
    'platform_fee', v_fee,
    'promoter_net_amount', v_net
  );
END;
$$;

-- 4. Atomic Database Function: request_promoter_payout
-- Reserves funds from wallet balance to prevent double-spending and creates payout request
CREATE OR REPLACE FUNCTION public.request_promoter_payout(
  _amount NUMERIC(12,2),
  _bank_name TEXT,
  _bank_code TEXT,
  _account_number TEXT,
  _account_name TEXT,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet RECORD;
  v_payout_ref TEXT;
  v_payout_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: User authentication required');
  END IF;

  IF _amount < 1000.00 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal amount is ₦1,000.00');
  END IF;

  IF length(regexp_replace(_account_number, '\D', '', 'g')) != 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account number must be exactly 10 digits');
  END IF;

  -- Lock wallet row
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = _user_id
  FOR UPDATE;

  IF v_wallet.id IS NULL OR v_wallet.balance < _amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient available balance'
    );
  END IF;

  v_payout_ref := 'BTV-PAYOUT-' || to_char(v_now, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));
  v_payout_id := gen_random_uuid();

  -- Deduct from available balance
  UPDATE public.wallets
  SET balance = balance - _amount,
      updated_at = v_now
  WHERE user_id = _user_id;

  -- Insert Payout Request
  INSERT INTO public.payout_requests (
    id,
    payout_reference,
    user_id,
    amount,
    currency,
    bank_name,
    bank_code,
    account_number,
    account_name,
    status,
    requested_at,
    created_at,
    updated_at
  ) VALUES (
    v_payout_id,
    v_payout_ref,
    _user_id,
    _amount,
    'NGN',
    _bank_name,
    _bank_code,
    _account_number,
    _account_name,
    'requested',
    v_now,
    v_now,
    v_now
  );

  -- Record Ledger Entry
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id,
    created_at
  ) VALUES (
    _user_id,
    -_amount,
    'payout_reserved',
    'Payout withdrawal reservation (#' || v_payout_ref || ') to ' || _bank_name || ' (' || _account_number || ')',
    v_payout_ref,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'payout_reference', v_payout_ref,
    'amount', _amount,
    'status', 'requested'
  );
END;
$$;
