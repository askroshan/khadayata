/*
  # Elders Council Forum + Auto-flagging

  ## New Tables

  ### council_threads
  Forum threads for the Elders Council. L3+ verified members may create threads.

  ### council_votes
  Up/down votes on council threads. One vote per member per thread.

  ### council_replies
  Replies to council threads. L1+ verified members may post.

  ### banned_keywords
  Admin-managed list of keywords that trigger automatic content flagging.

  ## Auto-flagging Trigger
  `fn_autoflag_content` fires AFTER INSERT OR UPDATE on `content_news` and `oral_histories`.
  Checks text against `banned_keywords` and inserts a system report if a match is found.

  ## Security
  - RLS enabled on all new tables with appropriate policies
*/

-- ── Elders Council threads ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS council_threads (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  chapter_id   uuid        REFERENCES chapters(id) ON DELETE SET NULL,
  title        text        NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  body         text        NOT NULL CHECK (char_length(body) >= 10),
  category     text        NOT NULL DEFAULT 'general'
                           CHECK (category IN ('general', 'governance', 'tradition', 'announcement', 'poll')),
  poll_options jsonb       DEFAULT NULL,
  closed       boolean     NOT NULL DEFAULT false,
  pinned       boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS council_threads_author_id_idx    ON council_threads(author_id);
CREATE INDEX IF NOT EXISTS council_threads_chapter_id_idx   ON council_threads(chapter_id);
CREATE INDEX IF NOT EXISTS council_threads_created_at_idx   ON council_threads(created_at DESC);

ALTER TABLE council_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated members can read council threads"
  ON council_threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "L3+ members can create council threads"
  ON council_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.uid()
        AND members.verification_level >= 3
    )
  );

CREATE POLICY "Thread author or Global Admin can update thread"
  ON council_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Thread author or Global Admin can delete thread"
  ON council_threads FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

-- ── Council votes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS council_votes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid        NOT NULL REFERENCES council_threads(id) ON DELETE CASCADE,
  member_id    uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  vote         smallint    NOT NULL CHECK (vote IN (1, -1)),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, member_id)
);

CREATE INDEX IF NOT EXISTS council_votes_thread_id_idx ON council_votes(thread_id);

ALTER TABLE council_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated members can read council votes"
  ON council_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can cast their own council vote"
  ON council_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = member_id)
  );

CREATE POLICY "Members can delete their own council vote"
  ON council_votes FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = member_id)
  );

-- ── Council replies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS council_replies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid        NOT NULL REFERENCES council_threads(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body       text        NOT NULL CHECK (char_length(body) >= 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS council_replies_thread_id_idx ON council_replies(thread_id);

ALTER TABLE council_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated members can read council replies"
  ON council_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "L1+ verified members can post council replies"
  ON council_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.uid()
        AND members.id = author_id
        AND members.verification_level >= 1
    )
  );

CREATE POLICY "Reply author can delete own council reply"
  ON council_replies FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
  );

-- ── Banned keywords ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banned_keywords (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    text        NOT NULL UNIQUE CHECK (char_length(keyword) >= 2),
  severity   text        NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  added_by   uuid        REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banned_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read banned keywords"
  ON banned_keywords FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator', 'Data Steward')
    )
  );

CREATE POLICY "Global Admin can insert banned keywords"
  ON banned_keywords FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can update banned keywords"
  ON banned_keywords FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can delete banned keywords"
  ON banned_keywords FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

-- ── Auto-flagging function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_autoflag_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_body        text;
  v_entity_type text;
  v_entity_id   uuid;
  v_keyword     record;
  v_existing    integer;
BEGIN
  IF TG_TABLE_NAME = 'content_news' THEN
    v_body := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '') || ' ' || COALESCE(NEW.body, '');
    v_entity_type := 'news';
    v_entity_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'oral_histories' THEN
    v_body := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.transcript, '');
    v_entity_type := 'oral_history';
    v_entity_id := NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  FOR v_keyword IN SELECT keyword, severity FROM banned_keywords LOOP
    IF position(lower(v_keyword.keyword) IN lower(v_body)) > 0 THEN
      SELECT COUNT(*) INTO v_existing
      FROM reports
      WHERE entity_type = v_entity_type
        AND entity_id = v_entity_id::text
        AND reporter_member_id IS NULL;

      IF v_existing = 0 THEN
        INSERT INTO reports (entity_type, entity_id, reason, category)
        VALUES (
          v_entity_type,
          v_entity_id::text,
          'Content automatically flagged: contains banned keyword "' || v_keyword.keyword || '" (severity: ' || v_keyword.severity || ')',
          'auto_flagged'
        );
      END IF;
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflag_content_news ON content_news;
CREATE TRIGGER trg_autoflag_content_news
  AFTER INSERT OR UPDATE OF title, summary, body ON content_news
  FOR EACH ROW EXECUTE FUNCTION fn_autoflag_content();

DROP TRIGGER IF EXISTS trg_autoflag_oral_history ON oral_histories;
CREATE TRIGGER trg_autoflag_oral_history
  AFTER INSERT OR UPDATE OF title, transcript ON oral_histories
  FOR EACH ROW EXECUTE FUNCTION fn_autoflag_content();

-- ── Seed example banned keywords ─────────────────────────────────────────────
INSERT INTO banned_keywords (keyword, severity) VALUES
  ('spam',      'low'),
  ('scam',      'high'),
  ('fraud',     'high'),
  ('fake',      'medium'),
  ('offensive', 'medium')
ON CONFLICT (keyword) DO NOTHING;
