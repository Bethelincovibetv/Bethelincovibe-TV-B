-- Migration: 20260901130000_promoter_bank_accounts.sql
-- Description: Step 13 — Promoter Bank Settlement Accounts & Self-Service Payouts

-- 1. Create promoter_bank_accounts table
CREATE TABLE IF NOT EXISTS public.promoter_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promoter_id UUID NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  account_number TEXT NOT NULL CHECK (length(account_number) = 10),
  account_name TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_bank_account UNIQUE (user_id, bank_code, account_number)
);

CREATE INDEX IF NOT EXISTS idx_promoter_bank_accounts_user ON public.promoter_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_bank_accounts_promoter ON public.promoter_bank_accounts(promoter_id);

-- Enable RLS on promoter_bank_accounts
ALTER TABLE public.promoter_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own bank accounts" ON public.promoter_bank_accounts;
CREATE POLICY "Users can manage their own bank accounts"
  ON public.promoter_bank_accounts
  FOR ALL
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  );
