import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * A mentor must appear at most once in the marketplace.
 *
 * Root cause (2026-09-15): the mentorships table had no uniqueness rule, and
 * the page's merge-if-exists logic raced / missed, producing two identical
 * "available" rows for the same mentor. One mentor = one mentorship record.
 */

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

describe("mentorship single-record invariant (live DB)", () => {
  it("no mentor has more than one open (available/pending) mentorship", async () => {
    const client = createClient(url, anonKey);
    const { data, error } = await client
      .from("mentorships")
      .select("id, mentor_member_id, status")
      .in("status", ["available", "pending"]);
    expect(error).toBeNull();
    const open = data ?? [];
    const perMentor = new Map<string, number>();
    for (const row of open) {
      perMentor.set(row.mentor_member_id, (perMentor.get(row.mentor_member_id) ?? 0) + 1);
    }
    const dupes = [...perMentor.entries()].filter(([, n]) => n > 1);
    expect(dupes).toEqual([]);
  });
});
