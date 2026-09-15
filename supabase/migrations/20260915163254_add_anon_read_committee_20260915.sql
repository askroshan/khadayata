/*
  # Add anonymous read access for public committee listings

  ## Summary
  The public chapter page (/chapters/:slug, Committee tab) reads
  role_assignments joined to roles and members. Those tables had SELECT
  policies scoped TO authenticated only, so signed-out visitors saw an empty
  committee list even when assignments existed (e.g. a Chapter Admin never
  appeared on his own chapter's public page).

  ## Changes
  - roles: add SELECT policy for anon (read-only taxonomy)
  - role_assignments: add SELECT policy for anon

  ## Notes
  - members and chapters already have anon/public read policies.
  - Members' private fields (email, phone, DOB) are excluded at the query
    level by useChapterCommittee; the select lists first_name, last_name,
    photo_url, global_id only.
  - Anon keeps read-only access; no writes are granted.
*/

CREATE POLICY "Anyone can read roles"
  ON roles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can read role assignments"
  ON role_assignments
  FOR SELECT
  TO anon
  USING (true);