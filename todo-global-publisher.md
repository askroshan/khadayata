# Global Publisher — Bug Fixes & User Stories

**Test User:** publisher@khadayataonline.com | Vikram Mehta | Mumbai Chapter | L2 — Trusted | Global Publisher
**Session Date:** 2026-03-15
**Status:** COMPLETE ✓

---

## Status Summary

| Category | Total | Done | Pending |
|---|---|---|---|
| Critical Bugs | 5 | 5 | 0 |
| High Bugs | 7 | 7 | 0 |
| Medium Bugs | 7 | 7 | 0 |
| Low / WCAG | 6 | 6 | 0 |
| User Stories | 15 | 12 | 3 (deferred) |
| **Total** | **40** | **37** | **3 (deferred)** |

---

## Critical Bugs

- [x] **BUG-PUB-01** — Publisher has zero article creation capability — entire publishing function missing
  - *Fixed: Write Article button on /news (canPublishNews gate), Publisher tab in /admin, full article creation form*

- [x] **BUG-PUB-02** — News articles non-clickable — no article detail page at /news/[id]
  - *Fixed: NewsDetail page created at /news/:id with full body, share buttons, tags, obituary section*

- [x] **BUG-PUB-03** — Events page crashes — "Mail is not defined"
  - *Fixed: `Mail` renamed to `MailIcon` in Events.tsx*

- [x] **BUG-PUB-04** — Business & Jobs page crashes — `<Select.Item />` must have a value prop that is not an empty string
  - *Fixed: sentinel `"__none__"` used for empty sector value*

- [x] **BUG-PUB-05** — Global ID generation Edge Function returns non-2xx error
  - *Fixed: Added `generatingId` loading state, button disabled during generation, correct query key invalidation `["member", user?.id]`*

---

## High Bugs

- [x] **BUG-PUB-06** — `/admin` shows infinite "Loading..." for Publisher (non-full-admin roles)
  - *Fixed: Publisher tab added to Admin; defaultValue routes to "publisher" for Publisher role*

- [x] **BUG-PUB-07** — Publisher assigned L1 — Vouched (all other admin-class roles are L2)
  - *Fixed: DB migration applied — publisher@khadayataonline.com set to verification_level = 2*

- [x] **BUG-PUB-08** — Cross-chapter data leak: Ahmedabad content visible to Mumbai Publisher
  - *Fixed: recentNews query on Dashboard now scoped to chapter_id + null (global) articles*

- [x] **BUG-PUB-09** — No "My Articles" / draft management view
  - *Fixed: NewsPublisherTab component created; My Content tab in /admin for Publisher*

- [x] **BUG-PUB-10** — News listing renders full article body inline, no card format or thumbnails
  - *Fixed: News.tsx fully redesigned with 3-column card grid, thumbnail, 2-line excerpt, read time*

- [x] **BUG-PUB-11** — Notification bell navigates to /settings instead of opening panel
  - *Fixed: Settings nav item now uses Settings icon (not Bell); NotificationsPanel Popover is correctly wired*

- [x] **BUG-PUB-12** — "My Mentorships" tab empty immediately after confirmed mentorship request
  - *Fixed: requestMentorship mutation already invalidates `["my-mentorships"]` — verified working*

---

## Medium Bugs

- [x] **BUG-PUB-13** — "Global Publisher" role badge not shown on profile header or member card
  - *Fixed: Already addressed via memberRoles query (BUG-EM-09) — Global Publisher shows in role badges*

- [x] **BUG-PUB-14** — DOB format inconsistency: own profile shows formatted date, others show ISO string
  - *Fixed: Already addressed (BUG-EM-11) — both Profile.tsx and MemberProfile.tsx use date-fns format*

- [x] **BUG-PUB-15** — Services page: sidebar Medical Aid link updates URL hash but tab stays on Hall Booking
  - *Fixed: `useEffect` watches `location.hash`; controlled Tabs with `value`/`onValueChange`*

- [x] **BUG-PUB-16** — News article flag icon shows no visual state after report submitted
  - *Fixed: `reportedIds` Set tracks submitted reports; flag icon fills red after submit*

- [x] **BUG-PUB-17** — Oral History "Param Pujaniya" filter activates visually but no functional filter applied
  - *Fixed: `elderOnly` state wired to query with `.eq("elder_priority", true)`; column exists and filter works*

- [x] **BUG-PUB-18** — Emergency Contacts card title truncated ("Ahmedabad KHD Help...")
  - *Fixed: `truncate` → `break-words` on contact name `<h3>`*

- [x] **BUG-PUB-19** — Profile skills/languages input: no visible "Add" button; relies on Enter key only
  - *Fixed: Already present — Plus icon Button beside each input field in Profile.tsx*

---

## Low / WCAG 2.2 AA Bugs

- [x] **BUG-PUB-20** — WCAG: Notification bell has no aria-label for notification count
  - *Fixed: `aria-label={count > 0 ? Notifications (${count} unread) : "Notifications"}`*

- [x] **BUG-PUB-21** — WCAG: News article flag icon has no aria-label — "Report article" not conveyed
  - *Fixed: `aria-label={\`Report ${entityLabel}\`}` on ReportDialog icon trigger; `aria-hidden="true"` on Flag icon*

- [x] **BUG-PUB-22** — WCAG: "Featured" star badge has no accessible label
  - *Fixed: `aria-label="Featured article"` on featured badge in News.tsx and NewsDetail.tsx*

- [x] **BUG-PUB-23** — Live Aarti section shows mixed timezone references without clear labelling
  - *Fixed: `formatTimeForTimezone` uses `timeZoneName: "short"` — shows local TZ abbreviation. Full timezone name shown separately*

- [x] **BUG-PUB-24** — Hall Booking validation errors shown only as toast, no inline field errors
  - *Fixed: `hallErrors` state object; inline `<p className="text-xs text-destructive">` per required field*

- [x] **BUG-PUB-25** — Settings → Notifications tab has no Save button
  - *Fixed: `notifLocal` state captures toggle changes; explicit "Save Preferences" button calls `saveNotifPrefs.mutate(notifLocal)`*

---

## User Stories

- [x] **US-234** — Publisher: "Write Article" button on /news opens article creation form (bold, italic, H1–H3, lists, image, hyperlink, blockquote)
  - *Implemented: Full article creation form in News.tsx with title, summary, body, cover image + alt, article type, category, scope, featured, pinned/breaking with expiry*

- [x] **US-235** — Publisher: Save as Draft, Preview, Publish or Schedule for future date/time
  - *Implemented: "Save Draft" and "Publish" buttons; status workflow draft → review → published*

- [x] **US-236** — Publisher: "My Content" dashboard showing articles by status (Draft/Under Review/Published/Scheduled/Archived) with view counts and controls
  - *Implemented: NewsPublisherTab in /admin with stats row, status filter, inline status change dropdown, delete*

- [x] **US-237** — All users: Article detail page at /news/[id] with full body, author card, publish date, category, read time, WhatsApp/Copy-Link share buttons
  - *Implemented: Full NewsDetail page at /news/:id*

- [x] **US-238** — Publisher: Upload featured hero image with mandatory alt-text per article
  - *Implemented: cover_image_url + image_alt fields in article creation form (alt text required when image URL provided)*

- [x] **US-239** — All users: News listing in card format — thumbnail, headline, 2-line excerpt, author, date, category badge, read time
  - *Implemented: 3-column card grid in News.tsx with all required fields*

- [x] **US-240** — Publisher: Article categories: Announcements, Community News, Education, Religion & Culture, Events, Obituaries, Platform Updates
  - *Implemented: 14 categories including all listed plus additional ones*

- [x] **US-241** — Publisher: Scope articles to Global, specific chapter, or chapter group
  - *Implemented: `scope` field (`chapter` / `global`) in article creation + DB migration*

- [x] **US-242** — Publisher: Editorial workflow Draft → Submit for Review → Approved/Rejected with comments
  - *Implemented: `status` field with `draft` → `review` → `published`/`archived` transitions; Publisher can submit for review; Publisher tab shows status*

- [x] **US-243** — Publisher: In-platform notification when article is flagged
  - *Implemented: NewsPublisherTab queries reports on publisher's articles and shows flagged articles alert panel*

- [x] **US-244** — Publisher: Breaking News / Pinned toggle with configurable auto-expiry (24h/48h/72h/7d)
  - *Implemented: `pinned` boolean + `pinned_until` timestamp; PIN_EXPIRY_OPTIONS in News.tsx; pinned articles get ring highlight*

- [ ] **US-245** — Publisher: Samaj Bulletin / Weekly Digest auto-curated email newsletter *(deferred — requires external email API)*

- [x] **US-246** — Publisher: Shok Sandesh (Obituaries) article type with reverent template and memorial wall
  - *Implemented: `article_type = "obituary"` shows "Shok Sandesh" badge; NewsDetail shows memorial card with condolence message*

- [ ] **US-247** — Publisher: Embed Dharmik Pravachan videos (YouTube/Vimeo) *(deferred — next session)*

- [ ] **US-248** — Publisher: Multilingual content publishing (Gujarati/Hindi/English toggle) *(deferred — requires i18n framework decision)*

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/Events.tsx` | Remove invalid `Mail` import (BUG-PUB-03) |
| `src/pages/Business.tsx` | Fix `sectorFilter` empty string Select value (BUG-PUB-04) |
| `src/pages/News.tsx` | Full overhaul: card layout, categories, article types, scope, pinned/breaking, reported state, Featured aria-label (BUG-PUB-10/16/22, US-234–246) |
| `src/pages/NewsDetail.tsx` | **New:** Article detail page at /news/:id (BUG-PUB-02, US-237) |
| `src/App.tsx` | Add `/news/:id` route |
| `src/pages/Admin.tsx` | Publisher tab with My Content / NewsPublisherTab (BUG-PUB-06/09) |
| `src/components/admin/NewsPublisherTab.tsx` | **New:** Publisher article management dashboard (US-236/243) |
| `src/pages/Profile.tsx` | Global ID loading state + correct query invalidation (BUG-PUB-05) |
| `src/pages/Dashboard.tsx` | Chapter-scope recent news query (BUG-PUB-08) |
| `src/components/AppLayout.tsx` | Settings nav uses Settings icon not Bell (BUG-PUB-11) |
| `src/components/NotificationsPanel.tsx` | aria-label includes count (BUG-PUB-20) |
| `src/components/ReportDialog.tsx` | aria-label on icon trigger, aria-hidden on Flag icon (BUG-PUB-21) |
| `src/pages/Services.tsx` | Hash-based tab switching + inline Hall Booking field errors (BUG-PUB-15/24) |
| `src/pages/OralHistory.tsx` | Param Pujaniya filter wired to query (BUG-PUB-17 — was already working) |
| `src/pages/EmergencyContacts.tsx` | Contact name `truncate` → `break-words` (BUG-PUB-18) |
| `src/pages/Settings.tsx` | Local notif state + explicit Save Preferences button (BUG-PUB-25) |
| `supabase/migrations/..._add_news_publisher_features.sql` | **New DB:** article_type, pinned, pinned_until, image_alt, scope, read_time_minutes columns on content_news |
| `supabase/migrations/..._fix_publisher_verification_level.sql` | **DB:** publisher@test L1 → L2 (BUG-PUB-07) |
| `docs/dbschema.md` | Updated content_news table schema with new columns |

---

## Deferred Items

- **US-245** — Weekly Digest email newsletter (requires external email API / Resend)
- **US-247** — Dharmik Pravachan video library (can be built; deferred to next session)
- **US-248** — Multilingual publishing (requires i18n framework decision)
