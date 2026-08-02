/*
# Create storage policies for verification-docs bucket

1. Storage Bucket
- `verification-docs` — private bucket (already created)
- Members upload verification documents (PDF, JPG, PNG) to their own folder: {user_id}/
- Admins (Global Admin, Data Steward, Chapter Admin, Moderator) can read all folders for review

2. Storage Policies
- SELECT: members can read their own folder; admins can read all
- INSERT: members can upload to their own folder only
- UPDATE: members can update files in their own folder only

3. Security
- Path-based isolation: each member's files live under {auth.uid()}/ prefix
- Admin read access verified through role_assignments join (role_id, member_id)
*/

DROP POLICY IF EXISTS "verification_docs_select_own" ON storage.objects;
CREATE POLICY "verification_docs_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
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

DROP POLICY IF EXISTS "verification_docs_insert_own" ON storage.objects;
CREATE POLICY "verification_docs_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "verification_docs_update_own" ON storage.objects;
CREATE POLICY "verification_docs_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
