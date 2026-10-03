/*
# Create Global Admin account: roshan@khadayataonline.com

## Purpose
Create a real Global Admin user account for site administration. This is
a legitimate production account, explicitly requested by the site owner.

## What this does
1. Creates an auth user with email roshan@khadayataonline.com
2. Creates a member profile linked to that auth user
3. Assigns the Global Admin role (fixed UUID a0100001-...001)

## Security
- Password is hashed via crypt()/blowfish (not stored in plaintext)
- Email confirmation is set to now (no confirmation email needed)
- The account is immediately functional
*/

-- 1. Create the auth user (guard with WHERE NOT EXISTS for idempotency)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, is_sso_user, is_anonymous, created_at, updated_at)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'roshan@khadayataonline.com',
  crypt('Gloscon21', gen_salt('bf')),
  now(),
  false,
  false,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'roshan@khadayataonline.com'
);

-- 2. Create the member profile
INSERT INTO members (id, user_id, first_name, last_name, verification_level, onboarding_completed, created_at)
SELECT
  gen_random_uuid(),
  au.id,
  'Roshan',
  'Shah',
  3,
  true,
  now()
FROM auth.users au
WHERE au.email = 'roshan@khadayataonline.com'
  AND NOT EXISTS (
    SELECT 1 FROM members m WHERE m.user_id = au.id
  );

-- 3. Assign Global Admin role
INSERT INTO role_assignments (member_id, role_id, start_date, created_at)
SELECT
  m.id,
  'a0100001-0001-0001-0001-000000000001',
  CURRENT_DATE,
  now()
FROM members m
JOIN auth.users au ON au.id = m.user_id
WHERE au.email = 'roshan@khadayataonline.com'
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.member_id = m.id
      AND ra.role_id = 'a0100001-0001-0001-0001-000000000001'
  );
