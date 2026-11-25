/**
 * Pass 69 — Wave 25: Close remaining uncovered functions & branches in
 * SMSTab.tsx, Business.tsx, and ConsentCenter.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import SMSTab from "@/components/admin/SMSTab";
import Business from "@/pages/Business";
import { ConsentCenter } from "@/components/consent/ConsentCenter";

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
    ilike: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

describe("Pass 69 — Wave 25: SMSTab, Business, ConsentCenter", () => {
  // -------------------------------------------------------------------------
  // 1. SMSTab
  // -------------------------------------------------------------------------
  it("SMSTab: sends single SMS (success + error), changes country code, and sends campaign (success + error)", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain([]) as never);

    const fetchSpy = vi.spyOn(globalThis, "fetch")
      // 1st call: sendSingle success
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)
      // 2nd call: sendSingle error with empty error body
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)
      // 3rd call: sendCampaign success
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)
      // 4th call: sendCampaign error with empty error body
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

    renderApp(<SMSTab />);

    // Single SMS success with custom country code
    const ccInput = screen.getByLabelText(/Country Code/i);
    fireEvent.change(ccInput, { target: { value: "91" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText(/^Message/i), { target: { value: "Hello community" } });
    fireEvent.click(screen.getByRole("button", { name: /Send SMS/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // Single SMS error with empty country code (hits || "1" and fallback error)
    fireEvent.change(ccInput, { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText(/^Message/i), { target: { value: "Fail test" } });
    fireEvent.click(screen.getByRole("button", { name: /Send SMS/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    // Switch to Campaign Blast tab
    const blastTab = screen.getByRole("tab", { name: /Campaign Blast/i });
    fireEvent.mouseDown(blastTab);
    fireEvent.click(blastTab);

    // Campaign success with campaign name
    const groupInput = await screen.findByLabelText(/Easify Contact Group ID/i);
    fireEvent.change(groupInput, { target: { value: "12345" } });
    fireEvent.change(screen.getByLabelText(/Campaign Name/i), { target: { value: "Diwali 2026" } });
    fireEvent.change(screen.getByLabelText(/^Message/i), { target: { value: "Happy Diwali!" } });
    fireEvent.click(screen.getByRole("button", { name: /Send Campaign/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    // Campaign error with empty campaign name (hits || undefined and fallback error)
    fireEvent.change(groupInput, { target: { value: "12345" } });
    fireEvent.change(screen.getByLabelText(/Campaign Name/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/^Message/i), { target: { value: "Blast fail" } });
    fireEvent.click(screen.getByRole("button", { name: /Send Campaign/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });

  it("SMSTab: history tab renders sent/failed/queued status icons, cancels delete, and deletes (success + error)", async () => {
    let deleteShouldFail = false;
    const deleteSpy = vi.fn().mockImplementation(() =>
      makeChain(null, deleteShouldFail ? new Error("Delete failed") : null),
    );

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "sms_messages") {
        const c = makeChain([
          {
            id: "sms-1",
            recipient_phone: "+19725550001",
            body: "Sent message",
            status: "sent",
            sent_at: new Date().toISOString(),
            error: null,
            created_at: new Date().toISOString(),
          },
          {
            id: "sms-2",
            recipient_phone: "+19725550002",
            body: "Failed message",
            status: "failed",
            sent_at: null,
            error: "Invalid number",
            created_at: new Date().toISOString(),
          },
          {
            id: "sms-3",
            recipient_phone: "+19725550003",
            body: "Queued message",
            status: "queued",
            sent_at: null,
            error: null,
            created_at: new Date().toISOString(),
          },
        ]);
        c.delete = deleteSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<SMSTab />);

    const historyTab = screen.getByRole("tab", { name: /History/i });
    fireEvent.mouseDown(historyTab);
    fireEvent.click(historyTab);

    await screen.findByText("+19725550001");
    expect(screen.getByText("Invalid number")).toBeInTheDocument();
    expect(screen.getByText("Queued message")).toBeInTheDocument();

    // Open delete dialog and cancel (covers onOpenChange)
    const deleteBtns = screen.getAllByRole("button", { name: /Delete message/i });
    fireEvent.click(deleteBtns[0]);
    const cancelBtn = await screen.findByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    // Open delete dialog and confirm (success)
    fireEvent.click(deleteBtns[0]);
    const removeBtn = await screen.findByRole("button", { name: /^Remove$/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    // Open delete dialog and confirm (error)
    deleteShouldFail = true;
    fireEvent.click(deleteBtns[1]);
    const removeBtn2 = await screen.findByRole("button", { name: /^Remove$/i });
    fireEvent.click(removeBtn2);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Business
  // -------------------------------------------------------------------------
  it("Business: selects country, state, and city in List Business and Post Job dialogs", async () => {
    const bizInsertSpy = vi.fn().mockImplementation(() => makeChain(null));
    const jobInsertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Admin",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "countries") {
        return makeChain([{ id: "c-in", name: "India" }]) as never;
      }
      if (table === "states") {
        return makeChain([{ id: "s-gj", name: "Gujarat", country_id: "c-in" }]) as never;
      }
      if (table === "cities") {
        return makeChain([{ id: "ct-amd", name: "Ahmedabad", state_id: "s-gj", country_id: "c-in" }]) as never;
      }
      if (table === "businesses") {
        const c = makeChain([]);
        c.insert = bizInsertSpy;
        return c as never;
      }
      if (table === "jobs") {
        const c = makeChain([]);
        c.insert = jobInsertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Business />, { route: "/business" });

    // Wait for member to load so List Business is the DialogTrigger (not L2GateButton)
    const listBizBtn = await waitFor(() => {
      const btn = screen.getByRole("button", { name: /List Business/i });
      expect(btn.getAttribute("aria-haspopup")).toBe("dialog");
      return btn;
    });
    fireEvent.click(listBizBtn);

    await screen.findByText("List Your Business");

    // Select Country -> India
    const countryTrigger = screen.getByText("Select country").closest("button")!;
    fireEvent.click(countryTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "India" }));

    // Wait for State to be enabled and select Gujarat
    await waitFor(() => {
      const stateTrigger = screen.getByText("Select state").closest("button")!;
      expect(stateTrigger).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText("Select state").closest("button")!);
    fireEvent.click(await screen.findByRole("option", { name: "Gujarat" }));

    // Wait for City to be enabled and select Ahmedabad
    await waitFor(() => {
      const cityTrigger = screen.getByText("Select city").closest("button")!;
      expect(cityTrigger).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText("Select city").closest("button")!);
    fireEvent.click(await screen.findByRole("option", { name: "Ahmedabad" }));

    // Close List Business dialog via Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Switch to Jobs tab
    const jobsTab = screen.getByRole("tab", { name: /Jobs/i });
    fireEvent.mouseDown(jobsTab);
    fireEvent.click(jobsTab);

    // Open Post Job dialog
    const postJobBtn = await screen.findByRole("button", { name: /Post Job/i });
    fireEvent.click(postJobBtn);

    await screen.findByText("Post a Job");

    // Select Country -> State -> City in Post Job dialog
    const selectPlaceholders = screen.getAllByText("Select");
    // Country is the first "Select" placeholder
    fireEvent.click(selectPlaceholders[0].closest("button")!);
    fireEvent.click(await screen.findByRole("option", { name: "India" }));

    // State
    await waitFor(() => {
      const remaining = screen.getAllByText("Select");
      expect(remaining[0].closest("button")).not.toBeDisabled();
    });
    fireEvent.click(screen.getAllByText("Select")[0].closest("button")!);
    fireEvent.click(await screen.findByRole("option", { name: "Gujarat" }));

    // City
    await waitFor(() => {
      const remaining = screen.getAllByText("Select");
      expect(remaining[0].closest("button")).not.toBeDisabled();
    });
    fireEvent.click(screen.getAllByText("Select")[0].closest("button")!);
    fireEvent.click(await screen.findByRole("option", { name: "Ahmedabad" }));
  });

  // -------------------------------------------------------------------------
  // 3. ConsentCenter
  // -------------------------------------------------------------------------
  it("ConsentCenter: renders EU/IN/US regions, audit log, toggles consent, and requests export/deletion", async () => {
    const consentInsertSpy = vi.fn().mockImplementation(() => makeChain(null));
    const dataReqInsertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Admin",
          verification_level: 3,
          onboarding_completed: true,
        }) as never;
      }
      if (table === "consents") {
        const c = makeChain([
          {
            id: "con-1",
            member_id: "m-1",
            context: "cookie_consent",
            policy_version: "1.0",
            region: "EU",
            payload: { accepted: true },
            captured_at: new Date().toISOString(),
          },
          {
            id: "con-2",
            member_id: "m-1",
            context: "directory_visibility",
            policy_version: "1.0",
            region: "EU",
            payload: { accepted: false },
            captured_at: new Date().toISOString(),
          },
          {
            id: "con-3",
            member_id: "m-1",
            context: "photo_tagging",
            policy_version: "1.0",
            region: "EU",
            payload: null,
            captured_at: new Date().toISOString(),
          },
        ]);
        c.insert = consentInsertSpy;
        return c as never;
      }
      if (table === "data_requests") {
        const c = makeChain([
          {
            id: "dr-1",
            member_id: "m-1",
            type: "export",
            status: "completed",
            created_at: new Date().toISOString(),
          },
          {
            id: "dr-2",
            member_id: "m-1",
            type: "deletion",
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ]);
        c.insert = dataReqInsertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    // 1. EU region
    const dtfSpy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone: "Europe/London" }) }) as unknown as Intl.DateTimeFormat,
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderApp(<ConsentCenter />);

    expect(await screen.findByText("GDPR (EU)")).toBeInTheDocument();
    expect(await screen.findByText("Consent Audit Log")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getAllByText("Declined").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Request History")).toBeInTheDocument();

    // Toggle a consent switch (success)
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    await waitFor(() => {
      expect(consentInsertSpy).toHaveBeenCalledTimes(1);
    });

    // Request Export (success)
    fireEvent.click(screen.getByRole("button", { name: /Request Export/i }));
    await waitFor(() => {
      expect(dataReqInsertSpy).toHaveBeenCalledTimes(1);
    });

    // Request Deletion (success)
    fireEvent.click(screen.getByRole("button", { name: /Request Deletion/i }));
    await waitFor(() => {
      expect(dataReqInsertSpy).toHaveBeenCalledTimes(2);
    });
    expect(confirmSpy).toHaveBeenCalled();

    cleanup();

    // 2. IN region
    dtfSpy.mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone: "Asia/Kolkata" }) }) as unknown as Intl.DateTimeFormat,
    );
    renderApp(<ConsentCenter />);
    expect(await screen.findByText("DPDP Act (India)")).toBeInTheDocument();
    cleanup();

    // 3. US region
    dtfSpy.mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone: "America/New_York" }) }) as unknown as Intl.DateTimeFormat,
    );
    renderApp(<ConsentCenter />);
    expect(await screen.findByText("US Privacy Laws")).toBeInTheDocument();
  });
});
