-- Link MyKhata profiles to Basiq users for Open Banking sync
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS basiq_user_id TEXT UNIQUE;
