/**
 * Pass 52 — Wave 19: Close uncovered branches in PublicMentorship and NotificationsPanel.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import PublicMentorship from "@/pages/PublicMentorship";
import { NotificationsPanel } from "@/components/NotificationsPanel";

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

const MOCK_MEMBER = {
  id: "m-w19",
  user_id: "u-w19",
  first_name: "Test",
  last_name: "Admin",
  verification_level: 3,
  onboarding_completed: true,
  chapter_id: "ch-1",
};

describe("Pass 52 — Wave 19: PublicMentorship branches", () => {
  it("handles mentorships query error gracefully", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "mentorships") {
        return makeChain(null, { message: "forced mentorships error" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicMentorship />, { route: "/mentorship" });
    await waitFor(() => {
      expect(screen.getByText(/No mentors found/i)).toBeInTheDocument();
    });
  });

  it("handles mentorships query returning null data", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "mentorships") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicMentorship />, { route: "/mentorship" });
    await waitFor(() => {
      expect(screen.getByText(/No mentors found/i)).toBeInTheDocument();
    });
  });

  it("renders mentors with null skills, null mentor, null names, unverified/L1/L2/L3/unknown levels, and filters", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "mentorships") {
        return makeChain([
          {
            id: "ms-null-all",
            skills: null,
            description: null,
            status: "available",
            mode: "online",
            availability: "weekends",
            mentor: null,
          },
          {
            id: "ms-null-names",
            skills: null,
            description: "Null names mentor",
            status: "available",
            mode: "online",
            availability: "weekends",
            mentor: {
              id: "m-2",
              first_name: null,
              last_name: null,
              photo_url: null,
              verification_level: "unverified",
              chapters: null,
            },
          },
          {
            id: "ms-full",
            skills: ["Finance", "Leadership"],
            description: "Experienced mentor",
            status: "available",
            mode: "online",
            availability: "weekends",
            mentor: {
              id: "m-3",
              first_name: "Aarav",
              last_name: "Shah",
              photo_url: "https://example.com/a.jpg",
              verification_level: "L3",
              chapters: { name: "Ahmedabad" },
            },
          },
          {
            id: "ms-unknown-lvl",
            skills: ["Finance"],
            description: null,
            status: "available",
            mode: "in_person",
            availability: "weekdays",
            mentor: {
              id: "m-4",
              first_name: "Diya",
              last_name: "Patel",
              photo_url: null,
              verification_level: "L99",
              chapters: { name: "Mumbai" },
            },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicMentorship />, { route: "/mentorship" });
    await screen.findByText("Aarav Shah");
    expect(screen.getByText("Elder")).toBeInTheDocument();
    expect(screen.getByText("Ahmedabad")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();

    // Filter by skill then toggle off and click All
    const financeBtn = screen.getByRole("button", { name: "Finance" });
    fireEvent.click(financeBtn);
    expect(screen.getByText("Aarav Shah")).toBeInTheDocument();
    fireEvent.click(financeBtn);
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    // Search by name / skill
    const searchInput = screen.getByPlaceholderText(/Search by name or skill/i);
    fireEvent.change(searchInput, { target: { value: "Leadership" } });
    expect(screen.getByText("Aarav Shah")).toBeInTheDocument();
  });
});

describe("Pass 52 — Wave 19: NotificationsPanel branches", () => {
  it("handles unread count query error", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(MOCK_MEMBER) as never;
      if (table === "notifications") {
        return makeChain(null, { message: "forced count error" }, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<NotificationsPanel />);
    const btn = await screen.findByRole("button", { name: /Notifications/i });
    expect(btn).toBeInTheDocument();
  });

  it("handles unread count returning null count and list query returning null data", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(MOCK_MEMBER) as never;
      if (table === "notifications") {
        return makeChain(null, null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<NotificationsPanel />);
    const btn = await screen.findByRole("button", { name: /Notifications/i });
    fireEvent.click(btn);
    await screen.findByText(/No recent notifications/i);
  });

  it("handles list query error when popover is opened", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(MOCK_MEMBER) as never;
      if (table === "notifications") {
        const c = makeChain(null, null, 2);
        c.select = (_cols?: string, opts?: { head?: boolean }) => {
          if (opts?.head) return makeChain(null, null, 2);
          return makeChain(null, { message: "forced list error" });
        };
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<NotificationsPanel />);
    const btn = await screen.findByRole("button", { name: /Notifications \(2 unread\)/i });
    fireEvent.click(btn);
    await screen.findByText(/No recent notifications/i);
  });

  it("handles markAllRead error, markOneRead error, and unknown notification type (read & unread)", async () => {
    const updateSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, { message: "forced update error" }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(MOCK_MEMBER) as never;
      if (table === "notifications") {
        const listData = [
          {
            id: "n-unknown-unread",
            type: "custom_other",
            title: "Unread Unknown Alert",
            description: "No href unread",
            created_at: new Date().toISOString(),
            read: false,
            entity_id: null,
            entity_type: null,
          },
          {
            id: "n-unknown-read",
            type: "custom_other",
            title: "Read Unknown Alert",
            description: "No href read",
            created_at: new Date().toISOString(),
            read: true,
            entity_id: null,
            entity_type: null,
          },
        ];
        const c = makeChain(listData, null, 12);
        c.select = (_cols?: string, opts?: { head?: boolean }) => {
          if (opts?.head) return makeChain(null, null, 12);
          return makeChain(listData, null);
        };
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<NotificationsPanel />);
    const btn = await screen.findByRole("button", { name: /Notifications \(12 unread\)/i });
    expect(screen.getByText("9+")).toBeInTheDocument();
    fireEvent.click(btn);

    // Wait for list to render
    const unreadItem = await screen.findByText("Unread Unknown Alert");
    const readItem = screen.getByText("Read Unknown Alert");

    // Click Mark all read (triggers error branch in markAllRead)
    fireEvent.click(screen.getByRole("button", { name: /Mark all read/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    // Click unread unknown-type item (triggers markOneRead error branch + div branch with !n.read)
    fireEvent.click(unreadItem);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    // Reopen and click read unknown-type item (triggers div branch with n.read = true)
    fireEvent.click(btn);
    const readItemAgain = await screen.findByText("Read Unknown Alert");
    fireEvent.click(readItemAgain);
    expect(readItem).toBeDefined();
  });
});
