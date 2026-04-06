/*
  # Add Global Admin policies to content tables

  Adds permissive INSERT and UPDATE policies that allow Global Admins
  to create and manage all content alongside existing user ownership policies.
*/

-- EVENTS TABLE
CREATE POLICY "Global Admin can insert events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

CREATE POLICY "Global Admin can update events"
  ON events FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

-- BUSINESSES TABLE
CREATE POLICY "Global Admin can insert businesses"
  ON businesses FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR owner_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update businesses"
  ON businesses FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR owner_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR owner_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- JOBS TABLE
CREATE POLICY "Global Admin can insert jobs"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR employer_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update jobs"
  ON jobs FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR employer_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR employer_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- CONTENT_NEWS TABLE
CREATE POLICY "Global Admin can insert news"
  ON content_news FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

CREATE POLICY "Global Admin can update news"
  ON content_news FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

-- MATRIMONIAL_PROFILES TABLE
CREATE POLICY "Global Admin can insert matrimonial profiles"
  ON matrimonial_profiles FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update matrimonial profiles"
  ON matrimonial_profiles FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- ORAL_HISTORIES TABLE
CREATE POLICY "Global Admin can insert oral histories"
  ON oral_histories FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR narrator_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update oral histories"
  ON oral_histories FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR narrator_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR narrator_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- ANNOUNCEMENTS TABLE
CREATE POLICY "Global Admin can insert announcements"
  ON announcements FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

CREATE POLICY "Global Admin can update announcements"
  ON announcements FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

-- SCHOLARSHIPS TABLE (no owner, so Global Admin only)
CREATE POLICY "Global Admin can insert scholarships"
  ON scholarships FOR INSERT TO authenticated
  WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text));

CREATE POLICY "Global Admin can update scholarships"
  ON scholarships FOR UPDATE TO authenticated
  USING (has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text))
  WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text));

-- MENTORSHIPS TABLE
CREATE POLICY "Global Admin can insert mentorships"
  ON mentorships FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR mentor_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update mentorships"
  ON mentorships FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR mentor_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR mentor_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );
