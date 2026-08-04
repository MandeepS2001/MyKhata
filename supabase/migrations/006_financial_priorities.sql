-- Persist onboarding questionnaire priorities on the profile
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS financial_priorities TEXT[] NOT NULL DEFAULT '{}';
