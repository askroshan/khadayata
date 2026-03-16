/*
  # Fix Mutable Search Path on Audit Functions

  ## Summary
  Adds `SET search_path = public` to all three audit trigger functions to prevent
  search path injection attacks. Functions with mutable search paths can be
  exploited if a malicious schema is placed earlier in the search path.

  ## Functions Fixed
  - public.fn_audit_member_changes
  - public.fn_audit_role_assignments
  - public.fn_audit_verification_requests
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

  IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'member',
      NEW.id,
      'is_suspended',
      to_jsonb(OLD.is_suspended),
      to_jsonb(NEW.is_suspended),
      CASE WHEN NEW.is_suspended THEN 'Member suspended' ELSE 'Member unsuspended' END
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_audit_role_assignments()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'role_assignment',
      NEW.id,
      'role_id',
      NULL,
      to_jsonb(NEW.role_id),
      'Role assigned'
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'role_assignment',
      OLD.id,
      'role_id',
      to_jsonb(OLD.role_id),
      NULL,
      'Role removed'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_audit_verification_requests()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'verification_request',
      NEW.id,
      'status',
      to_jsonb(OLD.status),
      to_jsonb(NEW.status),
      'Verification request status updated'
    );
  END IF;
  RETURN NEW;
END;
$$;
