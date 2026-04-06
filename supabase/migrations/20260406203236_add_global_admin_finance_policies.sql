/*
  # Add Global Admin finance management policies

  1. Donations Table
    - Global Admin can INSERT donations without member_id requirement
    - Global Admin can UPDATE donations (WITH CHECK added)

  2. Medical Aid Requests Table
    - Global Admin can INSERT medical aid requests
    - Global Admin can DELETE medical aid requests

  3. Scholarship Applications Table
    - Global Admin can UPDATE scholarship applications
    - Global Admin can DELETE scholarship applications

  4. Hall Bookings Table
    - Global Admin can DELETE bookings (add WITH CHECK to UPDATE)

  5. Security
    - Uses has_role() to check Global Admin status
    - Policies are permissive for admins alongside restrictive user policies
*/

-- DONATIONS: Global Admin can insert and update
CREATE POLICY "Global Admin can insert donations"
  ON donations FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update donations"
  ON donations FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Finance Admin'::text)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Finance Admin'::text)
  );

-- DONATIONS: Global Admin can delete donations
CREATE POLICY "Global Admin can delete donations"
  ON donations FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Finance Admin'::text)
  );

-- MEDICAL_AID_REQUESTS: Global Admin can insert and delete
CREATE POLICY "Global Admin can insert medical aid requests"
  ON medical_aid_requests FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can delete medical aid requests"
  ON medical_aid_requests FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Chapter Admin'::text)
  );

-- SCHOLARSHIP_APPLICATIONS: Global Admin can update and delete
CREATE POLICY "Global Admin can update scholarship applications"
  ON scholarship_applications FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

CREATE POLICY "Global Admin can delete scholarship applications"
  ON scholarship_applications FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

CREATE POLICY "Global Admin can read all scholarship applications"
  ON scholarship_applications FOR SELECT TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- HALL_BOOKINGS: Add WITH CHECK to update policy for consistency
CREATE POLICY "Global Admin can delete hall bookings"
  ON hall_bookings FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Chapter Admin'::text)
  );
