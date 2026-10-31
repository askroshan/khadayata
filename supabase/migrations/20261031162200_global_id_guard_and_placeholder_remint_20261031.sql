-- ============================================================
-- Global ID glue fixes (2026-10-31)
--  1. Protect members.global_id via privileged-column guard
--  2. Re-mint leftover KHD-XXXXXXX-* placeholders when chapter geo is complete
-- ============================================================

-- 1. Extend member privilege guard to include global_id
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
    -- global_id: block direct client self-service spoofing. Service-role /
    -- migration callers have auth.uid() IS NULL and are allowed (edge mint).
    IF NEW.global_id IS DISTINCT FROM OLD.global_id
       AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Only Global Admin, Data Steward, or the generate-global-id service can change global_id'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_privileged_member_columns() FROM PUBLIC, anon, authenticated;

-- 2. Re-mint placeholder Global IDs for members whose chapter geography is complete.
--    Uses city_codes when possible; falls back to a 3-char cities.code only when
--    that code is already length 3 (same contract as the edge function).
DO $$
DECLARE
  rec RECORD;
  v_state2 text;
  v_city3 text;
  v_new_raw text;
  v_formatted text;
BEGIN
  FOR rec IN
    SELECT
      m.id AS member_id,
      upper(co.iso2) AS country_iso2,
      s.code AS state_code,
      ct.code AS city_code,
      ct.name AS city_name
    FROM members m
    JOIN chapters ch ON ch.id = m.chapter_id
    JOIN countries co ON co.id = ch.country_id
    JOIN states s ON s.id = ch.state_id
    JOIN cities ct ON ct.id = ch.city_id
    WHERE m.global_id LIKE 'KHD-XXXXXXX-%'
  LOOP
    v_state2 := upper(substring(rec.state_code FROM 1 FOR 2));

    SELECT cc.city_code INTO v_city3
    FROM city_codes cc
    WHERE cc.country_code = rec.country_iso2
      AND cc.state_code = v_state2
      AND (
        cc.city_code = upper(rec.city_code)
        OR cc.city_name ILIKE rec.city_name
        OR cc.city_name ILIKE rec.city_code
      )
    LIMIT 1;

    IF v_city3 IS NULL AND length(rec.city_code) = 3 THEN
      v_city3 := upper(rec.city_code);
    END IF;

    IF v_city3 IS NULL OR length(rec.country_iso2) <> 2 OR length(v_state2) <> 2 OR length(v_city3) <> 3 THEN
      -- Incomplete geo / codes: clear placeholder so the member can regenerate later
      UPDATE members SET global_id = NULL WHERE id = rec.member_id;
      CONTINUE;
    END IF;

    SELECT generate_global_id(rec.country_iso2, v_state2, v_city3) INTO v_new_raw;
    v_formatted := 'KHD-'
      || substring(v_new_raw FROM 4 FOR 7) || '-'
      || substring(v_new_raw FROM 11 FOR 2) || '-'
      || substring(v_new_raw FROM 13 FOR 6) || '-'
      || substring(v_new_raw FROM 19 FOR 1);
    UPDATE members SET global_id = v_formatted WHERE id = rec.member_id;
  END LOOP;
END $$;

-- Placeholders on chapters without state/city (e.g. Global umbrella) cannot be
-- reminted safely — clear so Profile can prompt after the member joins a local chapter.
UPDATE public.members
SET global_id = NULL
WHERE global_id LIKE 'KHD-XXXXXXX-%';
