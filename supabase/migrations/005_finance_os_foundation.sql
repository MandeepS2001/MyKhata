-- Finance OS foundation: behaviours, transfer groups, income sources, settings
-- Preserves existing account_type values (everyday ≈ daily spending; is_protected ≈ protected savings)

DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'credit_card_purchase';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'savings_contribution';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'savings_withdrawal';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'debt_payment';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'debt_draw';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'reversal';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS include_in_net_worth BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS icon TEXT;

UPDATE accounts
SET include_in_net_worth = false
WHERE account_type IN ('credit_card', 'loan');

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transfer_group_id UUID,
  ADD COLUMN IF NOT EXISTS behaviour_confidence NUMERIC(4,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(4,3) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group
  ON transactions(user_id, transfer_group_id)
  WHERE transfer_group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expected_amount_cents BIGINT NOT NULL,
  frequency recurring_frequency NOT NULL DEFAULT 'fortnightly',
  next_expected_date DATE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  include_general_savings_in_sts BOOLEAN NOT NULL DEFAULT false,
  safety_buffer_cents BIGINT NOT NULL DEFAULT 20000,
  sts_horizon TEXT NOT NULL DEFAULT 'until_payday',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE merchant_rules
  ADD COLUMN IF NOT EXISTS behaviour transaction_type;

ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own income sources" ON income_sources
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own financial settings" ON financial_settings
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
