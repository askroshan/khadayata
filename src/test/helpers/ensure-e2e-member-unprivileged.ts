import { execFileSync } from "node:child_process";
import { E2E_ACCOUNTS } from "@/test/helpers/e2e-accounts";

/**
 * Coverage suites sometimes leave privileged role_assignments on the E2E
 * regular member, and Kong DB restores sometimes drop
 * trg_guard_privileged_member_columns. Both break authz deny tests.
 *
 * Idempotent: strip member roles + recreate the privileged-column guard trigger.
 */
export function ensureE2eMemberUnprivileged(): void {
  const email = E2E_ACCOUNTS.member.email.replace(/'/g, "''");
  const sql = `
DROP TRIGGER IF EXISTS trg_guard_privileged_member_columns ON public.members;
CREATE TRIGGER trg_guard_privileged_member_columns
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_member_columns();

DELETE FROM public.role_assignments ra
USING public.members m
WHERE ra.member_id = m.id
  AND m.user_id IN (
    SELECT id FROM auth.users WHERE email = '${email}'
  );
`;
  try {
    execFileSync(
      "docker",
      [
        "exec",
        "supabase_db_khadayata-local",
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    console.warn("ensureE2eMemberUnprivileged:", (err as Error).message);
  }
}
