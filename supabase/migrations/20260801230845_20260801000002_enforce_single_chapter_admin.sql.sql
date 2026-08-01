/*
  # Enforce single Chapter Admin per chapter

  ## Problem
  The `assign_role` function allowed assigning multiple Chapter Admins to the
  same chapter. The business rule is: each chapter can have at most ONE active
  Chapter Admin.

  ## Solution
  Update the `assign_role` SECURITY DEFINER function to check, when assigning
  the "Chapter Admin" role, whether the chapter already has an active Chapter
  Admin. If so, raise an exception with the existing admin's name so the UI
  can surface a clear error message.
*/

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
  v_existing_admin_name text;
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

  -- 6. Enforce single Chapter Admin per chapter
  IF v_role_name = 'Chapter Admin' AND p_chapter_id IS NOT NULL THEN
    SELECT ra.id::text || '|' || m.first_name || ' ' || m.last_name
    INTO v_existing_admin_name
    FROM role_assignments ra
    JOIN members m ON m.id = ra.member_id
    JOIN roles r ON r.id = ra.role_id
    WHERE ra.chapter_id = p_chapter_id
      AND r.name = 'Chapter Admin'
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    LIMIT 1;

    IF v_existing_admin_name IS NOT NULL THEN
      v_existing_id := split_part(v_existing_admin_name, '|', 1)::uuid;
      v_existing_admin_name := split_part(v_existing_admin_name, '|', 2);
      RAISE EXCEPTION '% is already the Chapter Admin. Revoke their role first before assigning a new one.', v_existing_admin_name;
    END IF;
  END IF;

  -- 7. Check for duplicate active assignment (same member, same role)
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

  -- 8. Insert the new assignment with server-set audit column
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
