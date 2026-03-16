/*
  # Community Niche Features

  ## Summary
  Adds tables and columns to support Khadayata-specific community features:

  1. `samiti_groups` — Sub-groups within chapters (Mahila Mandal, Yuva Samiti, etc.)
  2. `samiti_members` — Members enrolled in sub-groups
  3. `donor_wall` — Tiered donor recognition for temple/community donations
  4. `rishta_requests` — Formal Rishta (match request) flow routed to family contact
  5. `family_connections` — Parivar (family tree) connections between members
  6. Adds `kuldevi` column to members if missing
  7. Adds `overseas_verified` flag to members for diaspora NRI tier
  8. Adds `elder_priority` flag to oral_history table for 70+ members

  ## Security
  - RLS enabled on all new tables
  - Members can view samiti data; only admins can manage
  - Rishta requests visible to sender + recipient family contact
  - Donor wall is public read
*/

-- Samiti (sub-group) management
CREATE TABLE IF NOT EXISTS samiti_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'general',
  description text,
  contact_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE samiti_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view samiti groups"
  ON samiti_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert samiti groups"
  ON samiti_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

CREATE POLICY "Admins can update samiti groups"
  ON samiti_groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

CREATE TABLE IF NOT EXISTS samiti_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id uuid REFERENCES samiti_groups(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(samiti_id, member_id)
);

ALTER TABLE samiti_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view samiti memberships"
  ON samiti_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage samiti members"
  ON samiti_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

CREATE POLICY "Admins can delete samiti members"
  ON samiti_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

-- Donor Wall
CREATE TABLE IF NOT EXISTS donor_wall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  tier text NOT NULL DEFAULT 'patron',
  amount_donated numeric(12, 2),
  currency text DEFAULT 'INR',
  dedication text,
  anonymous boolean DEFAULT false,
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE donor_wall ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view donor wall"
  ON donor_wall FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert donor wall entries"
  ON donor_wall FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Finance Admin')
    )
  );

-- Rishta Requests
CREATE TABLE IF NOT EXISTS rishta_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id uuid REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  to_profile_id uuid REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  family_contact_name text,
  family_contact_phone text,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(from_profile_id, to_profile_id)
);

ALTER TABLE rishta_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own rishta requests"
  ON rishta_requests FOR SELECT
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
    OR
    to_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Members can create rishta requests"
  ON rishta_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Members can update their received rishta requests"
  ON rishta_requests FOR UPDATE
  TO authenticated
  USING (
    to_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  )
  WITH CHECK (
    to_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Family Connections (Parivar Tree)
CREATE TABLE IF NOT EXISTS family_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  related_member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, related_member_id, relation_type)
);

ALTER TABLE family_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family connections"
  ON family_connections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can create their own family connections"
  ON family_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Members can delete their own family connections"
  ON family_connections FOR DELETE
  TO authenticated
  USING (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Add kuldevi to members if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'kuldevi'
  ) THEN
    ALTER TABLE members ADD COLUMN kuldevi text;
  END IF;
END $$;

-- Add overseas_verified to members if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'overseas_verified'
  ) THEN
    ALTER TABLE members ADD COLUMN overseas_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add elder_priority to oral_history if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'oral_history'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'oral_history' AND column_name = 'elder_priority'
    ) THEN
      ALTER TABLE oral_history ADD COLUMN elder_priority boolean DEFAULT false;
    END IF;
  END IF;
END $$;

-- Index for donor wall
CREATE INDEX IF NOT EXISTS idx_donor_wall_tier ON donor_wall(tier);
CREATE INDEX IF NOT EXISTS idx_donor_wall_chapter ON donor_wall(chapter_id);
CREATE INDEX IF NOT EXISTS idx_samiti_groups_chapter ON samiti_groups(chapter_id);
CREATE INDEX IF NOT EXISTS idx_family_connections_member ON family_connections(member_id);
CREATE INDEX IF NOT EXISTS idx_rishta_requests_from ON rishta_requests(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_rishta_requests_to ON rishta_requests(to_profile_id);
