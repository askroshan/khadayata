# Data Steward Todo List

## Bug Reports

### Critical — Missing Core Role Functionality

- [x] **BUG-033** — Zero verification controls on member profiles for Data Steward. Route: `/member/:id`. Symptom: Data Steward sees only the "Report" flag button — identical to a regular member.
- [x] **BUG-034** — No matrimonial moderation interface for Data Steward. Route: `/matrimonial`. Symptom: Sees the standard member "Begin Your Journey" screen with no moderation queue.
- [x] **BUG-035** — No Upload button on Heritage Archives for Data Steward. Route: `/archives`. Symptom: Sees "No magazine issues found" with no upload or manage button.
- [x] **BUG-036** — "Pending" profile status badge in Admin Members list is not clickable/actionable. Route: `/admin → Members tab`. Clicking it does nothing — no verification workflow modal.

---

### High — Over-Permissions

- [x] **BUG-037** — Data Steward has "Create Event" button (over-permission). Route: `/events`.
- [x] **BUG-038** — Data Steward has "Write Article" button on News (over-permission). Route: `/news`.
- [x] **BUG-020/021/022 re-confirmed** — Data Steward Admin panel shows global counts/all-chapters/all-roles instead of chapter-scoped view. (Core scoping already implemented in phase 2 for Chapter Admin — carries over to Data Steward via `myChapterId` logic.)

---

### Medium

- [x] **BUG-039** — Tag Requests tab has no Approved/Rejected history filter. Route: `/admin → Tag Requests`. Only "Pending (0)" shown.
- [x] **BUG-040** — Oral History Upload: Media File required field not validated. WCAG 3.3.1 failure.
- [x] **BUG-041** — Oral History Upload accessible to ALL admin roles without moderation queue.

---

## New User Stories

- [x] **US-133** — Data Steward wants a "Verify Member" action panel on each member profile (chapter-scoped) with L1/L2 controls, verification note, vouch chain view, and document request.
- [x] **US-134** — Data Steward wants a Matrimonial Moderation queue listing all submitted profiles in their chapter with Approve / Request Edit / Flag / Reject actions.
- [x] **US-135** — Data Steward wants an "Upload Issue" button on Heritage Archives to upload PDFs with metadata (year, edition, description, language).
- [x] **US-136** — "Pending" status badge in Admin Members list opens a member verification workflow showing what is missing and allowing action.
- [x] **US-137** — Tag Requests tab shows Approved / Rejected history (not just Pending) for audit trail.
- [x] **US-138** — "Create Event" and "Write Article" buttons hidden for Data Steward role.
- [x] **US-139** — Data Steward Verification Dashboard: dedicated landing tab in Admin panel showing pending verifications, unresolved tag requests, matrimonial profiles awaiting moderation, and heritage uploads pending review — chapter-scoped.
