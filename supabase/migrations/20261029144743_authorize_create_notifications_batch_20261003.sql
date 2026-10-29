-- F6: create_notifications_batch is SECURITY DEFINER and executable by every
-- authenticated role with no authorization check and no cap on the recipient
-- array, so any signed-in user could forge a notification to every member at
-- once. Its only legitimate callers are event/content management flows.
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_member_ids uuid[],
  p_type text,
  p_title text,
  p_description text DEFAULT ''::text,
  p_entity_id text DEFAULT NULL::text,
  p_entity_type text DEFAULT NULL::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL THEN
    IF NOT (
      has_role(v_uid, 'Global Admin')
      OR has_role(v_uid, 'Chapter Admin')
      OR has_role(v_uid, 'Event Manager')
      OR has_role(v_uid, 'Global Publisher')
      OR has_role(v_uid, 'Publisher')
      OR has_role(v_uid, 'Moderator')
    ) THEN
      RAISE EXCEPTION 'Not authorized to send bulk notifications';
    END IF;
  ELSIF current_setting('role', true) NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Not authorized to send bulk notifications';
  END IF;

  IF p_member_ids IS NULL OR array_length(p_member_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  IF array_length(p_member_ids, 1) > 5000 THEN
    RAISE EXCEPTION 'Too many recipients in a single batch';
  END IF;

  IF p_type IS NULL OR p_type NOT IN (
    'chapter_message','verification','vouch','rsvp',
    'event_created','event_cancelled','event_updated',
    'family_invitation','announcement','news','campaign',
    'role_assigned','obituary','matrimonial','system'
  ) THEN
    RAISE EXCEPTION 'Unsupported notification type';
  END IF;

  IF p_title IS NULL OR length(p_title) = 0 OR length(p_title) > 200 THEN
    RAISE EXCEPTION 'Notification title must be between 1 and 200 characters';
  END IF;

  IF p_description IS NOT NULL AND length(p_description) > 2000 THEN
    RAISE EXCEPTION 'Notification description is too long';
  END IF;

  INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type)
  SELECT unnest, p_type, p_title, p_description, p_entity_id, p_entity_type
  FROM unnest(p_member_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, text, text) TO authenticated, service_role;
