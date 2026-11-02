import { describe, it, expect } from "vitest";
import {
  withPg,
  asUser,
  asAnon,
  findUserWithRole,
  findRegularMember,
} from "@/test/helpers/local-pg";

/**
 * RLS behavioral tests on real local data via JWT claim simulation.
 * Requires scripts/grant-api-roles-local.sql applied once after restore.
 */
describe("local RLS by role (real rows)", () => {
  it("anon can read members (public directory policy)", async () => {
    await withPg(async (client) => {
      const n = await asAnon(client, async () => {
        const { rows } = await client.query<{ c: string }>("SELECT count(*)::text AS c FROM members");
        return Number(rows[0].c);
      });
      expect(n).toBeGreaterThan(0);
    });
  });

  it("Global Admin has_role is true and can see chapters", async () => {
    await withPg(async (client) => {
      const ga = await findUserWithRole(client, "Global Admin");
      expect(ga).toBeTruthy();
      await asUser(client, ga!.userId, async () => {
        const role = await client.query<{ ok: boolean }>(
          `SELECT has_role($1::uuid, 'Global Admin') AS ok`,
          [ga!.userId],
        );
        expect(role.rows[0].ok).toBe(true);
        const chapters = await client.query(`SELECT id FROM chapters LIMIT 5`);
        expect(chapters.rowCount).toBeGreaterThan(0);
      });
    });
  });

  it("privileged-column guard trigger is attached on members", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query<{ tgname: string }>(
        `SELECT tgname FROM pg_trigger
         WHERE tgrelid = 'public.members'::regclass
           AND NOT tgisinternal
           AND tgname = 'trg_guard_privileged_member_columns'`,
      );
      expect(rows.length).toBe(1);
    });
  });

  it("regular member cannot raise own verification_level (column guard)", async () => {
    await withPg(async (client) => {
      const member = await findRegularMember(client);
      expect(member).toBeTruthy();
      await asUser(client, member!.userId, async () => {
        const before = await client.query<{ verification_level: number }>(
          `SELECT verification_level FROM members WHERE id = $1`,
          [member!.memberId],
        );
        const level = before.rows[0].verification_level;
        let errMsg = "";
        try {
          await client.query(
            `UPDATE members SET verification_level = $1 WHERE id = $2`,
            [Math.min(level + 1, 5), member!.memberId],
          );
        } catch (err) {
          errMsg = String(err);
        }
        expect(errMsg).toMatch(/verification_level|check_violation|23514/i);
      });
    });
  });

  it("Chapter Admin role holder exists or Global Admin covers chapter scope", async () => {
    await withPg(async (client) => {
      const ca = await findUserWithRole(client, "Chapter Admin");
      const ga = await findUserWithRole(client, "Global Admin");
      expect(ca || ga).toBeTruthy();
      if (ca) {
        await asUser(client, ca.userId, async () => {
          const { rows } = await client.query<{ ok: boolean }>(
            `SELECT has_role($1::uuid, 'Chapter Admin') AS ok`,
            [ca.userId],
          );
          expect(rows[0].ok).toBe(true);
        });
      }
    });
  });

  it("Finance Admin role row exists in catalog (assignment may be zero in dump)", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query(
        `SELECT id FROM roles WHERE name = 'Finance Admin'`,
      );
      expect(rows.length).toBe(1);
    });
  });
});
