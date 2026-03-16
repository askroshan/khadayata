/*
  # Add Missing Foreign Key Indexes

  ## Summary
  Adds covering indexes for all foreign key columns that were flagged as missing indexes.
  This improves JOIN and lookup query performance across all tables.

  ## Tables affected
  - announcements, audits, businesses, chapter_transfers, chapters
  - consents, content_news, data_requests, donations, education
  - emergency_contacts, employment, event_checkins, event_photos
  - event_rsvps, events, family_invitations, family_links, funds
  - hall_bookings, heritage_tags, job_applications, jobs
  - matrimonial_introductions, matrimonial_profiles, media_files
  - medical_aid_requests, member_contacts, member_languages
  - member_skills, members, mentorship_sessions, mentorships
  - oral_histories, photo_tags, reports, role_assignments
  - scholarship_applications, scholarships, tag_requests
  - verification_requests, vouches, whatsapp_messages
*/

CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);

CREATE INDEX IF NOT EXISTS idx_audits_actor_user_id ON public.audits(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_businesses_chapter_id ON public.businesses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_country_id ON public.businesses(country_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_member_id ON public.businesses(owner_member_id);
CREATE INDEX IF NOT EXISTS idx_businesses_state_id ON public.businesses(state_id);

CREATE INDEX IF NOT EXISTS idx_chapter_transfers_approved_by ON public.chapter_transfers(approved_by);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_from_chapter_id ON public.chapter_transfers(from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_member_id ON public.chapter_transfers(member_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_to_chapter_id ON public.chapter_transfers(to_chapter_id);

CREATE INDEX IF NOT EXISTS idx_chapters_city_id ON public.chapters(city_id);
CREATE INDEX IF NOT EXISTS idx_chapters_country_id ON public.chapters(country_id);
CREATE INDEX IF NOT EXISTS idx_chapters_state_id ON public.chapters(state_id);

CREATE INDEX IF NOT EXISTS idx_consents_member_id ON public.consents(member_id);

CREATE INDEX IF NOT EXISTS idx_content_news_chapter_id ON public.content_news(chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_news_city_id ON public.content_news(city_id);
CREATE INDEX IF NOT EXISTS idx_content_news_country_id ON public.content_news(country_id);
CREATE INDEX IF NOT EXISTS idx_content_news_created_by ON public.content_news(created_by);
CREATE INDEX IF NOT EXISTS idx_content_news_reviewed_by ON public.content_news(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_content_news_state_id ON public.content_news(state_id);

CREATE INDEX IF NOT EXISTS idx_data_requests_member_id ON public.data_requests(member_id);

CREATE INDEX IF NOT EXISTS idx_donations_fund_id ON public.donations(fund_id);
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON public.donations(member_id);

CREATE INDEX IF NOT EXISTS idx_education_member_id ON public.education(member_id);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_city_id ON public.emergency_contacts(city_id);

CREATE INDEX IF NOT EXISTS idx_employment_member_id ON public.employment(member_id);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_member_id ON public.event_checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_scanned_by ON public.event_checkins(scanned_by);

CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by ON public.event_photos(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON public.event_rsvps(member_id);

CREATE INDEX IF NOT EXISTS idx_events_chapter_id ON public.events(chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id);
CREATE INDEX IF NOT EXISTS idx_events_country_id ON public.events(country_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_state_id ON public.events(state_id);

CREATE INDEX IF NOT EXISTS idx_family_invitations_accepted_by ON public.family_invitations(accepted_by_member_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_inviter ON public.family_invitations(inviter_member_id);

CREATE INDEX IF NOT EXISTS idx_family_links_family_id ON public.family_links(family_id);
CREATE INDEX IF NOT EXISTS idx_family_links_member_id ON public.family_links(member_id);
CREATE INDEX IF NOT EXISTS idx_family_links_related_member_id ON public.family_links(related_member_id);

CREATE INDEX IF NOT EXISTS idx_funds_chapter_id ON public.funds(chapter_id);

CREATE INDEX IF NOT EXISTS idx_hall_bookings_chapter_id ON public.hall_bookings(chapter_id);
CREATE INDEX IF NOT EXISTS idx_hall_bookings_member_id ON public.hall_bookings(member_id);

CREATE INDEX IF NOT EXISTS idx_heritage_tags_tagged_by ON public.heritage_tags(tagged_by);

CREATE INDEX IF NOT EXISTS idx_job_applications_member_id ON public.job_applications(member_id);

CREATE INDEX IF NOT EXISTS idx_jobs_chapter_id ON public.jobs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_country_id ON public.jobs(country_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_business_id ON public.jobs(employer_business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_member_id ON public.jobs(employer_member_id);
CREATE INDEX IF NOT EXISTS idx_jobs_state_id ON public.jobs(state_id);

CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_from ON public.matrimonial_introductions(from_member_id);
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_to ON public.matrimonial_introductions(to_member_id);

CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_guardian ON public.matrimonial_profiles(guardian_member_id);

CREATE INDEX IF NOT EXISTS idx_media_files_owner_user_id ON public.media_files(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_chapter_id ON public.medical_aid_requests(chapter_id);
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_member_id ON public.medical_aid_requests(member_id);

CREATE INDEX IF NOT EXISTS idx_member_contacts_member_id ON public.member_contacts(member_id);

CREATE INDEX IF NOT EXISTS idx_member_languages_member_id ON public.member_languages(member_id);

CREATE INDEX IF NOT EXISTS idx_member_skills_member_id ON public.member_skills(member_id);

CREATE INDEX IF NOT EXISTS idx_members_chapter_id ON public.members(chapter_id);

CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentorship_id ON public.mentorship_sessions(mentorship_id);

CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_member_id ON public.mentorships(mentee_member_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_member_id ON public.mentorships(mentor_member_id);

CREATE INDEX IF NOT EXISTS idx_oral_histories_narrator_member_id ON public.oral_histories(narrator_member_id);
CREATE INDEX IF NOT EXISTS idx_oral_histories_uploaded_by ON public.oral_histories(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_photo_tags_member_id ON public.photo_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_by ON public.photo_tags(tagged_by);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_member_id ON public.reports(reporter_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_role_assignments_created_by ON public.role_assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_role_assignments_member_id ON public.role_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_id ON public.role_assignments(role_id);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_member_id ON public.scholarship_applications(member_id);

CREATE INDEX IF NOT EXISTS idx_scholarships_chapter_id ON public.scholarships(chapter_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_city_id ON public.scholarships(city_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_country_id ON public.scholarships(country_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_state_id ON public.scholarships(state_id);

CREATE INDEX IF NOT EXISTS idx_tag_requests_decided_by ON public.tag_requests(decided_by);
CREATE INDEX IF NOT EXISTS idx_tag_requests_requester_user_id ON public.tag_requests(requester_user_id);

CREATE INDEX IF NOT EXISTS idx_verification_requests_member_id ON public.verification_requests(member_id);

CREATE INDEX IF NOT EXISTS idx_vouches_voucher_member_id ON public.vouches(voucher_member_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient_member_id ON public.whatsapp_messages(recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON public.whatsapp_messages(template_id);
