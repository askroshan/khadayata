-- MemberProfile verification panel inserts notes/doc requests for other members.
-- Prior INSERT policy only allowed self-requests, so admin note/doc UI always RLS-failed.
-- Also ensure document_files + employment.verified exist (Directory Manager / VerificationCenter).

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS document_files jsonb;

ALTER TABLE public.employment
  ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

DROP POLICY IF EXISTS "Admins can insert verification notes" ON public.verification_requests;
CREATE POLICY "Admins can insert verification notes"
  ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

DROP POLICY IF EXISTS "Members can read own verification requests" ON public.verification_requests;
CREATE POLICY "Members can read own verification requests"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests"
  ON public.verification_requests FOR UPDATE
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

-- Local Kong notifications.entity_id is uuid; keep RPC p_entity_id text and cast.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_member_id uuid,
  p_type text,
  p_title text,
  p_description text DEFAULT ''::text,
  p_entity_id text DEFAULT NULL::text,
  p_entity_type text DEFAULT NULL::text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_caller_member_id uuid;
  v_entity uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_caller_member_id FROM members WHERE user_id = auth.uid() LIMIT 1;
    IF v_caller_member_id IS NULL THEN
      RAISE EXCEPTION 'Not authorized to create notifications';
    END IF;
  END IF;
  BEGIN
    v_entity := NULLIF(p_entity_id, '')::uuid;
  EXCEPTION WHEN others THEN
    v_entity := NULL;
  END;
  INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type)
  VALUES (p_member_id, p_type, p_title, p_description, v_entity, p_entity_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated, service_role;

-- verification-docs storage: members upload under {auth.uid()}/
DROP POLICY IF EXISTS "verification_docs_insert_own" ON storage.objects;
CREATE POLICY "verification_docs_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (name LIKE auth.uid()::text || '/%' OR (storage.foldername(name))[1] = auth.uid()::text)
  );

DROP POLICY IF EXISTS "verification_docs_select_own" ON storage.objects;
CREATE POLICY "verification_docs_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (name LIKE auth.uid()::text || '/%' OR (storage.foldername(name))[1] = auth.uid()::text)
  );

DROP POLICY IF EXISTS "verification_docs_select_admin" ON storage.objects;
CREATE POLICY "verification_docs_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON ra.role_id = r.id
      WHERE ra.member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Data Steward', 'Chapter Admin', 'Moderator')
    )
  );

DROP POLICY IF EXISTS "verification_docs_update_own" ON storage.objects;
CREATE POLICY "verification_docs_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (name LIKE auth.uid()::text || '/%' OR (storage.foldername(name))[1] = auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (name LIKE auth.uid()::text || '/%' OR (storage.foldername(name))[1] = auth.uid()::text)
  );
