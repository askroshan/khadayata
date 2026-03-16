/*
  # Fix Test Seed Data: Replace 'Visa' Ekda Values

  ## Summary
  Replaces invalid test seed data 'Visa' (a payment card brand) stored in the
  members.ekda column with culturally appropriate Khandelwal community Ekda
  (clan/gotra group) values. Multiple members had this placeholder value.

  ## Changes
  - Updates members who have ekda = 'Visa' with realistic Khandelwal ekda values
  - Uses known valid Khandelwal Ekdas: Agrawala, Maheshwari, Oswal, Khandelwal, Porwal
*/

UPDATE members SET ekda = 'Khandelwal' WHERE id = '955e2975-bf64-48c2-99cc-3ae9f703b8d5' AND ekda = 'Visa';
UPDATE members SET ekda = 'Oswal'       WHERE id = '5369121a-0a98-4293-81ac-6e2f7f1b21ca' AND ekda = 'Visa';
UPDATE members SET ekda = 'Agrawala'    WHERE id = '9fba0eee-bc92-412b-96b3-0bbf46d5141d' AND ekda = 'Visa';
UPDATE members SET ekda = 'Maheshwari'  WHERE id = 'fc340d7e-091c-4762-8352-7dfe9396a00c' AND ekda = 'Visa';
UPDATE members SET ekda = 'Porwal'      WHERE id = 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a' AND ekda = 'Visa';

UPDATE members SET ekda = 'Khandelwal' WHERE ekda = 'Visa';
