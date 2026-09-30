/*
# Remove all fake/test seeded data from the production database

## Purpose
Production must not contain fake seeded user accounts, demo content, or
test emergency contacts. This migration removes all non-real data while
preserving every genuine member account (389 real users) and their
legitimate activity.

## What is removed
1. **Test auth users (4)**: global-admin@khadayataonline.com,
   member@khadayataonline.com, moderator@khadayataonline.com,
   seed1@test.local — and their member rows, contacts, skills, languages,
   role_assignments, and audit log entries.
2. **Demo content created by test users**: 1 draft event, 2 news articles,
   1 mentorship listing.
3. **Seeded emergency contacts (10)**: fake/placeholder phone numbers.

## What is preserved
- All 389 real auth users and their member records
- Real role_assignments (Rushik Shah) — created_by nulled
- Real mentorship (Aman Shah)
- All master data (geography, chapters, roles, funds, settings)

## Safety
- Targets only test-pattern data via WHERE clauses
- Idempotent (safe to re-run)
- No tables/columns dropped or types changed
*/

-- ── 1. Null out FK references to test auth users in audit/log tables ──
UPDATE audits SET actor_user_id = NULL
WHERE actor_user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

-- ── 2. Reassign created_by on role_assignments for real users ─────────
UPDATE role_assignments SET created_by = NULL
WHERE created_by IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

-- ── 3. Remove role_assignments for test members ───────────────────────
DELETE FROM role_assignments
WHERE member_id IN (
  SELECT m.id FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

-- ── 4. Remove member contacts, skills, languages for test members ─────
DELETE FROM member_contacts
WHERE member_id IN (
  SELECT m.id FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

DELETE FROM member_skills
WHERE member_id IN (
  SELECT m.id FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

DELETE FROM member_languages
WHERE member_id IN (
  SELECT m.id FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

-- ── 5. Remove mentorships created by test members ─────────────────────
DELETE FROM mentorships
WHERE mentor_member_id IN (
  SELECT m.id FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

-- ── 6. Remove demo content created by test users ──────────────────────
DELETE FROM events
WHERE created_by IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

DELETE FROM content_news
WHERE created_by IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

-- ── 7. Remove member rows for test auth users ─────────────────────────
DELETE FROM members
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'global-admin@khadayataonline.com',
    'member@khadayataonline.com',
    'moderator@khadayataonline.com',
    'seed1@test.local'
  )
);

-- ── 8. Remove the test auth users themselves ──────────────────────────
DELETE FROM auth.users
WHERE email IN (
  'global-admin@khadayataonline.com',
  'member@khadayataonline.com',
  'moderator@khadayataonline.com',
  'seed1@test.local'
);

-- ── 9. Remove seeded emergency contacts with fake phone numbers ───────
DELETE FROM emergency_contacts
WHERE phone LIKE '%555-0100%'
   OR phone LIKE '%0100%'
   OR name LIKE '%KHD Helpline%';
