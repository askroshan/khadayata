/*
  # Fix RLS security issues

  1. Changes
    - Replace permissive "Anyone can insert reminders" policy on `invitation_reminders`
      with a restricted policy that only allows the inviter (the member who owns
      the family_invitation) to insert reminders for their own invitations.
    - Drop broad SELECT policies on `storage.objects` for public buckets
      (avatars, event-photos, matrimonial-photos, oral-histories) to prevent
      clients from listing all files. Public URL access to specific objects
      still works because the buckets are marked public.

  2. Security
    - Prevents anonymous or unrelated users from inserting arbitrary reminders.
    - Prevents listing of all objects in public buckets while preserving
      direct URL-based access.
*/

DROP POLICY IF EXISTS "Anyone can insert reminders" ON public.invitation_reminders;

CREATE POLICY "Inviter can insert reminders for own invitations"
  ON public.invitation_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    family_invitation_id IN (
      SELECT fi.id
      FROM public.family_invitations fi
      JOIN public.members m ON m.id = fi.inviter_member_id
      WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view event photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view matrimonial photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read oral history media" ON storage.objects;
