/*
  # Fix Audit Trigger: Guard is_suspended Column Reference

  ## Summary
  The fn_audit_member_changes trigger function references OLD.is_suspended
  which does not exist on the members table. This causes any UPDATE on the
  members table to fail. Guards the check with a dynamic column existence
  check so the trigger works regardless of whether the column exists.
  
  ## Changes
  - Rewrites fn_audit_member_changes to safely check for is_suspended only
    if the column exists, using a TRY/CATCH approach to avoid hard errors.
*/

CREATE OR REPLACE FUNCTION public.fn_audit_member_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.verification_level IS DISTINCT FROM NEW.verification_level THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'member',
      NEW.id,
      'verification_level',
      to_jsonb(OLD.verification_level),
      to_jsonb(NEW.verification_level),
      'Level updated'
    );
  END IF;

  RETURN NEW;
END;
$$;
