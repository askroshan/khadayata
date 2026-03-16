# Database Schema Documentation

## Overview

The Khandelwal Heritage Directory (KHD) uses a PostgreSQL database managed through Supabase. All tables have Row-Level Security (RLS) enabled for data protection.

**Database:** PostgreSQL 15+
**Schema:** `public`
**Auth Schema:** `auth` (Supabase managed)

---

## Core Tables

### members

Primary table storing all community member records. A record is auto-created via trigger when a user signs up.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | — | Foreign key to auth.users |
| chapter_id | uuid | Yes | — | Foreign key to chapters |
| global_id | text | Yes | — | Unique global identifier (e.g. KHDINGJ AHM26000001Z) |
| verification_level | smallint | No | 0 | 0=L0 Unverified, 1=L1 Vouched (2 vouches), 2=L2 Verified (3 L1+ vouches + KYC doc), 3=L3 Senior (admin-granted) |
| first_name | text | No | '' | First name |
| middle_names | text | Yes | — | Middle name(s) |
| last_name | text | No | '' | Last name |
| gender | text | Yes | — | Male / Female / Other |
| dob | date | Yes | — | Date of birth |
| birth_place | text | Yes | — | Place of birth |
| photo_url | text | Yes | — | Profile photo URL |
| ekda | text | Yes | — | Community subgroup / clan group (e.g. Khandelwal, Oswal, Agrawala, Maheshwari, Porwal) |
| deceased | boolean | No | false | Whether member is deceased |
| deceased_date | date | Yes | — | Date of death (if deceased) |
| privacy | jsonb | No | {} | Field-level privacy settings |
| onboarding_completed | boolean | No | false | Whether 4-step onboarding is done |
| suspended | boolean | No | false | Whether account is suspended |
| suspended_at | timestamptz | Yes | — | When suspension occurred |
| suspended_reason | text | Yes | — | Reason for suspension |
| blocked | boolean | No | false | Whether account is blocked |
| blocked_at | timestamptz | Yes | — | When block occurred |
| created_at | timestamptz | No | now() | Record creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**privacy JSONB shape:**
```json
{
  "dob":         "public|members|admins",
  "phone":       "public|members|admins",
  "email":       "public|members|admins",
  "birth_place": "public|members|admins",
  "employment":  "public|members|admins"
}
```

**RLS Policies:**
- `SELECT`: Authenticated users can read non-blocked members
- `INSERT`: Handled by trigger on `auth.users` only
- `UPDATE`: Own record, or Global Admin / Data Steward / Chapter Admin
- `DELETE`: Global Admin only

**Indexes:** `user_id`, `chapter_id`, `global_id` (unique, partial)

---

### chapters

Organisational units representing geographic chapters.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | — | Chapter display name |
| slug | text | No | — | URL-friendly identifier (unique) |
| subdomain | text | No | — | Subdomain for chapter site (unique) |
| country_id | uuid | Yes | — | Foreign key to countries |
| state_id | uuid | Yes | — | Foreign key to states |
| city_id | uuid | Yes | — | Foreign key to cities |
| settings | jsonb | No | {} | Chapter feature configuration |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**settings JSONB shape:**
```json
{
  "theme": "default",
  "features": ["events", "directory", "matrimonial", "business", "news", "scholarships"],
  "contact": { "email": "chapter@khandelwal.org" }
}
```

**RLS Policies:** SELECT public; INSERT/UPDATE/DELETE system/Global Admin only

**Unique Constraints:** `slug`, `subdomain`

---

### roles

Defines all platform roles. No `description` or `permissions` columns exist.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| chapter_id | uuid | Yes | — | NULL for global roles, chapter FK for chapter-scoped |
| name | text | No | — | Role name |
| scope | text | No | 'chapter' | `global` or `chapter` |

**Unique Constraint:** `(chapter_id, name)` — allows same name in different chapters

**Available roles (seeded):**

| Role Name | Scope | chapter_id |
|---|---|---|
| Global Admin | global | NULL |
| Data Steward | global | NULL |
| Directory Manager | global | NULL |
| Event Manager | global | NULL |
| Finance Admin | global | NULL |
| Global Publisher | global | NULL |
| Moderator | global | NULL |
| Chapter Admin | chapter | per-chapter |
| Publisher | chapter | per-chapter |

**RLS Policies:** SELECT authenticated; INSERT/UPDATE/DELETE Global Admin only

---

### role_assignments

Links members to roles with optional expiration. No `chapter_id` or `assigned_by` column — uses `created_by` → `auth.users`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| role_id | uuid | No | — | Foreign key to roles |
| member_id | uuid | No | — | Foreign key to members |
| start_date | date | No | CURRENT_DATE | Role effective from |
| end_date | date | Yes | — | Role expiry (NULL = permanent) |
| created_by | uuid | Yes | — | Foreign key to auth.users (assigning admin) |
| created_at | timestamptz | No | now() | Assignment timestamp |

**RLS Policies:** SELECT authenticated; INSERT/UPDATE/DELETE Global Admin or Chapter Admin

---

## Family & Relationships

### families

Family unit grouping.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | Yes | — |

---

### family_links

Links members within a family with relationship types.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| family_id | uuid | Yes | — |
| related_member_id | uuid | Yes | — |
| relation | text | No | — |
| created_at | timestamptz | No | now() |

**Relationship types:** Father, Mother, Spouse, Son, Daughter, Brother, Sister, Grandfather, Grandmother, etc.

---

### family_invitations

Pending invitations to join a family unit.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| inviter_member_id | uuid | No | — |
| invitee_name | text | No | — |
| invitee_email | text | Yes | — |
| invitee_phone | text | Yes | — |
| invitee_phone_country_code | text | Yes | '+91' |
| relation | text | No | — |
| status | text | No | 'pending' |
| accepted_by_member_id | uuid | Yes | — |
| accepted_at | timestamptz | Yes | — |
| created_at | timestamptz | No | now() |

---

## Member Details

### education

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | No |
| member_id | uuid | No |
| degree | text | Yes |
| institution | text | Yes |
| year | integer | Yes |

---

### employment

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | No |
| member_id | uuid | No |
| job_title | text | Yes |
| company | text | Yes |
| sector | text | Yes |
| start_date | date | Yes |
| end_date | date | Yes |

---

### member_contacts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| type | text | No | — |
| value | text | No | — |
| primary_flag | boolean | No | false |
| verified | boolean | No | false |

**Contact types:** `phone`, `email`, `whatsapp`

---

### member_languages

| Column | Type |
|--------|------|
| id | uuid |
| member_id | uuid |
| language | text |

---

### member_skills

| Column | Type |
|--------|------|
| id | uuid |
| member_id | uuid |
| skill | text |

---

### verification_requests

KYC verification requests submitted by members.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| requested_level | smallint | No | 1 |
| status | text | No | 'pending' |
| document_type | text | Yes | — |
| document_url | text | Yes | — |
| reviewer_user_id | uuid | Yes | — |
| reviewed_at | timestamptz | Yes | — |
| notes | text | Yes | — |
| created_at | timestamptz | No | now() |

**Status values:** `pending`, `approved`, `rejected`

---

## Matrimonial

### matrimonial_profiles

One record per member. Unique constraint on `member_id`.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| guardian_member_id | uuid | Yes | — |
| about | text | Yes | — |
| height_cm | smallint | Yes | — |
| weight_kg | smallint | Yes | — |
| complexion | text | Yes | — |
| blood_group | text | Yes | — |
| diet | text | Yes | — |
| marital_status | text | Yes | — |
| manglik | text | Yes | — |
| gotra | text | Yes | — |
| nakshatra | text | Yes | — |
| rashi | text | Yes | — |
| ekda | text | Yes | — |
| kuldevi | text | Yes | — |
| native_place | text | Yes | — |
| family_type | text | Yes | — |
| family_status | text | Yes | — |
| father_name | text | Yes | — |
| father_occupation | text | Yes | — |
| mother_name | text | Yes | — |
| mother_occupation | text | Yes | — |
| parents_marital_status | text | Yes | — |
| siblings | text | Yes | — |
| glasses | text | Yes | — |
| driving | text | Yes | — |
| citizenship | text | Yes | — |
| visa_type | text | Yes | — |
| current_city | text | Yes | — |
| current_state | text | Yes | — |
| country | text | Yes | — |
| education_level | text | Yes | — |
| education_field | text | Yes | — |
| position_title | text | Yes | — |
| business_name | text | Yes | — |
| income | numeric | Yes | — |
| income_currency | text | Yes | — |
| linkedin_url | text | Yes | — |
| contact_number | text | Yes | — |
| parent_contact | text | Yes | — |
| hobbies | text[] | Yes | — |
| photos | text[] | Yes | {} |
| preferences | jsonb | No | {} |
| visibility | text | No | 'members' |
| verified | boolean | No | false |
| suspended | boolean | No | false |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**visibility:** `members` or `public`

**preferences JSONB shape:**
```json
{
  "age_min": 23, "age_max": 30,
  "height_min": 155, "height_max": 175,
  "education": ["Graduate", "Post Graduate"],
  "location": ["Gujarat", "Maharashtra"]
}
```

---

### matrimonial_introductions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| from_member_id | uuid | No | — |
| to_member_id | uuid | No | — |
| message | text | Yes | — |
| status | text | No | 'pending' |
| responded_at | timestamptz | Yes | — |
| created_at | timestamptz | No | now() |

**Status values:** `pending`, `accepted`, `rejected`

---

## Events

### events

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | — |
| description | text | Yes | — |
| chapter_id | uuid | Yes | — |
| starts_at | timestamptz | No | — |
| ends_at | timestamptz | No | — |
| venue | text | Yes | — |
| virtual_url | text | Yes | — |
| event_type | text | Yes | 'in_person' |
| category | text | Yes | — |
| status | text | No | 'draft' |
| cover_image_url | text | Yes | — |
| organizer_name | text | Yes | — |
| contact_email | text | Yes | — |
| contact_phone | text | Yes | — |
| max_capacity | integer | Yes | — |
| registration_deadline | timestamptz | Yes | — |
| fee_amount | numeric | Yes | — |
| fee_currency | text | Yes | 'INR' |
| address_line1 | text | Yes | — |
| city_id | uuid | Yes | — |
| state_id | uuid | Yes | — |
| country_id | uuid | Yes | — |
| tags | text[] | Yes | {} |
| consent_required | boolean | No | false |
| ticketing | jsonb | No | {} |
| recurring | jsonb | Yes | — |
| created_by | uuid | Yes | — |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**event_type:** `in_person`, `virtual`, `hybrid`
**status:** `draft`, `published`, `cancelled`

---

### event_rsvps

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| event_id | uuid | No | — |
| member_id | uuid | No | — |
| status | text | No | 'going' |
| guests | integer | No | 0 |
| created_at | timestamptz | No | now() |

**Unique constraint:** `(event_id, member_id)`
**Status values:** `going`, `maybe`, `not_going`

---

### event_checkins

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| event_id | uuid | No | — |
| member_id | uuid | No | — |
| scanned_by | uuid | Yes | — |
| scanned_at | timestamptz | No | now() |

---

### event_photos

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| event_id | uuid | No | — |
| url | text | No | — |
| caption | text | Yes | — |
| uploaded_by | uuid | Yes | — |
| consent | text | No | 'internal' |
| created_at | timestamptz | No | now() |

**consent values:** `internal`, `public`, `commercial`

---

## Business Directory

### businesses

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| owner_member_id | uuid | No | — |
| chapter_id | uuid | Yes | — |
| name | text | No | — |
| description | text | Yes | — |
| sector | text | Yes | — |
| logo_url | text | Yes | — |
| cover_image_url | text | Yes | — |
| website | text | Yes | — |
| email | text | Yes | — |
| phone | text | Yes | — |
| address_line1 | text | Yes | — |
| address_line2 | text | Yes | — |
| postal_code | text | Yes | — |
| city_id | uuid | Yes | — |
| state_id | uuid | Yes | — |
| country_id | uuid | Yes | — |
| gst_number | text | Yes | — |
| license_number | text | Yes | — |
| founded_year | integer | Yes | — |
| employee_count | text | Yes | — |
| revenue_range | text | Yes | — |
| tags | text[] | Yes | {} |
| operating_hours | jsonb | Yes | {} |
| social_links | jsonb | Yes | {} |
| verified | boolean | No | false |
| suspended | boolean | No | false |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

---

### jobs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| chapter_id | uuid | Yes | — |
| employer_business_id | uuid | Yes | — |
| employer_member_id | uuid | Yes | — |
| title | text | No | — |
| description | text | Yes | — |
| location | text | Yes | — |
| remote | boolean | No | false |
| employment_type | text | Yes | — |
| salary_min | numeric | Yes | — |
| salary_max | numeric | Yes | — |
| salary_currency | text | Yes | 'INR' |
| salary_period | text | Yes | — |
| experience_min | integer | Yes | — |
| experience_max | integer | Yes | — |
| education_required | text | Yes | — |
| skills_required | text[] | Yes | {} |
| benefits | text[] | Yes | {} |
| city_id | uuid | Yes | — |
| state_id | uuid | Yes | — |
| country_id | uuid | Yes | — |
| status | text | No | 'open' |
| positions_available | integer | Yes | — |
| tags | text[] | Yes | {} |
| suspended | boolean | No | false |

**employment_type:** `full_time`, `part_time`, `contract`, `internship`
**status:** `open`, `filled`, `closed`

---

### job_applications

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| job_id | uuid | No | — |
| member_id | uuid | No | — |
| resume_url | text | Yes | — |
| cover_letter | text | Yes | — |
| status | text | No | 'pending' |
| created_at | timestamptz | No | now() |

**Unique constraint:** `(job_id, member_id)`

---

## Content Management

### content_news

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| title | text | No | — |
| summary | text | Yes | — |
| body | text | Yes | — |
| cover_image_url | text | Yes | — |
| images | jsonb | No | [] |
| category | text | Yes | — |
| tags | text[] | No | {} |
| author_name | text | Yes | — |
| source_url | text | Yes | — |
| status | text | No | 'draft' |
| featured | boolean | Yes | false |
| views_count | integer | Yes | 0 |
| chapter_id | uuid | Yes | — |
| city_id | uuid | Yes | — |
| state_id | uuid | Yes | — |
| country_id | uuid | Yes | — |
| created_by | uuid | Yes | — |
| reviewed_by | uuid | Yes | — |
| published_at | timestamptz | Yes | — |
| schedule | jsonb | No | {} |
| article_type | text | No | 'article' | Type: `article`, `breaking`, `obituary` |
| pinned | boolean | No | false | Whether article is pinned/featured |
| pinned_until | timestamptz | Yes | — | Auto-expiry timestamp for pinned/breaking articles |
| image_alt | text | Yes | — | Accessibility alt text for cover image |
| scope | text | No | 'chapter' | Visibility scope: `chapter`, `global` |
| read_time_minutes | integer | Yes | — | Override for estimated read time |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**status:** `draft`, `review`, `published`, `archived`

**article_type:** `article` (default), `breaking` (shows Breaking News badge, enables pinning), `obituary` (Shok Sandesh, shows memorial section)

**scope:** `chapter` shows article only to the chapter's members; `global` shows to all members.

**Indexes:** `idx_content_news_pinned` (pinned, published_at), `idx_content_news_article_type` (article_type, status)

---

### announcements

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| title | text | No | — |
| body | text | Yes | — |
| starts_at | timestamptz | No | now() |
| ends_at | timestamptz | Yes | — |
| created_by | uuid | Yes | — |
| created_at | timestamptz | No | now() |

**RLS:** SELECT returns only active announcements (`starts_at <= now() AND (ends_at IS NULL OR ends_at > now())`); INSERT/UPDATE/DELETE by Global Admin or Chapter Admin.

---

## Finance

### funds

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| scope | text | No | — |
| chapter_id | uuid | Yes | — |
| name | text | No | — |
| currency | text | No | 'INR' |
| active | boolean | No | true |

**scope:** `global` or `chapter`

---

### donations

Supports multi-currency donations (INR, USD, GBP, AED, SGD, AUD). Donor email is required for 80G tax receipt generation. `donor_wall_opt_in` must be explicitly set to `true` for the name to appear on the Dharmaada Patron Wall.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| fund_id | uuid | No | — |
| member_id | uuid | Yes | — |
| amount | numeric | No | — |
| currency | text | No | 'INR' |
| type | text | No | 'one_time' |
| recurring_interval | text | Yes | — |
| status | text | No | 'created' |
| provider | text | No | 'manual' |
| provider_ref | text | Yes | — |
| payment_method | text | Yes | — |
| donor_name | text | Yes | — |
| donor_email | text | Yes | — |
| donor_phone | text | Yes | — |
| donor_address | text | Yes | — |
| pan_number | text | Yes | — |
| donor_wall_opt_in | boolean | No | false |
| notes | text | Yes | — |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | Yes | now() |

**Supported currencies:** `INR`, `USD`, `GBP`, `AED`, `SGD`, `AUD`

**type:** `one_time`, `recurring`

**recurring_interval:** `monthly`, `quarterly`, `annually` (populated when type = `recurring`; actual standing instructions require payment gateway integration — currently recorded for reference only)

---

### receipts

Donation receipts (one per donation).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| donation_id | uuid | No | — |
| number | text | No | — |
| payload | jsonb | No | {} |
| issued_at | timestamptz | No | now() |

**Unique constraint:** `donation_id`, `number`

---

### scholarships

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| chapter_id | uuid | Yes | — |
| name | text | No | — |
| description | text | Yes | — |
| amount | numeric | Yes | — |
| currency | text | No | 'INR' |
| deadline | date | Yes | — |
| status | text | No | 'open' |
| eligibility | text | Yes | — |
| required_documents | text[] | Yes | {} |
| contact_email | text | Yes | — |
| contact_phone | text | Yes | — |
| max_recipients | integer | Yes | — |
| city_id | uuid | Yes | — |
| state_id | uuid | Yes | — |
| country_id | uuid | Yes | — |
| category | text | Yes | — |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | Yes | now() |

**status:** `open`, `closed`

---

### scholarship_applications

Reviewed by Finance Admin or Global Admin via the Finance Dashboard. Status transitions: `pending` → `reviewing` → `approved` or `rejected`.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| scholarship_id | uuid | No | — |
| member_id | uuid | No | — |
| essay | text | Yes | — |
| status | text | No | 'pending' |
| created_at | timestamptz | No | now() |

**Unique constraint:** `(scholarship_id, member_id)`

**status:** `pending`, `reviewing`, `approved`, `rejected`

---

### medical_aid_requests

Reviewed and approved by Chapter Admin or Finance Admin. `approved_by` references `auth.users`.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| chapter_id | uuid | Yes | — |
| patient_name | text | No | — |
| relation | text | Yes | — |
| condition_summary | text | No | — |
| amount_needed | numeric | Yes | — |
| currency | text | No | 'INR' |
| documents | jsonb | No | {} |
| status | text | No | 'pending' |
| approved_by | uuid | Yes | — |
| approved_amount | numeric | Yes | — |

**status:** `pending`, `approved`, `rejected`

---

### hall_bookings

Reviewed and approved by Chapter Admin or Finance Admin. `approved_by` references `auth.users`.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| chapter_id | uuid | Yes | — |
| member_id | uuid | No | — |
| hall_name | text | No | — |
| purpose | text | Yes | — |
| booking_date | date | No | — |
| start_time | time | No | — |
| end_time | time | No | — |
| guests | integer | Yes | — |
| status | text | No | 'pending' |
| notes | text | Yes | — |
| approved_by | uuid | Yes | — |

**status:** `pending`, `approved`, `rejected`

---

## Mentorship

### mentorships

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| mentor_member_id | uuid | No | — |
| mentee_member_id | uuid | Yes | — |
| skills | text[] | No | {} |
| description | text | Yes | — |
| max_mentees | integer | Yes | 1 |
| availability | text | Yes | — |
| mode | text | Yes | 'online' |
| status | text | No | 'available' |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | Yes | now() |

**status:** `available`, `matched`, `completed`
**mode:** `online`, `in_person`

---

### mentorship_sessions

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | No |
| mentorship_id | uuid | No |
| notes | text | Yes |
| session_date | date | No |

---

## Governance & Moderation

### reports

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| reporter_member_id | uuid | Yes | — |
| entity_type | text | No | — |
| entity_id | uuid | No | — |
| category | text | No | — |
| reason | text | Yes | — |
| status | text | No | 'pending' |
| admin_action | text | Yes | — |
| admin_notes | text | Yes | — |
| reviewed_by | uuid | Yes | — |
| reviewed_at | timestamptz | Yes | — |

**category:** `fake`, `non_khadayata`, `harassment`, `obscene`

**status:** `pending`, `reviewed`, `resolved`, `dismissed`

**admin_action:** `none`, `warned`, `suspended`, `blocked`, `deleted`

**entity_type supported values:** `member`, `business`, `job`, `event`, `news`, `matrimonial_profile`, `oral_history`, `mentorship`

**RLS:** Any authenticated member can INSERT (create a report). SELECT: own reports or Global Admin / Moderator / Data Steward. UPDATE: Global Admin / Moderator only (to resolve/dismiss/take action).

**Moderator role access:** A Moderator can view all reports (any status), take action (warn / suspend / block), and mark reports as resolved or dismissed. Actions on entities: member → `suspended`/`blocked`, business/job/event/news/matrimonial_profile → `suspended = true`, oral_history → `status = 'pending'` (pulls it back to moderation queue), mentorship → `status = 'suspended'`.

---

### audits

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | No |
| actor_user_id | uuid | Yes |
| entity_type | text | No |
| entity_id | uuid | No |
| field | text | Yes |
| old_value | jsonb | Yes |
| new_value | jsonb | Yes |
| reason | text | Yes |
| created_at | timestamptz | No |

**RLS:** INSERT by system; SELECT by Global Admin / Data Steward only.

---

### chapter_transfers

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| from_chapter_id | uuid | Yes | — |
| to_chapter_id | uuid | No | — |
| reason | text | Yes | — |
| status | text | No | 'pending' |
| approved_by | uuid | Yes | — |
| approved_at | timestamptz | Yes | — |
| created_at | timestamptz | No | now() |

---

## Heritage & Archives

### oral_histories

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| title | text | No | — |
| description | text | Yes | — |
| narrator_name | text | Yes | — |
| narrator_member_id | uuid | Yes | — |
| recorded_date | date | Yes | — |
| media_url | text | Yes | — |
| media_type | text | No | 'audio' |
| duration_seconds | integer | Yes | — |
| transcript | text | Yes | — |
| tags | text[] | Yes | {} |
| status | text | No | 'draft' |
| uploaded_by | uuid | Yes | — |
| created_at | timestamptz | No | now() |

**media_type:** `audio`, `video`
**status:** `draft`, `published`

---

### heritage_tags

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| entity_type | text | No | — |
| entity_id | uuid | No | — |
| tag | text | No | — |
| tagged_by | uuid | Yes | — |
| approved | boolean | No | false |

---

### magazine_issues

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | No |
| title | text | No |
| issue_date | date | Yes |
| volume | text | Yes |
| pdf_url | text | Yes |
| ocr_text | text | Yes |
| metadata | jsonb | Yes |

---

### book_pages

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | No |
| book_key | text | No |
| page_number | integer | No |
| image_url | text | Yes |
| ocr_text | text | Yes |
| metadata | jsonb | Yes |

---

## Taxonomy & Settings

### taxonomies

Approved controlled vocabulary.

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | No |
| type | text | No |
| term | text | No |
| normalized | text | No |

**Unique constraint:** `(type, normalized)`

---

### tag_requests

User requests to add new taxonomy terms.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| requester_user_id | uuid | Yes | — |
| type | text | No | — |
| term | text | No | — |
| reason | text | Yes | — |
| status | text | No | 'pending' |
| decided_by | uuid | Yes | — |
| decided_at | timestamptz | Yes | — |

**status:** `pending`, `approved`, `rejected`

---

### settings

Platform-wide key-value settings.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| key | text | No (PK) | — |
| value | jsonb | No | {} |
| updated_at | timestamptz | No | now() |

**Seeded keys:** `platform_name`, `platform_version`, `kyc_enabled`, `matrimonial_enabled`, `global_id_enabled`

---

## Compliance & Privacy

### consents

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | Yes | — |
| context | text | No | — |
| policy_version | text | No | — |
| region | text | No | — |
| captured_at | timestamptz | No | now() |
| payload | jsonb | No | {} |

**context values:** `cookie_consent`, `directory_visibility`, `matrimonial_display`, `photo_tagging`, `marketing_emails`

---

### data_requests

GDPR / DPDP data export or deletion requests.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| type | text | No | — |
| status | text | No | 'pending' |
| completed_at | timestamptz | Yes | — |

**type:** `export`, `deletion`

---

### notification_preferences

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| member_id | uuid | No | — |
| email_enabled | boolean | No | true |
| whatsapp_enabled | boolean | No | false |
| push_enabled | boolean | No | false |
| categories | jsonb | No | {} |
| updated_at | timestamptz | No | now() |

---

## WhatsApp Messaging

### whatsapp_templates

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | — |
| language | text | No | 'en' |
| category | text | No | 'UTILITY' |
| header_text | text | Yes | — |
| body_text | text | No | — |
| footer_text | text | Yes | — |
| buttons | jsonb | Yes | [] |
| meta_template_id | text | Yes | — |
| status | text | No | 'draft' |
| created_by | uuid | Yes | — |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

---

### whatsapp_messages

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| template_id | uuid | Yes | — |
| recipient_phone | text | No | — |
| recipient_member_id | uuid | Yes | — |
| parameters | jsonb | Yes | {} |
| meta_message_id | text | Yes | — |
| status | text | No | 'queued' |
| sent_at | timestamptz | Yes | — |
| delivered_at | timestamptz | Yes | — |
| read_at | timestamptz | Yes | — |
| error | text | Yes | — |
| created_at | timestamptz | No | now() |

**status:** `queued`, `sent`, `delivered`, `read`, `failed`

---

## Reference Tables

### countries

| Column | Type |
|--------|------|
| id | uuid |
| iso2 | char(2) UNIQUE |
| name | text |

**Seeded:** India, USA, UK, UAE, Canada, Australia, Singapore, Kenya

---

### states

| Column | Type |
|--------|------|
| id | uuid |
| country_id | uuid |
| code | text |
| name | text |

---

### cities

| Column | Type |
|--------|------|
| id | uuid |
| state_id | uuid |
| code | text |
| name | text |

---

### city_codes

Used by the Global ID generator. Each city has a canonical 3-letter code.

| Column | Type |
|--------|------|
| city_name | text |
| city_code | text |
| state_code | text |
| country_code | text |

**Examples:** AHM=Ahmedabad, SUR=Surat, MUM=Mumbai, NYC=New York City, LON=London

---

### global_id_sequences

Atomic counter per (country, state, city, year) combination.

| Column | Type |
|--------|------|
| country_code | text |
| state_code | text |
| city_code | text |
| year_code | text |
| last_sequence | integer |

**Unique constraint:** `(country_code, state_code, city_code, year_code)`

---

## Media

### media_files

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| owner_user_id | uuid | Yes | — |
| url | text | No | — |
| mime_type | text | Yes | — |
| size_bytes | bigint | Yes | — |
| consent | text | No | 'internal' |
| entity_type | text | Yes | — |
| entity_id | uuid | Yes | — |
| scanned | boolean | No | false |
| scan_result | text | Yes | — |

---

## Emergency Contacts

### emergency_contacts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| city_id | uuid | Yes | — |
| name | text | No | — |
| phone | text | No | — |
| type | text | No | — |
| created_at | timestamptz | No | now() |

**type examples:** `Community`, `Police`, `Hospital`, `Transport`

---

## Key Indexes

| Table | Column(s) | Type |
|---|---|---|
| members | user_id | btree |
| members | chapter_id | btree |
| members | global_id | unique partial (NOT NULL) |
| role_assignments | member_id | btree |
| role_assignments | (member_id, end_date) | partial (active) |
| role_assignments | role_id | btree |
| events | (chapter_id, starts_at) | btree |
| content_news | (status, published_at) | partial (published) |
| businesses | owner_member_id | btree |
| matrimonial_profiles | member_id | unique |
| matrimonial_profiles | (visibility, verified) | btree |
| scholarship_applications | (scholarship_id, member_id) | unique |
| job_applications | (job_id, member_id) | unique |

---

## Triggers

### handle_new_user()

On `AFTER INSERT ON auth.users` — creates a blank `members` record with `user_id = NEW.id`, `first_name = ''`, `last_name = ''`.

### update_updated_at_column()

Applied to: `members`, `chapters`, `events`, `businesses`, `content_news`, `matrimonial_profiles`, `donations`, `hall_bookings`, `mentorships`, `scholarships`.

---

## Functions

### has_role(\_user\_id uuid, \_role text) → boolean

`STABLE SECURITY DEFINER` — checks whether the user has an active assignment to the named role:

```sql
SELECT EXISTS (
  SELECT 1 FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
  JOIN members m ON m.id = ra.member_id
  WHERE m.user_id = _user_id
    AND r.name = _role
    AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
)
```

### generate_global_id(p\_country\_code, p\_state\_code, p\_city\_code) → text

`SECURITY DEFINER` — atomically increments the sequence and returns the formatted Global ID.

**Format:** `KHD` + CC(2) + SS(2) + CTY(3) + YY(2) + SEQ(6) + CHECKSUM(1)
**Example:** `KHDINGJAHM26000001Z`

---

## Security Notes

- All tables have RLS enabled — no anonymous access
- Role checks always use `has_role()` — never store roles on `members`
- PII fields controlled by per-member `privacy` JSONB
- Audit log (`audits`) tracks all admin changes
- WhatsApp management restricted to Global Admin only (`canManageWhatsApp`)

---

## Role-Based Permissions Reference

The `usePermissions()` hook in `src/hooks/useRoles.ts` derives frontend permissions from role flags. Key Finance Admin permissions:

| Permission | Global Admin | Chapter Admin | Finance Admin | Notes |
|---|---|---|---|---|
| `canManageFunds` | Yes | No | Yes | Create/toggle funds in Finance Dashboard |
| `canManageScholarships` | Yes | No | Yes | Create scholarships + review applications |
| `canViewAllDonations` | Yes | No | Yes | Chapter-level donation ledger |
| `canApproveBookings` | Yes | Yes | Yes | Approve/reject hall bookings |
| `canApproveMedicalAid` | Yes | Yes | Yes | Approve/reject medical aid requests with disbursement amount |

Finance Admin at `/admin` is routed directly to the **Finance** tab (bypassing Members tab default).
