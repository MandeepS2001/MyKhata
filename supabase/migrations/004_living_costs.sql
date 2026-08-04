-- Declared living costs from onboarding (car + housing/rent split)
CREATE TYPE housing_status AS ENUM (
  'rent',
  'own_outright',
  'mortgage',
  'live_with_family',
  'other'
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_car BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS car_payment_cents BIGINT,
  ADD COLUMN IF NOT EXISTS car_payment_frequency recurring_frequency,
  ADD COLUMN IF NOT EXISTS housing_status housing_status,
  ADD COLUMN IF NOT EXISTS rent_frequency recurring_frequency,
  ADD COLUMN IF NOT EXISTS rent_total_cents BIGINT,
  ADD COLUMN IF NOT EXISTS rent_share_cents BIGINT,
  ADD COLUMN IF NOT EXISTS rent_is_split BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mortgage_payment_cents BIGINT,
  ADD COLUMN IF NOT EXISTS mortgage_payment_frequency recurring_frequency;
