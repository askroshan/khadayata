/**
 * Pass 51 — Wave 19: Close remaining uncovered branches in
 * ChapterContact.tsx and PublicBusiness.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { ChapterContact } from "@/components/profile/ChapterContact";
import PublicBusiness from "@/pages/PublicBusiness";

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

describe("Pass 51 — Wave 19: ChapterContact uncovered branches", () => {
  it("handles null member/role in committee rows and null member_contacts data", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-self",
          user_id: "u-self",
          first_name: "Self",
          last_name: "Member",
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-null",
            start_date: null,
            end_date: null,
            roles: null,
            members: null,
          },
          {
            id: "ra-1",
            start_date: null,
            end_date: null,
            roles: null,
            members: { id: "cm-1", first_name: "Asha", last_name: "Patel" },
          },
        ]) as never;
      }
      if (table === "member_contacts") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ChapterContact />);
    expect(await screen.findByText("Asha Patel")).toBeInTheDocument();
    expect(screen.getByText("Committee Member")).toBeInTheDocument();
  });

  it("triggers validation error when subject exceeds 200 chars and catches send-email failure", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-self",
          user_id: "u-self",
          first_name: "Self",
          last_name: "Member",
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-1",
            start_date: null,
            end_date: null,
            roles: { name: "Secretary", scope: "chapter", chapter_id: "ch-1" },
            members: { id: "cm-1", first_name: "Kiran", last_name: "Shah" },
          },
        ]) as never;
      }
      if (table === "member_contacts") {
        return makeChain([
          { member_id: "cm-1", type: "email", value: "kiran@example.com" },
          { member_id: "cm-1", type: "phone", value: "555-0100" },
        ]) as never;
      }
      if (table === "chapter_messages") {
        const c = makeChain(null);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);
    const invokeSpy = vi.fn().mockRejectedValue(new Error("email service down"));
    vi.spyOn(supabase, "functions", "get").mockReturnValue({ invoke: invokeSpy } as never);

    renderApp(<ChapterContact />);
    expect(await screen.findByText("Kiran Shah")).toBeInTheDocument();
    // Wait for member_contacts query to resolve so target.email is populated
    expect(await screen.findByLabelText("Call Kiran Shah")).toBeInTheDocument();

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: /send a message/i }));

    // Select committee member
    const trigger = await screen.findByRole("combobox");
    fireEvent.click(trigger);
    const option = await screen.findByRole("option", { name: /Secretary — Kiran Shah/i });
    fireEvent.click(option);

    // 1. Trigger validation error (> 200 chars subject)
    const subjectInput = screen.getByPlaceholderText("Brief subject...");
    const bodyInput = screen.getByPlaceholderText("Write your message...");
    fireEvent.change(subjectInput, { target: { value: "x".repeat(201) } });
    fireEvent.change(bodyInput, { target: { value: "Hello committee" } });
    fireEvent.click(screen.getByRole("button", { name: /^Send Message$/i }));

    await waitFor(() => {
      expect(insertSpy).not.toHaveBeenCalled();
    });

    // 2. Valid subject -> insert succeeds, rpc succeeds, send-email rejects (non-blocking catch)
    fireEvent.change(subjectInput, { target: { value: "Valid Subject" } });
    fireEvent.click(screen.getByRole("button", { name: /^Send Message$/i }));

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
      expect(invokeSpy).toHaveBeenCalledWith("send-email", expect.any(Object));
    });
  });
});

describe("Pass 51 — Wave 19: PublicBusiness uncovered branches", () => {
  it("handles null data from businesses and jobs queries and unverified filter", async () => {
    const eqSpy = vi.fn();
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "businesses" || table === "jobs") {
        const c = makeChain(null);
        const origEq = c.eq as (col: string, val: unknown) => unknown;
        c.eq = (col: string, val: unknown) => {
          eqSpy(table, col, val);
          return origEq(col, val);
        };
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicBusiness />, { route: "/business" });
    expect(await screen.findByText("No businesses found")).toBeInTheDocument();

    // Select "Unverified" in the verified filter combobox (2nd combobox)
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[1]);
    const unverifiedOpt = await screen.findByRole("option", { name: "Unverified" });
    fireEvent.click(unverifiedOpt);

    await waitFor(() => {
      expect(eqSpy).toHaveBeenCalledWith("businesses", "verified", false);
    });
  });

  it("handles query errors for businesses and jobs (triggers error throws and length ?? 0)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "businesses") {
        return makeChain(null, { message: "businesses failed" }) as never;
      }
      if (table === "jobs") {
        return makeChain(null, { message: "jobs failed" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicBusiness />, { route: "/business" });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Businesses \(0\)/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Jobs \(0\)/i })).toBeInTheDocument();
    });
  });

  it("renders jobs with default currency/period, decimal Lakh salary, and min-only / max-only experience", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "businesses") {
        return makeChain([]) as never;
      }
      if (table === "jobs") {
        return makeChain([
          {
            id: "job-1",
            title: "Senior Engineer",
            description: "Build systems",
            location: "Ahmedabad",
            remote: true,
            employment_type: "full_time",
            salary_min: 150000,
            salary_max: 250000,
            salary_currency: null,
            salary_period: null,
            experience_min: 3,
            experience_max: null,
            education_required: "B.Tech",
            skills_required: ["TypeScript"],
            benefits: null,
            positions_available: 1,
            countries: { name: "India" },
            states: { name: "Gujarat" },
            cities: { name: "Ahmedabad" },
            businesses: { name: "Khadayata Tech" },
          },
          {
            id: "job-2",
            title: "Junior Analyst",
            description: "Analyze data",
            location: "Mumbai",
            remote: false,
            employment_type: "part_time",
            salary_min: null,
            salary_max: 50000,
            salary_currency: "USD",
            salary_period: "monthly",
            experience_min: null,
            experience_max: 2,
            education_required: null,
            skills_required: [],
            benefits: null,
            positions_available: 2,
            countries: null,
            states: null,
            cities: null,
            businesses: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicBusiness />, { route: "/business" });

    // Switch to Jobs tab
    const jobsTab = await screen.findByRole("tab", { name: /Jobs \(2\)/i });
    fireEvent.mouseDown(jobsTab);
    fireEvent.click(jobsTab);

    expect(await screen.findByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText(/INR 1\.5L–2\.5L \/ annual/)).toBeInTheDocument();
    expect(screen.getByText(/3\+ yrs exp/)).toBeInTheDocument();
    expect(screen.getByText("Junior Analyst")).toBeInTheDocument();
    expect(screen.getByText(/up to 2 yrs exp/)).toBeInTheDocument();
  });
});
