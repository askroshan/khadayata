/**
 * Pass 59 — Wave 21: Branch coverage burn-down for SamitiTab, ConsentCenter, and CampaignsPanel.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import SamitiTab from "@/components/admin/SamitiTab";
import { ConsentCenter } from "@/components/consent/ConsentCenter";
import { CampaignsPanel } from "@/components/finance/CampaignsPanel";

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

describe("Pass 59 — Wave 21: SamitiTab, ConsentCenter, CampaignsPanel branches", () => {
  // ── SamitiTab ─────────────────────────────────────────────────────────────
  it("SamitiTab: null query data fallbacks (samiti_groups & chapters)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "samiti_groups") return makeChain(null) as never;
      if (table === "chapters") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<SamitiTab />);
    expect(await screen.findByText(/No sub-groups created yet/i)).toBeInTheDocument();
  });

  it("SamitiTab: null chapter & null description on edit with empty description save", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "samiti_groups") {
        const c = makeChain([
          {
            id: "sam-1",
            name: "Yuva Samiti Null",
            type: "Yuva Samiti",
            description: null,
            chapters: null,
            created_at: new Date().toISOString(),
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-1", name: "Mumbai" }]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<SamitiTab />);
    expect(await screen.findByText("Yuva Samiti Null")).toBeInTheDocument();
    expect(screen.getByText("No chapter")).toBeInTheDocument();

    // Open edit dialog (exercises s.description ?? "")
    fireEvent.click(screen.getByRole("button", { name: /Edit Yuva Samiti Null/i }));
    const saveBtn = await screen.findByRole("button", { name: /Save Changes/i });

    // Save with empty description (exercises editSamiti.description.trim() || null)
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Yuva Samiti Null",
          description: null,
        })
      );
    });
  });

  // ── ConsentCenter ─────────────────────────────────────────────────────────
  it("ConsentCenter: null query data fallbacks and export/deletion error branches", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const insertSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, new Error("forced data_request error")));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-consent-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Member",
        }) as never;
      }
      if (table === "consents") return makeChain(null) as never;
      if (table === "data_requests") {
        const c = makeChain(null);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ConsentCenter />);
    const exportBtn = await screen.findByRole("button", { name: /Request Export/i });
    const deleteBtn = screen.getByRole("button", { name: /Request Deletion/i });

    // Trigger export error branch
    fireEvent.click(exportBtn);
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ member_id: "m-consent-1", type: "export" })
      );
    });

    // Trigger deletion error branch
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ member_id: "m-consent-1", type: "deletion" })
      );
    });
  });

  // ── CampaignsPanel ────────────────────────────────────────────────────────
  it("CampaignsPanel: null query data fallbacks & unknown status badge fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "fundraising_campaigns") return makeChain(null) as never;
      if (table === "campaign_donations") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<CampaignsPanel myChapterId={null} />);
    expect(await screen.findByText(/No campaigns yet/i)).toBeInTheDocument();
  });

  it("CampaignsPanel: unknown status fallback & create campaign with cover_image_url", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-camp-1",
          user_id: "u-1",
          first_name: "Finance",
          last_name: "Admin",
        }) as never;
      }
      if (table === "fundraising_campaigns") {
        const c = makeChain([
          {
            id: "camp-unknown",
            title: "Archived Drive",
            description: "Old drive",
            goal_amount: 50000,
            currency: "INR",
            start_date: "2025-01-01",
            end_date: "2025-12-31",
            campaign_type: "general",
            status: "archived",
            cover_image_url: null,
          },
        ]);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "campaign_donations") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<CampaignsPanel myChapterId={null} />);
    expect(await screen.findByText("Archived Drive")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();

    // Open create dialog and submit with non-empty cover_image_url
    fireEvent.click(screen.getByRole("button", { name: /New Campaign/i }));
    fireEvent.change(screen.getByPlaceholderText(/Paryushan Mahaparv/i), {
      target: { value: "Temple Fund" },
    });
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "100000" },
    });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: "2026-06-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-07-01" } });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://example.com/banner.jpg" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/i }));
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Temple Fund",
          cover_image_url: "https://example.com/banner.jpg",
        })
      );
    });
  });

  it("CampaignsPanel: create campaign throws when member profile is missing", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(null) as never;
      if (table === "fundraising_campaigns") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "campaign_donations") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<CampaignsPanel myChapterId={null} />);
    fireEvent.click(await screen.findByRole("button", { name: /New Campaign/i }));
    fireEvent.change(screen.getByPlaceholderText(/Paryushan Mahaparv/i), {
      target: { value: "No Member Campaign" },
    });
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "5000" },
    });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: "2026-06-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-07-01" } });

    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(insertSpy).not.toHaveBeenCalled();
    });
  });
});
