CREATE OR REPLACE FUNCTION public.generate_username(_email text, _display_name text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base text;
  candidate text;
  n integer := 0;
BEGIN
  base := regexp_replace(lower(coalesce(nullif(trim(_display_name), ''), split_part(_email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  IF base IS NULL OR length(base) = 0 THEN base := 'user'; END IF;
  base := left(base, 40);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$function$;

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
  v_display text;
BEGIN
  LOOP
    v_ref_code := lower(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
  END LOOP;

  v_inv_code := lower(NULLIF(NEW.raw_user_meta_data->>'referred_by_code',''));
  IF v_inv_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer FROM public.profiles WHERE lower(referral_code) = v_inv_code LIMIT 1;
    IF v_referrer = NEW.id THEN v_referrer := NULL; END IF;
  END IF;

  v_display := COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (user_id, email, display_name, username, referral_code, referred_by, avatar_url, is_public)
  VALUES (
    NEW.id,
    NEW.email,
    v_display,
    public.generate_username(NEW.email, v_display),
    v_ref_code,
    v_referrer,
    NULLIF(NEW.raw_user_meta_data->>'avatar_url',''),
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF LOWER(NEW.email) IN ('bethelgoodgift3@gmail.com','bethelincovibetv@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

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

ALTER TABLE public.profiles ALTER COLUMN is_public SET DEFAULT true;
UPDATE public.profiles SET is_public = true WHERE is_public = false;