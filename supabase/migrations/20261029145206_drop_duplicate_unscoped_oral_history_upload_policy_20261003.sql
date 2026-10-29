-- F11 (follow-up): a second, older INSERT policy on the oral-histories bucket
-- checked only bucket_id, which re-opened the path that the scoped policy closes
-- (storage policies are permissive and OR together). Remove the unscoped one.
DROP POLICY IF EXISTS "Members can upload oral history media" ON storage.objects;
