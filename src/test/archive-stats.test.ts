import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { computeArchiveStats, fetchArchiveStats } from "@/lib/archive-stats";

/**
 * Heritage Archives stats must come from real data, not hardcoded strings.
 *
 * Acceptance (user request, 2026-09-15):
 *  - "Magazine Issues" and "Digitized Pages" tiles are computed from the
 *    magazine_issues / book_pages tables.
 *  - The catalog holds 50+ magazine issues and 2,000+ digitized pages.
 */

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

describe("computeArchiveStats (pure)", () => {
  it("counts issues and sums page counts plus book pages", () => {
    const stats = computeArchiveStats(
      [
        { metadata: { page_count: 40 } },
        { metadata: { page_count: 32 } },
        { metadata: null },
        { metadata: { page_count: "bad" } },
        { metadata: { page_count: -5 } },
      ],
      6
    );
    expect(stats.magazineIssues).toBe(5);
    expect(stats.digitizedPages).toBe(78);
  });

  it("handles an empty archive", () => {
    expect(computeArchiveStats([], 0)).toEqual({ magazineIssues: 0, digitizedPages: 0 });
  });
});

describe("Heritage Archives live-data acceptance (anon client)", () => {
  it("catalog holds 50+ magazine issues and 2,000+ digitized pages", async () => {
    const client = createClient(url, anonKey);
    const stats = await fetchArchiveStats(client);
    expect(stats.magazineIssues).toBeGreaterThanOrEqual(50);
    expect(stats.digitizedPages).toBeGreaterThanOrEqual(2000);
  });

  it("anon visitors can read the archive catalog (public stats)", async () => {
    const client = createClient(url, anonKey);
    const { error } = await client.from("magazine_issues").select("id").limit(1);
    expect(error).toBeNull();
  });
});
