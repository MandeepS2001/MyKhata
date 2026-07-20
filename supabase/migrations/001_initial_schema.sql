-- MyKhata initial schema
-- All monetary values stored as bigint cents

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE financial_tone AS ENUM ('direct', 'blunt', 'roast');
CREATE TYPE income_type AS ENUM ('hourly', 'salary', 'variable', 'mixed');
CREATE TYPE payday_frequency AS ENUM ('weekly', 'fortnightly', 'monthly', 'irregular');
CREATE TYPE caution_level AS ENUM ('relaxed', 'balanced', 'conservative');
CREATE TYPE account_type AS ENUM (
  'everyday', 'savings', 'credit_card', 'loan', 'offset', 'investment', 'cash', 'other'
);
CREATE TYPE data_source AS ENUM ('csv', 'manual', 'mock', 'open_banking');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'pending', 'expired', 'error');
CREATE TYPE transaction_direction AS ENUM ('debit', 'credit');
CREATE TYPE transaction_type AS ENUM (
  'expense', 'income', 'internal_transfer', 'credit_card_repayment',
  'refund', 'reimbursement', 'cash_withdrawal', 'bill', 'subscription',
  'shared_expense', 'unknown'
);
CREATE TYPE recurring_frequency AS ENUM (
  'weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'irregular'
);
CREATE TYPE wishlist_status AS ENUM (
  'thinking', 'saving', 'affordable', 'wait', 'not_affordable',
  'purchased', 'abandoned'
);
CREATE TYPE affordability_verdict AS ENUM (
  'yes', 'technically_yes', 'wait', 'no', 'absolutely_not',
  'save_first', 'protected_savings_required'
);
CREATE TYPE insight_severity AS ENUM ('info', 'warning', 'danger', 'positive');
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'undone');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  currency TEXT NOT NULL DEFAULT 'AUD',
  timezone TEXT NOT NULL DEFAULT 'Australia/Melbourne',
  locale TEXT NOT NULL DEFAULT 'en-AU',
  payday_frequency payday_frequency DEFAULT 'monthly',
  next_payday DATE,
  income_type income_type DEFAULT 'salary',
  income_cents BIGINT,
  hourly_rate_cents BIGINT,
  estimated_tax_rate NUMERIC(5,2),
  financial_tone financial_tone NOT NULL DEFAULT 'direct',
  show_work_hours BOOLEAN NOT NULL DEFAULT false,
  minimum_buffer_cents BIGINT NOT NULL DEFAULT 50000,
  caution_level caution_level NOT NULL DEFAULT 'balanced',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notify_salary BOOLEAN DEFAULT true,
  notify_bills BOOLEAN DEFAULT true,
  notify_safe_to_spend BOOLEAN DEFAULT true,
  notify_goals BOOLEAN DEFAULT true,
  notify_wishlist BOOLEAN DEFAULT true,
  notify_weekly_summary BOOLEAN DEFAULT true,
  notify_unusual_transactions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  status connection_status NOT NULL DEFAULT 'disconnected',
  consent_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  account_type account_type NOT NULL DEFAULT 'everyday',
  institution_label TEXT,
  masked_identifier TEXT,
  current_balance_cents BIGINT NOT NULL DEFAULT 0,
  available_balance_cents BIGINT NOT NULL DEFAULT 0,
  credit_limit_cents BIGINT,
  currency TEXT NOT NULL DEFAULT 'AUD',
  included_in_safe_to_spend BOOLEAN NOT NULL DEFAULT true,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  purpose TEXT,
  data_source data_source NOT NULL DEFAULT 'manual',
  connection_status connection_status NOT NULL DEFAULT 'disconnected',
  last_synced_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_transaction_id TEXT,
  transaction_date DATE NOT NULL,
  posted_date DATE,
  description TEXT NOT NULL,
  normalised_merchant TEXT,
  amount_cents BIGINT NOT NULL,
  direction transaction_direction NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  subcategory TEXT,
  confidence_score NUMERIC(4,3) DEFAULT 0,
  transaction_type transaction_type NOT NULL DEFAULT 'unknown',
  recurring_status TEXT,
  transfer_match_id UUID,
  is_work_expense BOOLEAN NOT NULL DEFAULT false,
  work_use_percentage NUMERIC(5,2) DEFAULT 0,
  is_reimbursable BOOLEAN NOT NULL DEFAULT false,
  is_reimbursed BOOLEAN NOT NULL DEFAULT false,
  is_shared_expense BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  source data_source NOT NULL DEFAULT 'manual',
  raw_metadata JSONB DEFAULT '{}',
  import_batch_id UUID,
  is_hidden_from_reports BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_transactions_dedup
  ON transactions(user_id, account_id, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_merchant ON transactions(user_id, normalised_merchant);
CREATE INDEX idx_transactions_category ON transactions(user_id, category);

CREATE TABLE merchant_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  transaction_type transaction_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, merchant_pattern)
);

CREATE TABLE transfer_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  debit_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  credit_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  match_type TEXT NOT NULL DEFAULT 'internal_transfer',
  confidence_score NUMERIC(4,3) DEFAULT 0,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  merchant TEXT NOT NULL,
  amount_cents_min BIGINT,
  amount_cents_max BIGINT,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly',
  next_expected_date DATE,
  category TEXT,
  is_essential BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  confidence NUMERIC(4,3) DEFAULT 0,
  price_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount_cents BIGINT NOT NULL,
  current_amount_cents BIGINT NOT NULL DEFAULT 0,
  target_date DATE,
  priority INTEGER NOT NULL DEFAULT 0,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  auto_contribution_cents BIGINT DEFAULT 0,
  category TEXT,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents BIGINT NOT NULL,
  image_url TEXT,
  product_url TEXT,
  category TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  desired_purchase_date DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  ongoing_monthly_cost_cents BIGINT DEFAULT 0,
  notes TEXT,
  saved_amount_cents BIGINT NOT NULL DEFAULT 0,
  status wishlist_status NOT NULL DEFAULT 'thinking',
  last_verdict affordability_verdict,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE affordability_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_item_id UUID NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verdict affordability_verdict NOT NULL,
  score NUMERIC(5,2),
  explanation JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity insight_severity NOT NULL DEFAULT 'info',
  evidence JSONB DEFAULT '{}',
  related_transaction_ids UUID[] DEFAULT '{}',
  suggested_action TEXT,
  tone financial_tone,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  source data_source NOT NULL DEFAULT 'csv',
  bank_format TEXT,
  status import_status NOT NULL DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  error_report JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE imported_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE work_expense_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_use_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  claimable_amount_cents BIGINT NOT NULL DEFAULT 0,
  tax_year TEXT,
  receipt_path TEXT,
  reimbursement_status TEXT DEFAULT 'none',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE affordability_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_expense_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access own data)
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own institutions" ON institutions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own bank connections" ON bank_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own merchant rules" ON merchant_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own transfer matches" ON transfer_matches
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own recurring payments" ON recurring_payments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own goal contributions" ON goal_contributions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own wishlist" ON wishlist_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own affordability calcs" ON affordability_calculations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own insights" ON insights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own imports" ON import_batches
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own imported files" ON imported_files
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own work expenses" ON work_expense_details
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own audit events" ON audit_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own audit events" ON audit_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
