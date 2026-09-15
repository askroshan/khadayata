-- ============================================================
-- Fix chapter_transfers.approved_by semantics (members.id, not auth.users)
-- ============================================================
-- Approving a transfer always failed at the audit-history trigger:
-- chapter_transfer_history.approved_by references members(id), but the Transfers
-- tab (and the regression test) wrote the auth user id from useAuth(). The
-- update itself passed RLS, then the trigger's INSERT violated the FK and the
-- whole approval rolled back.
--
-- Fix in two parts:
--  1. The history trigger now resolves the acting user's member id (resolving
--     NULL for system actions) instead of copying the auth uid.
--  2. A BEFORE-trigger guard on chapter_transfers maps an auth-user-id
--     approved_by to the matching member id, so the existing UI payload works
--     unchanged. (Keeping the column as member id; the UI text says "approved
--     by <member>".)
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_chapter_transfer_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_from_name text;
v_to_name   text;
v_approver_member_id uuid;
BEGIN
IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
SELECT name INTO v_from_name FROM chapters WHERE id = NEW.from_chapter_id;
SELECT name INTO v_to_name   FROM chapters WHERE id = NEW.to_chapter_id;

-- approved_by holds a members.id (mapped by the guard trigger below);
-- fall back to the acting user's member id, else NULL for system actions.
v_approver_member_id := NEW.approved_by;
IF v_approver_member_id IS NULL THEN
  SELECT id INTO v_approver_member_id FROM members WHERE user_id = auth.uid();
END IF;

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
NEW.member_id, v_approver_member_id,
NEW.id, now()
);
NEW.resolved_at := now();
END IF;
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.map_transfer_approved_by_to_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NEW.approved_by IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM members WHERE id = NEW.approved_by) THEN
    -- Caller passed an auth user id (e.g. useAuth().id): map it to the member.
    NEW.approved_by := (SELECT id FROM members WHERE user_id = NEW.approved_by);
  END IF;
END IF;
RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_map_transfer_approved_by ON chapter_transfers;
CREATE TRIGGER trg_map_transfer_approved_by
  BEFORE UPDATE OF approved_by ON chapter_transfers
  FOR EACH ROW
  EXECUTE FUNCTION map_transfer_approved_by_to_member();