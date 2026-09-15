-- ============================================================
-- Re-issue placeholder Global IDs (KHD-XXXXXXX-*)
-- ============================================================
-- 36 members got placeholder IDs minted while their chapter's geography links
-- were missing. Their chapters now have complete geography (backfilled
-- 2026-09-15), so re-mint with real location codes. The database minting
-- function is atomic per (country,state,city,year) sequence row, so no
-- collisions are possible.
--
-- Members in the "Global" pseudo-chapter are skipped: no real location exists
-- there, so their IDs stay pending until they join a real chapter. The
-- hardened edge function now refuses unlocated chapters instead of minting
-- placeholders.
--
-- Idempotent: the WHERE clause selects only rows still holding placeholder IDs.
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  v_new_id text;
  v_updated integer := 0;
  v_skipped integer := 0;
BEGIN
  FOR rec IN
    SELECT m.id AS member_id,
           co.iso2 AS country_iso2, s.code AS state_code, ct.code AS city_code,
           ct.name AS city_name
    FROM members m
    JOIN chapters ch ON ch.id = m.chapter_id
    LEFT JOIN countries co ON co.id = ch.country_id
    LEFT JOIN states s ON s.id = ch.state_id
    LEFT JOIN cities ct ON ct.id = ch.city_id
    WHERE m.global_id LIKE 'KHD-XXXXXXX-%'
      AND ch.slug <> 'global'
    ORDER BY m.created_at
  LOOP
    IF rec.country_iso2 IS NULL OR rec.state_code IS NULL OR rec.city_code IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT generate_global_id(
      rec.country_iso2,
      rec.state_code,
      COALESCE(
        (SELECT cc.city_code FROM city_codes cc
         WHERE cc.country_code = upper(rec.country_iso2)
           AND cc.state_code = upper(rec.state_code)
           AND cc.city_name ILIKE rec.city_code
         LIMIT 1),
        upper(substring(rec.city_code FROM 1 FOR 3))
      )
    ) INTO v_new_id;

    IF v_new_id IS NULL THEN
      v_skipped := pass2_marker(v_skipped);
      CONTINUE;
    END IF;

    UPDATE members SET global_id = v_new_id WHERE id = rec.member_id;
    v_updated := v_updated + 1;
  END LOOP;

  RAISE NOTICE 'Placeholder ID re-issue: % updated, % skipped', v_updated, v_skipped;
END $$;