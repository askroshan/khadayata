-- 1. Matrimonial Shortlists (Like / Save profiles)
CREATE TABLE IF NOT EXISTS public.matrimonial_shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.matrimonial_profiles(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_matrimonial_shortlists_member_id
  ON public.matrimonial_shortlists (member_id);
CREATE INDEX IF NOT EXISTS idx_matrimonial_shortlists_profile_id
  ON public.matrimonial_shortlists (profile_id);

ALTER TABLE public.matrimonial_shortlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matrimonial_shortlists_select_own" ON public.matrimonial_shortlists;
CREATE POLICY "matrimonial_shortlists_select_own"
  ON public.matrimonial_shortlists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = matrimonial_shortlists.member_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "matrimonial_shortlists_insert_own" ON public.matrimonial_shortlists;
CREATE POLICY "matrimonial_shortlists_insert_own"
  ON public.matrimonial_shortlists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = matrimonial_shortlists.member_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "matrimonial_shortlists_update_own" ON public.matrimonial_shortlists;
CREATE POLICY "matrimonial_shortlists_update_own"
  ON public.matrimonial_shortlists
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = matrimonial_shortlists.member_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = matrimonial_shortlists.member_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "matrimonial_shortlists_delete_own" ON public.matrimonial_shortlists;
CREATE POLICY "matrimonial_shortlists_delete_own"
  ON public.matrimonial_shortlists
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = matrimonial_shortlists.member_id
        AND m.user_id = auth.uid()
    )
  );

-- 2. Member Email Communication Messages / Threads
CREATE TABLE IF NOT EXISTS public.member_email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  context_type text NOT NULL DEFAULT 'general' CHECK (context_type IN ('matrimonial', 'chapter', 'general')),
  context_id uuid,
  subject text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_email_messages_from
  ON public.member_email_messages (from_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_email_messages_to
  ON public.member_email_messages (to_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_email_messages_context
  ON public.member_email_messages (context_type, context_id);

ALTER TABLE public.member_email_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_email_messages_select_participants" ON public.member_email_messages;
CREATE POLICY "member_email_messages_select_participants"
  ON public.member_email_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.id = member_email_messages.from_member_id OR m.id = member_email_messages.to_member_id)
    )
  );

DROP POLICY IF EXISTS "member_email_messages_insert_sender" ON public.member_email_messages;
CREATE POLICY "member_email_messages_insert_sender"
  ON public.member_email_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_email_messages.from_member_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "member_email_messages_update_recipient" ON public.member_email_messages;
CREATE POLICY "member_email_messages_update_recipient"
  ON public.member_email_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_email_messages.to_member_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_email_messages.to_member_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "member_email_messages_delete_sender" ON public.member_email_messages;
CREATE POLICY "member_email_messages_delete_sender"
  ON public.member_email_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_email_messages.from_member_id
        AND m.user_id = auth.uid()
    )
  );

-- 3. Matrimonial Monthly PDF Ad Pages (A4 PDFs managed in Admin)
CREATE TABLE IF NOT EXISTS public.matrimonial_ad_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_path text NOT NULL,
  file_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matrimonial_ad_pdfs_order
  ON public.matrimonial_ad_pdfs (is_active, display_order ASC, created_at ASC);

ALTER TABLE public.matrimonial_ad_pdfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_select_authenticated" ON public.matrimonial_ad_pdfs;
CREATE POLICY "matrimonial_ad_pdfs_select_authenticated"
  ON public.matrimonial_ad_pdfs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_insert_admin" ON public.matrimonial_ad_pdfs;
CREATE POLICY "matrimonial_ad_pdfs_insert_admin"
  ON public.matrimonial_ad_pdfs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Moderator')
  );

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_update_admin" ON public.matrimonial_ad_pdfs;
CREATE POLICY "matrimonial_ad_pdfs_update_admin"
  ON public.matrimonial_ad_pdfs
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Moderator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Moderator')
  );

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_delete_admin" ON public.matrimonial_ad_pdfs;
CREATE POLICY "matrimonial_ad_pdfs_delete_admin"
  ON public.matrimonial_ad_pdfs
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Moderator')
  );

-- Storage bucket for A4 ad PDFs (PDF-only, 100 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'matrimonial-ad-pdfs',
  'matrimonial-ad-pdfs',
  true,
  104857600,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_storage_select" ON storage.objects;
CREATE POLICY "matrimonial_ad_pdfs_storage_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'matrimonial-ad-pdfs');

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_storage_insert" ON storage.objects;
CREATE POLICY "matrimonial_ad_pdfs_storage_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'matrimonial-ad-pdfs'
    AND (
      public.has_role(auth.uid(), 'Global Admin')
      OR public.has_role(auth.uid(), 'Moderator')
    )
  );

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_storage_update" ON storage.objects;
CREATE POLICY "matrimonial_ad_pdfs_storage_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'matrimonial-ad-pdfs'
    AND (
      public.has_role(auth.uid(), 'Global Admin')
      OR public.has_role(auth.uid(), 'Moderator')
    )
  );

DROP POLICY IF EXISTS "matrimonial_ad_pdfs_storage_delete" ON storage.objects;
CREATE POLICY "matrimonial_ad_pdfs_storage_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'matrimonial-ad-pdfs'
    AND (
      public.has_role(auth.uid(), 'Global Admin')
      OR public.has_role(auth.uid(), 'Moderator')
    )
  );
