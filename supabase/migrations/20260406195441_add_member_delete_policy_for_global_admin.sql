/*
  # Add member DELETE policy for Global Admin

  1. Security Changes
    - Add DELETE policy on `members` table restricted to Global Admin role only
    - Only users with the "Global Admin" role can delete member records

  2. Important Notes
    - This is a hard delete -- use with caution
    - Global Admin should suspend/block members first as a soft measure
    - Delete should only be used for removing invalid or spam accounts
*/

CREATE POLICY "Global Admin can delete members"
  ON members
  FOR DELETE
  TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );
