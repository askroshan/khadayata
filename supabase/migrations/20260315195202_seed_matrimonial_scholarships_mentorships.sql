
/*
  # Seed Matrimonial Profiles, Scholarships, Mentorships, Emergency Contacts,
    Funds, Settings, and Oral Histories

  Completes the demo data for all remaining features.
*/

-- -------------------------------------------------------
-- Matrimonial Profiles
-- -------------------------------------------------------
INSERT INTO matrimonial_profiles (
  id, member_id,
  about, height_cm, diet, marital_status, manglik,
  gotra, native_place, family_type,
  education_level, education_field, position_title,
  income, income_currency,
  current_city, current_state, country,
  visibility, verified,
  preferences
) VALUES
  (
    gen_random_uuid(),
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    'Chartered Accountant with a passion for community service. Family-oriented, enjoy cricket and travel. Looking for a like-minded partner to build a loving home.',
    175, 'Vegetarian', 'Never Married', 'No',
    'Khandelwal', 'Ahmedabad', 'Joint',
    'Post Graduate', 'Finance', 'Chartered Accountant',
    1200000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":23,"age_max":29,"height_min":155,"height_max":170,"education":["Graduate","Post Graduate"],"location":["Gujarat","Rajasthan"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid,
    'Creative interior designer who loves art, travel, and home decor. Looking for a compatible partner who values family and has an eye for beauty.',
    163, 'Vegetarian', 'Never Married', 'No',
    'Agarwal', 'Vadodara', 'Nuclear',
    'Graduate', 'Design', 'Interior Designer',
    900000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":26,"age_max":34,"height_min":168,"height_max":182,"education":["Graduate","Post Graduate"],"location":["Gujarat","Maharashtra"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid,
    'Doctor committed to community health. Seeks a partner who values meaningful work and family equally. Enjoy reading, yoga, and cooking.',
    178, 'Vegetarian', 'Never Married', 'Uncertain',
    'Mehta', 'Ahmedabad', 'Joint',
    'Post Graduate', 'Medicine', 'Doctor (MBBS)',
    1800000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":25,"age_max":31,"height_min":156,"height_max":172,"education":["Graduate","Post Graduate","Doctorate"],"location":["Gujarat","Maharashtra","Delhi"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid,
    'Software engineer at a growing tech firm. Enjoy trekking, reading sci-fi, and experimenting in the kitchen. Looking for an intellectually curious and warm-hearted partner.',
    172, 'Vegetarian', 'Never Married', 'No',
    'Patel', 'Rajkot', 'Nuclear',
    'Post Graduate', 'Engineering', 'Software Engineer',
    950000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', false,
    '{"age_min":22,"age_max":28,"height_min":153,"height_max":168,"education":["Graduate","Post Graduate"],"location":["Gujarat"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    '8786d380-134f-443f-9278-23d3def33c8d'::uuid,
    'Data scientist with an IIT background. Passionate about AI, music, and volunteering. Looking for a partner who is ambitious yet grounded in values.',
    180, 'Vegetarian', 'Never Married', 'No',
    'Parikh', 'Ahmedabad', 'Nuclear',
    'Post Graduate', 'Data Science', 'Data Scientist',
    1400000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', false,
    '{"age_min":23,"age_max":29,"height_min":155,"height_max":170,"education":["Post Graduate","Doctorate"],"location":["Gujarat","Maharashtra","Delhi"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid,
    'Fashion designer and entrepreneur. Love fashion, travel, and bringing colour to people''s lives. Seeking a supportive and creative partner.',
    160, 'Vegetarian', 'Never Married', 'No',
    'Sanghvi', 'Surat', 'Joint',
    'Graduate', 'Fashion Design', 'Fashion Designer',
    850000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":26,"age_max":33,"height_min":168,"height_max":183,"education":["Graduate","Post Graduate"],"location":["Gujarat"]}'::jsonb
  )
ON CONFLICT (member_id) DO NOTHING;

-- -------------------------------------------------------
-- Scholarships
-- -------------------------------------------------------
INSERT INTO scholarships (
  id, chapter_id, name, description, amount, currency,
  deadline, status, eligibility,
  required_documents, contact_email, max_recipients,
  city_id, state_id, country_id, category
) VALUES
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'KHD Merit Scholarship 2026',
    'Annual merit scholarship for students from Khadayata families who have scored 90% or above in Class 12 and secured admission in a recognised UG programme.',
    50000, 'INR',
    (now() + interval '45 days')::date,
    'open',
    'Students from Khadayata families. Class 12 score ≥ 90%. Admission in recognised UG programme. Annual family income ≤ ₹8 lakhs.',
    ARRAY['Class 12 marksheet','College admission letter','Income certificate','Aadhaar card'],
    'scholarships@khadayataonline.com',
    10,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'Merit'
  ),
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'KHD Need-Based Scholarship 2026',
    'Financial support for deserving students from economically weaker sections of the Khadayata community pursuing higher education.',
    100000, 'INR',
    (now() + interval '45 days')::date,
    'open',
    'Students from Khadayata families. Annual family income ≤ ₹3 lakhs. Pursuing graduation or post-graduation.',
    ARRAY['College fee receipt','Income certificate','Aadhaar card','Bank statement'],
    'scholarships@khadayataonline.com',
    5,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'Need-Based'
  ),
  (
    gen_random_uuid(),
    'f1000001-0000-0000-0000-000000000001'::uuid,
    'Global STEM Excellence Award',
    'Global scholarship for Khadayata students excelling in STEM disciplines at the post-graduate level anywhere in the world.',
    250000, 'INR',
    (now() + interval '30 days')::date,
    'open',
    'KHD members or their children. Enrolled in an MS, M.Tech, or PhD programme in STEM. Any country.',
    ARRAY['Enrollment letter','Academic transcripts','Research statement','KHD membership proof'],
    'global@khadayataonline.com',
    3,
    NULL, NULL, NULL,
    'STEM'
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Mentorships
-- -------------------------------------------------------
INSERT INTO mentorships (
  id, mentor_member_id,
  skills, description, max_mentees,
  availability, mode, status
) VALUES
  (
    gen_random_uuid(),
    '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid,
    ARRAY['Business Strategy','Leadership','Entrepreneurship'],
    'Happy to mentor aspiring entrepreneurs and business owners. Can help with business planning, scaling, and navigating the Gujarat market.',
    3, 'Weekends 10am-12pm IST', 'online', 'available'
  ),
  (
    gen_random_uuid(),
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    ARRAY['CA Exam Prep','Tax Planning','Accounting'],
    'CA with 7 years of experience. Open to mentoring CA aspirants, fresh graduates entering finance, and young CAs starting their practice.',
    2, 'Weekday evenings 7-9pm IST', 'online', 'available'
  ),
  (
    gen_random_uuid(),
    'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid,
    ARRAY['React','TypeScript','Node.js','Career in Tech'],
    'Software engineer happy to guide students and career changers entering the tech industry. Can review resumes, do mock interviews, and advise on learning paths.',
    3, 'Saturdays 3-5pm IST', 'online', 'available'
  ),
  (
    gen_random_uuid(),
    '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid,
    ARRAY['MBBS Entrance','Medical Career','Research'],
    'Doctor offering guidance to students preparing for NEET and those navigating medical careers. Can provide insights on specialisation choices.',
    2, 'Sunday mornings 9-11am IST', 'online', 'available'
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Emergency Contacts
-- -------------------------------------------------------
INSERT INTO emergency_contacts (id, city_id, name, phone, type) VALUES
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'Ahmedabad KHD Helpline',         '+91-79-26540100', 'Community'),
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'Ahmedabad Police',                '100',            'Police'),
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'Apollo Hospital Ahmedabad',       '+91-79-66701800', 'Hospital'),
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'AMTS Emergency',                  '1800-233-2677',  'Transport'),
  (gen_random_uuid(), 'e1000010-0000-0000-0000-000000000010'::uuid, 'Mumbai KHD Helpline',             '+91-22-26540100', 'Community'),
  (gen_random_uuid(), 'e1000010-0000-0000-0000-000000000010'::uuid, 'Mumbai Police',                   '100',            'Police'),
  (gen_random_uuid(), 'e1000010-0000-0000-0000-000000000010'::uuid, 'Hinduja Hospital Mumbai',         '+91-22-24452222', 'Hospital'),
  (gen_random_uuid(), 'e1000050-0000-0000-0000-000000000050'::uuid, 'New York KHD Helpline',           '+1-212-555-0100', 'Community'),
  (gen_random_uuid(), 'e1000060-0000-0000-0000-000000000060'::uuid, 'London KHD Helpline',             '+44-20-7946-0100','Community'),
  (gen_random_uuid(), 'e1000070-0000-0000-0000-000000000070'::uuid, 'Dubai KHD Helpline',              '+971-4-555-0100', 'Community')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Funds
-- -------------------------------------------------------
INSERT INTO funds (id, scope, chapter_id, name, currency, active) VALUES
  (gen_random_uuid(), 'global', NULL,                                                          'KHD General Fund',              'INR', true),
  (gen_random_uuid(), 'global', NULL,                                                          'KHD Education Scholarship Fund', 'INR', true),
  (gen_random_uuid(), 'global', NULL,                                                          'KHD Medical Aid Fund',           'INR', true),
  (gen_random_uuid(), 'chapter','f1000002-0000-0000-0000-000000000002'::uuid,                  'Ahmedabad Chapter Fund',         'INR', true),
  (gen_random_uuid(), 'chapter','f1000003-0000-0000-0000-000000000003'::uuid,                  'Mumbai Chapter Fund',            'INR', true)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Platform Settings
-- -------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  ('platform_name',        '{"en":"Khadayata Heritage Directory","gu":"ખંડેળવાળ હેરિટેજ ડિરેક્ટરી"}'::jsonb),
  ('platform_version',     '{"version":"1.0.0","build":"2026.03"}'::jsonb),
  ('kyc_enabled',          '{"enabled":true,"min_level":1}'::jsonb),
  ('matrimonial_enabled',  '{"enabled":true,"require_verification":false}'::jsonb),
  ('global_id_enabled',    '{"enabled":true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- -------------------------------------------------------
-- Announcements
-- -------------------------------------------------------
INSERT INTO announcements (id, title, body, starts_at, ends_at, created_by) VALUES
  (
    gen_random_uuid(),
    'Welcome to KHD Platform v1.0',
    'The Khadayata Heritage Directory is now live! Please complete your profile, explore the directory, and connect with community members across the globe. For help, reach us at support@khadayataonline.com.',
    now(), now() + interval '90 days',
    'b0000001-cafe-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'Scholarship Applications Open',
    'Applications for KHD scholarships for the 2026-27 academic year are now open. Eligible students should apply before the deadline. Visit the Scholarships section for details.',
    now(), now() + interval '45 days',
    'b0000001-cafe-0000-0000-000000000001'::uuid
  )
ON CONFLICT DO NOTHING;
