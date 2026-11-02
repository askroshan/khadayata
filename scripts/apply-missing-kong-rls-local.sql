-- Idempotent local Kong fixes for live Vitest suites that assume migrations
-- from 2026-05 / 2026-09 are applied. Safe to re-run.

-- Public committee: anon SELECT on roles / role_assignments
DROP POLICY IF EXISTS "Anyone can read roles" ON public.roles;
CREATE POLICY "Anyone can read roles"
  ON public.roles FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anyone can read role assignments" ON public.role_assignments;
CREATE POLICY "Anyone can read role assignments"
  ON public.role_assignments FOR SELECT TO anon USING (true);

-- has_role must not be callable by anon (expect PostgREST 42501)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO service_role;

-- Chapter transfer approvals (Global Admin, pending-only)
DROP POLICY IF EXISTS "Global admins decide chapter transfers" ON public.chapter_transfers;
CREATE POLICY "Global admins decide chapter transfers"
  ON public.chapter_transfers FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') AND status = 'pending')
  WITH CHECK (
    has_role(auth.uid(), 'Global Admin')
    AND status IN ('pending', 'approved', 'rejected')
  );

CREATE INDEX IF NOT EXISTS idx_chapter_transfers_status ON public.chapter_transfers(status);

NOTIFY pgrst, 'reload schema';
