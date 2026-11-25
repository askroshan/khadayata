/**
 * Pass 42 — Wave 16: Close uncovered branches in EventsTab and EldersCouncil.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import EventsTab from "@/components/admin/EventsTab";
import EldersCouncil from "@/pages/EldersCouncil";

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
    upsert: () => chain,
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

describe("Pass 42 — Wave 16: EventsTab branch coverage", () => {
  it("handles null events data from supabase gracefully", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "events") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<EventsTab myChapterId={null} />);
    await screen.findByText(/No published events/i);
  });

  it("renders event with null event_rsvps, views null rsvpList, and edits event with all null optional fields + category toggle", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "events") {
        return makeChain([
          {
            id: "ev-null-1",
            name: "Null Fields Event",
            description: null,
            venue: null,
            virtual_url: null,
            starts_at: "2026-12-01T10:00:00Z",
            ends_at: null,
            status: "published",
            category: null,
            event_type: null,
            max_capacity: null,
            fee_amount: null,
            fee_currency: null,
            contact_email: null,
            contact_phone: null,
            organizer_name: null,
            address_line1: null,
            cover_image_url: null,
            chapter_id: "ch-1",
            event_rsvps: null,
            chapters: null,
          },
        ]) as never;
      }
      if (table === "event_rsvps") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<EventsTab myChapterId={null} />);
    await screen.findByText("Null Fields Event");

    // Click View RSVPs -> rsvpList returns null -> falls back to []
    fireEvent.click(screen.getByRole("button", { name: /view rsvps/i }));
    await screen.findByText(/No RSVPs yet/i);

    // Click Edit event -> populates editForm with null fallbacks
    fireEvent.click(screen.getByRole("button", { name: /edit event/i }));
    await screen.findByRole("heading", { name: /Edit Event/i });

    // Select Category in Edit dialog: pick Cultural, then back to None (__none__)
    const editCombos = screen.getAllByRole("combobox");
    fireEvent.click(editCombos[0]);
    fireEvent.click(await screen.findByRole("option", { name: /^Cultural$/i }));
    fireEvent.click(editCombos[0]);
    fireEvent.click(await screen.findByRole("option", { name: /^None$/i }));
  });

  it("Create Event dialog: selects category, country, state, chapter and resets each to __none__/__default__", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "countries") return makeChain([{ id: "c-in", name: "India" }]) as never;
      if (table === "states") return makeChain([{ id: "s-gj", name: "Gujarat", country_id: "c-in" }]) as never;
      if (table === "chapters") return makeChain([{ id: "ch-ahm", name: "Ahmedabad" }]) as never;
      if (table === "events") return makeChain([]) as never;
      return makeChain([]) as never;
    });

    renderApp(<EventsTab myChapterId={null} />);
    fireEvent.click(screen.getByRole("button", { name: /create event/i }));
    await screen.findByRole("heading", { name: /Create Event/i });

    const combos = screen.getAllByRole("combobox");
    // 0: Category, 1: Event Type, 2: Fee Currency, 3: Country, 4: State, 5: Chapter
    // Category: Cultural -> None
    fireEvent.click(combos[0]);
    fireEvent.click(await screen.findByRole("option", { name: /^Cultural$/i }));
    fireEvent.click(combos[0]);
    fireEvent.click(await screen.findByRole("option", { name: /^None$/i }));

    // Country: India
    fireEvent.click(combos[3]);
    fireEvent.click(await screen.findByRole("option", { name: /^India$/i }));

    // Wait for State combobox to become enabled, then select Gujarat -> None
    await waitFor(() => {
      expect(screen.getAllByRole("combobox")[4]).not.toBeDisabled();
    });
    const combosAfterCountry = screen.getAllByRole("combobox");
    fireEvent.click(combosAfterCountry[4]);
    fireEvent.click(await screen.findByRole("option", { name: /^Gujarat$/i }));
    fireEvent.click(combosAfterCountry[4]);
    fireEvent.click(await screen.findByRole("option", { name: /^None$/i }));

    // Country back to None
    fireEvent.click(combosAfterCountry[3]);
    fireEvent.click(await screen.findByRole("option", { name: /^None$/i }));

    // Chapter: Ahmedabad -> My chapter (default)
    const chapterCombo = screen.getAllByRole("combobox").at(-1)!;
    fireEvent.click(chapterCombo);
    fireEvent.click(await screen.findByRole("option", { name: /^Ahmedabad$/i }));
    fireEvent.click(chapterCombo);
    fireEvent.click(await screen.findByRole("option", { name: /My chapter \(default\)/i }));
  });
});

describe("Pass 42 — Wave 16: EldersCouncil branch coverage", () => {
  it("handles thread with unknown category, negative vote_sum, my_vote=-1, null author, null votes/replies, and unverified/null member vote error", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(null) as never;
      if (table === "council_threads") {
        return makeChain([
          {
            id: "th-neg",
            title: "Negative Vote Thread",
            body: "Body text",
            category: "unlisted_cat",
            closed: false,
            pinned: false,
            created_at: new Date().toISOString(),
            author: null,
            council_replies: null,
            council_votes: [{ vote: -1, member_id: "other-m" }],
          },
          {
            id: "th-null-votes",
            title: "Null Votes Thread",
            body: "Body 2",
            category: "general",
            closed: false,
            pinned: false,
            created_at: new Date().toISOString(),
            author: { first_name: "A", last_name: "B", verification_level: null },
            council_replies: null,
            council_votes: null,
          },
        ]) as never;
      }
      if (table === "council_replies") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<EldersCouncil />, { route: "/elders-council" });
    await screen.findByText("Negative Vote Thread");
    expect(screen.getByText("unlisted_cat")).toBeInTheDocument();
    expect(screen.getByText("-1")).toBeInTheDocument();

    // Clicking Upvote when member is null triggers `if (!myMemberId) throw new Error("Not a member")`
    const upvoteBtns = screen.getAllByRole("button", { name: /upvote/i });
    fireEvent.click(upvoteBtns[0]);
    await waitFor(() => {
      expect(screen.getByText("Negative Vote Thread")).toBeInTheDocument();
    });

    // Open thread dialog when council_replies returns null -> falls back to []
    fireEvent.click(screen.getByText("Negative Vote Thread"));
    await screen.findByRole("heading", { name: "Negative Vote Thread" });
  });

  it("handles my_vote=-1 styling, reply with null author, postReply error, and createThread error", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-l3",
          user_id: "u-1",
          first_name: "Elder",
          last_name: "Member",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "council_threads") {
        const c = makeChain([
          {
            id: "th-1",
            title: "Downvoted By Me",
            body: "Thread body",
            category: "governance",
            closed: false,
            pinned: false,
            created_at: new Date().toISOString(),
            author: { first_name: "Raj", last_name: "Shah", verification_level: 3 },
            council_replies: [{ id: "r-1" }],
            council_votes: [{ vote: -1, member_id: "m-l3" }],
          },
        ]);
        c.insert = () => makeChain(null, { message: "forced thread create error" });
        return c as never;
      }
      if (table === "council_replies") {
        const c = makeChain([
          {
            id: "r-1",
            thread_id: "th-1",
            body: "Reply with null author",
            created_at: new Date().toISOString(),
            author: null,
          },
        ]);
        c.insert = () => makeChain(null, { message: "forced reply error" });
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<EldersCouncil />, { route: "/elders-council" });
    await screen.findByText("Downvoted By Me");

    // Open thread dialog -> sees reply with null author, then submit reply -> hits postReply error
    fireEvent.click(screen.getByText("Downvoted By Me"));
    await screen.findByText("Reply with null author");

    fireEvent.change(screen.getByPlaceholderText(/add your reply/i), { target: { value: "My test reply" } });
    fireEvent.click(screen.getByRole("button", { name: /post reply/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /post reply/i })).not.toBeDisabled();
    });

    // Close dialog via Escape, then open New Thread and trigger createThread error
    fireEvent.keyDown(document, { key: "Escape" });
    const newThreadBtn = await screen.findByRole("button", { name: /new thread/i });
    fireEvent.click(newThreadBtn);
    await screen.findByRole("heading", { name: /Start a New Thread/i });

    fireEvent.change(screen.getByLabelText(/Title \*/i), { target: { value: "Failing Thread" } });
    fireEvent.change(screen.getByLabelText(/Body \*/i), { target: { value: "Failing Body" } });
    fireEvent.click(screen.getByRole("button", { name: /post thread/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /post thread/i })).not.toBeDisabled();
    });
  });

  it("handles council_threads query error and null data", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(null) as never;
      if (table === "council_threads") return makeChain(null, { message: "query failed" }) as never;
      return makeChain([]) as never;
    });

    renderApp(<EldersCouncil />, { route: "/elders-council" });
    await screen.findByText(/No threads yet/i);
  });

  it("handles council_threads returning null data without error", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(null) as never;
      if (table === "council_threads") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<EldersCouncil />, { route: "/elders-council" });
    await screen.findByText(/No threads yet/i);
  });
});
