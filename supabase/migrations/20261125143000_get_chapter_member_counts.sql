-- Public aggregate member count per chapter for the /chapters directory.
-- Returns only (chapter_id, member_count) with zero PII.

CREATE OR REPLACE FUNCTION public.get_chapter_member_counts()
RETURNS TABLE (chapter_id uuid, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.chapter_id, COUNT(*)::bigint AS member_count
  FROM public.members m
  WHERE m.chapter_id IS NOT NULL
    AND COALESCE(m.is_deleted, false) = false
  GROUP BY m.chapter_id;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_member_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_member_counts() TO anon, authenticated;
