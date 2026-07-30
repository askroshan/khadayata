
-- get_member_emails: anon must not call this (has internal Global Admin check but exposed surface)
REVOKE EXECUTE ON FUNCTION public.get_member_emails() FROM anon;

-- get_member_phones: same — anon should never reach this function
REVOKE EXECUTE ON FUNCTION public.get_member_phones() FROM anon;

-- Re-confirm authenticated access is intact for both (needed for global-admin client calls)
GRANT EXECUTE ON FUNCTION public.get_member_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_phones() TO authenticated;

-- NOTE: has_role, is_direct_family_relation, and accept_family_invitation intentionally
-- remain executable by authenticated:
--   has_role / is_direct_family_relation — called inside RLS USING/WITH CHECK clauses;
--     revoking EXECUTE from authenticated would break every policy that uses them.
--   accept_family_invitation — legitimate user-facing RPC; callers must be authenticated.
-- All three have internal security guards (auth.uid() checks / token validation).
