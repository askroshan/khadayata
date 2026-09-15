-- Second pass: chapters whose cities did not exist in the geography seed.
-- Add the missing cities, then link. Nadiad chapter had no geography at all.

INSERT INTO public.cities (state_id, code, name)
SELECT s.id, upper(left(replace(m.city, ' ', '_'), 12)), m.city
FROM (VALUES
  ('United States', 'Nevada',          'Reno'),
  ('United States', 'Utah',            'Salt Lake City'),
  ('United States', 'California',      'San Francisco'),
  ('United States', 'California',      'San Jose'),
  ('United States', 'Connecticut',     'Stamford'),
  ('United States', 'Florida',         'Tampa'),
  ('Canada',        'Ontario',         'Brampton'),
  ('Canada',        'Ontario',         'London'),
  ('Canada',        'Ontario',         'Mississauga'),
  ('Canada',        'Nova Scotia',     'Halifax'),
  ('Canada',        'British Columbia','Surrey'),
  ('India',         'Gujarat',         'Nadiad')
) AS m(country, state, city)
JOIN public.countries co ON co.name = m.country
JOIN public.states s ON s.name = m.state AND s.country_id = co.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.cities ci WHERE ci.name = m.city AND ci.state_id = s.id
);

UPDATE public.chapters c SET
  country_id = co.id,
  state_id = s.id,
  city_id = ci.id
FROM (VALUES
  ('reno-nevada-usa-chapter',            'United States', 'Nevada',          'Reno'),
  ('salt-lake-city-utah-usa-chapter',    'United States', 'Utah',            'Salt Lake City'),
  ('san-francisco-california-usa-chapter','United States','California',      'San Francisco'),
  ('san-jose-california-usa',            'United States', 'California',      'San Jose'),
  ('stamford-connecticut-usa-chapter',   'United States', 'Connecticut',     'Stamford'),
  ('tampa-florida-usa-chapter',          'United States', 'Florida',         'Tampa'),
  ('brampton-ontario-canada',            'Canada',        'Ontario',         'Brampton'),
  ('london-ontario-canada-chapter',      'Canada',        'Ontario',         'London'),
  ('mississauga-ontario-canada',         'Canada',        'Ontario',         'Mississauga'),
  ('halifax-nova-scotia-canada-chapter', 'Canada',        'Nova Scotia',     'Halifax'),
  ('surrey-canada-chapter',              'Canada',        'British Columbia','Surrey'),
  ('nadiad-india-chapter',               'India',         'Gujarat',         'Nadiad')
) AS m(slug, country, state, city)
JOIN public.countries co ON co.name = m.country
JOIN public.states s ON s.name = m.state AND s.country_id = co.id
JOIN public.cities ci ON ci.name = m.city AND ci.state_id = s.id
WHERE c.slug = m.slug;