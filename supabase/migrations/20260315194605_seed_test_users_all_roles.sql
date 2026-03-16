
/*
  # Seed Test Users for All Roles

  Creates auth users and member profiles for every role in the system.

  New users (password: TestPass123!):
  - global-admin@test.khandelwal.org  → Global Admin
  - chapter-admin@test.khandelwal.org → Chapter Admin (Ahmedabad)
  - data-steward@test.khandelwal.org  → Data Steward
  - dir-manager@test.khandelwal.org   → Directory Manager
  - event-manager@test.khandelwal.org → Event Manager
  - finance-admin@test.khandelwal.org → Finance Admin
  - publisher@test.khandelwal.org     → Global Publisher
  - moderator@test.khandelwal.org     → Moderator
  - member@test.khandelwal.org        → Regular member (no role)
  - unverified@test.khandelwal.org    → Unverified / incomplete onboarding

  Existing seed users (seed1–10) are assigned to Ahmedabad chapter.
*/

-- -------------------------------------------------------
-- New Auth Users (all roles)
-- -------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES
  (
    'b0000001-cafe-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'global-admin@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000002-cafe-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'chapter-admin@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000003-cafe-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'data-steward@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000004-cafe-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'dir-manager@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000005-cafe-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'event-manager@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000006-cafe-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'finance-admin@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000007-cafe-0000-0000-000000000007'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'publisher@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000008-cafe-0000-0000-000000000008'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'moderator@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000009-cafe-0000-0000-000000000009'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'member@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000010-cafe-0000-0000-000000000010'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'unverified@test.khandelwal.org',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- Insert identities for new users
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b0000001-cafe-0000-0000-000000000001'::uuid, '{"sub":"b0000001-cafe-0000-0000-000000000001","email":"global-admin@test.khandelwal.org"}'::jsonb, 'email', 'global-admin@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000002-cafe-0000-0000-000000000002'::uuid, '{"sub":"b0000002-cafe-0000-0000-000000000002","email":"chapter-admin@test.khandelwal.org"}'::jsonb, 'email', 'chapter-admin@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000003-cafe-0000-0000-000000000003'::uuid, '{"sub":"b0000003-cafe-0000-0000-000000000003","email":"data-steward@test.khandelwal.org"}'::jsonb, 'email', 'data-steward@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000004-cafe-0000-0000-000000000004'::uuid, '{"sub":"b0000004-cafe-0000-0000-000000000004","email":"dir-manager@test.khandelwal.org"}'::jsonb, 'email', 'dir-manager@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000005-cafe-0000-0000-000000000005'::uuid, '{"sub":"b0000005-cafe-0000-0000-000000000005","email":"event-manager@test.khandelwal.org"}'::jsonb, 'email', 'event-manager@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000006-cafe-0000-0000-000000000006'::uuid, '{"sub":"b0000006-cafe-0000-0000-000000000006","email":"finance-admin@test.khandelwal.org"}'::jsonb, 'email', 'finance-admin@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000007-cafe-0000-0000-000000000007'::uuid, '{"sub":"b0000007-cafe-0000-0000-000000000007","email":"publisher@test.khandelwal.org"}'::jsonb, 'email', 'publisher@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000008-cafe-0000-0000-000000000008'::uuid, '{"sub":"b0000008-cafe-0000-0000-000000000008","email":"moderator@test.khandelwal.org"}'::jsonb, 'email', 'moderator@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000009-cafe-0000-0000-000000000009'::uuid, '{"sub":"b0000009-cafe-0000-0000-000000000009","email":"member@test.khandelwal.org"}'::jsonb, 'email', 'member@test.khandelwal.org', now(), now(), now()),
  (gen_random_uuid(), 'b0000010-cafe-0000-0000-000000000010'::uuid, '{"sub":"b0000010-cafe-0000-0000-000000000010","email":"unverified@test.khandelwal.org"}'::jsonb, 'email', 'unverified@test.khandelwal.org', now(), now(), now())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- -------------------------------------------------------
-- Member profiles for new role-based users
-- -------------------------------------------------------
INSERT INTO members (
  id, user_id, first_name, last_name, gender, dob, ekda,
  chapter_id, onboarding_completed, verification_level,
  privacy
) VALUES
  (
    gen_random_uuid(),
    'b0000001-cafe-0000-0000-000000000001'::uuid,
    'Rajesh', 'Khandelwal', 'Male', '1972-05-10', 'Visa',
    'f1000001-0000-0000-0000-000000000001'::uuid,
    true, 3,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000002-cafe-0000-0000-000000000002'::uuid,
    'Sunita', 'Sharma', 'Female', '1980-03-22', 'Maheshwari',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000003-cafe-0000-0000-000000000003'::uuid,
    'Priya', 'Agarwal', 'Female', '1985-11-15', 'Agrawala',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000004-cafe-0000-0000-000000000004'::uuid,
    'Suresh', 'Gupta', 'Male', '1978-07-04', 'Visa',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000005-cafe-0000-0000-000000000005'::uuid,
    'Deepak', 'Jain', 'Male', '1983-09-30', 'Visa',
    'f1000003-0000-0000-0000-000000000003'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000006-cafe-0000-0000-000000000006'::uuid,
    'Anita', 'Bansal', 'Female', '1975-12-01', 'Maheshwari',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000007-cafe-0000-0000-000000000007'::uuid,
    'Vikram', 'Mehta', 'Male', '1990-02-14', 'Visa',
    'f1000003-0000-0000-0000-000000000003'::uuid,
    true, 1,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000008-cafe-0000-0000-000000000008'::uuid,
    'Pooja', 'Verma', 'Female', '1988-06-20', 'Agrawala',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 1,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000009-cafe-0000-0000-000000000009'::uuid,
    'Amit', 'Patel', 'Male', '1995-04-08', 'Visa',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 1,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000010-cafe-0000-0000-000000000010'::uuid,
    'Ritu', 'Singh', 'Female', '1998-08-25', 'Maheshwari',
    NULL,
    false, 0,
    '{}'::jsonb
  )
ON CONFLICT (user_id) DO NOTHING;

-- -------------------------------------------------------
-- Assign Ahmedabad chapter to existing seed users
-- -------------------------------------------------------
UPDATE members SET
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid
WHERE user_id IN (
  'a1000001-0000-0000-0000-000000000001'::uuid,
  'a1000001-0000-0000-0000-000000000002'::uuid,
  'a1000001-0000-0000-0000-000000000003'::uuid,
  'a1000001-0000-0000-0000-000000000004'::uuid,
  'a1000001-0000-0000-0000-000000000005'::uuid,
  'a1000001-0000-0000-0000-000000000006'::uuid,
  'a1000001-0000-0000-0000-000000000007'::uuid,
  'a1000001-0000-0000-0000-000000000008'::uuid,
  'a1000001-0000-0000-0000-000000000009'::uuid,
  'a1000001-0000-0000-0000-000000000010'::uuid
);
