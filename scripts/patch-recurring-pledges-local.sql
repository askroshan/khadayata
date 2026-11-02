-- Local-only: production dump left recurring_pledges as id+created_at stub.
-- CREATE TABLE IF NOT EXISTS in migrations therefore never added columns. Safe to re-run.
-- Apply against Kong's Postgres (supabase_db). Do NOT ship as a hosted migration.
-- Column/check values match RecurringPledgesPanel UI (weekly/monthly/quarterly/yearly).

BEGIN;

ALTER TABLE recurring_pledges
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fund_id uuid REFERENCES funds(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "interval" text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS start_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE recurring_pledges DROP CONSTRAINT IF EXISTS recurring_pledges_amount_check;
ALTER TABLE recurring_pledges ADD CONSTRAINT recurring_pledges_amount_check
  CHECK (amount IS NULL OR amount > 0);

ALTER TABLE recurring_pledges DROP CONSTRAINT IF EXISTS recurring_pledges_interval_check;
ALTER TABLE recurring_pledges ADD CONSTRAINT recurring_pledges_interval_check
  CHECK ("interval" IN ('weekly', 'monthly', 'quarterly', 'yearly', 'annually'));

ALTER TABLE recurring_pledges DROP CONSTRAINT IF EXISTS recurring_pledges_status_check;
ALTER TABLE recurring_pledges ADD CONSTRAINT recurring_pledges_status_check
  CHECK (status IN ('active', 'paused', 'completed', 'cancelled'));

ALTER TABLE recurring_pledges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own pledges" ON recurring_pledges;
CREATE POLICY "Members can view own pledges"
  ON recurring_pledges FOR SELECT
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can create own pledges" ON recurring_pledges;
CREATE POLICY "Members can create own pledges"
  ON recurring_pledges FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can update own pledges" ON recurring_pledges;
CREATE POLICY "Members can update own pledges"
  ON recurring_pledges FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Finance admins can view all pledges" ON recurring_pledges;
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

DROP POLICY IF EXISTS "Finance admins can manage pledges" ON recurring_pledges;
CREATE POLICY "Finance admins can manage pledges"
  ON recurring_pledges FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_recurring_pledges_member ON recurring_pledges(member_id);
CREATE INDEX IF NOT EXISTS idx_recurring_pledges_fund ON recurring_pledges(fund_id);
CREATE INDEX IF NOT EXISTS idx_recurring_pledges_status ON recurring_pledges(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_pledges TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
