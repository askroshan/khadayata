-- F1: anon could enumerate every pending family invitation acceptance token.
-- Remove the anonymous read path on family_invitations entirely and replace the
-- client-side token lookup with a SECURITY DEFINER preview function that only
-- ever returns the single row matching the exact token supplied.

DROP POLICY IF EXISTS "Anon can look up invitation by token" ON public.family_invitations;

REVOKE ALL ON public.family_invitations FROM anon;

CREATE OR REPLACE FUNCTION public.get_family_invitation_preview(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_inviter RECORD;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT id, invitee_name, relation, status, inviter_member_id
    INTO v_inv
    FROM family_invitations
   WHERE acceptance_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT first_name, last_name
    INTO v_inviter
    FROM members
   WHERE id = v_inv.inviter_member_id;

  RETURN jsonb_build_object(
    'found', true,
    'status', v_inv.status,
    'invitee_name', v_inv.invitee_name,
    'relation', v_inv.relation,
    'inviter_first_name', COALESCE(v_inviter.first_name, ''),
    'inviter_last_name', COALESCE(v_inviter.last_name, '')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_family_invitation_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_invitation_preview(uuid) TO anon, authenticated;
