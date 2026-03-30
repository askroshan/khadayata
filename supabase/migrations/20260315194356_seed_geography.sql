
/*
  # Seed Geography: Countries, States, Cities

  Inserts reference geography data required before chapters and members can be created.

  1. Countries: India, United States, United Kingdom, UAE, Canada, Australia, Singapore, Kenya
  2. States: Major Indian states + international
  3. Cities: All major Khadayata community hubs globally
*/

INSERT INTO countries (id, iso2, name) VALUES
  ('c1000001-0000-0000-0000-000000000001'::uuid, 'IN', 'India'),
  ('c1000002-0000-0000-0000-000000000002'::uuid, 'US', 'United States'),
  ('c1000003-0000-0000-0000-000000000003'::uuid, 'GB', 'United Kingdom'),
  ('c1000004-0000-0000-0000-000000000004'::uuid, 'AE', 'United Arab Emirates'),
  ('c1000005-0000-0000-0000-000000000005'::uuid, 'CA', 'Canada'),
  ('c1000006-0000-0000-0000-000000000006'::uuid, 'AU', 'Australia'),
  ('c1000007-0000-0000-0000-000000000007'::uuid, 'SG', 'Singapore'),
  ('c1000008-0000-0000-0000-000000000008'::uuid, 'KE', 'Kenya')
ON CONFLICT (id) DO NOTHING;

INSERT INTO states (id, country_id, code, name) VALUES
  -- India
  ('d1000001-0000-0000-0000-000000000001'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'GJ', 'Gujarat'),
  ('d1000002-0000-0000-0000-000000000002'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'MH', 'Maharashtra'),
  ('d1000003-0000-0000-0000-000000000003'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'RJ', 'Rajasthan'),
  ('d1000004-0000-0000-0000-000000000004'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'DL', 'Delhi'),
  ('d1000005-0000-0000-0000-000000000005'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'KA', 'Karnataka'),
  ('d1000006-0000-0000-0000-000000000006'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'MP', 'Madhya Pradesh'),
  -- USA
  ('d1000010-0000-0000-0000-000000000010'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NY', 'New York'),
  ('d1000011-0000-0000-0000-000000000011'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'CA', 'California'),
  ('d1000012-0000-0000-0000-000000000012'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'IL', 'Illinois'),
  -- UK
  ('d1000020-0000-0000-0000-000000000020'::uuid, 'c1000003-0000-0000-0000-000000000003'::uuid, 'ENG', 'England'),
  -- UAE
  ('d1000030-0000-0000-0000-000000000030'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'DU', 'Dubai'),
  -- Canada
  ('d1000040-0000-0000-0000-000000000040'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'ON', 'Ontario'),
  -- Australia
  ('d1000050-0000-0000-0000-000000000050'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'NSW', 'New South Wales'),
  -- Singapore
  ('d1000060-0000-0000-0000-000000000060'::uuid, 'c1000007-0000-0000-0000-000000000007'::uuid, 'SGP', 'Singapore'),
  -- Kenya
  ('d1000070-0000-0000-0000-000000000070'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'NBI', 'Nairobi County')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cities (id, state_id, code, name) VALUES
  -- Gujarat
  ('e1000001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'AHM', 'Ahmedabad'),
  ('e1000002-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'SUR', 'Surat'),
  ('e1000003-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'VAD', 'Vadodara'),
  ('e1000004-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'RAJ', 'Rajkot'),
  -- Maharashtra
  ('e1000010-0000-0000-0000-000000000010'::uuid, 'd1000002-0000-0000-0000-000000000002'::uuid, 'MUM', 'Mumbai'),
  ('e1000011-0000-0000-0000-000000000011'::uuid, 'd1000002-0000-0000-0000-000000000002'::uuid, 'PUN', 'Pune'),
  -- Rajasthan
  ('e1000020-0000-0000-0000-000000000020'::uuid, 'd1000003-0000-0000-0000-000000000003'::uuid, 'JPR', 'Jaipur'),
  ('e1000021-0000-0000-0000-000000000021'::uuid, 'd1000003-0000-0000-0000-000000000003'::uuid, 'JDH', 'Jodhpur'),
  -- Delhi
  ('e1000030-0000-0000-0000-000000000030'::uuid, 'd1000004-0000-0000-0000-000000000004'::uuid, 'DEL', 'New Delhi'),
  -- Karnataka
  ('e1000040-0000-0000-0000-000000000040'::uuid, 'd1000005-0000-0000-0000-000000000005'::uuid, 'BLR', 'Bengaluru'),
  -- USA
  ('e1000050-0000-0000-0000-000000000050'::uuid, 'd1000010-0000-0000-0000-000000000010'::uuid, 'NYC', 'New York City'),
  ('e1000051-0000-0000-0000-000000000051'::uuid, 'd1000011-0000-0000-0000-000000000011'::uuid, 'LAX', 'Los Angeles'),
  ('e1000052-0000-0000-0000-000000000052'::uuid, 'd1000012-0000-0000-0000-000000000012'::uuid, 'CHI', 'Chicago'),
  -- UK
  ('e1000060-0000-0000-0000-000000000060'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LON', 'London'),
  -- UAE
  ('e1000070-0000-0000-0000-000000000070'::uuid, 'd1000030-0000-0000-0000-000000000030'::uuid, 'DXB', 'Dubai'),
  -- Canada
  ('e1000080-0000-0000-0000-000000000080'::uuid, 'd1000040-0000-0000-0000-000000000040'::uuid, 'TOR', 'Toronto'),
  -- Australia
  ('e1000090-0000-0000-0000-000000000090'::uuid, 'd1000050-0000-0000-0000-000000000050'::uuid, 'SYD', 'Sydney'),
  -- Singapore
  ('e1000100-0000-0000-0000-000000000100'::uuid, 'd1000060-0000-0000-0000-000000000060'::uuid, 'SGP', 'Singapore'),
  -- Kenya
  ('e1000110-0000-0000-0000-000000000110'::uuid, 'd1000070-0000-0000-0000-000000000070'::uuid, 'NRB', 'Nairobi')
ON CONFLICT (id) DO NOTHING;

-- Ensure city_codes exist for Global ID generation
INSERT INTO city_codes (city_name, city_code, state_code, country_code) VALUES
  ('Ahmedabad',     'AHM', 'GJ',  'IN'),
  ('Surat',         'SUR', 'GJ',  'IN'),
  ('Vadodara',      'VAD', 'GJ',  'IN'),
  ('Rajkot',        'RAJ', 'GJ',  'IN'),
  ('Mumbai',        'MUM', 'MH',  'IN'),
  ('Pune',          'PUN', 'MH',  'IN'),
  ('Jaipur',        'JPR', 'RJ',  'IN'),
  ('Jodhpur',       'JDH', 'RJ',  'IN'),
  ('New Delhi',     'DEL', 'DL',  'IN'),
  ('Bengaluru',     'BLR', 'KA',  'IN'),
  ('New York City', 'NYC', 'NY',  'US'),
  ('Los Angeles',   'LAX', 'CA',  'US'),
  ('Chicago',       'CHI', 'IL',  'US'),
  ('London',        'LON', 'ENG', 'GB'),
  ('Dubai',         'DXB', 'DU',  'AE'),
  ('Toronto',       'TOR', 'ON',  'CA'),
  ('Sydney',        'SYD', 'NSW', 'AU'),
  ('Singapore',     'SGP', 'SGP', 'SG'),
  ('Nairobi',       'NRB', 'NBI', 'KE')
ON CONFLICT DO NOTHING;
