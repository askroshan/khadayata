# User Stories - Admin Panel Features

## Epic: Admin Member Management

### US-001: Filter Members by Date Range

**As an** Admin or Director
**I want to** filter members by their join date (from/to)
**So that** I can see newly joined members or members from a specific period

#### Acceptance Criteria:
- [ ] Date range filter has two inputs: "From Date" and "To Date"
- [ ] Filtering by "From Date" shows members joined on or after that date
- [ ] Filtering by "To Date" shows members joined on or before that date
- [ ] Date range filter works in combination with other filters (search, level, status)
- [ ] Pagination resets to page 1 when date filter is applied
- [ ] Clear button removes all filters including date range
- [ ] CSV export includes filtered results
- [ ] Date inputs validate against ISO 8601 format

#### Test Scenarios:
1. Filter members joined after 2026-02-01 - should show 2 members
2. Filter members joined before 2026-02-28 - should show 2 members
3. Filter members joined between 2026-02-01 and 2026-02-28 - should show 1 member
4. Filter by date range and search term "San" - should show 1 member
5. Apply date filter and export to CSV - exported file should contain only filtered members
6. Members without created_at timestamp should be excluded from date filters
7. Time boundaries: filter for 2026-02-20 should include full day (00:00-23:59:59)

---

### US-002: Navigate Admin Sections via URL Parameters

**As an** Admin
**I want to** navigate to specific admin sections using URL parameters (e.g., /admin?tab=members)
**So that** I can bookmark and share direct links to admin sections

#### Acceptance Criteria:
- [ ] URL parameter "tab" controls which admin section is displayed
- [ ] Default tab is "stats" when no parameter provided
- [ ] Valid tabs: stats, members, chapters, roles, events, news-publisher, moderator, announcements, finance
- [ ] Invalid tab values default to "stats" gracefully
- [ ] Other URL parameters (page, search, etc.) are preserved when changing tabs
- [ ] Browser back button navigates between previously visited tabs
- [ ] Page title updates to reflect current section
- [ ] Refresh page maintains current tab selection

#### Test Scenarios:
1. Visit /admin?tab=members - Members section loads
2. Visit /admin?tab=chapters - Chapters section loads
3. Visit /admin?tab=invalid - Default to stats section
4. Visit /admin - Default to stats section
5. Navigate from /admin?tab=members to /admin?tab=chapters - previous page accessible via back button
6. /admin?tab=members&search=john - search parameter preserved when switching tabs
7. Visit /admin?tab=news-publisher - News Publisher section loads
8. Refresh page at /admin?tab=chapters - Chapters section still displayed

---

### US-003: Sidebar Navigation Shortcuts with Authorization

**As an** Admin or Director
**I want to** see sidebar shortcuts to admin sections I have access to
**So that** I can quickly navigate to relevant sections

#### Acceptance Criteria:
- [ ] Sidebar shows shortcuts: Members, Chapters, Roles, Events, News, Finance (for admins)
- [ ] Directors see only: Members, Chapters, Events, Finance
- [ ] Moderators see only: Moderator Dashboard, Reports
- [ ] Publishers see only: News Publisher section
- [ ] Finance managers see only: Finance section
- [ ] Regular members do not see any admin shortcuts
- [ ] Clicking shortcut navigates to /admin?tab=<section-id>
- [ ] Current section is highlighted/active in sidebar
- [ ] Shortcuts are disabled if user lacks permission

#### Test Scenarios:
1. Admin logs in - sidebar shows all 9 shortcuts
2. Director logs in - sidebar shows 4 shortcuts (stats, members, chapters, events)
3. Moderator logs in - sidebar shows moderator section only
4. Regular member logs in - sidebar shows no admin shortcuts
5. User with multiple roles sees union of all accessible sections
6. Click "Members" shortcut - navigates to /admin?tab=members
7. Current tab is visually highlighted in sidebar
8. Attempt to access unauthorized section - redirected to stats or home page

---

### US-004: Member Edit with Authorization Scoping

**As an** Admin or Director
**I want to** ensure only authorized users can edit members
**So that** data integrity and permission boundaries are maintained

#### Acceptance Criteria:
- [ ] Admins can edit any member in any chapter
- [ ] Directors can edit members only in their assigned chapter
- [ ] Edit button is disabled for members outside director's chapter
- [ ] Edit dialog shows chapter assignment and committee roles
- [ ] Tooltip explains why edit is disabled (cross-chapter)
- [ ] Save operation validates user still has permission
- [ ] Member edit logs audit trail entry

#### Test Scenarios:
1. Admin edits member in any chapter - succeeds
2. Director edits member in their chapter - succeeds
3. Director attempts edit on member in different chapter - button disabled, tooltip shown
4. Edit member name and chapter - changes saved correctly
5. Assign committee role to member - role assignment created in database
6. Toggle committee role on/off - role_assignments updated correctly
7. User loses permission between opening dialog and saving - operation fails with permission error
8. Audit log shows "member_updated" event with admin/director user_id

---

### US-005: Verification Level Changes with Authorization

**As an** Admin or Director
**I want to** update member verification levels securely
**So that** only authorized users can escalate trust levels

#### Acceptance Criteria:
- [ ] Level up button visible only for in-scope members
- [ ] Level down button visible only for in-scope members
- [ ] Admins can change any member's level
- [ ] Directors can change level only for members in their chapter
- [ ] Cannot upgrade beyond level 5 (Patron)
- [ ] Cannot downgrade below level 0 (Basic)
- [ ] Level change updates immediately in table
- [ ] Tooltip disabled state explains authorization reason
- [ ] Operation validates permission before saving

#### Test Scenarios:
1. Admin upgrades member from L1 to L2 - succeeds
2. Director downgrades member from L2 to L1 in their chapter - succeeds
3. Director attempts level change on cross-chapter member - button disabled
4. Member at L5 - up button disabled (already at max)
5. Member at L0 - down button disabled (already at min)
6. Rapidly click up button multiple times - one level increment only (debounced)
7. Verify audit log records level change with old_value and new_value

---

### US-006: CSV Export with Filtering

**As an** Admin
**I want to** export filtered member list to CSV
**So that** I can analyze or archive member data

#### Acceptance Criteria:
- [ ] Export button appears in Members tab
- [ ] CSV includes: Name, Chapter, Verification Level, Onboarding Status, Joined Date
- [ ] Exported data respects current filters (search, level, status, date range)
- [ ] File naming: members-YYYY-MM-DD.csv
- [ ] CSV headers are descriptive and properly formatted
- [ ] Level shown as "L# — Label" (e.g., "L2 — Verified")
- [ ] Status shown as "Complete" or "Pending"
- [ ] Date formatted as YYYY-MM-DD
- [ ] Special characters in names properly escaped
- [ ] Empty chapter shown as empty string

#### Test Scenarios:
1. Export all members - file contains all members
2. Export filtered by date range - file contains only filtered members
3. Export with search term "San Francisco" - file shows only SF chapter members
4. Export with status "Pending" - file shows only incomplete onboarding
5. Open CSV in spreadsheet - formatting is correct
6. Member with quotes in name - CSV is properly escaped
7. Empty chapter field - CSV shows blank, not "null"
8. Generated file downloads to Downloads folder with correct name

---

## Epic: Admin Navigation & Access Control

### US-007: Admin Dashboard Role-Based Access

**As a** Platform Administrator
**I want to** ensure all admin sections enforce proper authorization
**So that** sensitive operations are only accessible to authorized users

#### Acceptance Criteria:
- [ ] Each admin section validates user role before rendering
- [ ] Unauthorized access redirects to dashboard or home
- [ ] Permission error shows clear message
- [ ] Session-based permission checks prevent privilege escalation
- [ ] API calls include auth headers and validate server-side
- [ ] Audit logs record all permission checks
- [ ] Role changes take effect immediately on next page load

#### Test Scenarios:
1. Regular member navigates to /admin - redirected to home
2. Member attempts /admin?tab=chapters - redirected with error toast
3. Director navigates to /admin?tab=chapters - sees 403 error
4. Admin role assigned dynamically - next page load grants access
5. Admin role revoked - next page load denies access
6. Direct API call without proper auth - 401 Unauthorized response
7. Session token expires - automatic redirect to login

---

## Test Strategy & Coverage

### Unit Tests:
- **members-filter.test.ts**: Filtering logic with 18 test cases
- **admin-navigation.test.ts**: URL parameter handling with 18 test cases
- **authorization.test.ts**: Permission checks with 35 test cases

### Integration Tests (To be implemented):
- Member edit with actual database mutations
- CSV export file generation and content validation
- URL navigation with React Router

### Manual POV Tests (To be validated):
- [ ] Date range picker UI works smoothly
- [ ] Filter combination logic is intuitive
- [ ] CSV downloads successfully and opens correctly
- [ ] Sidebar shortcuts render for correct roles
- [ ] URL navigation is fast and responsive
- [ ] Authorization prevents unauthorized access
- [ ] Error messages are clear and actionable

---

## Acceptance Checklist

- [ ] All 18 member filtering tests pass
- [ ] All 18 navigation tests pass
- [ ] All 35 authorization tests pass
- [ ] Manual POV tests validated
- [ ] No console errors or warnings
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: screen reader announces sections
- [ ] Permission boundaries enforced client + server
- [ ] Audit logs record all sensitive operations
- [ ] Build completes without errors

---

## Notes

- **TDD Approach**: All functionality has corresponding tests written first
- **POV Validation**: Critical business logic (authorization, filtering) is heavily tested
- **Security**: Permission checks happen on both client (UX) and server (enforcement)
- **Audit Trail**: All member modifications logged for compliance
