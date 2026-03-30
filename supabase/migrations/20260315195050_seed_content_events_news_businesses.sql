
/*
  # Seed Content: Events, News Articles, Businesses, Jobs

  Creates realistic demo content across all major modules:

  1. Events (4 upcoming, 2 past, 1 virtual, 1 draft)
  2. News articles (published, draft, pending review)
  3. Businesses (verified and unverified listings)
  4. Jobs (open positions)

  All created_by references use the Global Admin auth user id:
    b0000001-cafe-0000-0000-000000000001
  Event/news creators vary across role users.
*/

-- -------------------------------------------------------
-- Events
-- -------------------------------------------------------
INSERT INTO events (
  id, name, description, chapter_id, starts_at, ends_at,
  venue, event_type, category, status, max_capacity,
  contact_email, organizer_name,
  city_id, state_id, country_id,
  tags, created_by
) VALUES
  (
    gen_random_uuid(),
    'Diwali Milap 2026',
    'Annual Diwali celebration bringing the entire Khadayata community together for diyas, sweets, cultural performances, and fellowship. All families welcome.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '20 days')::timestamptz,
    (now() + interval '20 days' + interval '4 hours')::timestamptz,
    'Community Hall, Navrangpura, Ahmedabad',
    'in_person', 'Cultural', 'published', 500,
    'events@khadayataonline.com', 'Ahmedabad Chapter',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['diwali','cultural','family','festival'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Business Networking Breakfast',
    'Monthly breakfast networking event for Khadayata entrepreneurs and professionals. Share ideas, forge partnerships, and grow your network.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '7 days')::timestamptz,
    (now() + interval '7 days' + interval '2 hours')::timestamptz,
    'Hotel Taj Skyline, CG Road, Ahmedabad',
    'in_person', 'Business', 'published', 80,
    'biz@khadayataonline.com', 'Ahmedabad Business Circle',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['networking','business','breakfast'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Youth Talent Showcase',
    'Platform for young community members aged 10-25 to showcase their talents in music, dance, art, and oratory. Prizes for top performers.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '35 days')::timestamptz,
    (now() + interval '35 days' + interval '5 hours')::timestamptz,
    'Tagore Hall, Ahmedabad',
    'in_person', 'Youth', 'published', 300,
    'youth@khadayataonline.com', 'Ahmedabad Youth Wing',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['youth','talent','cultural'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Global KHD Connect - Webinar',
    'Monthly virtual town hall for KHD members worldwide. Updates on platform features, community news, and open Q&A with the global admin team.',
    'f1000001-0000-0000-0000-000000000001'::uuid,
    (now() + interval '14 days')::timestamptz,
    (now() + interval '14 days' + interval '90 minutes')::timestamptz,
    NULL,
    'virtual', 'Community', 'published', NULL,
    'global@khadayataonline.com', 'KHD Global Team',
    NULL, NULL, NULL,
    ARRAY['global','webinar','community'],
    'b0000001-cafe-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'Holi Celebration 2026',
    'Celebrate the festival of colours with the community! Food stalls, music, and plenty of colour. Bring the entire family.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() - interval '10 days')::timestamptz,
    (now() - interval '10 days' + interval '3 hours')::timestamptz,
    'Sabarmati Riverfront, Ahmedabad',
    'in_person', 'Cultural', 'published', 1000,
    'events@khadayataonline.com', 'Ahmedabad Chapter',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['holi','cultural','family'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Annual General Meeting 2025',
    'KHD Ahmedabad Chapter Annual General Meeting. Review of the year, election of new committee members, and future plans.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() - interval '60 days')::timestamptz,
    (now() - interval '60 days' + interval '3 hours')::timestamptz,
    'Ahmedabad Management Association',
    'in_person', 'Governance', 'published', 200,
    'admin@khadayataonline.com', 'Ahmedabad Chapter Committee',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['agm','governance'],
    'b0000001-cafe-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'Scholarship Awards Ceremony',
    'Felicitation of scholarship awardees for 2025-26 academic year. Families and community members are invited to celebrate our bright students.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '50 days')::timestamptz,
    (now() + interval '50 days' + interval '2 hours')::timestamptz,
    'KHD Ahmedabad Community Centre',
    'in_person', 'Education', 'draft', 150,
    'scholarships@khadayataonline.com', 'Finance & Education Committee',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['scholarship','education','awards'],
    'b0000006-cafe-0000-0000-000000000006'::uuid
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- News Articles
-- -------------------------------------------------------
INSERT INTO content_news (
  id, title, summary, body, category, status, featured, tags,
  author_name, published_at, created_by
) VALUES
  (
    gen_random_uuid(),
    'KHD Platform Launches Global Directory Feature',
    'Members across 9 chapters worldwide can now search and connect with the full Khadayata community through the new global directory.',
    'The Khadayata Heritage Directory (KHD) platform is proud to announce the launch of its global member directory, connecting thousands of community members across India and the diaspora. The feature allows authenticated members to search by name, city, chapter, profession, and ekda, making it easy to find long-lost relatives, professional contacts, and community allies. Privacy controls ensure members choose exactly who can see their information.',
    'Announcements', 'published', true,
    ARRAY['platform','directory','global','launch'],
    'KHD Editorial Team',
    now() - interval '5 days',
    'b0000007-cafe-0000-0000-000000000007'::uuid
  ),
  (
    gen_random_uuid(),
    'Ahmedabad Chapter Celebrates 25 Years of Community Service',
    'A retrospective look at 25 years of the Ahmedabad Chapter''s contributions to the Khadayata community.',
    'The Ahmedabad Chapter of KHD proudly marks 25 years of dedicated community service this month. Founded in 2001, the chapter has grown from a small gathering of 50 families to a thriving network of over 2,000 registered members. Key milestones include the establishment of the annual Diwali Milap, the community scholarship fund which has supported over 300 students, and the launch of the emergency contact helpline.',
    'Community News', 'published', true,
    ARRAY['ahmedabad','anniversary','community'],
    'Vikram Mehta',
    now() - interval '15 days',
    'b0000007-cafe-0000-0000-000000000007'::uuid
  ),
  (
    gen_random_uuid(),
    'New Matrimonial Feature: Advanced Matching Algorithm',
    'KHD now uses preference-based matching to suggest compatible profiles, with full privacy controls for families.',
    'The KHD matrimonial section has been upgraded with a sophisticated matching algorithm that considers age, education, location, ekda, and stated preferences. Families can now receive curated suggestions while maintaining complete control over who can view their profile. The new system has already facilitated 12 introductions in its first week.',
    'Platform Updates', 'published', false,
    ARRAY['matrimonial','feature','update'],
    'KHD Tech Team',
    now() - interval '3 days',
    'b0000007-cafe-0000-0000-000000000007'::uuid
  ),
  (
    gen_random_uuid(),
    'Upcoming: Oral History Recording Drive',
    'KHD is launching a community-wide initiative to record and preserve the stories of our elders before they are lost to time.',
    'Draft content for the oral history recording drive announcement. Details to be confirmed with the heritage committee.',
    'Heritage', 'draft', false,
    ARRAY['oral-history','heritage','draft'],
    'Priya Agarwal',
    NULL,
    'b0000003-cafe-0000-0000-000000000003'::uuid
  ),
  (
    gen_random_uuid(),
    'Scholarship Applications Open for 2026-27',
    'The KHD Education Fund is now accepting applications for scholarships for the academic year 2026-27. Eligible students from all chapters may apply.',
    'Applications for the KHD Merit-cum-Need Scholarship 2026-27 are now open. Students who have secured admission in recognised undergraduate or postgraduate programmes are eligible. The fund provides scholarships ranging from ₹25,000 to ₹1,00,000 depending on merit and financial need. Deadline for applications is 30 April 2026.',
    'Education', 'published', false,
    ARRAY['scholarship','education','applications'],
    'Anita Bansal',
    now() - interval '2 days',
    'b0000006-cafe-0000-0000-000000000006'::uuid
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Businesses
-- -------------------------------------------------------
INSERT INTO businesses (
  id, owner_member_id, chapter_id, name, sector, description,
  email, phone, website,
  city_id, state_id, country_id,
  verified, tags
) VALUES
  (
    gen_random_uuid(),
    '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Khadayata Textiles Pvt Ltd',
    'Textile',
    'A family-run textile business established in 1985, specialising in sarees, dress materials, and wholesale fabric supply across Gujarat.',
    'contact@khadayatatextiles.com',
    '+91-79-26540001',
    'https://khadayatatextiles.example.com',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['textile','saree','wholesale','fabric']
  ),
  (
    gen_random_uuid(),
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Mehta & Sons Chartered Accountants',
    'Finance',
    'A full-service CA firm offering taxation, audit, GST compliance, and financial advisory services to individuals and businesses.',
    'info@mehtasons.ca',
    '+91-79-26540002',
    'https://mehtasons.example.com',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['chartered-accountant','tax','audit','gst']
  ),
  (
    gen_random_uuid(),
    '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Gupta Logistics Ltd',
    'Logistics',
    'Pan-India logistics and warehousing solutions. 20+ years of reliable supply chain management for e-commerce and retail clients.',
    'ops@guptalogistics.in',
    '+91-79-26540003',
    NULL,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['logistics','warehousing','supply-chain']
  ),
  (
    gen_random_uuid(),
    'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Desai & Partners Law Firm',
    'Legal',
    'Boutique law firm specialising in corporate law, property disputes, family law, and NRI legal matters.',
    'legal@desaipartners.in',
    '+91-79-26540004',
    NULL,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    false, ARRAY['legal','corporate-law','property','nri']
  ),
  (
    gen_random_uuid(),
    'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'DesignNest Studio',
    'Design',
    'Interior design studio specialising in residential and commercial spaces. Known for blending traditional Indian aesthetics with modern minimalism.',
    'hello@designnest.in',
    '+91-98765-00003',
    'https://designnest.example.com',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    false, ARRAY['interior-design','residential','commercial']
  ),
  (
    gen_random_uuid(),
    '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid,
    'f1000003-0000-0000-0000-000000000003'::uuid,
    'Celebration Events Co.',
    'Events',
    'Full-service event management company for weddings, corporate events, and community celebrations across Mumbai and Gujarat.',
    'events@celebrationco.in',
    '+91-98765-00005',
    NULL,
    'e1000010-0000-0000-0000-000000000010'::uuid,
    'd1000002-0000-0000-0000-000000000002'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['events','weddings','corporate']
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Jobs
-- -------------------------------------------------------
INSERT INTO jobs (
  id, chapter_id, employer_member_id, title, description, location,
  remote, employment_type, salary_min, salary_max, salary_currency, salary_period,
  skills_required, status, city_id, state_id, country_id
) VALUES
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid,
    'Logistics Coordinator',
    'Manage day-to-day logistics operations, coordinate with vendors, and ensure timely delivery. 2+ years experience in logistics preferred.',
    'Ahmedabad', false, 'full_time',
    400000, 600000, 'INR', 'annual',
    ARRAY['logistics','ms-office','communication'],
    'open',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    'Article Assistant (CA Firm)',
    'CA articleship position at Mehta & Sons. Gain exposure to audit, taxation, and GST filings. Final year B.Com or inter CA candidates preferred.',
    'Ahmedabad', false, 'internship',
    180000, 240000, 'INR', 'annual',
    ARRAY['accounting','tally','ms-excel'],
    'open',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'f1000003-0000-0000-0000-000000000003'::uuid,
    '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid,
    'Event Executive',
    'Plan and execute events end-to-end. Must be proactive, detail-oriented, and willing to work weekends during event season.',
    'Mumbai', false, 'full_time',
    350000, 500000, 'INR', 'annual',
    ARRAY['event-planning','vendor-management','coordination'],
    'open',
    'e1000010-0000-0000-0000-000000000010'::uuid,
    'd1000002-0000-0000-0000-000000000002'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid
  )
ON CONFLICT DO NOTHING;
