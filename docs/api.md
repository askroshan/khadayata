# API Documentation

## Overview

This document describes the backend APIs available in the Khandelwal Heritage Directory (KHD) platform. The platform uses Supabase Edge Functions for serverless backend operations and provides direct database access through Supabase client libraries.

## Base URL

```
https://zwiewldqgfqapwuqtsqb.supabase.co/functions/v1
```

## Authentication

All API requests require authentication using Supabase JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Edge Functions

### 1. Generate Global ID

**Endpoint:** `POST /generate-global-id`

**Purpose:** Generates a unique global member ID in the format `KHD-CCSSSCTY-YY-XXXXXX-Z`

**Authentication:** Required (Member or Admin)

**Request Body:**
```json
{
  "member_id": "uuid"
}
```

**Response (Success):**
```json
{
  "global_id": "KHD-INGJAHM-25-000001-Z",
  "raw": "KHDINGJAHM25000001Z"
}
```

**Response (Already Assigned):**
```json
{
  "global_id": "KHD-INGJAHM-25-000001-Z",
  "message": "Already assigned"
}
```

**Error Responses:**

- `401 Unauthorized` - No authorization header or invalid token
- `403 Forbidden` - Not authorized to generate ID for this member
- `404 Not Found` - Member not found
- `400 Bad Request` - Member has no chapter assigned

**ID Format:**
- `KHD` - Organization prefix
- `CC` - Country code (2 chars)
- `SS` - State code (2 chars)
- `CTY` - City code (3 chars)
- `YY` - Year (2 digits)
- `XXXXXX` - Sequence number (6 digits)
- `Z` - Checksum digit (ISO 7064 Mod 37,36)

**Access Control:**
- Members can generate their own global ID
- Global Admins can generate for any member

---

### 2. Send WhatsApp Message

**Endpoint:** `POST /send-whatsapp`

**Purpose:** Sends templated WhatsApp messages using Meta Cloud API

**Authentication:** Required (Global Admin only)

**Request Body:**
```json
{
  "template_id": "uuid",
  "recipient_phone": "+919876543210",
  "recipient_member_id": "uuid (optional)",
  "parameters": {
    "1": "Name",
    "2": "Event Date",
    "3": "Location"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message_id": "wamid.HBgLMTIzNDU2Nzg5MAUCABIYFjNBREQxODc4RjQxQ0Q1RDZCN0Y5MzEA"
}
```

**Error Responses:**

- `401 Unauthorized` - No authorization header or invalid token
- `403 Forbidden` - Only Global Admins can send messages
- `400 Bad Request` - Missing required fields (template_id, recipient_phone)
- `404 Not Found` - Template not found
- `500 Internal Server Error` - WhatsApp API not configured (missing secrets)
- `502 Bad Gateway` - Meta API error

**Configuration Requirements:**

Environment secrets required:
- `WHATSAPP_ACCESS_TOKEN` - Meta Cloud API access token
- `WHATSAPP_PHONE_NUMBER_ID` - Meta phone number ID

**Message Logging:**

All sent messages are logged to the `whatsapp_messages` table with:
- Template used
- Recipient details
- Parameters passed
- Meta message ID
- Status (sent/failed)
- Error details (if failed)

---

## Database RPC Functions

These functions are called directly through the Supabase client using `.rpc()` method.

### 1. has_role

**Purpose:** Check if a user has a specific role

**Signature:**
```sql
has_role(_user_id uuid, _role text) RETURNS boolean
```

**Usage:**
```typescript
const { data: isAdmin } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'Global Admin'
});
```

**Available Roles:**
- `Global Admin`
- `Chapter Admin`
- `Finance Admin`
- `Data Steward`
- `Event Manager`
- `Directory Manager`
- `Publisher`
- `Global Publisher`
- `Moderator`

**Security:** SECURITY DEFINER (runs with elevated privileges)

---

### 2. generate_global_id

**Purpose:** Generate unique global ID with atomic sequence increment

**Signature:**
```sql
generate_global_id(
  p_country_code text,
  p_state_code text,
  p_city_code text
) RETURNS text
```

**Usage:**
```typescript
const { data: globalId } = await supabase.rpc('generate_global_id', {
  p_country_code: 'IN',
  p_state_code: 'GJ',
  p_city_code: 'AHM'
});
```

**Returns:** Raw global ID string (e.g., `KHDINGJAHM25000001Z`)

**Security:** SECURITY DEFINER (runs with elevated privileges)

**Note:** This function is typically called through the Edge Function wrapper for proper authorization checks.

---

## Storage Buckets

### 1. avatars

**Public:** Yes  
**Purpose:** Member profile photos  
**Max Size:** 2MB recommended  
**Allowed Types:** image/jpeg, image/png, image/webp

**Upload Path Pattern:**
```
{user_id}/avatar.{ext}
```

**Access:**
- SELECT: Public
- INSERT: Authenticated users (own folder)
- UPDATE: Authenticated users (own folder)
- DELETE: Authenticated users (own folder)

---

### 2. matrimonial-photos

**Public:** Yes  
**Purpose:** Matrimonial profile photos  
**Max Size:** 5MB recommended  
**Allowed Types:** image/jpeg, image/png

**Upload Path Pattern:**
```
{member_id}/{photo_number}.{ext}
```

**Access:**
- SELECT: Public
- INSERT: Authenticated members (own folder)
- UPDATE: Authenticated members (own folder)
- DELETE: Authenticated members (own folder)

---

### 3. event-photos

**Public:** Yes  
**Purpose:** Event gallery photos  
**Max Size:** 10MB recommended  
**Allowed Types:** image/jpeg, image/png

**Upload Path Pattern:**
```
{event_id}/{timestamp}_{uploader_id}.{ext}
```

**Access:**
- SELECT: Public
- INSERT: Authenticated members
- UPDATE: Uploader only
- DELETE: Uploader or Event Manager

---

### 4. oral-histories

**Public:** Yes  
**Purpose:** Audio/video oral history recordings  
**Max Size:** 500MB  
**Allowed Types:** audio/mpeg, audio/wav, video/mp4

**Upload Path Pattern:**
```
{member_id}/{recording_id}.{ext}
```

**Access:**
- SELECT: Public
- INSERT: Authenticated members (own folder)
- UPDATE: Authenticated members (own folder)
- DELETE: Authenticated members (own folder)

---

## Rate Limits

- Edge Functions: 500 requests/minute per user
- Database Queries: 1000 requests/minute per user
- Storage Upload: 100 files/minute per user

---

## Error Handling

All API endpoints follow consistent error response format:

```json
{
  "error": "Human-readable error message",
  "details": {
    // Additional error context (optional)
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - External API error

---

## Webhooks

### WhatsApp Status Updates

**Endpoint:** (Configured in Meta Developer Console)

**Payload:**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id": "message_id",
          "status": "sent|delivered|read|failed",
          "timestamp": "unix_timestamp"
        }]
      }
    }]
  }]
}
```

---

## SDK Examples

### TypeScript/JavaScript (Supabase Client)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zwiewldqgfqapwuqtsqb.supabase.co',
  'YOUR_ANON_KEY'
);

// Call edge function
const { data, error } = await supabase.functions.invoke('generate-global-id', {
  body: { member_id: 'uuid' }
});

// Call RPC function
const { data: hasRole } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'Global Admin'
});

// Upload to storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file);
```

---

## Finance Admin — Client-Side Query Patterns

Finance Admin operations are performed directly via the Supabase client (no edge functions). All queries are chapter-scoped when `myChapterId` is not null.

### Donation Ledger

```typescript
supabase
  .from("donations")
  .select("*, funds(name)")
  .order("created_at", { ascending: false })
  .limit(200)
// Optionally filtered by fund_id or chapter via fund's chapter_id
```

### Medical Aid Approval

```typescript
supabase
  .from("medical_aid_requests")
  .update({ status: "approved", approved_amount: amount, approved_by: user.id, notes })
  .eq("id", requestId)
```

**Required permission:** `canApproveMedicalAid` (Global Admin, Chapter Admin, or Finance Admin)

### Scholarship Application Review

```typescript
supabase
  .from("scholarship_applications")
  .update({ status: "approved" | "reviewing" | "rejected" })
  .eq("id", applicationId)
```

**Required permission:** `canManageScholarships` (Global Admin or Finance Admin)

### Hall Booking Approval

```typescript
supabase
  .from("hall_bookings")
  .update({ status: "approved" | "rejected", approved_by: user.id })
  .eq("id", bookingId)
```

**Required permission:** `canApproveBookings` (Global Admin, Chapter Admin, or Finance Admin)

### Fund Management

```typescript
// Create fund
supabase.from("funds").insert({ name, currency, scope, chapter_id })

// Toggle active state
supabase.from("funds").update({ active: !currentActive }).eq("id", fundId)
```

**Required permission:** `canManageFunds` (Global Admin or Finance Admin)

### Seva Points (Gamified Giving)

Calculated client-side in `src/pages/Temple.tsx` by summing `donations.amount` for the authenticated member. Tiers:

| Tier | Minimum (INR) | Label |
|---|---|---|
| 1 | ₹1,00,000 | Maha Patron |
| 2 | ₹10,000 | Dharmaada Patron |
| 3 | ₹1,000 | Sahayogi |
| 4 | ₹0 | Donor |

Multi-currency donations are stored at their original currency amount — tier comparison uses raw numeric value and is most accurate for INR donations.

---

## Moderator Client-Side Query Patterns

### Fetch Reports (Moderator / Admin)

```typescript
// Pending reports — visible to Moderator + all admins
const { data: reports } = await supabase
  .from("reports")
  .select(`
    id, entity_type, entity_id, category, reason, status, admin_action, admin_notes, reviewed_at, created_at,
    reporter:members!reports_reporter_member_id_fkey(id, first_name, last_name, photo_url),
    reviewer:members!reports_reviewed_by_fkey(id, first_name, last_name)
  `)
  .eq("status", "pending")
  .order("created_at", { ascending: false })
  .limit(100);
```

### Resolve a Report

```typescript
// Mark as resolved with action and optional notes
await supabase
  .from("reports")
  .update({
    status: "resolved",           // or "dismissed"
    admin_action: "warned",       // none | warned | suspended | blocked | deleted
    admin_notes: "Content removed per community guidelines",
    reviewed_by: member.id,
    reviewed_at: new Date().toISOString(),
  })
  .eq("id", reportId);
```

### Submit a Report (Any Member)

```typescript
await supabase.from("reports").insert({
  reporter_member_id: member.id,
  entity_type: "news",            // member|business|job|event|news|matrimonial_profile|oral_history|mentorship
  entity_id: entityId,
  category: "harassment",         // fake|non_khadayata|harassment|obscene
  reason: "Optional free-text reason",
});
```

### Moderator Permission Gates (Frontend)

```typescript
const { isModerator } = useRoles();
// Use to gate Reports tab visibility in /admin
// isModerator = true for: Global Admin, Moderator role

// Reports tab is visible when:
const canViewReports = isAnyAdmin || isModerator;

// Roles / Tags / Samiti tabs are NOT shown to pure Moderators:
const canManageRoles = isGlobalAdmin || isChapterAdmin || isDataSteward;
```

### ReportDialog Entity Types

The `<ReportDialog>` component accepts the following `entityType` values:

| entityType | Used on |
|---|---|
| `member` | Member profile pages |
| `business` | Business directory cards |
| `job` | Job listing cards |
| `event` | Event cards |
| `news` | News article cards and detail page |
| `matrimonial_profile` | Matrimonial profile dialog |
| `oral_history` | Oral History story cards |
| `mentorship` | Mentor cards in Mentorship marketplace |

---

## Versioning

Current API Version: **v1**

Breaking changes will be introduced in new versions. The current version will be supported for at least 6 months after a new version is released.

---

## Support

For API support and questions:
- Technical Issues: Check backend logs in Lovable Cloud
- Feature Requests: Submit through project management
- Security Issues: Contact Global Admin immediately
