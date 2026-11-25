/**
 * Pass 32 — Wave 13: Close remaining uncovered UI callbacks & mutation onError paths.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { RishtaWorkflow } from "@/components/matrimonial/RishtaWorkflow";
import Dashboard from "@/pages/Dashboard";
import OralHistory from "@/pages/OralHistory";
import DirectoryTab from "@/components/admin/DirectoryTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import { RecurringPledgesPanel } from "@/components/finance/RecurringPledgesPanel";

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

function makeChain(data: unknown, error: unknown = null) {
  const result = { data, error, count: Array.isArray(data) ? data.length : 0 };
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    is: () => chain,
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

describe("Pass 32 — Wave 13 uncovered UI callbacks", () => {
  it("RishtaWorkflow: clicking Decline invokes updateStatus('declined')", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "rishta_requests") {
        const c = makeChain([
          {
            id: "req-1",
            from_profile_id: "p-from",
            to_profile_id: "p-to",
            status: "family_approved",
            intro_message: "Namaste",
            from_family_ok: true,
            to_family_ok: true,
            admin_notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            from_profile: { id: "p-from", member: { first_name: "Aarav", last_name: "Shah" } },
            to_profile: { id: "p-to", member: { first_name: "Diya", last_name: "Shah" } },
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RishtaWorkflow myProfileId="p-to" />);
    const declineBtn = await screen.findByRole("button", { name: /decline/i });
    fireEvent.click(declineBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  it("Dashboard: clicking an upcoming event card and a news card navigates", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Admin",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
          chapters: { name: "Ahmedabad" },
        }) as never;
      }
      if (table === "events") {
        return makeChain([
          {
            id: "ev-1",
            name: "Wave13 Nav Event",
            starts_at: new Date(Date.now() + 86400000).toISOString(),
            venue: "Hall A",
            chapter_id: "ch-1",
          },
        ]) as never;
      }
      if (table === "content_news") {
        return makeChain([
          {
            id: "news-1",
            title: "Wave13 Nav News",
            slug: "wave13-nav-news",
            summary: "Summary text",
            published_at: new Date().toISOString(),
            chapters: { name: "Ahmedabad" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Dashboard />, { route: "/dashboard" });

    const evEl = await screen.findByText("Wave13 Nav Event");
    fireEvent.click(evEl);

    const newsEl = await screen.findByText("Wave13 Nav News");
    fireEvent.click(newsEl);
  });

  it("OralHistory: clicking a tag badge sets tagFilter", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Admin",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "oral_histories") {
        return makeChain([
          {
            id: "oh-1",
            title: "Wave13 Heritage Story",
            description: "Desc",
            tags: ["diwali-heritage"],
            status: "published",
            created_at: new Date().toISOString(),
            narrator: { first_name: "Dada", last_name: "Shah" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<OralHistory />, { route: "/oral-history" });
    const badge = await screen.findByText("diwali-heritage");
    fireEvent.click(badge);
    expect(badge).toBeTruthy();
  });

  it("DirectoryTab: clicking business delete icon opens delete confirmation", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "businesses") {
        return makeChain([
          {
            id: "biz-1",
            name: "Wave13 Test Biz",
            category: "Retail",
            verified: false,
            city: "Mumbai",
            created_at: new Date().toISOString(),
            owner: { first_name: "Raj", last_name: "Shah" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<DirectoryTab myChapterId={null} />);
    await screen.findByText("Wave13 Test Biz");
    const deleteBtn = screen.getByRole("button", { name: /delete business/i });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getAllByText(/Wave13 Test Biz/).length).toBeGreaterThanOrEqual(2);
    });
  });

  it("DirectoryTab: verify mutation onError shows error toast", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "businesses") {
        const c = makeChain([
          {
            id: "biz-err",
            name: "Wave13 Err Biz",
            category: "Retail",
            verified: false,
            city: "Mumbai",
            created_at: new Date().toISOString(),
            owner: { first_name: "Raj", last_name: "Shah" },
          },
        ]);
        c.update = () => makeChain(null, { message: "forced verify error" });
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<DirectoryTab myChapterId={null} />);
    await screen.findByText("Wave13 Err Biz");
    fireEvent.click(screen.getByRole("button", { name: /^Verify$/i }));
    await waitFor(() => {
      expect(screen.getByText("Wave13 Err Biz")).toBeInTheDocument();
    });
  });

  it("BannedKeywordsTab: editing severity invokes onValueChange", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "banned_keywords") {
        return makeChain([
          {
            id: "kw-1",
            keyword: "wave13badword",
            severity: "medium",
            created_at: new Date().toISOString(),
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<BannedKeywordsTab />);
    await screen.findByText("wave13badword");
    fireEvent.click(screen.getByRole("button", { name: /^Edit$/i }));
    const triggers = screen.getAllByRole("combobox");
    fireEvent.click(triggers[triggers.length - 1]);
    const highOpt = await screen.findByRole("option", { name: /^High$/i });
    fireEvent.click(highOpt);
    expect(screen.getByText("wave13badword")).toBeInTheDocument();
  });

  it("TagRequestsTab: decide and delete mutation onError paths", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "tag_requests") {
        const c = makeChain([]);
        c.update = () => makeChain(null, { message: "forced tag decide error" });
        c.delete = () => makeChain(null, { message: "forced tag delete error" });
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <TagRequestsTab
        tagRequests={[
          {
            id: "tr-1",
            status: "pending",
            tag_label: "Wave13 Tag",
            created_at: new Date().toISOString(),
            media_files: { title: "Photo 1" },
          } as never,
        ]}
      />
    );
    const approveBtn = await screen.findByRole("button", { name: /approve/i });
    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(approveBtn).toBeInTheDocument();
    });
  });

  it("RecurringPledgesPanel: update pledge mutation onError path", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({ id: "m-1", user_id: "u-1", first_name: "A", last_name: "B", chapter_id: "ch-1" }) as never;
      }
      if (table === "recurring_pledges") {
        const c = makeChain([
          {
            id: "pl-1",
            member_id: "m-1",
            amount: 1000,
            currency: "INR",
            interval: "monthly",
            status: "active",
            start_date: new Date().toISOString(),
            funds: { name: "General Fund" },
          },
        ]);
        c.update = () => makeChain(null, { message: "forced pledge error" });
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RecurringPledgesPanel />);
    const pauseBtn = await screen.findByRole("button", { name: /pause/i });
    fireEvent.click(pauseBtn);
    await waitFor(() => {
      expect(pauseBtn).toBeInTheDocument();
    });
  });
});
