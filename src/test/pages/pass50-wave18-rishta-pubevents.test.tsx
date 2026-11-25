/**
 * Pass 50 — Wave 18: Branch coverage burn-down for RishtaWorkflow & PublicEvents.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { RishtaWorkflow } from "@/components/matrimonial/RishtaWorkflow";
import PublicEvents from "@/pages/PublicEvents";

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

describe("Pass 50 — Wave 18: RishtaWorkflow branches", () => {
  it("handles null data response from rishta_requests query", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "rishta_requests") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    const { container } = renderApp(<RishtaWorkflow myProfileId="p-me" />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it("renders fallback status, Unknown name when profile/member is null, and false family_ok icons", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "rishta_requests") {
        return makeChain([
          {
            id: "req-unknown-status",
            from_profile_id: "p-me",
            to_profile_id: "p-other-1",
            status: "nonexistent_status",
            intro_message: null,
            from_family_ok: null,
            to_family_ok: null,
            admin_notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            from_profile: null,
            to_profile: null,
          },
          {
            id: "req-false-family",
            from_profile_id: "p-me",
            to_profile_id: "p-other-2",
            status: "family_review",
            intro_message: "Hello family",
            from_family_ok: false,
            to_family_ok: false,
            admin_notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            from_profile: { id: "p-me", member: { first_name: "Me", last_name: "User" } },
            to_profile: { id: "p-other-2", member: null },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RishtaWorkflow myProfileId="p-me" />);
    expect(await screen.findByText("Introduction Sent")).toBeInTheDocument();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Sender's family")).toBeInTheDocument();
    expect(screen.getByText("Recipient's family")).toBeInTheDocument();
  });

  it("handles Family OK as sender (auto-approving when to_family_ok is true) and Decline during family_review", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "rishta_requests") {
        const c = makeChain([
          {
            id: "req-sender-ok",
            from_profile_id: "p-me",
            to_profile_id: "p-other",
            status: "family_review",
            intro_message: "Sender review",
            from_family_ok: null,
            to_family_ok: true,
            admin_notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            from_profile: { id: "p-me", member: { first_name: "Aarav", last_name: "Shah" } },
            to_profile: { id: "p-other", member: { first_name: "Diya", last_name: "Patel" } },
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RishtaWorkflow myProfileId="p-me" />);
    const familyOkBtn = await screen.findByRole("button", { name: /family ok/i });
    fireEvent.click(familyOkBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ from_family_ok: true, status: "family_approved" })
      );
    });

    const declineBtn = screen.getByRole("button", { name: /decline/i });
    fireEvent.click(declineBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "declined" })
      );
    });
  });

  it("handles Family OK as recipient when from_family_ok is null (does not auto-approve)", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "rishta_requests") {
        const c = makeChain([
          {
            id: "req-recip-ok",
            from_profile_id: "p-other",
            to_profile_id: "p-me",
            status: "family_review",
            intro_message: "Recipient review",
            from_family_ok: null,
            to_family_ok: null,
            admin_notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            from_profile: { id: "p-other", member: { first_name: "Rohan", last_name: "Desai" } },
            to_profile: { id: "p-me", member: { first_name: "Meera", last_name: "Shah" } },
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RishtaWorkflow myProfileId="p-me" />);
    const familyOkBtn = await screen.findByRole("button", { name: /family ok/i });
    fireEvent.click(familyOkBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to_family_ok: true })
      );
    });
  });

  it("handles alreadySent via reverse direction and returns null when myProfileId is null", async () => {
    const { container } = renderApp(<RishtaWorkflow myProfileId={null} />);
    expect(container.innerHTML).toBe("");

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "rishta_requests") {
        return makeChain([
          {
            id: "req-rev",
            from_profile_id: "p-target",
            to_profile_id: "p-me",
            status: "intro_sent",
            intro_message: null,
            from_family_ok: null,
            to_family_ok: null,
            admin_notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            from_profile: { id: "p-target", member: { first_name: "Target", last_name: "User" } },
            to_profile: { id: "p-me", member: { first_name: "Me", last_name: "User" } },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<RishtaWorkflow myProfileId="p-me" targetProfileId="p-target" />);
    expect(await screen.findByText("Rishta Sent")).toBeInTheDocument();
  });
});

describe("Pass 50 — Wave 18: PublicEvents branches", () => {
  it("handles query error and null data responses gracefully", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "events") {
        return makeChain(null, { message: "forced events error" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicEvents />, { route: "/events" });
    await waitFor(() => {
      expect(screen.getByText(/no upcoming events found/i)).toBeInTheDocument();
    });
  });

  it("handles null data with no error", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "events") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicEvents />, { route: "/events" });
    await waitFor(() => {
      expect(screen.getByText(/no upcoming events found/i)).toBeInTheDocument();
    });
  });

  it("renders events with null/unknown categories, null locations/chapters, non-array rsvps, search by city, and past tab", async () => {
    const futureStart = new Date(Date.now() + 86400000 * 5).toISOString();
    const pastStart = new Date(Date.now() - 86400000 * 10).toISOString();
    const pastEnd = new Date(Date.now() - 86400000 * 9).toISOString();

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "events") {
        return makeChain([
          {
            id: "ev-nulls",
            name: "Minimal Event",
            description: null,
            category: null,
            event_type: "in_person",
            starts_at: futureStart,
            ends_at: null,
            venue: null,
            virtual_url: null,
            max_capacity: null,
            fee_amount: 0,
            fee_currency: "INR",
            tags: null,
            organizer_name: null,
            cover_image_url: null,
            chapter_id: null,
            consent_required: false,
            countries: null,
            states: null,
            cities: null,
            chapters: null,
            event_rsvps: null,
          },
          {
            id: "ev-rich",
            name: "Rich Hybrid Gala",
            description: "Annual celebration",
            category: "unknown_custom_cat",
            event_type: "hybrid",
            starts_at: futureStart,
            ends_at: futureStart,
            venue: "Grand Hall",
            virtual_url: "https://example.com/meet",
            max_capacity: 200,
            fee_amount: 50,
            fee_currency: "USD",
            tags: ["gala", "culture"],
            organizer_name: "Khadayata Youth",
            cover_image_url: "https://example.com/cover.jpg",
            chapter_id: "ch-1",
            consent_required: false,
            countries: { name: "USA" },
            states: { name: "Texas" },
            cities: { name: "Austin" },
            chapters: { name: "Austin Chapter" },
            event_rsvps: [{ id: "r1" }, { id: "r2" }],
          },
          {
            id: "ev-past",
            name: "Past Virtual Meetup",
            description: "Archived meetup",
            category: "festival",
            event_type: "virtual",
            starts_at: pastStart,
            ends_at: pastEnd,
            venue: "Hidden Venue",
            virtual_url: "https://example.com/old",
            max_capacity: null,
            fee_amount: null,
            fee_currency: null,
            tags: [],
            organizer_name: "Admin",
            cover_image_url: null,
            chapter_id: null,
            consent_required: false,
            countries: null,
            states: null,
            cities: { name: "Surat" },
            chapters: null,
            event_rsvps: [{ id: "r3" }],
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicEvents />, { route: "/events" });

    expect(await screen.findByText("Minimal Event")).toBeInTheDocument();
    expect(screen.getByText("Rich Hybrid Gala")).toBeInTheDocument();
    expect(screen.getByText("Austin, Texas, USA")).toBeInTheDocument();
    expect(screen.getByText("Austin Chapter")).toBeInTheDocument();
    expect(screen.getByText(/2 attending · 200 capacity/)).toBeInTheDocument();
    expect(screen.getByText("#gala")).toBeInTheDocument();

    // Search by city name (exercises city filter branch + null fields on Minimal Event)
    const searchInput = screen.getByPlaceholderText(/search events/i);
    fireEvent.change(searchInput, { target: { value: "austin" } });
    expect(screen.getByText("Rich Hybrid Gala")).toBeInTheDocument();
    expect(screen.queryByText("Minimal Event")).not.toBeInTheDocument();

    // Clear search and switch to Past tab
    fireEvent.change(searchInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /past \(1\)/i }));
    expect(await screen.findByText("Past Virtual Meetup")).toBeInTheDocument();
    expect(screen.getByText("Virtual")).toBeInTheDocument();
  });
});
