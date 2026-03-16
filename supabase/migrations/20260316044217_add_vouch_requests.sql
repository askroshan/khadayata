/*
  # Add vouch_requests table

  ## Summary
  Allows unverified (L0/L1) members to send a request to another member asking them
  to vouch for them. This is separate from the `vouches` table (where a voucher
  actively vouches FOR someone). Here the requester asks someone else to vouch for them.

  ## New Tables
  - `vouch_requests`
    - `id` (uuid, pk)
    - `requester_member_id` (uuid → members) — the person asking to be vouched
    - `target_member_id` (uuid → members) — the member being asked to vouch
    - `message` (text, optional personal note)
    - `status` (text: pending | accepted | declined)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Requesters can INSERT their own requests
  - Requesters can SELECT their own requests
  - Target members can SELECT requests directed at them
  - Target members can UPDATE status (accept/decline)
*/

CREATE TABLE IF NOT EXISTS vouch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  target_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_member_id, target_member_id)
);

CREATE INDEX IF NOT EXISTS vouch_requests_requester_idx ON vouch_requests(requester_member_id);
CREATE INDEX IF NOT EXISTS vouch_requests_target_idx ON vouch_requests(target_member_id);

ALTER TABLE vouch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters can insert own vouch requests"
  ON vouch_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Requesters can view own sent requests"
  ON vouch_requests FOR SELECT
  TO authenticated
  USING (
    requester_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR
    target_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Targets can update request status"
  ON vouch_requests FOR UPDATE
  TO authenticated
  USING (
    target_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    target_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );
