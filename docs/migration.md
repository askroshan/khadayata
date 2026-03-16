# Database Migration Guide

## Overview

This document describes the database migration history and procedures for the Khandelwal Heritage Directory (KHD) platform.

**Migration Tool:** Supabase Migrations  
**Location:** `supabase/migrations/`  
**Format:** SQL files with timestamp prefix

---

## Migration Workflow

### Creating a New Migration

1. **Via Supabase Tool:**
```bash
# Migration created automatically through Lovable Cloud interface
# Files appear in supabase/migrations/ with timestamp
```

2. **Migration File Format:**
```
YYYYMMDDHHMMSS_unique-id-description.sql
```

Example:
```
20260309040534_c0341e9a-1ead-49a0-ad7b-d7b6cd8a1222.sql
```

### Migration Execution

Migrations are executed automatically when:
- Pushed to the repository
- Deployed through Lovable Cloud
- Applied via Supabase CLI (if using external setup)

**Order:** Migrations execute in chronological order based on timestamp.

---

## Core Schema Migrations

### 1. Initial Schema Setup

**Purpose:** Create base tables for members, chapters, geography

**Tables Created:**
- countries
- states  
- cities
- chapters
- members
- families

**Key Features:**
- UUID primary keys
- Timestamp tracking
- Geographic hierarchy
- RLS enabled on all tables

```sql
-- Example: Countries table
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  iso2 CHAR(2) NOT NULL UNIQUE
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read countries"
  ON public.countries FOR SELECT
  USING (true);
```

---

### 2. Role-Based Access Control (RBAC)

**Purpose:** Implement secure role management system

**Tables Created:**
- roles
- role_assignments

**Functions Created:**
- `has_role(_user_id uuid, _role text) RETURNS boolean`

**Security Features:**
- Roles stored in separate table (not on members)
- SECURITY DEFINER function for permission checks
- Temporal role assignments with expiration dates
- Chapter-scoped roles

```sql
-- Role checking function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON r.id = ra.role_id
    JOIN public.members m ON m.id = ra.member_id
    WHERE m.user_id = _user_id AND r.name = _role
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  )
$$;
```

**Available Roles:**
- Global Admin
- Chapter Admin
- Finance Admin
- Data Steward
- Event Manager
- Directory Manager
- Publisher
- Global Publisher
- Moderator

---

### 3. Family Relationships

**Purpose:** Link members into family units

**Tables Created:**
- family_links
- family_invitations

**Features:**
- Self-referential member relationships
- Invitation system for unregistered family members
- Support for email/phone invitations
- Acceptance workflow

```sql
CREATE TABLE public.family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  related_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  relation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4. Matrimonial System

**Purpose:** Matchmaking platform for community

**Tables Created:**
- matrimonial_profiles
- matrimonial_introductions

**Features:**
- Extended member profiles
- Guardian support for minors
- Privacy controls (visibility settings)
- Photo arrays
- Partner preferences (JSONB)
- Connection request system

**Validation:**
- One profile per member (unique constraint)
- Height/weight constraints
- Enum-based fields for consistency

---

### 5. Events Management

**Purpose:** Community event organization

**Tables Created:**
- events
- event_rsvps
- event_checkins
- event_photos

**Features:**
- Draft/published workflow
- Virtual/in-person/hybrid events
- Capacity management
- Photo consent tracking
- QR code check-in system
- Ticketing configuration (JSONB)
- Recurring events support

```sql
-- Event photo consent
CREATE TABLE public.event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES public.members(id),
  consent TEXT NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consent levels: 'internal' | 'public' | 'commercial'
```

---

### 6. Business Directory

**Purpose:** Member business listings

**Tables Created:**
- businesses
- jobs
- job_applications

**Features:**
- Business profiles with verification
- Operating hours (JSONB)
- Social media links (JSONB)
- Job posting system
- Application tracking

---

### 7. Content Management

**Purpose:** News and announcements

**Tables Created:**
- content_news
- announcements

**Features:**
- Draft/review/publish workflow
- Featured articles
- Scheduling (JSONB)
- Geographic scoping
- View count tracking
- Image gallery (JSONB)

---

### 8. Financial Management

**Purpose:** Donation tracking and funds

**Tables Created:**
- funds
- donations
- medical_aid_requests
- hall_bookings

**Features:**
- Multiple fund accounts
- One-time and recurring donations
- Payment provider integration
- Donor wall opt-in
- Medical aid approval workflow
- Hall booking system

---

### 9. Global ID System

**Purpose:** Unique member identification

**Tables Created:**
- global_id_sequences
- city_codes

**Functions Created:**
- `generate_global_id(p_country_code, p_state_code, p_city_code) RETURNS text`

**ID Format:**
```
KHD-CCSSSCTY-YY-XXXXXX-Z
```

Where:
- KHD = Organization prefix
- CC = Country code (2 chars)
- SSS = State code (2 chars)  
- CTY = City code (3 chars)
- YY = Year (2 digits)
- XXXXXX = Sequence (6 digits, zero-padded)
- Z = Checksum (ISO 7064 Mod 37,36)

**Atomicity:**
```sql
-- Atomic sequence increment
INSERT INTO public.global_id_sequences 
  (country_code, state_code, city_code, year_code, last_sequence)
VALUES (upper(p_country_code), upper(p_state_code), upper(p_city_code), v_year, 1)
ON CONFLICT (country_code, state_code, city_code, year_code)
DO UPDATE SET last_sequence = global_id_sequences.last_sequence + 1
RETURNING last_sequence INTO v_seq;
```

---

### 10. Privacy & Compliance

**Purpose:** GDPR/DPDP compliance

**Tables Created:**
- consents
- data_requests
- media_files

**Features:**
- Context-based consent tracking
- Policy version control
- Regional compliance (EU/IN/US)
- Data export requests
- Data deletion requests
- File upload scanning
- Consent-based media access

**Consent Contexts:**
- cookie_consent
- directory_visibility
- matrimonial_display
- photo_tagging
- marketing_emails

```sql
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  context TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  region TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 11. Audit Logging

**Purpose:** Track administrative changes

**Tables Created:**
- audits

**Features:**
- Entity type tracking
- Field-level changes
- Old/new value comparison
- Actor identification
- Reason capture

```sql
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field TEXT,
  old_value JSONB,
  new_value JSONB,
  actor_user_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 12. Heritage & Archives

**Purpose:** Cultural preservation

**Tables Created:**
- heritage_tags
- magazine_issues
- book_pages

**Features:**
- Photo/content tagging system
- Tag approval workflow
- Historical magazine archive
- OCR text search
- Digitized book repository

---

### 13. Member Details

**Purpose:** Extended member information

**Tables Created:**
- education
- employment
- member_contacts
- member_languages
- member_skills

**Features:**
- Multiple education records
- Employment history
- Multiple contact methods (email/phone/whatsapp)
- Primary contact designation
- Contact verification
- Language proficiency
- Skills taxonomy

---

### 14. Chapter Management

**Purpose:** Chapter administration

**Tables Created:**
- chapter_transfers
- emergency_contacts

**Features:**
- Transfer request workflow
- Admin approval required
- Emergency contact directory by city
- Type-based categorization

---

## Performance & Security Hardening

### Missing FK Indexes

**Migration:** `20260315191508_add_missing_fk_indexes`

**Purpose:** Add missing indexes on foreign key columns to prevent sequential scans on joins

**Tables Updated:** Multiple tables with FK columns lacking corresponding indexes

---

### RLS Auth Init Plan Fix

**Migration:** `20260315191659_fix_rls_auth_init_plan`

**Purpose:** Wrap `auth.uid()` calls in RLS policies inside `(SELECT auth.uid())` subqueries to prevent re-evaluation per row and fix init-plan performance issues

---

## Seed Migrations

### Geography Seed

**Migration:** `20260315194356_seed_geography`

**Purpose:** Populate geography reference tables required for all FK-dependent data

**Data Inserted:**
- 8 countries (IN, US, GB, AE, CA, AU, SG, KE) with fixed UUIDs `c1000001-...` through `c1000008-...`
- 16 states/regions with fixed UUIDs `d1000001-...` through `d1000016-...`
- 19 cities with fixed UUIDs `e1000001-...` through `e1000019-...`
- 19 city codes for Global ID generation (correct codes: SUR for Surat, JPR for Jaipur)

---

### Chapters Seed

**Migration:** `20260315194424_seed_chapters`

**Purpose:** Create the 9 initial chapters

**Data Inserted:**
- 9 chapters (Global, Ahmedabad, Mumbai, Surat, Jaipur, Delhi, New York, London, Dubai) with fixed UUIDs `f1000001-...` through `f1000009-...`
- Each with `settings` JSONB including theme, features array, and contact email

---

### Test Users Seed

**Migration:** `20260315194605_seed_test_users_all_roles`

**Purpose:** Create 10 role-specific test accounts in `auth.users` with corresponding `auth.identities` and blank `members` profiles

**Accounts Created:**
- `global-admin@test.khandelwal.org` through `unverified@test.khandelwal.org`
- Auth UUIDs: `b0000001-cafe-0000-0000-000000000001` through `...000000000010`
- Password hash for `TestPass123!`

---

### Roles and Assignments Seed

**Migration:** `20260315194647_seed_roles_and_assignments`

**Purpose:** Insert all 11 platform roles with fixed UUIDs

**Data Inserted:**
- 7 global roles (Global Admin, Data Steward, Directory Manager, Event Manager, Finance Admin, Global Publisher, Moderator)
- 4 chapter-scoped roles (Chapter Admin × 2, Publisher × 2 for Ahmedabad and Mumbai)
- Fixed UUIDs: `a0100001-0001-0001-0001-000000000001` through `...000000000011`

**Note:** Initial role assignment attempt in this migration had incorrect user UUIDs and produced no rows. Corrected in the next migration.

---

### Update Role Members Seed

**Migration:** `20260315194808_seed_update_role_members`

**Purpose:** Update blank member profiles with real data and insert corrected role assignments

**Changes:**
- UPDATE statements for all 10 new test members (first_name, last_name, gender, dob, ekda, chapter_id, verification_level, onboarding_completed)
- Correct role assignment INSERTs using proper `-cafe-` auth user UUIDs
- `created_by` references `auth.users(id)` (not `members(id)`)

---

### Member Contacts, Employment, Education Seed

**Migration:** `20260315194921_seed_member_contacts_employment_education`

**Purpose:** Add rich profile data for all 19 named members

**Data Inserted:**
- Phone contacts for all members
- Employment records (Managing Director, CA, CFO, Doctor, etc.)
- Education records (MBA IIM-A, CA ICAI, MBBS, etc.)
- Skills and language associations

---

### Content, Events, News, Businesses Seed

**Migration:** `20260315195050_seed_content_events_news_businesses`

**Purpose:** Populate all content-related tables for demo/testing

**Data Inserted:**
- 7 events (4 upcoming published, 1 draft, 2 past published)
- 5 news articles (3 published including 2 featured, 1 draft, 1 published)
- 6 businesses (4 verified, 2 unverified) across textile, finance, logistics, events, legal, design sectors
- 3 jobs linked to businesses

---

### Matrimonial, Scholarships, Mentorships Seed

**Migration:** `20260315195202_seed_matrimonial_scholarships_mentorships`

**Purpose:** Populate remaining feature tables

**Data Inserted:**
- 6 matrimonial profiles (3 verified, 3 unverified)
- 3 open scholarships (Merit, Need-Based, STEM Excellence)
- 4 mentors with expertise topics
- 10 emergency contacts across 5 cities
- 5 funds (3 global, 2 chapter-specific)
- Platform settings (platform_name, kyc_enabled, etc.)
- 2 announcements

---

## Row-Level Security (RLS) Hardening

**Migration Date:** 2026-03-09 (Recent RBAC hardening)

**Purpose:** Enforce role-based restrictions on critical tables

**Tables Updated:**
- announcements
- emergency_contacts
- funds
- events
- businesses
- jobs
- content_news
- hall_bookings
- medical_aid_requests
- heritage_tags
- chapter_transfers
- scholarships (if exists)

**Changes:**
- Replaced broad authenticated user policies with role-specific policies
- Separated read/write permissions
- Applied principle of least privilege

**Example Before:**
```sql
-- Old: Too permissive
CREATE POLICY "Authenticated users can manage announcements"
  ON public.announcements
  USING (true);
```

**Example After:**
```sql
-- New: Role-restricted
CREATE POLICY "Admins can create announcements"
  ON public.announcements FOR INSERT
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Anyone can read announcements"
  ON public.announcements FOR SELECT
  USING (starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
```

---

## Storage Policies

### Bucket: avatars

```sql
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Bucket: matrimonial-photos

```sql
CREATE POLICY "Matrimonial photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'matrimonial-photos');

CREATE POLICY "Users upload own matrimonial photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'matrimonial-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Bucket: event-photos

```sql
CREATE POLICY "Event photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Members upload event photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-photos');
```

### Bucket: oral-histories

```sql
CREATE POLICY "Oral histories public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'oral-histories');

CREATE POLICY "Users upload own oral histories"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'oral-histories' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Triggers

### Auto-update Timestamps

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Applied to tables:
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- (Applied to all tables with updated_at column)
```

### Auto-create Member Profile

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (user_id, first_name, last_name)
  VALUES (NEW.id, '', '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Data Validation

### Validation Triggers (Preferred over CHECK constraints)

**Why Triggers?**
- CHECK constraints must be immutable
- Time-based validations fail on restore
- Triggers provide more flexibility

**Example: Date Validation**
```sql
CREATE OR REPLACE FUNCTION validate_event_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ends_at < NEW.starts_at THEN
    RAISE EXCEPTION 'Event end time must be after start time';
  END IF;
  
  IF NEW.registration_deadline IS NOT NULL AND 
     NEW.registration_deadline > NEW.starts_at THEN
    RAISE EXCEPTION 'Registration deadline must be before event start';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_event_dates_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_dates();
```

---

## Performance Optimizations

### Indexes Created

```sql
-- Member lookups
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_chapter_id ON public.members(chapter_id);
CREATE INDEX idx_members_global_id ON public.members(global_id) WHERE global_id IS NOT NULL;

-- Role lookups
CREATE INDEX idx_role_assignments_member_id ON public.role_assignments(member_id);
CREATE INDEX idx_role_assignments_active ON public.role_assignments(member_id, end_date) 
  WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- Event queries
CREATE INDEX idx_events_chapter_starts ON public.events(chapter_id, starts_at);
CREATE INDEX idx_events_status_published ON public.events(status, published_at) 
  WHERE status = 'published';

-- Content queries
CREATE INDEX idx_content_news_published ON public.content_news(status, published_at)
  WHERE status = 'published';

-- Business directory
CREATE INDEX idx_businesses_owner ON public.businesses(owner_member_id);
CREATE INDEX idx_businesses_verified ON public.businesses(verified) WHERE verified = true;

-- Matrimonial
CREATE INDEX idx_matrimonial_visibility ON public.matrimonial_profiles(visibility, verified);
```

---

## Migration Best Practices

### 1. Idempotency

Always use `IF NOT EXISTS` for table creation:

```sql
CREATE TABLE IF NOT EXISTS public.my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
```

### 2. Safe Column Addition

```sql
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS new_column TEXT;
```

### 3. Data Backfill

When adding NOT NULL columns:

```sql
-- Step 1: Add as nullable
ALTER TABLE public.members ADD COLUMN new_field TEXT;

-- Step 2: Backfill data
UPDATE public.members SET new_field = 'default_value' WHERE new_field IS NULL;

-- Step 3: Make NOT NULL
ALTER TABLE public.members ALTER COLUMN new_field SET NOT NULL;
```

### 4. Index Creation

Use `CONCURRENTLY` for large tables:

```sql
CREATE INDEX CONCURRENTLY idx_name ON public.table(column);
```

### 5. RLS Policy Updates

Drop and recreate policies rather than attempting to alter:

```sql
DROP POLICY IF EXISTS "old_policy_name" ON public.table;

CREATE POLICY "new_policy_name"
  ON public.table FOR SELECT
  USING (new_condition);
```

---

## Rollback Procedures

### Manual Rollback

1. **Identify Migration:**
```sql
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;
```

2. **Write Reverse Migration:**
```sql
-- Drop tables created
DROP TABLE IF EXISTS public.new_table;

-- Remove columns added
ALTER TABLE public.members DROP COLUMN IF EXISTS new_column;

-- Restore policies
-- (Include original policy definitions)
```

3. **Test in Development First**

### Automated Rollback

Lovable Cloud supports automatic rollback to previous state if deployment fails.

---

## Common Migration Patterns

### Adding a Feature Module

1. Create tables
2. Enable RLS on all tables
3. Create policies (least privilege)
4. Add indexes
5. Create functions (if needed)
6. Add triggers (if needed)
7. Document in schema.md

### Modifying Existing Schema

1. Add new columns (nullable first)
2. Backfill data
3. Apply constraints
4. Update policies
5. Update indexes
6. Update functions
7. Update documentation

### Fixing Security Issues

1. Audit current policies
2. Identify overly permissive rules
3. Create restrictive policies
4. Test with different roles
5. Deploy during low-traffic window
6. Monitor for errors

---

## Testing Migrations

### Pre-deployment Checklist

- [ ] Migration is idempotent
- [ ] RLS enabled on new tables
- [ ] Policies follow least privilege
- [ ] Indexes added for performance
- [ ] Triggers validated
- [ ] Functions have SECURITY DEFINER where needed
- [ ] Foreign keys have ON DELETE actions
- [ ] Timestamps tracked (created_at, updated_at)
- [ ] Documentation updated

### Post-deployment Verification

```sql
-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- Verify policies exist
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count;

-- Verify indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Future Migration Considerations

### Planned Features

- Multi-language support (i18n tables)
- Advanced search (full-text indexes)
- Notification system
- Messaging system
- Payment gateway integration
- Document management
- Survey/polling system

### Schema Evolution Strategy

1. **Backward Compatible:** Add new columns/tables without removing existing
2. **Deprecation Period:** Mark old columns as deprecated, maintain for 6 months
3. **Version Tracking:** Use migration comments to track feature versions
4. **Data Migration:** Always include data migration scripts for schema changes

---

## Emergency Procedures

### Database Corruption

1. Contact Supabase support immediately
2. Restore from automatic daily backup
3. Apply migrations from backup point to current
4. Verify data integrity

### Failed Migration

1. Monitor Supabase logs for errors
2. If auto-rollback fails, manually rollback
3. Fix migration SQL
4. Redeploy corrected migration

### Performance Degradation

1. Check for missing indexes
2. Analyze query plans (EXPLAIN ANALYZE)
3. Add indexes via CONCURRENTLY
4. Consider table partitioning for large tables

---

## Resources

- **Supabase Docs:** https://supabase.com/docs/guides/database
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Migration Guide:** https://supabase.com/docs/guides/database/migrations
