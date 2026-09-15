-- ============================================================
-- One open mentorship per mentor
-- ============================================================
-- Root cause of the 2026-09-15 duplicate-mentor finding: mentorships had no
-- uniqueness rule, and the client's merge-if-exists flow can race, so the
-- same mentor could end up listed twice in the marketplace.
--
-- Partial unique index: a mentor may hold at most one record in an "open"
-- state ('available' = offered, 'pending' = awaiting acceptance). Completed
-- ('completed', 'declined', etc.) records are historical and unaffected.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS mentorships_one_open_per_mentor_idx
  ON public.mentorships (mentor_member_id)
  WHERE status IN ('available', 'pending');