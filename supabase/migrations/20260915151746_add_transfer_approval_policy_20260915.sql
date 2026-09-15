-- ============================================================
-- Chapter transfer approvals: add the missing UPDATE policy
-- ============================================================
-- chapter_transfers had SELECT + INSERT policies but no UPDATE policy, so the
-- Transfers tab's Approve/Reject buttons always failed with an RLS error.
--
-- Decision (user-approved 2026-09-15): Global Admin approves; only pending
-- transfers are decidable (an RLS UPDATE policy's USING clause sees the old
-- row, so no trigger is needed for the pending-only guard).
--
-- has_role() is SECURITY DEFINER, so it bypasses RLS internally.
-- ============================================================

CREATE POLICY "Global admins decide chapter transfers"
  ON chapter_transfers FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin')
         AND status = 'pending')
  WITH CHECK (has_role(auth.uid(), 'Global Admin')
              AND status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_chapter_transfers_status
  ON chapter_transfers(status);