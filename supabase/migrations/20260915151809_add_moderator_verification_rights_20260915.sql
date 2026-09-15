-- ============================================================
-- Moderator verification rights (todo-moderator.md US-002)
-- ============================================================
-- Moderators' verify buttons failed because:
--  1. The members UPDATE policy omitted the Moderator role.
--  2. The privileged-column guard blocked verification_level changes for
--     anyone outside Global Admin / Data Steward.
--  3. The verification_requests policies omitted Moderator, so moderators
--     could not even load the request queue.
--
-- Decision (user-approved 2026-09-15): moderators may change verification_level
-- ONLY. blocked/suspended stay Global Admin / Data Steward, enforced by the
-- guard trigger (which also protects against the wider members UPDATE policy
-- grant: a Moderator editing first_name must not be able to slip in
-- suspended=true in the same statement).
-- ============================================================

-- 1. Widen members UPDATE to include Moderator (replace the policy).
DROP POLICY IF EXISTS "Users can update own and admins can update any member" ON members;
CREATE POLICY "Users can update own and admins can update any member"
  ON members FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

-- 2. Narrow the privileged-column guard: Moderator may change ONLY
--    verification_level; blocked/suspended stay privileged-only.
CREATE OR REPLACE FUNCTION public.guard_privileged_member_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_privileged boolean;
  is_moderator  boolean;
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

  SELECT EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name = 'Moderator'
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_moderator;

  IF NOT is_privileged THEN
    IF NEW.verification_level IS DISTINCT FROM OLD.verification_level THEN
      IF NOT is_moderator THEN
        RAISE EXCEPTION 'Only Global Admin, Data Steward, or Moderator can change verification_level'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    IF NEW.blocked IS DISTINCT FROM OLD.blocked
       OR NEW.suspended IS DISTINCT FROM OLD.suspended THEN
      RAISE EXCEPTION 'Only Global Admin or Data Steward can block or suspend members'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Moderators can read the verification request queue.
DROP POLICY IF EXISTS "Members can read own verification requests" ON verification_requests;
CREATE POLICY "Members can read own verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

-- 4. Moderators can decide verification requests (the dashboard updates
--    status, reviewed_by, reviewed_at, notes).
DROP POLICY IF EXISTS "Admins can update verification requests" ON verification_requests;
CREATE POLICY "Admins can update verification requests"
  ON verification_requests FOR UPDATE
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Moderator')
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );