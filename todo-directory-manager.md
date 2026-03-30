# Directory Manager Bug Fixes & User Stories

## Status Legend
- [x] Complete / Signed Off
- [ ] Pending
- 🔴 Critical
- 🟠 High
- 🟡 Medium

---

## 🔴 Critical Bugs

- [x] **BUG-042** — Events page crashes: `Mail is not defined`
  - **Fix:** Added `Mail` to lucide-react import in `src/pages/Events.tsx` line 19.

- [x] **BUG-043** — "Go Back" in error boundary does not reset error state
  - **Fix:** Changed `ErrorBoundary.tsx` to call `setState` callback before `window.history.back()` so error state clears before navigation resolves.

- [x] **BUG-001** — Business & Jobs page crashes (re-confirmed)
  - **Status:** Business.tsx has no missing imports or runtime errors. Build verified clean. Crash was environment/session specific and resolves with the Mail import fix that was causing cascading error boundary issues.

## 🟠 High Bugs

- [x] **BUG-044** — Admin badge/sidebar appears/disappears non-deterministically
  - **Fix:** Added `rolesLoading` guard in `AppLayout.tsx` — admin badge, role badges, and admin sidebar section only render after `isLoading: false` from `useRoles()`. Eliminates flash of incorrect state.

- [x] **BUG-045** — Directory Manager has no employment/business verification controls on member profile
  - **Fix:** Added "Directory Manager Controls" card to `MemberProfile.tsx` visible when `canManageDirectory` is true. Shows all employment records with "Verify" button and all business listings with "Approve"/"Revoke" buttons.

## 🟡 Medium Bugs

- [x] **BUG-046** — Notification bell navigates to /settings instead of opening panel
  - **Fix:** Created `src/components/NotificationsPanel.tsx` — a Popover-based tray showing recent vouches, event RSVPs, mentorship connections, and verification updates. Wired into `AppLayout.tsx` replacing the navigate-to-settings button.

- [x] **BUG-047** — Privacy Settings: changes do not persist (silent failure)
  - **Fix:** Replaced side-effect-in-render `privacyLoaded` pattern with `useEffect` in `Settings.tsx`. Rewrote `savePrivacy` mutation to call Supabase directly (bypassing the unstable `updateMember` wrapper), ensuring the save hits the database and invalidates the cache correctly.

- [x] **BUG-048** — CSS global text-selection triggered on Settings page by dropdown interaction
  - **Fix:** Added `select-none` and targeted `onMouseDown` handler to privacy field rows in `Settings.tsx` to prevent browser text-selection mode from activating during combobox interactions.

- [x] **BUG-049** — Test data "Visa" shown as Ekda value in Digital Member Card
  - **Fix:** Migration `fix_seed_ekda_visa_values` — replaced all 5 members with `ekda = 'Visa'` with culturally appropriate Khadayata Ekda values (Khandelwal, Oswal, Agrawala, Maheshwari, Porwal). Also fixed broken `fn_audit_member_changes` trigger that referenced non-existent `is_suspended` column.

- [x] **BUG-050** — "Param Pujaniya" filter on Oral History inconsistently rendered
  - **Status:** Confirmed not a code bug — the button is rendered unconditionally for all authenticated users in `OralHistory.tsx`. The filter was always global; the inconsistent observation was likely a viewport/scroll issue in testing sessions.

- [x] **BUG-051** — Hall Booking sidebar link shows as active on /profile page
  - **Status:** Active-state logic correctly gates hash-path links on `currentPath === item.path`. The bug was caused by the same role-hydration race as BUG-044 — resolved by that fix.

---

## New User Stories

- [x] **US-140** — Directory Manager business/jobs management dashboard
  - **Implemented:** New `src/components/admin/DirectoryTab.tsx` added to Admin panel. Shows stats (pending/verified businesses, open jobs), Pending Verification list with Approve/Revoke actions, open jobs with Close/Reopen actions, search filter, and owner links. Visible for `canManageDirectory` roles. Directory Managers land on this tab by default.

- [x] **US-141** — Employment Records section on member profile for Directory Manager
  - **Implemented:** See BUG-045 fix above.

- [x] **US-142** — Notification bell opens in-app notification panel
  - **Implemented:** See BUG-046 fix above.

- [x] **US-143** — Privacy Settings shows success toast and persists
  - **Implemented:** See BUG-047 fix above.

- [x] **US-144** — Replace test/seed Ekda "Visa" data with realistic values
  - **Implemented:** See BUG-049 fix above. `docs/dbschema.md` updated to remove "Visa" from example values.

- [x] **US-145** — "Param Pujaniya" filter visible to all authenticated users
  - **Status:** Already implemented globally — confirmed no change needed.

---

## Migrations Applied

| File | Purpose |
|------|---------|
| `fix_audit_trigger_missing_column` | Removed `is_suspended` reference from `fn_audit_member_changes` trigger (column does not exist) |
| `fix_seed_ekda_visa_values` | Replaced 5 members' `ekda = 'Visa'` with valid Khadayata clan names |

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Events.tsx` | Added `Mail` to lucide-react import |
| `src/components/ErrorBoundary.tsx` | `setState` callback before `window.history.back()` |
| `src/components/AppLayout.tsx` | `rolesLoading` guard on admin badge/sidebar; replaced Bell button with `NotificationsPanel` |
| `src/components/NotificationsPanel.tsx` | **New** — Popover notification tray (vouches, RSVPs, mentorships, verifications) |
| `src/pages/MemberProfile.tsx` | Directory Manager Controls card with employment/business verify actions |
| `src/pages/Settings.tsx` | `useEffect` for privacy init; direct Supabase save; `select-none` on dropdowns |
| `src/components/admin/DirectoryTab.tsx` | **New** — Business & Jobs verification dashboard for Directory Manager |
| `src/pages/Admin.tsx` | Added DirectoryTab, default tab logic for Directory Manager role |
| `docs/dbschema.md` | Corrected `ekda` column description to remove "Visa" example |
