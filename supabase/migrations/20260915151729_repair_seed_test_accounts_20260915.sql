-- ============================================================
-- Repair seeded test accounts (docs/test-data.md contract)
-- ============================================================
-- The 2026-03-15 seed created 10 role accounts + 10 seed accounts, but on this
-- environment only 3 member rows survived. docs/test-data.md promises each
-- account has a member profile and the documented roles.
--
-- Idempotent: creates missing member rows, assigns documented roles, resets the
-- shared admin password to the documented TestPass123!.
-- ============================================================

-- 1. Reset the shared Global Admin account password to the documented value.
UPDATE auth.users
SET encrypted_password = crypt('TestPass123!', gen_salt('bf'))
WHERE email = 'global-admin@khadayataonline.com'
  AND encrypted_password <> crypt('TestPass123!', encrypted_password);

-- 2. Create missing member rows for role accounts (matches 20260315194605 seed).
INSERT INTO members (user_id, first_name, last_name, gender, dob, ekda, chapter_id, onboarding_completed, verification_level, privacy)
SELECT u.id, v.first_name, v.last_name, v.gender, v.dob::date, v.ekda, v.chapter_id, v.onboarding_completed, v.verification_level, '{}'::jsonb
FROM (VALUES
  ('global-admin@khadayataonline.com', 'Rajesh', 'Khandelwal', 'Male', '1972-05-10', 'Visa', 'f1000001-0000-0000-0000-000000000001'::uuid, true, 3),
  ('chapter-admin@khadayataonline.com', 'Sunita', 'Sharma', 'Female', '1980-03-22', 'Maheshwari', 'f1000002-0000-0000-0000-000000000002'::uuid, true, 2),
  ('data-steward@khadayataonline.com', 'Priya', 'Agarwal', 'Female', '1985-11-15', 'Agrawala', 'f1000002-0000-0000-0000-000000000002'::uuid, true, 2),
  ('dir-manager@khadayataonline.com', 'Suresh', 'Gupta', 'Male', '1978-07-04', 'Visa', 'f1000002-0000-0000-0000-000000000002'::uuid, true, 2),
  ('event-manager@khadayataonline.com', 'Deepak', 'Jain', 'Male', '1983-09-30', 'Visa', 'f1000003-0000-0000-0000-000000000003'::uuid, true, 2),
  ('finance-admin@khadayataonline.com', 'Anita', 'Bansal', 'Female', '1975-12-01', 'Maheshwari', 'f1000002-0000-0000-0000-000000000002'::uuid, true, 2),
  ('publisher@khadayataonline.com', 'Vikram', 'Mehta', 'Male', '1990-02-14', 'Visa', 'f1000003-0000-0000-0000-000000000003'::uuid, true, 1),
  ('moderator@khadayataonline.com', 'Pooja', 'Verma', 'Female', '1988-06-20', 'Agrawala', 'f1000002-0000-0000-0000-000000000002'::uuid, true, 1),
  ('member@khadayataonline.com', 'Amit', 'Patel', 'Male', '1995-04-08', 'Visa', 'f1000002-0000-0000-0000-000000000002'::uuid, true, 1),
  ('unverified@khadayataonline.com', 'Ritu', 'Singh', 'Female', '1998-08-25', 'Maheshwari', NULL, false, 0)
) AS v(email, first_name, last_name, gender, dob, ekda, chapter_id, onboarding_completed, verification_level)
JOIN auth.users u ON u.email = v.email
WHERE NOT EXISTS (
  SELECT 1 FROM members m WHERE m.user_id = u.id
);

-- 3. Assign the documented roles (idempotent).
INSERT INTO role_assignments (member_id, role_id, start_date)
SELECT m.id, r.id, CURRENT_DATE
FROM (VALUES
  ('global-admin@khadayataonline.com', 'Global Admin'),
  ('chapter-admin@khadayataonline.com', 'Chapter Admin'),
  ('data-steward@khadayataonline.com', 'Data Steward'),
  ('dir-manager@khadayataonline.com', 'Directory Manager'),
  ('event-manager@khadayataonline.com', 'Event Manager'),
  ('finance-admin@khadayataonline.com', 'Finance Admin'),
  ('publisher@khadayataonline.com', 'Global Publisher'),
  ('moderator@khadayataonline.com', 'Moderator')
) AS v(email, role_name)
JOIN auth.users u ON u.email = v.email
JOIN members m ON m.user_id = u.id
JOIN roles r ON r.name = v.role_name
WHERE NOT EXISTS (
  SELECT 1 FROM role_assignments ra
  WHERE ra.member_id = m.id AND ra.role_id = r.id
    AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
);

-- Chapter Admin is chapter-scoped: bind it to Ahmedabad.
UPDATE role_assignments ra
SET chapter_id = (SELECT id FROM chapters WHERE slug = 'ahmedabad')
FROM roles r
WHERE ra.role_id = r.id
  AND r.name = 'Chapter Admin'
  AND ra.chapter_id IS NULL
  AND ra.member_id IN (
    SELECT m.id FROM members m JOIN auth.users u ON u.id = m.user_id
    WHERE u.email = 'chapter-admin@khadayataonline.com'
  );

-- 4. Seed accounts 1-10 are Ahmedabad members; restore missing member rows.
INSERT INTO members (user_id, first_name, last_name, gender, dob, chapter_id, onboarding_completed, verification_level, privacy)
SELECT u.id, v.first_name, v.last_name, v.gender, v.dob::date,
       (SELECT id FROM chapters WHERE slug = 'ahmedabad'), true, 1, '{}'::jsonb
FROM (VALUES
  ('seed1@test.local',  'Priya', 'Shah',    'Female', '1997-03-15'),
  ('seed2@test.local',  'Karan', 'Mehta',   'Male',   '1995-08-22'),
  ('seed3@test.local',  'Nisha', 'Patel',   'Female', '1998-12-05'),
  ('seed4@test.local',  'Vivek', 'Joshi',   'Male',   '1993-06-18'),
  ('seed5@test.local',  'Anjali','Desai',   'Female', '1996-01-30'),
  ('seed6@test.local',  'Rohan', 'Thakkar', 'Male',   '1994-11-10'),
  ('seed7@test.local',  'Meera', 'Kothari', 'Female', '1999-07-25'),
  ('seed8@test.local',  'Arjun', 'Bhatt',   'Male',   '1992-04-03'),
  ('seed9@test.local',  'Kavita','Sanghvi', 'Female', '1997-09-12'),
  ('seed10@test.local', 'Dhruv', 'Parikh',  'Male',   '1996-02-28')
) AS v(email, first_name, last_name, gender, dob)
JOIN auth.users u ON u.email = v.email
WHERE NOT EXISTS (
  SELECT 1 FROM members m WHERE m.user_id = u.id
);