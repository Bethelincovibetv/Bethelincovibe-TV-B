-- Migration: 20260831150000_create_promotion_orders.sql
-- Description: Step 6 — Promotion Orders & Booking Foundation for Bethelincovibe Business Promotion Network

-- 1. Create promotion_orders table
CREATE TABLE IF NOT EXISTS public.promotion_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference TEXT UNIQUE NOT NULL,
  business_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NULL REFERENCES public.suppliers(id) ON DELETE SET NULL,
  promoter_id UUID NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE RESTRICT,
  community_id UUID NOT NULL REFERENCES public.whatsapp_communities(id) ON DELETE RESTRICT,
  package_id UUID NOT NULL REFERENCES public.promotion_packages(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
  promoter_net_earning NUMERIC(12,2) NOT NULL CHECK (promoter_net_earning > 0),
  payment_method TEXT NULL,
  payment_reference TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment',
    'paid_escrow',
    'in_progress',
    'evidence_submitted',
    'revision_requested',
    'completed',
    'disputed',
    'refunded',
    'cancelled'
  )),
  promotion_brief TEXT NOT NULL,
  creative_assets_urls TEXT[] NULL,
  special_instructions TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  evidence_submitted_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_promotion_orders_business_user ON public.promotion_orders(business_user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_orders_promoter_id ON public.promotion_orders(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promotion_orders_community_id ON public.promotion_orders(community_id);
CREATE INDEX IF NOT EXISTS idx_promotion_orders_package_id ON public.promotion_orders(package_id);
CREATE INDEX IF NOT EXISTS idx_promotion_orders_status ON public.promotion_orders(status);
CREATE INDEX IF NOT EXISTS idx_promotion_orders_order_ref ON public.promotion_orders(order_reference);

-- Enable Row Level Security
ALTER TABLE public.promotion_orders ENABLE ROW LEVEL SECURITY;

-- 2. Trigger Function for DB-Level Order Security and Snapshot Integrity
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
    -- A: Confirm business_user_id matches authenticated user if not admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Must be logged in to create a promotion order.';
      END IF;
      NEW.business_user_id = auth.uid();
    END IF;

    -- B: Ensure brief is provided and not empty
    IF NEW.promotion_brief IS NULL OR trim(NEW.promotion_brief) = '' THEN
      RAISE EXCEPTION 'Validation Error: Promotion brief is required.';
    END IF;

    -- C: Enforce initial status to 'pending_payment'
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      IF NEW.status IS NULL OR NEW.status != 'pending_payment' THEN
        NEW.status = 'pending_payment';
      END IF;
      -- Ensure payment fields are null on creation
      NEW.payment_reference = NULL;
      NEW.paid_at = NULL;
      NEW.evidence_submitted_at = NULL;
      NEW.approved_at = NULL;
      NEW.completed_at = NULL;
    END IF;

    -- D: Validate Package, Community & Promoter consistency
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

    -- Ensure promoter_id and community_id match package
    IF NEW.promoter_id != v_pkg_record.promoter_id THEN
      RAISE EXCEPTION 'Forbidden: Promoter does not match package owner.';
    END IF;

    IF NEW.community_id != v_pkg_record.community_id THEN
      RAISE EXCEPTION 'Forbidden: Community does not match package community.';
    END IF;

    -- Verify Community is verified and published
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
    NEW.platform_fee = round(v_pkg_record.price * 0.10, 2); -- 10% platform commission
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

      IF NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Forbidden: Direct status transition is restricted.';
      END IF;

      NEW.created_at = OLD.created_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind trigger to promotion_orders table
DROP TRIGGER IF EXISTS trg_protect_promotion_order ON public.promotion_orders;

CREATE TRIGGER trg_protect_promotion_order
  BEFORE INSERT OR UPDATE ON public.promotion_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_promotion_order_fields();

-- 3. RLS Policies

-- SELECT: Business owner, targeted promoter, or admin
DROP POLICY IF EXISTS "Business users can view own orders" ON public.promotion_orders;
CREATE POLICY "Business users can view own orders"
  ON public.promotion_orders
  FOR SELECT
  USING (
    business_user_id = auth.uid()
    OR (
      auth.uid() IS NOT NULL
      AND promoter_id IN (
        SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- INSERT: Authenticated business users can insert their own orders
DROP POLICY IF EXISTS "Authenticated users can create promotion orders" ON public.promotion_orders;
CREATE POLICY "Authenticated users can create promotion orders"
  ON public.promotion_orders
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND business_user_id = auth.uid()
  );

-- UPDATE: Admins can update; non-admins restricted by trigger
DROP POLICY IF EXISTS "Admins can update orders" ON public.promotion_orders;
CREATE POLICY "Admins can update orders"
  ON public.promotion_orders
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- DELETE: Admin only
DROP POLICY IF EXISTS "Admins can delete orders" ON public.promotion_orders;
CREATE POLICY "Admins can delete orders"
  ON public.promotion_orders
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- 4. Secure RPC Function for Atomic Order Creation
CREATE OR REPLACE FUNCTION public.create_promotion_order(
  p_package_id UUID,
  p_promotion_brief TEXT,
  p_creative_assets_urls TEXT[] DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL
)
RETURNS public.promotion_orders AS $$
DECLARE
  v_pkg_record RECORD;
  v_comm_record RECORD;
  v_order_record public.promotion_orders;
  v_order_ref TEXT;
  v_platform_fee NUMERIC(12,2);
  v_promoter_net NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Please log in to book a promotion.';
  END IF;

  IF p_promotion_brief IS NULL OR trim(p_promotion_brief) = '' THEN
    RAISE EXCEPTION 'Validation Error: Promotion brief is required.';
  END IF;

  -- Lock & read package atomically
  SELECT id, promoter_id, community_id, price, is_active
  INTO v_pkg_record
  FROM public.promotion_packages
  WHERE id = p_package_id
  FOR SHARE;

  IF v_pkg_record.id IS NULL THEN
    RAISE EXCEPTION 'Invalid Package: Promotion package not found.';
  END IF;

  IF v_pkg_record.is_active != true THEN
    RAISE EXCEPTION 'Unavailable Package: This promotion package is currently inactive.';
  END IF;

  IF v_pkg_record.price < 500 THEN
    RAISE EXCEPTION 'Invalid Price: Package price must be at least 500 Naira.';
  END IF;

  -- Verify community is verified and published
  SELECT id, promoter_id, verification_status, is_published
  INTO v_comm_record
  FROM public.whatsapp_communities
  WHERE id = v_pkg_record.community_id;

  IF v_comm_record.id IS NULL OR v_comm_record.verification_status != 'verified' OR v_comm_record.is_published != true THEN
    RAISE EXCEPTION 'Forbidden: Community is not verified or not published.';
  END IF;

  -- Calculate fees
  v_platform_fee = round(v_pkg_record.price * 0.10, 2);
  v_promoter_net = v_pkg_record.price - v_platform_fee;
  v_order_ref = 'BTV-PROM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  -- Insert order
  INSERT INTO public.promotion_orders (
    order_reference,
    business_user_id,
    promoter_id,
    community_id,
    package_id,
    amount,
    platform_fee,
    promoter_net_earning,
    status,
    promotion_brief,
    creative_assets_urls,
    special_instructions
  ) VALUES (
    v_order_ref,
    auth.uid(),
    v_pkg_record.promoter_id,
    v_pkg_record.community_id,
    v_pkg_record.id,
    v_pkg_record.price,
    v_platform_fee,
    v_promoter_net,
    'pending_payment',
    p_promotion_brief,
    p_creative_assets_urls,
    p_special_instructions
  )
  RETURNING * INTO v_order_record;

  RETURN v_order_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
