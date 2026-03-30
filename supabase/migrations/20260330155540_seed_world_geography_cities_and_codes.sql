/*
  # Seed World Geography — Cities & City Codes (global expansion)

  Adds key cities for all newly seeded states/regions worldwide.
  Also adds city_codes entries for Global ID generation.

  UUID pattern: e2XXXXXX-0000-0000-0000-000000000000
  (e1 series already used for original 19 cities; preserved intact.)

  Also adds city_codes for countries with no states (city-states)
  using the country iso2 as both state_code and country_code.
*/

INSERT INTO cities (id, state_id, code, name) VALUES

-- ===== INDIA — remaining states =====
  -- Andhra Pradesh
  ('e2000001-0000-0000-0000-000000000001'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'VZG', 'Visakhapatnam'),
  ('e2000002-0000-0000-0000-000000000002'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'VJA', 'Vijayawada'),
  ('e2000003-0000-0000-0000-000000000003'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'GNT', 'Guntur'),
  -- Assam
  ('e2000010-0000-0000-0000-000000000010'::uuid, 'd2000003-0000-0000-0000-000000000003'::uuid, 'GUW', 'Guwahati'),
  -- Bihar
  ('e2000020-0000-0000-0000-000000000020'::uuid, 'd2000004-0000-0000-0000-000000000004'::uuid, 'PAT', 'Patna'),
  -- Goa
  ('e2000030-0000-0000-0000-000000000030'::uuid, 'd2000006-0000-0000-0000-000000000006'::uuid, 'PNJ', 'Panaji'),
  ('e2000031-0000-0000-0000-000000000031'::uuid, 'd2000006-0000-0000-0000-000000000006'::uuid, 'MSM', 'Margao'),
  -- Haryana
  ('e2000040-0000-0000-0000-000000000040'::uuid, 'd2000007-0000-0000-0000-000000000007'::uuid, 'GGN', 'Gurugram'),
  ('e2000041-0000-0000-0000-000000000041'::uuid, 'd2000007-0000-0000-0000-000000000007'::uuid, 'FBD', 'Faridabad'),
  -- Jharkhand
  ('e2000050-0000-0000-0000-000000000050'::uuid, 'd2000009-0000-0000-0000-000000000009'::uuid, 'RNC', 'Ranchi'),
  -- Kerala
  ('e2000060-0000-0000-0000-000000000060'::uuid, 'd2000011-0000-0000-0000-000000000011'::uuid, 'TVM', 'Thiruvananthapuram'),
  ('e2000061-0000-0000-0000-000000000061'::uuid, 'd2000011-0000-0000-0000-000000000011'::uuid, 'COK', 'Kochi'),
  ('e2000062-0000-0000-0000-000000000062'::uuid, 'd2000011-0000-0000-0000-000000000011'::uuid, 'KZH', 'Kozhikode'),
  -- Odisha
  ('e2000070-0000-0000-0000-000000000070'::uuid, 'd2000017-0000-0000-0000-000000000017'::uuid, 'BHU', 'Bhubaneswar'),
  -- Punjab
  ('e2000080-0000-0000-0000-000000000080'::uuid, 'd2000018-0000-0000-0000-000000000018'::uuid, 'LDH', 'Ludhiana'),
  ('e2000081-0000-0000-0000-000000000081'::uuid, 'd2000018-0000-0000-0000-000000000018'::uuid, 'AMR', 'Amritsar'),
  -- Tamil Nadu
  ('e2000090-0000-0000-0000-000000000090'::uuid, 'd2000020-0000-0000-0000-000000000020'::uuid, 'CHN', 'Chennai'),
  ('e2000091-0000-0000-0000-000000000091'::uuid, 'd2000020-0000-0000-0000-000000000020'::uuid, 'CBE', 'Coimbatore'),
  ('e2000092-0000-0000-0000-000000000092'::uuid, 'd2000020-0000-0000-0000-000000000020'::uuid, 'MDU', 'Madurai'),
  -- Telangana
  ('e2000100-0000-0000-0000-000000000100'::uuid, 'd2000021-0000-0000-0000-000000000021'::uuid, 'HYD', 'Hyderabad'),
  -- Uttar Pradesh
  ('e2000110-0000-0000-0000-000000000110'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'LKO', 'Lucknow'),
  ('e2000111-0000-0000-0000-000000000111'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'AGR', 'Agra'),
  ('e2000112-0000-0000-0000-000000000112'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'VNS', 'Varanasi'),
  ('e2000113-0000-0000-0000-000000000113'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'PYG', 'Prayagraj'),
  -- West Bengal
  ('e2000120-0000-0000-0000-000000000120'::uuid, 'd2000025-0000-0000-0000-000000000025'::uuid, 'KOL', 'Kolkata'),
  -- Madhya Pradesh (original state d1000006 already seeded, adding cities)
  ('e2000130-0000-0000-0000-000000000130'::uuid, 'd1000006-0000-0000-0000-000000000006'::uuid, 'BPL', 'Bhopal'),
  ('e2000131-0000-0000-0000-000000000131'::uuid, 'd1000006-0000-0000-0000-000000000006'::uuid, 'IDR', 'Indore'),
  -- Karnataka (original d1000005, adding more cities)
  ('e2000140-0000-0000-0000-000000000140'::uuid, 'd1000005-0000-0000-0000-000000000005'::uuid, 'MYS', 'Mysuru'),
  ('e2000141-0000-0000-0000-000000000141'::uuid, 'd1000005-0000-0000-0000-000000000005'::uuid, 'MNG', 'Mangaluru'),

-- ===== USA — additional major cities =====
  -- Florida
  ('e2000201-0000-0000-0000-000000000201'::uuid, 'd2000108-0000-0000-0000-000000000108'::uuid, 'MIA', 'Miami'),
  ('e2000202-0000-0000-0000-000000000202'::uuid, 'd2000108-0000-0000-0000-000000000108'::uuid, 'ORL', 'Orlando'),
  -- Texas
  ('e2000210-0000-0000-0000-000000000210'::uuid, 'd2000140-0000-0000-0000-000000000140'::uuid, 'HOU', 'Houston'),
  ('e2000211-0000-0000-0000-000000000211'::uuid, 'd2000140-0000-0000-0000-000000000140'::uuid, 'DAL', 'Dallas'),
  ('e2000212-0000-0000-0000-000000000212'::uuid, 'd2000140-0000-0000-0000-000000000140'::uuid, 'AUS', 'Austin'),
  -- Washington
  ('e2000220-0000-0000-0000-000000000220'::uuid, 'd2000144-0000-0000-0000-000000000144'::uuid, 'SEA', 'Seattle'),
  -- Georgia (US)
  ('e2000230-0000-0000-0000-000000000230'::uuid, 'd2000109-0000-0000-0000-000000000109'::uuid, 'ATL', 'Atlanta'),
  -- Massachusetts
  ('e2000240-0000-0000-0000-000000000240'::uuid, 'd2000119-0000-0000-0000-000000000119'::uuid, 'BOS', 'Boston'),
  -- Nevada
  ('e2000250-0000-0000-0000-000000000250'::uuid, 'd2000126-0000-0000-0000-000000000126'::uuid, 'LAS', 'Las Vegas'),
  -- Arizona
  ('e2000260-0000-0000-0000-000000000260'::uuid, 'd2000103-0000-0000-0000-000000000103'::uuid, 'PHX', 'Phoenix'),
  -- Pennsylvania
  ('e2000270-0000-0000-0000-000000000270'::uuid, 'd2000135-0000-0000-0000-000000000135'::uuid, 'PHL', 'Philadelphia'),
  -- New Jersey
  ('e2000280-0000-0000-0000-000000000280'::uuid, 'd2000128-0000-0000-0000-000000000128'::uuid, 'JCY', 'Jersey City'),
  ('e2000281-0000-0000-0000-000000000281'::uuid, 'd2000128-0000-0000-0000-000000000128'::uuid, 'NWK', 'Newark'),
  -- Michigan
  ('e2000290-0000-0000-0000-000000000290'::uuid, 'd2000120-0000-0000-0000-000000000120'::uuid, 'DTW', 'Detroit'),
  -- North Carolina
  ('e2000300-0000-0000-0000-000000000300'::uuid, 'd2000130-0000-0000-0000-000000000130'::uuid, 'CLT', 'Charlotte'),
  -- Colorado
  ('e2000310-0000-0000-0000-000000000310'::uuid, 'd2000105-0000-0000-0000-000000000105'::uuid, 'DEN', 'Denver'),
  -- DC
  ('e2000320-0000-0000-0000-000000000320'::uuid, 'd2000148-0000-0000-0000-000000000148'::uuid, 'WDC', 'Washington DC'),
  -- Maryland
  ('e2000330-0000-0000-0000-000000000330'::uuid, 'd2000118-0000-0000-0000-000000000118'::uuid, 'BAL', 'Baltimore'),
  -- Minnesota
  ('e2000340-0000-0000-0000-000000000340'::uuid, 'd2000121-0000-0000-0000-000000000121'::uuid, 'MSP', 'Minneapolis'),
  -- Indiana
  ('e2000350-0000-0000-0000-000000000350'::uuid, 'd2000112-0000-0000-0000-000000000112'::uuid, 'IND', 'Indianapolis'),
  -- Ohio
  ('e2000360-0000-0000-0000-000000000360'::uuid, 'd2000132-0000-0000-0000-000000000132'::uuid, 'CMH', 'Columbus'),
  -- Virginia
  ('e2000370-0000-0000-0000-000000000370'::uuid, 'd2000143-0000-0000-0000-000000000143'::uuid, 'RIC', 'Richmond'),
  -- Oregon
  ('e2000380-0000-0000-0000-000000000380'::uuid, 'd2000134-0000-0000-0000-000000000134'::uuid, 'PDX', 'Portland'),

-- ===== UK — additional cities =====
  -- Scotland
  ('e2000401-0000-0000-0000-000000000401'::uuid, 'd2000201-0000-0000-0000-000000000201'::uuid, 'EDI', 'Edinburgh'),
  ('e2000402-0000-0000-0000-000000000402'::uuid, 'd2000201-0000-0000-0000-000000000201'::uuid, 'GLA', 'Glasgow'),
  -- Wales
  ('e2000410-0000-0000-0000-000000000410'::uuid, 'd2000202-0000-0000-0000-000000000202'::uuid, 'CDF', 'Cardiff'),
  -- Northern Ireland
  ('e2000420-0000-0000-0000-000000000420'::uuid, 'd2000203-0000-0000-0000-000000000203'::uuid, 'BFS', 'Belfast'),
  -- England (d1000020)
  ('e2000430-0000-0000-0000-000000000430'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'MAN', 'Manchester'),
  ('e2000431-0000-0000-0000-000000000431'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'BHM', 'Birmingham'),
  ('e2000432-0000-0000-0000-000000000432'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LDS', 'Leeds'),
  ('e2000433-0000-0000-0000-000000000433'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'BRS', 'Bristol'),
  ('e2000434-0000-0000-0000-000000000434'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'SHF', 'Sheffield'),
  ('e2000435-0000-0000-0000-000000000435'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LVP', 'Liverpool'),
  ('e2000436-0000-0000-0000-000000000436'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LEI', 'Leicester'),

-- ===== UAE — additional cities =====
  -- Abu Dhabi
  ('e2000501-0000-0000-0000-000000000501'::uuid, 'd2000301-0000-0000-0000-000000000301'::uuid, 'AUH', 'Abu Dhabi City'),
  -- Sharjah
  ('e2000510-0000-0000-0000-000000000510'::uuid, 'd2000302-0000-0000-0000-000000000302'::uuid, 'SHJ', 'Sharjah City'),
  -- Dubai (original e1000070, adding more areas)
  ('e2000520-0000-0000-0000-000000000520'::uuid, 'd1000030-0000-0000-0000-000000000030'::uuid, 'DXN', 'Dubai North'),

-- ===== CANADA — additional cities =====
  -- British Columbia
  ('e2000601-0000-0000-0000-000000000601'::uuid, 'd2000402-0000-0000-0000-000000000402'::uuid, 'YVR', 'Vancouver'),
  ('e2000602-0000-0000-0000-000000000602'::uuid, 'd2000402-0000-0000-0000-000000000402'::uuid, 'VIC', 'Victoria'),
  -- Alberta
  ('e2000610-0000-0000-0000-000000000610'::uuid, 'd2000401-0000-0000-0000-000000000401'::uuid, 'YYC', 'Calgary'),
  ('e2000611-0000-0000-0000-000000000611'::uuid, 'd2000401-0000-0000-0000-000000000401'::uuid, 'YEG', 'Edmonton'),
  -- Quebec
  ('e2000620-0000-0000-0000-000000000620'::uuid, 'd2000408-0000-0000-0000-000000000408'::uuid, 'YMQ', 'Montreal'),
  ('e2000621-0000-0000-0000-000000000621'::uuid, 'd2000408-0000-0000-0000-000000000408'::uuid, 'YQB', 'Quebec City'),
  -- Ontario (additional; Toronto e1000080 already seeded)
  ('e2000630-0000-0000-0000-000000000630'::uuid, 'd1000040-0000-0000-0000-000000000040'::uuid, 'YOW', 'Ottawa'),
  ('e2000631-0000-0000-0000-000000000631'::uuid, 'd1000040-0000-0000-0000-000000000040'::uuid, 'YHM', 'Hamilton'),
  -- Manitoba
  ('e2000640-0000-0000-0000-000000000640'::uuid, 'd2000403-0000-0000-0000-000000000403'::uuid, 'YWG', 'Winnipeg'),

-- ===== AUSTRALIA — additional cities =====
  -- Victoria
  ('e2000701-0000-0000-0000-000000000701'::uuid, 'd2000501-0000-0000-0000-000000000501'::uuid, 'MEL', 'Melbourne'),
  -- Queensland
  ('e2000710-0000-0000-0000-000000000710'::uuid, 'd2000502-0000-0000-0000-000000000502'::uuid, 'BNE', 'Brisbane'),
  ('e2000711-0000-0000-0000-000000000711'::uuid, 'd2000502-0000-0000-0000-000000000502'::uuid, 'GCT', 'Gold Coast'),
  -- Western Australia
  ('e2000720-0000-0000-0000-000000000720'::uuid, 'd2000503-0000-0000-0000-000000000503'::uuid, 'PER', 'Perth'),
  -- South Australia
  ('e2000730-0000-0000-0000-000000000730'::uuid, 'd2000504-0000-0000-0000-000000000504'::uuid, 'ADL', 'Adelaide'),
  -- ACT
  ('e2000740-0000-0000-0000-000000000740'::uuid, 'd2000506-0000-0000-0000-000000000506'::uuid, 'CBR', 'Canberra'),

-- ===== NEW ZEALAND =====
  ('e2000801-0000-0000-0000-000000000801'::uuid, 'd2000601-0000-0000-0000-000000000601'::uuid, 'AKL', 'Auckland City'),
  ('e2000810-0000-0000-0000-000000000810'::uuid, 'd2000602-0000-0000-0000-000000000602'::uuid, 'WLG', 'Wellington City'),
  ('e2000820-0000-0000-0000-000000000820'::uuid, 'd2000603-0000-0000-0000-000000000603'::uuid, 'CHC', 'Christchurch'),

-- ===== GERMANY =====
  ('e2000901-0000-0000-0000-000000000901'::uuid, 'd2000702-0000-0000-0000-000000000702'::uuid, 'BER', 'Berlin'),
  ('e2000910-0000-0000-0000-000000000910'::uuid, 'd2000704-0000-0000-0000-000000000704'::uuid, 'MUC', 'Munich'),
  ('e2000920-0000-0000-0000-000000000920'::uuid, 'd2000710-0000-0000-0000-000000000710'::uuid, 'CGN', 'Cologne'),
  ('e2000921-0000-0000-0000-000000000921'::uuid, 'd2000710-0000-0000-0000-000000000710'::uuid, 'DUS', 'Dusseldorf'),
  ('e2000922-0000-0000-0000-000000000922'::uuid, 'd2000710-0000-0000-0000-000000000710'::uuid, 'DOR', 'Dortmund'),
  ('e2000930-0000-0000-0000-000000000930'::uuid, 'd2000707-0000-0000-0000-000000000707'::uuid, 'HAM', 'Hamburg City'),
  ('e2000940-0000-0000-0000-000000000940'::uuid, 'd2000706-0000-0000-0000-000000000706'::uuid, 'FRA', 'Frankfurt'),

-- ===== FRANCE =====
  ('e2001001-0000-0000-0000-000000001001'::uuid, 'd2000808-0000-0000-0000-000000000808'::uuid, 'PAR', 'Paris'),
  ('e2001010-0000-0000-0000-000000001010'::uuid, 'd2000801-0000-0000-0000-000000000801'::uuid, 'LYO', 'Lyon'),
  ('e2001020-0000-0000-0000-000000001020'::uuid, 'd2000813-0000-0000-0000-000000000813'::uuid, 'MRS', 'Marseille'),
  ('e2001030-0000-0000-0000-000000001030'::uuid, 'd2000807-0000-0000-0000-000000000807'::uuid, 'LIL', 'Lille'),
  ('e2001040-0000-0000-0000-000000001040'::uuid, 'd2000810-0000-0000-0000-000000000810'::uuid, 'BOD', 'Bordeaux'),

-- ===== ITALY =====
  ('e2001101-0000-0000-0000-000000001101'::uuid, 'd2000907-0000-0000-0000-000000000907'::uuid, 'ROM', 'Rome'),
  ('e2001110-0000-0000-0000-000000001110'::uuid, 'd2000909-0000-0000-0000-000000000909'::uuid, 'MIL', 'Milan'),
  ('e2001120-0000-0000-0000-000000001120'::uuid, 'd2000904-0000-0000-0000-000000000904'::uuid, 'NAP', 'Naples'),
  ('e2001130-0000-0000-0000-000000001130'::uuid, 'd2000916-0000-0000-0000-000000000916'::uuid, 'FLR', 'Florence'),
  ('e2001140-0000-0000-0000-000000001140'::uuid, 'd2000920-0000-0000-0000-000000000920'::uuid, 'VEN', 'Venice'),

-- ===== SPAIN =====
  ('e2001201-0000-0000-0000-000000001201'::uuid, 'd2001013-0000-0000-0000-000000001013'::uuid, 'MAD', 'Madrid'),
  ('e2001210-0000-0000-0000-000000001210'::uuid, 'd2001007-0000-0000-0000-000000001007'::uuid, 'BCN', 'Barcelona'),
  ('e2001220-0000-0000-0000-000000001220'::uuid, 'd2001001-0000-0000-0000-000000001001'::uuid, 'SVQ', 'Seville'),
  ('e2001230-0000-0000-0000-000000001230'::uuid, 'd2001017-0000-0000-0000-000000001017'::uuid, 'VLC', 'Valencia'),

-- ===== BRAZIL =====
  ('e2001301-0000-0000-0000-000000001301'::uuid, 'd2001125-0000-0000-0000-000000001125'::uuid, 'SAO', 'Sao Paulo'),
  ('e2001310-0000-0000-0000-000000001310'::uuid, 'd2001119-0000-0000-0000-000000001119'::uuid, 'GIG', 'Rio de Janeiro'),
  ('e2001320-0000-0000-0000-000000001320'::uuid, 'd2001107-0000-0000-0000-000000001107'::uuid, 'BSB', 'Brasilia'),
  ('e2001330-0000-0000-0000-000000001330'::uuid, 'd2001113-0000-0000-0000-000000001113'::uuid, 'BHZ', 'Belo Horizonte'),

-- ===== SOUTH AFRICA =====
  ('e2001401-0000-0000-0000-000000001401'::uuid, 'd2001203-0000-0000-0000-000000001203'::uuid, 'JNB', 'Johannesburg'),
  ('e2001410-0000-0000-0000-000000001410'::uuid, 'd2001203-0000-0000-0000-000000001203'::uuid, 'PRY', 'Pretoria'),
  ('e2001420-0000-0000-0000-000000001420'::uuid, 'd2001209-0000-0000-0000-000000001209'::uuid, 'CPT', 'Cape Town'),
  ('e2001430-0000-0000-0000-000000001430'::uuid, 'd2001204-0000-0000-0000-000000001204'::uuid, 'DUR', 'Durban'),

-- ===== NIGERIA =====
  ('e2001501-0000-0000-0000-000000001501'::uuid, 'd2001325-0000-0000-0000-000000001325'::uuid, 'LOS', 'Lagos City'),
  ('e2001510-0000-0000-0000-000000001510'::uuid, 'd2001315-0000-0000-0000-000000001315'::uuid, 'ABJ', 'Abuja'),
  ('e2001520-0000-0000-0000-000000001520'::uuid, 'd2001320-0000-0000-0000-000000001320'::uuid, 'KAN', 'Kano City'),

-- ===== PAKISTAN =====
  ('e2001601-0000-0000-0000-000000001601'::uuid, 'd2001404-0000-0000-0000-000000001404'::uuid, 'KHI', 'Karachi'),
  ('e2001610-0000-0000-0000-000000001610'::uuid, 'd2001403-0000-0000-0000-000000001403'::uuid, 'LHE', 'Lahore'),
  ('e2001620-0000-0000-0000-000000001620'::uuid, 'd2001407-0000-0000-0000-000000001407'::uuid, 'ISB', 'Islamabad'),
  ('e2001630-0000-0000-0000-000000001630'::uuid, 'd2001402-0000-0000-0000-000000001402'::uuid, 'PEW', 'Peshawar'),

-- ===== BANGLADESH =====
  ('e2001701-0000-0000-0000-000000001701'::uuid, 'd2001503-0000-0000-0000-000000001503'::uuid, 'DAC', 'Dhaka City'),
  ('e2001710-0000-0000-0000-000000001710'::uuid, 'd2001502-0000-0000-0000-000000001502'::uuid, 'CGP', 'Chittagong City'),
  ('e2001720-0000-0000-0000-000000001720'::uuid, 'd2001508-0000-0000-0000-000000001508'::uuid, 'ZYL', 'Sylhet City'),

-- ===== SRI LANKA =====
  ('e2001801-0000-0000-0000-000000001801'::uuid, 'd2001609-0000-0000-0000-000000001609'::uuid, 'CMB', 'Colombo'),
  ('e2001810-0000-0000-0000-000000001810'::uuid, 'd2001609-0000-0000-0000-000000001609'::uuid, 'SRJ', 'Sri Jayawardenepura Kotte'),

-- ===== MALAYSIA =====
  ('e2001901-0000-0000-0000-000000001901'::uuid, 'd2001714-0000-0000-0000-000000001714'::uuid, 'KUL', 'Kuala Lumpur City'),
  ('e2001910-0000-0000-0000-000000001910'::uuid, 'd2001707-0000-0000-0000-000000001707'::uuid, 'PEN', 'George Town'),
  ('e2001920-0000-0000-0000-000000001920'::uuid, 'd2001712-0000-0000-0000-000000001712'::uuid, 'SBA', 'Shah Alam'),
  ('e2001930-0000-0000-0000-000000001930'::uuid, 'd2001710-0000-0000-0000-000000001710'::uuid, 'BKI', 'Kota Kinabalu'),

-- ===== KENYA =====
  ('e2002001-0000-0000-0000-000000002001'::uuid, 'd2001801-0000-0000-0000-000000001801'::uuid, 'MSA', 'Mombasa City'),
  ('e2002010-0000-0000-0000-000000002010'::uuid, 'd2001802-0000-0000-0000-000000001802'::uuid, 'KSM', 'Kisumu City'),
  ('e2002020-0000-0000-0000-000000002020'::uuid, 'd2001803-0000-0000-0000-000000001803'::uuid, 'NKR', 'Nakuru City')

ON CONFLICT (id) DO NOTHING;

-- ===== CITY CODES for Global ID generation =====
INSERT INTO city_codes (city_name, city_code, state_code, country_code) VALUES
  -- India expansions
  ('Visakhapatnam',   'VZG', 'AP',  'IN'),
  ('Vijayawada',      'VJA', 'AP',  'IN'),
  ('Guntur',          'GNT', 'AP',  'IN'),
  ('Guwahati',        'GUW', 'AS',  'IN'),
  ('Patna',           'PAT', 'BR',  'IN'),
  ('Panaji',          'PNJ', 'GA',  'IN'),
  ('Gurugram',        'GGN', 'HR',  'IN'),
  ('Faridabad',       'FBD', 'HR',  'IN'),
  ('Ranchi',          'RNC', 'JH',  'IN'),
  ('Thiruvananthapuram','TVM','KL',  'IN'),
  ('Kochi',           'COK', 'KL',  'IN'),
  ('Kozhikode',       'KZH', 'KL',  'IN'),
  ('Bhubaneswar',     'BHU', 'OD',  'IN'),
  ('Ludhiana',        'LDH', 'PB',  'IN'),
  ('Amritsar',        'AMR', 'PB',  'IN'),
  ('Chennai',         'CHN', 'TN',  'IN'),
  ('Coimbatore',      'CBE', 'TN',  'IN'),
  ('Madurai',         'MDU', 'TN',  'IN'),
  ('Hyderabad',       'HYD', 'TG',  'IN'),
  ('Lucknow',         'LKO', 'UP',  'IN'),
  ('Agra',            'AGR', 'UP',  'IN'),
  ('Varanasi',        'VNS', 'UP',  'IN'),
  ('Prayagraj',       'PYG', 'UP',  'IN'),
  ('Kolkata',         'KOL', 'WB',  'IN'),
  ('Bhopal',          'BPL', 'MP',  'IN'),
  ('Indore',          'IDR', 'MP',  'IN'),
  ('Mysuru',          'MYS', 'KA',  'IN'),
  ('Mangaluru',       'MNG', 'KA',  'IN'),
  -- USA expansions
  ('Miami',           'MIA', 'FL',  'US'),
  ('Orlando',         'ORL', 'FL',  'US'),
  ('Houston',         'HOU', 'TX',  'US'),
  ('Dallas',          'DAL', 'TX',  'US'),
  ('Austin',          'AUS', 'TX',  'US'),
  ('Seattle',         'SEA', 'WA',  'US'),
  ('Atlanta',         'ATL', 'GA',  'US'),
  ('Boston',          'BOS', 'MA',  'US'),
  ('Las Vegas',       'LAS', 'NV',  'US'),
  ('Phoenix',         'PHX', 'AZ',  'US'),
  ('Philadelphia',    'PHL', 'PA',  'US'),
  ('Jersey City',     'JCY', 'NJ',  'US'),
  ('Newark',          'NWK', 'NJ',  'US'),
  ('Detroit',         'DTW', 'MI',  'US'),
  ('Charlotte',       'CLT', 'NC',  'US'),
  ('Denver',          'DEN', 'CO',  'US'),
  ('Washington DC',   'WDC', 'DC',  'US'),
  ('Baltimore',       'BAL', 'MD',  'US'),
  ('Minneapolis',     'MSP', 'MN',  'US'),
  ('Indianapolis',    'IND', 'IN',  'US'),
  ('Columbus',        'CMH', 'OH',  'US'),
  ('Richmond',        'RIC', 'VA',  'US'),
  ('Portland',        'PDX', 'OR',  'US'),
  -- UK expansions
  ('Edinburgh',       'EDI', 'SCT', 'GB'),
  ('Glasgow',         'GLA', 'SCT', 'GB'),
  ('Cardiff',         'CDF', 'WLS', 'GB'),
  ('Belfast',         'BFS', 'NIR', 'GB'),
  ('Manchester',      'MAN', 'ENG', 'GB'),
  ('Birmingham',      'BHM', 'ENG', 'GB'),
  ('Leeds',           'LDS', 'ENG', 'GB'),
  ('Bristol',         'BRS', 'ENG', 'GB'),
  ('Sheffield',       'SHF', 'ENG', 'GB'),
  ('Liverpool',       'LVP', 'ENG', 'GB'),
  ('Leicester',       'LEI', 'ENG', 'GB'),
  -- UAE expansions
  ('Abu Dhabi City',  'AUH', 'AZ',  'AE'),
  ('Sharjah City',    'SHJ', 'SH',  'AE'),
  -- Canada expansions
  ('Vancouver',       'YVR', 'BC',  'CA'),
  ('Victoria',        'VIC', 'BC',  'CA'),
  ('Calgary',         'YYC', 'AB',  'CA'),
  ('Edmonton',        'YEG', 'AB',  'CA'),
  ('Montreal',        'YMQ', 'QC',  'CA'),
  ('Quebec City',     'YQB', 'QC',  'CA'),
  ('Ottawa',          'YOW', 'ON',  'CA'),
  ('Hamilton',        'YHM', 'ON',  'CA'),
  ('Winnipeg',        'YWG', 'MB',  'CA'),
  -- Australia expansions
  ('Melbourne',       'MEL', 'VIC', 'AU'),
  ('Brisbane',        'BNE', 'QLD', 'AU'),
  ('Gold Coast',      'GCT', 'QLD', 'AU'),
  ('Perth',           'PER', 'WA',  'AU'),
  ('Adelaide',        'ADL', 'SA',  'AU'),
  ('Canberra',        'CBR', 'ACT', 'AU'),
  -- New Zealand
  ('Auckland City',   'AKL', 'AUK', 'NZ'),
  ('Wellington City', 'WLG', 'WGN', 'NZ'),
  ('Christchurch',    'CHC', 'CAN', 'NZ'),
  -- Germany
  ('Berlin',          'BER', 'BE',  'DE'),
  ('Munich',          'MUC', 'BY',  'DE'),
  ('Cologne',         'CGN', 'NW',  'DE'),
  ('Dusseldorf',      'DUS', 'NW',  'DE'),
  ('Hamburg City',    'HAM', 'HH',  'DE'),
  ('Frankfurt',       'FRA', 'HE',  'DE'),
  -- France
  ('Paris',           'PAR', 'IDF', 'FR'),
  ('Lyon',            'LYO', 'ARA', 'FR'),
  ('Marseille',       'MRS', 'PAC', 'FR'),
  ('Lille',           'LIL', 'HDF', 'FR'),
  ('Bordeaux',        'BOD', 'NAQ', 'FR'),
  -- Italy
  ('Rome',            'ROM', 'LAZ', 'IT'),
  ('Milan',           'MIL', 'LOM', 'IT'),
  ('Naples',          'NAP', 'CAM', 'IT'),
  ('Florence',        'FLR', 'TOS', 'IT'),
  ('Venice',          'VEN', 'VEN', 'IT'),
  -- Spain
  ('Madrid',          'MAD', 'MD',  'ES'),
  ('Barcelona',       'BCN', 'CT',  'ES'),
  ('Seville',         'SVQ', 'AN',  'ES'),
  ('Valencia',        'VLC', 'VC',  'ES'),
  -- Brazil
  ('Sao Paulo',       'SAO', 'SP',  'BR'),
  ('Rio de Janeiro',  'GIG', 'RJ',  'BR'),
  ('Brasilia',        'BSB', 'DF',  'BR'),
  ('Belo Horizonte',  'BHZ', 'MG',  'BR'),
  -- South Africa
  ('Johannesburg',    'JNB', 'GP',  'ZA'),
  ('Pretoria',        'PRY', 'GP',  'ZA'),
  ('Cape Town',       'CPT', 'WC',  'ZA'),
  ('Durban',          'DUR', 'KZN', 'ZA'),
  -- Nigeria
  ('Lagos City',      'LOS', 'LA',  'NG'),
  ('Abuja',           'ABJ', 'FC',  'NG'),
  ('Kano City',       'KAN', 'KN',  'NG'),
  -- Pakistan
  ('Karachi',         'KHI', 'SD',  'PK'),
  ('Lahore',          'LHE', 'PB',  'PK'),
  ('Islamabad',       'ISB', 'ICT', 'PK'),
  ('Peshawar',        'PEW', 'KP',  'PK'),
  -- Bangladesh
  ('Dhaka City',      'DAC', 'DHA', 'BD'),
  ('Chittagong City', 'CGP', 'CHT', 'BD'),
  ('Sylhet City',     'ZYL', 'SYL', 'BD'),
  -- Sri Lanka
  ('Colombo',         'CMB', 'WE',  'LK'),
  -- Malaysia
  ('Kuala Lumpur City','KUL','KUL', 'MY'),
  ('George Town',     'PEN', 'PNG', 'MY'),
  ('Kota Kinabalu',   'BKI', 'SBH', 'MY'),
  -- Kenya
  ('Mombasa City',    'MSA', 'MSA', 'KE'),
  ('Kisumu City',     'KSM', 'KSM', 'KE'),
  ('Nakuru City',     'NKR', 'NYR', 'KE'),
  -- Singapore (city-state — no state)
  ('Singapore City',  'SGC', 'SG',  'SG'),
  -- Mauritius (city-state style)
  ('Port Louis',      'MRU', 'MU',  'MU'),
  -- South Korea
  ('Seoul',           'SEL', 'KR',  'KR'),
  -- Japan
  ('Tokyo',           'TYO', 'JP',  'JP'),
  ('Osaka',           'OSA', 'JP',  'JP'),
  -- China
  ('Beijing',         'BJS', 'CN',  'CN'),
  ('Shanghai',        'SHA', 'CN',  'CN'),
  ('Shenzhen',        'SZX', 'CN',  'CN'),
  -- Thailand
  ('Bangkok',         'BKK', 'TH',  'TH'),
  -- Indonesia
  ('Jakarta',         'JKT', 'ID',  'ID'),
  -- Philippines
  ('Manila',          'MNL', 'PH',  'PH'),
  -- Netherlands
  ('Amsterdam',       'AMS', 'NL',  'NL'),
  -- Sweden
  ('Stockholm',       'STO', 'SE',  'SE'),
  -- Switzerland
  ('Zurich',          'ZRH', 'CH',  'CH'),
  -- Poland
  ('Warsaw',          'WAW', 'PL',  'PL'),
  -- Turkey
  ('Istanbul',        'IST', 'TR',  'TR'),
  ('Ankara',          'ANK', 'TR',  'TR'),
  -- Saudi Arabia
  ('Riyadh',          'RUH', 'SA',  'SA'),
  ('Jeddah',          'JED', 'SA',  'SA'),
  -- Qatar
  ('Doha',            'DOH', 'QA',  'QA'),
  -- Bahrain
  ('Manama',          'BAH', 'BH',  'BH'),
  -- Kuwait
  ('Kuwait City',     'KWI', 'KW',  'KW'),
  -- Oman
  ('Muscat',          'MCT', 'OM',  'OM'),
  -- Israel
  ('Tel Aviv',        'TLV', 'IL',  'IL'),
  -- Nepal
  ('Kathmandu',       'KTM', 'NP',  'NP'),
  -- Tanzania
  ('Dar es Salaam',   'DAR', 'TZ',  'TZ'),
  -- Uganda
  ('Kampala',         'KLA', 'UG',  'UG'),
  -- Ethiopia
  ('Addis Ababa',     'ADD', 'ET',  'ET'),
  -- Ghana
  ('Accra',           'ACC', 'GH',  'GH'),
  -- Senegal
  ('Dakar',           'DKR', 'SN',  'SN'),
  -- Rwanda
  ('Kigali',          'KGL', 'RW',  'RW'),
  -- Zimbabwe
  ('Harare',          'HRE', 'ZW',  'ZW'),
  -- Zambia
  ('Lusaka',          'LUN', 'ZM',  'ZM'),
  -- Egypt
  ('Cairo',           'CAI', 'EG',  'EG'),
  ('Alexandria',      'ALY', 'EG',  'EG'),
  -- Morocco
  ('Casablanca',      'CMN', 'MA',  'MA'),
  -- Argentina
  ('Buenos Aires',    'BUE', 'AR',  'AR'),
  -- Colombia
  ('Bogota',          'BOG', 'CO',  'CO'),
  -- Mexico
  ('Mexico City',     'MEX', 'MX',  'MX'),
  -- Chile
  ('Santiago',        'SCL', 'CL',  'CL'),
  -- Peru
  ('Lima',            'LIM', 'PE',  'PE'),
  -- Trinidad and Tobago
  ('Port of Spain',   'POS', 'TT',  'TT'),
  -- Mauritius
  ('Quatre Bornes',   'QBO', 'MU',  'MU')
ON CONFLICT DO NOTHING;
