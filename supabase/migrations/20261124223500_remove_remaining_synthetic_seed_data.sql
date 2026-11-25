-- Production hygiene cleanup: remove any remaining synthetic test accounts
-- and demo/placeholder rows left behind by early 20260315/20260915 seed migrations.
-- Preserves roshan@khadayataonline.com and all real community members/content.
-- Idempotent: safe to run on production or any environment.

DO $$
DECLARE
  v_test_emails text[] := ARRAY[
    'global-admin@khadayataonline.com',
    'chapter-admin@khadayataonline.com',
    'data-steward@khadayataonline.com',
    'dir-manager@khadayataonline.com',
    'event-manager@khadayataonline.com',
    'finance-admin@khadayataonline.com',
    'publisher@khadayataonline.com',
    'moderator@khadayataonline.com',
    'member@khadayataonline.com',
    'unverified@khadayataonline.com',
    'seed1@test.local',
    'seed2@test.local',
    'seed3@test.local',
    'seed4@test.local',
    'seed5@test.local',
    'seed6@test.local',
    'seed7@test.local',
    'seed8@test.local',
    'seed9@test.local',
    'seed10@test.local'
  ];
  v_user_ids uuid[];
  v_member_ids uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_user_ids
    FROM auth.users
   WHERE email = ANY(v_test_emails);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_member_ids
    FROM public.members
   WHERE user_id = ANY(v_user_ids);

  -- Remove demo content owned by synthetic test members
  IF array_length(v_member_ids, 1) IS NOT NULL THEN
    DELETE FROM public.role_assignments WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.member_contacts WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.employment WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.education WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.member_skills WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.member_languages WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.matrimonial_profiles WHERE member_id = ANY(v_member_ids) OR guardian_member_id = ANY(v_member_ids);
    DELETE FROM public.mentorships WHERE mentor_member_id = ANY(v_member_ids) OR mentee_member_id = ANY(v_member_ids);
    DELETE FROM public.businesses WHERE owner_member_id = ANY(v_member_ids);
    DELETE FROM public.jobs WHERE employer_member_id = ANY(v_member_ids);
    DELETE FROM public.announcements WHERE created_by = ANY(v_member_ids);
    DELETE FROM public.event_photos WHERE uploaded_by = ANY(v_member_ids);
    DELETE FROM public.donations WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.hall_bookings WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.fundraising_campaigns WHERE created_by = ANY(v_member_ids);
    DELETE FROM public.heritage_tags WHERE tagged_by = ANY(v_member_ids);
    DELETE FROM public.photo_tags WHERE tagged_by = ANY(v_member_ids);
    DELETE FROM public.medical_aid_requests WHERE member_id = ANY(v_member_ids);
    DELETE FROM public.oral_histories WHERE narrator_member_id = ANY(v_member_ids) OR uploaded_by = ANY(v_member_ids);
    DELETE FROM public.whatsapp_messages WHERE recipient_member_id = ANY(v_member_ids);
    UPDATE public.family_invitations SET accepted_by_member_id = NULL WHERE accepted_by_member_id = ANY(v_member_ids);
    DELETE FROM public.members WHERE id = ANY(v_member_ids);
  END IF;

  -- Remove known demo business / synthetic magazine catalog placeholders (pdf_url IS NULL)
  DELETE FROM public.businesses WHERE website ILIKE '%khadayatatextiles.example.com%';
  DELETE FROM public.magazine_issues WHERE pdf_url IS NULL;

  -- Remove synthetic auth accounts and clear any remaining user_id FKs
  IF array_length(v_user_ids, 1) IS NOT NULL THEN
    DELETE FROM public.audits WHERE actor_user_id = ANY(v_user_ids);
    DELETE FROM public.announcements WHERE created_by = ANY(v_user_ids);
    DELETE FROM public.media_files WHERE owner_user_id = ANY(v_user_ids);
    DELETE FROM public.tag_requests WHERE requester_user_id = ANY(v_user_ids);
    UPDATE public.tag_requests SET decided_by = NULL WHERE decided_by = ANY(v_user_ids);
    UPDATE public.chapter_transfers SET approved_by = NULL WHERE approved_by = ANY(v_user_ids);
    UPDATE public.content_news SET created_by = NULL WHERE created_by = ANY(v_user_ids);
    UPDATE public.content_news SET reviewed_by = NULL WHERE reviewed_by = ANY(v_user_ids);
    UPDATE public.events SET created_by = NULL WHERE created_by = ANY(v_user_ids);
    UPDATE public.event_checkins SET scanned_by = NULL WHERE scanned_by = ANY(v_user_ids);
    UPDATE public.role_assignments SET created_by = NULL WHERE created_by = ANY(v_user_ids);
    DELETE FROM auth.identities WHERE user_id = ANY(v_user_ids);
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
  END IF;
END $$;
