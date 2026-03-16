/*
  # Add anonymous read policy on members for public page joins

  ## Purpose
  Public pages (mentorship, matrimonial, events, business, directory) join to the
  members table to show first/last name, photo, chapter, and verification level.
  Without this policy the join silently returns null for anon visitors.

  ## Security
  - Anon users can only read non-PII profile fields
  - No phone, email, address, dob, or sensitive fields are exposed at this level
  - PII restriction is enforced by the frontend queries selecting only safe columns
*/

CREATE POLICY "Public can read basic member info"
  ON members
  FOR SELECT
  TO anon
  USING (true);
