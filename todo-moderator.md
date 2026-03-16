# Moderator Role — Bug Fixes & User Stories

**Persona:** Moderator (Pooja Verma, Ahmedabad Chapter, L2 Verified)
**Login:** moderator@test.khandelwal.org
**Completed:** 2026-03-16

---

## Bug Fixes

| # | Bug | Status | Resolution |
|---|-----|--------|------------|
| B-001 | Settings Page Empty — Only shows "Go Back" and "Refresh Page" | ✅ DONE | `src/pages/Settings.tsx` rebuilt with 4 tabs: Notifications (with `notification_preferences` table upsert), Privacy (field-level JSONB controls), Verification Center (`VerificationCenter` component), Consent Center (`ConsentCenter` component). Password change via `supabase.auth.updateUser`. |
| B-002 | Dashboard "View All" for Events shows 0 items | ✅ DONE | `src/pages/Dashboard.tsx` queries `events` filtered by `status = 'published'` and `starts_at >= now()`. Events navigation button points to `/events`. Seed data includes published events with future dates. |
| B-003 | Member Profile Links Don't Work | ✅ DONE | `src/pages/Directory.tsx` wraps each member card in `<Link to={/member/${m.id}}>`. `src/pages/MemberProfile.tsx` handles the route `/member/:id` with full profile details. |
| B-004 | Scholarships Empty — Shows "Available (0)" | ✅ DONE | `src/pages/Scholarships.tsx` queries `scholarships` with `.eq("status", "active")`. Migration `20260316031349_seed_scholarships_archives_v2.sql` seeds 4 active scholarships: Khandelwal Merit, Vyapaar Vikas, Women Empowerment Award, Global Diaspora Grant. |
| B-005 | Archives Empty — Both tabs show 0 items | ✅ DONE | `src/pages/Archives.tsx` uses correct tables: `magazine_issues` (Khadayata Jyoti tab) and `book_pages` (History Book tab). Migration seeds 5 magazine issues and 6 history book pages. |
| B-006 | Notifications Panel Empty | ✅ DONE | `src/components/NotificationsPanel.tsx` fetches from `notifications` table, renders title + description + timestamp, supports mark-read / mark-all-read. Seed migration adds 5 notifications for the moderator account (2 unread, 3 read). |

---

## WCAG 2.2 AA Issues

| # | Issue | Status | Resolution |
|---|-------|--------|------------|
| W-001 | 7 form inputs without proper ARIA labels | ✅ DONE | All search inputs use `<label htmlFor="...">` with `.sr-only` class. Select dropdowns use `aria-label` attributes. Directory, Archives, Events, Business pages all updated. |
| W-002 | No skip navigation links | ✅ DONE | `src/components/AppLayout.tsx` includes `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>` as first child of layout. |
| W-003 | No search landmark | ✅ DONE | All search areas wrapped in `<div role="search" aria-label="...">`. Applied to Directory, Archives, Events, Business, News, and Search pages. |
| W-004 | Missing footer/contentinfo landmark | ✅ DONE | `AppLayout.tsx` includes `<footer role="contentinfo" className="sr-only">KhadayataOnline — Khandelwal Heritage Directory</footer>`. Header uses `role="banner"`, main uses `role="main"` with `id="main-content"` and `tabIndex={-1}`. |

---

## User Stories

| # | Story | Role | Status | Implementation |
|---|-------|------|--------|----------------|
| US-001 | Dedicated Moderation Dashboard | Moderator | ✅ DONE | `src/pages/ModeratorDashboard.tsx` + `src/components/admin/VerificationDashboard.tsx`. Shows pending member onboarding, verification requests, tag requests, matrimonial reviews, oral history uploads. `src/pages/Admin.tsx` exposes 13 tabs: Reports, Members, Announcements, Events, News, Analytics, Roles, Tags, Samiti, Finance, Verification, Transfers, Audits. |
| US-002 | Verification levels in directory with verify/unverify | Moderator | ✅ DONE | `src/pages/MemberProfile.tsx` + `src/components/admin/MembersTab.tsx` show verification level badges. Moderators update `verification_level` via Members tab. `verification_requests` table tracks level-up requests. `VerificationDashboard` lists pending requests with Review links. |
| US-003 | Create/edit events | Moderator | ✅ DONE | `src/components/admin/EventsTab.tsx` in Admin panel provides full CRUD with dialog forms. Fields: title, datetime, venue, description, status, max_attendees, cover_image_url, category. Gated by `canManageEvents` permission. |
| US-004 | Post news articles and announcements | Moderator | ✅ DONE | `src/components/admin/NewsPublisherTab.tsx` for news articles. `src/components/admin/AnnouncementsTab.tsx` for chapter announcements. Both support create/edit/delete with status controls. Gated by `canPublishNews` and `isAnyAdmin`. |
| US-005 | Export member directory as CSV | Moderator | ✅ DONE | `src/pages/Directory.tsx` includes CSV export button (gated on `canExportDirectory`). Generates comma-separated data from current filtered member list with filename `khadayata-directory.csv`. |
| US-006 | Analytics dashboard | Moderator | ✅ DONE | `src/components/admin/AdminStats.tsx` shows total members, chapters, events, news count. Analytics tab in Admin panel includes 6-month member registration trend chart. `AuditsTab` shows full audit log. |
| US-007 | Settings page — full functionality | User | ✅ DONE | `src/pages/Settings.tsx`: (1) Notifications tab — email/WhatsApp/push toggles via `notification_preferences` table; (2) Privacy tab — per-field privacy levels (public/members/chapter/private) stored as JSONB on `members.privacy`; (3) Verification tab — `VerificationCenter` component for level-up requests; (4) Password change via Supabase Auth `updateUser`. |
| US-008 | Member profiles viewable with full details | User | ✅ DONE | `src/pages/MemberProfile.tsx` shows bio, contact info (privacy-gated), employment, education, chapter, verification level, QR code (`QRCodeDisplay`), family connections, and report button. `src/components/AvatarUpload.tsx` handles profile photos. |
| US-009 | Scholarships with application forms | User | ✅ DONE | `src/pages/Scholarships.tsx`: Browse tab shows active scholarships with deadline badges, amount, eligibility. Apply dialog has essay textarea. My Applications tab tracks submitted applications with status (pending/approved/rejected). Admins can create new scholarships. |
| US-010 | Archives — downloadable PDFs | User | ✅ DONE | `src/pages/Archives.tsx`: Khadayata Jyoti tab shows `magazine_issues` with PDF download links (opens in new tab). History Book tab shows `book_pages` with OCR text. Heritage tagging via `HeritageTagging` component. Oral History link to `/oral-history`. |
| US-011 | Notifications panel with click actions | User | ✅ DONE | `src/components/NotificationsPanel.tsx`: Bell icon with unread count badge. Panel lists notifications with icon, title, description, relative timestamp. Click marks as read. Mark All Read button. Auto-refetch every 30 seconds. |
| US-012 | RSVP functionality | User | ✅ DONE | `src/pages/Events.tsx` uses `event_rsvps` table with upsert (member_id, event_id, status). Cancellation supported. RSVP count shown per event. Confirmation toast on success. |
| US-013 | Donation receipts with 80G tax certificate | Donor | ✅ DONE | `src/pages/Temple.tsx` handles donations. `src/components/admin/FinanceTab.tsx` shows donation history. `receipts` table stores 80G certificate links. Donation form supports amount, fund selection, and payment reference. |
| US-014 | Business & Jobs filtering | User | ✅ DONE | `src/pages/Business.tsx`: Tab-based view for Businesses and Jobs. Filters by category, city, and verification status. Search by name. Business details dialog with contact info and report button. Jobs show salary range, employment type. |
| US-015 | Matrimonial — browse profiles | Matrimonial User | ✅ DONE | `src/pages/Matrimonial.tsx`: Browse tab shows all verified profiles with match % scores. `SearchFilters` component for gotra, gender, age range, height, education, occupation, city. Profile detail dialog with full bio. Send introduction messages. Own profile management (create/edit). Moderator review panel. |
| US-016 | Gotra filtering in matrimonial search | Community Member | ✅ DONE | `SearchFilters` component includes gotra dropdown. `hasGotraConflict()` and `hasEkdaConflict()` functions in `src/components/matrimonial/constants.ts` flag incompatible matches with warning icons on profile cards. |
| US-017 | Family tree connections with privacy controls | Community Member | ⚠️ DEFERRED | `families` and `family_links` tables exist in schema. `FamilyInviteDialog` component exists at `src/components/profile/FamilyInviteDialog.tsx`. Full interactive family tree visualization (D3/react-flow) deferred — backend data model in place; frontend tree view is out of current scope. |
| US-018 | Elders Council digital forum with voting/polling | Community Elder | ⚠️ DEFERRED | No dedicated Elders Council table or forum feature. Would require new `council_threads`, `council_votes` tables and a separate forum UI. Deferred to next milestone. |
| US-019 | WhatsApp integration for alerts | Chapter Member | ⚠️ DEFERRED | `whatsapp_templates` and `whatsapp_messages` tables exist. `supabase/functions/send-whatsapp/index.ts` edge function is deployed. Frontend admin trigger UI not yet built. WhatsApp API credentials must be configured separately. |
| US-020 | Sakha Verification badge via elder endorsement | Member | ⚠️ DEFERRED | `verification_requests` table handles level-up requests. Elder endorsement workflow (where an L4/L5 member endorses another) requires additional UI in MemberProfile and RLS policy changes. Deferred. |
| US-021 | Automated content flagging based on keywords | Moderator | ⚠️ DEFERRED | Manual reporting via `src/components/ReportDialog.tsx` is fully working. Automatic keyword-based flagging requires a database trigger or edge function. Deferred — manual moderation covers the immediate need. |
| US-022 | Kuldevi/Kuldevta section in profiles | Member | ✅ DONE | `kuldevi` field on `members` table. Shown in `MemberProfile.tsx` and editable in `Onboarding.tsx` and `Profile.tsx`. Matrimonial profile also exposes kuldevi. |
| US-023 | Rishta recommendation with family approval workflow | Member | ⚠️ DEFERRED | Match scoring (`matchScore()`) implemented in matrimonial constants. Introduction messages supported. Full approval workflow with family sign-off, sub-caste rules, and multi-step state machine is deferred. |
| US-024 | SMS alerts for urgent announcements | Chapter Admin | ⚠️ DEFERRED | Not implemented. Requires Twilio/MSG91 integration and API credentials. `whatsapp_messages` table exists but SMS-specific integration is out of current scope. |
| US-025 | Community Help for medical/financial emergencies | Member | ✅ DONE | `src/pages/EmergencyContacts.tsx` for emergency contacts. `medical_aid_requests` table with admin review in `FinanceTab` (Medical Aid sub-tab). Hall booking via `hall_bookings`. Finance panel shows pending/approved requests filterable by chapter. |

---

## Sign-off Checklist

- [x] All 6 bugs fixed and verified — seed data migrations applied, components rebuilt
- [x] All 4 WCAG 2.2 AA issues resolved — skip nav, landmarks, ARIA labels, search roles
- [x] US-001 through US-016 implemented and working
- [x] US-022 and US-025 implemented and working
- [x] US-017, 018, 019, 020, 021, 023, 024 deferred with documented reasoning (backend infrastructure in place where applicable)
- [x] Build passes — `npm run build` succeeds with 2166+ modules
- [x] `docs/dbschema.md` updated — full schema including samiti_groups, funds, receipts, magazine_issues, book_pages, verification_requests, families, family_links, whatsapp_templates, whatsapp_messages, notification_preferences
- [x] `docs/api.md` updated — Edge Functions (generate-global-id, send-whatsapp), RPC functions, Storage Buckets, Moderator and Finance Admin query patterns
- [x] Seed migrations applied: geography, chapters, test users, roles, members, events, news, businesses, matrimonial, scholarships (4 active), magazine issues (5), book pages (6), notifications (5 for moderator)

---

## Deferred Items Summary

8 user stories are deferred. Backend infrastructure is partially in place for most:

| Story | Reason for Deferral | Backend Ready |
|-------|---------------------|---------------|
| US-017 Family Tree | Needs D3/react-flow visualization; tables exist | `families`, `family_links` tables ✅ |
| US-018 Elders Council | Needs new forum/polling tables and separate UI | Schema not yet created |
| US-019 WhatsApp Frontend | Edge function deployed; needs admin trigger UI + API credentials | Edge function + tables ✅ |
| US-020 Sakha Verification | Needs L4/L5 endorsement UI + RLS policy update | `verification_requests` ✅ |
| US-021 Auto-flagging | Needs DB trigger or edge function | Manual reporting ✅ |
| US-023 Rishta Workflow | Match scoring done; needs family approval state machine | Introductions partial ✅ |
| US-024 SMS Alerts | Needs Twilio/MSG91 API integration and credentials | Schema not yet created |
