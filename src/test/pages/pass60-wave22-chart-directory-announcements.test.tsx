/**
 * Pass 60 — Wave 22: Branch coverage burn-down for:
 * 1. src/components/ui/chart.tsx
 * 2. src/pages/Directory.tsx
 * 3. src/components/admin/AnnouncementsTab.tsx
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { ChartContainer, ChartStyle, ChartTooltipContent } from "@/components/ui/chart";
import Directory from "@/pages/Directory";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";

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

describe("Pass 60 — Wave 22: chart.tsx branches", () => {
  it("ChartStyle returns null line when theme has empty color for one mode", () => {
    const { container } = render(
      <ChartStyle
        id="test-chart"
        config={{
          seriesA: {
            label: "Series A",
            theme: { light: "#112233", dark: "" },
          },
        }}
      />,
    );
    const styleEl = container.querySelector("style");
    expect(styleEl).not.toBeNull();
    expect(styleEl?.innerHTML).toContain("--color-seriesA: #112233;");
  });

  it("ChartTooltipContent covers fallback keys ('value', item.name, item.dataKey) and indicatorColor fallbacks", () => {
    render(
      <ChartContainer
        config={{
          value: { label: "Fallback Value" },
          named: { label: "Named Series" },
          keyed: { label: "Keyed Series" },
        }}
      >
        <div>
          {/* 1. No labelKey, no dataKey, no name -> falls back to "value"; no color, no fill, no item.color */}
          <ChartTooltipContent
            active
            payload={[
              {
                value: 42,
                payload: {},
              } as never,
            ]}
          />
          {/* 2. Explicit color prop, item.name set without dataKey */}
          <ChartTooltipContent
            active
            color="#ff0000"
            payload={[
              {
                name: "named",
                value: 10,
                payload: {},
              } as never,
            ]}
          />
          {/* 3. item.payload.fill set, item.dataKey set without name */}
          <ChartTooltipContent
            active
            payload={[
              {
                dataKey: "keyed",
                value: 20,
                payload: { fill: "#00ff00" },
              } as never,
            ]}
          />
          {/* 4. item.color set without color prop or payload.fill */}
          <ChartTooltipContent
            active
            payload={[
              {
                dataKey: "keyed",
                color: "#0000ff",
                value: 30,
                payload: {},
              } as never,
            ]}
          />
        </div>
      </ChartContainer>,
    );

    expect(screen.getAllByText("Fallback Value").length).toBeGreaterThan(0);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });
});

describe("Pass 60 — Wave 22: Directory.tsx branches", () => {
  it("renders member with null chapters ('No chapter'), null verification_level ('L0'), null chapters list, and null currentMember chapter_id", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        // Distinguish useMember (.single/.maybeSingle) vs directory list (.limit)
        const listData = [
          {
            id: "m-dir-1",
            first_name: "Kiran",
            last_name: "Patel",
            chapters: null,
            verification_level: null,
            gender: "Male",
            onboarding_completed: true,
          },
        ];
        const chain = makeChain(listData);
        chain.single = () =>
          Promise.resolve({
            data: {
              id: "m-self",
              user_id: "u-self",
              first_name: "Self",
              last_name: "User",
              chapter_id: null,
              verification_level: 0,
              onboarding_completed: true,
            },
            error: null,
          });
        chain.maybeSingle = chain.single;
        return chain as never;
      }
      if (table === "chapters") {
        // Return null data to exercise `data ?? []`
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Directory />, { route: "/directory" });

    expect(await screen.findByText("Kiran Patel")).toBeInTheDocument();
    expect(screen.getByText("No chapter")).toBeInTheDocument();
    expect(screen.getByText("L0")).toBeInTheDocument();
  });

  it("handles directory query error gracefully (if (error) throw error)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const chain = makeChain(null, new Error("Directory query failed"));
        chain.single = () =>
          Promise.resolve({
            data: {
              id: "m-self",
              user_id: "u-self",
              first_name: "Self",
              last_name: "User",
              chapter_id: null,
              verification_level: 2,
              onboarding_completed: true,
            },
            error: null,
          });
        chain.maybeSingle = chain.single;
        return chain as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-1", name: "Ahmedabad" }]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Directory />, { route: "/directory" });

    await waitFor(() => {
      expect(screen.getByText("No members found")).toBeInTheDocument();
    });
  });
});

describe("Pass 60 — Wave 22: AnnouncementsTab.tsx branches", () => {
  it("publishes chapter-scoped announcement when myChapterId is set and audience is 'chapter', and global when switched to 'All Members'", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "announcements") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<AnnouncementsTab announcements={[]} myChapterId="ch-1" />);
    // Wait for AuthProvider to hydrate `user` from session
    await new Promise((r) => setTimeout(r, 50));

    const titleInput = screen.getByPlaceholderText("Title *");
    fireEvent.change(titleInput, { target: { value: "Chapter Update" } });
    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Chapter Update",
          chapter_id: "ch-1",
        }),
      );
    });

    // Switch to All Members (global) and publish again
    fireEvent.click(screen.getByRole("button", { name: /all members/i }));
    fireEvent.change(screen.getByPlaceholderText("Title *"), {
      target: { value: "Global Update" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Global Update",
          chapter_id: null,
        }),
      );
    });
  });

  it("edits announcement with null body (setEditBody(a.body ?? '') and body: editBody.trim() || null) and handles empty editId guard", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "announcements") {
        const c = makeChain([]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    const announcements = [
      {
        id: "ann-1",
        title: "No Body Notice",
        body: null,
        created_at: new Date().toISOString(),
        chapter_id: null,
      },
      {
        id: "",
        title: "Empty ID Notice",
        body: "Some body",
        created_at: new Date().toISOString(),
        chapter_id: "ch-1",
      },
    ];

    renderApp(<AnnouncementsTab announcements={announcements} />);

    // 1. Edit ann-1 (body: null -> setEditBody("") -> Save Changes sends body: null)
    const editButtons = screen.getAllByRole("button", { name: /edit announcement/i });
    fireEvent.click(editButtons[0]);

    const saveBtn = await screen.findByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        title: "No Body Notice",
        body: null,
      });
    });

    // 2. Edit announcement with empty id ("") -> triggers `if (!editId) return;`
    updateSpy.mockClear();
    fireEvent.click(editButtons[1]);
    const saveBtn2 = await screen.findByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn2);

    await waitFor(() => {
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
