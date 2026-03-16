# Chapter Admin Todo List

## Bug Reports

### Critical — Data Scoping

- [x] **BUG-020** — Admin Members tab shows ALL members globally, not just chapter — fixed: `admin-members` query now scoped by `myChapterId`; Chapter Admin sees only their chapter members; members from other chapters appear dimmed and with level-change buttons disabled.
- [x] **BUG-021** — Admin dashboard stats show global counts — fixed: `AdminStats` receives `isChapterScoped` prop and labels change to "Chapter Members" / "Global Members" accordingly; counts are derived from the already-scoped `allMembers` array.
- [x] **BUG-022** — Admin Roles tab shows all platform-wide roles — fixed: `admin-roles` query scoped by `myChapterId`; Chapter Admin sees only chapter-scoped role assignments in table.
- [x] **BUG-023** — Level-change ↑↓ buttons active for out-of-scope members — fixed: `MembersTab` computes `inScope = !myChapterId || m.chapter_id === myChapterId`; buttons disabled when `!inScope`; tooltip shows "Cannot change level: member belongs to a different chapter".

---

### High

- [x] **BUG-024** — Profile "+ Add" button for Employment shows loading but no form — confirmed: Profile.tsx already wraps Employment Add in a `Dialog` with `DialogContent` containing the full form; no fix required (was pre-existing correct implementation).
- [x] **BUG-025** — "Offer Mentorship" button on Marketplace tab — fixed: added `offerDialogOpen` state and a `Dialog` component rendered outside `AppLayout`; Marketplace CTA now opens the dialog directly instead of switching tab state.
- [x] **BUG-026** — "My Mentorships" tab shows empty after request — fixed: `requestMentorship` now sets `status: "pending"` instead of `"active"`, and `queryClient.invalidateQueries` refreshes `my-mentorships` immediately after mutation.
- [x] **BUG-027** — "Add Photo" on Event Gallery triggers loading but no file picker — fixed: replaced `<label>` + `asChild Button` pattern with explicit `document.getElementById(fileInputId)?.click()` triggered by Button's `onClick`; file input gets a unique `id` per event.
- [x] **BUG-028** — Announcements created by Chapter Admin have no chapter scope — fixed: `AnnouncementsTab` now accepts `myChapterId` prop; Chapter/Global audience selector shown when admin is chapter-scoped; `chapter_id` written to DB on create.
- [x] **BUG-029** — Chapter Admin has "Write Article" button — fixed: "Write Article" button in News.tsx now wrapped with `{canPublishNews && ...}`; `canPublishNews = isGlobalAdmin || isPublisher`; Chapter Admins without Publisher role no longer see the button.

---

### Medium

- [x] **BUG-030** — Invite Family modal phone field pre-populates with `9876543210\` (stray backslash) — fixed: removed trailing backslash from `placeholder` attribute in FamilyInviteDialog.tsx.
- [x] **BUG-031** — Phone edit button uses credit card/ID icon — fixed: PhoneField.tsx changed import from `CreditCard as Edit` to `Pencil as Edit`; edit icon is now a pencil (WCAG 1.3.3 compliant).
- [x] **BUG-032** — Hall Booking "Submit Request" with empty fields shows loading but no validation — fixed: added `handleSubmitHallBooking()` validation handler that fires descriptive toast errors for missing Hall Name or Booking Date before calling `createBooking.mutate()`.

---

## New User Stories

- [x] **US-125** — Chapter Admin scoped Admin panel — implemented: `useRoles` now exposes `myChapterId` (null for Global Admin, chapter ID for Chapter Admin); all Admin queries (`admin-members`, `admin-roles`) scoped by this value.
- [x] **US-126** — Level-change buttons disabled with tooltip for out-of-scope — implemented: `MembersTab` wraps each button in `<Tooltip>`; out-of-scope buttons are disabled with "Cannot change level: member belongs to a different chapter" tooltip.
- [x] **US-127** — Chapter Admin can assign chapter-specific roles — implemented: `RolesTab` now has "Assign Role" button opening dialog; Chapter Admin sees only `CHAPTER_ROLES` list; Global Admin sees all roles; role is assigned with `chapter_id` from `myChapterId`.
- [x] **US-128** — "Add Photo" opens a file upload dialog — implemented: EventGallery.tsx uses `document.getElementById(fileInputId)?.click()` pattern to reliably trigger native file picker on all browsers.
- [x] **US-129** — Sent mentorship requests appear as "Pending" — implemented: `requestMentorship` mutation now sets `status: "pending"` instead of `"active"`; My Mentorships shows the request immediately with Pending badge after `invalidateQueries`.
- [x] **US-130** — Employment/Education "+ Add" opens inline form — confirmed: Profile.tsx already uses shadcn `Dialog` for both Employment and Education add buttons with full inline form in `DialogContent`.
- [x] **US-131** — Chapter scope selector when creating announcements — implemented: "Audience" toggle (Chapter Only / All Members) shown in AnnouncementsTab when `myChapterId` is non-null; existing announcements show Chapter/Global badge.
- [x] **US-132** — Chapter-scoped analytics on Admin Dashboard — implemented: `AdminStats` shows "Chapter Members" label when `isChapterScoped=true`; counts are from the already chapter-filtered `allMembers` array; "L2+ Verified" metric replaces separate L2 count.
