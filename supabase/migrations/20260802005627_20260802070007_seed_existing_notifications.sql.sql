/*
# Seed existing data into notifications table

1. Purpose
- Migrate existing vouches, event RSVPs, mentorships, and verification requests
  into the new notifications table so no notification history is lost.
- Filters out rows with null member_id (can happen for orphaned mentorship records).

2. Data Sources
- vouches → notifications with type 'vouch'
- event_rsvps → notifications with type 'rsvp'
- mentorships (mentee side) → notifications with type 'mentorship'
- verification_requests → notifications with type 'verification'

3. Safety
- Uses NOT EXISTS checks to avoid duplicating if re-run.
- No data is deleted from source tables.
*/

-- Seed vouches
INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type, created_at)
SELECT
  v.member_id,
  'vouch',
  'New Vouch Received',
  COALESCE(
    (SELECT m.first_name || ' ' || m.last_name FROM members m WHERE m.id = v.voucher_member_id),
    'Someone'
  ) || ' vouched for you',
  v.id::text,
  'vouch',
  v.created_at
FROM vouches v
WHERE v.member_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.entity_id = v.id::text AND n.entity_type = 'vouch' AND n.member_id = v.member_id
  );

-- Seed event RSVPs
INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type, created_at)
SELECT
  r.member_id,
  'rsvp',
  'Event RSVP Confirmed',
  'Your RSVP for "' || COALESCE(e.name, 'an event') || '" is confirmed as ' || r.status,
  r.id::text,
  'rsvp',
  r.created_at
FROM event_rsvps r
LEFT JOIN events e ON r.event_id = e.id
WHERE r.member_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.entity_id = r.id::text AND n.entity_type = 'rsvp' AND n.member_id = r.member_id
  );

-- Seed mentorships (mentee notifications)
INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type, created_at)
SELECT
  m.mentee_member_id,
  'mentorship',
  CASE WHEN m.status = 'active' THEN 'Mentorship Accepted' ELSE 'Mentorship Request' END,
  COALESCE(
    (SELECT ment.first_name || ' ' || ment.last_name FROM members ment WHERE ment.id = m.mentor_member_id),
    'A mentor'
  ) || CASE WHEN m.status = 'active' THEN ' accepted your request' ELSE ' connected with you' END,
  m.id::text,
  'mentorship',
  m.created_at
FROM mentorships m
WHERE m.mentee_member_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.entity_id = m.id::text AND n.entity_type = 'mentorship' AND n.member_id = m.mentee_member_id
  );

-- Seed verification requests
INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type, created_at)
SELECT
  vr.member_id,
  'verification',
  'Verification Update',
  'Your verification request status: ' || vr.status,
  vr.id::text,
  'verification',
  vr.created_at
FROM verification_requests vr
WHERE vr.member_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.entity_id = vr.id::text AND n.entity_type = 'verification' AND n.member_id = vr.member_id
  );
