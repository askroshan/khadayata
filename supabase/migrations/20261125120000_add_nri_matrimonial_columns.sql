-- Add missing NRI matrimonial profile columns so all fields from the
-- Khadayata NRI Matrimony directory are stored cleanly without data loss.
-- Non-destructive additive migration (IF NOT EXISTS).

ALTER TABLE public.matrimonial_profiles
  ADD COLUMN IF NOT EXISTS external_profile_id text,
  ADD COLUMN IF NOT EXISTS birth_country text,
  ADD COLUMN IF NOT EXISTS first_language text,
  ADD COLUMN IF NOT EXISTS languages_spoken text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS smoking_habits text,
  ADD COLUMN IF NOT EXISTS drinking_habits text,
  ADD COLUMN IF NOT EXISTS health_disclosure text,
  ADD COLUMN IF NOT EXISTS brothers_count smallint,
  ADD COLUMN IF NOT EXISTS sisters_count smallint,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS is_khadayata_vaishnav boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS partner_preferences_summary text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_matrimonial_profiles_external_profile_id
  ON public.matrimonial_profiles (external_profile_id)
  WHERE external_profile_id IS NOT NULL;

-- Ensure matrimonial-photos bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('matrimonial-photos', 'matrimonial-photos', true)
ON CONFLICT (id) DO NOTHING;

