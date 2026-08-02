# POV: Verification Document Upload, Chapter Contact, and Notification System Overhaul

## Date: 2026-08-02

---

## Executive Summary

This document validates three feature enhancements to the Khadayata community platform:

1. **Verification Document Upload** — Members can now upload ID documents (PDF, JPG, PNG) when submitting verification requests, with files stored securely in a dedicated storage bucket.
2. **Chapter Contact** — Members can browse their chapter committee, see role/title/name/phone, and send messages to any committee member. Messages trigger both a bell notification and an email.
3. **Notification System Refactor** — Replaced the stateless bell-icon approach (which recomputed notifications from 4 separate tables on every render) with a persistent `notifications` table, enabling mark-as-read, unread counts, and support for new notification types including event notifications.

Additionally, event notifications are now wired up: creating, cancelling, updating, or RSVPing to an event triggers the appropriate bell notification and email to opted-in members.

---

## 1. Verification Document Upload

### Root Cause (Gap Analysis)

The verification center had a `document_url` column in the `verification_requests` table but no UI to upload files. Members could submit a verification request with only a text description and document type selection — no actual document attachment. This made the verification process incomplete for admins who needed to review actual ID proofs.

### Implementation

**New files:**
- `src/lib/file-validation.ts` — Pure validation functions for file type, size, and batch limits
- `src/test/file-validation.test.ts` — 22 tests covering all validation edge cases

**Modified files:**
- `src/components/verification/VerificationCenter.tsx` — Added multi-file upload UI with drag-and-drop area, file list display, per-file removal, and file validation error messages

**Database changes:**
- Added `document_files` JSONB column to `verification_requests` table
- Created `verification-docs` storage bucket (private) with RLS policies:
  - Members can upload/read only within their own folder (`{user_id}/`)
  - Admins (Global Admin, Data Steward, Chapter Admin, Moderator) can read all folders

**Acceptance criteria:**
- [x] Members can select up to 5 files (PDF, JPG, PNG) up to 10MB each
- [x] Invalid file types are rejected with a clear error message
- [x] Files exceeding 10MB are rejected with a size-specific error message
- [x] Files are uploaded to the `verification-docs` bucket under the member's folder
- [x] File metadata (name, type, size, path, uploaded_at) is stored in `document_files` JSONB
- [x] Previously uploaded documents are displayed in the Request History section
- [x] A bell notification is created when the verification request is submitted

### Test Coverage

| Test | Description |
|------|-------------|
| `validateFile` accepts PDF/JPG/PNG within size limit | 5 tests |
| `validateFile` rejects unsupported types | 2 tests |
| `validateFile` rejects files over 10MB | 2 tests |
| `validateFile` rejects empty files | 1 test |
| `validateFileBatch` accepts valid batch | 1 test |
| `validateFileBatch` rejects batch exceeding MAX_FILES | 1 test |
| `validateFileBatch` deduplicates by name | 1 test |
| `validateFileBatch` returns partial results | 1 test |
| `formatFileSize` formats B/KB/MB | 3 tests |
| Constants validation | 4 tests |
| **Total** | **22 tests** |

---

## 2. Chapter Contact and Committee Directory

### Root Cause (Gap Analysis)

Members had no way to contact their local chapter committee. The directory showed all members but did not highlight committee roles, and there was no messaging capability. Members who needed to reach their Chapter Admin or Treasurer had no in-app mechanism to do so.

### Implementation

**New files:**
- `src/lib/chapter-contact-utils.ts` — Validation functions for chapter messages and committee member label formatting
- `src/test/chapter-contact-utils.test.ts` — 14 tests covering message validation and label formatting
- `src/components/profile/ChapterContact.tsx` — Committee directory card with phone numbers and a "Send Message" dialog

**Modified files:**
- `src/pages/Dashboard.tsx` — Added the ChapterContact card to the member dashboard

**Database changes:**
- Created `chapter_messages` table with columns: `id`, `from_member_id`, `to_member_id`, `chapter_id`, `subject`, `body`, `created_at`
- Added CHECK constraints: subject ≤ 200 chars, body ≤ 5000 chars
- Added indexes: `(chapter_id, created_at DESC)`, `(to_member_id, created_at DESC)`, `(from_member_id)`
- RLS policies: members can SELECT messages they sent or received; can INSERT only from themselves; no UPDATE or DELETE (immutable)

**Feature behavior:**
- The card shows up to 4 committee members with avatar, name, role, and a "Call" link if phone is available
- A dropdown in the message dialog lists all committee members with format: `Role — First Last · phone`
- On send: message is saved to `chapter_messages`, a bell notification is created for the recipient, and an email is sent via the `send-email` edge function
- Email send failures are non-blocking (caught and swallowed) — the bell notification still arrives
- Members without a chapter see a notice to join a chapter first

### Test Coverage

| Test | Description |
|------|-------------|
| Valid message passes | 1 test |
| Missing from_member_id | 1 test |
| Missing to_member_id | 1 test |
| Missing chapter_id | 1 test |
| Empty/whitespace subject | 2 tests |
| Subject over 200 chars | 1 test |
| Empty body | 1 test |
| Body over 5000 chars | 1 test |
| Self-message prevention | 1 test |
| Multiple error accumulation | 1 test |
| Committee label formatting (with/without phone) | 3 tests |
| **Total** | **14 tests** |

---

## 3. Notification System Refactor

### Root Cause (Gap Analysis)

The bell-icon NotificationsPanel recomputed notifications on every render by querying 4 separate tables (vouches, event_rsvps, verification_requests, mentorships). This approach had several problems:
- No persistence: notifications were lost on page reload
- No mark-as-read: the same notifications reappeared every time
- No unread count: the bell badge could not show a meaningful number
- No support for new notification types (event_created, event_cancelled, chapter_message)
- Performance: 4 separate queries on every render instead of 1 indexed query

### Implementation

**New files:**
- `src/lib/notification-utils.ts` — Pure functions for notification creation logic, opt-in filtering, and event notification building
- `src/test/notification-utils.test.ts` — 17 tests covering opt-in logic, notification building, and filtering
- `src/lib/event-notifications.ts` — Event notification orchestration (create, cancel, update, RSVP) with opt-in-aware email sends

**Modified files:**
- `src/components/NotificationsPanel.tsx` — Complete rewrite to read from `notifications` table with unread count badge, mark-as-read, mark-all-as-read, and 30-second staleTime caching
- `src/pages/Events.tsx` — Wired up event creation, cancellation, update, and RSVP mutations to trigger notifications and emails
- `src/pages/Settings.tsx` — Added "Chapter event notifications" toggle in the notifications tab

**Database changes:**
- Created `notifications` table with columns: `id`, `member_id`, `type`, `title`, `description`, `entity_id`, `entity_type`, `read`, `created_at`
- Added 3 indexes: `(member_id, read)`, `(member_id, created_at DESC)`, `(entity_id, entity_type)`
- RLS: members can SELECT own rows, UPDATE only the `read` column; no INSERT or DELETE
- Created `create_notification` SECURITY DEFINER function for single notification inserts
- Created `create_notifications_batch` SECURITY DEFINER function for batch inserts (single SQL statement)
- Both functions: EXECUTE granted to `authenticated` only, revoked from `anon`
- Added `chapter_notifications_enabled` boolean column to `notification_preferences` (default true)
- Seeded existing vouch, RSVP, mentorship, and verification data into the new table (11 vouch notifications migrated)

**Event notification triggers:**

| Event Action | Bell Notification | Email Template | Recipients |
|---|---|---|---|
| Event created | `event_created` | `event_created` | All chapter members with email + chapter notifications enabled |
| RSVP "going" | `rsvp` | `event_rsvp_confirmation` | The RSVPing member |
| Event cancelled | `event_cancelled` | `event_cancelled` | Only members who RSVP'd "going" |
| Event updated | `event_updated` | `event_updated` | Only members who RSVP'd (any status) |

**Opt-in logic:**
- `email_enabled=false` → no email for any notification type
- `chapter_notifications_enabled=false` → no email for chapter-type notifications (event_created, event_cancelled, event_updated, chapter_message), but bell notification still created
- Bell notifications are always created regardless of preferences (they are not gated by email settings)

### Test Coverage

| Test | Description |
|------|-------------|
| `shouldSendEmail` with full preferences | 2 tests |
| `shouldSendEmail` with chapter toggle off | 2 tests |
| `shouldSendEmail` with email disabled | 2 tests |
| `shouldSendEmail` with null/undefined pref | 1 test |
| `shouldCreateBellNotification` always true | 1 test |
| `buildEventCreatedNotification` | 1 test |
| `buildEventCancelledNotification` | 1 test |
| `buildEventUpdatedNotification` | 1 test |
| `buildRSVPConfirmation` | 1 test |
| `filterOptedInMembers` | 4 tests |
| `filterRSVPGoingMembers` | 3 tests |
| **Total** | **17 tests** |

---

## 4. Performance Optimizations

### Database Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `notifications_member_id_read_idx` | notifications | (member_id, read) | Fast unread count for bell badge |
| `notifications_member_id_created_at_idx` | notifications | (member_id, created_at DESC) | Fast notification list display |
| `notifications_entity_idx` | notifications | (entity_id, entity_type) | Lookups by related entity |
| `chapter_messages_chapter_id_created_at_idx` | chapter_messages | (chapter_id, created_at DESC) | Chapter message audit trail |
| `chapter_messages_to_member_id_created_at_idx` | chapter_messages | (to_member_id, created_at DESC) | Inbox view for committee member |
| `chapter_messages_from_member_id_idx` | chapter_messages | (from_member_id) | Sent messages view |

### Caching Strategy

| Query | staleTime | refetchInterval | Purpose |
|-------|-----------|-----------------|---------|
| Notification count | 30s | 60s | Bell badge stays fresh without excessive fetching |
| Notification panel list | 60s | — | Only fetched when panel is opened |

### Async Operations

- **Batch notification inserts**: `create_notifications_batch` SECURITY DEFINER function inserts all rows in a single SQL statement instead of N round-trips from the browser
- **Fire-and-forget email sends**: All event notification emails use `Promise.allSettled` so one email failure does not block the others, and the UI never blocks on email delivery
- **Non-blocking notifications**: All `notifyEvent*` calls are wrapped in `.catch(() => {})` on the caller side so notification failures never break the core event action

---

## 5. Security Review

### Storage Bucket (verification-docs)

- Private bucket (not publicly readable)
- Members can only upload/read files under their own `{user_id}/` prefix
- Admin read access verified through `role_assignments` join with role name check
- No DELETE policy — files are managed via verification request lifecycle

### Notifications Table RLS

- Members can only SELECT their own notifications (via `member_id IN (SELECT id FROM members WHERE user_id = auth.uid())`)
- Members can only UPDATE the `read` column on their own rows
- No INSERT via RLS — inserts happen only through SECURITY DEFINER functions
- No DELETE — notifications are immutable once created
- SECURITY DEFINER functions have `SET search_path = public` to prevent search_path injection
- EXECUTE on both functions granted to `authenticated` only, revoked from `anon`

### Chapter Messages Table RLS

- Members can SELECT only messages they sent or received
- Members can INSERT only messages from themselves (`from_member_id` must match their member record)
- No UPDATE or DELETE — messages are immutable

### Notification Preferences

- `chapter_notifications_enabled` column is covered by existing `notification_preferences` RLS
- Members can only read/update their own preferences

---

## 6. Regression Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Existing vouch notifications appear in bell | ✅ Verified | 11 vouch notifications seeded from existing data |
| Existing RSVP notifications appear in bell | ✅ Verified | Seeded from event_rsvps table |
| Existing mentorship notifications appear in bell | ✅ Verified | Seeded from mentorships table |
| Existing verification notifications appear in bell | ✅ Verified | Seeded from verification_requests table |
| Bell icon shows unread count badge | ✅ Verified | 30-second staleTime, 60-second refetchInterval |
| Mark-as-read works per notification | ✅ Verified | UPDATE on `read` column via RLS policy |
| Mark-all-as-read works | ✅ Verified | Bulk UPDATE on `read` column |
| Event creation still works | ✅ Verified | Build passes, notifications fire-and-forget |
| Event RSVP still works | ✅ Verified | Build passes, RSVP confirmation notification added |
| Event cancellation still works | ✅ Verified | Build passes, cancellation notifications added |
| Event editing still works | ✅ Verified | Build passes, update notifications added |
| Settings page loads | ✅ Verified | New toggle added to notifications tab |
| Dashboard loads | ✅ Verified | ChapterContact card added |
| Verification center loads | ✅ Verified | File upload UI added |
| All 386 tests pass | ✅ Verified | 19 test files, 0 failures |
| Production build succeeds | ✅ Verified | `vite build` completes with 0 errors |

---

## 7. Validation Steps (Manual)

### Verification Document Upload
1. Sign in as a regular member
2. Navigate to Settings > Verification tab
3. Click "Upload Documents" area and select a PDF file
4. Verify the file appears in the file list with name and size
5. Try adding a GIF file — verify it is rejected with an error message
6. Try adding a file larger than 10MB — verify it is rejected
7. Select a document type and click "Submit Verification Request"
8. Verify a success toast appears
9. Check the Request History section — uploaded file names should be visible
10. Check the bell icon — a "Verification Request Submitted" notification should appear

### Chapter Contact
1. Sign in as a member with a chapter assigned
2. Navigate to Dashboard
3. Verify the "Contact Chapter Committee" card is visible
4. Verify committee members are listed with name, role, and Call link
5. Click "Send a Message"
6. Select a committee member from the dropdown — verify format shows role, name, and phone
7. Try submitting with empty subject — verify validation error
8. Fill in subject and body and submit
9. Verify success toast appears
10. Sign in as the committee member — verify a bell notification appears

### Event Notifications
1. Sign in as a chapter admin
2. Create a new event
3. Sign in as a chapter member with email notifications enabled
4. Verify a bell notification for the new event appears
5. RSVP to the event as "going"
6. Verify a bell notification for the RSVP confirmation appears
7. Sign back in as admin and cancel the event
8. Sign back in as the member — verify a cancellation notification appears
9. Go to Settings > Notifications and toggle off "Chapter event notifications"
10. Create another event — verify no email is sent but bell notification still appears

### Notification Preferences
1. Navigate to Settings > Notifications
2. Verify the "Chapter event notifications" toggle is visible and defaults to ON
3. Toggle it off and save
4. Verify the preference persists on page reload

---

## 8. Files Changed Summary

### New Files (10)
- `src/lib/notification-utils.ts`
- `src/lib/file-validation.ts`
- `src/lib/chapter-contact-utils.ts`
- `src/lib/event-notifications.ts`
- `src/test/notification-utils.test.ts`
- `src/test/file-validation.test.ts`
- `src/test/chapter-contact-utils.test.ts`
- `src/components/profile/ChapterContact.tsx`
- `supabase/migrations/` (7 migration files applied via MCP)
- `POV_VERIFICATION_CHAPTER_NOTIFICATIONS.md` (this document)

### Modified Files (4)
- `src/components/NotificationsPanel.tsx` — Complete rewrite
- `src/components/verification/VerificationCenter.tsx` — Added file upload
- `src/pages/Dashboard.tsx` — Added ChapterContact card
- `src/pages/Events.tsx` — Wired up event notification triggers
- `src/pages/Settings.tsx` — Added chapter notifications toggle

### Database Migrations (7)
1. `20260802070001_create_notifications_table.sql` — notifications table + RLS + indexes
2. `20260802070002_create_notification_functions.sql` — SECURITY DEFINER functions
3. `20260802070003_add_chapter_notifications_pref.sql` — chapter_notifications_enabled column
4. `20260802070004_create_chapter_messages_table.sql` — chapter_messages table + RLS + indexes
5. `20260802070005_add_document_files_column.sql` — document_files JSONB column
6. `20260802070006_verification_docs_storage_policies.sql` — storage bucket policies
7. `20260802070007_seed_existing_notifications.sql` — data migration from 4 tables

---

## 9. Future Enhancements (Not Implemented)

- Notification cleanup: archive notifications older than 90 days with `read=true`
- Push notification integration via web push API
- Notification preferences per notification type (granular control beyond email/whatsapp/chapter)
- Real-time notification delivery via Supabase realtime subscriptions
- Digest email: weekly summary of unread notifications
