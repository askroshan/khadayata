/**
 * Pass 48 — Wave 18: Branch coverage burn-down for News.tsx and Scholarships.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import News from "@/pages/News";
import Scholarships from "@/pages/Scholarships";

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
    ilike: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

const ADMIN_MEMBER = {
  id: "m-admin-w18",
  user_id: "u-admin-w18",
  first_name: "Wave",
  last_name: "Admin",
  verification_level: 3,
  onboarding_completed: true,
  chapter_id: "ch-1",
};

const ADMIN_ROLES = [
  { role_id: "r-ga", roles: { name: "Global Admin" }, chapter_id: null },
];

describe("Pass 48 — Wave 18: News.tsx uncovered branches", () => {
  it("handles null content_news data fallback (data ?? [])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(ADMIN_MEMBER) as never;
      if (table === "role_assignments") return makeChain(ADMIN_ROLES) as never;
      if (table === "content_news") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<News />, { route: "/news" });
    expect(await screen.findByText(/No news articles found/i)).toBeInTheDocument();
  });

  it("renders article with null image_alt, unknown status, and edits null fields + non-published status", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(ADMIN_MEMBER) as never;
      if (table === "role_assignments") return makeChain(ADMIN_ROLES) as never;
      if (table === "content_news") {
        const c = makeChain([
          {
            id: "news-null-1",
            title: "Wave18 Null Fields Article",
            summary: null,
            body: null,
            status: "custom_status",
            article_type: null,
            pinned: null,
            cover_image_url: "https://example.com/cover.jpg",
            image_alt: null,
            featured: false,
            category: null,
            author_name: null,
            views_count: 0,
            created_at: new Date().toISOString(),
            chapters: null,
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<News />, { route: "/news" });
    await screen.findByText("Wave18 Null Fields Article");

    // image_alt fallback to n.title
    const img = screen.getByAltText("Wave18 Null Fields Article");
    expect(img).toBeInTheDocument();
    // unknown status fallback badge
    expect(screen.getByText("custom_status")).toBeInTheDocument();

    // Open Edit dialog — exercises summary ?? "", body ?? "", article_type ?? "article", pinned ?? false
    const editBtn = await screen.findByRole("button", { name: /Edit article/i });
    fireEvent.click(editBtn);

    const saveBtn = await screen.findByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Wave18 Null Fields Article",
          summary: null,
          body: null,
          published_at: null,
        })
      );
    });
  });

  it("selects and clears category, country, and state in Write Article dialog", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(ADMIN_MEMBER) as never;
      if (table === "role_assignments") return makeChain(ADMIN_ROLES) as never;
      if (table === "countries") return makeChain([{ id: "c-in", name: "India" }]) as never;
      if (table === "states") return makeChain([{ id: "s-gj", name: "Gujarat", country_id: "c-in" }]) as never;
      if (table === "cities") return makeChain([{ id: "ci-amd", name: "Ahmedabad", state_id: "s-gj" }]) as never;
      if (table === "content_news") return makeChain([]) as never;
      return makeChain([]) as never;
    });

    renderApp(<News />, { route: "/news" });
    const writeBtn = await screen.findByRole("button", { name: /Write Article/i });
    fireEvent.click(writeBtn);

    await screen.findByText("New Article");
    const comboboxes = screen.getAllByRole("combobox");
    // Dialog comboboxes (background is aria-hidden): [0] article_type, [1] category, [2] scope, [3] country, [4] state
    // Select category -> then reset to __none__
    fireEvent.click(comboboxes[1]);
    fireEvent.click(await screen.findByRole("option", { name: "Education" }));
    fireEvent.click(comboboxes[1]);
    fireEvent.click(await screen.findByRole("option", { name: "No category" }));

    // Select country -> then select state -> reset state -> reset country
    fireEvent.click(comboboxes[3]);
    fireEvent.click(await screen.findByRole("option", { name: "India" }));

    await waitFor(() => {
      expect(comboboxes[4]).not.toBeDisabled();
    });
    fireEvent.click(comboboxes[4]);
    fireEvent.click(await screen.findByRole("option", { name: "Gujarat" }));
    fireEvent.click(comboboxes[4]);
    fireEvent.click(await screen.findByRole("option", { name: "No state" }));

    fireEvent.click(comboboxes[3]);
    fireEvent.click(await screen.findByRole("option", { name: "No country" }));
  });
});

describe("Pass 48 — Wave 18: Scholarships.tsx uncovered branches", () => {
  it("handles null scholarships and null scholarship_applications data fallbacks", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(ADMIN_MEMBER) as never;
      if (table === "role_assignments") return makeChain(ADMIN_ROLES) as never;
      if (table === "scholarships") return makeChain(null) as never;
      if (table === "scholarship_applications") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<Scholarships />, { route: "/scholarships" });
    expect(await screen.findByText(/No active scholarships/i)).toBeInTheDocument();
  });

  it("applies with empty essay and handles applyScholarship error branch", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "apply failed" }));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(ADMIN_MEMBER) as never;
      if (table === "role_assignments") return makeChain(ADMIN_ROLES) as never;
      if (table === "scholarships") {
        return makeChain([
          {
            id: "sch-1",
            name: "Wave18 Merit Grant",
            description: "Desc",
            amount: 5000,
            currency: "INR",
            deadline: "2099-12-31",
            chapter_id: "ch-1",
            eligibility: "All",
            chapters: { name: "Ahmedabad" },
          },
        ]) as never;
      }
      if (table === "scholarship_applications") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Scholarships />, { route: "/scholarships" });
    const applyBtn = await screen.findByRole("button", { name: /Apply Now/i });
    fireEvent.click(applyBtn);

    const submitBtn = await screen.findByRole("button", { name: /Submit Application/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          scholarship_id: "sch-1",
          essay: null,
        })
      );
    });
  });

  it("creates scholarship with empty optional fields, toggles chapter back to global, and handles insert error", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "create failed" }));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(ADMIN_MEMBER) as never;
      if (table === "role_assignments") return makeChain(ADMIN_ROLES) as never;
      if (table === "chapters") return makeChain([{ id: "ch-1", name: "Ahmedabad" }]) as never;
      if (table === "scholarships") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "scholarship_applications") return makeChain([]) as never;
      return makeChain([]) as never;
    });

    renderApp(<Scholarships />, { route: "/scholarships" });
    const openCreateBtn = await screen.findByRole("button", { name: /Create Scholarship/i });
    fireEvent.click(openCreateBtn);

    await screen.findByText("Create Scholarship Program");
    // Fill only required Name
    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Wave18 Minimal Grant" } });

    // Select chapter then reset to __global__
    const comboboxes = screen.getAllByRole("combobox");
    const chapterCombo = comboboxes[comboboxes.length - 1];
    fireEvent.click(chapterCombo);
    fireEvent.click(await screen.findByRole("option", { name: "Ahmedabad" }));
    fireEvent.click(chapterCombo);
    fireEvent.click(await screen.findByRole("option", { name: /All chapters \(global\)/i }));

    // Submit inside dialog
    const submitBtns = screen.getAllByRole("button", { name: /Create Scholarship/i });
    fireEvent.click(submitBtns[submitBtns.length - 1]);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Wave18 Minimal Grant",
          description: null,
          amount: null,
          deadline: null,
          chapter_id: null,
          eligibility: null,
        })
      );
    });
  });

  it("renders My Applications tab with unknown status fallback badge", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(ADMIN_MEMBER) as never;
      if (table === "role_assignments") return makeChain(ADMIN_ROLES) as never;
      if (table === "scholarships") return makeChain([]) as never;
      if (table === "scholarship_applications") {
        return makeChain([
          {
            id: "app-unk-1",
            scholarship_id: "sch-99",
            member_id: ADMIN_MEMBER.id,
            status: "waitlisted_custom",
            essay: "My essay",
            created_at: new Date().toISOString(),
            scholarships: { name: "Custom Status Grant", amount: 2500, currency: "USD", deadline: null },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Scholarships />, { route: "/scholarships" });
    const myTab = await screen.findByRole("tab", { name: /My Applications/i });
    fireEvent.mouseDown(myTab);
    fireEvent.click(myTab);

    expect(await screen.findByText("waitlisted_custom")).toBeInTheDocument();
  });
});
