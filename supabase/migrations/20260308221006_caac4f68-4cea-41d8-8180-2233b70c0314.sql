
-- Seed auth users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('a1000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'seed1@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'seed2@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'seed3@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'seed4@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'seed5@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'seed6@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'seed7@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'seed8@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'seed9@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'seed10@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated');

-- Identities
INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '{"sub":"a1000001-0000-0000-0000-000000000001","email":"seed1@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', '{"sub":"a1000001-0000-0000-0000-000000000002","email":"seed2@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', '{"sub":"a1000001-0000-0000-0000-000000000003","email":"seed3@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', '{"sub":"a1000001-0000-0000-0000-000000000004","email":"seed4@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000005', '{"sub":"a1000001-0000-0000-0000-000000000005","email":"seed5@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000006', '{"sub":"a1000001-0000-0000-0000-000000000006","email":"seed6@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000007', '{"sub":"a1000001-0000-0000-0000-000000000007","email":"seed7@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000008', '{"sub":"a1000001-0000-0000-0000-000000000008","email":"seed8@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000009', '{"sub":"a1000001-0000-0000-0000-000000000009","email":"seed9@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000010', '{"sub":"a1000001-0000-0000-0000-000000000010","email":"seed10@test.local"}', 'email', now(), now(), now());

-- The handle_new_user trigger creates members with empty names. Update them.
UPDATE public.members SET first_name = 'Priya', last_name = 'Shah', gender = 'Female', dob = '1997-03-15' WHERE user_id = 'a1000001-0000-0000-0000-000000000001';
UPDATE public.members SET first_name = 'Karan', last_name = 'Mehta', gender = 'Male', dob = '1995-08-22' WHERE user_id = 'a1000001-0000-0000-0000-000000000002';
UPDATE public.members SET first_name = 'Nisha', last_name = 'Patel', gender = 'Female', dob = '1998-12-05' WHERE user_id = 'a1000001-0000-0000-0000-000000000003';
UPDATE public.members SET first_name = 'Vivek', last_name = 'Joshi', gender = 'Male', dob = '1993-06-18' WHERE user_id = 'a1000001-0000-0000-0000-000000000004';
UPDATE public.members SET first_name = 'Anjali', last_name = 'Desai', gender = 'Female', dob = '1996-01-30' WHERE user_id = 'a1000001-0000-0000-0000-000000000005';
UPDATE public.members SET first_name = 'Rohan', last_name = 'Thakkar', gender = 'Male', dob = '1994-11-10' WHERE user_id = 'a1000001-0000-0000-0000-000000000006';
UPDATE public.members SET first_name = 'Meera', last_name = 'Kothari', gender = 'Female', dob = '1999-07-25' WHERE user_id = 'a1000001-0000-0000-0000-000000000007';
UPDATE public.members SET first_name = 'Arjun', last_name = 'Bhatt', gender = 'Male', dob = '1992-04-03' WHERE user_id = 'a1000001-0000-0000-0000-000000000008';
UPDATE public.members SET first_name = 'Kavita', last_name = 'Sanghvi', gender = 'Female', dob = '1997-09-12' WHERE user_id = 'a1000001-0000-0000-0000-000000000009';
UPDATE public.members SET first_name = 'Dhruv', last_name = 'Parikh', gender = 'Male', dob = '1996-02-28' WHERE user_id = 'a1000001-0000-0000-0000-000000000010';

-- Now insert matrimonial profiles using member IDs from the members table
INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Cheerful and ambitious CA professional from Ahmedabad. Love cooking and classical dance.', 160, 52, 'Fair', 'B+', 'Jain Vegetarian', 'Never Married', 'No', 'Kashyap', 'Rohini', 'Vrishabh (Taurus)', 'Ahmedabad, Gujarat',
  'Joint Family', 'Upper Middle Class', 'Rajeshbhai Shah', 'Diamond Merchant', 'Hansaben Shah', 'Homemaker', 'Married',
  '1 Elder Brother (Married)', 'No', '4 Wheeler', 'Indian', 'India', 'Ahmedabad', 'Gujarat',
  'CA/CS/CMA', 'Chartered Accountancy', 'Senior Auditor', 'Deloitte India', 1200000, 'INR', 'Not Applicable', 'https://linkedin.com/in/priyashah',
  '+91 98765 11001', '+91 98765 11000', 'Shah Ekda', 'Ashapura Maa',
  ARRAY['Cooking','Dance','Yoga','Reading'], '{"min_age":26,"max_age":33,"min_height":168,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"MBA"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000001';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Software engineer in Bangalore. Passionate about technology and cricket.', 175, 72, 'Wheatish', 'A+', 'Vegetarian', 'Never Married', 'No', 'Bharadwaj', 'Mrigashira', 'Mithun (Gemini)', 'Rajkot, Gujarat',
  'Nuclear Family', 'Middle Class', 'Sureshbhai Mehta', 'Government Teacher', 'Kokilaben Mehta', 'School Principal', 'Married',
  '1 Younger Sister (Unmarried)', 'Yes', 'Both', 'Indian', 'India', 'Bangalore', 'Karnataka',
  'Engineer (B.E./B.Tech)', 'Computer Science', 'Senior Software Engineer', 'Infosys', 1800000, 'INR', 'Not Applicable', 'https://linkedin.com/in/karanmehta',
  '+91 98765 22001', '+91 98765 22000', 'Mehta Ekda', 'Khodiyar Maa',
  ARRAY['Sports','Travel','Music','Photography'], '{"min_age":22,"max_age":28,"min_height":150,"max_height":168,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000002';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'MBA graduate in Mumbai finance. Enjoy painting and travel.', 155, 48, 'Very Fair', 'O+', 'Vegetarian', 'Never Married', 'Partial (Anshik)', 'Vashishtha', 'Swati', 'Tula (Libra)', 'Surat, Gujarat',
  'Joint Family', 'Rich', 'Maheshbhai Patel', 'Textile Businessman', 'Rekhaben Patel', 'Homemaker', 'Married',
  '2 Elder Sisters (Both Married)', 'Contact Lenses', '2 Wheeler', 'Indian', 'India', 'Mumbai', 'Maharashtra',
  'MBA', 'Finance', 'Investment Analyst', 'HDFC Securities', 2200000, 'INR', 'Not Applicable', null,
  '+91 98765 33001', '+91 98765 33000', 'Patel Ekda', 'Umiya Maa',
  ARRAY['Painting','Travel','Reading','Yoga'], '{"min_age":27,"max_age":35,"min_height":170,"max_height":188,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Engineer (B.E./B.Tech)"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000003';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Doctor settled in the US. Family-oriented with traditional values.', 178, 78, 'Fair', 'AB+', 'Vegetarian', 'Never Married', 'No', 'Gautam', 'Pushya', 'Kark (Cancer)', 'Vadodara, Gujarat',
  'Joint Family', 'Affluent', 'Dr. Narendrabhai Joshi', 'Retired Doctor', 'Shardaben Joshi', 'Retired Professor', 'Married',
  '1 Younger Brother (Unmarried)', 'Yes', 'Both', 'Indian', 'United States', 'Chicago', 'Illinois',
  'MBBS/MD', 'Internal Medicine', 'Attending Physician', 'Northwestern Memorial', 250000, 'USD', 'Work Visa (H1B/L1)', 'https://linkedin.com/in/vivekjoshi',
  '+1 312 555 4001', '+91 98765 44000', 'Joshi Ekda', 'Bahuchar Maa',
  ARRAY['Meditation','Social Work','Reading','Travel'], '{"min_age":24,"max_age":30,"min_height":155,"max_height":170,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"Post Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000004';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Creative UX designer in Pune. Love art, music, and weekend gardening.', 162, 55, 'Wheatish', 'B-', 'Vegetarian', 'Never Married', 'Yes', 'Atri', 'Hasta', 'Kanya (Virgo)', 'Junagadh, Gujarat',
  'Nuclear Family', 'Middle Class', 'Dineshbhai Desai', 'Pharmacist', 'Niruben Desai', 'Ayurvedic Doctor', 'Married',
  '1 Elder Brother, 1 Younger Sister', 'No', '2 Wheeler', 'Indian', 'India', 'Pune', 'Maharashtra',
  'Post Graduate', 'Design & Fine Arts', 'Lead UX Designer', 'Flipkart', 1500000, 'INR', 'Not Applicable', 'https://linkedin.com/in/anjalidesai',
  '+91 98765 55001', '+91 98765 55000', 'Desai Ekda', 'Chamunda Maa',
  ARRAY['Painting','Music','Gardening','Cooking'], '{"min_age":27,"max_age":34,"min_height":170,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Yes","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000005';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Entrepreneur running textile exports in Surat. Active in philanthropy.', 180, 82, 'Fair', 'O-', 'Vegetarian', 'Never Married', 'No', 'Kaushik', 'Magha', 'Sinh (Leo)', 'Surat, Gujarat',
  'Joint Family', 'Rich', 'Pravinbhai Thakkar', 'Industrialist', 'Jyotiben Thakkar', 'Homemaker', 'Married',
  '1 Younger Sister (Married)', 'No', 'Both', 'Indian', 'India', 'Surat', 'Gujarat',
  'MBA', 'International Business', 'Managing Director', 'Thakkar Textiles Pvt Ltd', 5000000, 'INR', 'Not Applicable', 'https://linkedin.com/in/rohanthakkar',
  '+91 98765 66001', '+91 98765 66000', 'Thakkar Ekda', 'Randal Maa',
  ARRAY['Travel','Social Work','Sports','Music'], '{"min_age":22,"max_age":28,"min_height":155,"max_height":170,"preferred_diet":"Jain Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000006';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Fresh dental graduate from Ahmedabad. Love yoga and Bollywood dance.', 158, 50, 'Very Fair', 'A-', 'Jain Vegetarian', 'Never Married', 'Don''t Know', 'Sandilya', 'Chitra', 'Tula (Libra)', 'Bhavnagar, Gujarat',
  'Nuclear Family', 'Upper Middle Class', 'Jayeshbhai Kothari', 'Jeweller', 'Varshaben Kothari', 'Teacher', 'Married',
  'Only Child', 'No', '4 Wheeler', 'Indian', 'India', 'Ahmedabad', 'Gujarat',
  'MBBS/MD', 'Dentistry (BDS)', 'Dental Surgeon', 'Private Clinic', 900000, 'INR', 'Not Applicable', null,
  '+91 98765 77001', '+91 98765 77000', 'Kothari Ekda', 'Ashapura Maa',
  ARRAY['Dance','Yoga','Cooking','Travel'], '{"min_age":26,"max_age":33,"min_height":170,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"MBA"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000007';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Chartered accountant and MBA settled in London. Traditional at heart.', 173, 74, 'Wheatish', 'B+', 'Vegetarian', 'Never Married', 'No', 'Mudgala', 'Anuradha', 'Vrishchik (Scorpio)', 'Jamnagar, Gujarat',
  'Joint Family', 'Affluent', 'Bipinbhai Bhatt', 'Retired Banker', 'Savitaben Bhatt', 'Social Worker', 'Married',
  '2 Elder Sisters (Both Married)', 'No', 'Both', 'Indian', 'United Kingdom', 'London', 'England',
  'CA/CS/CMA', 'Finance & Accounting', 'Finance Manager', 'Barclays', 85000, 'GBP', 'Work Visa (H1B/L1)', 'https://linkedin.com/in/arjunbhatt',
  '+44 7700 900001', '+91 98765 88000', 'Bhatt Ekda', 'Khodiyar Maa',
  ARRAY['Sports','Photography','Travel','Music'], '{"min_age":23,"max_age":29,"min_height":152,"max_height":168,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Post Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000008';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Pharmacist in Vadodara. Love reading novels and gardening. Down-to-earth.', 157, 53, 'Wheatish Brown', 'A+', 'Vegetarian', 'Never Married', 'Partial (Anshik)', 'Parashar', 'Uttara Phalguni', 'Kanya (Virgo)', 'Mehsana, Gujarat',
  'Joint Family', 'Middle Class', 'Ashokbhai Sanghvi', 'Farmer', 'Induben Sanghvi', 'Homemaker', 'Married',
  '2 Elder Brothers, 1 Younger Sister', 'Yes', 'None', 'Indian', 'India', 'Vadodara', 'Gujarat',
  'Graduate', 'Pharmacy (B.Pharm)', 'Pharmacist', 'Apollo Pharmacy', 600000, 'INR', 'Not Applicable', null,
  '+91 98765 99001', '+91 98765 99000', 'Sanghvi Ekda', 'Umiya Maa',
  ARRAY['Reading','Gardening','Cooking','Meditation'], '{"min_age":27,"max_age":35,"min_height":168,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000009';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Data scientist in Dubai. Passionate about AI and machine learning.', 176, 70, 'Fair', 'O+', 'Eggetarian', 'Never Married', 'No', 'Agastya', 'Shravana', 'Makar (Capricorn)', 'Gandhinagar, Gujarat',
  'Nuclear Family', 'Upper Middle Class', 'Hiteshbhai Parikh', 'IT Professional', 'Preetiben Parikh', 'Bank Manager', 'Married',
  '1 Younger Sister (Unmarried)', 'Contact Lenses', 'Both', 'Indian', 'United Arab Emirates', 'Dubai', 'Dubai',
  'Post Graduate', 'Data Science & AI', 'Senior Data Scientist', 'Emirates NBD', 180000, 'AED', 'Work Visa (H1B/L1)', 'https://linkedin.com/in/dhruvparikh',
  '+971 50 123 4567', '+91 98765 10100', 'Parikh Ekda', 'Bahuchar Maa',
  ARRAY['Travel','Photography','Sports','Music'], '{"min_age":22,"max_age":28,"min_height":152,"max_height":165,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Post Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000010';
