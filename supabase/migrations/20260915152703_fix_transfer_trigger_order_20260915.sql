-- ============================================================
-- Fix trigger firing order on chapter_transfers
-- ============================================================
-- Both BEFORE UPDATE triggers fire alphabetically: trg_chapter_transfer_history
-- (c...) ran before trg_map_transfer_approved_by (m...), so the history
-- trigger still saw the raw auth-uid in approved_by and the FK failed.
-- Recreating the mapper with a name that sorts first ('a_') fixes the order
-- deterministically.
-- ============================================================

DROP TRIGGER IF EXISTS trg_map_transfer_approved_by ON chapter_transfers;
DROP TRIGGER IF EXISTS trg_chapter_transfer_history ON chapter_transfers;

CREATE TRIGGER a_trg_map_transfer_approved_by
  BEFORE UPDATE OF approved_by ON chapter_transfers
  FOR EACH ROW
  EXECUTE FUNCTION map_transfer_approved_by_to_member();

CREATE TRIGGER z_trg_chapter_transfer_history
  BEFORE UPDATE ON chapter_transfers
  FOR EACH ROW
  EXECUTE FUNCTION record_chapter_transfer_history();