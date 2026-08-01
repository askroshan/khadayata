# POV — Bulk Invite Feature Validation

## Date: 2026-08-01

## Summary

Admins can now upload a `.txt` or `.csv` file containing one email address per
line to send mass invitation emails to Khadayata members. The feature was built
using TDD, validated for security, WCAG 2.2 AA compliance, and responsive design.

---

## Feature Description

### What It Does

On the Admin > Members tab, next to the existing "Invite Member" button, a new
"Bulk Invite" button opens a dialog where the admin can:

1. Upload a `.txt` or `.csv` file with one email per line
2. See a summary of valid, invalid, and duplicate emails found in the file
3. Optionally specify a default first name for the email greeting
4. Optionally select a chapter to assign all invitees to
5. Click "Send N Invitations" to trigger the batch send
6. See a success/error toast with counts of sent, failed, and skipped emails

### Supported File Formats

- **Plain text (.txt)**: One email per line, separated by newlines
- **CSV (.csv)**: Single column with optional header row ("email", "Email Address", or "e-mail")
- **Multi-column CSV**: Only the first column is used; other columns ignored
- **Quoted CSV fields**: Emails wrapped in quotes are stripped correctly

### Edge Cases Handled

| Case | Behavior |
|------|----------|
| Empty lines | Skipped silently |
| Whitespace-only lines | Skipped silently |
| Leading/trailing whitespace | Trimmed |
| BOM character at file start | Stripped |
| CRLF line endings | Normalized to LF |
| Old Mac CR line endings | Normalized to LF |
| Duplicate emails | Deduplicated case-insensitively, count reported |
| Invalid email formats | Filtered to "invalid" list, shown in collapsible details |
| CSV header row | Detected and skipped |
| Empty file | Shows 0 valid emails, send button disabled |
| Over 500 emails | Capped at 500, overflow reported |
| Already registered members | Skipped server-side, counted in "skipped" |
| Already invited (pending) members | Re-invited with new magic link |

---

## Architecture

### Client-Side (Browser)

**File**: `src/lib/bulk-invite-utils.ts`
- `parseEmailsFromText(rawText)` — parses file text into valid/invalid/duplicate email lists
- `isValidEmail(email)` — validates a single email
- `capEmails(emails)` — caps at 500 emails, reports overflow

**File**: `src/components/admin/MembersTab.tsx`
- "Bulk Invite" button next to "Invite Member"
- Dialog with file upload (drag-style dropzone), summary, and send button
- File reading via `FileReader.readAsText()`
- Calls `supabase.functions.invoke("bulk-invite", ...)` with the parsed email array

### Server-Side (Edge Function)

**File**: `supabase/functions/bulk-invite/index.ts`
- Validates caller JWT and role (Global Admin, Chapter Admin, Data Steward, Moderator)
- Chapter Admins are scoped to their own chapter
- For each email:
  1. Checks if user already exists and is fully onboarded → skip
  2. Generates an invite link (or magic link for existing users)
  3. Creates/updates a member row with the chapter assignment
  4. Sends the invitation email via the `send-email` function
- Returns `{ sent, failed, skipped, errors, total }`
- Uses consistent API key headers (SERVICE_ROLE_KEY for both Authorization and Apikey)

---

## TDD Approach

### Test File: `src/test/bulk-invite.test.ts` — 29 tests

| Suite | Tests | Coverage |
|-------|-------|----------|
| File Parsing | 6 | Plain text, CRLF, CR, BOM, empty lines, whitespace trimming |
| CSV Parsing | 5 | Header detection, multi-column, quoted fields, no-header |
| Validation | 5 | Valid/invalid separation, deduplication, isValidEmail |
| Edge Cases | 4 | Empty file, whitespace-only, header-only, totalLines count |
| Max Email Cap | 3 | Under limit, over limit, exactly at limit |
| UI Response | 6 | Success, partial, all-fail, singular, network error |

All tests import from the shared utility (`src/lib/bulk-invite-utils.ts`) so the
test exercises the same code the production UI uses.

---

## Security Review

| Check | Status |
|-------|--------|
| Edge function validates caller JWT before processing | PASS |
| Only authorized roles can invoke (Global Admin, Chapter Admin, Data Steward, Moderator) | PASS |
| Chapter Admins scoped to their own chapter — cannot invite to other chapters | PASS |
| API key consistency: both headers use SERVICE_ROLE_KEY (no "Conflicting API Key" 401) | PASS |
| Max 500 emails per batch — prevents abuse | PASS |
| Already-onboarded members are skipped — no duplicate accounts | PASS |
| Email addresses normalized to lowercase before processing | PASS |
| Error messages do not leak sensitive user data | PASS |
| File is read client-side — no file upload to storage bucket needed | PASS |
| File input restricted to `.txt` and `.csv` via `accept` attribute | PASS |

---

## WCAG 2.2 AA Compliance

| Check | Status |
|-------|--------|
| File upload label has associated `<label htmlFor>` | PASS |
| Upload dropzone is keyboard-accessible (`<label>` wraps `<input>`) | PASS |
| File input is `sr-only` but functionally connected via label | PASS |
| Dialog uses Radix Dialog with focus trapping | PASS |
| Dialog is dismissible via Escape and click outside | PASS |
| Send button has descriptive text with email count | PASS |
| Loading state communicated via button text ("Sending invitations...") | PASS |
| Success/error results shown via toast (announced to screen readers) | PASS |
| Invalid lines shown in collapsible `<details>` for review | PASS |
| All form fields have associated `<Label>` elements | PASS |
| Color contrast: amber for warnings, emerald for success, standard for text | PASS |
| No information conveyed by color alone (text labels accompany all indicators) | PASS |

---

## Responsive Design

| Breakpoint | Verification |
|------------|-------------|
| Mobile (<640px) | Dialog is full-width (`max-w-lg` with responsive padding); form fields stack in single column; file upload dropzone is comfortable to tap |
| Tablet (640px+) | Two-column grid for first name and chapter selector (`grid-cols-2`); dialog centered with max width |
| Desktop | Same as tablet; consistent with existing admin dialogs |

The "Bulk Invite" and "Invite Member" buttons wrap naturally on mobile thanks to
the flex container's `flex-wrap` behavior.

---

## Test Results

```
Test Files  15 passed (15)
     Tests  303 passed (303)
```

All 303 tests pass, including 29 new tests for the bulk invite feature.

## Build Results

```
✓ 1979 modules transformed
✓ built in 19.06s
```

Production build succeeds with no errors.

---

## POV Checklist

- [x] Feature works for both .txt and .csv file formats
- [x] One email per line parsing with deduplication
- [x] Invalid email filtering with user-visible feedback
- [x] CSV header detection and multi-column handling
- [x] BOM and line ending normalization
- [x] Max 500 emails per batch (client and server enforced)
- [x] Already-registered members skipped server-side
- [x] Chapter Admin scoped to own chapter
- [x] Optional chapter assignment and default first name
- [x] Success/error toast with sent/failed/skipped counts
- [x] TDD: 29 tests written and passing
- [x] Security: JWT validation, role check, API key consistency
- [x] WCAG 2.2 AA: labels, keyboard access, focus trapping, toast announcements
- [x] Responsive: mobile, tablet, desktop verified
- [x] Production build passes
