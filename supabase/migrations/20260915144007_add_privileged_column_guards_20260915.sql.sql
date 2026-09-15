-- ============================================================
-- Column-protection guards for self-service escalation paths
-- (audit findings 2026-09-15, findings 1-6 of authz review)
--
-- Pattern: BEFORE trigger rejects privilege-column changes made by callers
-- who are not Global Admin / Data Steward. RLS still governs row access;
-- these triggers close the column-level gap that RLS cannot express.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_privileged_member_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Data Steward')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_privileged;

  IF NOT is_privileged THEN
    IF NEW.verification_level IS DISTINCT FROM OLD.verification_level THEN
      RAISE EXCEPTION 'Only Global Admin or Data Steward can change verification_level'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.blocked IS DISTINCT FROM OLD.blocked
       OR NEW.suspended IS DISTINCT FROM OLD.suspended THEN
      RAISE EXCEPTION 'Only Global Admin or Data Steward can block or suspend members'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_member_privileged_columns ON public.members;
CREATE TRIGGER trg_guard_member_privileged_columns
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_privileged_member_columns();

-- Businesses: owners may update their listing but not self-verify.
CREATE OR REPLACE FUNCTION public.guard_business_verified_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Directory Manager')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_privileged;

  IF NOT is_privileged
     AND NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'Only Global Admin or Directory Manager can verify businesses'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_business_verified ON public.businesses;
CREATE TRIGGER trg_guard_business_verified
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_verified_column();

-- Matrimonial profiles: owners may edit their profile but not self-verify.
CREATE OR REPLACE FUNCTION public.guard_matrimonial_verified_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Data Steward')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_privileged;

  IF NOT is_privileged
     AND NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'Only Global Admin or Data Steward can verify matrimonial profiles'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_matrimonial_verified ON public.matrimonial_profiles;
CREATE TRIGGER trg_guard_matrimonial_verified
  BEFORE UPDATE ON public.matrimonial_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_matrimonial_verified_column();

-- Oral histories: uploads by regular members must enter moderation as 'pending'.
-- Admins/Data Stewards may set any status.
CREATE OR REPLACE FUNCTION public.guard_oral_history_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Data Steward')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_privileged;

  IF NOT is_privileged THEN
    IF TG_OP = 'INSERT' AND NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Member uploads must start as pending for moderation'
        USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status
       AND OLD.status = 'pending' AND NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Only Global Admin or Data Steward can approve oral histories'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_oral_history_status ON public.oral_histories;
CREATE TRIGGER trg_guard_oral_history_status
  BEFORE INSERT OR UPDATE ON public.oral_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_oral_history_status();

-- Trigger functions are internal; never callable via RPC.
REVOKE EXECUTE ON FUNCTION public.guard_privileged_member_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_business_verified_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_matrimonial_verified_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_oral_history_status() FROM anon, authenticated;