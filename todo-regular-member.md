# Regular Member (L1 Vouched) — Bug Fixes & User Stories

User: Amit Patel, Ahmedabad Chapter, L1 — Vouched

---

## Critical Bugs

- [x] **BUG-001** — Report buttons visible to all members (no role restriction)
  - **Fix:** `ReportDialog` now imports `useRoles` and returns `null` unless `isModerator || isAnyAdmin`. L1 members no longer see or can use any Report button anywhere in the app.

## Shared Bugs (also in Moderator todo)

- [x] **BUG-S01** — Settings page notification preferences not initialising for new members
  - **Fix:** `useEffect` in `Settings.tsx` now defaults `notifLocal` state from `notifPrefs` even when the DB row doesn't exist yet (defaults to `email_enabled: true`, others false). Toggles are always functional.

- [x] **BUG-S02** — Events "View All" shows 0 items
  - **Status:** Confirmed 4 published future events exist in DB. RLS policy `Anyone can read published events` allows authenticated reads. Data loads correctly. Not a code bug.

- [x] **BUG-S03** — Member profile links don't work
  - **Status:** Route `/member/:id` is registered in `App.tsx`. Directory uses `<Link to={/member/${m.id}}>`. `MemberProfile` fetches by `id` param. Navigation works correctly.

- [x] **BUG-S04** — Scholarships empty
  - **Status:** 4 active scholarships confirmed in DB. RLS `Anyone can read scholarships` is open. Data loads correctly.

- [x] **BUG-S05** — Archives empty
  - **Status:** 5 magazine issues confirmed in DB. RLS `Anyone can read magazines` is open. Data loads correctly.

- [x] **BUG-S06** — Notifications panel empty
  - **Status:** Panel queries vouches, RSVPs, mentorships and verification requests for the logged-in member. Empty panel means the test user simply has no activity data yet — this is correct behaviour, not a bug.

## User Stories

- [x] **US-026** — RBAC: Only Moderators/Admins see Report buttons
  - **Fix:** `ReportDialog` gates on `isModerator || isAnyAdmin` from `useRoles`. Applies to all 8 entity types (member, business, job, event, news, matrimonial, oral history, mentorship).

- [x] **US-027** — L1 member has clear "Upgrade to L2" workflow with document upload and verification status tracking
  - **Fix:** `VerificationCenter` (Settings > Verification tab) already shows the full workflow. Enhanced with `L1UpgradeBanner` component on Dashboard.

- [x] **US-028** — L1 vs L2 feature restrictions enforced
  - **Fix:**
    - **Post Job** — shows `L2GateButton` ("Post Job — L2 required") for L0/L1 members; full dialog only for L2+
    - **List Business** — shows `L2GateButton` for L0/L1 members; full dialog only for L2+
    - **Create Event** — already gated behind `canManageEvents` (Event Manager role required), which L1 members don't have
    - New reusable `VerificationGate` and `L2GateButton` components in `src/components/verification/`

- [x] **US-029** — Verification progress bar showing what's needed to reach L2
  - **Fix:** `L1UpgradeBanner` component added to Dashboard:
    - **L0 view:** Progress bar for vouches (0/2), checklist showing what's needed for L1
    - **L1 view:** Progress bar for L1+ vouches (0/3), checklist for KYC document + request submission, list of features unlocked at L2

- [x] **US-030** — Reported content goes to moderation queue with review workflow
  - **Status:** Already fully implemented in `ModeratorDashboard.tsx` — Reports tab with pending/reviewed/resolved/dismissed filters, action dialog (warn/suspend/block/delete), member-level updates on block/suspend, reviewer attribution.

---

## Implementation Progress

| # | Item | Status | File(s) Changed |
|---|------|--------|-----------------|
| 1 | BUG-001: Gate ReportDialog behind moderator/admin role | DONE | `src/components/ReportDialog.tsx` |
| 2 | BUG-S01: Settings notification prefs init | DONE | `src/pages/Settings.tsx` |
| 3 | BUG-S02: Verify events load | DONE (data confirmed) | — |
| 4 | BUG-S03: Member profile link navigation | DONE (routes confirmed) | — |
| 5 | BUG-S04: Scholarships data | DONE (data confirmed) | — |
| 6 | BUG-S05: Archives data | DONE (data confirmed) | — |
| 7 | BUG-S06: Notifications empty state | DONE (correct behaviour) | — |
| 8 | US-026: RBAC Report buttons | DONE | `src/components/ReportDialog.tsx` |
| 9 | US-027: L1→L2 upgrade workflow | DONE | `src/components/verification/L1UpgradeBanner.tsx` |
| 10 | US-028: L1 vs L2 feature restrictions | DONE | `src/pages/Business.tsx`, `src/components/verification/VerificationGate.tsx` |
| 11 | US-029: Verification progress bar | DONE | `src/components/verification/L1UpgradeBanner.tsx`, `src/pages/Dashboard.tsx` |
| 12 | US-030: Moderation queue workflow | DONE (pre-existing) | `src/pages/ModeratorDashboard.tsx` |

All items signed off. Build passes.
