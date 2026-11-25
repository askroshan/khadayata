/**
 * Pass 36 — Wave 14: Branch coverage burn-down for AnalyticsTab & ChaptersTab.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import AnalyticsTab, { DrillDownDialog } from "@/components/admin/AnalyticsTab";
import ChaptersTab from "@/components/admin/ChaptersTab";

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

function makeChain(data: unknown, error: unknown = null, count?: number | null) {
  const result = {
    data,
    error,
    count: count !== undefined ? count : Array.isArray(data) ? data.length : 0,
  };
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

describe("Pass 36 — Wave 14: AnalyticsTab branch coverage", () => {
  it("handles null data and null counts across all global analytics queries", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null, null, null) as never);

    renderApp(<AnalyticsTab />);
    expect(await screen.findByText("Analytics & Reporting")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Platform-wide utilisation metrics")).toBeInTheDocument();
      expect(screen.getByText("Governance & Moderation")).toBeInTheDocument();
      expect(screen.getByText("Chapter Transfers")).toBeInTheDocument();
    });
  });

  it("handles null verification_level, active events, and zero/NaN donation amounts", async () => {
    const nowIso = new Date().toISOString();
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([
          { id: "m1", verification_level: null, created_at: nowIso, onboarding_completed: false, chapter_id: "ch-1" },
          { id: "m2", verification_level: 1, created_at: nowIso, onboarding_completed: true, chapter_id: "ch-1" },
          { id: "m3", verification_level: 3, created_at: nowIso, onboarding_completed: true, chapter_id: "ch-1" },
        ]) as never;
      }
      if (table === "events") {
        return makeChain([
          { id: "e1", status: "active", created_at: nowIso, chapter_id: "ch-1" },
          { id: "e2", status: "published", created_at: nowIso, chapter_id: "ch-1" },
          { id: "e3", status: "cancelled", created_at: nowIso, chapter_id: "ch-1" },
        ]) as never;
      }
      if (table === "donations") {
        return makeChain([
          { amount: null, currency: "INR", created_at: nowIso },
          { amount: 0, currency: "INR", created_at: "2020-01-01T00:00:00Z" },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<AnalyticsTab />);
    await waitFor(() => {
      expect(screen.getAllByText("₹0").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("DrillDownDialog handles null data for every drillKey category", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null) as never);

    const keys = [
      "members-all",
      "events-all",
      "rsvps",
      "businesses-all",
      "jobs-all",
      "matrimonial-all",
      "donations-all",
      "reports-all",
      "chapters-all",
      "transfers-all",
      "news-all",
    ] as const;

    for (const key of keys) {
      const { unmount } = renderApp(
        <DrillDownDialog drillKey={key} myChapterId="ch-1" onClose={() => {}} />
      );
      expect(await screen.findByText("No records found.")).toBeInTheDocument();
      unmount();
    }
  });

  it("DrillDownDialog renders null/optional fallbacks across all record types", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([
          { id: "m1", first_name: "A", last_name: "B", verification_level: 0, created_at: null, chapters: null },
        ]) as never;
      }
      if (table === "events") {
        return makeChain([
          { id: "e1", name: "NoDateEv", status: "draft", starts_at: null, chapter_id: "ch-1", chapters: null },
        ]) as never;
      }
      if (table === "event_rsvps") {
        return makeChain([
          { id: "r1", member_id: "m1", event_id: "e1", status: "going", created_at: new Date().toISOString(), members: null, events: null },
        ]) as never;
      }
      if (table === "businesses") {
        return makeChain([
          { id: "b1", name: "UnverBiz", verified: false, chapter_id: "ch-1", chapters: null },
          { id: "b2", name: "VerBiz", verified: true, chapter_id: "ch-1", chapters: { name: "Surat" } },
        ]) as never;
      }
      if (table === "jobs") {
        return makeChain([
          { id: "j1", title: "RemoteJob", status: "open", location: null, chapter_id: "ch-1", chapters: null },
        ]) as never;
      }
      if (table === "matrimonial_profiles") {
        return makeChain([
          { id: "mp1", visibility: "public", verified: false, suspended: false, created_at: new Date().toISOString(), members: null },
        ]) as never;
      }
      if (table === "donations") {
        return makeChain([
          { id: "d1", amount: 500, currency: "INR", status: "completed", created_at: new Date().toISOString(), members: null },
        ]) as never;
      }
      if (table === "reports") {
        return makeChain([
          { id: "rep1", reason: null, status: "pending", created_at: new Date().toISOString(), category: "spam" },
        ]) as never;
      }
      if (table === "chapter_transfer_history") {
        return makeChain([
          { id: "t1", transfer_type: "admin_move", effective_at: null, from_chapter_name: null, to_chapter_name: null, member: null },
        ]) as never;
      }
      if (table === "content_news") {
        return makeChain([
          { id: "n1", title: "GlobalNews", status: "draft", published_at: null, chapter_id: "ch-1", chapters: null },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    const cases: Array<{ key: Parameters<typeof DrillDownDialog>[0]["drillKey"]; expected: RegExp; chapterId?: string | null }> = [
      { key: "members-all", expected: /No chapter.*Joined —/, chapterId: "ch-1" },
      { key: "events-all", expected: /draft · — · —/, chapterId: "ch-1" },
      { key: "rsvps", expected: /— · going/, chapterId: null },
      { key: "businesses-all", expected: /Unverified · —/, chapterId: "ch-1" },
      { key: "jobs-all", expected: /— · open · —/, chapterId: "ch-1" },
      { key: "matrimonial-all", expected: /Unverified/, chapterId: null },
      { key: "donations-all", expected: /Anonymous — INR 500/, chapterId: null },
      { key: "reports-all", expected: /No reason provided/, chapterId: null },
      { key: "transfers-all", expected: /Unknown Member/, chapterId: null },
      { key: "news-all", expected: /draft · Global · —/, chapterId: "ch-1" },
    ];

    for (const c of cases) {
      const { unmount } = renderApp(
        <DrillDownDialog drillKey={c.key} myChapterId={c.chapterId ?? null} onClose={() => {}} />
      );
      expect(await screen.findByText(c.expected)).toBeInTheDocument();
      unmount();
    }
  });
});

describe("Pass 36 — Wave 14: ChaptersTab branch coverage", () => {
  it("handles chapters query error and null chaptersData gracefully", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        return makeChain(null, { message: "chapters fetch failed" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ChaptersTab />);
    expect(await screen.findByText("Chapter Management")).toBeInTheDocument();
  });

  it("handles null chaptersData (no error) showing empty state", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") return makeChain(null, null) as never;
      return makeChain([]) as never;
    });

    renderApp(<ChaptersTab />);
    expect(await screen.findByText("No chapters found")).toBeInTheDocument();
  });

  it("handles null settings, null member count, null adminData, and null member in role_assignments", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        const c = makeChain([
          {
            id: "ch-null",
            name: "NullSettings Chapter",
            slug: null,
            subdomain: null,
            created_at: new Date().toISOString(),
            settings: null,
          },
          {
            id: "ch-admin-null",
            name: "NullAdmin Chapter",
            slug: "null-admin",
            subdomain: "null-admin",
            created_at: new Date().toISOString(),
            settings: { is_active: true },
          },
        ]);
        c.update = updateSpy;
        c.insert = vi.fn().mockImplementation(() => makeChain(null));
        return c as never;
      }
      if (table === "members") {
        return makeChain(null, null, null) as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-1",
            member_id: "m-1",
            start_date: new Date().toISOString(),
            members: null,
            roles: { name: "Chapter Admin" },
          },
        ]) as never;
      }
      return makeChain(null, null) as never;
    });

    renderApp(<ChaptersTab />);
    expect(await screen.findByText("NullSettings Chapter")).toBeInTheDocument();

    // 1. Toggle active on chapter with settings: null
    const deactivateBtns = screen.getAllByRole("button", { name: /deactivate chapter/i });
    fireEvent.click(deactivateBtns[0]);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());

    // 2. Open Edit dialog on chapter with settings: null, slug: null, subdomain: null and submit empty city/country
    const editBtns = screen.getAllByRole("button", { name: /edit chapter/i });
    fireEvent.click(editBtns[0]);
    const saveChangesBtn = await screen.findByRole("button", { name: /save changes/i });
    fireEvent.click(saveChangesBtn);
    await waitFor(() => expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument());

    // 3. Open Settings dialog on chapter with settings: null and submit empty fields
    const settingsBtns = screen.getAllByRole("button", { name: /chapter settings/i });
    fireEvent.click(settingsBtns[0]);
    const saveSettingsBtn = await screen.findByRole("button", { name: /save settings/i });
    fireEvent.click(saveSettingsBtn);
    await waitFor(() => expect(screen.queryByRole("button", { name: /save settings/i })).not.toBeInTheDocument());

    // 4. Open Create Chapter dialog and submit with only name (empty city/country)
    fireEvent.click(screen.getByRole("button", { name: /new chapter/i }));
    const nameInput = await screen.findByPlaceholderText(/bengaluru chapter/i);
    fireEvent.change(nameInput, { target: { value: "Minimal Chapter" } });
    fireEvent.click(screen.getByRole("button", { name: /^create chapter$/i }));
    await waitFor(() => expect(screen.queryByPlaceholderText(/bengaluru chapter/i)).not.toBeInTheDocument());
  });

  it("handles null adminData, null allMembers, and assignChapterAdmin RPC error + email fallback", async () => {
    let assignRpcCalls = 0;
    const rpcSpy = vi.spyOn(supabase, "rpc").mockImplementation((fnName: string) => {
      if (fnName === "assign_role") {
        assignRpcCalls++;
        if (assignRpcCalls === 1) {
          return Promise.resolve({ data: null, error: { message: "rpc assign failed" } }) as never;
        }
        return Promise.resolve({ data: null, error: null }) as never;
      }
      return Promise.resolve({ data: [], error: null }) as never;
    });
    const invokeSpy = vi.spyOn(supabase.functions, "invoke").mockResolvedValue({ data: null, error: null } as never);

    let membersCallCount = 0;
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        return makeChain([
          {
            id: "ch-1",
            name: "NoAdmin Chapter",
            slug: "noadmin",
            subdomain: "noadmin",
            created_at: new Date().toISOString(),
            settings: null,
          },
        ]) as never;
      }
      if (table === "role_assignments") {
        return makeChain(null, null) as never;
      }
      if (table === "roles") {
        return makeChain({ id: "role-ca-1" }) as never;
      }
      if (table === "members") {
        membersCallCount++;
        // First call is count query, second call is allMembers
        if (membersCallCount === 1) return makeChain(null, null, null) as never;
        return makeChain([
          { id: "m-10", first_name: "Kiran", last_name: "Patel", chapter_id: "ch-1", chapters: null },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ChaptersTab />);
    expect(await screen.findByText("NoAdmin Chapter")).toBeInTheDocument();

    // Open Assign Chapter Admin dialog
    fireEvent.click(screen.getByRole("button", { name: /assign chapter admin/i }));
    const trigger = await screen.findByRole("combobox");
    fireEvent.click(trigger);
    const opt = await screen.findByRole("option", { name: /kiran patel/i });
    fireEvent.click(opt);

    const emailInput = screen.getByPlaceholderText("admin@example.com");
    fireEvent.change(emailInput, { target: { value: "kiran@example.com" } });

    // First click triggers RPC error branch
    const submitBtn = screen.getByRole("button", { name: /assign & send invite/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(assignRpcCalls).toBe(1);
      expect(submitBtn).not.toBeDisabled();
    });

    // Second click succeeds and sends email with null chapter settings fallbacks
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(assignRpcCalls).toBe(2);
      expect(screen.queryByPlaceholderText("admin@example.com")).not.toBeInTheDocument();
    });
    expect(rpcSpy).toHaveBeenCalledWith("assign_role", expect.anything());
    void invokeSpy;
  });

  it("CommitteeManagementDialog handles null data and assignCommitteeRole RPC error", async () => {
    const rpcSpy = vi
      .spyOn(supabase, "rpc")
      .mockResolvedValue({ data: null, error: { message: "committee assign failed" } } as never);

    // First pass: all null data in CommitteeManagementDialog
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        return makeChain([
          {
            id: "ch-comm",
            name: "Committee Chapter",
            slug: "comm",
            subdomain: "comm",
            created_at: new Date().toISOString(),
            settings: { is_active: true },
          },
        ]) as never;
      }
      return makeChain(null, null) as never;
    });

    const { unmount } = renderApp(<ChaptersTab />);
    expect(await screen.findByText("Committee Chapter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /manage committee/i }));
    expect(await screen.findByText("No committee members assigned yet")).toBeInTheDocument();
    unmount();

    // Second pass: populated member & role, RPC returns error
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        return makeChain([
          {
            id: "ch-comm2",
            name: "Committee Err Chapter",
            slug: "comm2",
            subdomain: "comm2",
            created_at: new Date().toISOString(),
            settings: { is_active: true },
          },
        ]) as never;
      }
      if (table === "roles") {
        return makeChain([{ id: "r-comm-1", name: "Youth Committee" }]) as never;
      }
      if (table === "members") {
        return makeChain([{ id: "m-comm-1", first_name: "Dev", last_name: "Shah" }]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ChaptersTab />);
    expect(await screen.findByText("Committee Err Chapter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /manage committee/i }));
    await screen.findByText("Assign Committee Role");

    const combos = screen.getAllByRole("combobox");
    fireEvent.click(combos[0]);
    fireEvent.click(await screen.findByRole("option", { name: /dev shah/i }));

    fireEvent.click(combos[1]);
    fireEvent.click(await screen.findByRole("option", { name: /youth committee/i }));

    fireEvent.click(screen.getByRole("button", { name: /assign role/i }));
    await waitFor(() => expect(rpcSpy).toHaveBeenCalled());
  });
});
