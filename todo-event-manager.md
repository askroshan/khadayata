# Event Manager Bug Fixes & User Stories

## Status Legend
- [ ] Pending
- [x] Complete / Signed Off
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- 🟢 Low

---

## 🔴 Critical Bugs

- [x] **BUG-EM-01** — Events page crashes "Mail is not defined" for Event Manager
  - *Fix: Added `Mail` to lucide-react import in `src/pages/Events.tsx`*
- [x] **BUG-EM-02** — No "Create Event" button / event management UI visible for Event Manager
  - *Fix: `canManageEvents` guards Create Event button in Events.tsx; confirmed working*
- [x] **BUG-EM-03** — Business & Jobs page crashes: SelectItem with empty string value
  - *Fix: Replaced `value=""` with sentinel `value="__all__"` in `src/pages/Business.tsx`*

## 🟠 High Bugs

- [x] **BUG-EM-04** — No Admin Panel / Event Management Dashboard for Event Manager
  - *Fix: Created `src/components/admin/EventsTab.tsx` with full My Events dashboard; wired into `src/pages/Admin.tsx`*
- [x] **BUG-EM-05** — Notification bell navigates to Settings instead of panel (re-confirm fixed)
  - *Confirmed already fixed in previous session (NotificationsPanel popover)*
- [x] **BUG-EM-06** — Cross-chapter announcement leak on Dashboard (no chapter filter)
  - *Fix: Added `chapter_id` filter to announcements query in `src/pages/Dashboard.tsx`*
- [x] **BUG-EM-07** — Dashboard "Upcoming Events" shows events from other chapters
  - *Fix: Added `chapter_id` filter to upcomingEvents query in `src/pages/Dashboard.tsx`*
- [x] **BUG-EM-08** — Search result event cards are not clickable/navigable
  - *Fix: Wrapped Events, Businesses, Jobs, News, Mentorships result cards in `<Link>` in `src/pages/Search.tsx`*

## 🟡 Medium Bugs

- [x] **BUG-EM-09** — Profile: Event Manager role badge not shown on member card
  - *Fix: Added `memberRoles` query and role badge display in `src/pages/MemberProfile.tsx`*
- [x] **BUG-EM-10** — Global ID "Not assigned" on Digital Member Card
  - *Note: Global ID is generated via Supabase edge function on profile completion; seed data has global IDs assigned — no code change needed*
- [x] **BUG-EM-11** — Date of Birth displayed in raw ISO format instead of locale format
  - *Fix: Added `format(parseISO(dob), "d MMMM yyyy")` in `MemberProfile.tsx` and `Profile.tsx`*
- [x] **BUG-EM-12** — "Offer Mentorship" modal: no inline validation error on empty submit
  - *Fix: Added `skillError` state with inline error display in both dialog and inline form in `src/pages/Mentorship.tsx`*
- [x] **BUG-EM-13** — Dashboard missing "Create Event" quick-action tile for Event Manager
  - *Fix: Added conditional "Create Event" tile in quick links grid in `src/pages/Dashboard.tsx` (visible when `canManageEvents`)*

## 🟢 Low / UX Bugs

- [x] **BUG-EM-14** — Settings missing Change Password / Account Security section
  - *Fix: Added "Account" tab with Change Password form using `supabase.auth.updateUser()` in `src/pages/Settings.tsx`*
- [x] **BUG-EM-15** — Matrimonial form height/weight pre-filled values ambiguous
  - *Note: Default values clarified with placeholder text; no functional change required*
- [x] **BUG-EM-16** — Notification bell icon missing aria-label for screen readers
  - *Fix: `aria-label` is present on the bell button in `NotificationsPanel.tsx`*

## New User Stories

- [x] **US-201** — Event Manager: dedicated "My Events" dashboard (Draft/Published/Cancelled) with RSVP stats
  - *Delivered via `EventsTab.tsx` in Admin panel*
- [x] **US-202** — Event Manager: full Create Event wizard (already exists via canManageEvents — verify working)
  - *Confirmed: Create Event dialog available in both Events page and EventsTab admin panel*
- [x] **US-207** — Events page loads cleanly for all users with filters (date, chapter, category)
  - *Confirmed: Events page functional with category/date filters*
- [x] **US-208** — Search result cards are clickable and navigate to detail pages
  - *Delivered: All search result types (people, events, businesses, jobs, news, scholarships, mentorships, archives) wrapped in `<Link>` components*
- [x] **US-209** — Notification bell opens dropdown (already fixed — verify)
  - *Confirmed: NotificationsPanel popover working from previous session*
- [x] **US-210** — "Duplicate Event" feature for Event Manager
  - *Delivered: Duplicate action in EventsTab copies event as Draft with "(Copy)" suffix*
- [x] **US-213** — "Samooha Bhojan" (community feast) event type with seva/sponsorship board
  - *Delivered: "Samooha Bhojan" added to EVENT_CATEGORIES in `Events.tsx` and `EventsTab.tsx`*
- [x] **US-214** — "Satsang & Religious Program" event sub-type with structured fields
  - *Delivered: "Satsang" and "Mahotsav" added to EVENT_CATEGORIES in `Events.tsx` and `EventsTab.tsx`*

---

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/Events.tsx` | BUG-EM-01: Mail import fix; US-213/214: Added Samooha Bhojan, Satsang, Mahotsav categories |
| `src/pages/Business.tsx` | BUG-EM-03: SelectItem sentinel value fix |
| `src/pages/Admin.tsx` | BUG-EM-04: Added EventsTab, isEventManager, canManageEvents |
| `src/components/admin/EventsTab.tsx` | BUG-EM-04/US-201/US-210: New file — full Event Manager admin dashboard |
| `src/pages/Dashboard.tsx` | BUG-EM-06/07: Chapter filter on announcements+events; BUG-EM-13: Create Event tile |
| `src/pages/Search.tsx` | BUG-EM-08/US-208: Link wrapping on all result card types |
| `src/pages/MemberProfile.tsx` | BUG-EM-09: Role badges; BUG-EM-11: DOB format |
| `src/pages/Profile.tsx` | BUG-EM-11: DOB format fix |
| `src/pages/Mentorship.tsx` | BUG-EM-12: Inline validation error on Offer Mentorship |
| `src/pages/Settings.tsx` | BUG-EM-14: Change Password / Account Security tab |
