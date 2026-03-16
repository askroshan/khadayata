/*
  # Add anonymous read policies for public browsing pages

  ## Changes
  - mentorships: add SELECT policy for anon role (status = available only)
  - matrimonial_profiles: add SELECT policy for anon role (visibility = members, not suspended)
    and fix: the public page should show non-suspended profiles with visibility 'members'
    (PII fields are excluded at the query level in the frontend)

  ## Notes
  - Anon users can only read; no INSERT/UPDATE/DELETE is allowed
  - The frontend queries only non-PII columns for anon browsing
*/

CREATE POLICY "Public can read available mentorships"
  ON mentorships
  FOR SELECT
  TO anon
  USING (status = 'available');

CREATE POLICY "Public can read non-suspended matrimonial profiles"
  ON matrimonial_profiles
  FOR SELECT
  TO anon
  USING (suspended = false AND visibility = 'members');
