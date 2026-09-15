-- ============================================================
-- Consolidate chapter_transfers triggers
-- ============================================================
-- Collapses the history trigger's earlier name (trg_chapter_transfer_history)
-- into the single final trigger. No mapper trigger exists: approved_by keeps
-- holding an auth.users id (matching the table FK), and the history trigger
-- function resolves the member id internally.
-- ============================================================

DROP TRIGGER IF EXISTS trg_chapter_transfer_history ON chapter_transfers;
DROP TRIGGER IF EXISTS trg_map_transfer_approved_by ON chapter_transfers;
DROP TRIGGER IF EXISTS a_trg_map_transfer_approved_by ON chapter_transfers;

CREATE TRIGGER z_trg_chapter_transfer_history
  BEFORE UPDATE ON chapter_transfers
  FOR EACH ROW
  EXECUTE FUNCTION record_chapter_transfer_history();