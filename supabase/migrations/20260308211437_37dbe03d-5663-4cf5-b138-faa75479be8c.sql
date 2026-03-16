
-- Add detailed bio columns to matrimonial_profiles
ALTER TABLE matrimonial_profiles 
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS height_cm smallint,
  ADD COLUMN IF NOT EXISTS weight_kg smallint,
  ADD COLUMN IF NOT EXISTS complexion text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS diet text DEFAULT 'vegetarian',
  ADD COLUMN IF NOT EXISTS marital_status text DEFAULT 'never_married',
  ADD COLUMN IF NOT EXISTS manglik text,
  ADD COLUMN IF NOT EXISTS gotra text,
  ADD COLUMN IF NOT EXISTS nakshatra text,
  ADD COLUMN IF NOT EXISTS rashi text,
  ADD COLUMN IF NOT EXISTS native_place text,
  ADD COLUMN IF NOT EXISTS family_type text,
  ADD COLUMN IF NOT EXISTS family_status text,
  ADD COLUMN IF NOT EXISTS father_occupation text,
  ADD COLUMN IF NOT EXISTS mother_occupation text,
  ADD COLUMN IF NOT EXISTS siblings text,
  ADD COLUMN IF NOT EXISTS hobbies text[],
  ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';
