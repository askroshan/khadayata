/*
  # Add Obituaries Table

  ## Summary
  Creates a dedicated obituaries table for the Khadayata community platform.
  Chapter admins and publishers can post obituaries. All published obituaries
  are publicly visible (anon + authenticated). Latest obituaries appear first.

  ## New Tables
  - `obituaries`
    - `id` (uuid, primary key)
    - `full_name` (text, required) — name of the deceased
    - `also_known_as` (text, nullable) — alternate name / nickname
    - `dob` (date, nullable) — date of birth
    - `dod` (date, required) — date of passing
    - `city_of_origin` (text, nullable)
    - `city_of_passing` (text, nullable)
    - `chapter_id` (uuid, FK chapters, nullable)
    - `photo_url` (text, nullable)
    - `tribute` (text, nullable) — tribute / eulogy text
    - `family_message` (text, nullable)
    - `status` (text) — 'published' | 'draft' | 'pending'
    - `posted_by` (uuid, FK members)
    - `created_at` / `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anon and authenticated users can read published obituaries
  - Chapter admins, chapter publishers, and global publishers can insert/update
  - Global admins can delete
*/

CREATE TABLE IF NOT EXISTS obituaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  also_known_as text,
  dob date,
  dod date NOT NULL,
  city_of_origin text,
  city_of_passing text,
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  photo_url text,
  tribute text,
  family_message text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'pending')),
  posted_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obituaries_chapter_id ON obituaries(chapter_id);
CREATE INDEX IF NOT EXISTS idx_obituaries_dod ON obituaries(dod DESC);
CREATE INDEX IF NOT EXISTS idx_obituaries_status ON obituaries(status);
CREATE INDEX IF NOT EXISTS idx_obituaries_posted_by ON obituaries(posted_by);
CREATE INDEX IF NOT EXISTS idx_obituaries_created_at ON obituaries(created_at DESC);

ALTER TABLE obituaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published obituaries"
  ON obituaries FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Authorized roles can insert obituaries"
  ON obituaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Chapter Admin', 'Global Publisher', 'Publisher')
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

CREATE POLICY "Authorized roles can update obituaries"
  ON obituaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Chapter Admin', 'Global Publisher', 'Publisher')
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Chapter Admin', 'Global Publisher', 'Publisher')
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

CREATE POLICY "Global admins can delete obituaries"
  ON obituaries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name = 'Global Admin'
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );
