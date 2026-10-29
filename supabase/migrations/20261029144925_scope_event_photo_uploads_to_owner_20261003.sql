-- F10: the event-photos INSERT policy checked only the bucket, so any signed-in
-- user could write into another member's folder. The matching DELETE policy is
-- already scoped to the first path segment; mirror it on the write side.
DROP POLICY IF EXISTS "Authenticated can upload event photos" ON storage.objects;

CREATE POLICY "Authenticated can upload event photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
