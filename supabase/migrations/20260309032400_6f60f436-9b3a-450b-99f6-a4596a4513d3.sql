
-- Create event-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event photos
CREATE POLICY "Authenticated can upload event photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-photos');

CREATE POLICY "Anyone can view event photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');

CREATE POLICY "Owners can delete event photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
