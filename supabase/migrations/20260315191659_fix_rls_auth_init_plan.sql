/*
  # Fix RLS Auth Initialization Plan

  ## Summary
  Replaces all direct `auth.uid()` and `auth.jwt()` calls in RLS policies with
  `(select auth.uid())` / `(select auth.jwt())` subquery form. This prevents
  re-evaluation of the auth function for every row, significantly improving
  query performance at scale.

  ## Tables affected
  announcements, audits, businesses, chapter_transfers, consents, content_news,
  data_requests, donations, education, emergency_contacts, employment,
  event_checkins, event_photos, event_rsvps, events, families, family_invitations,
  family_links, funds, hall_bookings, heritage_tags, job_applications, jobs,
  matrimonial_introductions, matrimonial_profiles, media_files,
  medical_aid_requests, member_contacts, member_languages, member_skills,
  members, mentorship_sessions, mentorships, notification_preferences,
  oral_histories, photo_tags, receipts, reports, scholarship_applications,
  scholarships, tag_requests, verification_requests, vouches,
  whatsapp_messages, whatsapp_templates
*/

-- announcements
DROP POLICY IF EXISTS "Admins can create announcements" ON public.announcements;
CREATE POLICY "Admins can create announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

-- audits
DROP POLICY IF EXISTS "Admins can read audits" ON public.audits;
CREATE POLICY "Admins can read audits" ON public.audits FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "System can insert audits" ON public.audits;
CREATE POLICY "System can insert audits" ON public.audits FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = (select auth.uid()));

-- businesses
DROP POLICY IF EXISTS "Admins can delete businesses" ON public.businesses;
CREATE POLICY "Admins can delete businesses" ON public.businesses FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Directory Manager'));

DROP POLICY IF EXISTS "Members can create businesses" ON public.businesses;
CREATE POLICY "Members can create businesses" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Owners and managers can update businesses" ON public.businesses;
CREATE POLICY "Owners and managers can update businesses" ON public.businesses FOR UPDATE TO authenticated
  USING (
    (owner_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Directory Manager')
  );

-- chapter_transfers
DROP POLICY IF EXISTS "Users can request transfer" ON public.chapter_transfers;
CREATE POLICY "Users can request transfer" ON public.chapter_transfers FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- consents
DROP POLICY IF EXISTS "Members can create consents" ON public.consents;
CREATE POLICY "Members can create consents" ON public.consents FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own consents" ON public.consents;
CREATE POLICY "Members read own consents" ON public.consents FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- content_news
DROP POLICY IF EXISTS "Admins can delete news" ON public.content_news;
CREATE POLICY "Admins can delete news" ON public.content_news FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Global Publisher'));

DROP POLICY IF EXISTS "Anyone can read published news" ON public.content_news;
CREATE POLICY "Anyone can read published news" ON public.content_news FOR SELECT
  USING ((status = 'published') OR (created_by = (select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can create news" ON public.content_news;
CREATE POLICY "Authenticated can create news" ON public.content_news FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Authors and publishers can update news" ON public.content_news;
CREATE POLICY "Authors and publishers can update news" ON public.content_news FOR UPDATE TO authenticated
  USING (
    (created_by = (select auth.uid()))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Global Publisher')
    OR has_role((select auth.uid()), 'Publisher')
    OR has_role((select auth.uid()), 'Moderator')
  );

-- data_requests
DROP POLICY IF EXISTS "Members can create data requests" ON public.data_requests;
CREATE POLICY "Members can create data requests" ON public.data_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own data requests" ON public.data_requests;
CREATE POLICY "Members read own data requests" ON public.data_requests FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- donations
DROP POLICY IF EXISTS "Finance admins can update donations" ON public.donations;
CREATE POLICY "Finance admins can update donations" ON public.donations FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Members and admins can read donations" ON public.donations;
CREATE POLICY "Members and admins can read donations" ON public.donations FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (donor_wall_opt_in = true)
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Finance Admin')
  );

DROP POLICY IF EXISTS "Members can donate" ON public.donations;
CREATE POLICY "Members can donate" ON public.donations FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- education
DROP POLICY IF EXISTS "Users can delete own education" ON public.education;
CREATE POLICY "Users can delete own education" ON public.education FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own education" ON public.education;
CREATE POLICY "Users can manage own education" ON public.education FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own education" ON public.education;
CREATE POLICY "Users can update own education" ON public.education FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- emergency_contacts
DROP POLICY IF EXISTS "Admins can create emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Admins can create emergency contacts" ON public.emergency_contacts FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can delete emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Admins can delete emergency contacts" ON public.emergency_contacts FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can update emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Admins can update emergency contacts" ON public.emergency_contacts FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

-- employment
DROP POLICY IF EXISTS "Users can delete own employment" ON public.employment;
CREATE POLICY "Users can delete own employment" ON public.employment FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own employment" ON public.employment;
CREATE POLICY "Users can manage own employment" ON public.employment FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own employment" ON public.employment;
CREATE POLICY "Users can update own employment" ON public.employment FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- event_checkins
DROP POLICY IF EXISTS "Event managers can create checkins" ON public.event_checkins;
CREATE POLICY "Event managers can create checkins" ON public.event_checkins FOR INSERT TO authenticated
  WITH CHECK (
    (scanned_by = (select auth.uid()))
    OR (EXISTS (SELECT 1 FROM events e WHERE e.id = event_checkins.event_id AND e.created_by = (select auth.uid())))
  );

-- event_photos
DROP POLICY IF EXISTS "Members can upload photos" ON public.event_photos;
CREATE POLICY "Members can upload photos" ON public.event_photos FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Uploaders can delete own photos" ON public.event_photos;
CREATE POLICY "Uploaders can delete own photos" ON public.event_photos FOR DELETE TO authenticated
  USING (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- event_rsvps
DROP POLICY IF EXISTS "Members can delete own rsvp" ON public.event_rsvps;
CREATE POLICY "Members can delete own rsvp" ON public.event_rsvps FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can rsvp" ON public.event_rsvps;
CREATE POLICY "Members can rsvp" ON public.event_rsvps FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update own rsvp" ON public.event_rsvps;
CREATE POLICY "Members can update own rsvp" ON public.event_rsvps FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- events
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Event Manager'));

DROP POLICY IF EXISTS "Anyone can read published events" ON public.events;
CREATE POLICY "Anyone can read published events" ON public.events FOR SELECT
  USING ((status = 'published') OR (created_by = (select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can create events" ON public.events;
CREATE POLICY "Authenticated can create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Creators and managers can update events" ON public.events;
CREATE POLICY "Creators and managers can update events" ON public.events FOR UPDATE TO authenticated
  USING (
    (created_by = (select auth.uid()))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Event Manager')
  );

-- families
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families" ON public.families FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE members.user_id = (select auth.uid())));

-- family_invitations
DROP POLICY IF EXISTS "Members can create invitations" ON public.family_invitations;
CREATE POLICY "Members can create invitations" ON public.family_invitations FOR INSERT TO authenticated
  WITH CHECK (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can delete own invitations" ON public.family_invitations;
CREATE POLICY "Members can delete own invitations" ON public.family_invitations FOR DELETE TO authenticated
  USING (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update own invitations" ON public.family_invitations;
CREATE POLICY "Members can update own invitations" ON public.family_invitations FOR UPDATE TO authenticated
  USING (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own invitations" ON public.family_invitations;
CREATE POLICY "Members read own invitations" ON public.family_invitations FOR SELECT TO authenticated
  USING (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- family_links
DROP POLICY IF EXISTS "Users can delete own family links" ON public.family_links;
CREATE POLICY "Users can delete own family links" ON public.family_links FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own family links" ON public.family_links;
CREATE POLICY "Users can manage own family links" ON public.family_links FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own family links" ON public.family_links;
CREATE POLICY "Users can update own family links" ON public.family_links FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- funds
DROP POLICY IF EXISTS "Admins can create funds" ON public.funds;
CREATE POLICY "Admins can create funds" ON public.funds FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can delete funds" ON public.funds;
CREATE POLICY "Admins can delete funds" ON public.funds FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can update funds" ON public.funds;
CREATE POLICY "Admins can update funds" ON public.funds FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

-- hall_bookings (fix FOR ALL and individual policies)
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can create bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can read bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can update own bookings" ON public.hall_bookings;

CREATE POLICY "Admins can read bookings" ON public.hall_bookings FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

CREATE POLICY "Members can read own bookings" ON public.hall_bookings FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Members can create bookings" ON public.hall_bookings FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Members can update own bookings" ON public.hall_bookings FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can update bookings" ON public.hall_bookings FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

CREATE POLICY "Admins can insert bookings" ON public.hall_bookings FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

CREATE POLICY "Admins can delete bookings" ON public.hall_bookings FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

-- heritage_tags
DROP POLICY IF EXISTS "Admins can approve heritage tags" ON public.heritage_tags;
CREATE POLICY "Admins can approve heritage tags" ON public.heritage_tags FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "Admins can delete heritage tags" ON public.heritage_tags;
CREATE POLICY "Admins can delete heritage tags" ON public.heritage_tags FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "Anyone can read approved tags" ON public.heritage_tags;
CREATE POLICY "Anyone can read approved tags" ON public.heritage_tags FOR SELECT
  USING ((approved = true) OR (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))));

DROP POLICY IF EXISTS "Members can add tags" ON public.heritage_tags;
CREATE POLICY "Members can add tags" ON public.heritage_tags FOR INSERT TO authenticated
  WITH CHECK (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- job_applications
DROP POLICY IF EXISTS "Applicants and employers read applications" ON public.job_applications;
CREATE POLICY "Applicants and employers read applications" ON public.job_applications FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (job_id IN (SELECT j.id FROM jobs j WHERE j.employer_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))))
  );

DROP POLICY IF EXISTS "Applicants can update application" ON public.job_applications;
CREATE POLICY "Applicants can update application" ON public.job_applications FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can apply" ON public.job_applications;
CREATE POLICY "Members can apply" ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- jobs
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
CREATE POLICY "Admins can delete jobs" ON public.jobs FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Directory Manager'));

DROP POLICY IF EXISTS "Employers and managers can update jobs" ON public.jobs;
CREATE POLICY "Employers and managers can update jobs" ON public.jobs FOR UPDATE TO authenticated
  USING (
    (employer_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Directory Manager')
  );

DROP POLICY IF EXISTS "Members can post jobs" ON public.jobs;
CREATE POLICY "Members can post jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (employer_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- matrimonial_introductions
DROP POLICY IF EXISTS "Authenticated can read introductions" ON public.matrimonial_introductions;
CREATE POLICY "Authenticated can read introductions" ON public.matrimonial_introductions FOR SELECT TO authenticated
  USING (
    (from_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (to_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
  );

DROP POLICY IF EXISTS "Members can send introductions" ON public.matrimonial_introductions;
CREATE POLICY "Members can send introductions" ON public.matrimonial_introductions FOR INSERT TO authenticated
  WITH CHECK (from_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update own introductions" ON public.matrimonial_introductions;
CREATE POLICY "Members can update own introductions" ON public.matrimonial_introductions FOR UPDATE TO authenticated
  USING (
    (from_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (to_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
  );

-- matrimonial_profiles (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can create own profile" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can update own profile" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Verified members read profiles" ON public.matrimonial_profiles;

CREATE POLICY "Verified members read profiles" ON public.matrimonial_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members can create own profile" ON public.matrimonial_profiles FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Members can update own profile" ON public.matrimonial_profiles FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can read matrimonial profiles" ON public.matrimonial_profiles FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can insert matrimonial profiles" ON public.matrimonial_profiles FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can update matrimonial profiles" ON public.matrimonial_profiles FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can delete matrimonial profiles" ON public.matrimonial_profiles FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

-- media_files
DROP POLICY IF EXISTS "Public media readable" ON public.media_files;
CREATE POLICY "Public media readable" ON public.media_files FOR SELECT
  USING ((consent = 'public') OR (owner_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can upload media" ON public.media_files;
CREATE POLICY "Users can upload media" ON public.media_files FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (select auth.uid()));

-- medical_aid_requests
DROP POLICY IF EXISTS "Admins can manage medical aid" ON public.medical_aid_requests;
CREATE POLICY "Admins can manage medical aid" ON public.medical_aid_requests FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Members can request medical aid" ON public.medical_aid_requests;
CREATE POLICY "Members can request medical aid" ON public.medical_aid_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own medical aid" ON public.medical_aid_requests;
CREATE POLICY "Members read own medical aid" ON public.medical_aid_requests FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Chapter Admin')
  );

-- member_contacts
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.member_contacts;
CREATE POLICY "Users can delete own contacts" ON public.member_contacts FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can insert own contacts" ON public.member_contacts;
CREATE POLICY "Users can insert own contacts" ON public.member_contacts FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can read own contacts" ON public.member_contacts;
CREATE POLICY "Users can read own contacts" ON public.member_contacts FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own contacts" ON public.member_contacts;
CREATE POLICY "Users can update own contacts" ON public.member_contacts FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- member_languages
DROP POLICY IF EXISTS "Users can delete own languages" ON public.member_languages;
CREATE POLICY "Users can delete own languages" ON public.member_languages FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own languages" ON public.member_languages;
CREATE POLICY "Users can manage own languages" ON public.member_languages FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- member_skills
DROP POLICY IF EXISTS "Users can delete own skills" ON public.member_skills;
CREATE POLICY "Users can delete own skills" ON public.member_skills FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own skills" ON public.member_skills;
CREATE POLICY "Users can manage own skills" ON public.member_skills FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- members
DROP POLICY IF EXISTS "Admins can update any member" ON public.members;
CREATE POLICY "Admins can update any member" ON public.members FOR UPDATE TO authenticated
  USING (
    has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Data Steward')
    OR has_role((select auth.uid()), 'Chapter Admin')
  );

DROP POLICY IF EXISTS "Users can insert own member" ON public.members;
CREATE POLICY "Users can insert own member" ON public.members FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own member" ON public.members;
CREATE POLICY "Users can update own member" ON public.members FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

-- mentorship_sessions
DROP POLICY IF EXISTS "Mentors log sessions" ON public.mentorship_sessions;
CREATE POLICY "Mentors log sessions" ON public.mentorship_sessions FOR INSERT TO authenticated
  WITH CHECK (
    mentorship_id IN (
      SELECT mentorships.id FROM mentorships
      WHERE mentorships.mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Participants read sessions" ON public.mentorship_sessions;
CREATE POLICY "Participants read sessions" ON public.mentorship_sessions FOR SELECT TO authenticated
  USING (
    mentorship_id IN (
      SELECT mentorships.id FROM mentorships
      WHERE (
        mentorships.mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
        OR mentorships.mentee_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
      )
    )
  );

-- mentorships (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Authenticated can read mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Members can offer mentorship" ON public.mentorships;
DROP POLICY IF EXISTS "Mentors can update own" ON public.mentorships;

CREATE POLICY "Authenticated can read mentorships" ON public.mentorships FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members can offer mentorship" ON public.mentorships FOR INSERT TO authenticated
  WITH CHECK (mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Mentors can update own" ON public.mentorships FOR UPDATE TO authenticated
  USING (mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can read mentorships" ON public.mentorships FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

CREATE POLICY "Admins can insert mentorships" ON public.mentorships FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin'));

CREATE POLICY "Admins can update mentorships" ON public.mentorships FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

CREATE POLICY "Admins can delete mentorships" ON public.mentorships FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

-- notification_preferences
DROP POLICY IF EXISTS "Members can create prefs" ON public.notification_preferences;
CREATE POLICY "Members can create prefs" ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update prefs" ON public.notification_preferences;
CREATE POLICY "Members can update prefs" ON public.notification_preferences FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own prefs" ON public.notification_preferences;
CREATE POLICY "Members read own prefs" ON public.notification_preferences FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- oral_histories (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Anyone can read published oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Members can upload oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Uploaders can update" ON public.oral_histories;

CREATE POLICY "Anyone can read published oral histories" ON public.oral_histories FOR SELECT
  USING (
    (status = 'published')
    OR (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
  );

CREATE POLICY "Members can upload oral histories" ON public.oral_histories FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Uploaders can update" ON public.oral_histories FOR UPDATE TO authenticated
  USING (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can read oral histories" ON public.oral_histories FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can insert oral histories" ON public.oral_histories FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can update oral histories" ON public.oral_histories FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can delete oral histories" ON public.oral_histories FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

-- photo_tags
DROP POLICY IF EXISTS "Members can tag" ON public.photo_tags;
CREATE POLICY "Members can tag" ON public.photo_tags FOR INSERT TO authenticated
  WITH CHECK (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Tagged members can update consent" ON public.photo_tags;
CREATE POLICY "Tagged members can update consent" ON public.photo_tags FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Taggers can delete tags" ON public.photo_tags;
CREATE POLICY "Taggers can delete tags" ON public.photo_tags FOR DELETE TO authenticated
  USING (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- receipts
DROP POLICY IF EXISTS "Members read own receipts" ON public.receipts;
CREATE POLICY "Members read own receipts" ON public.receipts FOR SELECT TO authenticated
  USING (
    donation_id IN (
      SELECT donations.id FROM donations
      WHERE donations.member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
    )
  );

-- reports
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated
  USING (
    has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Moderator')
    OR has_role((select auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Authenticated members can report" ON public.reports;
CREATE POLICY "Authenticated members can report" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT TO authenticated
  USING (
    (reporter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Moderator')
    OR has_role((select auth.uid()), 'Data Steward')
  );

-- scholarship_applications
DROP POLICY IF EXISTS "Members can apply to scholarships" ON public.scholarship_applications;
CREATE POLICY "Members can apply to scholarships" ON public.scholarship_applications FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can submit scholarship app" ON public.scholarship_applications;
CREATE POLICY "Members can submit scholarship app" ON public.scholarship_applications FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- scholarships
DROP POLICY IF EXISTS "Admins can create scholarships" ON public.scholarships;
CREATE POLICY "Admins can create scholarships" ON public.scholarships FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can delete scholarships" ON public.scholarships;
CREATE POLICY "Admins can delete scholarships" ON public.scholarships FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can update scholarships" ON public.scholarships;
CREATE POLICY "Admins can update scholarships" ON public.scholarships FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

-- tag_requests
DROP POLICY IF EXISTS "Members can request tags" ON public.tag_requests;
CREATE POLICY "Members can request tags" ON public.tag_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = (select auth.uid()));

-- verification_requests
DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests" ON public.verification_requests FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "Members can create verification requests" ON public.verification_requests;
CREATE POLICY "Members can create verification requests" ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can read own verification requests" ON public.verification_requests;
CREATE POLICY "Members can read own verification requests" ON public.verification_requests FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Data Steward')
  );

-- vouches
DROP POLICY IF EXISTS "Users can create vouches" ON public.vouches;
CREATE POLICY "Users can create vouches" ON public.vouches FOR INSERT TO authenticated
  WITH CHECK (voucher_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- whatsapp_messages (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage messages" ON public.whatsapp_messages;
CREATE POLICY "Admins can read messages" ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can insert messages" ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can update messages" ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can delete messages" ON public.whatsapp_messages FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

-- whatsapp_templates (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Authenticated can read templates" ON public.whatsapp_templates;

CREATE POLICY "Authenticated can read templates" ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins can insert templates" ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can update templates" ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can delete templates" ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));
