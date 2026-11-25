/**
 * Pass 38 — Wave 14: Branch coverage burn-down for ModeratorDashboard & FinanceTab.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import FinanceTab from "@/components/admin/FinanceTab";

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

function makeChain(data: unknown, error: unknown = null, count: number | null = Array.isArray(data) ? data.length : 0) {
  const result = { data, error, count };
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

const ADMIN_ROLE_ROW = {
  id: "ur-1",
  role_id: "r-1",
  chapter_id: null,
  roles: { name: "Global Admin" },
};

const MEMBER_ROW = {
  id: "m-admin",
  user_id: "u-admin",
  first_name: "Global",
  last_name: "Admin",
  verification_level: 5,
  onboarding_completed: true,
  chapter_id: "ch-1",
  chapters: { name: "Ahmedabad" },
};

describe("Pass 38 — ModeratorDashboard branch coverage", () => {
  it("handles null counts, empty 'all' reports filter, and unknown entity/category/admin_action", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "role_assignments") return makeChain([ADMIN_ROLE_ROW]) as never;
      if (table === "members") return makeChain(MEMBER_ROW, null, null) as never;
      if (table === "reports") {
        return makeChain(null, null, null) as never;
      }
      if (table === "events" || table === "mentorships") {
        return makeChain(null, null, null) as never;
      }
      return makeChain(null, null, null) as never;
    });

    renderApp(<ModeratorDashboard />, { route: "/moderator" });
    expect(await screen.findByText(/No pending reports/i)).toBeInTheDocument();

    // Switch filter to "all" -> hits reportFilter === "all" ? "" : reportFilter
    fireEvent.click(screen.getByRole("button", { name: /^all$/i }));
    expect(await screen.findByText(/No\s+reports/i)).toBeInTheDocument();
  });

  it("renders report with unknown entity_type, unknown category, admin_action + reviewer, and handles resolve error", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("resolve failed")));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "role_assignments") return makeChain([ADMIN_ROLE_ROW]) as never;
      if (table === "members") return makeChain(MEMBER_ROW) as never;
      if (table === "reports") {
        const c = makeChain(
          [
            {
              id: "rep-1",
              entity_type: "unknown_entity",
              entity_id: "ent-1",
              category: "custom_category",
              reason: "Suspicious activity",
              status: "pending",
              admin_action: "warned",
              admin_notes: "Previous note",
              reviewed_at: null,
              created_at: new Date().toISOString(),
              reporter: { id: "m-2", first_name: "Raj", last_name: "Patel", photo_url: null },
              reviewer: { id: "m-3", first_name: "Mod", last_name: "Reviewer" },
            },
          ],
          null,
          1
        );
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([], null, 0) as never;
    });

    renderApp(<ModeratorDashboard />, { route: "/moderator" });
    expect(await screen.findByText("custom_category")).toBeInTheDocument();
    expect(screen.getByText(/by Mod Reviewer/i)).toBeInTheDocument();

    // Open Act dialog and click Dismiss to hit resolveReport error branch
    fireEvent.click(screen.getByRole("button", { name: /act/i }));
    const dismissBtn = await screen.findByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  it("handles reports query error gracefully", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "role_assignments") return makeChain([ADMIN_ROLE_ROW]) as never;
      if (table === "members") return makeChain(MEMBER_ROW) as never;
      if (table === "reports") return makeChain(null, new Error("db error"), 0) as never;
      return makeChain([], null, 0) as never;
    });

    renderApp(<ModeratorDashboard />, { route: "/moderator" });
    expect(await screen.findByRole("heading", { name: /Moderator Dashboard/i })).toBeInTheDocument();
  });

  it("Members tab: handles null fields, CSV export with null fields, and updateLevel error", async () => {
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();

    const memberUpdateSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("update failed")));
    let membersSelectCount = 0;

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "role_assignments") return makeChain([ADMIN_ROLE_ROW]) as never;
      if (table === "members") {
        membersSelectCount += 1;
        // First calls are useMember (single/maybeSingle) and stats count; dirMembers uses order("last_name")
        const chain = makeChain([
          {
            id: "m-null",
            first_name: null,
            last_name: null,
            verification_level: null,
            chapter_id: null,
            chapters: null,
          },
        ]);
        chain.maybeSingle = () => Promise.resolve({ data: MEMBER_ROW, error: null });
        chain.single = () => Promise.resolve({ data: MEMBER_ROW, error: null });
        chain.update = memberUpdateSpy;
        return chain as never;
      }
      return makeChain([], null, 0) as never;
    });

    renderApp(<ModeratorDashboard />, { route: "/moderator" });
    const membersTab = await screen.findByRole("tab", { name: /members/i });
    fireEvent.mouseDown(membersTab);
    fireEvent.click(membersTab);

    expect(await screen.findByText("L0")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();

    // Export CSV with null fields
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(URL.createObjectURL).toHaveBeenCalled();

    // Click upgrade button to hit updateLevel error branch
    const upgradeBtn = screen.getByRole("button", { name: /upgrade/i });
    fireEvent.click(upgradeBtn);
    await waitFor(() => {
      expect(memberUpdateSpy).toHaveBeenCalled();
    });

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    expect(membersSelectCount).toBeGreaterThan(0);
  });

  it("Analytics tab: handles null donations/reports data and populated donations/reports", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "role_assignments") return makeChain([ADMIN_ROLE_ROW]) as never;
      if (table === "members") return makeChain(MEMBER_ROW, null, null) as never;
      if (table === "event_rsvps") return makeChain(null, null, null) as never;
      if (table === "donations") return makeChain([{ amount: null }, { amount: 250000 }]) as never;
      if (table === "reports") {
        return makeChain([
          { id: "r1", status: "resolved", entity_type: "member", category: "fake", created_at: new Date().toISOString() },
          { id: "r2", status: "pending", entity_type: "event", category: "harassment", created_at: new Date().toISOString() },
        ]) as never;
      }
      return makeChain([], null, 0) as never;
    });

    renderApp(<ModeratorDashboard />, { route: "/moderator" });
    const analyticsTab = await screen.findByRole("tab", { name: /analytics/i });
    fireEvent.mouseDown(analyticsTab);
    fireEvent.click(analyticsTab);

    expect(await screen.findByText(/Report Status Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/₹2,500/)).toBeInTheDocument();
  });

  it("Analytics tab: handles null donations and null reports arrays", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "role_assignments") return makeChain([ADMIN_ROLE_ROW]) as never;
      if (table === "members") return makeChain(MEMBER_ROW, null, null) as never;
      if (table === "event_rsvps") return makeChain(null, null, null) as never;
      if (table === "donations") return makeChain(null, null, null) as never;
      if (table === "reports") return makeChain(null, null, null) as never;
      return makeChain(null, null, null) as never;
    });

    renderApp(<ModeratorDashboard />, { route: "/moderator" });
    const analyticsTab = await screen.findByRole("tab", { name: /analytics/i });
    fireEvent.mouseDown(analyticsTab);
    fireEvent.click(analyticsTab);

    expect(await screen.findByText("₹0")).toBeInTheDocument();
  });
});

describe("Pass 38 — FinanceTab branch coverage", () => {
  it("handles null data across all queries (empty states)", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null, null, 0) as never);

    renderApp(<FinanceTab myChapterId={null} />);
    expect(await screen.findByText(/No donations found/i)).toBeInTheDocument();

    const aidTab = screen.getByRole("tab", { name: /medical aid/i });
    fireEvent.mouseDown(aidTab);
    fireEvent.click(aidTab);
    expect(await screen.findByText(/No medical aid requests/i)).toBeInTheDocument();

    const schTab = screen.getByRole("tab", { name: /scholarships/i });
    fireEvent.mouseDown(schTab);
    fireEvent.click(schTab);
    expect(await screen.findByText(/No scholarship applications/i)).toBeInTheDocument();

    const hallTab = screen.getByRole("tab", { name: /hall bookings/i });
    fireEvent.mouseDown(hallTab);
    fireEvent.click(hallTab);
    expect(await screen.findByText(/No hall booking requests/i)).toBeInTheDocument();

    const fundsTab = screen.getByRole("tab", { name: /fund management/i });
    fireEvent.mouseDown(fundsTab);
    fireEvent.click(fundsTab);
    expect(await screen.findByText(/No funds found/i)).toBeInTheDocument();
  });

  it("Donations search with null donor_name/member/fund fields and chapter-scoped filter", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "donations") {
        return makeChain([
          {
            id: "don-1",
            donor_name: null,
            amount: 1000,
            currency: "INR",
            status: "succeeded",
            fund_id: "f-1",
            created_at: new Date().toISOString(),
            payment_method: "upi",
            pan_number: "ABCDE1234F",
            type: "recurring",
            recurring_interval: "monthly",
            funds: null,
            members: { first_name: null, last_name: null },
          },
          {
            id: "don-2",
            donor_name: "Matched Donor",
            amount: 500,
            currency: "INR",
            status: "pending",
            fund_id: "f-2",
            created_at: new Date().toISOString(),
            funds: { name: "Chapter Fund", chapter_id: "ch-1" },
            members: { first_name: "A", last_name: "B" },
          },
        ]) as never;
      }
      if (table === "funds") {
        return makeChain([
          { id: "f-1", name: "Global Fund", currency: "INR", scope: "global", active: false, chapter_id: null, chapters: null },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<FinanceTab myChapterId="ch-1" />);
    expect(await screen.findByText("Matched Donor")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search donor, fund/i);
    fireEvent.change(searchInput, { target: { value: "Matched" } });
    expect(screen.getByText(/1 records/i)).toBeInTheDocument();
  });

  it("Medical Aid, Scholarships, Hall Bookings: unknown statuses, null amount_needed approval, and missing member profile errors", async () => {
    const aidUpdateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        // Return null for maybeSingle so createAidMutation and createBookingMutation hit !member
        return makeChain(null) as never;
      }
      if (table === "medical_aid_requests") {
        const c = makeChain([
          {
            id: "aid-1",
            patient_name: "Patient One",
            relation: "self",
            condition_summary: "Surgery",
            amount_needed: null,
            approved_amount: null,
            currency: "INR",
            status: "pending",
            created_at: new Date().toISOString(),
            members: { first_name: "A", last_name: "B" },
          },
          {
            id: "aid-2",
            patient_name: "Patient Unknown",
            relation: "parent",
            condition_summary: "Checkup",
            amount_needed: 5000,
            approved_amount: 4000,
            currency: "INR",
            status: "custom_status",
            created_at: new Date().toISOString(),
            members: { first_name: "C", last_name: "D" },
          },
        ]);
        c.update = aidUpdateSpy;
        return c as never;
      }
      if (table === "scholarship_applications") {
        return makeChain([
          {
            id: "app-1",
            status: "custom_status",
            essay: "My essay",
            created_at: new Date().toISOString(),
            scholarships: { name: "Merit Award", amount: 10000, currency: "INR" },
            members: { first_name: "Stu", last_name: "Dent" },
          },
        ]) as never;
      }
      if (table === "hall_bookings") {
        return makeChain([
          {
            id: "hb-1",
            hall_name: "Main Hall",
            status: "custom_status",
            booking_date: "2026-12-01",
            start_time: "09:00",
            end_time: "12:00",
            purpose: "Meeting",
            guests: 50,
            created_at: new Date().toISOString(),
            members: { first_name: "Host", last_name: "One" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<FinanceTab myChapterId="ch-1" />);

    // Medical Aid tab: Review pending request with null amount_needed and approve with empty amount
    const aidTab = screen.getByRole("tab", { name: /medical aid/i });
    fireEvent.mouseDown(aidTab);
    fireEvent.click(aidTab);
    expect(await screen.findByText("Patient Unknown")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^review$/i }));
    const approveBtn = await screen.findByRole("button", { name: /approve/i });
    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(aidUpdateSpy).toHaveBeenCalled();
    });

    // New Medical Aid Request -> hits !member error
    fireEvent.click(screen.getByRole("button", { name: /new request/i }));
    fireEvent.change(await screen.findByPlaceholderText(/full name of patient/i), { target: { value: "New Patient" } });
    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));
    fireEvent.keyDown(document.body, { key: "Escape" });

    // Scholarships tab -> unknown status badge
    const schTab = screen.getByRole("tab", { name: /scholarships/i });
    fireEvent.mouseDown(schTab);
    fireEvent.click(schTab);
    expect(await screen.findByText("Merit Award")).toBeInTheDocument();

    // Hall Bookings tab -> unknown status badge + New Booking -> hits !member error
    const hallTab = screen.getByRole("tab", { name: /hall bookings/i });
    fireEvent.mouseDown(hallTab);
    fireEvent.click(hallTab);
    expect(await screen.findByText("Main Hall")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new booking/i }));
    fireEvent.change(await screen.findByPlaceholderText(/community hall/i), { target: { value: "Banquet Hall" } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-12-15" } });
    fireEvent.click(screen.getByRole("button", { name: /submit booking/i }));
  });

  it("Fund Management: createFund error branch and editFund with chapter scope", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("insert fund failed")));
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "funds") {
        const c = makeChain([
          {
            id: "f-1",
            name: "Chapter Welfare",
            currency: "INR",
            scope: "chapter",
            active: true,
            chapter_id: "",
            chapters: { name: "Ahmedabad" },
          },
        ]);
        c.insert = insertSpy;
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<FinanceTab myChapterId="ch-1" />);
    const fundsTab = screen.getByRole("tab", { name: /fund management/i });
    fireEvent.mouseDown(fundsTab);
    fireEvent.click(fundsTab);

    expect(await screen.findByText("Chapter Welfare")).toBeInTheDocument();

    // Create Fund -> hits error branch + chapter_id fallback to myChapterId
    fireEvent.click(screen.getByRole("button", { name: /create fund/i }));
    fireEvent.change(await screen.findByPlaceholderText(/education fund/i), { target: { value: "New Fund" } });
    const submitBtns = screen.getAllByRole("button", { name: /create fund/i });
    fireEvent.click(submitBtns[submitBtns.length - 1]);
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });

    // Close dialog by pressing Escape, then Edit Fund -> Save Changes
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /edit fund/i }));
    const saveBtn = await screen.findByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
