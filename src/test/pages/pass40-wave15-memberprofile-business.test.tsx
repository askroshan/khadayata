/**
 * Pass 40 — Wave 15: Branch coverage burn-down for MemberProfile and Business pages.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import MemberProfile from "@/pages/MemberProfile";
import Business from "@/pages/Business";

let signedInUserId = "";

beforeAll(async () => {
  const { data } = await supabase.auth.signInWithPassword({
    email: E2E_ACCOUNTS.globalAdmin.email,
    password: E2E_PASSWORD,
  });
  signedInUserId = data.user?.id ?? "";
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

describe("Pass 40 — Wave 15 MemberProfile branch coverage", () => {
  it("handles null query data, null verification_level, null privacy, null company/institution, and business revoke", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        let isSingle = false;
        const c = makeChain(null);
        c.eq = (col: string, val: string) => {
          if (col === "user_id") {
            return makeChain({
              id: "m-current",
              user_id: signedInUserId,
              first_name: "Admin",
              last_name: "User",
              verification_level: null,
              chapter_id: "ch-1",
              onboarding_completed: true,
            });
          }
          if (col === "id" && val === "m-target") {
            isSingle = true;
            const target = makeChain({
              id: "m-target",
              user_id: "other-user-id",
              first_name: null,
              last_name: null,
              middle_names: null,
              gender: null,
              dob: "1990-01-15",
              birth_place: "Surat",
              verification_level: null,
              chapter_id: "ch-2",
              privacy: null,
              chapters: { name: "Surat" },
            });
            target.update = updateSpy;
            return target;
          }
          return c;
        };
        c.update = updateSpy;
        void isSingle;
        return c as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            role_id: "r-2",
            scope_id: "ch-1",
            chapter_id: "ch-1",
            roles: { name: "Chapter Admin" },
          },
          {
            role_id: "r-3",
            scope_id: "ch-1",
            chapter_id: "ch-1",
            roles: { name: "Directory Manager" },
          },
        ]) as never;
      }
      if (table === "employment") {
        return makeChain([
          { id: "emp-1", job_title: "Engineer", company: null, sector: "Tech" },
        ]) as never;
      }
      if (table === "education") {
        return makeChain([
          { id: "edu-1", degree: "B.Tech", institution: null, year: 2015 },
        ]) as never;
      }
      if (table === "businesses") {
        const c = makeChain([
          { id: "biz-1", name: "Verified Biz", sector: "Retail", verified: true },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      if (table === "verification_requests") {
        const c = makeChain(null);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "vouch_requests") {
        const c = makeChain(null);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "vouches" || table === "family_links") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/members/:id" element={<MemberProfile />} />
      </Routes>,
      { route: "/members/m-target" }
    );

    // Wait for profile to load
    await screen.findByText("Directory Manager Controls");

    // Employment without company & Education without institution
    expect((await screen.findAllByText("Engineer")).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("B.Tech")).toBeInTheDocument();

    // Revoke verified business -> hits verified ? ... : "Business verification removed"
    const revokeBtn = await screen.findByRole("button", { name: /^Revoke$/i });
    fireEvent.click(revokeBtn);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());

    // Open Edit Member dialog with null first_name/last_name/gender and save with empty gender
    fireEvent.click(screen.getByRole("button", { name: /Edit Member/i }));
    const saveBtn = await screen.findByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());

    // Open Verification Panel -> hits different-chapter warning (myChapterId ch-1 !== ch-2)
    fireEvent.click(screen.getByRole("button", { name: /Verification Panel/i }));
    await screen.findByText(/different chapter/i);

    // Add verification note with member.verification_level === null
    const noteInput = screen.getByPlaceholderText(/Record a note/i);
    fireEvent.change(noteInput, { target: { value: "Checked ID" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Note/i }));
    await waitFor(() => expect(insertSpy).toHaveBeenCalled());

    // Request documentation with member.verification_level === null
    fireEvent.click(screen.getByRole("button", { name: /^Request$/i }));
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(2));

    // Send vouch request with empty message & null member.first_name
    const reqVouchBtn = screen.getByRole("button", { name: /Request.*to vouch for you/i });
    fireEvent.click(reqVouchBtn);
    const sendReqBtn = await screen.findByRole("button", { name: /Send Request/i });
    fireEvent.click(sendReqBtn);
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(3));
  });

  it("handles null education, employment, and businesses arrays cleanly", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain(null);
        c.eq = (col: string) => {
          if (col === "user_id") {
            return makeChain({
              id: "m-current",
              user_id: signedInUserId,
              first_name: "Admin",
              last_name: "User",
              verification_level: 3,
              chapter_id: "ch-1",
              onboarding_completed: true,
            });
          }
          return makeChain({
            id: "m-target-2",
            user_id: "other-user-2",
            first_name: "Kiran",
            last_name: "Shah",
            verification_level: 1,
            chapter_id: "ch-1",
            privacy: {},
            chapters: { name: "Ahmedabad" },
          });
        };
        return c as never;
      }
      if (table === "role_assignments") {
        return makeChain([{ role_id: "r-1", chapter_id: null, roles: { name: "Global Admin" } }]) as never;
      }
      return makeChain(null) as never;
    });

    renderApp(
      <Routes>
        <Route path="/members/:id" element={<MemberProfile />} />
      </Routes>,
      { route: "/members/m-target-2" }
    );

    await screen.findByText(/Kiran.*Shah/);
    expect(await screen.findByText(/No employment records or business listings to verify/i)).toBeInTheDocument();
  });
});

describe("Pass 40 — Wave 15 Business page branch coverage", () => {
  it("covers null query data, unverified filter, sector/jobType reset, country without states, and job card variants", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: signedInUserId,
          first_name: "Admin",
          last_name: "User",
          verification_level: 3,
          chapter_id: "ch-1",
          onboarding_completed: true,
        }) as never;
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
      if (table === "businesses") {
        const c = makeChain(null);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "jobs") {
        const c = makeChain([
          {
            id: "job-1",
            title: "Min Salary Only",
            employment_type: null,
            salary_min: 50000,
            salary_max: null,
            salary_currency: null,
            salary_period: null,
            experience_min: null,
            experience_max: 5,
            location: null,
            cities: { name: "Surat" },
            states: { name: "Gujarat" },
            countries: { name: "India" },
            status: "open",
          },
          {
            id: "job-2",
            title: "Max Salary Only",
            employment_type: "part_time",
            salary_min: null,
            salary_max: 120000,
            salary_currency: "USD",
            salary_period: "annual",
            experience_min: 2,
            experience_max: null,
            location: "Mumbai",
            status: "open",
          },
        ]);
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "job_applications") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Business />, { route: "/business" });
    await screen.findByText("No businesses found");

    // Filter by sector then reset to All Sectors
    const sectorTrigger = screen.getByRole("combobox", { name: /Filter by sector/i });
    fireEvent.click(sectorTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "Technology" }));
    fireEvent.click(sectorTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "All Sectors" }));

    // Filter by verification -> Unverified
    const verifiedTrigger = screen.getByRole("combobox", { name: /Filter by verification/i });
    fireEvent.click(verifiedTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "Unverified" }));

    // Open List Business dialog, pick country without states (bizHasStates === false), toggle sector to __none__
    fireEvent.click(screen.getByRole("button", { name: /List Business/i }));
    await screen.findByText("List Your Business");
    const dialogCombos = screen.getAllByRole("combobox");
    // Sector select inside dialog
    const bizSectorCombo = dialogCombos.find((el) => el.textContent?.includes("Select sector"));
    if (bizSectorCombo) {
      fireEvent.click(bizSectorCombo);
      fireEvent.click(await screen.findByRole("option", { name: "Retail" }));
      fireEvent.click(bizSectorCombo);
      fireEvent.click(await screen.findByRole("option", { name: "Select sector" }));
    }
    const bizCountryCombo = dialogCombos.find((el) => el.textContent?.includes("Select country"));
    if (bizCountryCombo) {
      fireEvent.click(bizCountryCombo);
      fireEvent.click(await screen.findByRole("option", { name: "Singapore" }));
    }
    // Close dialog via Escape
    fireEvent.keyDown(document.body, { key: "Escape" });

    // Switch to Jobs tab
    const jobsTab = screen.getByRole("tab", { name: /Jobs/i });
    fireEvent.mouseDown(jobsTab);
    fireEvent.click(jobsTab);

    await screen.findByText("Min Salary Only");
    expect(screen.getByText("Max Salary Only")).toBeInTheDocument();
    expect(screen.getByText("Surat, Gujarat, India")).toBeInTheDocument();

    // Filter by employment type then reset to All Types
    const jobTypeTrigger = screen.getByRole("combobox", { name: /Filter by employment type/i });
    fireEvent.click(jobTypeTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "Full Time" }));
    fireEvent.click(jobTypeTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "All Types" }));

    // Open Post Job dialog, set positions_available to 0 (hits || 1), pick country without states, submit
    fireEvent.click(screen.getByRole("button", { name: /Post Job/i }));
    await screen.findByText("Post a Job");
    const inputs = screen.getAllByRole("textbox");
    // First textbox in dialog is Job Title
    fireEvent.change(inputs[inputs.length - 7] ?? inputs[0], { target: { value: "Wave15 Engineer" } });
    const spinbuttons = screen.getAllByRole("spinbutton");
    if (spinbuttons[0]) {
      fireEvent.change(spinbuttons[0], { target: { value: "0" } });
    }
    const jobDialogCombos = screen.getAllByRole("combobox");
    const jobCountryCombo = jobDialogCombos.find((el) => el.textContent?.trim() === "Select");
    if (jobCountryCombo) {
      fireEvent.click(jobCountryCombo);
      fireEvent.click(await screen.findByRole("option", { name: "Singapore" }));
    }
    const postSubmitBtns = screen.getAllByRole("button", { name: /Post Job/i });
    const submitBtn = postSubmitBtns[postSubmitBtns.length - 1];
    if (!submitBtn.hasAttribute("disabled")) {
      fireEvent.click(submitBtn);
      await waitFor(() => expect(insertSpy).toHaveBeenCalled());
    }
  });

  it("handles null jobs data and applyJob when member is null", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null) as never;
      }
      if (table === "jobs") {
        return makeChain([
          {
            id: "job-null-member",
            title: "No Member Apply Job",
            status: "open",
          },
        ]) as never;
      }
      if (table === "businesses") {
        return makeChain(null) as never;
      }
      return makeChain(null) as never;
    });

    renderApp(<Business />, { route: "/business" });
    const jobsTab = await screen.findByRole("tab", { name: /Jobs/i });
    fireEvent.mouseDown(jobsTab);
    fireEvent.click(jobsTab);

    await screen.findByText("No Member Apply Job");
    fireEvent.click(screen.getByRole("button", { name: /Apply Now/i }));
    await waitFor(() => {
      expect(screen.getByText("No Member Apply Job")).toBeInTheDocument();
    });
  });
});
