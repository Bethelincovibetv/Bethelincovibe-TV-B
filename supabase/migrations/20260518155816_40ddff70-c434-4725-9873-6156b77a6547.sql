-- Public/business page background support
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS background_url text,
  ADD COLUMN IF NOT EXISTS background_template text;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS cover_template text;

-- Helper: feature flag values are enabled unless explicitly off
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT value NOT IN ('off','false','0','disabled') FROM public.site_settings WHERE key = 'feature_' || _key), true)
$$;

-- Missing trigger for auto-approving new supplier listings when the admin setting is on
DROP TRIGGER IF EXISTS trg_suppliers_auto_approve ON public.suppliers;
CREATE TRIGGER trg_suppliers_auto_approve
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.suppliers_auto_approve();

-- Backend-enforced helper for boost purchases
CREATE OR REPLACE FUNCTION public.activate_business_boost(_business_id uuid, _package_key text, _duration_days integer, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_business public.suppliers%rowtype;
  v_paid boolean;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;
  IF NOT public.is_feature_enabled('business_boost') THEN
    RAISE EXCEPTION 'Business boost is currently disabled';
  END IF;
  SELECT * INTO v_business FROM public.suppliers WHERE id = _business_id;
  IF v_business.id IS NULL OR v_business.submitted_by <> v_user THEN
    RAISE EXCEPTION 'Business not found';
  END IF;
  v_paid := public.deduct_wallet(v_user, _amount, 'Boost: ' || v_business.name || ' (' || _package_key || ')', _business_id);
  IF NOT v_paid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;
  v_start := GREATEST(COALESCE(v_business.boosted_until, now()), now());
  v_end := v_start + make_interval(days => _duration_days);
  INSERT INTO public.business_boosts (business_id, user_id, package_key, duration_days, amount, starts_at, ends_at, status)
  VALUES (_business_id, v_user, _package_key, _duration_days, _amount, now(), v_end, 'active');
  UPDATE public.suppliers SET boosted_until = v_end, featured = true, updated_at = now() WHERE id = _business_id;
  RETURN jsonb_build_object('success', true, 'ends_at', v_end);
END;
$$;

-- Safer user update policy for approved businesses, with feature-gated access
DROP POLICY IF EXISTS "Users can update own pending submissions" ON public.suppliers;
CREATE POLICY "Owners can update own listings when directory enabled"
ON public.suppliers
FOR UPDATE
USING (auth.uid() = submitted_by AND public.is_feature_enabled('businesses'))
WITH CHECK (auth.uid() = submitted_by AND public.is_feature_enabled('businesses'));

-- Feature-gated business submission policy
DROP POLICY IF EXISTS "Users can submit suppliers" ON public.suppliers;
CREATE POLICY "Users can submit suppliers when listing enabled"
ON public.suppliers
FOR INSERT
WITH CHECK (auth.uid() = submitted_by AND public.is_feature_enabled('business_listing'));

-- Feature-gated guest blog submission policies
DROP POLICY IF EXISTS "Users create own submissions" ON public.guest_blog_submissions;
CREATE POLICY "Users create own submissions when enabled"
ON public.guest_blog_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_feature_enabled('guest_blog'));

-- Seed/update feature flags and slider automation settings
INSERT INTO public.site_settings (key, value) VALUES
  ('feature_ai_auto_blog_slider', 'on'),
  ('feature_business_auto_approve', COALESCE((SELECT value FROM public.site_settings WHERE key='feature_business_auto_approve'), 'off')),
  ('auto_blog_slider_enabled', 'true')
ON CONFLICT (key) DO NOTHING;