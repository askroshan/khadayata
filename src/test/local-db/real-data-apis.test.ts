import { describe, it, expect } from "vitest";
import { withPg } from "@/test/helpers/local-pg";

/**
 * Schema/API surface checks on real local data — tables the app queries heavily.
 */
describe("local real-data API surfaces", () => {
  it("published events, news, and obituaries exist or are empty tables (queryable)", async () => {
    await withPg(async (client) => {
      for (const sql of [
        `SELECT count(*)::int AS c FROM events`,
        `SELECT count(*)::int AS c FROM content_news`,
        `SELECT count(*)::int AS c FROM obituaries`,
        `SELECT count(*)::int AS c FROM businesses`,
        `SELECT count(*)::int AS c FROM scholarships`,
        `SELECT count(*)::int AS c FROM magazine_issues`,
      ]) {
        const { rows } = await client.query<{ c: number }>(sql);
        expect(rows[0].c).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it("member contacts and chapters have consistent FKs", async () => {
    await withPg(async (client) => {
      const orphanContacts = await client.query<{ c: string }>(
        `SELECT count(*)::text AS c FROM member_contacts mc
         LEFT JOIN members m ON m.id = mc.member_id
         WHERE m.id IS NULL`,
      );
      expect(Number(orphanContacts.rows[0].c)).toBe(0);

      const orphanMembers = await client.query<{ c: string }>(
        `SELECT count(*)::text AS c FROM members m
         LEFT JOIN chapters c ON c.id = m.chapter_id
         WHERE m.chapter_id IS NOT NULL AND c.id IS NULL`,
      );
      expect(Number(orphanMembers.rows[0].c)).toBe(0);
    });
  });

  it("global_id format when present matches KHD- prefix", async () => {
    await withPg(async (client) => {
      const { rows } = await client.query<{ bad: string }>(
        `SELECT count(*)::text AS bad FROM members
         WHERE global_id IS NOT NULL AND global_id !~ '^KHD-'`,
      );
      expect(Number(rows[0].bad)).toBe(0);
    });
  });
});
