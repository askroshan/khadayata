/**
 * Pass 61 — Wave 22: Branch coverage burn-down for BannedKeywordsTab,
 * NewsPublisherTab, and TagRequestsTab.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import NewsPublisherTab from "@/components/admin/NewsPublisherTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";

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

describe("Pass 61 — Wave 22: BannedKeywordsTab branches", () => {
  it("handles query error and null data fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "banned_keywords") {
        return makeChain(null, { message: "Fetch failed" }) as never;
      }
      return makeChain(null) as never;
    });

    renderApp(<BannedKeywordsTab />);
    await waitFor(() => {
      expect(screen.getByText(/no banned keywords yet/i)).toBeInTheDocument();
    });
  });

  it("handles null data without error and adding keyword with null member (added_by: null)", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "banned_keywords") {
        const c = makeChain(null, null);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "members") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<BannedKeywordsTab />);
    await screen.findByText(/no banned keywords yet/i);

    const input = screen.getByPlaceholderText(/enter keyword or phrase/i);
    fireEvent.change(input, { target: { value: "SpamTerm" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "spamterm",
          added_by: null,
        })
      );
    });
  });

  it("renders unknown severity fallback, singular count, and edits severity via Select", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "banned_keywords") {
        const c = makeChain([
          {
            id: "kw-1",
            keyword: "weirdword",
            severity: "unknown_sev",
            created_at: new Date().toISOString(),
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<BannedKeywordsTab />);
    await screen.findByText("weirdword");
    expect(screen.getByText("1 keyword in blocklist")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    // Open the inline editing severity Select (second combobox on the page)
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[1]);
    const highOption = await screen.findByRole("option", { name: "High" });
    await user.click(highOption);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({ severity: "high" });
    });
  });
});

describe("Pass 61 — Wave 22: NewsPublisherTab branches", () => {
  it("handles null data for articles and flagged reports", async () => {
    let newsCall = 0;
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        newsCall++;
        // First query (publisher-articles) returns null; second (myArticles in publisher-flagged) returns one id
        if (newsCall === 1) return makeChain(null, null) as never;
        return makeChain([{ id: "art-1" }], null) as never;
      }
      if (table === "reports") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<NewsPublisherTab myChapterId={null} />);
    await waitFor(() => {
      expect(screen.getByText(/no articles yet/i)).toBeInTheDocument();
    });
  });

  it("renders unknown status fallback and toggles category between value and __none__ in create dialog", async () => {
    const user = userEvent.setup();
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        return makeChain([
          {
            id: "art-custom",
            title: "Custom Status Article",
            status: "custom_unknown",
            created_at: new Date().toISOString(),
            views_count: 0,
            category: null,
            pinned: false,
            chapters: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<NewsPublisherTab myChapterId="ch-1" />);
    await screen.findByText("Custom Status Article");
    expect(screen.getByText("custom_unknown")).toBeInTheDocument();

    // Open Write Article dialog
    fireEvent.click(screen.getByRole("button", { name: /write article/i }));
    await screen.findByText("Write New Article");

    // Select a category, then switch back to "None" (__none__)
    const dialog = screen.getByRole("dialog");
    const categoryTrigger = dialog.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(categoryTrigger);
    await user.click(await screen.findByRole("option", { name: "Community" }));

    await user.click(categoryTrigger);
    await user.click(await screen.findByRole("option", { name: "None" }));

    expect(categoryTrigger).toHaveTextContent("None");
  });
});

describe("Pass 61 — Wave 22: TagRequestsTab branches", () => {
  it("handles undefined tagRequests prop", async () => {
    renderApp(<TagRequestsTab tagRequests={undefined} />);
    expect(await screen.findByText(/no pending tag requests/i)).toBeInTheDocument();
  });

  it("renders approved and rejected tabs and handles deleteTag error path", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.fn().mockImplementation(() =>
      makeChain(null, { message: "Delete failed" })
    );
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "tag_requests") {
        const c = makeChain(null);
        c.delete = deleteSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    const items = [
      { id: "tr-app", term: "ApprovedTag", type: "skill", status: "approved", reason: "Useful" },
      { id: "tr-rej", term: "RejectedTag", type: "interest", status: "rejected", reason: null },
    ];

    renderApp(<TagRequestsTab tagRequests={items} />);

    // Switch to Approved tab
    await user.click(screen.getByRole("tab", { name: /approved/i }));
    expect(await screen.findByText("ApprovedTag")).toBeInTheDocument();

    // Switch to Rejected tab (covers tr.status === "approved" ? "default" : "destructive" false branch)
    await user.click(screen.getByRole("tab", { name: /rejected/i }));
    expect(await screen.findByText("RejectedTag")).toBeInTheDocument();

    // Trigger delete and confirm to hit deleteTag error + onError toast
    fireEvent.click(screen.getByRole("button", { name: /delete tag request/i }));
    const confirmDelete = await screen.findByRole("button", { name: /^delete$/i });
    fireEvent.click(confirmDelete);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
    });
  });
});
