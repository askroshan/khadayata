/*
  # Add chapter_id to role_assignments

  ## Summary
  The role_assignments table was missing a chapter_id column, which is required
  for chapter-scoped role assignments (e.g., Chapter Admin scoped to a specific chapter).

  ## Changes
  - `role_assignments` table:
    - Adds `chapter_id` (uuid, nullable FK to chapters) for chapter-scoped roles
    - Global roles (Global Admin, Global Publisher) leave this NULL
    - Chapter-scoped roles (Chapter Admin, Event Manager, etc.) set this to the relevant chapter

  ## Notes
  - Column is nullable to support global-scope roles
  - Existing rows keep chapter_id as NULL (safe for existing global admin seed data)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_assignments' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE role_assignments ADD COLUMN chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_role_assignments_chapter_id ON role_assignments(chapter_id);
  END IF;
END $$;
