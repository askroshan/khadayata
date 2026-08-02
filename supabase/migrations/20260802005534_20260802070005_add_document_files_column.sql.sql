/*
# Add document_files JSONB column to verification_requests

1. Modified Tables
- `verification_requests`
  - Added `document_files` jsonb, nullable, default null
  - Stores an array of uploaded file metadata objects: [{ path, filename, size, uploaded_at }]
  - Used for multi-file document uploads during verification requests.

2. Security
- No policy changes — existing RLS on verification_requests covers this column.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_requests'
    AND column_name = 'document_files'
  ) THEN
    ALTER TABLE verification_requests
      ADD COLUMN document_files jsonb;
  END IF;
END $$;
