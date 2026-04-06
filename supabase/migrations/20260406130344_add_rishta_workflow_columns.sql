/*
  # Add Missing Rishta Workflow Columns

  ## Summary
  The rishta_requests table is missing several columns that the RishtaWorkflow
  component expects for the full matrimonial introduction workflow.

  ## Changes
  - Add `intro_message` (text, nullable) - the introductory message sent with the request
  - Add `from_family_ok` (boolean, nullable) - whether the sender's family has approved
  - Add `to_family_ok` (boolean, nullable) - whether the recipient's family has approved
  - Add `admin_notes` (text, nullable) - notes added by moderators
  - Add `updated_at` (timestamptz) - last updated timestamp

  ## Notes
  - Existing `message` column remains for backward compatibility
  - All new columns are nullable to avoid breaking existing rows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'intro_message'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN intro_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'from_family_ok'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN from_family_ok boolean DEFAULT null;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'to_family_ok'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN to_family_ok boolean DEFAULT null;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN admin_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;
