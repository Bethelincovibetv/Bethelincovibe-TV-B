
CREATE TABLE IF NOT EXISTS public.ad_click_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  page_path text,
  ad_slot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_click_earnings_user ON public.ad_click_earnings(user_id, created_at DESC);

ALTER TABLE public.ad_click_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ad earnings" ON public.ad_click_earnings
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ad earnings" ON public.ad_click_earnings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_settings (key, value) VALUES
  ('ad_click_reward_naira', '2'),
  ('ad_click_cooldown_seconds', '30')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.credit_ad_click(_page_path text DEFAULT NULL, _ad_slot text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_amount numeric;
  v_cooldown integer;
  v_last timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'login_required');
  END IF;

  SELECT COALESCE(NULLIF(value,'')::numeric, 0) INTO v_amount
    FROM public.site_settings WHERE key = 'ad_click_reward_naira';
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'reward_disabled');
  END IF;

  SELECT COALESCE(NULLIF(value,'')::integer, 30) INTO v_cooldown
    FROM public.site_settings WHERE key = 'ad_click_cooldown_seconds';
  IF v_cooldown IS NULL THEN v_cooldown := 30; END IF;

  SELECT MAX(created_at) INTO v_last FROM public.ad_click_earnings WHERE user_id = v_user;
  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => v_cooldown) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cooldown');
  END IF;

  INSERT INTO public.ad_click_earnings (user_id, amount, page_path, ad_slot)
    VALUES (v_user, v_amount, _page_path, _ad_slot);

  INSERT INTO public.wallets (user_id, balance) VALUES (v_user, v_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_amount;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user, v_amount, 'ad_click_reward', 'Ad click reward');

  RETURN jsonb_build_object('success', true, 'amount', v_amount);
END;
$$;
