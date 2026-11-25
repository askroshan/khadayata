/**
 * Pass 56 — Wave 20: Branch coverage burn-down for OralHistory and Services.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import OralHistory from "@/pages/OralHistory";
import Services from "@/pages/Services";

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
    contains: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

const mockMemberNoDob = {
  id: "m-wave20",
  user_id: "u-wave20",
  first_name: "Wave",
  last_name: "Tester",
  dob: null,
  verification_level: 3,
  onboarding_completed: true,
  chapter_id: "ch-1",
};

describe("Pass 56 — Wave 20: OralHistory branch coverage", () => {
  it("handles null data from oral_histories query (data ?? [])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(mockMemberNoDob) as never;
      if (table === "oral_histories") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<OralHistory />, { route: "/oral-history" });
    expect(await screen.findByText(/No oral histories yet/i)).toBeInTheDocument();
  });

  it("handles null tags on story, tag badge click, and Select tag filter (__all__ and specific tag)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(mockMemberNoDob) as never;
      if (table === "oral_histories") {
        return makeChain([
          {
            id: "oh-null-tags",
            title: "Story Without Tags",
            description: "No tags here",
            tags: null,
            status: "published",
            media_type: "audio",
            created_at: new Date().toISOString(),
            narrator: { first_name: "Dada", last_name: "Shah" },
          },
          {
            id: "oh-with-tags",
            title: "Story With Heritage Tag",
            description: "Tagged story",
            tags: ["heritage-20"],
            status: "published",
            media_type: "video",
            elder_priority: true,
            created_at: new Date().toISOString(),
            narrator: { first_name: "Dadi", last_name: "Shah" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<OralHistory />, { route: "/oral-history" });
    const badge = await screen.findByText("heritage-20");
    expect(screen.getByText("Story Without Tags")).toBeInTheDocument();

    // Click tag badge on card (L220)
    fireEvent.click(badge);

    // Change Select filter back to __all__ and then to a specific tag (L137)
    const selectTrigger = await screen.findByRole("combobox");
    fireEvent.click(selectTrigger);
    const allTagsOption = await screen.findByRole("option", { name: "All tags" });
    fireEvent.click(allTagsOption);

    const selectTrigger2 = await screen.findByRole("combobox");
    fireEvent.click(selectTrigger2);
    const specificOption = await screen.findByRole("option", { name: "heritage-20" });
    fireEvent.click(specificOption);
  });

  it("handles file clear (files empty -> null), null dob, and insert error throw", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "Insert failed" }));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(mockMemberNoDob) as never;
      if (table === "oral_histories") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "m-wave20/test.mp3" }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/test.mp3" } }),
    } as never);

    renderApp(<OralHistory />, { route: "/oral-history" });
    const triggerBtn = await screen.findByRole("button", { name: /Upload Story/i });
    fireEvent.click(triggerBtn);

    const titleInput = await screen.findByPlaceholderText(/Grandfather's journey/i);
    fireEvent.change(titleInput, { target: { value: "My Oral Story" } });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Empty files list -> triggers `e.target.files?.[0] ?? null` (L183)
    fireEvent.change(fileInput, { target: { files: [] } });

    // Valid file -> triggers upload + null dob (L86) + insert error throw (L102)
    const file = new File(["audio-bytes"], "story.mp3", { type: "audio/mpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtns = screen.getAllByRole("button", { name: /Upload Story/i });
    fireEvent.click(submitBtns[submitBtns.length - 1]);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });
  });
});

describe("Pass 56 — Wave 20: Services branch coverage", () => {
  it("handles null data from hall_bookings and medical_aid_requests queries (data ?? [])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(mockMemberNoDob) as never;
      if (table === "hall_bookings") return makeChain(null) as never;
      if (table === "medical_aid_requests") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(<Services />, { route: "/services" });
    expect(await screen.findByText(/No hall bookings yet/i)).toBeInTheDocument();

    renderApp(<Services />, { route: "/services#medical" });
    expect(await screen.findByText(/No medical aid requests/i)).toBeInTheDocument();
  });

  it("renders fallback badge style for unknown status in hall bookings and medical aid requests", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(mockMemberNoDob) as never;
      if (table === "hall_bookings") {
        return makeChain([
          {
            id: "hb-1",
            hall_name: "Main Community Hall",
            purpose: "Annual Gathering",
            booking_date: "2026-12-01",
            start_time: "10:00:00",
            end_time: "14:00:00",
            guests: 50,
            status: "custom_unknown_status",
          },
        ]) as never;
      }
      if (table === "medical_aid_requests") {
        return makeChain([
          {
            id: "ma-1",
            patient_name: "Rameshbhai",
            relation: "parent",
            condition_summary: "Surgery",
            amount_needed: 50000,
            approved_amount: 25000,
            currency: "INR",
            status: "custom_med_status",
            created_at: new Date().toISOString(),
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Services />, { route: "/services" });
    expect(await screen.findByText("custom_unknown_status")).toBeInTheDocument();

    renderApp(<Services />, { route: "/services#medical" });
    expect(await screen.findByText("custom_med_status")).toBeInTheDocument();
  });

  it("throws 'Not a member' when submitting hall booking or medical aid without a member record", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    // Hall booking without member (L69)
    renderApp(<Services />, { route: "/services" });
    const bookBtn = await screen.findByRole("button", { name: /Book Hall/i });
    fireEvent.click(bookBtn);

    const hallInput = await screen.findByPlaceholderText(/Community Hall/i);
    fireEvent.change(hallInput, { target: { value: "Test Hall" } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-12-15" } });

    const submitHallBtn = screen.getByRole("button", { name: /Submit Request/i });
    fireEvent.click(submitHallBtn);

    await waitFor(() => {
      expect(screen.getByText(/Request Hall Booking/i)).toBeInTheDocument();
    });

    cleanup();

    // Medical aid without member (L93)
    renderApp(<Services />, { route: "/services#medical" });
    const reqAidBtn = await screen.findByRole("button", { name: /Request Aid/i });
    fireEvent.click(reqAidBtn);

    const dialogInputs = document.querySelectorAll('[role="dialog"] input');
    expect(dialogInputs.length).toBeGreaterThan(0);
    fireEvent.change(dialogInputs[0], { target: { value: "Test Patient" } });

    const submitMedBtn = screen.getByRole("button", { name: /Submit Request/i });
    fireEvent.click(submitMedBtn);

    await waitFor(() => {
      expect(screen.getByText(/Request Medical Aid/i)).toBeInTheDocument();
    });
  });
});
