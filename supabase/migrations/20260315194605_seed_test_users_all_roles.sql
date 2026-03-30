
/*
  # Seed Test Users for All Roles

  Creates auth users and member profiles for every role in the system.

  New users (password: TestPass123!):
  - global-admin@khadayataonline.com  → Global Admin
  - chapter-admin@khadayataonline.com → Chapter Admin (Ahmedabad)
  - data-steward@khadayataonline.com  → Data Steward
  - dir-manager@khadayataonline.com   → Directory Manager
  - event-manager@khadayataonline.com → Event Manager
  - finance-admin@khadayataonline.com → Finance Admin
  - publisher@khadayataonline.com     → Global Publisher
  - moderator@khadayataonline.com     → Moderator
  - member@khadayataonline.com        → Regular member (no role)
  - unverified@khadayataonline.com    → Unverified / incomplete onboarding

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
    'global-admin@khadayataonline.com',
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
    'chapter-admin@khadayataonline.com',
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
    'data-steward@khadayataonline.com',
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
    'dir-manager@khadayataonline.com',
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
    'event-manager@khadayataonline.com',
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
    'finance-admin@khadayataonline.com',
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
    'publisher@khadayataonline.com',
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
    'moderator@khadayataonline.com',
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
    'member@khadayataonline.com',
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
    'unverified@khadayataonline.com',
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
  (gen_random_uuid(), 'b0000001-cafe-0000-0000-000000000001'::uuid, '{"sub":"b0000001-cafe-0000-0000-000000000001","email":"global-admin@khadayataonline.com"}'::jsonb, 'email', 'global-admin@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000002-cafe-0000-0000-000000000002'::uuid, '{"sub":"b0000002-cafe-0000-0000-000000000002","email":"chapter-admin@khadayataonline.com"}'::jsonb, 'email', 'chapter-admin@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000003-cafe-0000-0000-000000000003'::uuid, '{"sub":"b0000003-cafe-0000-0000-000000000003","email":"data-steward@khadayataonline.com"}'::jsonb, 'email', 'data-steward@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000004-cafe-0000-0000-000000000004'::uuid, '{"sub":"b0000004-cafe-0000-0000-000000000004","email":"dir-manager@khadayataonline.com"}'::jsonb, 'email', 'dir-manager@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000005-cafe-0000-0000-000000000005'::uuid, '{"sub":"b0000005-cafe-0000-0000-000000000005","email":"event-manager@khadayataonline.com"}'::jsonb, 'email', 'event-manager@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000006-cafe-0000-0000-000000000006'::uuid, '{"sub":"b0000006-cafe-0000-0000-000000000006","email":"finance-admin@khadayataonline.com"}'::jsonb, 'email', 'finance-admin@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000007-cafe-0000-0000-000000000007'::uuid, '{"sub":"b0000007-cafe-0000-0000-000000000007","email":"publisher@khadayataonline.com"}'::jsonb, 'email', 'publisher@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000008-cafe-0000-0000-000000000008'::uuid, '{"sub":"b0000008-cafe-0000-0000-000000000008","email":"moderator@khadayataonline.com"}'::jsonb, 'email', 'moderator@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000009-cafe-0000-0000-000000000009'::uuid, '{"sub":"b0000009-cafe-0000-0000-000000000009","email":"member@khadayataonline.com"}'::jsonb, 'email', 'member@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000010-cafe-0000-0000-000000000010'::uuid, '{"sub":"b0000010-cafe-0000-0000-000000000010","email":"unverified@khadayataonline.com"}'::jsonb, 'email', 'unverified@khadayataonline.com', now(), now(), now())
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
