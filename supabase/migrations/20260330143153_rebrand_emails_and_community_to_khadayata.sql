/*
  # Rebrand: Update all Khandelwal references to Khadayata in live data

  ## Summary
  Updates the live production database to replace all remaining Khandelwal
  community/email references with Khadayata equivalents.

  ## Changes

  ### Auth users: update email addresses from @test.khandelwal.org to @khadayataonline.com
  ### Auth identities: update identity_data and provider_id
  ### Chapters: update contact emails in settings JSON
  ### Events: update contact_email fields
  ### Scholarships: update contact_email fields and description text
  ### Businesses: update business name and email for Khadayata Textiles
  ### Announcements: update body text
  ### Settings: update platform_name
  ### Book pages: update book_key from khandelwal-history to khadayata-history
  ### Employment: update company name
*/

-- -------------------------------------------------------
-- 1. Auth users: update emails
-- -------------------------------------------------------
UPDATE auth.users SET email = 'global-admin@khadayataonline.com'
  WHERE email = 'global-admin@test.khandelwal.org';
UPDATE auth.users SET email = 'chapter-admin@khadayataonline.com'
  WHERE email = 'chapter-admin@test.khandelwal.org';
UPDATE auth.users SET email = 'data-steward@khadayataonline.com'
  WHERE email = 'data-steward@test.khandelwal.org';
UPDATE auth.users SET email = 'dir-manager@khadayataonline.com'
  WHERE email = 'dir-manager@test.khandelwal.org';
UPDATE auth.users SET email = 'event-manager@khadayataonline.com'
  WHERE email = 'event-manager@test.khandelwal.org';
UPDATE auth.users SET email = 'finance-admin@khadayataonline.com'
  WHERE email = 'finance-admin@test.khandelwal.org';
UPDATE auth.users SET email = 'publisher@khadayataonline.com'
  WHERE email = 'publisher@test.khandelwal.org';
UPDATE auth.users SET email = 'moderator@khadayataonline.com'
  WHERE email = 'moderator@test.khandelwal.org';
UPDATE auth.users SET email = 'member@khadayataonline.com'
  WHERE email = 'member@test.khandelwal.org';
UPDATE auth.users SET email = 'unverified@khadayataonline.com'
  WHERE email = 'unverified@test.khandelwal.org';

-- -------------------------------------------------------
-- 2. Auth identities: update identity_data JSON and provider_id
-- -------------------------------------------------------
UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"global-admin@khadayataonline.com"'),
      provider_id = 'global-admin@khadayataonline.com'
  WHERE provider_id = 'global-admin@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"chapter-admin@khadayataonline.com"'),
      provider_id = 'chapter-admin@khadayataonline.com'
  WHERE provider_id = 'chapter-admin@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"data-steward@khadayataonline.com"'),
      provider_id = 'data-steward@khadayataonline.com'
  WHERE provider_id = 'data-steward@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"dir-manager@khadayataonline.com"'),
      provider_id = 'dir-manager@khadayataonline.com'
  WHERE provider_id = 'dir-manager@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"event-manager@khadayataonline.com"'),
      provider_id = 'event-manager@khadayataonline.com'
  WHERE provider_id = 'event-manager@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"finance-admin@khadayataonline.com"'),
      provider_id = 'finance-admin@khadayataonline.com'
  WHERE provider_id = 'finance-admin@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"publisher@khadayataonline.com"'),
      provider_id = 'publisher@khadayataonline.com'
  WHERE provider_id = 'publisher@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"moderator@khadayataonline.com"'),
      provider_id = 'moderator@khadayataonline.com'
  WHERE provider_id = 'moderator@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"member@khadayataonline.com"'),
      provider_id = 'member@khadayataonline.com'
  WHERE provider_id = 'member@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"unverified@khadayataonline.com"'),
      provider_id = 'unverified@khadayataonline.com'
  WHERE provider_id = 'unverified@test.khandelwal.org';

-- -------------------------------------------------------
-- 3. Chapters: update contact emails in settings JSON
-- -------------------------------------------------------
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"global@khadayataonline.com"')
  WHERE slug = 'global';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"ahmedabad@khadayataonline.com"')
  WHERE slug = 'ahmedabad';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"mumbai@khadayataonline.com"')
  WHERE slug = 'mumbai';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"surat@khadayataonline.com"')
  WHERE slug = 'surat';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"jaipur@khadayataonline.com"')
  WHERE slug = 'jaipur';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"delhi@khadayataonline.com"')
  WHERE slug = 'delhi';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"newyork@khadayataonline.com"')
  WHERE slug = 'new-york';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"london@khadayataonline.com"')
  WHERE slug = 'london';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"dubai@khadayataonline.com"')
  WHERE slug = 'dubai';

-- -------------------------------------------------------
-- 4. Events: update contact_email fields
-- -------------------------------------------------------
UPDATE events SET contact_email = 'events@khadayataonline.com'
  WHERE contact_email LIKE '%@ahmedabad.khandelwal.org' OR contact_email = 'events@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'biz@khadayataonline.com'
  WHERE contact_email = 'biz@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'youth@khadayataonline.com'
  WHERE contact_email = 'youth@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'global@khadayataonline.com'
  WHERE contact_email = 'global@khandelwal.org';
UPDATE events SET contact_email = 'admin@khadayataonline.com'
  WHERE contact_email = 'admin@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'scholarships@khadayataonline.com'
  WHERE contact_email = 'scholarships@ahmedabad.khandelwal.org';

-- -------------------------------------------------------
-- 5. Scholarships: update contact_email
-- -------------------------------------------------------
UPDATE scholarships SET contact_email = 'scholarships@khadayataonline.com'
  WHERE contact_email LIKE '%khandelwal.org';
UPDATE scholarships SET contact_email = 'global@khadayataonline.com'
  WHERE contact_email = 'global@khandelwal.org';
UPDATE scholarships
  SET name = replace(name, 'Khandelwal', 'Khadayata'),
      description = replace(description, 'Khandelwal', 'Khadayata'),
      eligibility = replace(eligibility, 'Khandelwal', 'Khadayata')
  WHERE name LIKE '%Khandelwal%'
     OR description LIKE '%Khandelwal%'
     OR eligibility LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 6. Businesses: rename Khandelwal Textiles
-- -------------------------------------------------------
UPDATE businesses
  SET name = 'Khadayata Textiles Pvt Ltd',
      email = 'contact@khadayatatextiles.com',
      website = 'https://khadayatatextiles.example.com'
  WHERE name = 'Khandelwal Textiles Pvt Ltd';

-- -------------------------------------------------------
-- 7. Employment: update company name
-- -------------------------------------------------------
UPDATE employment
  SET company = 'Khadayata Textiles Pvt Ltd'
  WHERE company = 'Khandelwal Textiles Pvt Ltd';

-- -------------------------------------------------------
-- 8. Content news: update Khandelwal references in articles
-- -------------------------------------------------------
UPDATE content_news
  SET title = replace(title, 'Khandelwal', 'Khadayata'),
      summary = replace(summary, 'Khandelwal', 'Khadayata'),
      body = replace(body, 'Khandelwal', 'Khadayata')
  WHERE title LIKE '%Khandelwal%'
     OR summary LIKE '%Khandelwal%'
     OR body LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 9. Announcements: update body text
-- -------------------------------------------------------
UPDATE announcements
  SET body = replace(body, 'Khandelwal', 'Khadayata')
  WHERE body LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 10. Settings: update platform_name English value
-- -------------------------------------------------------
UPDATE settings
  SET value = jsonb_set(value, '{en}', '"Khadayata Heritage Directory"')
  WHERE key = 'platform_name'
    AND value->>'en' LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 11. Book pages: update book_key
-- -------------------------------------------------------
UPDATE book_pages
  SET book_key = 'khadayata-history',
      ocr_text = replace(ocr_text, 'Khandelwal', 'Khadayata')
  WHERE book_key = 'khandelwal-history';
