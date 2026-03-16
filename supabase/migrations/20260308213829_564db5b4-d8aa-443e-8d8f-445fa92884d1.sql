
ALTER TABLE matrimonial_profiles
  ADD COLUMN IF NOT EXISTS glasses text,
  ADD COLUMN IF NOT EXISTS driving text,
  ADD COLUMN IF NOT EXISTS citizenship text,
  ADD COLUMN IF NOT EXISTS current_city text,
  ADD COLUMN IF NOT EXISTS current_state text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS education_field text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS parents_marital_status text DEFAULT 'married',
  ADD COLUMN IF NOT EXISTS position_title text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS visa_type text,
  ADD COLUMN IF NOT EXISTS income numeric,
  ADD COLUMN IF NOT EXISTS income_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS linkedin_url text;
