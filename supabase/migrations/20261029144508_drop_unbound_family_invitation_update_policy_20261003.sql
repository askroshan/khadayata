-- F3: "Authenticated member can accept invitation by token" used
-- USING (acceptance_token IS NOT NULL), which is true for every row, letting any
-- signed-in user rewrite any invitation (including its recipient). Acceptance now
-- runs inside the SECURITY DEFINER accept_family_invitation function, so the
-- policy is no longer needed. The correctly scoped "Members can update own
-- invitations" policy remains.
DROP POLICY IF EXISTS "Authenticated member can accept invitation by token" ON public.family_invitations;
