-- Drop the restrictive type CHECK so admin_credit/admin_debit/daily_reward/etc can be inserted
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;