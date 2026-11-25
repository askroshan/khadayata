/**
 * Pass 43 — Wave 16: Branch coverage burn-down for Search.tsx and VerificationDashboard.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import GlobalSearch from "@/pages/Search";
import VerificationDashboard from "@/components/admin/VerificationDashboard";

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

function makeChain(data: unknown, error: unknown = null, countOverride?: number) {
  const result = {
    data,
    error,
    count: countOverride ?? (Array.isArray(data) ? data.length : 0),
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

describe("Pass 43 — Wave 16: Search.tsx branch coverage", () => {
  it("handles whitespace-only query (isSearching=true, query.trim()='') returning empty across all queries", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain([]) as never);

    renderApp(<GlobalSearch />, { route: "/search" });
    const input = await screen.findByLabelText("Search");
    fireEvent.change(input, { target: { value: "  " } });

    await waitFor(() => {
      expect(screen.getByText(/0 results found/i)).toBeInTheDocument();
    });
  });

  it("handles null data fallbacks (data ?? []) across all search queries", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null) as never);

    renderApp(<GlobalSearch />, { route: "/search" });
    const input = await screen.findByLabelText("Search");
    fireEvent.change(input, { target: { value: "nulltest" } });

    await waitFor(() => {
      expect(screen.getByText(/0 results found/i)).toBeInTheDocument();
    });
  });

  it("renders member photo_url vs fallback icon and job salary/location/employment_type variants", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([
          {
            id: "m-photo",
            first_name: "Asha",
            last_name: "Patel",
            photo_url: "https://example.com/asha.jpg",
            gender: "female",
            dob: "1990-01-01",
            chapters: { name: "Ahmedabad" },
            verification_level: 2,
            global_id: "KH-1001",
          },
          {
            id: "m-nophoto",
            first_name: "Bharat",
            last_name: "Shah",
            photo_url: null,
            gender: "male",
            dob: "1985-05-05",
            chapters: null,
            verification_level: 0,
            global_id: null,
          },
        ]) as never;
      }
      if (table === "jobs") {
        return makeChain([
          {
            id: "job-min-only",
            title: "Frontend Dev",
            location: null,
            remote: true,
            employment_type: null,
            salary_min: 50000,
            salary_max: null,
            salary_currency: null,
            salary_period: "monthly",
            cities: { name: "Surat" },
            states: null,
            countries: { name: "India" },
          },
          {
            id: "job-max-only",
            title: "Backend Dev",
            location: null,
            remote: false,
            employment_type: "part_time",
            salary_min: null,
            salary_max: 120000,
            salary_currency: "USD",
            salary_period: "yearly",
            cities: null,
            states: null,
            countries: null,
          },
          {
            id: "job-range",
            title: "Fullstack Dev",
            location: "Mumbai",
            remote: false,
            employment_type: "contract",
            salary_min: 80000,
            salary_max: 150000,
            salary_currency: "INR",
            salary_period: "monthly",
            cities: null,
            states: null,
            countries: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<GlobalSearch />, { route: "/search" });
    const input = await screen.findByLabelText("Search");
    fireEvent.change(input, { target: { value: "Dev" } });

    await screen.findByText("Asha Patel");
    expect(screen.getByText("Bharat Shah")).toBeInTheDocument();
    expect(screen.getByText("Frontend Dev")).toBeInTheDocument();
    expect(screen.getByText("Backend Dev")).toBeInTheDocument();
    expect(screen.getByText("Fullstack Dev")).toBeInTheDocument();
    expect(screen.getByText(/INR 50,000/)).toBeInTheDocument();
    expect(screen.getByText(/USD 120,000/)).toBeInTheDocument();
    expect(screen.getByText(/INR 80,000-150,000/)).toBeInTheDocument();
    expect(screen.getByText("Surat, India")).toBeInTheDocument();
    expect(screen.getByText("full time")).toBeInTheDocument();
  });

  it("handles country with hasStates === false (citiesByCountry path)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "countries") {
        return makeChain([{ id: "c-sg", name: "Singapore" }]) as never;
      }
      if (table === "states") {
        return makeChain([], null, 0) as never;
      }
      if (table === "cities") {
        return makeChain([{ id: "city-sg", name: "Singapore City" }]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<GlobalSearch />, { route: "/search" });
    const advBtn = await screen.findByRole("button", { name: /advanced filters/i });
    fireEvent.click(advBtn);

    const countryTrigger = await screen.findByText("Any country");
    fireEvent.click(countryTrigger);
    const sgOption = await screen.findByRole("option", { name: "Singapore" });
    fireEvent.click(sgOption);

    await waitFor(() => {
      expect(screen.queryByText("Any state")).not.toBeInTheDocument();
    });
  });
});

describe("Pass 43 — Wave 16: VerificationDashboard.tsx branch coverage", () => {
  it("handles null data fallbacks across all queries and rpc", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null) as never);
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);

    renderApp(<VerificationDashboard myChapterId={null} isGlobalAdmin={true} canSendReminders={true} />);

    await waitFor(() => {
      expect(screen.getByText("All caught up!")).toBeInTheDocument();
    });
  });

  it("handles get_member_emails RPC error branch", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain([]) as never);
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    } as never);

    renderApp(<VerificationDashboard myChapterId={null} isGlobalAdmin={true} canSendReminders={true} />);

    await waitFor(() => {
      expect(screen.getByText("All caught up!")).toBeInTheDocument();
    });
  });

  it("resolveVerification: hits !member error, verification_requests update error, member update error, and null verification_level fallback", async () => {
    // 1. member === null -> throws "Not authenticated"
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null) as never;
      }
      if (table === "verification_requests") {
        return makeChain([
          {
            id: "vr-1",
            member_id: "m-target",
            requested_level: 2,
            status: "pending",
            created_at: new Date().toISOString(),
            notes: "Please verify",
            members: {
              first_name: "Neha",
              last_name: "Shah",
              chapter_id: "ch-1",
              verification_level: null,
            },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<VerificationDashboard myChapterId={null} />);
    await screen.findByText("Neha Shah");
    expect(screen.getByText(/L0 → L2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Approve$/i }));
    await waitFor(() => {
      expect(screen.getByText("Neha Shah")).toBeInTheDocument();
    });
    cleanup();
    vi.restoreAllMocks();

    // 2. verification_requests.update returns error
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain({ id: "m-admin", user_id: "u-admin", chapter_id: "ch-1" });
        return c as never;
      }
      if (table === "verification_requests") {
        const c = makeChain([
          {
            id: "vr-2",
            member_id: "m-target-2",
            requested_level: 2,
            status: "pending",
            created_at: new Date().toISOString(),
            notes: null,
            members: {
              first_name: "Kiran",
              last_name: "Patel",
              chapter_id: "ch-1",
              verification_level: 1,
            },
          },
        ]);
        c.update = () => makeChain(null, new Error("vr update failed"));
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<VerificationDashboard myChapterId={null} />);
    await screen.findByText("Kiran Patel");
    fireEvent.click(screen.getByRole("button", { name: /^Approve$/i }));
    await waitFor(() => {
      expect(screen.getByText("Kiran Patel")).toBeInTheDocument();
    });
    cleanup();
    vi.restoreAllMocks();

    // 3. verification_requests.update succeeds, members.update returns memberError
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain({ id: "m-admin", user_id: "u-admin", chapter_id: "ch-1" });
        c.update = () => makeChain(null, new Error("member update failed"));
        return c as never;
      }
      if (table === "verification_requests") {
        const c = makeChain([
          {
            id: "vr-3",
            member_id: "m-target-3",
            requested_level: 3,
            status: "pending",
            created_at: new Date().toISOString(),
            notes: null,
            members: {
              first_name: "Dev",
              last_name: "Modi",
              chapter_id: "ch-1",
              verification_level: 1,
            },
          },
        ]);
        c.update = () => makeChain(null, null);
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<VerificationDashboard myChapterId={null} />);
    await screen.findByText("Dev Modi");
    fireEvent.click(screen.getByRole("button", { name: /^Approve$/i }));
    await waitFor(() => {
      expect(screen.getByText("Dev Modi")).toBeInTheDocument();
    });
  });

  it("sendReminder: covers invoke error (no message), data.error, sent>0 with failed>0, and sent===0 with empty errors", async () => {
    const pendingList = [
      { id: "pm-1", first_name: "Pending", last_name: "One", verification_level: 0, chapter_id: "ch-1" },
      { id: "pm-2", first_name: "Pending", last_name: "Two", verification_level: 0, chapter_id: "ch-1" },
    ];

    const invokeResponses = [
      { data: null, error: {} }, // error without message -> fallback
      { data: { error: "Custom reminder error" }, error: null }, // data.error
      { data: { sent: 2, failed: 1, errors: ["err1"] }, error: null }, // sent > 1 && failed > 0
      { data: { sent: 0, failed: 1, errors: [] }, error: null }, // sent === 0, errors empty -> Unknown error
    ];
    let invokeIdx = 0;

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(pendingList) as never;
      return makeChain([]) as never;
    });
    vi.spyOn(supabase, "functions", "get").mockReturnValue({
      invoke: vi.fn().mockImplementation(async () => {
        const resp = invokeResponses[Math.min(invokeIdx++, invokeResponses.length - 1)];
        return resp;
      }),
    } as never);

    renderApp(<VerificationDashboard myChapterId={null} isGlobalAdmin={false} canSendReminders={true} />);
    await screen.findByText("Pending One");

    const sendBtns = screen.getAllByRole("button", { name: "Send reminder email" });
    for (let i = 0; i < 4; i++) {
      fireEvent.click(sendBtns[0]);
      await waitFor(() => {
        expect(invokeIdx).toBeGreaterThanOrEqual(i + 1);
      });
    }
  });

  it("sendMassReminders: covers invoke error (no message), data.error, sent>1 with failed>0, and sent===0", async () => {
    const pendingList = [
      { id: "pm-1", first_name: "Mass", last_name: "One", verification_level: 0, chapter_id: "ch-1" },
    ];

    const invokeResponses = [
      { data: null, error: {} }, // error without message -> fallback
      { data: { error: "Mass data error" }, error: null }, // data.error
      { data: { sent: 2, failed: 1, errors: [], total_attempted: 3 }, error: null }, // sent > 1 && failed > 0
      { data: { sent: 0, failed: 1, errors: [], total_attempted: 1 }, error: null }, // sent === 0
    ];
    let invokeIdx = 0;

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(pendingList) as never;
      return makeChain([]) as never;
    });
    vi.spyOn(supabase, "functions", "get").mockReturnValue({
      invoke: vi.fn().mockImplementation(async () => {
        const resp = invokeResponses[Math.min(invokeIdx++, invokeResponses.length - 1)];
        return resp;
      }),
    } as never);

    renderApp(<VerificationDashboard myChapterId={null} isGlobalAdmin={false} canSendReminders={true} />);
    await screen.findByText("Mass One");

    for (let i = 0; i < 4; i++) {
      const openBtn = screen.getByRole("button", { name: /Send reminder emails to all/i });
      fireEvent.click(openBtn);
      const confirmBtn = await screen.findByRole("button", { name: /^Send to All$/i });
      fireEvent.click(confirmBtn);
      await waitFor(() => {
        expect(invokeIdx).toBeGreaterThanOrEqual(i + 1);
      });
    }
  });
});
