/*
  # Seed Scholarships and Archives Data (v2)

  1. Scholarships — 4 active scholarships with correct column names
  2. Magazine Issues — 5 Khadayata Jyoti issues
  3. Book Pages — 6 history book pages (no created_at, uses book_key)
*/

DO $$
DECLARE
  ahmedabad_chapter UUID := 'f1000002-0000-0000-0000-000000000002';
BEGIN

INSERT INTO scholarships (id, name, description, amount, currency, deadline, chapter_id, eligibility, status)
VALUES
  (gen_random_uuid(), 'Khandelwal Merit Scholarship 2026',
   'Annual scholarship for outstanding academic performance in SSC/HSC examinations. Awarded to top 5 students from the Khandelwal community.',
   25000, 'INR', NOW() + INTERVAL '60 days', ahmedabad_chapter,
   'Must be a member or dependent of a verified Khandelwal community member. Minimum 85% aggregate in board exams. Age below 22 years.',
   'active'),

  (gen_random_uuid(), 'Vyapaar Vikas Scholarship',
   'Scholarship supporting higher education in Business Administration, Commerce, and Finance for aspiring entrepreneurs from our community.',
   50000, 'INR', NOW() + INTERVAL '45 days', NULL,
   'Open to all chapters globally. Pursuing graduation or post-graduation in Business/Commerce/Finance. Family income below 10 LPA.',
   'active'),

  (gen_random_uuid(), 'Women Empowerment Award',
   'Special scholarship for young women from the Khandelwal community pursuing education in STEM, Law, or Medicine.',
   35000, 'INR', NOW() + INTERVAL '90 days', NULL,
   'Female candidates only. Enrolled in STEM, Law, or Medicine course at a recognized university. Must provide a 500-word essay on community contribution goals.',
   'active'),

  (gen_random_uuid(), 'Global Diaspora Education Grant',
   'Supporting Khandelwal youth studying abroad. Covers partial tuition costs for recognized international universities.',
   150000, 'INR', NOW() + INTERVAL '30 days', NULL,
   'Currently enrolled at an accredited international university. Parent must be a verified community member for 5+ years. Submit academic transcripts and proof of admission.',
   'active')
ON CONFLICT DO NOTHING;

INSERT INTO magazine_issues (id, title, volume, issue_date, pdf_url)
VALUES
  (gen_random_uuid(), 'Khadayata Jyoti — January 2024', 18, '2024-01-15',
   'https://khadayataonline.org/archives/jyoti-jan-2024.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — July 2023', 17, '2023-07-01',
   'https://khadayataonline.org/archives/jyoti-jul-2023.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — January 2023 — Golden Jubilee Special', 16, '2023-01-15',
   'https://khadayataonline.org/archives/jyoti-jan-2023-golden-jubilee.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — July 2022', 15, '2022-07-01',
   'https://khadayataonline.org/archives/jyoti-jul-2022.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — January 2022', 14, '2022-01-15',
   'https://khadayataonline.org/archives/jyoti-jan-2022.pdf')
ON CONFLICT DO NOTHING;

INSERT INTO book_pages (id, book_key, page_number, ocr_text)
VALUES
  (gen_random_uuid(), 'khandelwal-history', 1,
   'Chapter 1: Origins of the Khandelwal Community. The Khandelwal community traces its origins to Khandela, a historic town in the Sikar district of Rajasthan, India. The community is primarily comprised of Vaishyas (the merchant and trading class) who migrated across the Indian subcontinent over centuries, establishing thriving commercial hubs in cities from Rajasthan to Bengal, and eventually across the globe.'),
  (gen_random_uuid(), 'khandelwal-history', 2,
   'Chapter 1 (continued): Historical records from the 12th century CE reference the Khandela kingdom under the rule of the Shekhawat Rajputs. The Khandelwal merchants were instrumental in financing trade routes across the Thar desert, acting as financiers, traders, and bankers. Their prominence in commerce earned them the epithet Seth (wealthy trader), a title still used with reverence today.'),
  (gen_random_uuid(), 'khandelwal-history', 3,
   'Chapter 2: Gotra and Lineage. The Khandelwal community is organized into gotra (lineage groups), each tracing descent from a common ancestor. The primary gotras include Garg, Kashyap, Bharadwaj, Vashishtha, Atreya, and Sandilya. Marriage within the same gotra is traditionally prohibited as members are considered siblings. The ekda sub-group system further subdivides families for matrimonial compatibility.'),
  (gen_random_uuid(), 'khandelwal-history', 4,
   'Chapter 3: Migration and the Diaspora. Beginning in the 18th century, Khandelwal families began migrating beyond Rajasthan. Kolkata became a major hub in the 19th century, followed by Mumbai, Ahmedabad, and Nagpur. Post-independence, migration accelerated toward East Africa, the United Kingdom, the United States, Canada, and the Gulf states. Today, the global Khandelwal diaspora numbers approximately 2 million.'),
  (gen_random_uuid(), 'khandelwal-history', 5,
   'Chapter 4: Cultural Practices and Festivals. The Khandelwal community celebrates all major Hindu festivals with distinctive regional variations. Diwali holds special significance as the community new year in business. The Chopda Puja ritual involves worshipping the account books and praying for prosperity. Other important observances include Akshaya Tritiya for new ventures, Dhanteras for wealth, and the Kuldevi worship ceremonies at ancestral villages.'),
  (gen_random_uuid(), 'khandelwal-history', 6,
   'Chapter 5: Contribution to Indian Society. Khandelwal industrialists and philanthropists have made lasting contributions to Indian civil society. Notable institutions founded by community members include hospitals, educational trusts, dharamshalas (rest houses), and temples across the country. The community tradition of dana (charitable giving) and seva (selfless service) has produced generations of social leaders who combined commercial success with community welfare.')
ON CONFLICT DO NOTHING;

END $$;
