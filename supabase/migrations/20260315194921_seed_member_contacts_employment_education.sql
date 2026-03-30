
/*
  # Seed Member Contacts, Employment, Education, Skills, Languages

  Populates rich profile data for all named members so every feature
  (directory, matrimonial, business, mentorship) has realistic demo data.

  Member ID reference (from live DB):
    Rajesh Khandelwal  (Global Admin)    → 955e2975-bf64-48c2-99cc-3ae9f703b8d5
    Sunita Sharma      (Chapter Admin)   → 4f2f1a8a-4e11-4a3f-b014-d6140accb7cd
    Priya Agarwal      (Data Steward)    → 1572af15-fdc7-4c11-9e3c-03185c50f040
    Suresh Gupta       (Dir Manager)     → 5369121a-0a98-4293-81ac-6e2f7f1b21ca
    Deepak Jain        (Event Manager)   → 9fba0eee-bc92-412b-96b3-0bbf46d5141d
    Anita Bansal       (Finance Admin)   → b0a47ad0-7caf-435b-90bd-7c23e7d65c0c
    Vikram Mehta       (Publisher)       → fc340d7e-091c-4762-8352-7dfe9396a00c
    Pooja Verma        (Moderator)       → 96d109f8-4a38-4098-b443-325bc38d8ca6
    Amit Patel         (Member)          → c3e19d25-22ed-4b2a-a489-5c5d38a8855a
    Aarav Mehta        (seed1)           → b683d94d-9557-4406-be00-2d59ddbcd712
    Karan Mehta        (seed2)           → 03a3a5f7-6fe0-4f7d-8b14-f70da8e50562
    Nisha Patel        (seed3)           → f0a87fdd-54b1-4118-a435-eb9828222c31
    Vivek Joshi        (seed4)           → 8eed11a7-4833-427e-bdff-726cd18a3c7c
    Anjali Desai       (seed5)           → c1326922-b6e0-4036-a680-c11a6b4199e6
    Rohan Thakkar      (seed6)           → 28646bd6-fdb1-46e6-bdd2-e966f66fe825
    Meera Kothari      (seed7)           → 036ff77a-3931-4b32-a759-b9a1d3b90d18
    Arjun Bhatt        (seed8)           → fda701d0-0248-4944-bfcf-b055ba35a5e4
    Kavita Sanghvi     (seed9)           → 98845a8d-7778-4bd4-85e4-cedae058b527
    Dhruv Parikh       (seed10)          → 8786d380-134f-443f-9278-23d3def33c8d
*/

-- -------------------------------------------------------
-- Phone contacts
-- -------------------------------------------------------
INSERT INTO member_contacts (id, member_id, type, value, verified, primary_flag) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'phone', '+91-98765-00001', true,  true),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'phone', '+91-98765-00002', true,  true),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'phone', '+91-98765-00003', true,  true),
  (gen_random_uuid(), '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid, 'phone', '+91-98765-00004', true,  true),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'phone', '+91-98765-00005', true,  true),
  (gen_random_uuid(), 'b0a47ad0-7caf-435b-90bd-7c23e7d65c0c'::uuid, 'phone', '+91-98765-00006', true,  true),
  (gen_random_uuid(), 'fc340d7e-091c-4762-8352-7dfe9396a00c'::uuid, 'phone', '+91-98765-00007', false, true),
  (gen_random_uuid(), '96d109f8-4a38-4098-b443-325bc38d8ca6'::uuid, 'phone', '+91-98765-00008', false, true),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'phone', '+91-98765-00009', false, true),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'phone', '+91-79000-00001', true,  true),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'phone', '+91-79000-00002', true,  true),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'phone', '+91-79000-00003', true,  true),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'phone', '+91-79000-00004', true,  true),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'phone', '+91-79000-00005', true,  true),
  (gen_random_uuid(), '28646bd6-fdb1-46e6-bdd2-e966f66fe825'::uuid, 'phone', '+91-79000-00006', true,  true),
  (gen_random_uuid(), '036ff77a-3931-4b32-a759-b9a1d3b90d18'::uuid, 'phone', '+91-79000-00007', false, true),
  (gen_random_uuid(), 'fda701d0-0248-4944-bfcf-b055ba35a5e4'::uuid, 'phone', '+91-79000-00008', true,  true),
  (gen_random_uuid(), '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid, 'phone', '+91-79000-00009', true,  true),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'phone', '+91-79000-00010', false, true)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Employment
-- -------------------------------------------------------
INSERT INTO employment (id, member_id, job_title, company, sector, start_date, end_date) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Managing Director',       'Khadayata Textiles Pvt Ltd',    'Textile',       '2005-01-01', NULL),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Principal',               'Ahmedabad Public School',        'Education',     '2010-06-01', NULL),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Senior Auditor',          'Agarwal & Associates CA Firm',   'Finance',       '2012-04-01', NULL),
  (gen_random_uuid(), '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid, 'Operations Manager',      'Gupta Logistics Ltd',            'Logistics',     '2008-03-01', NULL),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'Event Coordinator',       'Celebration Events Co.',         'Events',        '2015-07-01', NULL),
  (gen_random_uuid(), 'b0a47ad0-7caf-435b-90bd-7c23e7d65c0c'::uuid, 'CFO',                     'Bansal Holdings',                'Finance',       '2003-09-01', NULL),
  (gen_random_uuid(), 'fc340d7e-091c-4762-8352-7dfe9396a00c'::uuid, 'Journalist',              'Gujarat Samachar Digital',       'Media',         '2018-01-01', NULL),
  (gen_random_uuid(), '96d109f8-4a38-4098-b443-325bc38d8ca6'::uuid, 'Content Moderator',       'SafeNet Media Pvt Ltd',          'Technology',    '2019-03-01', NULL),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'Software Engineer',       'TechVista Solutions',            'Technology',    '2021-07-01', NULL),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Chartered Accountant',    'Mehta & Sons CA',                'Finance',       '2018-04-01', NULL),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'Doctor',                  'Sanjivani Hospital',             'Healthcare',    '2016-08-01', NULL),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'Interior Designer',       'DesignNest Studio',              'Design',        '2017-02-01', NULL),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'Civil Engineer',          'Joshi Infrastructure Ltd',       'Construction',  '2014-05-01', NULL),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'Lawyer',                  'Desai & Partners Law Firm',      'Legal',         '2015-10-01', NULL),
  (gen_random_uuid(), '28646bd6-fdb1-46e6-bdd2-e966f66fe825'::uuid, 'Pharmacist',              'Thakkar MedCare',                'Healthcare',    '2019-06-01', NULL),
  (gen_random_uuid(), '036ff77a-3931-4b32-a759-b9a1d3b90d18'::uuid, 'Art Curator',             'Heritage Gallery Ahmedabad',     'Arts',          '2020-01-01', NULL),
  (gen_random_uuid(), 'fda701d0-0248-4944-bfcf-b055ba35a5e4'::uuid, 'Mechanical Engineer',     'Bhatt Automotive Pvt Ltd',       'Manufacturing', '2017-09-01', NULL),
  (gen_random_uuid(), '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid, 'Fashion Designer',        'Kavita Couture',                 'Fashion',       '2018-11-01', NULL),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Data Scientist',          'Analytics First',                'Technology',    '2022-02-01', NULL)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Education
-- -------------------------------------------------------
INSERT INTO education (id, member_id, degree, institution, year) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'MBA',               'IIM Ahmedabad',                2000),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'M.Ed',              'Gujarat University',           2006),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'CA',                'ICAI',                         2010),
  (gen_random_uuid(), '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid, 'B.Com',             'H.L. College of Commerce',     2001),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'BBA',               'Nirma University',             2007),
  (gen_random_uuid(), 'b0a47ad0-7caf-435b-90bd-7c23e7d65c0c'::uuid, 'MBA (Finance)',      'SP Jain Institute',            1999),
  (gen_random_uuid(), 'fc340d7e-091c-4762-8352-7dfe9396a00c'::uuid, 'BA Journalism',     'Ahmedabad University',         2014),
  (gen_random_uuid(), '96d109f8-4a38-4098-b443-325bc38d8ca6'::uuid, 'BSc IT',            'SVIT College',                 2012),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'B.Tech CS',         'Nirma University',             2019),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'CA',                'ICAI',                         2016),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'MBBS',              'B.J. Medical College',         2014),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'B.Des',             'NID Ahmedabad',                2015),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'B.Tech Civil',      'L.D. Engineering College',     2012),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'LLB',               'Gujarat National Law University', 2013),
  (gen_random_uuid(), '28646bd6-fdb1-46e6-bdd2-e966f66fe825'::uuid, 'B.Pharm',           'Sardar Patel University',      2017),
  (gen_random_uuid(), '036ff77a-3931-4b32-a759-b9a1d3b90d18'::uuid, 'BA Fine Arts',      'MSU Baroda',                   2018),
  (gen_random_uuid(), 'fda701d0-0248-4944-bfcf-b055ba35a5e4'::uuid, 'B.Tech Mechanical', 'Dharmsinh Desai University',   2015),
  (gen_random_uuid(), '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid, 'B.Des Fashion',     'NIFT Ahmedabad',               2016),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'M.Tech DS',         'IIT Gandhinagar',              2024)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Skills
-- -------------------------------------------------------
INSERT INTO member_skills (id, member_id, skill) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Business Strategy'),
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Leadership'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Teaching'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Administration'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Auditing'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Financial Analysis'),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'Event Planning'),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'Vendor Management'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'React'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'TypeScript'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'Node.js'),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Tax Planning'),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'Surgery'),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'Interior Design'),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'Structural Engineering'),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'Corporate Law'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Machine Learning'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Python')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Languages
-- -------------------------------------------------------
INSERT INTO member_languages (id, member_id, language) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Gujarati'),
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Hindi'),
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'English'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Gujarati'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Hindi'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Gujarati'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'English'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'Gujarati'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'English'),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Gujarati'),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Hindi'),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'Gujarati'),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'English'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Gujarati'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'English')
ON CONFLICT DO NOTHING;
