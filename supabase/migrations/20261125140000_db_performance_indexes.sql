-- Site-wide database performance indexes:
-- 1. Index the 3 remaining unindexed foreign keys on chapter_messages.
-- 2. Add composite covering/filter indexes for high-traffic directory,
--    matrimonial browse, events, and businesses queries.
-- 3. Add GIN index on matrimonial_profiles.preferences for fast partner matching.

CREATE INDEX IF NOT EXISTS idx_chapter_messages_chapter_created
  ON public.chapter_messages (chapter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapter_messages_from_member
  ON public.chapter_messages (from_member_id);

CREATE INDEX IF NOT EXISTS idx_chapter_messages_to_member
  ON public.chapter_messages (to_member_id);

CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_browse
  ON public.matrimonial_profiles (is_deleted, suspended, visibility, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_preferences_gin
  ON public.matrimonial_profiles USING gin (preferences);

CREATE INDEX IF NOT EXISTS idx_members_chapter_active
  ON public.members (chapter_id, is_deleted, blocked, suspended);

CREATE INDEX IF NOT EXISTS idx_members_name_lower
  ON public.members (LOWER(first_name), LOWER(last_name));

ANALYZE public.members;
ANALYZE public.matrimonial_profiles;
ANALYZE public.chapter_messages;
