/*
  # Drop Unused Indexes - Batch 4

  Removes all unused indexes identified by the security advisor.
  These indexes have never been used and only add write overhead without query benefits.

  Tables affected:
  - chapter_transfer_history (7 indexes)
  - announcements (1)
  - audits (1)
  - businesses (5)
  - chapter_transfers (4)
  - chapters (3)
  - consents (1)
  - content_news (8)
  - data_requests (1)
  - donations (1)
  - donor_wall (2)
  - education (1)
  - emergency_contacts (1)
  - employment (1)
  - event_checkins (3)
  - event_photos (2)
  - event_rsvps (1)
  - events (5)
  - family_connections (1)
  - family_links (3)
  - funds (1)
  - hall_bookings (2)
  - heritage_tags (1)
  - job_applications (1)
  - jobs (6)
  - matrimonial_introductions (2)
  - matrimonial_profiles (1)
  - media_files (1)
  - medical_aid_requests (2)
  - member_contacts (1)
  - member_languages (1)
  - member_skills (1)
  - members (1)
  - mentorship_sessions (1)
  - mentorships (2)
  - oral_histories (2)
  - photo_tags (2)
  - reports (2)
  - role_assignments (2)
  - samiti_groups (2)
  - samiti_members (1)
  - scholarship_applications (1)
  - scholarships (4)
  - tag_requests (2)
  - verification_requests (1)
  - vouches (1)
  - whatsapp_messages (2)
  - council_replies (2)
  - council_threads (4)
  - council_votes (2)
  - rishta_requests (3)
  - obituaries (4)
  - sms_messages (3 - keeping one)
  - vouch_requests (2)
  - family_invitations (2)
  - banned_keywords (1)
*/

-- chapter_transfer_history
DROP INDEX IF EXISTS public.idx_cth_member_id;
DROP INDEX IF EXISTS public.idx_cth_from_chapter;
DROP INDEX IF EXISTS public.idx_cth_to_chapter;
DROP INDEX IF EXISTS public.idx_cth_effective_at;
DROP INDEX IF EXISTS public.idx_cth_related_transfer;
DROP INDEX IF EXISTS public.idx_cth_approved_by;
DROP INDEX IF EXISTS public.idx_cth_initiated_by;

-- announcements
DROP INDEX IF EXISTS public.idx_announcements_created_by;

-- audits
DROP INDEX IF EXISTS public.idx_audits_actor_user_id;

-- businesses
DROP INDEX IF EXISTS public.idx_businesses_chapter_id;
DROP INDEX IF EXISTS public.idx_businesses_city_id;
DROP INDEX IF EXISTS public.idx_businesses_country_id;
DROP INDEX IF EXISTS public.idx_businesses_owner_member_id;
DROP INDEX IF EXISTS public.idx_businesses_state_id;

-- chapter_transfers
DROP INDEX IF EXISTS public.idx_chapter_transfers_approved_by;
DROP INDEX IF EXISTS public.idx_chapter_transfers_from_chapter_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_member_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_to_chapter_id;

-- chapters
DROP INDEX IF EXISTS public.idx_chapters_city_id;
DROP INDEX IF EXISTS public.idx_chapters_country_id;
DROP INDEX IF EXISTS public.idx_chapters_state_id;

-- consents
DROP INDEX IF EXISTS public.idx_consents_member_id;

-- content_news
DROP INDEX IF EXISTS public.idx_content_news_chapter_id;
DROP INDEX IF EXISTS public.idx_content_news_city_id;
DROP INDEX IF EXISTS public.idx_content_news_country_id;
DROP INDEX IF EXISTS public.idx_content_news_created_by;
DROP INDEX IF EXISTS public.idx_content_news_reviewed_by;
DROP INDEX IF EXISTS public.idx_content_news_state_id;
DROP INDEX IF EXISTS public.idx_content_news_pinned;
DROP INDEX IF EXISTS public.idx_content_news_article_type;

-- data_requests
DROP INDEX IF EXISTS public.idx_data_requests_member_id;

-- donations
DROP INDEX IF EXISTS public.idx_donations_fund_id;

-- donor_wall
DROP INDEX IF EXISTS public.idx_donor_wall_member_id;
DROP INDEX IF EXISTS public.idx_donor_wall_chapter_id;

-- education
DROP INDEX IF EXISTS public.idx_education_member_id;

-- emergency_contacts
DROP INDEX IF EXISTS public.idx_emergency_contacts_city_id;

-- employment
DROP INDEX IF EXISTS public.idx_employment_member_id;

-- event_checkins
DROP INDEX IF EXISTS public.idx_event_checkins_event_id;
DROP INDEX IF EXISTS public.idx_event_checkins_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_scanned_by;

-- event_photos
DROP INDEX IF EXISTS public.idx_event_photos_event_id;
DROP INDEX IF EXISTS public.idx_event_photos_uploaded_by;

-- event_rsvps
DROP INDEX IF EXISTS public.idx_event_rsvps_member_id;

-- events
DROP INDEX IF EXISTS public.idx_events_chapter_id;
DROP INDEX IF EXISTS public.idx_events_city_id;
DROP INDEX IF EXISTS public.idx_events_country_id;
DROP INDEX IF EXISTS public.idx_events_created_by;
DROP INDEX IF EXISTS public.idx_events_state_id;

-- family_connections
DROP INDEX IF EXISTS public.idx_family_connections_related_member_id;

-- family_links
DROP INDEX IF EXISTS public.idx_family_links_family_id;
DROP INDEX IF EXISTS public.idx_family_links_member_id;
DROP INDEX IF EXISTS public.idx_family_links_related_member_id;

-- funds
DROP INDEX IF EXISTS public.idx_funds_chapter_id;

-- hall_bookings
DROP INDEX IF EXISTS public.idx_hall_bookings_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_member_id;

-- heritage_tags
DROP INDEX IF EXISTS public.idx_heritage_tags_tagged_by;

-- job_applications
DROP INDEX IF EXISTS public.idx_job_applications_member_id;

-- jobs
DROP INDEX IF EXISTS public.idx_jobs_chapter_id;
DROP INDEX IF EXISTS public.idx_jobs_city_id;
DROP INDEX IF EXISTS public.idx_jobs_country_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_business_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_member_id;
DROP INDEX IF EXISTS public.idx_jobs_state_id;

-- matrimonial_introductions
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_from;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_to;

-- matrimonial_profiles
DROP INDEX IF EXISTS public.idx_matrimonial_profiles_guardian;

-- media_files
DROP INDEX IF EXISTS public.idx_media_files_owner_user_id;

-- medical_aid_requests
DROP INDEX IF EXISTS public.idx_medical_aid_requests_chapter_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_member_id;

-- member_contacts
DROP INDEX IF EXISTS public.idx_member_contacts_member_id;

-- member_languages
DROP INDEX IF EXISTS public.idx_member_languages_member_id;

-- member_skills
DROP INDEX IF EXISTS public.idx_member_skills_member_id;

-- members
DROP INDEX IF EXISTS public.idx_members_chapter_id;

-- mentorship_sessions
DROP INDEX IF EXISTS public.idx_mentorship_sessions_mentorship_id;

-- mentorships
DROP INDEX IF EXISTS public.idx_mentorships_mentee_member_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentor_member_id;

-- oral_histories
DROP INDEX IF EXISTS public.idx_oral_histories_narrator_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_uploaded_by;

-- photo_tags
DROP INDEX IF EXISTS public.idx_photo_tags_member_id;
DROP INDEX IF EXISTS public.idx_photo_tags_tagged_by;

-- reports
DROP INDEX IF EXISTS public.idx_reports_reporter_member_id;
DROP INDEX IF EXISTS public.idx_reports_reviewed_by;

-- role_assignments
DROP INDEX IF EXISTS public.idx_role_assignments_created_by;
DROP INDEX IF EXISTS public.idx_role_assignments_role_id;

-- samiti_groups
DROP INDEX IF EXISTS public.idx_samiti_groups_contact_member_id;
DROP INDEX IF EXISTS public.idx_samiti_groups_chapter_id;

-- samiti_members
DROP INDEX IF EXISTS public.idx_samiti_members_member_id;

-- scholarship_applications
DROP INDEX IF EXISTS public.idx_scholarship_applications_member_id;

-- scholarships
DROP INDEX IF EXISTS public.idx_scholarships_chapter_id;
DROP INDEX IF EXISTS public.idx_scholarships_city_id;
DROP INDEX IF EXISTS public.idx_scholarships_country_id;
DROP INDEX IF EXISTS public.idx_scholarships_state_id;

-- tag_requests
DROP INDEX IF EXISTS public.idx_tag_requests_decided_by;
DROP INDEX IF EXISTS public.idx_tag_requests_requester_user_id;

-- verification_requests
DROP INDEX IF EXISTS public.idx_verification_requests_member_id;

-- vouches
DROP INDEX IF EXISTS public.idx_vouches_voucher_member_id;

-- whatsapp_messages
DROP INDEX IF EXISTS public.idx_whatsapp_messages_recipient_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_template_id;

-- council_replies
DROP INDEX IF EXISTS public.council_replies_thread_id_idx;
DROP INDEX IF EXISTS public.idx_council_replies_author_id;

-- council_threads
DROP INDEX IF EXISTS public.council_threads_author_id_idx;
DROP INDEX IF EXISTS public.council_threads_chapter_id_idx;
DROP INDEX IF EXISTS public.council_threads_created_at_idx;

-- council_votes
DROP INDEX IF EXISTS public.council_votes_thread_id_idx;
DROP INDEX IF EXISTS public.idx_council_votes_member_id;

-- rishta_requests
DROP INDEX IF EXISTS public.rishta_requests_from_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_to_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_status_idx;

-- obituaries
DROP INDEX IF EXISTS public.idx_obituaries_chapter_id;
DROP INDEX IF EXISTS public.idx_obituaries_dod;
DROP INDEX IF EXISTS public.idx_obituaries_posted_by;
DROP INDEX IF EXISTS public.idx_obituaries_created_at;

-- sms_messages: drop duplicate, keep idx_sms_messages_recipient_member_id
DROP INDEX IF EXISTS public.sms_messages_recipient_idx;
DROP INDEX IF EXISTS public.sms_messages_status_idx;
DROP INDEX IF EXISTS public.idx_sms_messages_sent_by;

-- vouch_requests
DROP INDEX IF EXISTS public.vouch_requests_requester_idx;
DROP INDEX IF EXISTS public.vouch_requests_target_idx;

-- family_invitations
DROP INDEX IF EXISTS public.idx_family_invitations_accepted_by;
DROP INDEX IF EXISTS public.idx_family_invitations_inviter;

-- banned_keywords
DROP INDEX IF EXISTS public.idx_banned_keywords_added_by;
