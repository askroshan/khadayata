/**
 * Pass 58 — Wave 21: Branch coverage burn-down for NewsDetail, PublicNews, and ReportsTab.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import NewsDetail from "@/pages/NewsDetail";
import PublicNews from "@/pages/PublicNews";
import ReportsTab from "@/components/admin/ReportsTab";

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
    ilike: () => chain,
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

describe("Pass 58 — Wave 21: NewsDetail branches", () => {
  it("handles query error branch gracefully", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        return makeChain(null, { message: "news fetch failed" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>,
      { route: "/news/err-1" }
    );

    expect(await screen.findByRole("heading", { name: /article not found/i })).toBeInTheDocument();
  });

  it("renders article with null views_count, null read_time_minutes, null body, null updated_at, null image_alt, null video_title", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        const c = makeChain({
          id: "art-nulls",
          title: "Fallback Branch Article",
          summary: null,
          body: null,
          cover_image_url: "https://example.com/cover.jpg",
          image_alt: null,
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          video_title: null,
          category: "Community News",
          article_type: "article",
          featured: false,
          author_name: null,
          read_time_minutes: null,
          views_count: null,
          published_at: null,
          created_at: "2026-01-15T10:00:00Z",
          updated_at: null,
          source_url: null,
          tags: [],
          chapters: null,
          countries: null,
          states: null,
          cities: null,
        });
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>,
      { route: "/news/art-nulls" }
    );

    expect(await screen.findByRole("heading", { name: "Fallback Branch Article" })).toBeInTheDocument();
    expect(screen.getByText(/1 min read/i)).toBeInTheDocument();
    expect(screen.getByText(/no article body available/i)).toBeInTheDocument();
    expect(screen.getByAltText("Fallback Branch Article")).toBeInTheDocument();
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({ views_count: 1 });
    });
  });

  it("renders article with explicit read_time_minutes, updated_at, image_alt, video_title, and views_count", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        return makeChain({
          id: "art-full",
          title: "Full Metadata Article",
          summary: "Summary here",
          body: "Body text here",
          cover_image_url: "https://example.com/cover2.jpg",
          image_alt: "Explicit Cover Alt",
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          video_title: "Explicit Video Title",
          category: "Events",
          article_type: "breaking",
          featured: true,
          author_name: "Priya Shah",
          read_time_minutes: 7,
          views_count: 42,
          published_at: "2026-02-01T10:00:00Z",
          created_at: "2026-02-01T10:00:00Z",
          updated_at: "2026-02-02T10:00:00Z",
          source_url: "https://example.com/source",
          tags: ["festival"],
          chapters: { name: "Ahmedabad" },
          countries: { name: "India" },
          states: { name: "Gujarat" },
          cities: { name: "Ahmedabad" },
        }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>,
      { route: "/news/art-full" }
    );

    expect(await screen.findByRole("heading", { name: "Full Metadata Article" })).toBeInTheDocument();
    expect(screen.getByText(/7 min read/i)).toBeInTheDocument();
    expect(screen.getByAltText("Explicit Cover Alt")).toBeInTheDocument();
    expect(screen.getByText("Explicit Video Title")).toBeInTheDocument();
  });
});

describe("Pass 58 — Wave 21: PublicNews branches", () => {
  it("handles query error branch", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        return makeChain(null, { message: "public news error" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicNews />, { route: "/news" });
    expect(await screen.findByRole("heading", { name: /community news/i })).toBeInTheDocument();
  });

  it("handles null data fallback (data ?? [])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicNews />, { route: "/news" });
    expect(await screen.findByText(/no news articles found/i)).toBeInTheDocument();
  });

  it("renders location, readTime, and image_alt branches across articles", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "content_news") {
        return makeChain([
          {
            id: "pn-1",
            title: "Explicit Meta News",
            summary: "Summary 1",
            body: "Body 1",
            cover_image_url: "https://example.com/p1.jpg",
            image_alt: "Explicit Public Alt",
            category: "Events",
            tags: [],
            featured: false,
            pinned: false,
            article_type: "article",
            read_time_minutes: 6,
            published_at: "2026-03-01T00:00:00Z",
            created_at: "2026-03-01T00:00:00Z",
            cities: { name: "Vadodara" },
            states: { name: "Gujarat" },
            countries: { name: "India" },
          },
          {
            id: "pn-2",
            title: "Null Body And Location News",
            summary: null,
            body: null,
            cover_image_url: "https://example.com/p2.jpg",
            image_alt: null,
            category: "Announcements",
            tags: [],
            featured: true,
            pinned: false,
            article_type: "breaking",
            read_time_minutes: null,
            published_at: "2026-03-02T00:00:00Z",
            created_at: "2026-03-02T00:00:00Z",
            cities: null,
            states: null,
            countries: null,
          },
          {
            id: "pn-3",
            title: "Estimated Read Time News",
            summary: "Has body",
            body: "word ".repeat(400),
            cover_image_url: null,
            image_alt: null,
            category: "Community News",
            tags: [],
            featured: false,
            pinned: true,
            article_type: "article",
            read_time_minutes: null,
            published_at: null,
            created_at: "2026-03-03T00:00:00Z",
            cities: null,
            states: { name: "Maharashtra" },
            countries: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicNews />, { route: "/news" });

    expect(await screen.findByText("Explicit Meta News")).toBeInTheDocument();
    expect(screen.getByText("Vadodara, Gujarat, India")).toBeInTheDocument();
    expect(screen.getByText("6 min read")).toBeInTheDocument();
    expect(screen.getByAltText("Explicit Public Alt")).toBeInTheDocument();
    expect(screen.getByAltText("Null Body And Location News")).toBeInTheDocument();
    expect(screen.getByText("1 min read")).toBeInTheDocument();
    expect(screen.getByText("2 min read")).toBeInTheDocument();
    expect(screen.getByText("Maharashtra")).toBeInTheDocument();
  });
});

describe("Pass 58 — Wave 21: ReportsTab branches", () => {
  const sampleReport = {
    id: "rep-1",
    entity_type: "member",
    entity_id: "mem-target",
    category: "harassment",
    reason: "Inappropriate message",
    status: "pending",
    admin_action: null,
    admin_notes: null,
    reviewed_at: null,
    created_at: "2026-03-10T12:00:00Z",
    reporter: { id: "mem-rep", first_name: "Asha", last_name: "Shah", photo_url: null },
    reviewer: null,
  };

  it("handles query error branch", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "reports") {
        return makeChain(null, { message: "reports query failed" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ReportsTab />);
    expect(await screen.findByText(/no pending reports/i)).toBeInTheDocument();
  });

  it("handles null data fallback and All tab empty state", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "reports") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ReportsTab />);
    expect(await screen.findByText(/no pending reports/i)).toBeInTheDocument();

    const allTab = screen.getByRole("tab", { name: /^all$/i });
    fireEvent.mouseDown(allTab);
    fireEvent.click(allTab);

    expect(await screen.findByText(/no\s+reports/i)).toBeInTheDocument();
  });

  it("throws 'Not authenticated' when member is null on resolveReport", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null, null) as never;
      }
      if (table === "reports") {
        const c = makeChain([sampleReport]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ReportsTab />);
    const takeActionBtn = await screen.findByRole("button", { name: /take action/i });
    fireEvent.click(takeActionBtn);

    const dismissBtn = await screen.findByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("handles reportError on update when member is present", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "update failed" }));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "mem-admin",
          user_id: "u-admin",
          first_name: "Admin",
          last_name: "User",
        }) as never;
      }
      if (table === "reports") {
        const c = makeChain([sampleReport]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ReportsTab />);
    const takeActionBtn = await screen.findByRole("button", { name: /take action/i });
    fireEvent.click(takeActionBtn);

    const dismissBtn = await screen.findByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
