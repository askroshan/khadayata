/*
# Create notifications table with RLS and indexes

1. New Tables
- `notifications`
  - id (uuid, primary key, default gen_random_uuid())
  - member_id (uuid, not null, references members(id) on delete cascade)
  - type (text, not null) — one of: vouch, rsvp, mentorship, verification,
    announcement, event_created, event_cancelled, event_updated, event_reminder,
    chapter_message
  - title (text, not null)
  - description (text, not null, default '')
  - entity_id (text, nullable) — ID of the related record (e.g., event_id, vouch_id)
  - entity_type (text, nullable) — type of the related entity (e.g., 'event', 'vouch')
  - read (boolean, not null, default false)
  - created_at (timestamptz, default now())

2. Indexes
- `notifications_member_id_read_idx` on (member_id, read) — fast unread count for bell
- `notifications_member_id_created_at_idx` on (member_id, created_at DESC) — fast list display
- `notifications_entity_idx` on (entity_id, entity_type) — lookups by related entity

3. Security
- RLS enabled on `notifications`.
- Members can SELECT only their own notifications (auth.uid() → member lookup).
- Members can UPDATE only the `read` column on their own notifications.
- No INSERT, DELETE via RLS — inserts happen via SECURITY DEFINER functions only.
- This prevents members from creating fake notifications or deleting history.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  entity_id text,
  entity_type text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS notifications_member_id_read_idx
  ON notifications (member_id, read);

CREATE INDEX IF NOT EXISTS notifications_member_id_created_at_idx
  ON notifications (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_entity_idx
  ON notifications (entity_id, entity_type);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_notifications_read" ON notifications;
CREATE POLICY "update_own_notifications_read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );
