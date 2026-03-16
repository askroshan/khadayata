
/*
  # Update Role-Based Members and Fix Role Assignments

  The auth trigger created blank member records for each new user.
  This migration:
  1. Updates those blank members with proper profile data
  2. Creates role assignments with correct created_by = auth.users.id
*/

-- -------------------------------------------------------
-- Update member profiles
-- -------------------------------------------------------
UPDATE members SET
  first_name = 'Rajesh', last_name = 'Khandelwal', gender = 'Male',
  dob = '1972-05-10', ekda = 'Visa',
  chapter_id = 'f1000001-0000-0000-0000-000000000001'::uuid,
  onboarding_completed = true, verification_level = 3,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000001-cafe-0000-0000-000000000001'::uuid;

UPDATE members SET
  first_name = 'Sunita', last_name = 'Sharma', gender = 'Female',
  dob = '1980-03-22', ekda = 'Maheshwari',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000002-cafe-0000-0000-000000000002'::uuid;

UPDATE members SET
  first_name = 'Priya', last_name = 'Agarwal', gender = 'Female',
  dob = '1985-11-15', ekda = 'Agrawala',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000003-cafe-0000-0000-000000000003'::uuid;

UPDATE members SET
  first_name = 'Suresh', last_name = 'Gupta', gender = 'Male',
  dob = '1978-07-04', ekda = 'Visa',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000004-cafe-0000-0000-000000000004'::uuid;

UPDATE members SET
  first_name = 'Deepak', last_name = 'Jain', gender = 'Male',
  dob = '1983-09-30', ekda = 'Visa',
  chapter_id = 'f1000003-0000-0000-0000-000000000003'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000005-cafe-0000-0000-000000000005'::uuid;

UPDATE members SET
  first_name = 'Anita', last_name = 'Bansal', gender = 'Female',
  dob = '1975-12-01', ekda = 'Maheshwari',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000006-cafe-0000-0000-000000000006'::uuid;

UPDATE members SET
  first_name = 'Vikram', last_name = 'Mehta', gender = 'Male',
  dob = '1990-02-14', ekda = 'Visa',
  chapter_id = 'f1000003-0000-0000-0000-000000000003'::uuid,
  onboarding_completed = true, verification_level = 1,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000007-cafe-0000-0000-000000000007'::uuid;

UPDATE members SET
  first_name = 'Pooja', last_name = 'Verma', gender = 'Female',
  dob = '1988-06-20', ekda = 'Agrawala',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 1,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000008-cafe-0000-0000-000000000008'::uuid;

UPDATE members SET
  first_name = 'Amit', last_name = 'Patel', gender = 'Male',
  dob = '1995-04-08', ekda = 'Visa',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 1,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000009-cafe-0000-0000-000000000009'::uuid;

UPDATE members SET
  first_name = 'Ritu', last_name = 'Singh', gender = 'Female',
  dob = '1998-08-25', ekda = 'Maheshwari',
  chapter_id = NULL,
  onboarding_completed = false, verification_level = 0,
  privacy = '{}'::jsonb
WHERE user_id = 'b0000010-cafe-0000-0000-000000000010'::uuid;

-- -------------------------------------------------------
-- Role assignments: created_by = auth user id
-- -------------------------------------------------------
INSERT INTO role_assignments (id, role_id, member_id, start_date, end_date, created_by)
SELECT
  gen_random_uuid(),
  r.role_id::uuid,
  m.id,
  CURRENT_DATE,
  NULL,
  r.auth_user_id::uuid
FROM (VALUES
  ('b0000001-cafe-0000-0000-000000000001', 'a0100001-0001-0001-0001-000000000001', 'b0000001-cafe-0000-0000-000000000001'),
  ('b0000002-cafe-0000-0000-000000000002', 'a0100010-0010-0010-0010-000000000010', 'b0000002-cafe-0000-0000-000000000002'),
  ('b0000003-cafe-0000-0000-000000000003', 'a0100002-0002-0002-0002-000000000002', 'b0000003-cafe-0000-0000-000000000003'),
  ('b0000004-cafe-0000-0000-000000000004', 'a0100003-0003-0003-0003-000000000003', 'b0000004-cafe-0000-0000-000000000004'),
  ('b0000005-cafe-0000-0000-000000000005', 'a0100004-0004-0004-0004-000000000004', 'b0000005-cafe-0000-0000-000000000005'),
  ('b0000006-cafe-0000-0000-000000000006', 'a0100005-0005-0005-0005-000000000005', 'b0000006-cafe-0000-0000-000000000006'),
  ('b0000007-cafe-0000-0000-000000000007', 'a0100006-0006-0006-0006-000000000006', 'b0000007-cafe-0000-0000-000000000007'),
  ('b0000008-cafe-0000-0000-000000000008', 'a0100007-0007-0007-0007-000000000007', 'b0000008-cafe-0000-0000-000000000008')
) AS r(user_id_str, role_id, auth_user_id)
JOIN members m ON m.user_id = r.user_id_str::uuid
ON CONFLICT DO NOTHING;
