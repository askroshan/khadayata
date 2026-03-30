/*
  # Drop Unused Indexes — Batch 3

  ## Summary
  Drops all indexes flagged as unused by Supabase advisor.
  These indexes consume disk space and slow down write operations without
  benefiting any queries. They can be recreated if query patterns change.

  ## Indexes Dropped
  Covers tables: chapter_transfer_history, chapter_transfers, announcements, audits,
  businesses, chapters, consents, content_news, data_requests, donations, donor_wall,
  education, emergency_contacts, employment, event_checkins, event_photos, event_rsvps,
  events, family_connections, family_invitations, family_links, funds, hall_bookings,
  heritage_tags, job_applications, jobs, matrimonial_introductions, matrimonial_profiles,
  media_files, medical_aid_requests, member_contacts, member_languages, member_skills,
  members, mentorship_sessions, mentorships, oral_histories, photo_tags, reports,
  role_assignments, samiti_groups, samiti_members, scholarship_applications, scholarships,
  tag_requests, verification_requests, vouches, whatsapp_messages, council_replies,
  council_threads, council_votes, rishta_requests, obituaries, sms_messages, vouch_requests
*/

DROP INDEX IF EXISTS public.idx_cth_member_id;
DROP INDEX IF EXISTS public.idx_cth_from_chapter;
DROP INDEX IF EXISTS public.idx_cth_to_chapter;
DROP INDEX IF EXISTS public.idx_cth_effective_at;
DROP INDEX IF EXISTS public.idx_cth_related_transfer;
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
DROP INDEX IF EXISTS public.idx_donor_wall_member_id;
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
DROP INDEX IF EXISTS public.idx_family_connections_related_member_id;
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
DROP INDEX IF EXISTS public.idx_samiti_groups_contact_member_id;
DROP INDEX IF EXISTS public.idx_samiti_members_member_id;
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
DROP INDEX IF EXISTS public.idx_content_news_pinned;
DROP INDEX IF EXISTS public.idx_content_news_article_type;
DROP INDEX IF EXISTS public.council_replies_thread_id_idx;
DROP INDEX IF EXISTS public.council_threads_author_id_idx;
DROP INDEX IF EXISTS public.council_threads_chapter_id_idx;
DROP INDEX IF EXISTS public.council_threads_created_at_idx;
DROP INDEX IF EXISTS public.council_votes_thread_id_idx;
DROP INDEX IF EXISTS public.rishta_requests_from_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_to_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_status_idx;
DROP INDEX IF EXISTS public.idx_obituaries_chapter_id;
DROP INDEX IF EXISTS public.sms_messages_recipient_idx;
DROP INDEX IF EXISTS public.sms_messages_status_idx;
DROP INDEX IF EXISTS public.vouch_requests_requester_idx;
DROP INDEX IF EXISTS public.vouch_requests_target_idx;
DROP INDEX IF EXISTS public.idx_obituaries_dod;
DROP INDEX IF EXISTS public.idx_obituaries_posted_by;
DROP INDEX IF EXISTS public.idx_obituaries_created_at;
