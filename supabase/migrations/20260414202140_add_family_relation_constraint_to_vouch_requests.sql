/*
  # Add blood relation constraint to vouch_requests

  ## Summary
  Prevent members who share first-degree blood relations (direct family tree links)
  from vouching for each other. This ensures vouching comes from independent community members.

  ## Changes
  - Add function `is_direct_family_relation()` to check if two members are directly related
  - Add CHECK constraint to vouch_requests table preventing direct relatives from vouching
  - Direct relations include: spouse, parent, child, sibling

  ## Implementation Notes
  The function checks if two members have a family_link where the relation is one of:
  - Spouse, Father, Mother, Son, Daughter, Brother, Sister
  Checks both directions (A→B and B→A)
*/

-- Create function to check if two members are direct blood relations
CREATE OR REPLACE FUNCTION is_direct_family_relation(member_a uuid, member_b uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if members are connected by first-degree blood relations
  -- Relations that qualify as "direct family": Spouse, Father, Mother, Son, Daughter, Brother, Sister
  RETURN EXISTS (
    SELECT 1 FROM family_links
    WHERE (
      (member_id = member_a AND related_member_id = member_b) OR
      (member_id = member_b AND related_member_id = member_a)
    )
    AND relation IN ('Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Add constraint to vouch_requests to prevent direct family members from vouching
ALTER TABLE vouch_requests
ADD CONSTRAINT vouch_requests_no_direct_family 
CHECK (NOT is_direct_family_relation(requester_member_id, target_member_id));
