# Local Postgres Install Package

Full SQL dump to reproduce the Khadayata database on a localhost Postgres
(v15+) instance so you can debug and fix the invite-member flow locally.

## Files

| File | Purpose |
|------|---------|
| `00_prelude.sql` | Creates Supabase-compatible `auth`/`storage` schemas, `auth.users` table, `auth.uid()`, `auth.jwt()`, and required roles (`anon`, `authenticated`, `service_role`). Run this **first** on a fresh DB. |
| `01_schema.sql` | All 78 Supabase migrations concatenated in order. Creates every table, constraint, trigger, function, and RLS policy. Also contains the built-in seed data for roles, chapters, countries/states/cities, and 10 test users. |
| `02_auth_users.sql` | Snapshot of the live `auth.users` table (37 users). |
| `03_members_and_roles.sql` | Snapshot of live `public.members` and `public.role_assignments` (15 members, 2 role assignments). |

## Install

```bash
# 1. Create a fresh database
createdb khadayata_local

# 2. Load the prelude (Supabase auth stubs)
psql -d khadayata_local -f 00_prelude.sql

# 3. Apply all migrations (schema + built-in seed data)
psql -d khadayata_local -f 01_schema.sql

# 4. Apply live data snapshots
psql -d khadayata_local -f 02_auth_users.sql
psql -d khadayata_local -f 03_members_and_roles.sql
```

## Simulating an Authenticated User

In production, Supabase sets `request.jwt.claim.sub` per request from the JWT.
Locally, set it manually to test RLS policies as a specific user:

```sql
-- Become the Global Admin (who has permission to send invites)
SET LOCAL "request.jwt.claim.sub" = 'b0000001-cafe-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL role authenticated;

-- Now queries behave as if this user is signed in
SELECT auth.uid();              -- => b0000001-cafe-0000-0000-000000000001
SELECT * FROM members LIMIT 5;  -- RLS policies apply
```

## Debugging the Invite-Member Flow Locally

The invite flow lives in `supabase/functions/invite-member/index.ts`.
The key database operations it performs:

```sql
-- Step 1: Find caller's member row
SELECT id, first_name, last_name FROM members WHERE user_id = auth.uid();

-- Step 2: Check caller's roles
SELECT r.name FROM role_assignments ra
JOIN roles r ON r.id = ra.role_id
WHERE ra.member_id = <caller_member_id>
  AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE);

-- Step 3: Check if auth user already exists
SELECT id, email FROM auth.users WHERE lower(email) = 'rushik@alakmalak.com';

-- Step 4: If not exists, the edge function calls supabase.auth.admin.generateLink
-- which creates a row in auth.users AND fires the on_auth_user_created trigger,
-- which inserts a ('Pending','Verification') row into public.members.

-- Simulate that locally:
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'rushik@alakmalak.com');
-- The trigger handle_new_user() auto-creates the member row.

-- Verify:
SELECT m.id, m.first_name, m.last_name FROM members m
JOIN auth.users u ON u.id = m.user_id
WHERE u.email = 'rushik@alakmalak.com';
```

## Cleaning Up a Stuck Email

If invites for a specific email are failing, use these to fully clear it:

```sql
-- Delete any member row
DELETE FROM members
WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'rushik@alakmalak.com');

-- Delete auth user (CASCADE will also clean dependents)
DELETE FROM auth.users WHERE lower(email) = 'rushik@alakmalak.com';

-- Delete any identity rows (for SSO providers)
DELETE FROM auth.identities
WHERE lower(identity_data->>'email') = 'rushik@alakmalak.com'
   OR lower(email) = 'rushik@alakmalak.com';
```

## Notes

- The migrations use `gen_random_uuid()` which requires `pgcrypto` (installed by prelude).
- The live geography tables (countries/states/cities) are populated by migrations directly; no separate dump is needed.
- Roles table is fully seeded by migration `20260315194647_seed_roles_and_assignments.sql` and `20260406034645_add_committee_roles.sql`.
- Chapters are seeded by `20260315194424_seed_chapters.sql`.
- The edge function itself (`supabase/functions/invite-member/index.ts`) is Deno; it calls Supabase's auth admin API (not pure SQL), so to test the full invite flow you'll need `supabase start` + `supabase functions serve` against this DB, OR write a small script that mimics what the function does using the JS client.
