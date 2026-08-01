# POV — Proof of Validation

## Date: 2026-08-01

## Summary

Two production bugs were fixed, a new mass-reminder feature was added, and all
changes were validated via TDD, security review, WCAG 2.2 AA checks, and
responsive design verification.

---

## Bug 1: Reminder Emails Failing with "Conflicting API Key" 401

### Root Cause

Three edge functions (`send-reminder`, `send-reset-email`, `invite-member`)
called the `send-email` function internally using two DIFFERENT API keys in the
same request:

- `Authorization: Bearer <SERVICE_ROLE_KEY>`
- `Apikey: <ANON_KEY>`

The Supabase edge function gateway rejects requests where these two headers
contain different keys, returning HTTP 401 "Conflicting API Key". This caused
all reminder, password reset, and invitation emails to fail silently.

Registration emails worked because they are sent through Supabase's built-in
auth email service (not through the `send-email` function chain).

### Fix Applied

All three edge functions were updated so both headers use the same
`SERVICE_ROLE_KEY`:

```typescript
// BEFORE (buggy — two different keys):
headers: {
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Apikey": ANON_KEY,
}

// AFTER (fixed — single consistent key):
headers: {
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Apikey": SERVICE_ROLE_KEY,
}
```

Files changed:
- `supabase/functions/send-reminder/index.ts`
- `supabase/functions/send-reset-email/index.ts`
- `supabase/functions/invite-member/index.ts`

All three were redeployed via the Supabase MCP deploy tool.

### Test Coverage

- `src/test/edge-function-api-keys.test.ts` — 8 tests
  - Validates that both headers use the same key
  - Validates the old conflicting pattern is rejected
  - Validates missing-header detection
  - Covers send-reminder, send-reset-email, and invite-member call patterns

---

## Bug 2: RLS Violation When Assigning Committee Roles

### Root Cause

The `role_assignments` table had RLS enabled but only a SELECT policy
(`USING (true)`). There were zero INSERT, UPDATE, or DELETE policies. This
meant any attempt by an admin to insert or delete a role assignment (e.g.,
assigning a committee role from the member edit dialog, the Roles tab, or the
Chapters tab) was blocked by RLS with an error.

The admin UI components were trying to directly insert/delete into
`role_assignments` from the browser, which RLS correctly blocked.

### Fix Applied

**1. Database migration** (`20260801000001_add_assign_revoke_role_functions.sql`):

Two SECURITY DEFINER functions were created:

- `assign_role(p_member_id, p_role_id, p_chapter_id)` — inserts a role
  assignment after validating:
  - Caller is a Global Admin or Chapter Admin
  - Chapter Admin can only assign within their own chapter
  - Prevents self-escalation to Global Admin
  - Only Global Admin can assign global-scope roles
  - Prevents duplicate active assignments (idempotent)
  - Sets `created_by = auth.uid()` server-side (client cannot control it)

- `revoke_role(p_assignment_id)` — deletes a role assignment after validating:
  - Caller is a Global Admin or Chapter Admin
  - Chapter Admin can only revoke within their own chapter
  - Chapter Admin cannot revoke Global Admin

**Security hardening:**
- Direct INSERT, UPDATE, DELETE privileges on `role_assignments` revoked from
  `anon` and `authenticated` roles — only SELECT remains
- EXECUTE on both functions granted to `authenticated` only; revoked from
  `anon` and `public`
- Both functions have `search_path SET TO 'public'`
- The `created_by` audit column is set from `auth.uid()` inside the function,
  not from client input

**2. UI components updated** to call the new RPC functions:

- `src/components/admin/MembersTab.tsx` — committee role toggle now calls
  `assign_role` / `revoke_role` RPC
- `src/components/admin/RolesTab.tsx` — assign and revoke now call RPC
- `src/components/admin/ChaptersTab.tsx` — all three role assignment sites
  (assign chapter admin, assign committee role, remove committee role) now
  call RPC

No direct writes to `role_assignments` remain anywhere in the codebase
(verified via grep).

### Test Coverage

- `src/test/role-assignment.test.ts` — 18 tests
  - Global Admin can assign any role
  - Chapter Admin can assign within their chapter
  - Chapter Admin cannot assign outside their chapter
  - Chapter Admin cannot assign global-scope roles
  - Regular member cannot assign roles
  - Self-escalation to Global Admin is blocked
  - Global Admin can assign Global Admin to a different member
  - Chapter Admin with no chapter_id is rejected
  - Same checks for revoke_role
  - Chapter Admin cannot revoke Global Admin
  - Audit column (`created_by`) is not in client parameters
  - Duplicate assignment detection (active vs expired)

---

## Feature: Send Reminders to All Pending Members

### What Was Added

The `send-reminder` edge function gained a new mass mode. When `send_to_all: true`
is passed instead of `member_ids`, it:

1. Queries all members with `onboarding_completed = false` (up to 500 per batch)
2. For Chapter Admins, scopes to their own chapter
3. For Global Admins, optionally scopes by `chapter_id` or targets all
4. Sends a reminder email to each pending member
5. Returns `{ sent, failed, errors, total_attempted }`

The VerificationDashboard gained a "Send to All Pending" button that:
- Shows a confirmation dialog with the count of pending members
- Triggers the mass send on confirmation
- Shows a success toast with sent/failed counts
- Shows an error toast if all fail
- Disables during sending and when no pending members exist

### Test Coverage

- `src/test/mass-reminders.test.ts` — 17 tests
  - Mode parsing (all vs selected)
  - Member selection (all pending, excludes onboarded, selected subset)
  - Batch processing (sent/failed counts, error messages, empty list)
  - UI response handling (success, partial, all-fail, network error)

---

## Security Review

| Check | Status |
|-------|--------|
| Direct INSERT/UPDATE/DELETE on `role_assignments` revoked from anon + authenticated | PASS |
| `assign_role` and `revoke_role` enforce authorization internally via `has_role()` | PASS |
| `created_by` audit column set server-side from `auth.uid()`, not client input | PASS |
| Both functions have `search_path SET TO 'public'` | PASS |
| EXECUTE revoked from `anon` and `public` on both functions | PASS |
| Self-escalation to Global Admin prevented | PASS |
| Chapter Admin scoped to own chapter for assign and revoke | PASS |
| Chapter Admin cannot revoke Global Admin | PASS |
| Idempotent: duplicate active assignment returns success without error | PASS |
| Edge function API key conflict fixed (single consistent key) | PASS |
| Edge functions validate caller JWT and role before processing | PASS |

---

## WCAG 2.2 AA Compliance

| Check | Status |
|-------|--------|
| "Send to All Pending" button has descriptive `aria-label` with count | PASS |
| Button has minimum 44px touch target (`min-h-[44px]`) | PASS |
| Confirmation dialog uses AlertDialog with title and description | PASS |
| Dialog buttons (Cancel/Confirm) have 44px touch targets | PASS |
| Focus is trapped in the confirmation dialog (Radix AlertDialog) | PASS |
| Dialog is dismissible via Escape key and click outside | PASS |
| Existing "Send Reminder" button also upgraded to 44px touch target | PASS |
| All color combinations match existing WCAG AA-compliant palette | PASS |
| Loading state communicated via button text ("Sending...") | PASS |
| Success/error results shown via toast (announced to screen readers) | PASS |
| Checkbox has associated `<label>` with `htmlFor` | PASS |
| Layout uses flexbox with `flex-col sm:flex-row` for responsive stacking | PASS |

---

## Responsive Design

| Breakpoint | Verification |
|------------|-------------|
| Mobile (<640px) | Button row stacks vertically (`flex-col`); full-width buttons; 44px touch targets |
| Tablet (640px+) | Button row aligns horizontally (`sm:flex-row`); buttons right-aligned |
| Desktop | Same as tablet; consistent with existing dashboard layout |

The "Send to All Pending" button and existing "Send Reminder" button are in a
flex container that switches from column to row at the `sm` breakpoint,
ensuring comfortable spacing on mobile and compact layout on larger screens.

---

## Test Results

```
Test Files  13 passed (13)
     Tests  264 passed (264)
```

All 264 tests pass, including 43 new tests across 3 new test files.

## Build Results

```
✓ 2224 modules transformed
✓ built in 19.60s
```

Production build succeeds with no errors.

---

## POV Checklist

- [x] Root cause identified for both bugs
- [x] Fix applied and deployed (edge functions) / migrated (database)
- [x] TDD: tests written first, all pass
- [x] Security best practices followed (SECURITY DEFINER, least privilege, audit trail)
- [x] WCAG 2.2 AA compliance verified
- [x] Responsive design verified across mobile/tablet/desktop
- [x] No direct writes to `role_assignments` remain in codebase
- [x] API key consistency enforced across all edge function chains
- [x] Mass reminder feature added with confirmation dialog and results summary
- [x] Production build passes
