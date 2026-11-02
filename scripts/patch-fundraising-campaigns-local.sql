-- Local-only: production dump left fundraising_campaigns / campaign_donations as id+created_at stubs.
-- CREATE TABLE IF NOT EXISTS in migrations therefore never added columns. Safe to re-run.
-- Apply against Kong's Postgres (supabase_db) AND :5438 dump when both are in use.
-- Do NOT ship as a hosted migration.

BEGIN;

ALTER TABLE fundraising_campaigns
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS goal_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS campaign_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE fundraising_campaigns SET title = COALESCE(title, 'Legacy stub') WHERE title IS NULL;
ALTER TABLE fundraising_campaigns ALTER COLUMN title SET NOT NULL;

ALTER TABLE fundraising_campaigns DROP CONSTRAINT IF EXISTS fundraising_campaigns_status_check;
ALTER TABLE fundraising_campaigns ADD CONSTRAINT fundraising_campaigns_status_check
  CHECK (status IN ('draft', 'active', 'completed', 'cancelled'));

ALTER TABLE fundraising_campaigns DROP CONSTRAINT IF EXISTS fundraising_campaigns_campaign_type_check;
ALTER TABLE fundraising_campaigns ADD CONSTRAINT fundraising_campaigns_campaign_type_check
  CHECK (campaign_type IN ('paryushan', 'general', 'emergency', 'infrastructure', 'construction', 'education', 'medical'));

ALTER TABLE fundraising_campaigns DROP CONSTRAINT IF EXISTS fundraising_campaigns_goal_amount_check;
ALTER TABLE fundraising_campaigns ADD CONSTRAINT fundraising_campaigns_goal_amount_check
  CHECK (goal_amount IS NULL OR goal_amount > 0);

ALTER TABLE campaign_donations
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES fundraising_campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS donation_id uuid REFERENCES donations(id) ON DELETE CASCADE;

ALTER TABLE content_news ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE content_news ADD COLUMN IF NOT EXISTS video_title text;

DROP POLICY IF EXISTS "Anyone authenticated can view active campaigns" ON fundraising_campaigns;
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

DROP POLICY IF EXISTS "Finance admins can create campaigns" ON fundraising_campaigns;
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

DROP POLICY IF EXISTS "Finance admins can update campaigns" ON fundraising_campaigns;
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

DROP POLICY IF EXISTS "Authenticated can view campaign donations" ON campaign_donations;
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

DROP POLICY IF EXISTS "Finance admins can link donations to campaigns" ON campaign_donations;
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

CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_status ON fundraising_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_type ON fundraising_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_chapter_id ON fundraising_campaigns(chapter_id);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_created_by ON fundraising_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaign_donations_campaign ON campaign_donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_donations_donation ON campaign_donations(donation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON fundraising_campaigns TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_donations TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
