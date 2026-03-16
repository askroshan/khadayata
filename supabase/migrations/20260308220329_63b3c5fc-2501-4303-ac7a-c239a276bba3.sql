
ALTER TABLE public.matrimonial_profiles
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS parent_contact text,
  ADD COLUMN IF NOT EXISTS ekda text,
  ADD COLUMN IF NOT EXISTS kuldevi text,
  ADD COLUMN IF NOT EXISTS country text;
