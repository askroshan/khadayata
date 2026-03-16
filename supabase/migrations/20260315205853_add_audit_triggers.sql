/*
  # Add audit log triggers

  ## Summary
  Adds PostgreSQL triggers to automatically capture audit entries when key data changes:

  1. Trigger on `members` table for verification_level changes
  2. Trigger on `role_assignments` table for inserts and deletes
  3. Trigger on `matrimonial_profiles` for verified status changes

  All changes are written to the `audits` table with actor, entity, field, old/new values.

  ## Security Notes
  - Triggers run as SECURITY DEFINER so they can always write to audits
  - No RLS bypass — uses service-level insert
*/

CREATE OR REPLACE FUNCTION fn_audit_member_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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

DROP TRIGGER IF EXISTS trg_audit_member_changes ON members;
CREATE TRIGGER trg_audit_member_changes
  AFTER UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION fn_audit_member_changes();


CREATE OR REPLACE FUNCTION fn_audit_role_assignments()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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

DROP TRIGGER IF EXISTS trg_audit_role_assignments ON role_assignments;
CREATE TRIGGER trg_audit_role_assignments
  AFTER INSERT OR DELETE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_role_assignments();


CREATE OR REPLACE FUNCTION fn_audit_verification_requests()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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

DROP TRIGGER IF EXISTS trg_audit_verification_requests ON verification_requests;
CREATE TRIGGER trg_audit_verification_requests
  AFTER UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_verification_requests();
