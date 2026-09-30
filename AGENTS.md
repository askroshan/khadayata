# AGENTS.md — KhadayataOnline Build Rules

Working rules for any AI agent or developer contributing to this repository.
The product is a membership platform for the worldwide Khadayata community:
chapters, events, directory, matrimonial, finance, heritage, and role-gated
administration. Non-negotiable priorities, in order: **data safety, role
authorization correctness, then features**.

---

## 1. Source of truth documents

Read these before working in an area — they define intended behavior:

| Document | Scope |
|---|---|
| `USER_STORIES.md` | Admin panel acceptance criteria (US-001…) |
| `todo-*.md` (one per role) | What each role must be able to do |
| `POV_*.md` | Verification flows, bulk invites, chapter navigation, notifications |
| `docs/dbschema.md` | Database schema reference |
| `docs/seed-data.md` | Master/taxonomy data and test accounts |
| `docs/migration.md`, `docs/api.md` | Migration and API conventions |

If code and a source document disagree, flag the discrepancy to the user
before changing either side.

## 2. Roles and authorization model

Ten roles: Global Admin, Chapter Admin, Data Steward, Directory Manager,
Event Manager, Finance Admin, Global Publisher, Publisher, Moderator,
regular member (plus unverified members).

- Frontend role state: `src/hooks/useRoles.ts`; permission map:
  `usePermissions()`; tab access: `canAccessTab()` in `src/lib/admin-utils.ts`.
- **Every UI gate must have a matching server-side enforcement.** UI hiding is
  UX, not security. For any mutation, name the RLS policy or SECURITY DEFINER
  check that blocks an unauthorized caller, or do not ship the feature.
- Privilege columns (verification levels, verified/suspended/blocked flags,
  content status) are protected by BEFORE triggers
  (`add_privileged_column_guards_20260915.sql`). If you add a new privilege
  column to any table, add it to the relevant guard trigger in the same
  migration that adds the column.
- Chapter-scoped roles: a Chapter Admin's powers must be limited to their own
  chapter at the **database** layer. New policies must include the chapter
  predicate, not rely on UI filtering.

## 3. Database (Supabase)

- Schema changes only through versioned migrations in
  `supabase/migrations/` (apply via the Supabase MCP tools, never the CLI).
- Every table: RLS enabled, four separate policies (SELECT/INSERT/UPDATE/DELETE),
  scoped `TO authenticated` unless genuinely public.
- Never DROP/DELETE columns, rename tables, or change column types destructively.
- `has_role(uuid, text)` is the canonical role check. New SECURITY DEFINER
  functions must: set `search_path`, include an internal authorization check,
  and REVOKE EXECUTE from PUBLIC/anon (Postgres grants EXECUTE to PUBLIC by
  default — revoking only `anon` is not enough, see migration
  `audit_fixes_revoke_public_execute_20260915.sql`).
- Taxonomy tables (`countries`, `states`, `cities`, `chapters`, `roles`,
  `funds`) are master data. Seeding changes go in migrations, are idempotent
  (`WHERE NOT EXISTS`), and must keep `chapters.country_id/state_id/city_id`
  complete — location filters and chapter pages depend on it.

## 4. Edge functions

- Directory: `supabase/functions/<slug>/index.ts`; every function must have a
  `[functions.<slug>]` table in `supabase/config.toml` with `verify_jwt` set
  (`false` only for genuinely public: password-reset, sitemap).
- Every response, including OPTIONS preflight and error paths, must include
  the standard CORS headers (see existing functions).
- Functions holding service-role power (send-email, delete-user, invite-*)
  must validate the caller's JWT/role server-side before acting.

### Email templates (supabase/functions/send-email/templates.ts)

- All email HTML is built in `templates.ts`, which is intentionally Deno-free
  so the Vitest suite (`src/test/email-templates.test.ts`) can import it
  directly. Never add `Deno.*`, `fetch`, or env reads to that file.
- Escaping model: paragraph/alert helpers escape every string they receive;
  trusted template markup (`<strong>`, `<br/>`, our own links) may only enter
  through `{ raw: ... }` segments, and raw segments must never contain
  interpolated variables. Build dynamic values as
  `["text ", vars.x, " more"]` — never by concatenating a variable into a raw
  segment.
- Adding/renaming a template: update the `EmailTemplate` union, add the slug
  to `ALL_TEMPLATES` in `src/test/email-templates.test.ts`, and give the
  template a recipient greeting (`Hi <name>`) unless genuinely inapplicable
  (e.g. obituary notices use "Dear <name>").
- Recipient greeting names must go through `pickInviteeName` (member row
  first, auth `user_metadata` fallback, stub names never shown). Do not
  hand-roll "Pending Verification" checks — that is how the
  emails-greeted-everyone-"Member" bug happened.
- Regression suite `src/test/email-templates.test.ts` must stay green: it
  asserts no escaped-own-markup, no double-escaped entities, hostile
  variables stay escaped, and every template greets the recipient.

## 5. Testing (TDD)

- Tests live in `src/test/` (Vitest). Run: `npx vitest run`.
- **Red → green**: for every bug fix, first add a failing test that reproduces
  the bug, then fix, then re-run. For every new feature, write the acceptance
  test before the implementation.
- Existing suites to keep green: authorization, role-assignment, admin
  navigation, navigation-integrity, rls-invariants, chapter-nav-utils,
  file-validation, bulk-invite, family-invitations, notification-utils,
  role-tab-matrix, permissions-matrix, route-guards.
- `navigation-integrity.test.ts` statically asserts every internal link target
  resolves to a route in `App.tsx`. When adding a route, add it to
  `ROUTE_PATTERNS` in that test in the same change.
- `rls-invariants.test.ts` runs against the live database; it must pass after
  any migration. If a migration intentionally changes an invariant, update the
  test in the same PR with a justification note.
- `role-tab-matrix.test.ts` asserts every role x tab access combination. When
  adding a new admin tab or changing a role's tab access, update
  `EXPECTED_ACCESS` in that test in the same change.
- `permissions-matrix.test.ts` asserts every permission x role combination for
  `usePermissions()`. When adding a permission, update `EXPECTED` in that test.
- `route-guards.test.ts` asserts every route has the correct auth guard. When
  adding a route, add it to the `ROUTES` array with the correct category.
- **Never re-implement authorization logic in tests.** Always import
  `canEditMember`, `canAccessTab`, `getAdminShortcuts` from
  `@/lib/admin-utils`. Parallel implementations drift and hide real bugs.

## 6. Frontend conventions

- React + TypeScript + Vite; shadcn/ui components in `src/components/ui/`;
  Tailwind tokens only (no raw hex in pages); `PublicLayout` for public pages,
  `AppLayout`/`ChapterLayout` for signed-in pages; every page sets `SEOMeta`.
- Routes: public listing and role-gated management are separate paths
  (e.g. `/events` vs `/events/manage`). Do not stack unrelated edit states on
  one screen; use dialogs/drawers for secondary actions.
- No emojis in UI copy or agent responses. Plain-language summaries for the
  user; code comments only for non-obvious constraints.

## 7. Workflow for any change

1. Locate the governing user story / role doc; restate the acceptance
   criteria.
2. Write the failing test (red).
3. Implement the smallest correct change (green), matching neighboring code
   style.
4. If the change touches the DB, run the security advisors afterward and fix
   new findings in the same change.
5. `npm run build` + full `npx vitest run` must pass before finishing.
6. Report honestly: what was verified, what could not be verified, and any
   remaining risk. Never mark failing checks as green.

## 8. Agent harness notes

- Playwright/browser automation is not available in the build sandbox;
  end-to-end click-path checks are done statically (the navigation-integrity
  suite) plus live-DB behavior tests. When a browser environment is available,
  add Playwright specs under `e2e/` mirroring the role matrices in
  `todo-*.md` (login per role → per-tab access → mutation attempt → expect
  success/failure).
- The Supabase MCP connection runs as a superuser: `SET ROLE`/RLS simulation
  through it is NOT reliable for verifying policies. Verify RLS behaviorally
  via the anon/authenticated REST clients (as `rls-invariants.test.ts` does),
  and verify trigger logic by checking trigger existence plus function
  compilation errors.
