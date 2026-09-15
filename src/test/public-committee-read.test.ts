import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * The public chapter page (/chapters/:slug, Committee tab) must render for
 * signed-out visitors. It reads role_assignments joined to roles and members,
 * so all three must be readable by the anon role.
 *
 * Regression context (2026-09-15): a Chapter Admin was invisible on his own
 * chapter's public committee list because roles/role_assignments had SELECT
 * policies scoped TO authenticated only.
 */

const url = (process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL) as string;
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

describe("public committee visibility (live DB)", () => {
  it("signed-out visitors can read a chapter's committee", async () => {
    const supabase = createClient(url, anonKey);

    const { data: chapter } = await supabase
      .from("chapters")
      .select("id")
      .eq("slug", "ahmedabad")
      .maybeSingle();
    expect(chapter?.id).toBeDefined();

    const { data, error } = await supabase
      .from("role_assignments")
      .select(
        "id, start_date, end_date, roles!inner(name, scope, chapter_id), members(id, first_name, last_name, photo_url, global_id)"
      )
      .eq("roles.chapter_id", chapter!.id)
      .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0]);

    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("signed-out visitors can read the roles taxonomy", async () => {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase
      .from("roles")
      .select("id, name, scope, chapter_id")
      .eq("scope", "chapter")
      .limit(5);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
