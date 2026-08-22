
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

-- 2. Referrals tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  signup_bonus_amount numeric NOT NULL DEFAULT 0,
  purchase_bonus_total numeric NOT NULL DEFAULT 0,
  purchase_credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer or referred can view"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins manage referrals"
  ON public.referrals FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3. In-app notifications feed
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  url text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON public.user_notifications(user_id, created_at DESC);

CREATE POLICY "Users view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.user_notifications FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 4. Seed default settings (idempotent)
INSERT INTO public.site_settings (key, value) VALUES
  ('whatsapp_community_url',''),
  ('referral_signup_bonus','100'),
  ('referral_purchase_pct','10')
ON CONFLICT (key) DO NOTHING;

-- 5. Replace handle_new_user to add referral logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_code text;
  v_referrer uuid;
  v_bonus numeric;
  v_inv_code text;
BEGIN
  -- generate a short unique referral code
  LOOP
    v_ref_code := lower(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
  END LOOP;

  v_inv_code := lower(NULLIF(NEW.raw_user_meta_data->>'referred_by_code',''));
  IF v_inv_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer FROM public.profiles WHERE lower(referral_code) = v_inv_code LIMIT 1;
    IF v_referrer = NEW.id THEN v_referrer := NULL; END IF;
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, username, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    public.generate_username(NEW.email),
    v_ref_code,
    v_referrer
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF LOWER(NEW.email) IN ('bethelgoodgift3@gmail.com','bethelincovibetv@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Credit referrer signup bonus
  IF v_referrer IS NOT NULL THEN
    SELECT COALESCE(NULLIF(value,'')::numeric,0) INTO v_bonus
      FROM public.site_settings WHERE key = 'referral_signup_bonus';
    IF v_bonus IS NULL THEN v_bonus := 0; END IF;

    INSERT INTO public.referrals (referrer_id, referred_user_id, signup_bonus_amount)
    VALUES (v_referrer, NEW.id, v_bonus)
    ON CONFLICT (referred_user_id) DO NOTHING;

    IF v_bonus > 0 THEN
      INSERT INTO public.wallets (user_id, balance) VALUES (v_referrer, v_bonus)
        ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_bonus;
      INSERT INTO public.wallet_transactions (user_id, amount, type, description)
      VALUES (v_referrer, v_bonus, 'referral_signup', 'Referral signup bonus');
      INSERT INTO public.user_notifications (user_id, title, body, url, type)
      VALUES (v_referrer, 'Referral bonus earned!',
              '₦' || v_bonus || ' added to your wallet for a new referral.',
              '/dashboard/wallet', 'referral');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. RPC to credit referral purchase bonus (one-time, called from paystack-verify)
CREATE OR REPLACE FUNCTION public.credit_referral_purchase(_user_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pct numeric;
  v_bonus numeric;
  v_referrer uuid;
  v_already boolean;
BEGIN
  SELECT referred_by INTO v_referrer FROM public.profiles WHERE user_id = _user_id;
  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('credited', false, 'reason','no_referrer');
  END IF;

  SELECT purchase_credited INTO v_already FROM public.referrals WHERE referred_user_id = _user_id;
  IF COALESCE(v_already, false) THEN
    RETURN jsonb_build_object('credited', false, 'reason','already_credited');
  END IF;

  SELECT COALESCE(NULLIF(value,'')::numeric,0) INTO v_pct
    FROM public.site_settings WHERE key = 'referral_purchase_pct';
  IF v_pct IS NULL OR v_pct <= 0 THEN
    RETURN jsonb_build_object('credited', false, 'reason','disabled');
  END IF;

  v_bonus := round((_amount * v_pct / 100.0)::numeric, 2);
  IF v_bonus <= 0 THEN
    RETURN jsonb_build_object('credited', false, 'reason','zero');
  END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (v_referrer, v_bonus)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_bonus;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_referrer, v_bonus, 'referral_purchase', 'Referral purchase bonus');

  UPDATE public.referrals SET purchase_credited = true, purchase_bonus_total = purchase_bonus_total + v_bonus
    WHERE referred_user_id = _user_id;

  INSERT INTO public.user_notifications (user_id, title, body, url, type)
  VALUES (v_referrer, 'Referral purchase bonus!',
          '₦' || v_bonus || ' added to your wallet — your referral made a purchase.',
          '/dashboard/wallet','referral');

  RETURN jsonb_build_object('credited', true, 'amount', v_bonus);
END;
$function$;

-- 7. Helper used by app server-side flows / admin broadcast
CREATE OR REPLACE FUNCTION public.broadcast_notification(_title text, _body text, _url text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  INSERT INTO public.user_notifications (user_id, title, body, url, type)
    SELECT user_id, _title, _body, _url, 'admin' FROM public.profiles;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 8. Trigger to fan out admin push notifications into the in-app feed automatically
CREATE OR REPLACE FUNCTION public.fanout_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_notifications (user_id, title, body, url, type)
    SELECT user_id, NEW.title, NEW.body, NEW.url, 'admin' FROM public.profiles;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_fanout_push_notification ON public.push_notifications;
CREATE TRIGGER trg_fanout_push_notification
  AFTER INSERT ON public.push_notifications
  FOR EACH ROW EXECUTE FUNCTION public.fanout_push_notification();

-- 9. Notify ad owner when ad is approved/rejected
CREATE OR REPLACE FUNCTION public.notify_ad_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'active' AND COALESCE(OLD.status,'') <> 'active' THEN
    INSERT INTO public.user_notifications (user_id, title, body, url, type)
    VALUES (NEW.user_id, 'Ad approved 🎉', 'Your ad "' || NEW.title || '" is now live.', '/dashboard/ads','ad');
  ELSIF NEW.status = 'rejected' AND COALESCE(OLD.status,'') <> 'rejected' THEN
    INSERT INTO public.user_notifications (user_id, title, body, url, type)
    VALUES (NEW.user_id, 'Ad rejected', COALESCE(NEW.rejection_reason,'Your ad was rejected. Wallet refunded.'), '/dashboard/ads','ad');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_ad_status ON public.user_ads;
CREATE TRIGGER trg_notify_ad_status
  AFTER UPDATE OF status ON public.user_ads
  FOR EACH ROW EXECUTE FUNCTION public.notify_ad_status_change();

-- 10. Backfill referral codes for existing profiles
UPDATE public.profiles
SET referral_code = lower(substr(replace(gen_random_uuid()::text,'-',''),1,8))
WHERE referral_code IS NULL;
