-- ============================================================
-- Resolve history approver: approved_by holds auth.users id
-- ============================================================
-- chapter_transfers.approved_by references auth.users(id) (the UI writes
-- useAuth().id). chapter_transfer_history.approved_by references members(id).
-- The previous fallback only mapped when approved_by was NULL; it must map
-- whenever the stored value is an auth uid rather than a members.id.
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

-- approved_by holds an auth.users id (table FK); history wants members.id.
SELECT id INTO v_approver_member_id
FROM members
WHERE user_id = NEW.approved_by OR id = NEW.approved_by;

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