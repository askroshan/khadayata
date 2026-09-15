-- Backfill chapter geography: 33 diaspora chapters were seeded without
-- country/state/city links (only the original 9 had them). Links are set from
-- the existing world geography tables by matching chapter names/slugs.

UPDATE public.chapters c SET
  country_id = co.id,
  state_id = s.id,
  city_id = ci.id
FROM (VALUES
  ('atlanta-georgia-usa-chapter',        'United States', 'Georgia',         'Atlanta'),
  ('austin-texas-usa-chapter',           'United States', 'Texas',           'Austin'),
  ('boston-massachusetts-usa-chapter',   'United States', 'Massachusetts',   'Boston'),
  ('charlotte-north-carolina-usa',       'United States', 'North Carolina',  'Charlotte'),
  ('chicago-illinois-usa-chapter',       'United States', 'Illinois',        'Chicago'),
  ('dallas-texas-chapter',               'United States', 'Texas',           'Dallas'),
  ('houston-texas-usa',                  'United States', 'Texas',           'Houston'),
  ('jersey-city-new-jersey-usa-chapter', 'United States', 'New Jersey',      'Jersey City'),
  ('los-angeles-california-usa-chapter', 'United States', 'California',      'Los Angeles'),
  ('reno-nevada-usa-chapter',            'United States', 'Nevada',          'Reno'),
  ('salt-lake-city-utah-usa-chapter',    'United States', 'Utah',            'Salt Lake City'),
  ('san-francisco-california-usa-chapter','United States','California',      'San Francisco'),
  ('san-jose-california-usa',            'United States', 'California',      'San Jose'),
  ('seattle-washington-usa-chapter',     'United States', 'Washington',      'Seattle'),
  ('stamford-connecticut-usa-chapter',   'United States', 'Connecticut',     'Stamford'),
  ('tampa-florida-usa-chapter',          'United States', 'Florida',         'Tampa'),
  ('brampton-ontario-canada',            'Canada',        'Ontario',         'Brampton'),
  ('edmonton-alberta-canada-chapter',    'Canada',        'Alberta',         'Edmonton'),
  ('halifax-nova-scotia-canada-chapter', 'Canada',        'Nova Scotia',     'Halifax'),
  ('hamilton-ontario-canada-chapter',    'Canada',        'Ontario',         'Hamilton'),
  ('london-ontario-canada-chapter',      'Canada',        'Ontario',         'London'),
  ('mississauga-ontario-canada',         'Canada',        'Ontario',         'Mississauga'),
  ('ottawa-ontario-canada-chapter',      'Canada',        'Ontario',         'Ottawa'),
  ('surrey-canada-chapter',              'Canada',        'British Columbia','Surrey'),
  ('toronto-canada-chapter',             'Canada',        'Ontario',         'Toronto'),
  ('vancouver-british-columbia-canada-chapter','Canada',  'British Columbia','Vancouver'),
  ('victoria-british-columbia-canada-chapter','Canada',   'British Columbia','Victoria'),
  ('winnipeg-manitoba-canada-chapter',   'Canada',        'Manitoba',        'Winnipeg'),
  ('melbourne-victoria-australia-chapter','Australia',    'Victoria',        'Melbourne'),
  ('sydney-new-south-wales-australia-chapter','Australia','New South Wales', 'Sydney'),
  ('auckland-new-zealand-chapter',       'New Zealand',   'Auckland',        'Auckland City'),
  ('vadodara-india',                     'India',         'Gujarat',         'Vadodara')
) AS m(slug, country, state, city)
JOIN public.countries co ON co.name = m.country
JOIN public.states s ON s.name = m.state AND s.country_id = co.id
LEFT JOIN public.cities ci ON ci.name = m.city AND ci.state_id = s.id
WHERE c.slug = m.slug
  AND c.country_id IS NULL;