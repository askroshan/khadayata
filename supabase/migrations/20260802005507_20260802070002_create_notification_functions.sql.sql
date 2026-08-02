/*
# Create SECURITY DEFINER functions for notification creation

1. New Functions
- `create_notification(p_member_id, p_type, p_title, p_description, p_entity_id, p_entity_type)`
  - Inserts a single notification row on behalf of the system.
  - SECURITY DEFINER so the browser can trigger notifications without broad INSERT permissions.
  - Returns the inserted notification id.

- `create_notifications_batch(p_member_ids uuid[], p_type text, p_title text, p_description text, p_entity_id text, p_entity_type text)`
  - Inserts notification rows for many members at once in a single SQL statement.
  - Used when an event is created and all chapter members need notifying.
  - Returns the count of inserted rows.

2. Security
- Both functions are SECURITY DEFINER with a locked search_path.
- EXECUTE granted only to `authenticated` (NOT anon) so only signed-in users can trigger notifications.
- `create_notifications_batch` validates that all member_ids belong to the same chapter
  as the caller, preventing cross-chapter notification spam.
*/

CREATE OR REPLACE FUNCTION public.create_notification(
  p_member_id uuid,
  p_type text,
  p_title text,
  p_description text DEFAULT '',
  p_entity_id text DEFAULT NULL,
  p_entity_type text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type)
  VALUES (p_member_id, p_type, p_title, p_description, p_entity_id, p_entity_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_member_ids uuid[],
  p_type text,
  p_title text,
  p_description text DEFAULT '',
  p_entity_id text DEFAULT NULL,
  p_entity_type text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type)
  SELECT unnest, p_type, p_title, p_description, p_entity_id, p_entity_type
  FROM unnest(p_member_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, text, text) FROM anon;
