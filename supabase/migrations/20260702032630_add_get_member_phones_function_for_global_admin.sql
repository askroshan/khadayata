
CREATE OR REPLACE FUNCTION public.get_member_phones()
RETURNS TABLE(member_id uuid, phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'Global Admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT mc.member_id, mc.value AS phone
  FROM public.member_contacts mc
  WHERE mc.type = 'phone'
    AND mc.primary_flag = true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_member_phones() FROM public;
GRANT EXECUTE ON FUNCTION public.get_member_phones() TO authenticated;
