/*
  # Fix Security Issues: Function Search Path and Storage Policies

  ## Summary
  This migration addresses security issues:
  1. Function `is_direct_family_relation` has mutable search_path - fix by adding SET search_path
  2. Public buckets have overly broad SELECT policies that allow listing - restrict policies

  ## Changes
  1. Recreate `is_direct_family_relation` with SET search_path = public
  2. Replace public SELECT policies with authenticated-only policies
     Public access should use signed URLs instead

  ## Security Notes
  - SET search_path prevents search path injection attacks
  - Storage bucket policies changed from public to authenticated
     to prevent listing while maintaining signed URL functionality
*/

-- Fix mutable search path on is_direct_family_relation function
CREATE OR REPLACE FUNCTION public.is_direct_family_relation(member_a uuid, member_b uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_links
    WHERE (
      (member_id = member_a AND related_member_id = member_b) OR
      (member_id = member_b AND related_member_id = member_a)
    )
    AND relation IN ('Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister')
  );
END;
$$ LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public;

-- Update storage policies to restrict public listing
-- These will only allow authenticated access for direct object access
-- Public clients should use signed URLs for access

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;
CREATE POLICY "Authenticated can view event photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "Public can view matrimonial photos" ON storage.objects;
CREATE POLICY "Authenticated can view matrimonial photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'matrimonial-photos');

DROP POLICY IF EXISTS "Anyone can read oral history media" ON storage.objects;
CREATE POLICY "Authenticated can read oral history media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'oral-histories');
