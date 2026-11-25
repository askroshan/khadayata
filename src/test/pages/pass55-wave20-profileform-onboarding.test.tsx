/**
 * Pass 55 — Wave 20: Close remaining uncovered branches in ProfileForm and Onboarding.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { ProfileForm } from "@/components/matrimonial/ProfileForm";
import Onboarding from "@/pages/Onboarding";

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

describe("Pass 55 — Wave 20 ProfileForm & Onboarding branch coverage", () => {
  it("ProfileForm: saves with empty diet/marital_status/income_currency/parents_marital_status and empty partner age/height bounds", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "matrimonial_profiles") {
        const c = makeChain(null);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    const onSuccess = vi.fn();
    renderApp(
      <ProfileForm
        memberId="m-1"
        onSuccess={onSuccess}
        initial={
          {
            id: "prof-1",
            member_id: "m-1",
            diet: "",
            marital_status: "",
            income_currency: "",
            parents_marital_status: "",
            preferences: {
              min_age: "",
              max_age: "",
              min_height: "",
              max_height: "",
            },
          } as never
        }
      />,
    );

    // Jump directly to step 4 (Partner Preferences) and submit
    fireEvent.click(screen.getByRole("button", { name: "Partner Preferences" }));
    fireEvent.click(screen.getByRole("button", { name: /update profile/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          diet: null,
          marital_status: null,
          income_currency: "INR",
          parents_marital_status: null,
          preferences: expect.objectContaining({
            min_age: null,
            max_age: null,
            min_height: null,
            max_height: null,
          }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("Onboarding: finishes with institution-only education (null degree & year) and company-only employment (null job_title & sector)", async () => {
    const eduInsertSpy = vi.fn().mockImplementation(() => makeChain(null));
    const empInsertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase.functions, "invoke").mockResolvedValue({ data: null, error: null });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-onb-1",
          user_id: "u-1",
          first_name: "",
          last_name: "",
          onboarding_completed: false,
          chapter_id: null,
        }) as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-1", name: "Ahmedabad Chapter" }]) as never;
      }
      if (table === "education") {
        const c = makeChain(null);
        c.insert = eduInsertSpy;
        return c as never;
      }
      if (table === "employment") {
        const c = makeChain(null);
        c.insert = empInsertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Onboarding />, { route: "/onboarding" });

    // Step 0: select chapter
    const trigger = await screen.findByRole("combobox");
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByText("Ahmedabad Chapter"));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 1: fill required personal fields
    fireEvent.change(await screen.findByLabelText(/first name/i), { target: { value: "Rohan" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Shah" } });
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 2: fill only Company (no Job Title, no Sector) and only Institution (no Degree, no Year)
    await screen.findByText("Employment");
    const inputs = screen.getAllByRole("textbox");
    // Order of textboxes in Step 2: Job Title (0), Company (1), Sector (2), Degree (3), Institution (4), Skills (5), Languages (6)
    fireEvent.change(inputs[1], { target: { value: "Acme Corp" } });
    fireEvent.change(inputs[4], { target: { value: "Gujarat University" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 3: finish
    fireEvent.click(await screen.findByRole("button", { name: /complete profile/i }));

    await waitFor(() => {
      expect(eduInsertSpy).toHaveBeenCalledWith({
        member_id: "m-onb-1",
        degree: null,
        institution: "Gujarat University",
        year: null,
      });
      expect(empInsertSpy).toHaveBeenCalledWith({
        member_id: "m-onb-1",
        job_title: null,
        company: "Acme Corp",
        sector: null,
      });
    });
  });

  it("Onboarding: finishes with degree-only education (null institution) and jobTitle-only employment (null company)", async () => {
    const eduInsertSpy = vi.fn().mockImplementation(() => makeChain(null));
    const empInsertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase.functions, "invoke").mockResolvedValue({ data: null, error: null });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-onb-2",
          user_id: "u-1",
          first_name: "",
          last_name: "",
          onboarding_completed: false,
          chapter_id: null,
        }) as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-1", name: "Ahmedabad Chapter" }]) as never;
      }
      if (table === "education") {
        const c = makeChain(null);
        c.insert = eduInsertSpy;
        return c as never;
      }
      if (table === "employment") {
        const c = makeChain(null);
        c.insert = empInsertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Onboarding />, { route: "/onboarding" });

    // Step 0: select chapter
    const trigger = await screen.findByRole("combobox");
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByText("Ahmedabad Chapter"));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 1: fill required personal fields
    fireEvent.change(await screen.findByLabelText(/first name/i), { target: { value: "Meera" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Patel" } });
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), { target: { value: "9123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 2: fill only Job Title (no Company) and only Degree (no Institution)
    await screen.findByText("Employment");
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Architect" } });
    fireEvent.change(inputs[3], { target: { value: "B.Arch" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 3: finish
    fireEvent.click(await screen.findByRole("button", { name: /complete profile/i }));

    await waitFor(() => {
      expect(eduInsertSpy).toHaveBeenCalledWith({
        member_id: "m-onb-2",
        degree: "B.Arch",
        institution: null,
        year: null,
      });
      expect(empInsertSpy).toHaveBeenCalledWith({
        member_id: "m-onb-2",
        job_title: "Architect",
        company: null,
        sector: null,
      });
    });
  });
});
