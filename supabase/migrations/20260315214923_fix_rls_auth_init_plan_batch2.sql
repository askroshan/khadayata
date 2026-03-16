/*
  # Fix RLS Auth Initialization Plan Issues

  ## Summary
  Replaces `auth.uid()` with `(select auth.uid())` in RLS policies for:
  - samiti_groups (insert, update)
  - samiti_members (insert, delete)
  - donor_wall (insert)
  - rishta_requests (insert, update, select)
  - family_connections (insert, delete)

  This prevents auth.uid() from being re-evaluated for every row,
  improving query performance at scale.
*/

-- samiti_groups: fix INSERT policy
DROP POLICY IF EXISTS "Admins can insert samiti groups" ON public.samiti_groups;
CREATE POLICY "Admins can insert samiti groups"
  ON public.samiti_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- samiti_groups: fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update samiti groups" ON public.samiti_groups;
CREATE POLICY "Admins can update samiti groups"
  ON public.samiti_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- samiti_members: fix INSERT policy
DROP POLICY IF EXISTS "Admins can manage samiti members" ON public.samiti_members;
CREATE POLICY "Admins can manage samiti members"
  ON public.samiti_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- samiti_members: fix DELETE policy
DROP POLICY IF EXISTS "Admins can delete samiti members" ON public.samiti_members;
CREATE POLICY "Admins can delete samiti members"
  ON public.samiti_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- donor_wall: fix INSERT policy
DROP POLICY IF EXISTS "Admins can insert donor wall entries" ON public.donor_wall;
CREATE POLICY "Admins can insert donor wall entries"
  ON public.donor_wall
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Finance Admin'])
    )
  );

-- rishta_requests: fix INSERT policy
DROP POLICY IF EXISTS "Members can create rishta requests" ON public.rishta_requests;
CREATE POLICY "Members can create rishta requests"
  ON public.rishta_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT matrimonial_profiles.id
      FROM matrimonial_profiles
      WHERE matrimonial_profiles.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
    )
  );

-- rishta_requests: fix UPDATE policy
DROP POLICY IF EXISTS "Members can update their received rishta requests" ON public.rishta_requests;
CREATE POLICY "Members can update their received rishta requests"
  ON public.rishta_requests
  FOR UPDATE
  TO authenticated
  USING (
    to_profile_id IN (
      SELECT matrimonial_profiles.id
      FROM matrimonial_profiles
      WHERE matrimonial_profiles.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
    )
  )
  WITH CHECK (
    to_profile_id IN (
      SELECT matrimonial_profiles.id
      FROM matrimonial_profiles
      WHERE matrimonial_profiles.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
    )
  );

-- rishta_requests: fix SELECT policy
DROP POLICY IF EXISTS "Members can view their own rishta requests" ON public.rishta_requests;
CREATE POLICY "Members can view their own rishta requests"
  ON public.rishta_requests
  FOR SELECT
  TO authenticated
  USING (
    (
      from_profile_id IN (
        SELECT matrimonial_profiles.id
        FROM matrimonial_profiles
        WHERE matrimonial_profiles.member_id = (
          SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
        )
      )
    ) OR (
      to_profile_id IN (
        SELECT matrimonial_profiles.id
        FROM matrimonial_profiles
        WHERE matrimonial_profiles.member_id = (
          SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
        )
      )
    )
  );

-- family_connections: fix INSERT policy
DROP POLICY IF EXISTS "Members can create their own family connections" ON public.family_connections;
CREATE POLICY "Members can create their own family connections"
  ON public.family_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = (
      SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
    )
  );

-- family_connections: fix DELETE policy
DROP POLICY IF EXISTS "Members can delete their own family connections" ON public.family_connections;
CREATE POLICY "Members can delete their own family connections"
  ON public.family_connections
  FOR DELETE
  TO authenticated
  USING (
    member_id = (
      SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
    )
  );
