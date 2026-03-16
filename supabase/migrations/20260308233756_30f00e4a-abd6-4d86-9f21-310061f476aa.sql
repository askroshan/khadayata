-- Create storage bucket for member avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for matrimonial photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('matrimonial-photos', 'matrimonial-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for matrimonial-photos bucket
CREATE POLICY "Public can view matrimonial photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'matrimonial-photos');

CREATE POLICY "Users can upload own matrimonial photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'matrimonial-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own matrimonial photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'matrimonial-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own matrimonial photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'matrimonial-photos' AND auth.uid()::text = (storage.foldername(name))[1]);