/*
# Add chapter_notifications_enabled column to notification_preferences

1. Modified Tables
- `notification_preferences`
  - Added `chapter_notifications_enabled` boolean NOT NULL DEFAULT true
  - This lets members opt out of chapter-specific email notifications (event created,
    event cancelled, event updated, chapter messages) while keeping other emails.

2. Security
- No policy changes — existing RLS on notification_preferences already covers this column.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
    AND column_name = 'chapter_notifications_enabled'
  ) THEN
    ALTER TABLE notification_preferences
      ADD COLUMN chapter_notifications_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;
