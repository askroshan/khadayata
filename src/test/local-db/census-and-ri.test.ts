import { describe, it, expect } from "vitest";
import { withPg } from "@/test/helpers/local-pg";

/**
 * Real-data census + referential integrity against khadayata_local:5438.
 * No fixtures — asserts the restored production dump.
 */
describe("local Postgres census (khadayata_local)", () => {
  it("has production-scale members and matching auth.users", async () => {
    await withPg(async (client) => {
      const members = await client.query<{ c: string }>("SELECT count(*)::text AS c FROM members");
      const users = await client.query<{ c: string }>("SELECT count(*)::text AS c FROM auth.users");
      const chapters = await client.query<{ c: string }>("SELECT count(*)::text AS c FROM chapters");
      expect(Number(members.rows[0].c)).toBeGreaterThanOrEqual(390);
      expect(Number(users.rows[0].c)).toBe(Number(members.rows[0].c));
      expect(Number(chapters.rows[0].c)).toBeGreaterThanOrEqual(40);
    });
  });

  it("every member.user_id references auth.users", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query<{ c: string }>(
        `SELECT count(*)::text AS c FROM members m
         LEFT JOIN auth.users u ON u.id = m.user_id
         WHERE m.user_id IS NOT NULL AND u.id IS NULL`,
      );
      expect(Number(rows[0].c)).toBe(0);
    });
  });

  it("role_assignments reference valid members and roles", async () => {
    await withPg(async (client) => {
      const orphans = await client.query<{ c: string }>(
        `SELECT count(*)::text AS c FROM role_assignments ra
         LEFT JOIN members m ON m.id = ra.member_id
         LEFT JOIN roles r ON r.id = ra.role_id
         WHERE m.id IS NULL OR r.id IS NULL`,
      );
      expect(Number(orphans.rows[0].c)).toBe(0);
    });
  });

  it("functional platform roles exist", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query<{ name: string }>(
        `SELECT DISTINCT name FROM roles ORDER BY 1`,
      );
      const names = rows.map((r) => r.name);
      for (const required of [
        "Global Admin",
        "Chapter Admin",
        "Data Steward",
        "Directory Manager",
        "Event Manager",
        "Finance Admin",
        "Global Publisher",
        "Publisher",
        "Moderator",
      ]) {
        expect(names).toContain(required);
      }
    });
  });

  it("critical tables exist with RLS enabled", async () => {
    const critical = [
      "members",
      "chapters",
      "events",
      "content_news",
      "announcements",
      "hall_bookings",
      "medical_aid_requests",
      "scholarship_applications",
      "obituaries",
      "role_assignments",
    ];
    await withPg(async (client) => {
      for (const table of critical) {
        const { rows } = await client.query<{ relrowsecurity: boolean }>(
          `SELECT c.relrowsecurity
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relname = $1`,
          [table],
        );
        expect(rows[0], table).toBeTruthy();
        expect(rows[0].relrowsecurity, table).toBe(true);
      }
    });
  });
});
