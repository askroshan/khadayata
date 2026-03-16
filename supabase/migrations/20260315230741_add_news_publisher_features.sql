/*
  # Add Publisher Features to content_news

  1. New Columns
    - `article_type` (text, default 'article') — article | obituary | breaking
    - `pinned` (boolean, default false) — marks breaking/pinned news
    - `pinned_until` (timestamptz, nullable) — auto-expiry for pinned articles
    - `image_alt` (text, nullable) — WCAG alt text for cover image
    - `scope` (text, default 'chapter') — 'global' or 'chapter' for scoping
    - `read_time_minutes` (integer, nullable) — estimated read time

  2. Changes
    - Updates `status` enum notes: draft, review, published, archived
    - `article_type` values: article, obituary, breaking

  3. Security
    - No RLS changes required — existing policies cover new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'article_type'
  ) THEN
    ALTER TABLE content_news ADD COLUMN article_type text NOT NULL DEFAULT 'article';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'pinned'
  ) THEN
    ALTER TABLE content_news ADD COLUMN pinned boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'pinned_until'
  ) THEN
    ALTER TABLE content_news ADD COLUMN pinned_until timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'image_alt'
  ) THEN
    ALTER TABLE content_news ADD COLUMN image_alt text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'scope'
  ) THEN
    ALTER TABLE content_news ADD COLUMN scope text NOT NULL DEFAULT 'chapter';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'read_time_minutes'
  ) THEN
    ALTER TABLE content_news ADD COLUMN read_time_minutes integer;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_news_pinned ON content_news (pinned, pinned_until) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_content_news_article_type ON content_news (article_type);
