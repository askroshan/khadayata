-- F11: the oral-histories INSERT policy checked only the bucket, so any signed-in
-- user could write into another member's folder (and the bucket has no DELETE
-- policy, so the victim could not remove the file). The client keys folders by
-- member id, so bind the first path segment to the caller's own member id.
DROP POLICY IF EXISTS "Authenticated can upload oral histories" ON storage.objects;

CREATE POLICY "Authenticated can upload oral histories"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'oral-histories'
    AND (storage.foldername(name))[1] IN (
      SELECT m.id::text FROM public.members m WHERE m.user_id = auth.uid()
    )
  );
