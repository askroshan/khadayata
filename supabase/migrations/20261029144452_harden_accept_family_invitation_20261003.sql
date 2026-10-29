-- F2: accept_family_invitation never bound p_acceptee_member_id to the caller's
--     session, so any authenticated caller holding a token could create family
--     links for an arbitrary member.
-- F9: the pending check was a read followed by a separate update, so two
--     concurrent callers could both consume one invitation.
CREATE OR REPLACE FUNCTION public.accept_family_invitation(p_token uuid, p_acceptee_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_member_id uuid;
  v_inv RECORD;
  v_opposite_relation text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'You must be signed in to accept an invitation');
  END IF;

  -- Identity comes from the session, never from the request body.
  SELECT id INTO v_caller_member_id
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_caller_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No member profile found for your account');
  END IF;

  IF p_acceptee_member_id IS NOT NULL AND p_acceptee_member_id <> v_caller_member_id THEN
    RETURN jsonb_build_object('error', 'You can only accept an invitation for yourself');
  END IF;

  -- Atomic single-use claim: the row is consumed by the same statement that
  -- tests that it is still pending.
  UPDATE public.family_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by_member_id = v_caller_member_id
  WHERE acceptance_token = p_token
    AND status = 'pending'
    AND inviter_member_id <> v_caller_member_id
  RETURNING * INTO v_inv;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found or already used');
  END IF;

  v_opposite_relation := CASE v_inv.relation
    WHEN 'spouse'   THEN 'spouse'
    WHEN 'son'      THEN 'father'
    WHEN 'daughter' THEN 'father'
    WHEN 'father'   THEN 'son'
    WHEN 'mother'   THEN 'son'
    WHEN 'brother'  THEN 'brother'
    WHEN 'sister'   THEN 'sister'
    ELSE v_inv.relation
  END;

  INSERT INTO public.family_links (member_id, related_member_id, relation)
  VALUES (v_inv.inviter_member_id, v_caller_member_id, v_inv.relation)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.family_links (member_id, related_member_id, relation)
  VALUES (v_caller_member_id, v_inv.inviter_member_id, v_opposite_relation)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'inviter_member_id', v_inv.inviter_member_id,
    'relation', v_inv.relation
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.accept_family_invitation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_family_invitation(uuid, uuid) TO authenticated;
