
/*
  # Seed Chapters

  Creates the core chapter structure:
  - Global chapter (no city, umbrella for all)
  - India: Ahmedabad, Surat, Vadodara, Mumbai, Jaipur, New Delhi
  - International: New York, London, Dubai, Toronto, Sydney, Singapore, Nairobi

  Each chapter has a slug, subdomain, and JSON settings.
*/

INSERT INTO chapters (id, name, slug, subdomain, country_id, state_id, city_id, settings) VALUES
  (
    'f1000001-0000-0000-0000-000000000001'::uuid,
    'Global',
    'global',
    'global',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    NULL,
    NULL,
    '{"theme":"default","features":["events","directory","matrimonial","business","news","scholarships","mentorship"],"contact":{"email":"global@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Ahmedabad Chapter',
    'ahmedabad',
    'ahmedabad',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","business","news","scholarships"],"contact":{"email":"ahmedabad@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000003-0000-0000-0000-000000000003'::uuid,
    'Mumbai Chapter',
    'mumbai',
    'mumbai',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000002-0000-0000-0000-000000000002'::uuid,
    'e1000010-0000-0000-0000-000000000010'::uuid,
    '{"theme":"default","features":["events","directory","business","news"],"contact":{"email":"mumbai@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000004-0000-0000-0000-000000000004'::uuid,
    'Surat Chapter',
    'surat',
    'surat',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'e1000002-0000-0000-0000-000000000002'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial"],"contact":{"email":"surat@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000005-0000-0000-0000-000000000005'::uuid,
    'Jaipur Chapter',
    'jaipur',
    'jaipur',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000003-0000-0000-0000-000000000003'::uuid,
    'e1000020-0000-0000-0000-000000000020'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","news"],"contact":{"email":"jaipur@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000006-0000-0000-0000-000000000006'::uuid,
    'New Delhi Chapter',
    'delhi',
    'delhi',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000004-0000-0000-0000-000000000004'::uuid,
    'e1000030-0000-0000-0000-000000000030'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","business","news"],"contact":{"email":"delhi@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000007-0000-0000-0000-000000000007'::uuid,
    'New York Chapter',
    'new-york',
    'newyork',
    'c1000002-0000-0000-0000-000000000002'::uuid,
    'd1000010-0000-0000-0000-000000000010'::uuid,
    'e1000050-0000-0000-0000-000000000050'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","business","news","scholarships"],"contact":{"email":"newyork@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000008-0000-0000-0000-000000000008'::uuid,
    'London Chapter',
    'london',
    'london',
    'c1000003-0000-0000-0000-000000000003'::uuid,
    'd1000020-0000-0000-0000-000000000020'::uuid,
    'e1000060-0000-0000-0000-000000000060'::uuid,
    '{"theme":"default","features":["events","directory","news"],"contact":{"email":"london@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000009-0000-0000-0000-000000000009'::uuid,
    'Dubai Chapter',
    'dubai',
    'dubai',
    'c1000004-0000-0000-0000-000000000004'::uuid,
    'd1000030-0000-0000-0000-000000000030'::uuid,
    'e1000070-0000-0000-0000-000000000070'::uuid,
    '{"theme":"default","features":["events","directory","business","news"],"contact":{"email":"dubai@khadayataonline.com"}}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
