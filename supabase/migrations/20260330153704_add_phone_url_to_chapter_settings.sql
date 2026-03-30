/*
  # Add phone and url to chapter contact settings

  ## Summary
  Updates the contact object within each chapter's settings JSONB to include
  a phone number and chapter URL for display on the public chapter detail page.

  ## Changes
  - Ahmedabad: +91-79-2654-0001, https://khadayataonline.com/chapters/ahmedabad
  - Mumbai: +91-22-2654-0002, https://khadayataonline.com/chapters/mumbai
  - Surat: +91-261-265-4003, https://khadayataonline.com/chapters/surat
  - Jaipur: +91-141-265-4004, https://khadayataonline.com/chapters/jaipur
  - New Delhi: +91-11-2654-0005, https://khadayataonline.com/chapters/delhi
  - New York: +1-212-555-0106, https://khadayataonline.com/chapters/new-york
  - London: +44-20-7946-0107, https://khadayataonline.com/chapters/london
  - Dubai: +971-4-555-0108, https://khadayataonline.com/chapters/dubai
  - Global: https://khadayataonline.com/chapters/global
*/

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-79-2654-0001', 'url', 'https://khadayataonline.com/chapters/ahmedabad')
    )
WHERE slug = 'ahmedabad';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-22-2654-0002', 'url', 'https://khadayataonline.com/chapters/mumbai')
    )
WHERE slug = 'mumbai';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-261-265-4003', 'url', 'https://khadayataonline.com/chapters/surat')
    )
WHERE slug = 'surat';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-141-265-4004', 'url', 'https://khadayataonline.com/chapters/jaipur')
    )
WHERE slug = 'jaipur';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-11-2654-0005', 'url', 'https://khadayataonline.com/chapters/delhi')
    )
WHERE slug = 'delhi';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+1-212-555-0106', 'url', 'https://khadayataonline.com/chapters/new-york')
    )
WHERE slug = 'new-york';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+44-20-7946-0107', 'url', 'https://khadayataonline.com/chapters/london')
    )
WHERE slug = 'london';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+971-4-555-0108', 'url', 'https://khadayataonline.com/chapters/dubai')
    )
WHERE slug = 'dubai';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-80-2654-0000', 'url', 'https://khadayataonline.com/chapters/global')
    )
WHERE slug = 'global';
