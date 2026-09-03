-- Wallet PIN security: separate from the user's normal TV login password.
-- PIN is never stored in plaintext and is required by the authoritative payout RPC.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.wallet_security_pins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ NULL,
  pin_set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_security_pins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet PIN status" ON public.wallet_security_pins;
CREATE POLICY "Users can view own wallet PIN status"
  ON public.wallet_security_pins FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_wallet_pin(_pin TEXT, _user_id UUID DEFAULT auth.uid())
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_salt TEXT; v_hash TEXT;
BEGIN
  IF _user_id IS NULL OR auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN jsonb_build_object('success',false,'error','Unauthorized');
  END IF;
  IF _pin IS NULL OR _pin !~ '^\d{4}$' THEN
    RETURN jsonb_build_object('success',false,'error','Wallet PIN must be exactly 4 digits','code','INVALID_PIN');
  END IF;
  IF _pin IN ('0000','1111','1234','4321') THEN
    RETURN jsonb_build_object('success',false,'error','Choose a less predictable 4-digit PIN','code','WEAK_PIN');
  END IF;
  v_salt := encode(gen_random_bytes(16),'hex');
  v_hash := encode(digest(v_salt || ':' || _pin,'sha256'),'hex');
  INSERT INTO public.wallet_security_pins(user_id,pin_hash,pin_salt,failed_attempts,locked_until,pin_set_at,updated_at)
  VALUES(_user_id,v_hash,v_salt,0,NULL,now(),now())
  ON CONFLICT(user_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,pin_salt=EXCLUDED.pin_salt,failed_attempts=0,locked_until=NULL,pin_set_at=now(),updated_at=now();
  RETURN jsonb_build_object('success',true,'pin_set',true);
END;
$$;

-- Replace the old payout RPC so PIN verification happens in the same transaction
-- as the wallet row lock and balance reservation. This prevents UI/API bypasses.
DROP FUNCTION IF EXISTS public.request_promoter_payout(numeric,text,text,text,text,uuid);
DROP FUNCTION IF EXISTS public.request_promoter_payout(numeric,text,text,text,text,uuid,text);

CREATE OR REPLACE FUNCTION public.request_promoter_payout(
  _amount NUMERIC(12,2),
  _bank_name TEXT,
  _bank_code TEXT,
  _account_number TEXT,
  _account_name TEXT,
  _user_id UUID DEFAULT auth.uid(),
  _wallet_pin TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet RECORD; v_pin RECORD; v_expected TEXT;
  v_payout_ref TEXT; v_payout_id UUID; v_now TIMESTAMPTZ := now();
BEGIN
  IF _user_id IS NULL OR auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN jsonb_build_object('success',false,'error','Unauthorized: User authentication required','code','UNAUTHORIZED');
  END IF;
  IF _amount < 1000.00 THEN
    RETURN jsonb_build_object('success',false,'error','Minimum withdrawal amount is ₦1,000.00');
  END IF;
  IF length(regexp_replace(_account_number, '\D', '', 'g')) != 10 THEN
    RETURN jsonb_build_object('success',false,'error','Account number must be exactly 10 digits');
  END IF;
  IF _wallet_pin IS NULL OR _wallet_pin !~ '^\d{4}$' THEN
    RETURN jsonb_build_object('success',false,'error','Enter your 4-digit wallet PIN','code','INVALID_PIN');
  END IF;

  SELECT * INTO v_pin FROM public.wallet_security_pins WHERE user_id=_user_id FOR UPDATE;
  IF v_pin.user_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Create your 4-digit wallet PIN before requesting a withdrawal','code','PIN_NOT_SET');
  END IF;
  IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
    RETURN jsonb_build_object('success',false,'error','Wallet PIN is temporarily locked. Try again later.','code','PIN_LOCKED');
  END IF;
  v_expected := encode(digest(v_pin.pin_salt || ':' || _wallet_pin,'sha256'),'hex');
  IF v_expected IS DISTINCT FROM v_pin.pin_hash THEN
    UPDATE public.wallet_security_pins
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN v_now + interval '15 minutes' ELSE locked_until END,
          updated_at = v_now
      WHERE user_id = _user_id;
    RETURN jsonb_build_object('success',false,'error','Incorrect wallet PIN','code','INVALID_PIN');
  END IF;
  UPDATE public.wallet_security_pins SET failed_attempts=0,locked_until=NULL,updated_at=v_now WHERE user_id=_user_id;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id=_user_id FOR UPDATE;
  IF v_wallet.id IS NULL OR v_wallet.balance < _amount THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient available balance');
  END IF;

  v_payout_ref := 'BTV-PAYOUT-' || to_char(v_now,'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));
  v_payout_id := gen_random_uuid();

  UPDATE public.wallets SET balance=balance-_amount,updated_at=v_now WHERE user_id=_user_id;
  INSERT INTO public.payout_requests(id,payout_reference,user_id,amount,currency,bank_name,bank_code,account_number,account_name,status,requested_at,created_at,updated_at)
  VALUES(v_payout_id,v_payout_ref,_user_id,_amount,'NGN',_bank_name,_bank_code,_account_number,_account_name,'requested',v_now,v_now,v_now);
  INSERT INTO public.wallet_transactions(user_id,amount,type,description,reference_id,created_at)
  VALUES(_user_id,-_amount,'payout_reserved','Payout withdrawal reservation (#'||v_payout_ref||') to '||_bank_name||' ('||_account_number||')',v_payout_ref,v_now);

  RETURN jsonb_build_object('success',true,'payout_id',v_payout_id,'payout_reference',v_payout_ref,'amount',_amount,'status','requested');
END;
$$;

REVOKE ALL ON FUNCTION public.set_wallet_pin(TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_promoter_payout(NUMERIC,TEXT,TEXT,TEXT,TEXT,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_wallet_pin(TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_promoter_payout(NUMERIC,TEXT,TEXT,TEXT,TEXT,UUID,TEXT) TO authenticated;
