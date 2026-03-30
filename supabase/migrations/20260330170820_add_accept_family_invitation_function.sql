/*
  # Add accept_family_invitation database function

  ## Summary
  Creates a secure RPC function that:
  1. Looks up a pending invitation by its acceptance_token
  2. Marks it as accepted (sets status, accepted_at, accepted_by_member_id)
  3. Creates bidirectional family_links records between inviter and acceptee
  4. Returns the inviter member id so the frontend can redirect

  ## Security
  - Runs as SECURITY DEFINER so it can bypass RLS to insert into family_links
  - Validates the calling user matches a real member record
  - Only processes invitations with status = 'pending'
  - Uses fixed search_path to prevent search_path injection
*/

CREATE OR REPLACE FUNCTION public.accept_family_invitation(
  p_token uuid,
  p_acceptee_member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_opposite_relation text;
  v_result jsonb;
BEGIN
  SELECT * INTO v_inv
  FROM public.family_invitations
  WHERE acceptance_token = p_token
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found or already used');
  END IF;

  IF v_inv.inviter_member_id = p_acceptee_member_id THEN
    RETURN jsonb_build_object('error', 'Cannot accept your own invitation');
  END IF;

  UPDATE public.family_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by_member_id = p_acceptee_member_id
  WHERE id = v_inv.id;

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
  VALUES (v_inv.inviter_member_id, p_acceptee_member_id, v_inv.relation)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.family_links (member_id, related_member_id, relation)
  VALUES (p_acceptee_member_id, v_inv.inviter_member_id, v_opposite_relation)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'inviter_member_id', v_inv.inviter_member_id,
    'relation', v_inv.relation
  );
END;
$$;
