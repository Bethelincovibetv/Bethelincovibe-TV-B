
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(_email text)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  RETURN QUERY
    SELECT p.user_id, p.display_name, p.username, p.avatar_url, p.email
    FROM public.profiles p
    WHERE lower(p.email) = lower(trim(_email))
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_wallet(_recipient_email text, _amount numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_recipient_name text;
  v_sender_name text;
  v_balance numeric;
  v_min numeric := 100;
  v_max numeric := 500000;
BEGIN
  IF v_sender IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Login required');
  END IF;
  IF _amount IS NULL OR _amount < v_min THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum transfer is ₦' || v_min);
  END IF;
  IF _amount > v_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum per transfer is ₦' || v_max);
  END IF;

  SELECT user_id, COALESCE(display_name, username, email)
    INTO v_recipient, v_recipient_name
    FROM public.profiles
    WHERE lower(email) = lower(trim(_recipient_email))
    LIMIT 1;

  IF v_recipient IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user found with that email');
  END IF;
  IF v_recipient = v_sender THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot transfer to yourself');
  END IF;

  SELECT COALESCE(display_name, username, email) INTO v_sender_name FROM public.profiles WHERE user_id = v_sender;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_sender FOR UPDATE;
  IF v_balance IS NULL OR v_balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = v_sender;
  INSERT INTO public.wallets (user_id, balance) VALUES (v_recipient, _amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + _amount;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_sender, -_amount, 'transfer_out', 'Transfer to ' || v_recipient_name || COALESCE(' — ' || _note, ''));
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_recipient, _amount, 'transfer_in', 'Transfer from ' || COALESCE(v_sender_name, 'a user') || COALESCE(' — ' || _note, ''));

  INSERT INTO public.user_notifications (user_id, title, body, url, type)
    VALUES (v_recipient, 'Money received 💸',
            '₦' || _amount || ' from ' || COALESCE(v_sender_name, 'a user') || '.',
            '/dashboard/wallet', 'wallet');

  RETURN jsonb_build_object('success', true, 'amount', _amount, 'recipient_name', v_recipient_name);
END;
$$;
