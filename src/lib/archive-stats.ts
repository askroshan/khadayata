import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ArchiveStats {
  magazineIssues: number;
  digitizedPages: number;
}

function pageCountOf(row: { metadata?: unknown }): number {
  const md = row.metadata;
  if (md && typeof md === "object" && !Array.isArray(md)) {
    const pc = (md as Record<string, unknown>).page_count;
    if (typeof pc === "number" && Number.isFinite(pc) && pc > 0) {
      return Math.floor(pc);
    }
  }
  return 0;
}

export function computeArchiveStats(
  issueRows: { metadata?: unknown }[],
  bookPageCount: number
): ArchiveStats {
  const magazinePages = issueRows.reduce((sum, row) => sum + pageCountOf(row), 0);
  return {
    magazineIssues: issueRows.length,
    digitizedPages: magazinePages + bookPageCount,
  };
}

export async function fetchArchiveStats(
  client: SupabaseClient = supabase
): Promise<ArchiveStats> {
  const [issuesRes, booksRes] = await Promise.all([
    client.from("magazine_issues").select("metadata"),
    client
      .from("book_pages")
      .select("id", { count: "exact", head: true }),
  ]);
  if (issuesRes.error) throw issuesRes.error;
  if (booksRes.error) throw booksRes.error;
  return computeArchiveStats(issuesRes.data ?? [], booksRes.count ?? 0);
}
