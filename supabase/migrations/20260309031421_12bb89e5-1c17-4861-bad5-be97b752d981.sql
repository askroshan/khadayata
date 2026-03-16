
-- Add ekda column to members table for core identity
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS ekda text;

-- Create family_invitations table
CREATE TABLE public.family_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  relation text NOT NULL,
  invitee_name text NOT NULL,
  invitee_email text,
  invitee_phone text,
  invitee_phone_country_code text DEFAULT '+91',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by_member_id uuid REFERENCES public.members(id)
);

ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Inviter can read their own invitations
CREATE POLICY "Members read own invitations" ON public.family_invitations
  FOR SELECT TO authenticated
  USING (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can create invitations
CREATE POLICY "Members can create invitations" ON public.family_invitations
  FOR INSERT TO authenticated
  WITH CHECK (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can update own invitations (cancel)
CREATE POLICY "Members can update own invitations" ON public.family_invitations
  FOR UPDATE TO authenticated
  USING (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can delete own invitations
CREATE POLICY "Members can delete own invitations" ON public.family_invitations
  FOR DELETE TO authenticated
  USING (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
