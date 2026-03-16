
-- Table to track per-city-year sequences for Global ID generation
CREATE TABLE public.global_id_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  state_code text NOT NULL,
  city_code text NOT NULL,
  year_code text NOT NULL,
  last_sequence integer NOT NULL DEFAULT 0,
  UNIQUE(country_code, state_code, city_code, year_code)
);

ALTER TABLE public.global_id_sequences ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can access this table
CREATE POLICY "Service role only" ON public.global_id_sequences
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to generate next Global ID atomically
CREATE OR REPLACE FUNCTION public.generate_global_id(
  p_country_code text,
  p_state_code text,
  p_city_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- City codes controlled list table
CREATE TABLE IF NOT EXISTS public.city_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  city_code text NOT NULL,
  state_code text NOT NULL,
  country_code text NOT NULL,
  UNIQUE(country_code, state_code, city_code)
);

ALTER TABLE public.city_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read city codes" ON public.city_codes
  FOR SELECT TO authenticated
  USING (true);

-- Seed some initial city codes
INSERT INTO public.city_codes (city_name, city_code, state_code, country_code) VALUES
  ('Ahmedabad', 'AHM', 'GJ', 'IN'),
  ('Surat', 'SUR', 'GJ', 'IN'),
  ('Vadodara', 'VAD', 'GJ', 'IN'),
  ('Rajkot', 'RAJ', 'GJ', 'IN'),
  ('Mumbai', 'MUM', 'MH', 'IN'),
  ('Pune', 'PUN', 'MH', 'IN'),
  ('Delhi', 'DEL', 'DL', 'IN'),
  ('Bangalore', 'BLR', 'KA', 'IN'),
  ('Chennai', 'CHE', 'TN', 'IN'),
  ('Hyderabad', 'HYD', 'TG', 'IN'),
  ('Kolkata', 'KOL', 'WB', 'IN'),
  ('Jaipur', 'JAI', 'RJ', 'IN'),
  ('New York', 'NYC', 'NY', 'US'),
  ('Los Angeles', 'LAX', 'CA', 'US'),
  ('Chicago', 'CHI', 'IL', 'US'),
  ('Houston', 'HOU', 'TX', 'US'),
  ('London', 'LDN', 'EN', 'GB'),
  ('Toronto', 'TOR', 'ON', 'CA'),
  ('Sydney', 'SYD', 'NS', 'AU'),
  ('Dubai', 'DXB', 'DU', 'AE'),
  ('Nairobi', 'NRB', 'NB', 'KE'),
  ('Singapore', 'SGP', 'SG', 'SG')
ON CONFLICT DO NOTHING;
