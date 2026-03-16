
/*
  # Seed Roles and Role Assignments

  Creates all 9 platform roles (global + chapter-scoped) and assigns them
  to the appropriate test users.

  Global roles (chapter_id = NULL):
    Global Admin, Data Steward, Directory Manager, Event Manager,
    Finance Admin, Global Publisher, Moderator

  Chapter-scoped roles:
    Chapter Admin, Publisher (per chapter)

  Role assignments map each role-specific test user to their role.
*/

-- -------------------------------------------------------
-- Global Roles
-- -------------------------------------------------------
INSERT INTO roles (id, chapter_id, name, scope) VALUES
  ('a0100001-0001-0001-0001-000000000001'::uuid, NULL, 'Global Admin',      'global'),
  ('a0100002-0002-0002-0002-000000000002'::uuid, NULL, 'Data Steward',      'global'),
  ('a0100003-0003-0003-0003-000000000003'::uuid, NULL, 'Directory Manager', 'global'),
  ('a0100004-0004-0004-0004-000000000004'::uuid, NULL, 'Event Manager',     'global'),
  ('a0100005-0005-0005-0005-000000000005'::uuid, NULL, 'Finance Admin',     'global'),
  ('a0100006-0006-0006-0006-000000000006'::uuid, NULL, 'Global Publisher',  'global'),
  ('a0100007-0007-0007-0007-000000000007'::uuid, NULL, 'Moderator',         'global')
ON CONFLICT (chapter_id, name) DO NOTHING;

-- Chapter-scoped roles for Ahmedabad
INSERT INTO roles (id, chapter_id, name, scope) VALUES
  ('a0100010-0010-0010-0010-000000000010'::uuid, 'f1000002-0000-0000-0000-000000000002'::uuid, 'Chapter Admin', 'chapter'),
  ('a0100011-0011-0011-0011-000000000011'::uuid, 'f1000002-0000-0000-0000-000000000002'::uuid, 'Publisher',     'chapter')
ON CONFLICT (chapter_id, name) DO NOTHING;

-- Chapter-scoped roles for Mumbai
INSERT INTO roles (id, chapter_id, name, scope) VALUES
  ('a0100012-0012-0012-0012-000000000012'::uuid, 'f1000003-0000-0000-0000-000000000003'::uuid, 'Chapter Admin', 'chapter'),
  ('a0100013-0013-0013-0013-000000000013'::uuid, 'f1000003-0000-0000-0000-000000000003'::uuid, 'Publisher',     'chapter')
ON CONFLICT (chapter_id, name) DO NOTHING;

-- -------------------------------------------------------
-- Role Assignments via subquery on members.user_id
-- -------------------------------------------------------
INSERT INTO role_assignments (id, role_id, member_id, start_date, end_date, created_by)
SELECT
  gen_random_uuid(),
  r.role_id::uuid,
  m.id,
  CURRENT_DATE,
  NULL,
  m.id
FROM (VALUES
  ('b0000001-f00d-0000-0000-000000000001', 'a0100001-0001-0001-0001-000000000001'),
  ('b0000002-f00d-0000-0000-000000000002', 'a0100010-0010-0010-0010-000000000010'),
  ('b0000003-f00d-0000-0000-000000000003', 'a0100002-0002-0002-0002-000000000002'),
  ('b0000004-f00d-0000-0000-000000000004', 'a0100003-0003-0003-0003-000000000003'),
  ('b0000005-f00d-0000-0000-000000000005', 'a0100004-0004-0004-0004-000000000004'),
  ('b0000006-f00d-0000-0000-000000000006', 'a0100005-0005-0005-0005-000000000005'),
  ('b0000007-f00d-0000-0000-000000000007', 'a0100006-0006-0006-0006-000000000006'),
  ('b0000008-f00d-0000-0000-000000000008', 'a0100007-0007-0007-0007-000000000007')
) AS r(user_id_str, role_id)
JOIN members m ON m.user_id = r.user_id_str::uuid
ON CONFLICT DO NOTHING;
