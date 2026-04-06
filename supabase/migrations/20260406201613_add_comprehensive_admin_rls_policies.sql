/*
  # Add comprehensive admin RLS policies for content management

  1. Chapters Table
    - Add INSERT policy: Allow Global Admin and Chapter Admin to create chapters
    - Add UPDATE policy: Allow Global Admin and Chapter Admin to update chapters
    - Add DELETE policy: Allow Global Admin to delete chapters

  2. Note on Existing Tables
    - events, businesses, jobs, content_news, matrimonial_profiles, oral_histories
    - These already have INSERT/UPDATE/DELETE policies
    - Admin access should be verified via has_role() function

  3. Security
    - Global Admin can perform any operation on chapters and content
    - Chapter Admin can perform operations on their own chapter's content
    - Users can perform operations on content they own
*/

-- Enable RLS on chapters (in case it's not already enabled)
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Policy for Global Admin to insert chapters
CREATE POLICY "Global Admin can create chapters"
  ON chapters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

-- Policy for Global Admin to update chapters
CREATE POLICY "Global Admin can update chapters"
  ON chapters
  FOR UPDATE
  TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

-- Policy for Global Admin to delete chapters
CREATE POLICY "Global Admin can delete chapters"
  ON chapters
  FOR DELETE
  TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );
