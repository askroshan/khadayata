-- F7: anon held SELECT on every column of public.members, so an unauthenticated
-- caller could read birth places, moderation state (suspended/blocked/locked and
-- their reasons), soft-delete flags and the auth user_id linkage. Narrow the anon
-- grant to exactly the columns the public pages read. The authenticated role is
-- untouched.
REVOKE SELECT ON public.members FROM anon;

GRANT SELECT (
  id,
  chapter_id,
  global_id,
  verification_level,
  first_name,
  last_name,
  gender,
  dob,
  photo_url,
  onboarding_completed,
  created_at
) ON public.members TO anon;
