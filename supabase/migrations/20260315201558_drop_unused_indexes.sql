/*
  # Drop Unused Indexes

  ## Summary
  Removes all indexes that have never been used (pg_stat_user_indexes.idx_scan = 0).
  Unused indexes consume disk space and slow down write operations (INSERT/UPDATE/DELETE)
  without providing any query performance benefit.

  ## Indexes Dropped
  Covers all reported unused indexes across tables:
  content_news, events, businesses, jobs, members, reports, announcements, audits,
  chapter_transfers, chapters, consents, data_requests, donations, education,
  emergency_contacts, employment, event_checkins, event_photos, event_rsvps,
  family_invitations, family_links, funds, hall_bookings, heritage_tags,
  job_applications, matrimonial_introductions, matrimonial_profiles, media_files,
  medical_aid_requests, member_contacts, member_languages, member_skills,
  mentorship_sessions, mentorships, oral_histories, photo_tags, role_assignments,
  scholarship_applications, scholarships, tag_requests, verification_requests,
  vouches, whatsapp_messages

  ## Notes
  - Foreign key constraint indexes are retained automatically by Postgres
  - Primary key indexes are never dropped
  - Only non-constraint indexes are removed here
*/

DROP INDEX IF EXISTS public.idx_content_news_tags;
DROP INDEX IF EXISTS public.idx_events_time;
DROP INDEX IF EXISTS public.idx_business_sector;
DROP INDEX IF EXISTS public.idx_jobs_status;
DROP INDEX IF EXISTS public.idx_members_name;
DROP INDEX IF EXISTS public.idx_reports_entity;
DROP INDEX IF EXISTS public.idx_reports_status;
DROP INDEX IF EXISTS public.idx_announcements_created_by;
DROP INDEX IF EXISTS public.idx_audits_actor_user_id;
DROP INDEX IF EXISTS public.idx_businesses_chapter_id;
DROP INDEX IF EXISTS public.idx_businesses_city_id;
DROP INDEX IF EXISTS public.idx_businesses_country_id;
DROP INDEX IF EXISTS public.idx_businesses_owner_member_id;
DROP INDEX IF EXISTS public.idx_businesses_state_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_approved_by;
DROP INDEX IF EXISTS public.idx_chapter_transfers_from_chapter_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_member_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_to_chapter_id;
DROP INDEX IF EXISTS public.idx_chapters_city_id;
DROP INDEX IF EXISTS public.idx_chapters_country_id;
DROP INDEX IF EXISTS public.idx_chapters_state_id;
DROP INDEX IF EXISTS public.idx_consents_member_id;
DROP INDEX IF EXISTS public.idx_content_news_chapter_id;
DROP INDEX IF EXISTS public.idx_content_news_city_id;
DROP INDEX IF EXISTS public.idx_content_news_country_id;
DROP INDEX IF EXISTS public.idx_content_news_created_by;
DROP INDEX IF EXISTS public.idx_content_news_reviewed_by;
DROP INDEX IF EXISTS public.idx_content_news_state_id;
DROP INDEX IF EXISTS public.idx_data_requests_member_id;
DROP INDEX IF EXISTS public.idx_donations_fund_id;
DROP INDEX IF EXISTS public.idx_donations_member_id;
DROP INDEX IF EXISTS public.idx_education_member_id;
DROP INDEX IF EXISTS public.idx_emergency_contacts_city_id;
DROP INDEX IF EXISTS public.idx_employment_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_event_id;
DROP INDEX IF EXISTS public.idx_event_checkins_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_scanned_by;
DROP INDEX IF EXISTS public.idx_event_photos_event_id;
DROP INDEX IF EXISTS public.idx_event_photos_uploaded_by;
DROP INDEX IF EXISTS public.idx_event_rsvps_member_id;
DROP INDEX IF EXISTS public.idx_events_chapter_id;
DROP INDEX IF EXISTS public.idx_events_city_id;
DROP INDEX IF EXISTS public.idx_events_country_id;
DROP INDEX IF EXISTS public.idx_events_created_by;
DROP INDEX IF EXISTS public.idx_events_state_id;
DROP INDEX IF EXISTS public.idx_family_invitations_accepted_by;
DROP INDEX IF EXISTS public.idx_family_invitations_inviter;
DROP INDEX IF EXISTS public.idx_family_links_family_id;
DROP INDEX IF EXISTS public.idx_family_links_member_id;
DROP INDEX IF EXISTS public.idx_family_links_related_member_id;
DROP INDEX IF EXISTS public.idx_funds_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_member_id;
DROP INDEX IF EXISTS public.idx_heritage_tags_tagged_by;
DROP INDEX IF EXISTS public.idx_job_applications_member_id;
DROP INDEX IF EXISTS public.idx_jobs_chapter_id;
DROP INDEX IF EXISTS public.idx_jobs_city_id;
DROP INDEX IF EXISTS public.idx_jobs_country_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_business_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_member_id;
DROP INDEX IF EXISTS public.idx_jobs_state_id;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_from;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_to;
DROP INDEX IF EXISTS public.idx_matrimonial_profiles_guardian;
DROP INDEX IF EXISTS public.idx_media_files_owner_user_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_chapter_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_member_id;
DROP INDEX IF EXISTS public.idx_member_contacts_member_id;
DROP INDEX IF EXISTS public.idx_member_languages_member_id;
DROP INDEX IF EXISTS public.idx_member_skills_member_id;
DROP INDEX IF EXISTS public.idx_members_chapter_id;
DROP INDEX IF EXISTS public.idx_mentorship_sessions_mentorship_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentee_member_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentor_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_narrator_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_uploaded_by;
DROP INDEX IF EXISTS public.idx_photo_tags_member_id;
DROP INDEX IF EXISTS public.idx_photo_tags_tagged_by;
DROP INDEX IF EXISTS public.idx_reports_reporter_member_id;
DROP INDEX IF EXISTS public.idx_reports_reviewed_by;
DROP INDEX IF EXISTS public.idx_role_assignments_created_by;
DROP INDEX IF EXISTS public.idx_role_assignments_role_id;
DROP INDEX IF EXISTS public.idx_scholarship_applications_member_id;
DROP INDEX IF EXISTS public.idx_scholarships_chapter_id;
DROP INDEX IF EXISTS public.idx_scholarships_city_id;
DROP INDEX IF EXISTS public.idx_scholarships_country_id;
DROP INDEX IF EXISTS public.idx_scholarships_state_id;
DROP INDEX IF EXISTS public.idx_tag_requests_decided_by;
DROP INDEX IF EXISTS public.idx_tag_requests_requester_user_id;
DROP INDEX IF EXISTS public.idx_verification_requests_member_id;
DROP INDEX IF EXISTS public.idx_vouches_voucher_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_recipient_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_template_id;
