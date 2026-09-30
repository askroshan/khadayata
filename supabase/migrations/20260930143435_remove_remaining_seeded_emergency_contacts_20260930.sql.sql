/*
# Remove remaining seeded emergency contacts

## Purpose
The first cleanup migration (remove_test_seed_data_20260930) removed
emergency contacts with obvious fake phone patterns (555-0100, KHD Helpline).
5 contacts with real-looking phone numbers (Police 100, hospital numbers)
remained — these were also inserted by the seed_content_events_news_businesses
migration as demo data, not by a chapter admin through the admin panel.
Remove them so no seeded demo data remains in production.

## Safety
- Targets only the 5 remaining seeded rows by ID
- Idempotent
*/
DELETE FROM emergency_contacts
WHERE id IN (
  '8f4a2c7f-93de-4f9d-be9f-2173056a87eb',
  'd2456fd6-1ed3-4c9b-bb58-cd1a340460e9',
  '854d256b-87da-45b6-b59b-76b37f17244c',
  'b7c8c895-1a7a-48b2-8aa1-fc8581712208',
  'f00ec405-50b9-4622-afc0-a892ce2828ec'
);
