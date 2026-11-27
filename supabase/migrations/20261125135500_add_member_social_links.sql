-- Single Source of Truth for member social profiles (LinkedIn, Instagram,
-- Facebook, X, Website) on public.members.social_links (JSONB).
-- Avoids duplicating social URLs across matrimonial_profiles, directory, etc.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill existing matrimonial_profiles.linkedin_url into members.social_links
-- without overwriting any existing linkedin value on members.
UPDATE public.members m
SET social_links = jsonb_set(
  COALESCE(m.social_links, '{}'::jsonb),
  '{linkedin}',
  to_jsonb(mp.linkedin_url),
  true
)
FROM public.matrimonial_profiles mp
WHERE mp.member_id = m.id
  AND mp.linkedin_url IS NOT NULL
  AND btrim(mp.linkedin_url) <> ''
  AND COALESCE(m.social_links->>'linkedin', '') = '';

CREATE INDEX IF NOT EXISTS idx_members_social_links_gin
  ON public.members USING gin (social_links);
