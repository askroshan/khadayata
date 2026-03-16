/*
  # Rishta Approval Workflow + SMS Alerts

  ## New Tables

  ### rishta_requests
  Tracks the full Rishta (matrimonial) introduction workflow:
  - from_profile_id → to_profile_id
  - stages: intro_sent → family_review → family_approved → accepted | declined
  - family_notes stored as JSONB

  ### sms_messages
  Log of all SMS messages sent via the system.

  ## Security
  RLS policies ensure:
  - Only authenticated members can see rishta requests involving their profile
  - Global Admin and Moderators can see all
  - SMS messages visible only to Global Admin
*/

-- ── Rishta workflow ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rishta_requests (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id    uuid        NOT NULL REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  to_profile_id      uuid        NOT NULL REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  status             text        NOT NULL DEFAULT 'intro_sent'
                                 CHECK (status IN ('intro_sent', 'family_review', 'family_approved', 'accepted', 'declined', 'withdrawn')),
  intro_message      text,
  family_notes       jsonb       NOT NULL DEFAULT '{}',
  from_family_ok     boolean     DEFAULT NULL,
  to_family_ok       boolean     DEFAULT NULL,
  admin_notes        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_profile_id, to_profile_id)
);

CREATE INDEX IF NOT EXISTS rishta_requests_from_profile_idx ON rishta_requests(from_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_to_profile_idx   ON rishta_requests(to_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_status_idx       ON rishta_requests(status);

ALTER TABLE rishta_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rishta requests for their profile"
  ON rishta_requests FOR SELECT
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR to_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator')
    )
  );

CREATE POLICY "Members can create rishta requests from their own profile"
  ON rishta_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update rishta requests they are party to"
  ON rishta_requests FOR UPDATE
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR to_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator')
    )
  )
  WITH CHECK (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR to_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator')
    )
  );

-- ── SMS messages log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone  text        NOT NULL,
  recipient_member_id uuid     REFERENCES members(id) ON DELETE SET NULL,
  body             text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider         text        DEFAULT 'twilio',
  provider_sid     text,
  error            text,
  sent_by          uuid        REFERENCES members(id) ON DELETE SET NULL,
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_messages_recipient_idx ON sms_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS sms_messages_status_idx    ON sms_messages(status);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global Admin can read SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can insert SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );
