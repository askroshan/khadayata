
-- Verification requests table for KYC-light
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  requested_level smallint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  document_type text,
  document_url text,
  reviewer_user_id uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Members can create and read their own requests
CREATE POLICY "Members can create verification requests" ON public.verification_requests
  FOR INSERT WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Members can read own verification requests" ON public.verification_requests
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Data Steward')
  );

-- Admins can update verification requests
CREATE POLICY "Admins can update verification requests" ON public.verification_requests
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Data Steward')
  );

-- Add unique constraint on mentorships for available status to avoid duplication issues
-- (no-op if already exists - wrapped in DO block)

-- Enable realtime for mentorships
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorships;
