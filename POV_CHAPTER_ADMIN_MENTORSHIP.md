# POV — Chapter Admin Role Lookup & Global ID Chapter Requirement

## Date: 2026-08-02

---

## Issue 1: "Chapter Admin Role Not Found" When Assigning Rushik

### Problem

On the Admin > Chapters tab, after the previous fix (which made the mutation
fetch the role ID if not yet loaded), the system now throws "Chapter Admin
role not found" when trying to assign Rushik as Chapter Admin for Ahmedabad.

**Reproduction**: Select Ahmedabad Chapter, search "rushik", select the
member, click assign → error: "Chapter Admin role not found".

### Root Cause

The `roles` table has a `UNIQUE(chapter_id, name)` constraint. "Chapter
Admin" is a **chapter-scoped** role — there is one row per chapter:

| id | chapter_id | name |
|----|------------|------|
| a0100010-... | Ahmedabad | Chapter Admin |
| a0100012-... | Mumbai | Chapter Admin |

Both the `useQuery` and the mutation fallback query used:

```ts
.from("roles")
.select("id")
.eq("name", "Chapter Admin")
.maybeSingle()
```

This query matches **multiple rows** (one per chapter). Supabase's
`maybeSingle()` errors when more than one row is returned, causing `data`
to be `null` — hence "Chapter Admin role not found".

### Fix

Both queries now filter by `chapter_id` alongside the name:

```ts
.from("roles")
.select("id")
.eq("name", "Chapter Admin")
.eq("chapter_id", inviteChapter.id)   // <-- added
.maybeSingle()
```

This returns exactly one row — the "Chapter Admin" role for the specific
chapter being managed.

The `useQuery` key was also updated to include the chapter ID so the cache
invalidates correctly when switching between chapters:

```ts
queryKey: ["chapter-admin-role-id", inviteChapter?.id]
```

### Tests (TDD)

**File**: `src/test/chapter-admin-assign.test.ts`
**Section**: "Chapter Admin Role Lookup: Chapter-Scoped Query" — 5 tests

| Test | Description |
|------|-------------|
| returns null when querying by name only | Proves unscoped query fails with multiple rows |
| returns the correct role when querying by name AND chapter_id | Proves scoped query succeeds |
| returns the correct role for a different chapter | Proves it works for any chapter |
| returns null for a chapter that has no Chapter Admin role | Proves correct null handling |
| returns the single Publisher role when scoped by chapter | Proves pattern works for other chapter-scoped roles |

---

## Issue 2: Global ID Generation Without Chapter Membership

### Problem

A person who has not joined any chapter (or has not been assigned a chapter)
can still attempt to generate a Global ID. The Global ID is derived from the
chapter's geography (country ISO code, state code, city code), so without a
chapter it cannot be meaningfully generated. Previously, the Profile page
silently hid the "Generate Global ID" button when `chapter_id` was null,
leaving the user confused about why they couldn't get an ID. The edge
function also performed a chapter lookup without first checking if
`chapter_id` existed.

### Expected Behavior

- **UI**: When a member has no chapter, show a visible notice explaining
  they need to join a chapter to get their Global ID, with a link to browse
  chapters — instead of silently showing nothing.
- **Server**: The edge function must reject the request with a clear error
  message before attempting any chapter lookup or ID generation.

### Fix

**Edge function** (`supabase/functions/generate-global-id/index.ts`):

Added an explicit early check after the "already assigned" check:

```ts
if (!member.chapter_id) {
  return new Response(
    JSON.stringify({ error: "You must join a chapter before generating a Global ID" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

This returns a 400 with a user-friendly message, preventing the chapter
lookup from running on a null `chapter_id`.

**Profile page** (`src/pages/Profile.tsx`):

When `chapter_id` is null, instead of rendering nothing (`null`), the page
now shows an amber notice box:

> [shield icon] Join a chapter to get your Global ID — Browse chapters (link)

The "Browse chapters" link takes the user to the chapters page where they
can find and join a chapter.

### Tests (TDD)

**File**: `src/test/chapter-admin-assign.test.ts`
**Section**: "Global ID Generation: Chapter Membership Required" — 6 tests

| Test | Description |
|------|-------------|
| allows generation when member has a chapter and no existing global_id | Positive case |
| blocks generation when chapter_id is null | Core requirement |
| blocks generation when chapter_id is empty string | Edge case |
| blocks generation when member already has a global_id | Already-assigned check |
| blocks when no chapter AND already has global_id — already-assigned takes precedence | Ordering check |
| error message is user-friendly and actionable | Contains "join chapter" |

---

## Pre-existing Lint Errors Fixed

While running the linter on the modified `ChaptersTab.tsx`, two pre-existing
`react-hooks/rules-of-hooks` errors were found in the
`CommitteeManagementDialog` component (lines 687 and 700). `useQueryClient`
was being called inside `onSuccess` callbacks, which violates React's rules
of hooks. These were fixed by moving `useQueryClient()` to the component
level and removing the inline calls.

---

## Test Results

```
Test Files  16 passed (16)
     Tests  333 passed (333)
```

All 333 tests pass, including 11 new tests for these two fixes.

## Build Results

```
✓ built in 20.00s
```

Production build succeeds with no errors.

## Lint Results

```
0 errors, 0 warnings
```

Zero lint errors on all modified files.

---

## POV Checklist

### Issue 1: Chapter Admin Role Lookup

- [x] Root cause identified: unscoped query returns multiple rows, maybeSingle() errors
- [x] Both useQuery and mutation fallback now filter by chapter_id
- [x] Query cache key includes chapter ID for correct invalidation
- [x] Error message updated to "not found for this chapter"
- [x] TDD: 5 tests written and passing
- [x] No regression in existing tests

### Issue 2: Global ID Chapter Requirement

- [x] Edge function rejects null chapter_id with 400 and clear message
- [x] Check placed before chapter lookup (early return)
- [x] Profile page shows visible notice with link to browse chapters
- [x] No longer silently hides the button — user knows why
- [x] TDD: 6 tests written and passing
- [x] No regression in existing tests

### Pre-existing Issues

- [x] Fixed 2 pre-existing react-hooks/rules-of-hooks lint errors in CommitteeManagementDialog
- [x] Moved useQueryClient to component level

### Overall

- [x] Both fixes built with TDD approach
- [x] All 333 tests pass
- [x] Production build succeeds
- [x] Zero lint errors, zero warnings
- [x] No security regressions introduced
