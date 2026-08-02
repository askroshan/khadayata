# POV — Chapter Admin Assignment & Mentorship Single Record

## Date: 2026-08-02

---

## Issue 1: Chapter Admin Assignment Error

### Problem

On the Admin > Chapters tab, when an admin selects a chapter, searches for a
member, selects them, and clicks "Assign as Admin" without providing the
optional email, the system throws "Missing required fields".

**Reproduction**: Select Ahmedabad Chapter, search "rushik", select Rushik,
leave email empty, click assign → error.

### Root Cause

The `assignChapterAdmin` mutation in `ChaptersTab.tsx` checked:

```ts
if (!inviteChapter || !inviteForm.memberId || !chapterAdminRoleId)
  throw new Error("Missing required fields");
```

The `chapterAdminRoleId` is loaded asynchronously via `useQuery` when the
dialog opens. If the admin selects a member and clicks assign before that
query resolves (a race condition), `chapterAdminRoleId` is still `null` and
the mutation throws — even though email is optional and the role ID is
available from the database.

### Fix

The mutation now:
1. Only validates `memberId` and `chapterId` (the truly required fields)
2. If `chapterAdminRoleId` is not yet loaded, fetches it directly inside the
   mutation before proceeding
3. Email remains optional — it's only used to send a notification email,
   not for the role assignment itself

### Tests (TDD)

**File**: `src/test/chapter-admin-assign.test.ts` — 6 tests for assignment validation

| Test | Description |
|------|-------------|
| passes with memberId and chapterId, no email | Email is optional |
| passes with memberId, chapterId, and email | Email still accepted |
| fails when no member selected | Correct error message |
| fails when no chapter selected | Correct error message |
| does NOT fail when roleId is null | Mutation fetches it instead of throwing |
| does NOT require email | Empty email is valid |

---

## Issue 2: Mentorship Offer Creates Duplicate Records

### Problem

When a person offers mentorship multiple times (e.g., first offering "React",
then later offering "Python"), each submission creates a new row in the
`mentorships` table. This results in multiple "available" records for the
same mentor, which clutters the mentorship directory and splits their skills
across rows.

### Expected Behavior

A person should have only **one** "available" mentorship record. When they
add more skills, the new skills should be appended to the existing record's
`skills` array (deduplicated case-insensitively), not create a new row.

### Fix

The `offerMentorship` mutation in `Mentorship.tsx` now:

1. Before inserting, queries for an existing "available" mentorship record
   for the current member: `select id, skills, status from mentorships where
   mentor_member_id = ? and status = 'available'`
2. If an existing record is found:
   - Merges the new skills into the existing `skills` array
   - Deduplicates case-insensitively (preserves original casing of the first
     occurrence)
   - Updates the existing row: `update mentorships set skills = ? where id = ?`
3. If no existing record is found:
   - Inserts a new row as before
4. Shows the same success toast in both cases

### Tests (TDD)

**File**: `src/test/chapter-admin-assign.test.ts` — 13 tests for mentorship

| Test | Description |
|------|-------------|
| inserts when no existing record | New mentor gets a new row |
| updates existing record by merging new skills | Skills appended to existing |
| deduplicates skills case-insensitively | "React" and "react" not both added |
| inserts when existing record is not 'available' | Only "available" status merges |
| preserves original skill casing | First casing wins |
| handles empty new skills array on update | No change to existing skills |
| parses comma-separated skills | "React, Python, Java" → 3 skills |
| trims whitespace around skills | "  React  " → "React" |
| filters empty entries | "React,,Python," → 2 skills |
| returns empty array for empty input | "" → [] |
| returns empty array for whitespace-only | "   " → [] |
| handles single skill | "React" → ["React"] |

---

## Test Results

```
Test Files  16 passed (16)
     Tests  322 passed (322)
```

All 322 tests pass, including 19 new tests for these two fixes.

## Build Results

```
✓ 1979 modules transformed
✓ built in 19.08s
```

Production build succeeds with no errors.

---

## POV Checklist

### Issue 1: Chapter Admin Assignment

- [x] Email is optional — not required for role assignment
- [x] Race condition fixed — role ID fetched in mutation if not loaded
- [x] Correct error messages for missing member/chapter
- [x] Existing email notification flow preserved when email is provided
- [x] TDD: 6 tests written and passing
- [x] No regression in existing tests

### Issue 2: Mentorship Single Record

- [x] Only one "available" record per mentor
- [x] New skills appended to existing record, not new row created
- [x] Skills deduplicated case-insensitively
- [x] Original skill casing preserved (first occurrence wins)
- [x] Non-"available" records (e.g. "active") don't merge — new row created
- [x] Comma-separated skill parsing with trim and empty filtering
- [x] TDD: 13 tests written and passing
- [x] No regression in existing tests

### Overall

- [x] Both fixes built with TDD approach
- [x] All 322 tests pass
- [x] Production build succeeds
- [x] No security regressions introduced
