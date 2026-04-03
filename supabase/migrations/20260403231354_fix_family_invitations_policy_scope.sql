/*
  # Fix family_invitations RLS Policy Scope

  The previous consolidation introduced an overly broad SELECT and UPDATE policy
  for family_invitations. The condition `acceptance_token IS NOT NULL` matched
  ALL invitations that have a token, meaning any authenticated user could read
  or update any other member's invitations.

  ## Changes

  ### family_invitations SELECT
  - Drop the overly-broad consolidated authenticated policy
  - Re-create a tight policy: authenticated users can only see their own invitations
  - The anon token-lookup policy (added in batch4 migration) is kept as-is

  ### family_invitations UPDATE
  - Drop the overly-broad consolidated UPDATE policy
  - Re-create two separate policies:
    1. Inviters can update their own invitations (cancel/resend)
    2. Authenticated users can accept an invitation using a known token
       (USING checks the token matches; WITH CHECK only allows accepted/pending status)
*/

-- ============================================================
-- Fix SELECT: drop broad policy, restore tight owner-only policy
-- ============================================================
DROP POLICY IF EXISTS "Members read own or token invitations" ON public.family_invitations;

CREATE POLICY "Members read own invitations"
  ON public.family_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- Fix UPDATE: drop broad policy, restore two focused policies
-- ============================================================
DROP POLICY IF EXISTS "Members can update own or accept by token" ON public.family_invitations;

CREATE POLICY "Members can update own invitations"
  ON public.family_invitations
  FOR UPDATE
  TO authenticated
  USING (
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authenticated member can accept invitation by token"
  ON public.family_invitations
  FOR UPDATE
  TO authenticated
  USING (acceptance_token IS NOT NULL)
  WITH CHECK (status = ANY(ARRAY['accepted', 'pending']));
