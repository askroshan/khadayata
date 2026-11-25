/**
 * Pass 41 — Wave 15: Branch coverage burn-down for Temple.tsx and ChapterDetail.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Temple from "@/pages/Temple";
import ChapterDetail from "@/pages/ChapterDetail";

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

function makeChain(data: unknown, error: unknown = null, count?: number) {
  const result = {
    data,
    error,
    count: count ?? (Array.isArray(data) ? data.length : 0),
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

describe("Pass 41 — Wave 15: Temple.tsx branch coverage", () => {
  it("handles null query responses, null member names, and negative donor wall amount", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-null",
          user_id: "u-1",
          first_name: null,
          last_name: null,
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "funds") {
        return makeChain(null) as never;
      }
      if (table === "donations") {
        const c = makeChain(null);
        c.select = (cols?: string) => {
          if (typeof cols === "string" && cols.includes("donor_name")) {
            return makeChain([
              { amount: -5, currency: "INR", donor_name: null, members: null },
              { amount: 500, currency: "INR", donor_name: null, members: { first_name: "Asha", last_name: "Patel" } },
            ]);
          }
          return makeChain(null);
        };
        return c as never;
      }
      if (table === "settings") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Temple />, { route: "/temple" });
    await screen.findByRole("heading", { name: "Kotyark Temple" });
    await waitFor(() => {
      expect(screen.getByText(/Asha Patel/)).toBeInTheDocument();
    });
  });

  it("submits recurring donation with blank donor_name and default monthly interval, and filters ledger", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: null,
          last_name: null,
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "funds") {
        return makeChain([
          { id: "f-1", name: "Temple Maintenance", active: true },
          { id: "f-2", name: "Annadaan", active: true },
        ]) as never;
      }
      if (table === "donations") {
        const c = makeChain([
          {
            id: "d-1",
            fund_id: "f-1",
            amount: 2000,
            currency: "INR",
            status: "succeeded",
            donor_name: null,
            payment_method: "UPI",
            type: "recurring",
            recurring_interval: "monthly",
            created_at: new Date().toISOString(),
            funds: { name: "Temple Maintenance" },
            members: { first_name: "Kiran", last_name: "Shah" },
          },
          {
            id: "d-2",
            fund_id: "f-2",
            amount: 1000,
            currency: "INR",
            status: "pending",
            donor_name: null,
            payment_method: null,
            type: "one_time",
            recurring_interval: null,
            created_at: new Date().toISOString(),
            funds: null,
            members: null,
          },
        ]);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-1",
            role_id: "r-1",
            roles: { id: "r-1", name: "Global Admin", scope: "global", chapter_id: null },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Temple />, { route: "/temple" });
    await screen.findByText("Make a Donation");

    // Select Fund
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[0]);
    fireEvent.click(await screen.findByRole("option", { name: "Temple Maintenance" }));

    // Enter amount
    fireEvent.change(screen.getByPlaceholderText("Custom amount"), { target: { value: "500" } });

    // Select Donation Type = Recurring (leave interval blank to hit `|| "monthly"`)
    fireEvent.click(comboboxes[2]);
    fireEvent.click(await screen.findByRole("option", { name: /Recurring/i }));

    // Fill required email, phone, address, payment method
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "donor@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("+91..."), { target: { value: "+919876543210" } });

    // Address input (required, empty)
    const textInputs = Array.from(document.querySelectorAll('input:not([type="checkbox"]):not([type="number"]):not([type="email"])')) as HTMLInputElement[];
    const addressInput = textInputs.find((el) => !el.placeholder);
    if (addressInput) {
      fireEvent.change(addressInput, { target: { value: "123 Temple Road" } });
    }

    // Payment method combobox (after Recurring Interval appeared, find the one with "Select method")
    const updatedCombos = screen.getAllByRole("combobox");
    const methodCombo = updatedCombos.find((el) => el.textContent?.includes("Select method")) ?? updatedCombos[4];
    fireEvent.click(methodCombo);
    fireEvent.click(await screen.findByRole("option", { name: "UPI" }));

    // Submit donation
    fireEvent.click(screen.getByRole("button", { name: "Donate" }));
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });

    // Exercise ChapterDonationLedger search & fund filter
    const ledgerSearch = screen.queryByPlaceholderText("Search donor or fund...");
    if (ledgerSearch) {
      fireEvent.change(ledgerSearch, { target: { value: "Temple Maintenance" } });
      fireEvent.change(ledgerSearch, { target: { value: "Kiran" } });
      fireEvent.change(ledgerSearch, { target: { value: "zzzznomatch" } });
      fireEvent.change(ledgerSearch, { target: { value: "" } });

      const allCombos = screen.getAllByRole("combobox");
      const fundFilterCombo = allCombos[allCombos.length - 1];
      fireEvent.click(fundFilterCombo);
      const opt = await screen.findByRole("option", { name: "Annadaan" });
      fireEvent.click(opt);
    }
  });
});

describe("Pass 41 — Wave 15: ChapterDetail.tsx branch coverage", () => {
  it("renders chapter with no location (null city/state/country), L0 hidden email-only contact, null member names, null gallery caption, and null past committee member", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        return makeChain({
          id: "ch-noloc",
          name: "Global Virtual Chapter",
          slug: "virtual",
          cities: null,
          states: null,
          countries: null,
          settings: { contact: { email: "secret@chapter.org" } },
        }) as never;
      }
      if (table === "members") {
        // Return L0 member for useMember (.maybeSingle) and list with null names for useChapterMembers
        const c = makeChain([
          {
            id: "mem-null",
            first_name: null,
            last_name: null,
            photo_url: null,
            global_id: null,
            verification_level: 0,
            onboarding_completed: true,
          },
        ]);
        c.maybeSingle = () =>
          Promise.resolve({
            data: { id: "me-l0", user_id: "u-1", verification_level: 0 },
            error: null,
          });
        return c as never;
      }
      if (table === "event_photos") {
        return makeChain([
          {
            id: "ph-1",
            url: "https://example.com/photo.jpg",
            caption: null,
            created_at: new Date().toISOString(),
            events: { id: "ev-1", name: "Event 1", chapter_id: "ch-noloc", starts_at: new Date().toISOString() },
          },
        ]) as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-past-1",
            start_date: "2020-01-01",
            end_date: "2022-01-01",
            roles: { name: "Secretary", scope: "chapter", chapter_id: "ch-noloc" },
            members: null,
          },
          {
            id: "ra-past-2",
            start_date: "2021-01-01",
            end_date: "2023-01-01",
            roles: { name: "Treasurer", scope: "chapter", chapter_id: "ch-noloc" },
            members: { id: "m-2", first_name: "Meera", last_name: "Shah", photo_url: "https://example.com/meera.jpg" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/chapters/:slug" element={<ChapterDetail />} />
      </Routes>,
      { route: "/chapters/virtual" }
    );

    await screen.findByText("Global Virtual Chapter");
    expect(screen.getByText(/Contact details available after verification/i)).toBeInTheDocument();

    // Open Gallery tab to hit `p.caption ?? "Event photo"`
    const galleryTab = screen.getByRole("tab", { name: /Gallery/i });
    fireEvent.mouseDown(galleryTab, { button: 0, ctrlKey: false });
    fireEvent.click(galleryTab);
    await waitFor(() => {
      expect(screen.getByAltText("Event photo")).toBeInTheDocument();
    });

    // Open History tab to hit `m?.photo_url ?? undefined`
    const historyTab = screen.getByRole("tab", { name: /History/i });
    fireEvent.mouseDown(historyTab, { button: 0, ctrlKey: false });
    fireEvent.click(historyTab);
    await waitFor(() => {
      expect(screen.getByText("Meera Shah")).toBeInTheDocument();
    });
  });

  it("renders chapter with state/country names but no stateCode/countryCode/city", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") {
        return makeChain({
          id: "ch-stateonly",
          name: "Gujarat State Chapter",
          slug: "gujarat-state",
          cities: null,
          states: { name: "Gujarat", code: null },
          countries: { name: "India", iso2: null },
          settings: { contact: { phone: "+911234567890" } },
        }) as never;
      }
      if (table === "members") {
        const c = makeChain([]);
        c.maybeSingle = () =>
          Promise.resolve({
            data: { id: "me-l0", user_id: "u-1", verification_level: 0 },
            error: null,
          });
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/chapters/:slug" element={<ChapterDetail />} />
      </Routes>,
      { route: "/chapters/gujarat-state" }
    );

    await screen.findByText("Gujarat State Chapter");
    expect(screen.getByText("Gujarat, India")).toBeInTheDocument();
  });
});
