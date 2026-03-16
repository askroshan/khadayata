/*
  # Fix Moderator test user verification level

  Sets moderator@test.khandelwal.org (Pooja Verma) to verification_level = 2 (Trusted/L2)
  to match all other admin-class test users and suppress the "Submit ID docs for L2" dashboard prompt.
*/

UPDATE members
SET verification_level = 2
WHERE id = (
  SELECT m.id
  FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email = 'moderator@test.khandelwal.org'
);
