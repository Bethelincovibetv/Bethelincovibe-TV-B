
-- user_ads table
CREATE TABLE public.user_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  target_url text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 30),
  cost_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, submitted, rejected, failed
  ggd_ad_id text,
  ggd_response jsonb,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ads" ON public.user_ads FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own ads" ON public.user_ads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage ads" ON public.user_ads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_user_ads_updated BEFORE UPDATE ON public.user_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- daily reward claim tracker
CREATE TABLE public.daily_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  claim_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_date)
);
ALTER TABLE public.daily_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own claims" ON public.daily_reward_claims FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- claim_daily_reward function
CREATE OR REPLACE FUNCTION public.claim_daily_reward(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amount numeric;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_existing uuid;
BEGIN
  SELECT value::numeric INTO v_amount FROM public.site_settings WHERE key = 'daily_login_credits';
  IF v_amount IS NULL OR v_amount <= 0 THEN v_amount := 5; END IF;

  SELECT id INTO v_existing FROM public.daily_reward_claims
    WHERE user_id = _user_id AND claim_date = v_today;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed_today');
  END IF;

  INSERT INTO public.daily_reward_claims (user_id, claim_date, amount)
    VALUES (_user_id, v_today, v_amount);

  INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, v_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_amount;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_user_id, v_amount, 'daily_reward', 'Daily login reward');

  RETURN jsonb_build_object('claimed', true, 'amount', v_amount);
END; $$;

-- admin_adjust_wallet
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id uuid, _amount numeric, _description text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can adjust wallets';
  END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (_user_id, GREATEST(_amount, 0))
    ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(wallets.balance + _amount, 0);
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_user_id, _amount,
      CASE WHEN _amount >= 0 THEN 'admin_credit' ELSE 'admin_debit' END,
      COALESCE(_description, 'Admin adjustment'));
  RETURN true;
END; $$;

-- Default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('daily_login_credits', '5'),
  ('ad_cost_per_day', '500'),
  ('ggd_ad_network_api_key', '')
ON CONFLICT DO NOTHING;

-- Storage bucket for ad creatives
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ad creatives public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-creatives');
CREATE POLICY "Users upload own ad creatives" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-creatives' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own ad creatives" ON storage.objects FOR DELETE
  USING (bucket_id = 'ad-creatives' AND auth.uid()::text = (storage.foldername(name))[1]);
