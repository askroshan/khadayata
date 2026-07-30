/*
  # Add Video Embed Support and Recurring Pledge Tracking

  1. Modified Tables
    - `content_news`: Added `video_url` column for YouTube/Vimeo embed links
    - `content_news`: Added `video_title` column for accessibility

  2. New Tables
    - `recurring_pledges`: Tracks Masik Sahayog / recurring donation commitments
      - `id` (uuid, primary key)
      - `member_id` (uuid, FK to members)
      - `fund_id` (uuid, FK to funds)
      - `amount` (numeric, pledge amount per interval)
      - `currency` (text, default INR)
      - `interval` (text: monthly, quarterly, annually)
      - `start_date` (date)
      - `end_date` (date, nullable - open-ended if null)
      - `status` (text: active, paused, completed, cancelled)
      - `notes` (text, nullable)
      - `created_at`, `updated_at` timestamps

    - `fundraising_campaigns`: Tracks special campaigns (Paryushan, etc.)
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `goal_amount` (numeric)
      - `currency` (text, default INR)
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text: draft, active, completed, cancelled)
      - `campaign_type` (text: paryushan, general, emergency, infrastructure)
      - `chapter_id` (uuid, nullable FK)
      - `created_by` (uuid, FK to members)
      - `cover_image_url` (text, nullable)
      - `created_at`, `updated_at` timestamps

    - `campaign_donations`: Links donations to campaigns
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, FK to fundraising_campaigns)
      - `donation_id` (uuid, FK to donations)
      - `created_at` timestamp

  3. Security
    - RLS enabled on all new tables
    - Authenticated users can view active campaigns and their own pledges
    - Finance admins and global admins can manage campaigns and view all pledges
*/

-- Add video support to content_news
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE content_news ADD COLUMN video_url text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'video_title'
  ) THEN
    ALTER TABLE content_news ADD COLUMN video_title text;
  END IF;
END $$;

-- Recurring pledges table
CREATE TABLE IF NOT EXISTS recurring_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  interval text NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly', 'quarterly', 'annually')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own pledges"
  ON recurring_pledges FOR SELECT
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Members can create own pledges"
  ON recurring_pledges FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update own pledges"
  ON recurring_pledges FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Finance admins can view all pledges"
  ON recurring_pledges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Finance Admin')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

-- Fundraising campaigns table
CREATE TABLE IF NOT EXISTS fundraising_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  goal_amount numeric NOT NULL CHECK (goal_amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  campaign_type text NOT NULL DEFAULT 'general' CHECK (campaign_type IN ('paryushan', 'general', 'emergency', 'infrastructure')),
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES members(id),
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fundraising_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active campaigns"
  ON fundraising_campaigns FOR SELECT
  TO authenticated
  USING (status = 'active' OR created_by IN (SELECT id FROM members WHERE user_id = auth.uid()) OR EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
    AND r.name IN ('Global Admin', 'Finance Admin', 'Chapter Admin')
    AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ));

CREATE POLICY "Finance admins can create campaigns"
  ON fundraising_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Finance Admin')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

CREATE POLICY "Finance admins can update campaigns"
  ON fundraising_campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Finance Admin')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Finance Admin')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

-- Campaign donations linking table
CREATE TABLE IF NOT EXISTS campaign_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES fundraising_campaigns(id) ON DELETE CASCADE,
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view campaign donations"
  ON campaign_donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fundraising_campaigns fc
      WHERE fc.id = campaign_id AND fc.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Finance Admin')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

CREATE POLICY "Finance admins can link donations to campaigns"
  ON campaign_donations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Finance Admin')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_pledges_member ON recurring_pledges(member_id);
CREATE INDEX IF NOT EXISTS idx_recurring_pledges_fund ON recurring_pledges(fund_id);
CREATE INDEX IF NOT EXISTS idx_recurring_pledges_status ON recurring_pledges(status);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_status ON fundraising_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_type ON fundraising_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_donations_campaign ON campaign_donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_donations_donation ON campaign_donations(donation_id);
