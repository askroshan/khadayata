-- ============================================================
-- Corrective: format re-issued Global IDs + validate code lengths
-- ============================================================
-- Follow-up to the placeholder re-issue. Two defects in that repair's output:
--  1. IDs were stored raw (KHDINGJVAD26...) instead of dashed
--     (KHD-INGJVAD-26-000001-V) like every original ID.
--  2. Auckland's state code is 3 letters (AUK); the format requires a 2-char
--     state, so its ID had an 8-char location segment.
--
-- Fix:
--  - Reformat the 34 well-formed raw IDs by inserting dashes (same characters,
--    so the check character stays valid; no new sequence numbers consumed).
--  - Re-mint Auckland's ID with the 2-char state prefix (AU), as the edge
--    function already does via substring(0, 2).
--  - Harden generate_global_id(): reject country/state/city codes that are not
--    exactly 2/2/3 characters, so malformed segments can never be minted again
--    by any caller.
--
-- Idempotent: the reformat only matches dash-less raw IDs; after the fix there
-- are none left.
-- ============================================================

-- 1. Harden the minting function: strict 2/2/3 code lengths.
CREATE OR REPLACE FUNCTION public.generate_global_id(p_country_code text, p_state_code text, p_city_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_year text;
v_seq integer;
v_raw text;
v_checksum text;
v_charset text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
v_sum integer := 0;
v_char_val integer;
v_factor integer;
i integer;
BEGIN
IF length(upper(p_country_code)) <> 2 OR length(upper(p_state_code)) <> 2 OR length(upper(p_city_code)) <> 3 THEN
  RAISE EXCEPTION 'Invalid Global ID location codes: country must be 2 chars, state 2 chars, city 3 chars (got %/%/%)',
    p_country_code, p_state_code, p_city_code
    USING ERRCODE = '22023';
END IF;

v_year := to_char(now(), 'YY');

-- Atomic upsert to get next sequence
INSERT INTO public.global_id_sequences (country_code, state_code, city_code, year_code, last_sequence)
VALUES (upper(p_country_code), upper(p_state_code), upper(p_city_code), v_year, 1)
ON CONFLICT (country_code, state_code, city_code, year_code)
DO UPDATE SET last_sequence = global_id_sequences.last_sequence + 1
RETURNING last_sequence INTO v_seq;

-- Build raw ID: KHD + CC + ST + CTY + YY + 6-digit seq
v_raw := 'KHD' || upper(p_country_code) || upper(p_state_code) || upper(p_city_code) || v_year || lpad(v_seq::text, 6, '0');

-- Compute checksum using ISO 7064 Mod 37,36 simplified as Luhn mod 36
FOR i IN 1..length(v_raw) LOOP
v_char_val := position(substring(v_raw from i for 1) in v_charset) - 1;
IF v_char_val < 0 THEN v_char_val := 0; END IF;
v_factor := CASE WHEN (length(v_raw) - i) % 2 = 0 THEN 2 ELSE 1 END;
v_char_val := v_char_val * v_factor;
IF v_char_val >= 36 THEN v_char_val := v_char_val - 36 + 1; END IF;
v_sum := v_sum + v_char_val;
END LOOP;

v_checksum := substring(v_charset from ((36 - (v_sum % 36)) % 36) + 1 for 1);

RETURN v_raw || v_checksum;
END;
$function$;

-- 2. Reformat the 34 well-formed raw IDs by inserting dashes.
UPDATE members
SET global_id = 'KHD-'
    || substring(global_id FROM 4 FOR 7) || '-'
    || substring(global_id FROM 11 FOR 2) || '-'
    || substring(global_id FROM 13 FOR 6) || '-'
    || substring(global_id FROM 19 FOR 1)
WHERE global_id ~ '^KHD[A-Z0-9]{16}$';

-- 3. Re-mint Auckland's malformed 20-char ID with a 2-char state code.
DO $$
DECLARE
  rec RECORD;
  v_new_raw text;
  v_formatted text;
BEGIN
  FOR rec IN
    SELECT m.id AS member_id, co.iso2 AS country_iso2, s.code AS state_code, ct.code AS city_code
    FROM members m
    JOIN chapters ch ON ch.id = m.chapter_id
    JOIN countries co ON co.id = ch.country_id
    JOIN states s ON s.id = ch.state_id
    JOIN cities ct ON ct.id = ch.city_id
    WHERE m.global_id ~ '^KHD[A-Z0-9]{19}$'
      AND length(substring(m.global_id FROM 4 FOR 7)) = 8
  LOOP
    SELECT generate_global_id(
      rec.country_iso2,
      substring(rec.state_code FROM 1 FOR 2),
      rec.city_code
    ) INTO v_new_raw;
    v_formatted := 'KHD-'
      || substring(v_new_raw FROM 4 FOR 7) || '-'
      || substring(v_new_raw FROM 11 FOR 2) || '-'
      || substring(v_new_raw FROM 13 FOR 6) || '-'
      || substring(v_new_raw FROM 19 FOR 1);
    UPDATE members SET global_id = v_formatted WHERE id = rec.member_id;
  END LOOP;
END $$;