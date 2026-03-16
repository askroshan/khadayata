
-- =====================================================
-- ROLE-BASED ACCESS CONTROL HARDENING
-- Comprehensive RLS policies for all admin functions
-- =====================================================

-- =====================================================
-- ANNOUNCEMENTS - Global Admin / Chapter Admin only
-- =====================================================
CREATE POLICY "Admins can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

-- =====================================================
-- SCHOLARSHIPS - Global Admin / Finance Admin only
-- =====================================================
CREATE POLICY "Admins can create scholarships"
  ON public.scholarships FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can update scholarships"
  ON public.scholarships FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can delete scholarships"
  ON public.scholarships FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

-- =====================================================
-- FUNDS - Global Admin / Finance Admin only
-- =====================================================
CREATE POLICY "Admins can create funds"
  ON public.funds FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can update funds"
  ON public.funds FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can delete funds"
  ON public.funds FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

-- =====================================================
-- EMERGENCY_CONTACTS - Global Admin / Chapter Admin only
-- =====================================================
CREATE POLICY "Admins can create emergency contacts"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can update emergency contacts"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can delete emergency contacts"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

-- =====================================================
-- HERITAGE_TAGS - Admin approval flow
-- =====================================================
CREATE POLICY "Admins can approve heritage tags"
  ON public.heritage_tags FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));

CREATE POLICY "Admins can delete heritage tags"
  ON public.heritage_tags FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));

-- =====================================================
-- ORAL_HISTORIES - Admin moderation
-- =====================================================
CREATE POLICY "Admins can manage oral histories"
  ON public.oral_histories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));

-- =====================================================
-- EVENTS - Event Managers can manage chapter events
-- =====================================================
DROP POLICY IF EXISTS "Creators can update events" ON public.events;
CREATE POLICY "Creators and managers can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'Global Admin') 
    OR has_role(auth.uid(), 'Event Manager')
  );

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Event Manager'));

-- =====================================================
-- CONTENT_NEWS - Publisher / Moderator review flow
-- =====================================================
DROP POLICY IF EXISTS "Authors can update own news" ON public.content_news;
CREATE POLICY "Authors and publishers can update news"
  ON public.content_news FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'Global Admin') 
    OR has_role(auth.uid(), 'Global Publisher')
    OR has_role(auth.uid(), 'Publisher')
    OR has_role(auth.uid(), 'Moderator')
  );

CREATE POLICY "Admins can delete news"
  ON public.content_news FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Global Publisher'));

-- =====================================================
-- BUSINESSES - Directory Manager approval
-- =====================================================
DROP POLICY IF EXISTS "Owners can update businesses" ON public.businesses;
CREATE POLICY "Owners and managers can update businesses"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (
    owner_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Directory Manager')
  );

CREATE POLICY "Admins can delete businesses"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Directory Manager'));

-- =====================================================
-- JOBS - Directory Manager management
-- =====================================================
DROP POLICY IF EXISTS "Employers can update jobs" ON public.jobs;
CREATE POLICY "Employers and managers can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (
    employer_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Directory Manager')
  );

CREATE POLICY "Admins can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Directory Manager'));

-- =====================================================
-- MEMBERS - Data Steward can edit verification levels
-- =====================================================
CREATE POLICY "Admins can update any member"
  ON public.members FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward') OR has_role(auth.uid(), 'Chapter Admin'));

-- =====================================================
-- DONATIONS - Finance Admin can view all donations
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can read own donations" ON public.donations;
CREATE POLICY "Members and admins can read donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR donor_wall_opt_in = true
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Finance Admin')
  );

CREATE POLICY "Finance admins can update donations"
  ON public.donations FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

-- =====================================================
-- MENTORSHIPS - Members can manage, admins can moderate
-- =====================================================
CREATE POLICY "Admins can manage mentorships"
  ON public.mentorships FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin'));

-- =====================================================
-- MATRIMONIAL_PROFILES - Data Steward can verify
-- =====================================================
CREATE POLICY "Admins can manage matrimonial profiles"
  ON public.matrimonial_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));
