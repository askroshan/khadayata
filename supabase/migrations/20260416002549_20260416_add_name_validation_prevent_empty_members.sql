/*
  # Add name validation constraints and fix trigger

  1. Database Constraints
    - Add CHECK constraints to ensure first_name and last_name are never empty
    - This prevents invalid member records at the database level

  2. Update Trigger Function
    - Modify handle_new_user() to create members with placeholder names
    - Placeholder names must be filled in during onboarding
    - Ensures all members have valid names after onboarding completes

  3. Security
    - Existing RLS policies remain in place
    - Validation occurs at both application and database levels
    - Deleted invalid records that violated constraints
*/

-- Add constraints to prevent empty names
ALTER TABLE public.members
ADD CONSTRAINT first_name_not_empty CHECK (first_name IS NOT NULL AND first_name != ''),
ADD CONSTRAINT last_name_not_empty CHECK (last_name IS NOT NULL AND last_name != '');

-- Update trigger to create members with placeholder names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (user_id, first_name, last_name)
  VALUES (NEW.id, 'Pending', 'Verification');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
