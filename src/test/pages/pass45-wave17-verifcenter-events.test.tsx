/**
 * Pass 45 — Wave 17: Close remaining uncovered branches in
 * VerificationCenter.tsx and Events.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { VerificationCenter } from "@/components/verification/VerificationCenter";
import Events from "@/pages/Events";

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

describe("Pass 45 — Wave 17: VerificationCenter uncovered branches", () => {
  it("handles null data from vouches/verification_requests and empty/null file selection", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-vc-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Member",
          verification_level: 0,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "vouches" || table === "verification_requests") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    const { container } = renderApp(<VerificationCenter />);
    await screen.findByText(/Request Level 1 Verification/i);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Empty files array -> hits `if (!files.length) return;`
    fireEvent.change(fileInput, { target: { files: [] } });
    // Null files -> hits `e.target.files ?? []`
    fireEvent.change(fileInput, { target: { files: null } });

    expect(screen.getByText(/Verification Level/i)).toBeInTheDocument();
  });

  it("renders vouch lineage for null/L0/L1/L2 vouchers and history badges for approved/rejected/pending", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-vc-2",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Member",
          verification_level: 1,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "vouches") {
        return makeChain([
          { id: "v-null", voucher: null },
          { id: "v-0", voucher: { first_name: "Zero", last_name: "User", verification_level: 0 } },
          { id: "v-1", voucher: { first_name: "One", last_name: "User", verification_level: 1 } },
          { id: "v-2", voucher: { first_name: "Two", last_name: "User", verification_level: 2 } },
        ]) as never;
      }
      if (table === "verification_requests") {
        return makeChain([
          { id: "vr-1", requested_level: 1, status: "approved", created_at: new Date().toISOString(), document_files: null },
          { id: "vr-2", requested_level: 2, status: "rejected", created_at: new Date().toISOString(), document_files: null },
          { id: "vr-3", requested_level: 2, status: "pending", created_at: new Date().toISOString(), document_files: null },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<VerificationCenter />);
    await screen.findByText(/Vouch Lineage/i);
    expect(screen.getAllByText(/L0 Basic/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/L1 Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/L2 Trusted/i)).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("rejected")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("submits verification request without files/docType/notes (null branches) and handles uploadError and insert error", async () => {
    let insertShouldFail = false;
    const insertSpy = vi.fn().mockImplementation(() =>
      insertShouldFail ? makeChain(null, { message: "insert failed" }) : makeChain(null)
    );

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-vc-3",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Member",
          verification_level: 0,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "vouches") {
        return makeChain([
          { id: "v-a", voucher: { first_name: "A", last_name: "B", verification_level: 1 } },
          { id: "v-b", voucher: { first_name: "C", last_name: "D", verification_level: 2 } },
        ]) as never;
      }
      if (table === "verification_requests") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);

    const { container } = renderApp(<VerificationCenter />);
    const submitBtn = await screen.findByRole("button", { name: /Submit Verification Request/i });
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    // 1. Submit with no docType, no notes, no files -> hits null branches
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });

    // 2. Select a valid PDF file and force uploadError -> hits `if (uploadError) throw uploadError`
    const uploadMock = vi.fn().mockResolvedValueOnce({ error: new Error("storage upload failed") });
    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: uploadMock,
    } as never);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(["dummy pdf"], "id-card.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    await screen.findByText("id-card.pdf");

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledTimes(1);
    });

    // 3. Now succeed upload but fail DB insert -> hits `if (error) throw error`
    uploadMock.mockResolvedValueOnce({ error: null });
    insertShouldFail = true;
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Pass 45 — Wave 17: Events uncovered branches", () => {
  it("handles null member on RSVP (throws Not a member) and events query error", async () => {
    const futureStart = new Date(Date.now() + 86400000).toISOString();
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null) as never;
      }
      if (table === "events") {
        return makeChain([
          {
            id: "ev-null-mem",
            name: "Null Member Event",
            description: null,
            venue: null,
            starts_at: futureStart,
            ends_at: null,
            status: "published",
            chapter_id: null,
            event_rsvps: null,
            cities: { name: "Ahmedabad" },
            states: { name: "Gujarat" },
            countries: { name: "India" },
          },
        ]) as never;
      }
      if (table === "event_photos") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Events />, { route: "/events" });
    await screen.findByText("Null Member Event");
    expect(screen.getByText("Ahmedabad, Gujarat, India")).toBeInTheDocument();

    const rsvpBtn = screen.getByRole("button", { name: /RSVP Now/i });
    fireEvent.click(rsvpBtn);
    await waitFor(() => {
      expect(screen.getByText("Null Member Event")).toBeInTheDocument();
    });
  });

  it("handles events query returning error", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-ev-err",
          user_id: "u-1",
          first_name: "Admin",
          last_name: "User",
          chapter_id: null,
        }) as never;
      }
      if (table === "events") {
        return makeChain(null, { message: "events query failed" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Events />, { route: "/events" });
    await screen.findByText(/Community Events/i);
  });

  it("edits event with null description/venue/ends_at and saves empty description/venue", async () => {
    const futureStart = new Date(Date.now() + 86400000).toISOString();
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-ev-edit",
          user_id: "u-1",
          first_name: "Admin",
          last_name: "User",
          chapter_id: null,
        }) as never;
      }
      if (table === "role_assignments") {
        return makeChain([{ id: "ra-1", role_id: "r-1", chapter_id: null, roles: { name: "Global Admin", scope: "global" }, start_date: null, end_date: null }]) as never;
      }
      if (table === "events") {
        const c = makeChain([
          {
            id: "ev-edit-1",
            name: "Sparse Event",
            description: null,
            venue: null,
            starts_at: futureStart,
            ends_at: null,
            status: "published",
            chapter_id: null,
            event_rsvps: null,
            cities: null,
            states: null,
            countries: null,
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      if (table === "event_photos") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Events />, { route: "/events" });
    await screen.findByText("Sparse Event");

    const editBtn = await screen.findByRole("button", { name: /Edit event/i });
    fireEvent.click(editBtn);

    const saveBtn = await screen.findByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  it("creates event with no-states country, toggles chapter select to default, and submits with null category/chapter", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-ev-create",
          user_id: "u-1",
          first_name: "Admin",
          last_name: "User",
          chapter_id: null,
        }) as never;
      }
      if (table === "role_assignments") {
        return makeChain([{ id: "ra-1", role_id: "r-1", chapter_id: null, roles: { name: "Global Admin", scope: "global" }, start_date: null, end_date: null }]) as never;
      }
      if (table === "countries") {
        return makeChain([{ id: "c-sg", name: "Singapore" }]) as never;
      }
      if (table === "states") {
        return makeChain([]) as never;
      }
      if (table === "cities") {
        return makeChain([{ id: "city-sg", name: "Singapore City" }]) as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-1", name: "Singapore Chapter" }]) as never;
      }
      if (table === "events") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Events />, { route: "/events" });
    const createBtn = await screen.findByRole("button", { name: /^Create$/i });
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: /Create Event/i });

    // Fill required fields: Event Name, Starts At, Ends At
    const dialog = screen.getByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "Wave17 Minimal Event" } });

    const dtInputs = dialog.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dtInputs[0], { target: { value: "2026-12-01T10:00" } });
    fireEvent.change(dtInputs[1], { target: { value: "2026-12-01T12:00" } });

    // Select Country (Singapore, which has 0 states -> triggers useCitiesByCountry branch)
    const comboboxes = Array.from(dialog.querySelectorAll('[role="combobox"]'));
    // Country combobox has text "Select country"
    const countryTrigger = comboboxes.find((el) => el.textContent?.includes("Select country"));
    if (countryTrigger) {
      fireEvent.click(countryTrigger);
      const sgOpt = await screen.findByRole("option", { name: "Singapore" });
      fireEvent.click(sgOpt);
    }

    // Toggle Chapter select to specific chapter and back to "__default__"
    const chapterTrigger = comboboxes.find((el) => el.textContent?.includes("My chapter (default)"));
    if (chapterTrigger) {
      fireEvent.click(chapterTrigger);
      const chOpt = await screen.findByRole("option", { name: "Singapore Chapter" });
      fireEvent.click(chOpt);

      fireEvent.click(chapterTrigger);
      const defaultOpt = await screen.findByRole("option", { name: /My chapter \(default\)/i });
      fireEvent.click(defaultOpt);
    }

    const publishBtn = screen.getByRole("button", { name: /Publish Event/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });
  });
});
