# POV: Chapter Navigation & Discoverability for Non-Admin Members

## Problem Statement

As a non-admin member (Aman Shah, `aman.waterloo@gmail.com`, New York USA Chapter, L1 verification), chapter-related features were invisible:

- No link in the sidebar to the member's own chapter page
- Dashboard showed global content, not chapter-scoped events/news
- Profile showed the chapter name as plain text, not clickable
- Directory defaulted to "All Chapters" — member had to manually find their chapter each visit
- Events page showed all events globally with no chapter filter
- Event photo galleries were buried with no indicator that photos existed

A full-featured chapter detail page already existed at `/chapters/:slug` with tabs for Committee, Members, News, Events, Businesses, Jobs, Gallery, and History — but it was unreachable from the signed-in member experience.

## Root Cause

Discoverability gap. The chapter infrastructure (hooks, page, data) was complete, but no navigation paths connected signed-in members to their own chapter content.

## Changes Made

### 1. New Utility Module: `src/lib/chapter-nav-utils.ts`

Pure, framework-agnostic functions with 24 unit tests:

| Function | Purpose |
|---|---|
| `resolveChapterSlug(chapters, chapterId)` | Given a chapter_id and list of chapters, returns the slug for navigation |
| `mergeChapterFirst(chapterItems, globalItems, limit)` | Merges chapter-scoped items first, then fills with global items up to a limit, deduplicating by ID |
| `defaultChapterFilter(memberChapterId, isGlobalAdmin)` | Returns the default chapter filter value — member's own chapter for regular members, "all" for Global Admins or members without a chapter |
| `filterByChapter(items, chapterFilter)` | Filters a list of chapter-scoped items by a chapter filter value; "all" returns everything |

### 2. Sidebar Navigation: "My Chapter" Link (`AppLayout.tsx`)

- Added a "My Chapter" nav item in the Community section
- Resolves the member's chapter slug via a lightweight query and links to `/chapters/:slug`
- Hidden entirely for members without a chapter (graceful degradation)
- Active state highlights when viewing the chapter page

### 3. Dashboard: Chapter Hub Card + Chapter-Scoped Content (`Dashboard.tsx`)

- **My Chapter hub card**: prominent card at the top of the Dashboard showing chapter name and upcoming event count, linking to the chapter detail page
- **Find your chapter prompt**: for members without a chapter, a dashed-border card with a "Browse" button linking to the chapters listing
- **Chapter-scoped events**: Upcoming Events card now shows the member's chapter events first, filling with global events if fewer than 3 chapter events exist (deduplicated)
- **Chapter-scoped news**: Latest News card now shows chapter news first, filling with global news if fewer than 3 chapter articles exist
- **Clickable chapter name**: the chapter name in the welcome banner is now a link

### 4. Profile: Clickable Chapter Links (`Profile.tsx`)

- Chapter name in the profile header is now a clickable link to the chapter detail page
- Chapter name on the Digital Member Card is also clickable
- For members without a chapter, links to the chapters listing page instead
- Edit mode chapter selector dropdown remains unchanged

### 5. Directory: Default to Member's Chapter (`Directory.tsx`)

- Chapter filter dropdown defaults to the member's own chapter on first load
- Global Admins default to "All Chapters" (they manage across chapters)
- Members without a chapter default to "All Chapters"
- Manual filter selection is preserved during the session

### 6. Events: Chapter Filter + Gallery Discoverability (`Events.tsx`)

- **Chapter filter dropdown**: added at the top of the Events page, defaulting to the member's own chapter for non-admins and "All Chapters" for Global Admins
- **Filtered counts**: Upcoming and Past tab labels show filtered event counts
- **Photo count badges**: past event cards now show a camera icon badge with photo count when photos exist, making galleries discoverable at a glance

---

## Role-by-Role Audit Matrix

| Capability | Regular Member (Aman) | Chapter Admin | Committee Member | Global Admin |
|---|---|---|---|---|
| "My Chapter" in sidebar | Yes (linked to own chapter) | Yes | Yes | Yes (linked to own chapter if assigned) |
| Dashboard chapter hub card | Yes | Yes | Yes | Yes |
| Dashboard chapter-scoped events | Chapter events first | Chapter events first | Chapter events first | All events (no chapter filter unless assigned) |
| Dashboard chapter-scoped news | Chapter news first | Chapter news first | Chapter news first | All news |
| Profile chapter link | Clickable → chapter page | Clickable | Clickable | Clickable |
| Directory default filter | Own chapter | Own chapter | Own chapter | All Chapters |
| Events default filter | Own chapter | Own chapter | Own chapter | All Chapters |
| Event photo count badges | Yes | Yes | Yes | Yes |
| Chapter detail page access | Via sidebar, dashboard, profile | Same + admin tabs | Same | Same + all admin features |
| No chapter assigned | "Find your chapter" prompts, no sidebar link, filters default to All | Same | Same | N/A (always has access) |

---

## Before/After for Aman Shah (L1, New York USA Chapter)

### Before

1. **Sidebar**: No chapter-related link. Aman could not find his chapter page.
2. **Dashboard**: Showed global events and news from all chapters. No indication of his New York chapter.
3. **Profile**: Chapter name displayed as "New York USA Chapter" in plain text — not clickable.
4. **Directory**: Showed all members from all chapters. Aman had to manually select "New York USA Chapter" from a dropdown each visit.
5. **Events**: Showed all events globally. No way to filter to New York events. Past events showed no indication of whether photos existed.
6. **Chapter page**: Existed at `/chapters/new-york` but Aman had no way to discover this URL.

### After

1. **Sidebar**: "My Chapter" link in the Community section, directly linking to `/chapters/new-york`.
2. **Dashboard**: "My Chapter" hub card at the top showing "New York USA Chapter" with upcoming event count. Events and news cards show New York chapter content first.
3. **Profile**: Chapter name is a clickable link navigating to the chapter page.
4. **Directory**: Automatically filters to New York USA Chapter members on first load. Aman can switch to "All Chapters" via the dropdown.
5. **Events**: Defaults to New York chapter events. Chapter filter dropdown allows switching to "All Chapters". Past events show photo count badges.
6. **Chapter page**: Reachable from 4 places — sidebar, dashboard hub card, profile link, and dashboard welcome banner.

---

## Manual Validation Steps

### Aman Shah (Regular Member, New York)

1. Log in as `aman.waterloo@gmail.com`
2. **Sidebar**: Verify "My Chapter" appears in Community section and links to `/chapters/new-york`
3. **Dashboard**: Verify "My Chapter" hub card shows "New York USA Chapter" with upcoming event count
4. **Dashboard**: Verify Upcoming Events shows New York events first (if any exist)
5. **Dashboard**: Verify Latest News shows New York news first (if any exist)
6. **Dashboard**: Click chapter name in welcome banner — should navigate to chapter page
7. **Profile**: Verify chapter name is a clickable link — click it, should navigate to chapter page
8. **Profile**: Verify Digital Member Card chapter name is clickable
9. **Directory**: Verify page loads with New York USA Chapter pre-selected in filter
10. **Directory**: Switch to "All Chapters" — verify all members appear
11. **Events**: Verify chapter filter defaults to New York USA Chapter
12. **Events**: Switch to "All Chapters" — verify all events appear
13. **Events → Past tab**: Verify past events with photos show a camera badge with count

### Member Without a Chapter

1. Log in as a member with no chapter assigned
2. **Sidebar**: Verify "My Chapter" link is NOT visible
3. **Dashboard**: Verify "Find your chapter" prompt card appears with Browse button
4. **Dashboard**: Verify events and news show global content (no chapter filter)
5. **Profile**: Verify chapter name links to `/chapters` listing page
6. **Directory**: Verify filter defaults to "All Chapters"
7. **Events**: Verify filter defaults to "All Chapters"

### Global Admin

1. Log in as Global Admin
2. **Directory**: Verify filter defaults to "All Chapters"
3. **Events**: Verify filter defaults to "All Chapters"
4. **Dashboard**: Verify chapter hub card shows admin's own chapter (if assigned)
5. **Sidebar**: Verify "My Chapter" link appears if admin has a chapter_id

---

## Regression Checklist

| Check | Status |
|---|---|
| All 410 existing tests pass | Verified |
| 24 new chapter-nav-utils tests pass | Verified |
| TypeScript type check passes | Verified |
| Production build succeeds | Verified |
| Admin navigation tests pass (16 tests) | Verified |
| Authorization tests pass (26 tests) | Verified |
| Admin user stories tests pass (58 tests) | Verified |
| Chapter admin assign tests pass (30 tests) | Verified |
| Members filter tests pass (15 tests) | Verified |
| Single chapter admin tests pass (10 tests) | Verified |
| Role assignment tests pass (18 tests) | Verified |
| No existing imports broken | Verified |
| No existing routes changed | Verified |
| No database schema changes | Verified |
| No RLS policy changes | Verified |

---

## Technical Details

### Files Created

- `src/lib/chapter-nav-utils.ts` — Pure utility functions for chapter navigation
- `src/test/chapter-nav-utils.test.ts` — 24 unit tests (TDD)

### Files Modified

- `src/components/AppLayout.tsx` — "My Chapter" sidebar link with dynamic slug resolution
- `src/pages/Dashboard.tsx` — Chapter hub card, chapter-scoped events/news, clickable chapter name
- `src/pages/Profile.tsx` — Clickable chapter name in header and digital member card
- `src/pages/Directory.tsx` — Default chapter filter to member's chapter
- `src/pages/Events.tsx` — Chapter filter dropdown, default to member's chapter, photo count badges

### Test-Driven Development

Tests were written first for the utility functions, covering:
- Chapter slug resolution (6 tests: happy path, null, undefined, empty list, not found)
- Content merging with chapter-first priority (10 tests: ordering, limit, dedup, edge cases)
- Default filter logic (5 tests: regular member, global admin, no chapter, undefined chapter)
- Chapter-based filtering (4 tests: all filter, specific chapter, no match, null chapter_id)

All tests pass before and after UI changes, confirming no regressions.
