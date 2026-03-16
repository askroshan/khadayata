/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have never been used and only add write overhead.
  These were flagged by Supabase advisor as unused.

  ## Indexes Dropped
  - idx_donor_wall_tier (donor_wall)
  - idx_donor_wall_chapter (donor_wall)
  - idx_samiti_groups_chapter (samiti_groups)
  - idx_family_connections_member (family_connections)
  - idx_rishta_requests_from (rishta_requests)
  - idx_rishta_requests_to (rishta_requests)
*/

DROP INDEX IF EXISTS public.idx_donor_wall_tier;
DROP INDEX IF EXISTS public.idx_donor_wall_chapter;
DROP INDEX IF EXISTS public.idx_samiti_groups_chapter;
DROP INDEX IF EXISTS public.idx_family_connections_member;
DROP INDEX IF EXISTS public.idx_rishta_requests_from;
DROP INDEX IF EXISTS public.idx_rishta_requests_to;
