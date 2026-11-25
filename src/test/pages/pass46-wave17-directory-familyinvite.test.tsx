/**
 * Pass 46 — Wave 17: Branch coverage burn-down for DirectoryTab & FamilyInviteDialog.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import DirectoryTab from "@/components/admin/DirectoryTab";
import { FamilyInviteDialog, PendingInvitationsList } from "@/components/profile/FamilyInviteDialog";

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

describe("Pass 46 — Wave 17: DirectoryTab branch coverage", () => {
  it("handles null data from businesses and jobs queries", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "businesses" || table === "jobs") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<DirectoryTab myChapterId={null} />);
    await screen.findByText("No business listings found");

    const jobsTab = screen.getByRole("tab", { name: /jobs/i });
    fireEvent.mouseDown(jobsTab);
    fireEvent.click(jobsTab);
    await screen.findByText("No job listings found");
  });

  it("pending & verified business: edit with null fields, save clearing description/sector, verify error, delete verified", async () => {
    const updateSpy = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      if ("verified" in payload) {
        return makeChain(null, { message: "forced verify error" });
      }
      return makeChain(null);
    });
    const deleteSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "businesses") {
        const c = makeChain([
          {
            id: "biz-pend-null",
            name: "Pending Null Biz",
            sector: null,
            description: null,
            phone: null,
            website: null,
            verified: false,
            created_at: new Date().toISOString(),
            owner: null,
          },
          {
            id: "biz-ver-null",
            name: "Verified Null Biz",
            sector: null,
            description: null,
            phone: null,
            website: null,
            verified: true,
            created_at: new Date().toISOString(),
            owner: null,
          },
        ]);
        c.update = updateSpy;
        c.delete = deleteSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<DirectoryTab myChapterId={null} />);
    await screen.findByText("Pending Null Biz");
    await screen.findByText("Verified Null Biz");

    // Trigger verify mutation error (L70, L76)
    fireEvent.click(screen.getByRole("button", { name: /^Verify$/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({ verified: true });
    });

    // Click Edit on pending business with null fields (L305)
    const editButtons = screen.getAllByRole("button", { name: /edit business/i });
    fireEvent.click(editButtons[0]);
    await screen.findByText("Edit Business");

    // Save with empty description & sector (L83, L86 || null)
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Pending Null Biz",
          description: null,
          sector: null,
        })
      );
    });

    // Click Edit on verified business with null fields (L346)
    fireEvent.click(editButtons[1]);
    await screen.findByText("Edit Business");
    // Close dialog via Escape
    fireEvent.keyDown(document.activeElement || document.body, { key: "Escape" });

    // Click Delete on verified business (L358)
    const deleteButtons = screen.getAllByRole("button", { name: /delete business/i });
    fireEvent.click(deleteButtons[1]);
    await screen.findByText("Delete Business");
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  it("open job with null fields: renders fallback employment_type, edits and saves with empty employment_type", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "jobs") {
        const c = makeChain([
          {
            id: "job-null-1",
            title: "Null Fields Job",
            description: null,
            location: null,
            employment_type: null,
            status: "open",
            created_at: new Date().toISOString(),
            employer: null,
          },
        ]);
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<DirectoryTab myChapterId={null} />);
    const jobsTab = screen.getByRole("tab", { name: /jobs/i });
    fireEvent.mouseDown(jobsTab);
    fireEvent.click(jobsTab);

    await screen.findByText("Null Fields Job");
    // L398: fallback "full time" rendered
    expect(screen.getByText(/full time/i)).toBeInTheDocument();

    // L417: click Edit on job with null description, location, employment_type
    fireEvent.click(screen.getByRole("button", { name: /edit job/i }));
    await screen.findByText("Edit Job");

    // Set employment_type select to "" to hit L117 (job.employment_type || null)
    const selectEl = document.querySelector("select") as HTMLSelectElement;
    expect(selectEl).toBeTruthy();
    fireEvent.change(selectEl, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Null Fields Job",
          description: null,
          location: null,
          employment_type: null,
        })
      );
    });
  });

  it("createJobMutation: throws 'Not a member' when member is null (L170)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<DirectoryTab myChapterId={null} />);
    fireEvent.click(screen.getByRole("button", { name: /add job/i }));
    await screen.findByText("Add Job Listing");

    const titleInput = screen.getByPlaceholderText(/software engineer/i);
    fireEvent.change(titleInput, { target: { value: "QA Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: /post job/i }));

    await waitFor(() => {
      expect(screen.getByText("Add Job Listing")).toBeInTheDocument();
    });
  });

  it("createJobMutation: uses null chapter_id when myChapterId and member.chapter_id are both null (L176)", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-no-chap",
          user_id: "u-1",
          first_name: "Test",
          last_name: "Member",
          chapter_id: null,
        }) as never;
      }
      if (table === "jobs") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<DirectoryTab myChapterId={null} />);
    fireEvent.click(screen.getByRole("button", { name: /add job/i }));
    await screen.findByText("Add Job Listing");

    const titleInput = screen.getByPlaceholderText(/software engineer/i);
    fireEvent.change(titleInput, { target: { value: "Remote Designer" } });
    fireEvent.click(screen.getByRole("button", { name: /post job/i }));

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Remote Designer",
          chapter_id: null,
        })
      );
    });
  });
});

describe("Pass 46 — Wave 17: FamilyInviteDialog & PendingInvitationsList branch coverage", () => {
  it("PendingInvitationsList handles null data from family_invitations query (L67)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "family_invitations") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    const { container } = renderApp(<PendingInvitationsList memberId="m-1" />);
    await waitFor(() => {
      expect(container.querySelector("table")).toBeNull();
    });
  });

  it("FamilyInviteDialog: sendInvite handles insert error (L98)", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "insert failed" }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "family_invitations") {
        const c = makeChain([]);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<FamilyInviteDialog memberId="m-1" />);
    fireEvent.click(screen.getByRole("button", { name: /invite family/i }));
    await screen.findByText("Invite a Family Member");

    // Open relation select and pick Spouse
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[0]);
    const spouseOption = await screen.findByRole("option", { name: "Spouse" });
    fireEvent.click(spouseOption);

    // Fill name & phone
    fireEvent.change(screen.getByPlaceholderText(/enter their name/i), { target: { value: "Priya Shah" } });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), { target: { value: "9876543210" } });

    fireEvent.click(screen.getByRole("button", { name: /send invitation/i }));
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });
  });

  it("PendingInvitationsList: cancelInvite error (L218), saveEdit validation errors (L228, L229), and null email/phone branches (L235, L237, L256)", async () => {
    const deleteSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "delete failed" }));
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "family_invitations") {
        const c = makeChain([
          {
            id: "inv-phone-only",
            relation: "spouse",
            invitee_name: "Meera Shah",
            invitee_email: null,
            invitee_phone: "9876543210",
            invitee_phone_country_code: null,
            status: "pending",
            created_at: new Date().toISOString(),
          },
          {
            id: "inv-undef-fields",
            relation: undefined,
            invitee_name: undefined,
            invitee_email: null,
            invitee_phone: null,
            invitee_phone_country_code: null,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ]);
        c.delete = deleteSpy;
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PendingInvitationsList memberId="m-1" />);
    await screen.findByText("Meera Shah");

    // 1. Trigger cancelInvite error (L218)
    const cancelButtons = screen.getAllByTitle("Cancel");
    fireEvent.click(cancelButtons[0]);
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
    });

    // 2. Click Edit on inv-phone-only (L256: invitee_email ?? "", invitee_phone_country_code ?? "+91")
    const editButtons = screen.getAllByTitle("Edit");
    fireEvent.click(editButtons[0]);

    // Find inputs inside the edit row: Name, Email, Phone
    const inputs = screen.getAllByRole("textbox");
    // inputs[0] = Name, inputs[1] = Email, inputs[2] = Phone
    // L228: clear Name -> Save -> throws "Name is required"
    fireEvent.change(inputs[0], { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => {
      expect(updateSpy).not.toHaveBeenCalled();
    });

    // L229: restore Name, clear Phone (Email is already empty) -> Save -> throws "Email or phone required"
    fireEvent.change(inputs[0], { target: { value: "Meera Shah" } });
    fireEvent.change(inputs[2], { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => {
      expect(updateSpy).not.toHaveBeenCalled();
    });

    // L235 (email || null) & L237 (phone truthy -> countryCode)
    fireEvent.change(inputs[2], { target: { value: "9998887776" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          invitee_name: "Meera Shah",
          invitee_email: null,
          invitee_phone: "9998887776",
          invitee_phone_country_code: "+91",
        })
      );
    });

    // 3. Click Edit on inv-undef-fields to hit L293, L304, L308, L313, L321 ?? fallbacks
    const editButtons2 = screen.getAllByTitle("Edit");
    fireEvent.click(editButtons2[1]);
    const inputs2 = screen.getAllByRole("textbox");
    fireEvent.change(inputs2[0], { target: { value: "Rohan Shah" } });
    fireEvent.change(inputs2[1], { target: { value: "rohan@example.com" } });
    // Phone is empty -> hits L237 `: null`
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          invitee_name: "Rohan Shah",
          invitee_email: "rohan@example.com",
          invitee_phone: null,
          invitee_phone_country_code: null,
        })
      );
    });
  });
});
