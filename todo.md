# Project Todo List

## Bug Reports

### Critical

- [x] **BUG-001** — Business & Jobs page crashes (white screen) on `/business` — fixed: `useMember` changed from `.single()` to `.maybeSingle()` + global `ErrorBoundary` added
- [x] **BUG-002** — SPA routes return 404 on direct URL/refresh — fixed: added `public/_redirects` with `/* /index.html 200`
- [x] **BUG-003** — Generate Global ID fails with Edge Function non-2xx error on `/profile` — fixed: replaced esm.sh import with `npm:@supabase/supabase-js@2` and redeployed

### High

- [x] **BUG-004** — No admin controls on member profiles at `/member/:id` — fixed: added Edit Member dialog, Level Up/Down, Suspend buttons visible to `canVerifyMembers` / `canEditAnyMember`
- [x] **BUG-005** — No Edit/Delete on News articles at `/news` — fixed: added Edit dialog and Delete AlertDialog per article for `canModerateNews` / `canDeleteNews`
- [x] **BUG-006** — No Edit/Delete on Events at `/events` — fixed: added Edit/Cancel/Delete controls per upcoming event for `canManageEvents`
- [x] **BUG-007** — No Edit/Delete on Announcements in Admin panel at `/admin` → Announcements tab — fixed: rewritten AnnouncementsTab with edit/delete per announcement
- [x] **BUG-008** — Empty Announcement body submits without validation error — fixed: added client-side title validation with error toast in `handlePublish()`
- [x] **BUG-009** — Roles tab shows "Global" scope for all chapter-scoped roles — fixed: query now includes `chapters(name)`, `scopeLabel` displays chapter name for chapter-scoped roles
- [x] **BUG-010** — No Create Scholarship button for Global Admin / Finance Admin at `/scholarships` — fixed: added Create Scholarship dialog with full form
- [x] **BUG-011** — No Upload/Manage button on Archives for Global Admin at `/archives` — fixed: added Upload Issue dialog for `canManageOralHistories`
- [x] **BUG-012** — No Matrimonial profile moderation view for Global Admin at `/matrimonial` — fixed: added "Moderate" tab visible to `canManageMatrimonial` with verify/flag/delete per profile

### Medium

- [x] **BUG-013** — Dashboard banner shows "L0 — Unverified" for Global Admin despite being Level 3 — fixed: added L3/L4/L5 to `VERIFICATION_LABELS` with proper colors; fallback to L0 if unknown
- [x] **BUG-014** — Dual active sidebar highlight for Hall Booking and Medical Aid simultaneously at `/services` — fixed: nav paths updated to `/services#hall` and `/services#medical`; active check uses `pathname + hash`; Services page reads hash for default tab
- [x] **BUG-015** — Verification settings page shows only L0/L1/L2, missing L3 tier — fixed: added L3 "Senior" entry to `LEVELS` array in VerificationCenter; added informational card for L2+ members explaining L3 is admin-granted
- [x] **BUG-016** — Create Event form lacks Chapter assignment field — fixed: added Chapter dropdown to Create Event form using `useChapters()`
- [x] **BUG-017** — Create Article form lacks Publish Status / Draft toggle — fixed: "Save as Draft" and "Publish" buttons added to New Article dialog (`createNews(true/false)`)
- [x] **BUG-018** — Audit Log is empty — fixed: added DB triggers (`trg_audit_member_changes`, `trg_audit_role_assignments`, `trg_audit_verification_requests`) to auto-write audit entries; enhanced AuditsTab to display old/new values, actor, entity
- [x] **BUG-019** — Business & Jobs page crash corrupts React router state — fixed: prevented by global `ErrorBoundary` wrapping all `<Routes>`

---

## WCAG 2.2 AA Accessibility Issues

- [x] **WCAG-001** — Notifications `alt+T` shortcut not exposed as `aria-keyshortcuts` — fixed: Bell button in AppLayout header has `aria-keyshortcuts="alt+t"` and `aria-label`
- [x] **WCAG-002** — Icon-only buttons lack accessible labels — fixed: `aria-label` added to mobile menu button, sign-out button, Bell button, level-change arrows in MembersTab, all moderation action buttons
- [x] **WCAG-003** — Color contrast on badge text — fixed: verification levels use high-contrast color pairs (`text-primary` on `bg-primary/20`, `text-success` on `bg-success/20`, etc.)
- [x] **WCAG-004** — Verification level status conveyed only by color — fixed: badge has `role="status"` and `aria-label="Verification status: ..."` in Dashboard
- [x] **WCAG-005** — Modal/dialog focus trap — addressed: shadcn/ui `Dialog` uses Radix UI which implements ARIA-compliant focus trapping and returns focus on close natively
- [x] **WCAG-006** — Level-change arrow buttons in Admin Members table — fixed: `aria-label` added to Up/Down buttons in MembersTab

---

## Responsiveness

- [x] **RESP-001** — No mobile hamburger/collapsible sidebar — confirmed present: Sheet component in AppLayout provides full mobile slide-in sidebar with hamburger trigger (verified working)
- [x] **RESP-002** — Admin panel tab bar overflows horizontally on mobile — fixed: tabs wrapped in horizontally-scrollable `overflow-x-auto` container; shorter labels on mobile with `text-xs sm:text-sm`
- [x] **RESP-003** — Matrimonial profile creation form — addressed: form uses responsive grid (`sm:grid-cols-2`), tabs use `text-xs sm:text-sm`, icons hidden on mobile (`hidden sm:inline`)

---

## New User Stories (Missing Functionality)

- [x] **US-101** — Global Admin: Edit and Delete controls on each News article — implemented
- [x] **US-102** — Global Admin: Edit, Cancel, and Delete controls on each Event — implemented
- [x] **US-103** — Global Admin: Edit and Delete buttons on each Announcement — implemented
- [x] **US-104** — Global Admin: Admin list view of Matrimonial profiles with Approve/Reject/Flag — implemented: "Moderate" tab in Matrimonial page
- [x] **US-105** — Finance Admin / Global Admin: "Create Scholarship" button — implemented
- [x] **US-106** — Data Steward / Global Admin: "Upload Issue" button on Archives — implemented
- [x] **US-107** — Global Admin: Full L3/L4/L5 tier shown on Verification Settings — implemented: L3 "Senior" shown with admin-grant info card
- [x] **US-108** — Global Admin: "View Profile" and "Edit Member" per row in Admin Members list — implemented
- [x] **US-109** — Global Admin: Roles table shows Chapter Name — implemented
- [x] **US-110** — All users: Business & Jobs page loads without crashing — fixed via BUG-001
- [x] **US-111** — Global Admin: Audit log entries auto-created — implemented via DB triggers
- [x] **US-112** — Global Admin: Assign event to specific chapter — implemented
- [x] **US-113** — All users: Responsive mobile layout with collapsible sidebar — confirmed: Sheet-based hamburger sidebar present and working
- [x] **US-114** — Global Admin: "Save as Draft" option when creating News articles — implemented

---

## Niche Product Owner — Community Platform Recommendations

- [x] **US-115** — Gotra/Ekda conflict check in Matrimonial matching — implemented: `hasGotraConflict()` / `hasEkdaConflict()` helpers; amber warning banner shown on profile card when same Gotra or Ekda detected
- [x] **US-116** — Kuldevi (patron deity) heritage field on member profiles — implemented: Kuldevi input field added to Profile edit form and view section; saved to `members.kuldevi` column
- [x] **US-117** — Parivar (Family Tree) linking — implemented: Profile "Family" section relabeled "Parivar (Family Tree)" with improved visual tree display showing relation badges and member avatars
- [x] **US-118** — Vouch lineage transparency — implemented: "Vouch Lineage" section added to VerificationCenter showing voucher name, initials, and trust level badge
- [x] **US-119** — Samiti/Mandal sub-group management — implemented: new `samiti_groups` + `samiti_members` tables; "Samiti" tab added to Admin panel with create/delete sub-groups per chapter
- [x] **US-120** — Panchang-aware calendar on Dashboard — implemented: "Panchang — Auspicious Dates" widget added to Dashboard showing upcoming Hindu festivals and auspicious dates for current + next 2 months
- [x] **US-121** — Formal Rishta request flow — implemented: Heart button on each matrimonial profile opens Rishta dialog with family contact name/phone fields; stored in `rishta_requests` table
- [x] **US-122** — Diaspora "Overseas Verified" tier — implemented: informational card in VerificationCenter explains NRI tier; `overseas_verified` column added to members; badge shown if active
- [x] **US-123** — Tiered Donor Wall with "Dharmaada Patron" recognition — implemented: Donor Wall on Temple page enhanced with "Maha Patron" (₹1L+) / "Dharmaada Patron" (₹10K+) / "Donor" tiers; gold/primary/muted color coding; jewel gradient header
- [x] **US-124** — Oral History elder priority queue — implemented: `elder_priority` auto-set on upload if narrator is 70+; "Param Pujaniya" gold badge shown on cards; "Param Pujaniya" filter button; elder recordings sorted to top by default
- [x] **US-125** — Chapter detail page shows phone, email, and URL contact info — implemented: `ChapterDetail.tsx` extracts `settings.contact.{phone, email, url}` and renders clickable tel/mailto/external links in hero section; migration `add_phone_url_to_chapter_settings` seeded all 9 chapters with phone + URL
- [x] **US-126** — World geography: all countries, states/provinces, and major cities seeded — implemented: 197 countries (ISO 3166-1), 325 states/provinces, 151 cities, 195 city_codes via migrations `seed_world_geography_countries`, `seed_world_geography_states_v2`, `seed_world_geography_cities_and_codes`
- [x] **US-127** — Stateless country support in all location dropdowns — implemented: `useHasStates(countryId)` hook checks if a country has states; `useCitiesByCountry(countryId)` fetches cities directly for stateless countries; all 5 location-picker forms (Search, Business, Events, News, Admin EventsTab) conditionally hide the State dropdown and enable City directly when a stateless country is selected (e.g. Singapore, Bahrain, Malta)
