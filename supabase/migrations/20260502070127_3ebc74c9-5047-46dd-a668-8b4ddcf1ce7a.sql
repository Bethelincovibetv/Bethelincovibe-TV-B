
REVOKE EXECUTE ON FUNCTION public.deduct_wallet(uuid, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.topup_wallet(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
