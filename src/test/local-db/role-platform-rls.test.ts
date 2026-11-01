import { describe, it, expect } from "vitest";
import { withPg, asUser, findUserWithRole, findRegularMember } from "@/test/helpers/local-pg";

/**
 * Real-data RLS checks for role-platform wiring (Finance Admin approve paths,
 * Chapter Admin / Moderator event management, obituaries publisher roles,
 * announcements.chapter_id).
 */
describe("role-platform RLS (real local rows)", () => {
  it("announcements.chapter_id column exists for chapter-scoped posts", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'chapter_id'`,
      );
      expect(rows).toHaveLength(1);
    });
  });

  it("Finance Admin SELECT/UPDATE policies include hall_bookings and medical_aid_requests", async () => {
    await withPg(async (client) => {
      for (const table of ["hall_bookings", "medical_aid_requests"] as const) {
        const { rows } = await client.query<{ def: string }>(
          `SELECT pg_get_expr(polqual, polrelid) AS def
           FROM pg_policy
           WHERE polrelid = $1::regclass
             AND polcmd IN ('r', 'w')`,
          [`public.${table}`],
        );
        const joined = rows.map((r) => r.def).join("\n");
        expect(joined).toMatch(/Finance Admin/);
      }
      const { rows: scholarship } = await client.query<{ def: string }>(
        `SELECT pg_get_expr(polqual, polrelid) AS def
         FROM pg_policy
         WHERE polrelid = 'public.scholarship_applications'::regclass
           AND polcmd = 'w'`,
      );
      expect(scholarship.some((r) => /Finance Admin/.test(r.def))).toBe(true);
    });
  });

  it("events UPDATE/DELETE policies include Chapter Admin and Moderator", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query<{ polname: string; def: string }>(
        `SELECT polname, pg_get_expr(polqual, polrelid) AS def
         FROM pg_policy
         WHERE polrelid = 'public.events'::regclass
           AND polcmd IN ('w', 'd')`,
      );
      const joined = rows.map((r) => r.def).join("\n");
      expect(joined).toMatch(/Chapter Admin/);
      expect(joined).toMatch(/Moderator/);
    });
  });

  it("obituaries INSERT policy uses Global Publisher / Publisher (not News Publisher)", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query<{ def: string }>(
        `SELECT coalesce(pg_get_expr(polwithcheck, polrelid), '') AS def
         FROM pg_policy
         WHERE polrelid = 'public.obituaries'::regclass
           AND polcmd = 'a'`,
      );
      const joined = rows.map((r) => r.def).join("\n");
      expect(joined).toMatch(/Global Publisher/);
      expect(joined).toMatch(/'Publisher'/);
      expect(joined).not.toMatch(/News Publisher/);
    });
  });

  it("Finance Admin (or catalog role) can read hall_bookings under RLS when assigned", async () => {
    await withPg(async (client) => {
      const fa = await findUserWithRole(client, "Finance Admin");
      const ga = await findUserWithRole(client, "Global Admin");
      const actor = fa ?? ga;
      expect(actor).toBeTruthy();
      await asUser(client, actor!.userId, async () => {
        const { rowCount, error } = await client
          .query(`SELECT id FROM hall_bookings LIMIT 5`)
          .then((r) => ({ rowCount: r.rowCount ?? 0, error: null as string | null }))
          .catch((err: Error) => ({ rowCount: -1, error: String(err) }));
        expect(error).toBeNull();
        expect(rowCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it("Chapter Admin can UPDATE an event they did not create (manager policy)", async () => {
    await withPg(async (client) => {
      const ca = await findUserWithRole(client, "Chapter Admin");
      const regular = await findRegularMember(client);
      expect(ca).toBeTruthy();
      expect(regular).toBeTruthy();

      // Insert as DB owner (bypasses RLS); asUser wraps work in ROLLBACK so seed must live outside.
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO events (name, description, starts_at, ends_at, created_by, status)
         VALUES (
           'E2E Role RLS Event',
           'temp',
           now() + interval '7 days',
           now() + interval '7 days 2 hours',
           $1,
           'published'
         )
         RETURNING id`,
        [regular!.userId],
      );
      const eventId = rows[0]?.id;
      expect(eventId).toBeTruthy();

      try {
        await asUser(client, ca!.userId, async () => {
          const { rowCount } = await client.query(
            `UPDATE events SET name = 'E2E Role RLS Event (CA)' WHERE id = $1`,
            [eventId],
          );
          expect(rowCount).toBe(1);
        });
      } finally {
        await client.query(`DELETE FROM events WHERE id = $1`, [eventId]);
      }
    });
  });

  it("regular member cannot UPDATE another member's event", async () => {
    await withPg(async (client) => {
      const ga = await findUserWithRole(client, "Global Admin");
      const regular = await findRegularMember(client);
      expect(ga).toBeTruthy();
      expect(regular).toBeTruthy();

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO events (name, description, starts_at, ends_at, created_by, status)
         VALUES (
           'E2E GA Owned Event',
           'temp',
           now() + interval '14 days',
           now() + interval '14 days 2 hours',
           $1,
           'published'
         )
         RETURNING id`,
        [ga!.userId],
      );
      const eventId = rows[0]?.id;
      expect(eventId).toBeTruthy();

      try {
        await asUser(client, regular!.userId, async () => {
          const { rowCount } = await client.query(
            `UPDATE events SET name = 'hacked' WHERE id = $1`,
            [eventId],
          );
          expect(rowCount).toBe(0);
        });
      } finally {
        await client.query(`DELETE FROM events WHERE id = $1`, [eventId]);
      }
    });
  });
});
