-- Soft-delete support for matrimonial_profiles:
-- When a candidate deletes their own matrimonial profile, hide it from all
-- searches and listings without permanently deleting the record.

ALTER TABLE public.matrimonial_profiles
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_active
  ON public.matrimonial_profiles (is_deleted, suspended, verified);
