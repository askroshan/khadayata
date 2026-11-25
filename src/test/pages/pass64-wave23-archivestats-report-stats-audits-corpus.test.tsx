/**
 * Pass 64 — Wave 23: Branch coverage burn-down for archive-stats, ReportDialog,
 * AdminStats, AuditsTab, and TrustCorpusPanel.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { fetchArchiveStats } from "@/lib/archive-stats";
import { ReportDialog } from "@/components/ReportDialog";
import AdminStats from "@/components/admin/AdminStats";
import AuditsTab from "@/components/admin/AuditsTab";
import { TrustCorpusPanel } from "@/components/finance/TrustCorpusPanel";

beforeAll(async () => {
  await supabase.auth.signInWithPassword({
    email: E2E_ACCOUNTS.globalAdmin.email,
    password: E2E_PASSWORD,
  });
});

afterAll(async () => {
  await supabase.auth.signOut();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeChain(data: unknown, error: unknown = null, count: number | null = Array.isArray(data) ? data.length : 0) {
  const result = { data, error, count };
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    is: () => chain,
    ilike: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

describe("Pass 64 — Wave 23 branch coverage", () => {
  it("fetchArchiveStats: throws on issuesRes.error, booksRes.error, and handles null data/count", async () => {
    const mockIssuesError = {
      from: (table: string) =>
        table === "magazine_issues"
          ? makeChain(null, new Error("issues boom"), null)
          : makeChain(null, null, 10),
    };
    await expect(fetchArchiveStats(mockIssuesError as never)).rejects.toThrow("issues boom");

    const mockBooksError = {
      from: (table: string) =>
        table === "magazine_issues"
          ? makeChain([], null, 0)
          : makeChain(null, new Error("books boom"), null),
    };
    await expect(fetchArchiveStats(mockBooksError as never)).rejects.toThrow("books boom");

    const mockNulls = {
      from: () => makeChain(null, null, null),
    };
    const stats = await fetchArchiveStats(mockNulls as never);
    expect(stats).toEqual({ magazineIssues: 0, digitizedPages: 0 });
  });

  it("ReportDialog: submits report with empty reason (null) and with non-empty reason", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Admin",
          verification_level: 3,
          onboarding_completed: true,
        }) as never;
      }
      if (table === "role_assignments") {
        return makeChain([{ id: "ra-1", role_id: "r-1", chapter_id: null, roles: { name: "Global Admin", scope: "global" }, start_date: null, end_date: null }]) as never;
      }
      if (table === "reports") {
        const c = makeChain(null);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    // 1. Submit with empty reason -> reason: null
    renderApp(<ReportDialog entityType="member" entityId="ent-1" entityName="John Doe" variant="button" />);
    const trigger = await screen.findByRole("button", { name: /report/i });
    fireEvent.click(trigger);

    const selectTrigger = await screen.findByRole("combobox");
    fireEvent.click(selectTrigger);
    const option = await screen.findByText("Fake / Fraudulent");
    fireEvent.click(option);

    const submitBtn = screen.getByRole("button", { name: /submit report/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: "fake", reason: null })
      );
    });

    // 2. Submit with non-empty reason -> trimmed string
    fireEvent.click(trigger);
    const selectTrigger2 = await screen.findByRole("combobox");
    fireEvent.click(selectTrigger2);
    const option2 = await screen.findByText("Harassment");
    fireEvent.click(option2);

    const textarea = screen.getByPlaceholderText(/additional context/i);
    fireEvent.change(textarea, { target: { value: "  Detailed report reason  " } });

    const submitBtn2 = screen.getByRole("button", { name: /submit report/i });
    fireEvent.click(submitBtn2);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: "harassment", reason: "Detailed report reason" })
      );
    });
  });

  it("AdminStats: handles null count fallbacks for events, chapters, and pending verifications", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null, null, null) as never);

    renderApp(
      <AdminStats
        members={[
          { verification_level: 0, onboarding_completed: true, created_at: new Date().toISOString() },
          { verification_level: 1, onboarding_completed: true },
          { verification_level: 2, onboarding_completed: true },
        ]}
        isChapterScoped={false}
        myChapterId={null}
      />
    );

    expect(await screen.findByText("Active Chapters")).toBeInTheDocument();
    expect(screen.getByText("Active Events")).toBeInTheDocument();
    expect(screen.getByText("Pending Verification")).toBeInTheDocument();
  });

  it("AuditsTab: renders null entity_id, object old/new values, and unknown entity_type badge fallback", () => {
    renderApp(
      <AuditsTab
        audits={[
          {
            id: "audit-1",
            actor_user_id: null,
            entity_type: "custom_entity",
            entity_id: null,
            field: "metadata",
            old_value: { level: 0 },
            new_value: { level: 1 },
            reason: "Manual update",
            created_at: new Date().toISOString(),
          },
        ]}
      />
    );

    expect(screen.getByText("custom entity")).toBeInTheDocument();
    expect(screen.getByText('{"level":0}')).toBeInTheDocument();
    expect(screen.getByText('{"level":1}')).toBeInTheDocument();
    expect(screen.getByText("Entity: —")).toBeInTheDocument();
  });

  it("TrustCorpusPanel: handles null funds data and null donations data", async () => {
    // 1. funds returns null -> data ?? []
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null, null, null) as never);

    renderApp(<TrustCorpusPanel myChapterId="ch-1" />);
    expect(await screen.findByText(/No Trust Corpus funds configured/i)).toBeInTheDocument();

    cleanup();
    vi.restoreAllMocks();

    // 2. funds returns 1 fund, donations returns null -> data ?? []
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "funds") {
        return makeChain([
          {
            id: "fund-corpus-1",
            name: "Community Corpus Fund",
            scope: "global",
            currency: "INR",
            goal_amount: 500000,
          },
        ]) as never;
      }
      if (table === "donations") {
        return makeChain(null, null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<TrustCorpusPanel myChapterId={null} />);
    expect(await screen.findByText("Community Corpus Fund")).toBeInTheDocument();
    expect(screen.getByText(/0 contributions/i)).toBeInTheDocument();
  });
});
