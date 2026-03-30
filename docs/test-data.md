# Test Data Documentation

## Overview

This document describes all test accounts, demo data, and fixtures for the Khadayata Heritage Directory (KHD) platform.

**Purpose:** Provide comprehensive test data for:
- Manual testing and QA
- UAT (User Acceptance Testing)
- Role-based access verification
- End-to-end feature testing

---

## Live Test Accounts

All accounts below are seeded in the live database. Password for all accounts: **`TestPass123!`**

### Role-Based Accounts

| Email | Role | Chapter | Notes |
|---|---|---|---|
| `global-admin@khadayataonline.com` | Global Admin | Global | Full platform access, can manage all data |
| `chapter-admin@khadayataonline.com` | Chapter Admin | Ahmedabad | Chapter-scoped governance |
| `data-steward@khadayataonline.com` | Data Steward | Ahmedabad | Member verification, heritage, matrimonial moderation |
| `dir-manager@khadayataonline.com` | Directory Manager | Ahmedabad | Business/job verification |
| `event-manager@khadayataonline.com` | Event Manager | Mumbai | Event creation and management |
| `finance-admin@khadayataonline.com` | Finance Admin | Ahmedabad | Funds, donations, scholarships |
| `publisher@khadayataonline.com` | Global Publisher | Mumbai | News creation and publishing |
| `moderator@khadayataonline.com` | Moderator | Ahmedabad | Content moderation, reports |
| `member@khadayataonline.com` | Regular Member | Ahmedabad | Standard member, no admin role |
| `unverified@khadayataonline.com` | None | None | Incomplete onboarding, verification_level=0 |

### Seed Community Members (10 accounts)

These represent a realistic community with rich profiles, matrimonial listings, and employment data.

| Email | Name | Chapter | Profession |
|---|---|---|---|
| `seed1@test.local` | Aarav Mehta | Ahmedabad | Chartered Accountant |
| `seed2@test.local` | Karan Mehta | Ahmedabad | Doctor (MBBS) |
| `seed3@test.local` | Nisha Patel | Ahmedabad | Interior Designer |
| `seed4@test.local` | Vivek Joshi | Ahmedabad | Civil Engineer |
| `seed5@test.local` | Anjali Desai | Ahmedabad | Lawyer |
| `seed6@test.local` | Rohan Thakkar | Ahmedabad | Pharmacist |
| `seed7@test.local` | Meera Kothari | Ahmedabad | Art Curator |
| `seed8@test.local` | Arjun Bhatt | Ahmedabad | Mechanical Engineer |
| `seed9@test.local` | Kavita Sanghvi | Ahmedabad | Fashion Designer |
| `seed10@test.local` | Dhruv Parikh | Ahmedabad | Data Scientist |

Password for seed accounts: **`SeedPass123!`**

---

## Demo Data Summary

### Geography
- **8 countries**: India, USA, UK, UAE, Canada, Australia, Singapore, Kenya
- **16 states/regions**: Gujarat, Maharashtra, Rajasthan, Delhi, Karnataka, MP + international
- **19 cities**: Ahmedabad, Surat, Vadodara, Rajkot, Mumbai, Pune, Jaipur, Jodhpur, New Delhi, Bengaluru, New York, Los Angeles, Chicago, London, Dubai, Toronto, Sydney, Singapore, Nairobi

### Chapters (9)
| Slug | Name | Country |
|---|---|---|
| `global` | Global | India (umbrella) |
| `ahmedabad` | Ahmedabad Chapter | India |
| `mumbai` | Mumbai Chapter | India |
| `surat` | Surat Chapter | India |
| `jaipur` | Jaipur Chapter | India |
| `delhi` | New Delhi Chapter | India |
| `new-york` | New York Chapter | USA |
| `london` | London Chapter | UK |
| `dubai` | Dubai Chapter | UAE |

### Roles (11)
Global roles: Global Admin, Data Steward, Directory Manager, Event Manager, Finance Admin, Global Publisher, Moderator

Chapter-scoped: Chapter Admin (Ahmedabad), Publisher (Ahmedabad), Chapter Admin (Mumbai), Publisher (Mumbai)

### Events (7)
| Event | Type | Status |
|---|---|---|
| Diwali Milap 2026 | In-person, Cultural | Published (upcoming) |
| Business Networking Breakfast | In-person, Business | Published (upcoming) |
| Youth Talent Showcase | In-person, Youth | Published (upcoming) |
| Global KHD Connect - Webinar | Virtual, Community | Published (upcoming) |
| Scholarship Awards Ceremony | In-person, Education | Draft (upcoming) |
| Holi Celebration 2026 | In-person, Cultural | Published (past) |
| Annual General Meeting 2025 | In-person, Governance | Published (past) |

### News Articles (5)
| Title | Status |
|---|---|
| KHD Platform Launches Global Directory Feature | Published, featured |
| Ahmedabad Chapter Celebrates 25 Years | Published, featured |
| New Matrimonial Feature: Advanced Matching | Published |
| Upcoming: Oral History Recording Drive | Draft |
| Scholarship Applications Open for 2026-27 | Published |

### Businesses (6)
| Business | Sector | Verified |
|---|---|---|
| Khadayata Textiles Pvt Ltd | Textile | Yes |
| Mehta & Sons Chartered Accountants | Finance | Yes |
| Gupta Logistics Ltd | Logistics | Yes |
| Celebration Events Co. | Events | Yes |
| Desai & Partners Law Firm | Legal | No |
| DesignNest Studio | Design | No |

### Jobs (3)
- Logistics Coordinator – Gupta Logistics, Ahmedabad
- Article Assistant (CA Firm) – Mehta & Sons, Ahmedabad
- Event Executive – Celebration Events Co., Mumbai

### Matrimonial Profiles (11 total, including from seed users)
6 new profiles created for demo:
- Aarav Mehta (Male, CA, Ahmedabad) – verified
- Nisha Patel (Female, Interior Designer, Ahmedabad) – verified
- Karan Mehta (Male, Doctor, Ahmedabad) – verified
- Kavita Sanghvi (Female, Fashion Designer, Ahmedabad) – verified
- Amit Patel (Male, Software Engineer, Ahmedabad) – unverified
- Dhruv Parikh (Male, Data Scientist, Ahmedabad) – unverified

### Scholarships (3)
- KHD Merit Scholarship 2026 – ₹50,000 – Open
- KHD Need-Based Scholarship 2026 – ₹1,00,000 – Open
- Global STEM Excellence Award – ₹2,50,000 – Open

### Mentors (4)
- Rajesh Khandelwal – Business Strategy, Leadership
- Aarav Mehta – CA Prep, Tax Planning
- Amit Patel – React, TypeScript, Node.js, Career in Tech
- Karan Mehta – MBBS Entrance, Medical Career

### Funds (5)
- KHD General Fund (Global)
- KHD Education Scholarship Fund (Global)
- KHD Medical Aid Fund (Global)
- Ahmedabad Chapter Fund
- Mumbai Chapter Fund

### Emergency Contacts (10)
Covers: Ahmedabad, Mumbai, New York, London, Dubai — each with community helpline + local services.

---

## Feature Testing Guide

### Testing Admin Panel (`/admin`)
Login as `global-admin@khadayataonline.com` to see all admin tabs:
- **Members** – verify members, view all profiles
- **Roles** – assign/revoke roles
- **Reports** – review abuse reports
- **Transfers** – approve chapter transfers
- **Audits** – view activity log
- **Announcements** – create platform-wide announcements

### Testing Chapter Admin
Login as `chapter-admin@khadayataonline.com` — access scoped to Ahmedabad chapter only.

### Testing Matrimonial
Login as any seed account or `member@khadayataonline.com`. 11 profiles available to browse and filter.

### Testing Events
- Upcoming events visible on `/events`
- Draft event (Scholarship Awards Ceremony) only visible to Event Manager / Admin
- RSVP as any logged-in member

### Testing News
- Published articles visible on `/news`
- Draft article (Oral History) only visible to Publisher / Admin
- Login as `publisher@khadayataonline.com` to create/edit articles

### Testing Business Directory
Login as `dir-manager@khadayataonline.com` to verify unverified businesses.
6 businesses across textile, finance, logistics, events, legal, design sectors.

### Testing Scholarships
3 open scholarships visible at `/scholarships`. Apply as any member.
Login as `finance-admin@khadayataonline.com` to manage funds and scholarships.

### Testing Mentorship
4 active mentors available. Mentorship pairing via `/mentorship`.

### Testing Onboarding
Login as `unverified@khadayataonline.com` — will be redirected to the 4-step onboarding flow (no chapter assigned, no profile data).

### Testing Directory
All 20 members with completed profiles appear in `/directory`. Filter by chapter, profession, ekda.

---

## Test Data Principles

1. **Isolation:** Each test should have independent data
2. **Realism:** Data mimics production patterns
3. **Completeness:** All roles, features, and edge cases covered
4. **Privacy:** No real member data used
5. **Idempotency:** All seeds use `ON CONFLICT DO NOTHING` and can be re-run safely

---

## TypeScript Fixtures (for unit/integration tests)

```typescript
export const testUsers = {
  globalAdmin: {
    email: 'global-admin@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Global Admin',
  },
  chapterAdmin: {
    email: 'chapter-admin@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Chapter Admin',
    chapter: 'ahmedabad',
  },
  datasteward: {
    email: 'data-steward@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Data Steward',
  },
  directoryManager: {
    email: 'dir-manager@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Directory Manager',
  },
  eventManager: {
    email: 'event-manager@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Event Manager',
  },
  financeAdmin: {
    email: 'finance-admin@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Finance Admin',
  },
  publisher: {
    email: 'publisher@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Global Publisher',
  },
  moderator: {
    email: 'moderator@khadayataonline.com',
    password: 'TestPass123!',
    role: 'Moderator',
  },
  regularMember: {
    email: 'member@khadayataonline.com',
    password: 'TestPass123!',
    role: null,
  },
  unverified: {
    email: 'unverified@khadayataonline.com',
    password: 'TestPass123!',
    onboardingCompleted: false,
  },
};

export const seedUsers = Array.from({ length: 10 }, (_, i) => ({
  email: `seed${i + 1}@test.local`,
  password: 'SeedPass123!',
}));
```

---

## Future Enhancements

- Snapshot testing for UI components
- Load testing with production-scale data
- Chaos engineering test scenarios
- Accessibility testing data
- Localization testing data
- Mobile-specific test scenarios
