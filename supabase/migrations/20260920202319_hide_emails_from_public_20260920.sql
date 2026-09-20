/*
# Hide email and phone columns from public (anon) access

## Problem
Google flagged that email addresses and phone numbers are exposed on public pages.
The root cause: two tables with anon SELECT policies had table-wide column grants,
meaning anyone could call the Supabase data API directly and select sensitive
columns — even though the frontend only queries safe columns.

## Affected tables
1. `matrimonial_profiles` — has `contact_number` and `parent_contact` columns.
   Anon SELECT policy: "Public can read non-suspended matrimonial profiles"
   (visibility = 'members', suspended = false).
2. `family_invitations` — has `invitee_email`, `invitee_phone`,
   `invitee_phone_country_code` columns.
   Anon SELECT policy: "Anon can look up invitation by token"
   (acceptance_token IS NOT NULL).

## Fix
Revoke the table-wide SELECT grant from `anon` on both tables, then re-grant
SELECT only on the columns that public pages actually need. The `authenticated`
role keeps full table-wide SELECT (no change for signed-in users).

### matrimonial_profiles — anon-visible columns (safe subset):
id, member_id, guardian_member_id, visibility, verified, created_at, updated_at,
about, height_cm, weight_kg, complexion, blood_group, diet, marital_status,
manglik, gotra, nakshatra, rashi, native_place, family_type, family_status,
father_occupation, mother_occupation, siblings, hobbies, photos, glasses,
driving, citizenship, current_city, current_state, education_level,
education_field, father_name, mother_name, parents_marital_status,
position_title, business_name, visa_type, income, income_currency,
linkedin_url, ekda, kuldevi, country, suspended, preferences

Excluded from anon: `contact_number`, `parent_contact`

### family_invitations — anon-visible columns (safe subset):
id, inviter_member_id, relation, invitee_name, status, created_at,
accepted_at, accepted_by_member_id, acceptance_token

Excluded from anon: `invitee_email`, `invitee_phone`, `invitee_phone_country_code`

## Security impact
After this migration, an unauthenticated caller using the anon key cannot read
email or phone columns from either table, even by calling the data API directly
with a crafted column list. Authenticated users retain full access.

## Important notes
1. Column-level grants are checked BEFORE row-level policies, so this holds
   even though the anon SELECT policies still allow the rows.
2. The `authenticated` role is unchanged — signed-in users still have full
   column access on both tables.
3. This is idempotent: REVOKE + GRANT can be re-run safely.
*/
-- matrimonial_profiles: restrict anon to safe columns only
REVOKE SELECT ON matrimonial_profiles FROM anon;
GRANT SELECT (
  id, member_id, guardian_member_id, preferences, visibility, verified,
  created_at, updated_at, about, height_cm, weight_kg, complexion,
  blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi,
  native_place, family_type, family_status, father_occupation,
  mother_occupation, siblings, hobbies, photos, glasses, driving,
  citizenship, current_city, current_state, education_level,
  education_field, father_name, mother_name, parents_marital_status,
  position_title, business_name, visa_type, income, income_currency,
  linkedin_url, ekda, kuldevi, country, suspended
) ON matrimonial_profiles TO anon;

-- family_invitations: restrict anon to safe columns only
REVOKE SELECT ON family_invitations FROM anon;
GRANT SELECT (
  id, inviter_member_id, relation, invitee_name, status, created_at,
  accepted_at, accepted_by_member_id, acceptance_token
) ON family_invitations TO anon;
