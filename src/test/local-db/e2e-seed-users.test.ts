import { describe, it, expect } from "vitest";
import { withPg } from "@/test/helpers/local-pg";
import { E2E_ACCOUNTS } from "@/test/helpers/e2e-accounts";

describe("local mirror of E2E seed users", () => {
  it("every E2E email exists in auth.users with a password hash", async () => {
    await withPg(async (client) => {
      for (const account of Object.values(E2E_ACCOUNTS)) {
        const { rows } = await client.query<{ email: string; has_pw: boolean }>(
          `SELECT email, (encrypted_password IS NOT NULL AND length(encrypted_password) > 20) AS has_pw
           FROM auth.users WHERE email = $1`,
          [account.email],
        );
        expect(rows[0], account.email).toBeTruthy();
        expect(rows[0].has_pw, account.email).toBe(true);
      }
    });
  });

  it("role accounts have active role_assignments where expected", async () => {
    await withPg(async (client) => {
      for (const account of Object.values(E2E_ACCOUNTS)) {
        if (!account.roleLabel) continue;
        const { rows } = await client.query<{ n: string }>(
          `SELECT count(*)::text AS n
           FROM auth.users u
           JOIN members m ON m.user_id = u.id
           JOIN role_assignments ra ON ra.member_id = m.id
             AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
           JOIN roles r ON r.id = ra.role_id
           WHERE u.email = $1 AND r.name = $2`,
          [account.email, account.roleLabel],
        );
        expect(Number(rows[0].n), `${account.email} → ${account.roleLabel}`).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
