/*
  # Revoke public EXECUTE on SECURITY DEFINER functions

  1. Security Changes
    - Revokes EXECUTE from `anon` on ALL listed SECURITY DEFINER functions
    - Revokes EXECUTE from `authenticated` on trigger/internal functions that should
      never be called directly via PostgREST RPC:
      - fn_audit_member_changes (trigger only)
      - fn_audit_role_assignments (trigger only)
      - fn_audit_verification_requests (trigger only)
      - fn_autoflag_content (trigger only)
      - handle_new_user (trigger only)
      - record_chapter_transfer_history (trigger only)
      - record_member_chapter_change (trigger only)
    - Revokes EXECUTE from `authenticated` on privileged functions that should only
      be called from edge functions using service_role:
      - generate_global_id (called from edge function only)
    - Keeps EXECUTE for `authenticated` on:
      - accept_family_invitation (called by signed-in users from frontend)
      - has_role (used in RLS policies, needs authenticated)
      - is_direct_family_relation (used in RLS policies, needs authenticated)

  2. Important Notes
    - Trigger functions are invoked by the database engine regardless of EXECUTE grants,
      so revoking does not break trigger behavior
    - RLS policy helper functions (has_role, is_direct_family_relation) need authenticated
      access because they are evaluated in the context of the calling user's session
    - accept_family_invitation is the only user-facing RPC that requires SECURITY DEFINER
*/

-- Revoke ALL execute from anon on every listed function
REVOKE EXECUTE ON FUNCTION public.accept_family_invitation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_audit_member_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_audit_role_assignments() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_audit_verification_requests() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_autoflag_content() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_global_id(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_direct_family_relation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_chapter_transfer_history() FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_member_chapter_change() FROM anon;

-- Revoke from authenticated on trigger/internal-only functions
REVOKE EXECUTE ON FUNCTION public.fn_audit_member_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_audit_role_assignments() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_audit_verification_requests() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_autoflag_content() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_chapter_transfer_history() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_member_chapter_change() FROM authenticated;

-- Revoke from authenticated on edge-function-only privileged functions
REVOKE EXECUTE ON FUNCTION public.generate_global_id(text, text, text) FROM authenticated;
