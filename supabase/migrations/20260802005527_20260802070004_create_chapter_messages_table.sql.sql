/*
# Create chapter_messages table for audit trail

1. New Tables
- `chapter_messages`
  - id (uuid, primary key, default gen_random_uuid())
  - from_member_id (uuid, not null, references members(id) on delete cascade)
  - to_member_id (uuid, not null, references members(id) on delete cascade)
  - chapter_id (uuid, not null, references chapters(id) on delete cascade)
  - subject (text, not null, max 200 chars via CHECK)
  - body (text, not null, max 5000 chars via CHECK)
  - created_at (timestamptz, default now())

2. Indexes
- `chapter_messages_chapter_id_created_at_idx` on (chapter_id, created_at DESC)
- `chapter_messages_to_member_id_created_at_idx` on (to_member_id, created_at DESC)
- `chapter_messages_from_member_id_idx` on (from_member_id)

3. Security
- RLS enabled on `chapter_messages`.
- Members can SELECT messages they sent or received.
- Members can INSERT messages only from themselves (from_member_id must match their member id).
- No UPDATE or DELETE — messages are immutable once sent.
*/

CREATE TABLE IF NOT EXISTS chapter_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (char_length(subject) <= 200),
  body text NOT NULL CHECK (char_length(body) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chapter_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS chapter_messages_chapter_id_created_at_idx
  ON chapter_messages (chapter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chapter_messages_to_member_id_created_at_idx
  ON chapter_messages (to_member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chapter_messages_from_member_id_idx
  ON chapter_messages (from_member_id);

DROP POLICY IF EXISTS "select_own_chapter_messages" ON chapter_messages;
CREATE POLICY "select_own_chapter_messages"
  ON chapter_messages FOR SELECT
  TO authenticated
  USING (
    from_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR to_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_chapter_messages" ON chapter_messages;
CREATE POLICY "insert_own_chapter_messages"
  ON chapter_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );
