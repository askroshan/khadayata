-- Ensure privileged-column guard is attached (function may exist without trigger
-- after partial restores). Safe / idempotent.
CREATE OR REPLACE FUNCTION public.guard_privileged_member_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Data Steward')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_privileged;

  IF NOT is_privileged THEN
    IF NEW.verification_level IS DISTINCT FROM OLD.verification_level THEN
      RAISE EXCEPTION 'Only Global Admin or Data Steward can change verification_level'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.blocked IS DISTINCT FROM OLD.blocked OR NEW.suspended IS DISTINCT FROM OLD.suspended THEN
      RAISE EXCEPTION 'Only Global Admin or Data Steward can block or suspend members'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.global_id IS DISTINCT FROM OLD.global_id AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Only Global Admin, Data Steward, or the generate-global-id service can change global_id'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_privileged_member_columns ON public.members;
CREATE TRIGGER trg_guard_privileged_member_columns
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_privileged_member_columns();
