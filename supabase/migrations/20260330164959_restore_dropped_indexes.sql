/*
  # Restore Dropped Indexes

  ## Summary
  Restores all indexes that were previously dropped based on "unused" advisories.
  Those advisories are unreliable on a zero-traffic database — pg_stat_user_indexes
  only reflects scans since last stats reset, so all indexes appeared unused.

  These indexes cover foreign key columns and frequently-filtered fields that are
  critical for query performance once the application has real traffic.

  All indexes use IF NOT EXISTS so this is fully safe to run.
*/

-- chapter_transfer_history
CREATE INDEX IF NOT EXISTS idx_cth_member_id ON public.chapter_transfer_history (member_id);
CREATE INDEX IF NOT EXISTS idx_cth_from_chapter ON public.chapter_transfer_history (from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_to_chapter ON public.chapter_transfer_history (to_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_effective_at ON public.chapter_transfer_history (effective_at);
CREATE INDEX IF NOT EXISTS idx_cth_related_transfer ON public.chapter_transfer_history (related_transfer_id);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements (created_by);

-- audits
CREATE INDEX IF NOT EXISTS idx_audits_actor_user_id ON public.audits (actor_user_id);

-- businesses
CREATE INDEX IF NOT EXISTS idx_businesses_chapter_id ON public.businesses (chapter_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses (city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_country_id ON public.businesses (country_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_member_id ON public.businesses (owner_member_id);
CREATE INDEX IF NOT EXISTS idx_businesses_state_id ON public.businesses (state_id);

-- chapter_transfers
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_approved_by ON public.chapter_transfers (approved_by);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_from_chapter_id ON public.chapter_transfers (from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_member_id ON public.chapter_transfers (member_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_to_chapter_id ON public.chapter_transfers (to_chapter_id);

-- chapters
CREATE INDEX IF NOT EXISTS idx_chapters_city_id ON public.chapters (city_id);
CREATE INDEX IF NOT EXISTS idx_chapters_country_id ON public.chapters (country_id);
CREATE INDEX IF NOT EXISTS idx_chapters_state_id ON public.chapters (state_id);

-- consents
CREATE INDEX IF NOT EXISTS idx_consents_member_id ON public.consents (member_id);

-- content_news
CREATE INDEX IF NOT EXISTS idx_content_news_chapter_id ON public.content_news (chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_news_city_id ON public.content_news (city_id);
CREATE INDEX IF NOT EXISTS idx_content_news_country_id ON public.content_news (country_id);
CREATE INDEX IF NOT EXISTS idx_content_news_created_by ON public.content_news (created_by);
CREATE INDEX IF NOT EXISTS idx_content_news_reviewed_by ON public.content_news (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_content_news_state_id ON public.content_news (state_id);
CREATE INDEX IF NOT EXISTS idx_content_news_pinned ON public.content_news (pinned);
CREATE INDEX IF NOT EXISTS idx_content_news_article_type ON public.content_news (article_type);

-- data_requests
CREATE INDEX IF NOT EXISTS idx_data_requests_member_id ON public.data_requests (member_id);

-- donations
CREATE INDEX IF NOT EXISTS idx_donations_fund_id ON public.donations (fund_id);

-- donor_wall
CREATE INDEX IF NOT EXISTS idx_donor_wall_member_id ON public.donor_wall (member_id);

-- education
CREATE INDEX IF NOT EXISTS idx_education_member_id ON public.education (member_id);

-- emergency_contacts
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_city_id ON public.emergency_contacts (city_id);

-- employment
CREATE INDEX IF NOT EXISTS idx_employment_member_id ON public.employment (member_id);

-- event_checkins
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins (event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_member_id ON public.event_checkins (member_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_scanned_by ON public.event_checkins (scanned_by);

-- event_photos
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos (event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by ON public.event_photos (uploaded_by);

-- event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON public.event_rsvps (member_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_chapter_id ON public.events (chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events (city_id);
CREATE INDEX IF NOT EXISTS idx_events_country_id ON public.events (country_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events (created_by);
CREATE INDEX IF NOT EXISTS idx_events_state_id ON public.events (state_id);

-- family_connections
CREATE INDEX IF NOT EXISTS idx_family_connections_related_member_id ON public.family_connections (related_member_id);

-- family_invitations
CREATE INDEX IF NOT EXISTS idx_family_invitations_accepted_by ON public.family_invitations (accepted_by_member_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_inviter ON public.family_invitations (inviter_member_id);

-- family_links
CREATE INDEX IF NOT EXISTS idx_family_links_family_id ON public.family_links (family_id);
CREATE INDEX IF NOT EXISTS idx_family_links_member_id ON public.family_links (member_id);
CREATE INDEX IF NOT EXISTS idx_family_links_related_member_id ON public.family_links (related_member_id);

-- funds
CREATE INDEX IF NOT EXISTS idx_funds_chapter_id ON public.funds (chapter_id);

-- hall_bookings
CREATE INDEX IF NOT EXISTS idx_hall_bookings_chapter_id ON public.hall_bookings (chapter_id);
CREATE INDEX IF NOT EXISTS idx_hall_bookings_member_id ON public.hall_bookings (member_id);

-- heritage_tags
CREATE INDEX IF NOT EXISTS idx_heritage_tags_tagged_by ON public.heritage_tags (tagged_by);

-- job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_member_id ON public.job_applications (member_id);

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_chapter_id ON public.jobs (chapter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs (city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_country_id ON public.jobs (country_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_business_id ON public.jobs (employer_business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_member_id ON public.jobs (employer_member_id);
CREATE INDEX IF NOT EXISTS idx_jobs_state_id ON public.jobs (state_id);

-- matrimonial_introductions (columns are from_member_id / to_member_id)
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_from ON public.matrimonial_introductions (from_member_id);
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_to ON public.matrimonial_introductions (to_member_id);

-- matrimonial_profiles
CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_guardian ON public.matrimonial_profiles (guardian_member_id);

-- media_files
CREATE INDEX IF NOT EXISTS idx_media_files_owner_user_id ON public.media_files (owner_user_id);

-- medical_aid_requests
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_chapter_id ON public.medical_aid_requests (chapter_id);
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_member_id ON public.medical_aid_requests (member_id);

-- member_contacts
CREATE INDEX IF NOT EXISTS idx_member_contacts_member_id ON public.member_contacts (member_id);

-- member_languages
CREATE INDEX IF NOT EXISTS idx_member_languages_member_id ON public.member_languages (member_id);

-- member_skills
CREATE INDEX IF NOT EXISTS idx_member_skills_member_id ON public.member_skills (member_id);

-- members
CREATE INDEX IF NOT EXISTS idx_members_chapter_id ON public.members (chapter_id);

-- mentorship_sessions
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentorship_id ON public.mentorship_sessions (mentorship_id);

-- mentorships
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_member_id ON public.mentorships (mentee_member_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_member_id ON public.mentorships (mentor_member_id);

-- oral_histories
CREATE INDEX IF NOT EXISTS idx_oral_histories_narrator_member_id ON public.oral_histories (narrator_member_id);
CREATE INDEX IF NOT EXISTS idx_oral_histories_uploaded_by ON public.oral_histories (uploaded_by);

-- photo_tags
CREATE INDEX IF NOT EXISTS idx_photo_tags_member_id ON public.photo_tags (member_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_by ON public.photo_tags (tagged_by);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_member_id ON public.reports (reporter_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports (reviewed_by);

-- role_assignments
CREATE INDEX IF NOT EXISTS idx_role_assignments_created_by ON public.role_assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_id ON public.role_assignments (role_id);

-- samiti_groups
CREATE INDEX IF NOT EXISTS idx_samiti_groups_contact_member_id ON public.samiti_groups (contact_member_id);

-- samiti_members
CREATE INDEX IF NOT EXISTS idx_samiti_members_member_id ON public.samiti_members (member_id);

-- scholarship_applications
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_member_id ON public.scholarship_applications (member_id);

-- scholarships
CREATE INDEX IF NOT EXISTS idx_scholarships_chapter_id ON public.scholarships (chapter_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_city_id ON public.scholarships (city_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_country_id ON public.scholarships (country_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_state_id ON public.scholarships (state_id);

-- tag_requests
CREATE INDEX IF NOT EXISTS idx_tag_requests_decided_by ON public.tag_requests (decided_by);
CREATE INDEX IF NOT EXISTS idx_tag_requests_requester_user_id ON public.tag_requests (requester_user_id);

-- verification_requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_member_id ON public.verification_requests (member_id);

-- vouches
CREATE INDEX IF NOT EXISTS idx_vouches_voucher_member_id ON public.vouches (voucher_member_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient_member_id ON public.whatsapp_messages (recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON public.whatsapp_messages (template_id);

-- council_replies
CREATE INDEX IF NOT EXISTS council_replies_thread_id_idx ON public.council_replies (thread_id);

-- council_threads
CREATE INDEX IF NOT EXISTS council_threads_author_id_idx ON public.council_threads (author_id);
CREATE INDEX IF NOT EXISTS council_threads_chapter_id_idx ON public.council_threads (chapter_id);
CREATE INDEX IF NOT EXISTS council_threads_created_at_idx ON public.council_threads (created_at);

-- council_votes
CREATE INDEX IF NOT EXISTS council_votes_thread_id_idx ON public.council_votes (thread_id);

-- rishta_requests
CREATE INDEX IF NOT EXISTS rishta_requests_from_profile_idx ON public.rishta_requests (from_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_to_profile_idx ON public.rishta_requests (to_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_status_idx ON public.rishta_requests (status);

-- obituaries (column is dod, not date_of_death)
CREATE INDEX IF NOT EXISTS idx_obituaries_chapter_id ON public.obituaries (chapter_id);
CREATE INDEX IF NOT EXISTS idx_obituaries_dod ON public.obituaries (dod);
CREATE INDEX IF NOT EXISTS idx_obituaries_posted_by ON public.obituaries (posted_by);
CREATE INDEX IF NOT EXISTS idx_obituaries_created_at ON public.obituaries (created_at);

-- sms_messages
CREATE INDEX IF NOT EXISTS sms_messages_recipient_idx ON public.sms_messages (recipient_member_id);
CREATE INDEX IF NOT EXISTS sms_messages_status_idx ON public.sms_messages (status);

-- vouch_requests
CREATE INDEX IF NOT EXISTS vouch_requests_requester_idx ON public.vouch_requests (requester_member_id);
CREATE INDEX IF NOT EXISTS vouch_requests_target_idx ON public.vouch_requests (target_member_id);
