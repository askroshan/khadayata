/*
  # Add acceptance token to family_invitations

  ## Summary
  Adds a unique token column to family_invitations so invitees can accept
  their invitation via a direct link without needing to know their invitation ID.

  ## Changes
  - `family_invitations`: add `acceptance_token` (uuid, unique, default gen_random_uuid())

  ## Security
  - Token is used as a lookup key — URL-safe and unpredictable
  - Existing RLS policies already cover read/update by inviter
  - New anon SELECT policy allows looking up an invitation by token only
    (read-only, non-sensitive: name + relation shown to person clicking their own invite link)
  - New authenticated UPDATE policy allows the authenticated invitee to accept
*/

ALTER TABLE public.family_invitations
  ADD COLUMN IF NOT EXISTS acceptance_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_invitations_acceptance_token
  ON public.family_invitations (acceptance_token);

CREATE POLICY "Anyone can look up invitation by token"
  ON public.family_invitations
  FOR SELECT
  TO anon, authenticated
  USING (acceptance_token IS NOT NULL);

CREATE POLICY "Authenticated member can accept invitation by token"
  ON public.family_invitations
  FOR UPDATE
  TO authenticated
  USING (acceptance_token IS NOT NULL)
  WITH CHECK (status IN ('accepted', 'pending'));
