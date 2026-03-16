-- Reports table for content moderation
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  entity_type text NOT NULL, -- 'member', 'business', 'job', 'event', 'news', 'matrimonial_profile'
  entity_id uuid NOT NULL,
  category text NOT NULL, -- 'fake', 'non_khadayata', 'harassment', 'obscene'
  reason text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_action text, -- 'suspended', 'blocked', 'deleted', 'warned', 'none'
  admin_notes text,
  reviewed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_reports_entity ON public.reports(entity_type, entity_id);
CREATE INDEX idx_reports_status ON public.reports(status);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can create reports
CREATE POLICY "Authenticated members can report"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
  );

-- Users can see their own reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (
    reporter_member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Moderator')
    OR has_role(auth.uid(), 'Data Steward')
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (
    has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Moderator')
    OR has_role(auth.uid(), 'Data Steward')
  );

-- Add suspended flag to members table
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz;

-- Add suspended flag to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Add suspended flag to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add suspended flag to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add suspended flag to content_news
ALTER TABLE public.content_news
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add suspended flag to matrimonial_profiles
ALTER TABLE public.matrimonial_profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;