-- ============================================================
-- Revoke anon/PUBLIC EXECUTE on guard trigger functions
-- ============================================================
-- Advisor finding: the four privileged-column guard functions were created in
-- migration 20260915144007, AFTER the 20260915141525 PUBLIC-execute revoke
-- pass, so they never lost the default PUBLIC grant. They are trigger
-- functions only and are never called over the API.
-- (authenticated EXECUTE on has_role-style helpers stays: RLS policies rely
-- on it -- accepted in the 2026-09-15 audit.)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.guard_privileged_member_columns() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_business_verified_column() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_matrimonial_verified_column() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_oral_history_status() FROM PUBLIC, anon;