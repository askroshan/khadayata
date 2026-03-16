/*
  # Update platform_name setting to Khadayata

  ## Changes
  - Updates the `platform_name` setting in the `settings` table
  - English value changed from "Khandelwal Heritage Directory" to "Khadayata Heritage Directory"
  - Gujarati value updated to reflect the correct community name

  ## Notes
  - This is a data correction migration — no schema changes
*/

UPDATE public.settings
SET value = '{"en":"Khadayata Heritage Directory","gu":"ખડાયતા હેરિટેજ ડિરેક્ટરી"}'::jsonb
WHERE key = 'platform_name';
