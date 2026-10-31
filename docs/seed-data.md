# Seed Data Documentation

## Overview

This document describes the seed data used to populate the Khadayata Heritage Directory (KHD) database for development, testing, and initial production deployment.

**Purpose:** Provide baseline reference data and sample records for system functionality.

**Method:** All seed data is applied via Supabase migrations in `supabase/migrations/`. There are no standalone SQL scripts. All seeds use `ON CONFLICT DO NOTHING` (or `ON CONFLICT DO UPDATE` for upsert cases) and are idempotent.

---

## Reference Data (Required for Production)

### Countries

197 countries seeded total (all UN-recognised countries + territories). Migrations:
- `seed_geography` — original 8 key community countries (c1 UUID series)
- `seed_world_geography_countries` — 189 additional countries (c2 UUID series)

**Coverage:** Africa (54), Americas (35), Asia (48), Europe (44), Oceania (16)

UUID patterns:
- Original 8: `c1000001-0000-0000-0000-000000000001` through `c1000008-...`
- World expansion: `c2000101-0000-0000-0000-000000000101` through `c2000297-...`

**Data Source:** ISO 3166-1 alpha-2 standard

---

### States / Regions

325 states/regions seeded total. Migrations:
- `seed_geography` — original 16 (d1 UUID series)
- `seed_world_geography_states_v2` — ~309 additional (d2 UUID series)

**Countries with states seeded:**
India (36), USA (51), UK (4), UAE (7), Canada (13), Australia (8), New Zealand (16), Germany (16), France (13), Italy (20), Spain (17), Brazil (27), South Africa (9), Nigeria (37), Pakistan (7), Bangladesh (8), Sri Lanka (9), Malaysia (16), Kenya (10)

**Countries without states (city-states / small nations):**
Singapore, Bahrain, Malta, Luxembourg, Monaco, Liechtenstein, Andorra, Vatican, San Marino, Maldives, and many small island nations — these countries have NO state records. The UI automatically skips the state dropdown for these.

---

### Cities

151 cities seeded total. Migrations:
- `seed_geography` — original 19 (e1 UUID series)
- `seed_world_geography_cities_and_codes` — 132 additional (e2 UUID series)

**Coverage:** Major cities in India, USA, UK, UAE, Canada, Australia, New Zealand, Germany, France, Italy, Spain, Brazil, South Africa, Nigeria, Pakistan, Bangladesh, Sri Lanka, Malaysia, Kenya, Singapore, and others.

---

### City Codes (For Global ID Generation)

195 city codes seeded total. Migrations:
- `seed_geography` — original 19 city codes
- `seed_world_geography_cities_and_codes` — ~176 additional codes

Used by `generate_global_id()` function. Format: `KHD + CC(2) + SS(2) + CTY(3) + YY(2) + SEQ(6) + CHECKSUM(1)` (state codes longer than 2 chars are truncated to 2 by the edge function before minting).

For stateless countries, `state_code` uses the country's ISO2 code (e.g., Singapore → `SG`).

**Important corrections vs earlier docs:**
- Surat code is `SUR` (not `SUT`)
- Jaipur code is `JPR` (not `JAI`)

---

### Chapters

9 chapters seeded. Migration: `seed_chapters`. Fixed UUIDs: `f1000001-0000-...` through `f1000009-...`

| UUID suffix | Slug | Name | Country |
|---|---|---|---|
| `f1000001-...` | `global` | Global | India (umbrella) |
| `f1000002-...` | `ahmedabad` | Ahmedabad Chapter | India |
| `f1000003-...` | `mumbai` | Mumbai Chapter | India |
| `f1000004-...` | `surat` | Surat Chapter | India |
| `f1000005-...` | `jaipur` | Jaipur Chapter | India |
| `f1000006-...` | `delhi` | New Delhi Chapter | India |
| `f1000007-...` | `new-york` | New York Chapter | USA |
| `f1000008-...` | `london` | London Chapter | UK |
| `f1000009-...` | `dubai` | Dubai Chapter | UAE |

Each chapter has `settings` JSONB: `{ theme, features[], contact: { email, phone, url } }`. Phone and URL were added via migration `add_phone_url_to_chapter_settings`.

---

### Roles

9 system roles. Migration: `seed_roles_and_assignments`. Fixed UUIDs: `a0100001-0001-0001-0001-000000000001` through `...000000000009`.

**Schema note:** The `roles` table has columns `(id, chapter_id, name, scope)` only. There are no `description` or `permissions` columns.

| UUID suffix | Name | Scope | chapter_id |
|---|---|---|---|
| `...000000000001` | Global Admin | global | NULL |
| `...000000000002` | Data Steward | global | NULL |
| `...000000000003` | Directory Manager | global | NULL |
| `...000000000004` | Event Manager | global | NULL |
| `...000000000005` | Finance Admin | global | NULL |
| `...000000000006` | Global Publisher | global | NULL |
| `...000000000007` | Moderator | global | NULL |
| `...000000000008` | Chapter Admin | chapter | Ahmedabad |
| `...000000000009` | Publisher | chapter | Ahmedabad |
| `...000000000010` | Chapter Admin | chapter | Mumbai |
| `...000000000011` | Publisher | chapter | Mumbai |

```sql
INSERT INTO public.roles (id, name, scope, chapter_id) VALUES
  ('a0100001-0001-0001-0001-000000000001', 'Global Admin',      'global',  NULL),
  ('a0100001-0001-0001-0001-000000000002', 'Data Steward',      'global',  NULL),
  ('a0100001-0001-0001-0001-000000000003', 'Directory Manager', 'global',  NULL),
  ('a0100001-0001-0001-0001-000000000004', 'Event Manager',     'global',  NULL),
  ('a0100001-0001-0001-0001-000000000005', 'Finance Admin',     'global',  NULL),
  ('a0100001-0001-0001-0001-000000000006', 'Global Publisher',  'global',  NULL),
  ('a0100001-0001-0001-0001-000000000007', 'Moderator',         'global',  NULL),
  ('a0100001-0001-0001-0001-000000000008', 'Chapter Admin',     'chapter', '<ahmedabad-chapter-id>'),
  ('a0100001-0001-0001-0001-000000000009', 'Publisher',         'chapter', '<ahmedabad-chapter-id>'),
  ('a0100001-0001-0001-0001-000000000010', 'Chapter Admin',     'chapter', '<mumbai-chapter-id>'),
  ('a0100001-0001-0001-0001-000000000011', 'Publisher',         'chapter', '<mumbai-chapter-id>')
ON CONFLICT (name, chapter_id) DO NOTHING;
```

---

### Funds

5 funds seeded. Migration: `seed_matrimonial_scholarships_mentorships`.

| Name | Scope | Currency |
|---|---|---|
| KHD General Fund | global | INR |
| KHD Education Scholarship Fund | global | INR |
| KHD Medical Aid Fund | global | INR |
| Ahmedabad Chapter Fund | chapter | INR |
| Mumbai Chapter Fund | chapter | INR |

---

## Test User Accounts

> **IMPORTANT:** Test accounts were removed from the production database on
> 2026-09-30 (migration `remove_test_seed_data_20260930`). Test accounts
> must never be seeded into production — see AGENTS.md section 3.1. Use
> these accounts only in local development environments (via `local-install/`).

### Role-Based Accounts (10)

Migration: `seed_test_users_all_roles`. Auth UUIDs follow pattern `b0000001-cafe-0000-0000-000000000001` through `...000000000010`.

**Password for all:** `TestPass123!`

| UUID suffix | Email | Role | Chapter |
|---|---|---|---|
| `...000000000001` | `global-admin@khadayataonline.com` | Global Admin | Global |
| `...000000000002` | `chapter-admin@khadayataonline.com` | Chapter Admin | Ahmedabad |
| `...000000000003` | `data-steward@khadayataonline.com` | Data Steward | Ahmedabad |
| `...000000000004` | `dir-manager@khadayataonline.com` | Directory Manager | Ahmedabad |
| `...000000000005` | `event-manager@khadayataonline.com` | Event Manager | Mumbai |
| `...000000000006` | `finance-admin@khadayataonline.com` | Finance Admin | Ahmedabad |
| `...000000000007` | `publisher@khadayataonline.com` | Global Publisher | Mumbai |
| `...000000000008` | `moderator@khadayataonline.com` | Moderator | Ahmedabad |
| `...000000000009` | `member@khadayataonline.com` | (none) | Ahmedabad |
| `...000000000010` | `unverified@khadayataonline.com` | (none) | (none) |

Role assignments are in `seed_update_role_members` (corrective migration with right auth UUIDs).

---

### Seed Community Accounts (10)

Pre-existing auth accounts (created before this session). `seed1–10@test.local`, password `SeedPass123!`. All assigned to Ahmedabad chapter.

| Email | Name | Profession |
|---|---|---|
| `seed1@test.local` | Aarav Mehta | Chartered Accountant |
| `seed2@test.local` | Karan Mehta | Doctor (MBBS) |
| `seed3@test.local` | Nisha Patel | Interior Designer |
| `seed4@test.local` | Vivek Joshi | Civil Engineer |
| `seed5@test.local` | Anjali Desai | Lawyer |
| `seed6@test.local` | Rohan Thakkar | Pharmacist |
| `seed7@test.local` | Meera Kothari | Art Curator |
| `seed8@test.local` | Arjun Bhatt | Mechanical Engineer |
| `seed9@test.local` | Kavita Sanghvi | Fashion Designer |
| `seed10@test.local` | Dhruv Parikh | Data Scientist |

---

## Sample / Demo Content

### Events (7)

Migration: `seed_content_events_news_businesses`.

| Name | Type | Status |
|---|---|---|
| Diwali Milap 2026 | in_person / Cultural | published |
| Business Networking Breakfast | in_person / Business | published |
| Youth Talent Showcase | in_person / Youth | published |
| Global KHD Connect - Webinar | virtual / Community | published |
| Scholarship Awards Ceremony | in_person / Education | draft |
| Holi Celebration 2026 | in_person / Cultural | published (past) |
| Annual General Meeting 2025 | in_person / Governance | published (past) |

---

### News Articles (5)

| Title | Status | Featured |
|---|---|---|
| KHD Platform Launches Global Directory Feature | published | yes |
| Ahmedabad Chapter Celebrates 25 Years | published | yes |
| New Matrimonial Feature: Advanced Matching | published | no |
| Upcoming: Oral History Recording Drive | draft | no |
| Scholarship Applications Open for 2026-27 | published | no |

---

### Businesses (6)

| Name | Sector | Verified |
|---|---|---|
| Khadayata Textiles Pvt Ltd | Textile | yes |
| Mehta & Sons Chartered Accountants | Finance | yes |
| Gupta Logistics Ltd | Logistics | yes |
| Celebration Events Co. | Events | yes |
| Desai & Partners Law Firm | Legal | no |
| DesignNest Studio | Design | no |

### Jobs (3)

- Logistics Coordinator – Gupta Logistics, Ahmedabad
- Article Assistant (CA Firm) – Mehta & Sons, Ahmedabad
- Event Executive – Celebration Events Co., Mumbai

---

### Matrimonial Profiles (6 demo + seed users)

Migration: `seed_matrimonial_scholarships_mentorships`.

| Name | Gender | Profession | Verified |
|---|---|---|---|
| Aarav Mehta | Male | CA | yes |
| Nisha Patel | Female | Interior Designer | yes |
| Karan Mehta | Male | Doctor | yes |
| Kavita Sanghvi | Female | Fashion Designer | yes |
| Amit Patel | Male | Software Engineer | no |
| Dhruv Parikh | Male | Data Scientist | no |

---

### Scholarships (3)

| Name | Amount | Status |
|---|---|---|
| KHD Merit Scholarship 2026 | ₹50,000 | open |
| KHD Need-Based Scholarship 2026 | ₹1,00,000 | open |
| Global STEM Excellence Award | ₹2,50,000 | open |

---

### Mentors (4)

| Name | Topics |
|---|---|
| Rajesh Khandelwal | Business Strategy, Leadership |
| Aarav Mehta | CA Prep, Tax Planning |
| Amit Patel | React, TypeScript, Node.js, Career in Tech |
| Karan Mehta | MBBS Entrance, Medical Career |

---

### Emergency Contacts (10)

2 contacts per city: Ahmedabad, Mumbai, New York, London, Dubai. Each has a community helpline + local service.

---

### Announcements (2)

- "Platform Launch Announcement" — active now
- "Diwali Milap Registration Open" — active until event date

---

### Platform Settings

Seeded via `settings` table (key/value):

| Key | Value |
|---|---|
| `platform_name` | Khadayata Heritage Directory |
| `kyc_enabled` | true |
| `matrimonial_enabled` | true |
| `oral_history_enabled` | true |
| `default_currency` | INR |

---

## Seeding Procedures

### How Seeds Are Applied

All seeds are Supabase migrations. Apply in order:

```
1. seed_geography                          — original 8 countries, 16 states, 19 cities, 19 city_codes
2. seed_world_geography_countries          — 189 additional countries (world coverage)
3. seed_world_geography_states_v2          — ~309 additional states/provinces
4. seed_world_geography_cities_and_codes   — 132 additional cities + ~176 city_codes
5. seed_chapters                           — 9 chapters
6. seed_test_users_all_roles               — 10 auth users + blank member profiles
7. seed_roles_and_assignments              — 11 roles + initial assignment attempt
8. seed_update_role_members                — member profile data + corrected role assignments
9. seed_member_contacts_employment_education — contacts, jobs, education, skills
10. seed_content_events_news_businesses    — events, news, businesses, jobs
11. seed_matrimonial_scholarships_mentorships — matrimonial, scholarships, mentors, funds
```

All migrations use `ON CONFLICT DO NOTHING` and can be re-run safely.

---

## Verification Queries

```sql
-- Verify geography
SELECT COUNT(*) FROM public.countries;        -- 197
SELECT COUNT(*) FROM public.states;           -- 325
SELECT COUNT(*) FROM public.cities;           -- 151
SELECT COUNT(*) FROM public.city_codes;       -- 195

-- Verify chapters and roles
SELECT COUNT(*) FROM public.chapters;         -- 9
SELECT name, scope FROM public.roles ORDER BY scope, name;   -- 11 roles

-- Verify members and role assignments
SELECT COUNT(*) FROM public.members;          -- 20+
SELECT COUNT(*) FROM public.role_assignments; -- 9 (one per role-based account)

-- Verify content
SELECT status, COUNT(*) FROM public.events GROUP BY status;
SELECT status, COUNT(*) FROM public.content_news GROUP BY status;
SELECT verified, COUNT(*) FROM public.businesses GROUP BY verified;
SELECT COUNT(*) FROM public.matrimonial_profiles;
SELECT COUNT(*) FROM public.scholarships;
SELECT COUNT(*) FROM public.mentorships;
SELECT COUNT(*) FROM public.funds;
SELECT COUNT(*) FROM public.emergency_contacts;
```

---

## Best Practices

1. **Always use ON CONFLICT DO NOTHING** for reference data to allow re-running
2. **Seeds live in migrations** — never standalone files
3. **Maintain FK insertion order**: countries → states → cities → chapters → auth.users → members → role_assignments
4. **UUIDs must be valid hex**: 8-4-4-4-12 hex chars; segments cannot contain non-hex letters
5. **`role_assignments.created_by` references `auth.users(id)`**, not `members(id)`
6. **Never include real PII** in sample data
7. **Auth trigger auto-creates blank members**: insert to `auth.users`, then UPDATE the member profile separately

---

## Future Enhancements

- Industry sector and skills taxonomy
- Language list
- Cultural event calendar templates
- Email templates
- Default privacy policies
