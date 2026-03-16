# Unverified Member (L0) — Bug Fixes & User Stories

User: Rahul Sharma, Ahmedabad Chapter, L0 — Unverified

---

## Critical Bugs

- [x] **BUG-002** — L0 users see Report buttons
  - **Status:** Inherited fix from BUG-001 (Regular Member todo). `ReportDialog` already gated behind `isModerator || isAnyAdmin`. No additional work needed.

- [x] **BUG-003** — No feature restrictions for L0 users
  - **List Business:** Fixed (level < 2 shows `L2GateButton`) — applies to L0 since 0 < 2
  - **Post Job:** Fixed (level < 2 shows `L2GateButton`) — applies to L0
  - **Create Event:** Already gated behind Event Manager role — L0 cannot create events
  - **Matrimonial profile creation:** Fixed in L0-004 below

---

## L0-Specific Experience

- [x] **L0-001** — No vouch progress indicator on own profile
  - **Fix:** Added a progress section to the Vouched By card on `Profile.tsx`:
    - For L0: amber-coloured progress bar showing X/2 vouches received
    - For L1: blue-coloured progress bar showing X/3 L1+ vouches received
    - "Find members" quick link to Directory
    - Vouches query updated to include voucher's `verification_level` for accurate L1+ counting
  - **Files:** `src/pages/Profile.tsx`

- [x] **L0-002** — Cannot see who has vouched for them
  - **Status:** Already implemented — Profile page Vouched By card shows each voucher's name, avatar, date, and note, with links to their profile. Verified working.

- [x] **L0-003** — No "Request a Vouch" CTA when viewing other members' profiles
  - **Fix:** Added an amber callout banner on `MemberProfile.tsx` for L0 viewers — explains they can ask the member being viewed to vouch for them and directs them to the Vouches section
  - **Files:** `src/pages/MemberProfile.tsx`

- [x] **L0-004** — Matrimonial profile creation accessible to L0 users
  - **Fix:** Profile creation form and CTA button are now gated behind `verification_level >= 1`:
    - L0 users see a locked amber card: "L1 Verification Required — Get 2 vouches from community members to create a matrimonial profile"
    - L1+ users see the original "Create Your Profile to Connect" CTA
    - Browsing profiles is still open to all authenticated users
  - **Files:** `src/pages/Matrimonial.tsx`

- [x] **L0-005** — No contextual nudge in Directory for L0 users
  - **Fix:** Added an amber banner at the top of the member grid on the Directory page for L0 users explaining: "Get vouched to reach L1 — click any verified member's card to vouch or ask them to vouch for you"
  - **Files:** `src/pages/Directory.tsx`

---

## Implementation Progress

| # | Item | Status | File(s) Changed |
|---|------|--------|-----------------|
| 1 | BUG-002: Report button gate (inherited) | DONE | `src/components/ReportDialog.tsx` |
| 2 | BUG-003: Business/Job L2 gate applies to L0 | DONE | `src/pages/Business.tsx` |
| 3 | L0-001: Vouch progress bar on Profile page | DONE | `src/pages/Profile.tsx` |
| 4 | L0-002: Vouch list visibility on own profile | DONE (pre-existing + verified) | `src/pages/Profile.tsx` |
| 5 | L0-003: Ask-to-vouch nudge on MemberProfile | DONE | `src/pages/MemberProfile.tsx` |
| 6 | L0-004: Matrimonial profile creation gated at L1 | DONE | `src/pages/Matrimonial.tsx` |
| 7 | L0-005: Directory nudge for L0 users | DONE | `src/pages/Directory.tsx` |

All items signed off. Build passes.
