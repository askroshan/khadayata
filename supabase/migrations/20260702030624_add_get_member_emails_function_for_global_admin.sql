/*
  # Add function to fetch member emails for Global Admin

  1. New Function
    - `get_member_emails()` returns a table of (member_id, email, email_confirmed_at)
    - SECURITY DEFINER owned by postgres to access auth.users
    - Only executable by authenticated users
    - Internal check: only returns data if caller has Global Admin role

  2. Security
    - Revoke from public/anon
    - Grant only to authenticated
    - Function validates caller has Global Admin role before returning data
*/

CREATE OR REPLACE FUNCTION public.get_member_emails()
RETURNS TABLE(member_id uuid, email text, email_confirmed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow Global Admin
  IF NOT public.has_role(auth.uid(), 'Global Admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT m.id AS member_id, u.email::text, u.email_confirmed_at
  FROM public.members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.user_id IS NOT NULL;
END;
$$;

-- Lock down permissions
REVOKE EXECUTE ON FUNCTION public.get_member_emails() FROM public;
GRANT EXECUTE ON FUNCTION public.get_member_emails() TO authenticated;

COMMENT ON FUNCTION public.get_member_emails() IS 'Returns member emails for Global Admin use in admin panel. Validates caller role internally.';
