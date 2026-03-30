/*
  # Add Chapter Transfer History

  ## Summary
  Adds a `chapter_transfer_history` table to permanently record every chapter 
  change a member makes — including self-initiated transfers and admin-initiated 
  moves. This provides an immutable audit trail of chapter membership over time.

  ## New Table: chapter_transfer_history
  - id, member_id, from/to chapter (id + name snapshot)
  - transfer_type: member_request | admin_move | initial_assignment | system
  - reason, initiated_by, approved_by, related_transfer_id
  - effective_at, created_at

  ## Changes to chapter_transfers
  - Adds resolved_at column

  ## Triggers
  - trg_chapter_transfer_history: fires on chapter_transfers.status → 'approved'
  - trg_member_chapter_change: fires on members.chapter_id update

  ## Notes
  - roles.chapter_id stores the chapter for chapter-scoped roles
  - role_assignments uses end_date (not expires_at)
  - History is append-only (no DELETE policy)
*/

CREATE TABLE IF NOT EXISTS chapter_transfer_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_chapter_id     uuid REFERENCES chapters(id) ON DELETE SET NULL,
  to_chapter_id       uuid REFERENCES chapters(id) ON DELETE SET NULL,
  from_chapter_name   text,
  to_chapter_name     text,
  transfer_type       text NOT NULL DEFAULT 'member_request'
                        CHECK (transfer_type IN ('member_request','admin_move','initial_assignment','system')),
  reason              text,
  initiated_by        uuid REFERENCES members(id) ON DELETE SET NULL,
  approved_by         uuid REFERENCES members(id) ON DELETE SET NULL,
  related_transfer_id uuid REFERENCES chapter_transfers(id) ON DELETE SET NULL,
  effective_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapter_transfers' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE chapter_transfers ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cth_member_id        ON chapter_transfer_history(member_id);
CREATE INDEX IF NOT EXISTS idx_cth_from_chapter     ON chapter_transfer_history(from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_to_chapter       ON chapter_transfer_history(to_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_effective_at     ON chapter_transfer_history(effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_cth_related_transfer ON chapter_transfer_history(related_transfer_id);

ALTER TABLE chapter_transfer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own chapter history"
  ON chapter_transfer_history FOR SELECT
  TO authenticated
  USING (member_id = (
    SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1
  ));

CREATE POLICY "Global admins view all chapter history"
  ON chapter_transfer_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Data Steward')
        AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

CREATE POLICY "Chapter admins view their chapter history"
  ON chapter_transfer_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name = 'Chapter Admin'
        AND r.chapter_id IN (from_chapter_id, to_chapter_id)
        AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

CREATE POLICY "Authenticated users can insert transfer history"
  ON chapter_transfer_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION record_chapter_transfer_history()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_from_name text;
  v_to_name   text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT name INTO v_from_name FROM chapters WHERE id = NEW.from_chapter_id;
    SELECT name INTO v_to_name   FROM chapters WHERE id = NEW.to_chapter_id;
    INSERT INTO chapter_transfer_history (
      member_id, from_chapter_id, to_chapter_id,
      from_chapter_name, to_chapter_name,
      transfer_type, reason,
      initiated_by, approved_by,
      related_transfer_id, effective_at
    ) VALUES (
      NEW.member_id, NEW.from_chapter_id, NEW.to_chapter_id,
      v_from_name, v_to_name,
      'member_request', NEW.reason,
      NEW.member_id, NEW.approved_by,
      NEW.id, now()
    );
    NEW.resolved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chapter_transfer_history ON chapter_transfers;
CREATE TRIGGER trg_chapter_transfer_history
  BEFORE UPDATE ON chapter_transfers
  FOR EACH ROW EXECUTE FUNCTION record_chapter_transfer_history();

CREATE OR REPLACE FUNCTION record_member_chapter_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_from_name text;
  v_to_name   text;
BEGIN
  IF NEW.chapter_id IS DISTINCT FROM OLD.chapter_id THEN
    SELECT name INTO v_from_name FROM chapters WHERE id = OLD.chapter_id;
    SELECT name INTO v_to_name   FROM chapters WHERE id = NEW.chapter_id;
    INSERT INTO chapter_transfer_history (
      member_id, from_chapter_id, to_chapter_id,
      from_chapter_name, to_chapter_name,
      transfer_type, effective_at
    ) VALUES (
      NEW.id, OLD.chapter_id, NEW.chapter_id,
      v_from_name, v_to_name,
      CASE WHEN OLD.chapter_id IS NULL THEN 'initial_assignment' ELSE 'admin_move' END,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_chapter_change ON members;
CREATE TRIGGER trg_member_chapter_change
  AFTER UPDATE OF chapter_id ON members
  FOR EACH ROW EXECUTE FUNCTION record_member_chapter_change();
