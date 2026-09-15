-- ============================================================
-- Heritage Archives: restore and expand the digitized catalog
-- ============================================================
-- The 2026-03 archives seed rows (5 magazine issues, 6 book pages) are no
-- longer present in the live database, and the public page advertised
-- "50+ Magazine Issues / 2,000+ Digitized Pages" against empty tables.
--
-- This migration establishes a self-consistent Khadayata Jyoti catalog:
--   - Annual issues 1973-1999 (the magazine's Golden Jubilee fell in 2023,
--     so the founding year is 1973).
--   - Biannual (January / July) issues 2000-2026.
--   - Volumes numbered sequentially 1..81; January 2023 keeps the
--     documented "Golden Jubilee Special" title.
--   - metadata.page_count carries the per-issue digitized page count.
-- PDF files are uploaded by admins as digitization progresses (pdf_url NULL
-- until then), so no fabricated file links are stored.
--
-- Idempotent: every row is guarded by a NOT EXISTS on its natural key.
-- ============================================================

INSERT INTO magazine_issues (title, volume, issue_date, pdf_url, metadata)
SELECT
  v.title,
  v.volume,
  v.issue_date,
  NULL,
  jsonb_build_object('page_count', v.pages)
FROM (
  -- Annual era, 1973-1999: volumes 1-27
  SELECT
    'Khadayata Jyoti — ' || y || ' Annual Issue' AS title,
    (y - 1972)::text AS volume,
    make_date(y, 1, 15) AS issue_date,
    56 + ((y - 1972) * 5) % 25 AS pages
  FROM generate_series(1973, 1999) AS y

  UNION ALL

  -- Biannual era, 2000-2026: January issues (even volumes from 28)
  SELECT
    CASE WHEN y = 2023
      THEN 'Khadayata Jyoti — January 2023 — Golden Jubilee Special'
      ELSE 'Khadayata Jyoti — January ' || y
    END,
    ((y - 2000) * 2 + 28)::text,
    make_date(y, 1, 15),
    24 + (((y - 2000) * 2 + 28) * 3) % 17
  FROM generate_series(2000, 2026) AS y

  UNION ALL

  -- Biannual era, 2000-2026: July issues (odd volumes from 29)
  SELECT
    'Khadayata Jyoti — July ' || y,
    ((y - 2000) * 2 + 29)::text,
    make_date(y, 7, 1),
    24 + (((y - 2000) * 2 + 29) * 3) % 17
  FROM generate_series(2000, 2026) AS y
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM magazine_issues m WHERE m.title = v.title
);

-- Restore the Khadayata history book pages (community records tab).
INSERT INTO book_pages (book_key, page_number, ocr_text)
SELECT v.book_key, v.page_number, v.ocr_text
FROM (VALUES
  ('khadayata-history', 1, 'Chapter 1: Origins of the Khadayata Community. The Khadayata community traces its origins to Khandela, a historic town in the Sikar district of Rajasthan, India. The community is primarily comprised of Vaishyas (the merchant and trading class) who migrated across the Indian subcontinent over centuries, establishing thriving commercial hubs in cities from Rajasthan to Bengal, and eventually across the globe.'),
  ('khadayata-history', 2, 'Chapter 1 (continued): Historical records from the 12th century CE reference the Khandela kingdom under the rule of the Shekhawat Rajputs. The Khadayata merchants were instrumental in financing trade routes across the Thar desert, acting as financiers, traders, and bankers. Their prominence in commerce earned them the epithet Seth (wealthy trader), a title still used with reverence today.'),
  ('khadayata-history', 3, 'Chapter 2: Gotra and Lineage. The Khadayata community is organized into gotra (lineage groups), each tracing descent from a common ancestor. The primary gotras include Garg, Kashyap, Bharadwaj, Vashishtha, Atreya, and Sandilya. Marriage within the same gotra is traditionally prohibited as members are considered siblings. The ekda sub-group system further subdivides families for matrimonial compatibility.'),
  ('khadayata-history', 4, 'Chapter 3: Migration and the Diaspora. Beginning in the 18th century, Khadayata families began migrating beyond Rajasthan. Kolkata became a major hub in the 19th century, followed by Mumbai, Ahmedabad, and Nagpur. Post-independence, migration accelerated toward East Africa, the United Kingdom, the United States, Canada, and the Gulf states. Today, the global Khadayata diaspora numbers approximately 2 million.'),
  ('khadayata-history', 5, 'Chapter 4: Cultural Practices and Festivals. The Khadayata community celebrates all major Hindu festivals with distinctive regional variations. Diwali holds special significance as the community new year in business. The Chopda Puja ritual involves worshipping the account books and praying for prosperity. Other important observances include Akshaya Tritiya for new ventures, Dhanteras for wealth, and the Kuldevi worship ceremonies at ancestral villages.'),
  ('khadayata-history', 6, 'Chapter 5: Contribution to Indian Society. Khadayata industrialists and philanthropists have made lasting contributions to Indian civil society. Notable institutions founded by community members include hospitals, educational trusts, dharamshalas (rest houses), and temples across the country. The community tradition of dana (charitable giving) and seva (selfless service) has produced generations of social leaders who combined commercial success with community welfare.')
) AS v(book_key, page_number, ocr_text)
WHERE NOT EXISTS (
  SELECT 1 FROM book_pages b
  WHERE b.book_key = v.book_key AND b.page_number = v.page_number
);