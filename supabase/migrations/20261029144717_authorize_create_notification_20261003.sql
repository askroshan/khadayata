-- F5: create_notification is SECURITY DEFINER and executable by every
-- authenticated role, but had no authorization check at all, so any signed-in
-- user could forge a platform notification to any member, with arbitrary type
-- and unbounded text.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_member_id uuid,
  p_type text,
  p_title text,
  p_description text DEFAULT ''::text,
  p_entity_id text DEFAULT NULL::text,
  p_entity_type text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_caller_member_id uuid;
BEGIN
  -- service_role (edge functions / scheduled jobs) has no auth.uid();
  -- every other caller must be a signed-in member.
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_caller_member_id FROM members WHERE user_id = auth.uid() LIMIT 1;
    IF v_caller_member_id IS NULL THEN
      RAISE EXCEPTION 'Not authorized to create notifications';
    END IF;
  ELSIF current_setting('role', true) NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Not authorized to create notifications';
  END IF;

  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'A recipient is required';
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
  VALUES (p_member_id, p_type, p_title, p_description, p_entity_id, p_entity_type)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated, service_role;
