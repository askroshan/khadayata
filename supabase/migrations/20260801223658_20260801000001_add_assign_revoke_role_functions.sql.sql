/*
  # Add assign_role and revoke_role SECURITY DEFINER functions

  ## Problem
  The `role_assignments` table has RLS enabled but only a SELECT policy
  (`USING (true)`). There are no INSERT, UPDATE, or DELETE policies. This
  means any attempt by an admin to insert or delete a role assignment
  (e.g., assigning a committee role from the member edit dialog) fails
  with an RLS violation error.

  ## Solution
  Create two SECURITY DEFINER functions that bypass RLS to perform the
  insert/delete, but enforce authorization checks internally:
  - `assign_role(p_member_id, p_role_id, p_chapter_id)` — inserts a new
    role assignment after validating the caller is a Global Admin or
    Chapter Admin, scoping Chapter Admin to their own chapter, preventing
    self-escalation to Global Admin, and setting the audit `created_by`
    column server-side from auth.uid().
  - `revoke_role(p_assignment_id)` — deletes a role assignment after
    validating the same authorization checks, with Chapter Admin scoped
    to their chapter and unable to revoke Global Admin.

  ## Security changes
  1. Both functions are SECURITY DEFINER with search_path set to 'public'.
  2. Direct INSERT, UPDATE, DELETE privileges are revoked from `anon` and
     `authenticated` roles on `role_assignments` — only SELECT remains.
  3. EXECUTE on both functions is granted to `authenticated` only.
  4. The `created_by` audit column is set from `auth.uid()` inside the
     function — the client cannot control it.
  5. `anon` EXECUTE is explicitly revoked on both functions.

  ## Important notes
  1. The existing SELECT policy (`Authenticated can read role assignments`)
     is preserved — admins and members can still read role assignments.
  2. The `fn_audit_role_assignments` trigger continues to work because it
     runs as SECURITY DEFINER and operates on the row after insert/delete.
  3. These functions are idempotent for duplicates: assign_role returns
     success if the member already has the active role.
*/

-- ============================================================================
-- assign_role function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_role(
  p_member_id uuid,
  p_role_id uuid,
  p_chapter_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_member_id uuid;
  v_caller_chapter_id uuid;
  v_is_global_admin boolean := false;
  v_is_chapter_admin boolean := false;
  v_target_chapter_id uuid;
  v_role_name text;
  v_role_scope text;
  v_existing_id uuid;
BEGIN
  -- 1. Resolve caller identity
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, chapter_id INTO v_caller_member_id, v_caller_chapter_id
  FROM members WHERE user_id = v_caller_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller has no member profile';
  END IF;

  -- 2. Check caller roles
  v_is_global_admin := has_role(v_caller_uid, 'Global Admin');
  v_is_chapter_admin := has_role(v_caller_uid, 'Chapter Admin');

  IF NOT v_is_global_admin AND NOT v_is_chapter_admin THEN
    RAISE EXCEPTION 'Only Global Admin and Chapter Admin can assign roles';
  END IF;

  -- 3. Resolve role info
  SELECT name, scope INTO v_role_name, v_role_scope
  FROM roles WHERE id = p_role_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  -- 4. Resolve target member's chapter
  SELECT chapter_id INTO v_target_chapter_id
  FROM members WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target member not found';
  END IF;

  -- 5. Authorization checks
  -- Prevent self-escalation to Global Admin
  IF v_role_name = 'Global Admin' AND v_caller_member_id = p_member_id THEN
    RAISE EXCEPTION 'You cannot assign Global Admin to yourself';
  END IF;

  -- Only Global Admin can assign global-scope roles
  IF v_role_scope = 'global' AND NOT v_is_global_admin THEN
    RAISE EXCEPTION 'Only Global Admin can assign global-scope roles';
  END IF;

  -- Chapter Admin scope check
  IF v_is_chapter_admin AND NOT v_is_global_admin THEN
    IF v_caller_chapter_id IS NULL THEN
      RAISE EXCEPTION 'Chapter Admin must belong to a chapter';
    END IF;
    IF v_target_chapter_id IS DISTINCT FROM v_caller_chapter_id THEN
      RAISE EXCEPTION 'Chapter Admin can only assign roles within their own chapter';
    END IF;
  END IF;

  -- 6. Check for duplicate active assignment
  SELECT id INTO v_existing_id
  FROM role_assignments
  WHERE member_id = p_member_id
    AND role_id = p_role_id
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Role already assigned',
      'assignment_id', v_existing_id
    );
  END IF;

  -- 7. Insert the new assignment with server-set audit column
  INSERT INTO role_assignments (member_id, role_id, chapter_id, start_date, created_by)
  VALUES (p_member_id, p_role_id, p_chapter_id, CURRENT_DATE, v_caller_uid)
  RETURNING id INTO v_existing_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned',
    'assignment_id', v_existing_id
  );
END;
$$;

-- ============================================================================
-- revoke_role function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revoke_role(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_chapter_id uuid;
  v_is_global_admin boolean := false;
  v_is_chapter_admin boolean := false;
  v_member_id uuid;
  v_role_id uuid;
  v_assignment_chapter_id uuid;
  v_target_chapter_id uuid;
  v_role_name text;
BEGIN
  -- 1. Resolve caller identity
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT m.chapter_id INTO v_caller_chapter_id
  FROM members m WHERE m.user_id = v_caller_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller has no member profile';
  END IF;

  -- 2. Check caller roles
  v_is_global_admin := has_role(v_caller_uid, 'Global Admin');
  v_is_chapter_admin := has_role(v_caller_uid, 'Chapter Admin');

  IF NOT v_is_global_admin AND NOT v_is_chapter_admin THEN
    RAISE EXCEPTION 'Only Global Admin and Chapter Admin can revoke roles';
  END IF;

  -- 3. Resolve the assignment
  SELECT member_id, role_id, chapter_id
  INTO v_member_id, v_role_id, v_assignment_chapter_id
  FROM role_assignments WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role assignment not found';
  END IF;

  -- 4. Resolve role name
  SELECT name INTO v_role_name FROM roles WHERE id = v_role_id;

  -- 5. Resolve target member's chapter
  SELECT chapter_id INTO v_target_chapter_id
  FROM members WHERE id = v_member_id;

  -- 6. Authorization checks
  -- Chapter Admin cannot revoke Global Admin
  IF v_role_name = 'Global Admin' AND NOT v_is_global_admin THEN
    RAISE EXCEPTION 'Chapter Admin cannot revoke Global Admin role';
  END IF;

  -- Chapter Admin scope check
  IF v_is_chapter_admin AND NOT v_is_global_admin THEN
    IF v_caller_chapter_id IS NULL THEN
      RAISE EXCEPTION 'Chapter Admin must belong to a chapter';
    END IF;
    IF v_target_chapter_id IS DISTINCT FROM v_caller_chapter_id
       AND v_assignment_chapter_id IS DISTINCT FROM v_caller_chapter_id THEN
      RAISE EXCEPTION 'Chapter Admin can only revoke roles within their own chapter';
    END IF;
  END IF;

  -- 7. Delete the assignment
  DELETE FROM role_assignments WHERE id = p_assignment_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role revoked'
  );
END;
$$;

-- ============================================================================
-- Revoke direct write privileges on role_assignments from anon and authenticated
-- Only SELECT remains; all mutations go through the SECURITY DEFINER functions.
-- ============================================================================

REVOKE INSERT ON role_assignments FROM anon, authenticated;
REVOKE UPDATE ON role_assignments FROM anon, authenticated;
REVOKE DELETE ON role_assignments FROM anon, authenticated;

-- ============================================================================
-- Grant EXECUTE on the new functions to authenticated only
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.assign_role(uuid, uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.assign_role(uuid, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_role(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.revoke_role(uuid) TO authenticated;
