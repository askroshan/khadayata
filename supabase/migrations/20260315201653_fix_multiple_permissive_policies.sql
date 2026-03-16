/*
  # Fix Multiple Permissive RLS Policies

  ## Summary
  Consolidates duplicate permissive RLS policies on the same table/action into single
  policies using OR logic. Multiple permissive policies for the same role+action cause
  a security warning because Postgres evaluates them with OR, which can be confusing
  and lead to unintended access. Merging them makes the intent explicit and clear.

  ## Tables Fixed
  1. hall_bookings  - INSERT, SELECT, UPDATE
  2. matrimonial_profiles - INSERT, SELECT, UPDATE
  3. members - UPDATE
  4. mentorships - INSERT, SELECT, UPDATE
  5. oral_histories - INSERT, SELECT, UPDATE

  ## Approach
  Drop the two conflicting policies per action and replace with one combined policy
  that uses OR to cover both the admin role check and the member ownership check.
*/

-- ============================================================
-- hall_bookings
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can create bookings" ON public.hall_bookings;
CREATE POLICY "Members and admins can create bookings"
  ON public.hall_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

DROP POLICY IF EXISTS "Admins can read bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can read own bookings" ON public.hall_bookings;
CREATE POLICY "Members can read own and admins can read all bookings"
  ON public.hall_bookings FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

DROP POLICY IF EXISTS "Admins can update bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can update own bookings" ON public.hall_bookings;
CREATE POLICY "Members can update own and admins can update all bookings"
  ON public.hall_bookings FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  )
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

-- ============================================================
-- matrimonial_profiles
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can create own profile" ON public.matrimonial_profiles;
CREATE POLICY "Members and admins can create matrimonial profiles"
  ON public.matrimonial_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Admins can read matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Verified members read profiles" ON public.matrimonial_profiles;
CREATE POLICY "Authenticated members can read matrimonial profiles"
  ON public.matrimonial_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can update own profile" ON public.matrimonial_profiles;
CREATE POLICY "Members can update own and admins can update all matrimonial profiles"
  ON public.matrimonial_profiles FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  )
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

-- ============================================================
-- members
-- ============================================================

DROP POLICY IF EXISTS "Admins can update any member" ON public.members;
DROP POLICY IF EXISTS "Users can update own member" ON public.members;
CREATE POLICY "Users can update own and admins can update any member"
  ON public.members FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

-- ============================================================
-- mentorships
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Members can offer mentorship" ON public.mentorships;
CREATE POLICY "Members and admins can create mentorships"
  ON public.mentorships FOR INSERT
  TO authenticated
  WITH CHECK (
    mentor_member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
  );

DROP POLICY IF EXISTS "Admins can read mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Authenticated can read mentorships" ON public.mentorships;
CREATE POLICY "Authenticated can read mentorships"
  ON public.mentorships FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Mentors can update own" ON public.mentorships;
CREATE POLICY "Mentors can update own and admins can update all mentorships"
  ON public.mentorships FOR UPDATE
  TO authenticated
  USING (
    mentor_member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
  )
  WITH CHECK (
    mentor_member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
  );

-- ============================================================
-- oral_histories
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Members can upload oral histories" ON public.oral_histories;
CREATE POLICY "Members and admins can upload oral histories"
  ON public.oral_histories FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Admins can read oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Anyone can read published oral histories" ON public.oral_histories;
CREATE POLICY "Published oral histories readable by all, admins read all"
  ON public.oral_histories FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Admins can update oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Uploaders can update" ON public.oral_histories;
CREATE POLICY "Uploaders and admins can update oral histories"
  ON public.oral_histories FOR UPDATE
  TO authenticated
  USING (
    uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  )
  WITH CHECK (
    uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );
