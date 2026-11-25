/**
 * Pass 37 — Wave 14: Branch coverage burn-down for Profile.tsx and MembersTab.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Profile from "@/pages/Profile";
import MembersTab from "@/components/admin/MembersTab";

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
    ilike: () => chain,
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

describe("Pass 37 — Wave 14: Profile.tsx branch coverage", () => {
  it("renders L0 member with null optional fields, null chapter join, null query arrays, and saves empty edit", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-l0",
          user_id: "u-l0",
          first_name: "",
          last_name: "",
          middle_names: null,
          gender: null,
          dob: null,
          birth_place: null,
          chapter_id: "ch-1",
          chapters: null,
          global_id: null,
          verification_level: 0,
          onboarding_completed: true,
          photo_url: null,
          ekda: null,
          kuldevi: null,
        }) as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-1", name: "Ahmedabad", slug: "ahmedabad" }]) as never;
      }
      if (table === "family_links") {
        return makeChain([{ id: "fl-1", relation: "sibling", related: null }]) as never;
      }
      if (table === "education" || table === "employment" || table === "member_skills" || table === "member_languages" || table === "vouches") {
        return makeChain(null) as never;
      }
      return makeChain(null) as never;
    });

    renderApp(<Profile />, { route: "/profile" });

    // Null chapter join with resolved chapterPath -> "View chapter" fallback
    const viewChapterLinks = await screen.findAllByText("View chapter");
    expect(viewChapterLinks.length).toBeGreaterThanOrEqual(2);

    // FamilyConnectionsTable with related: null -> "?" and "Unknown"
    expect(await screen.findByText("Unknown")).toBeTruthy();

    // L0 verification progress banner
    expect(screen.getByText(/Vouches to reach L1: 0\/2/)).toBeTruthy();

    // Enter edit mode and save with null optional fields
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    const saveBtn = await screen.findByRole("button", { name: /^save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeTruthy();
    });
  });

  it("renders L1 member with vouches, employment/education without optional company/institution, and handles delete errors", async () => {
    const deleteErrChain = () => {
      const c = makeChain(null, { message: "Delete failed" });
      return c;
    };

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-l1",
          user_id: "u-l1",
          first_name: "Priya",
          last_name: "Shah",
          gender: "Female",
          dob: "1995-05-10",
          birth_place: "Surat",
          chapter_id: null,
          chapters: null,
          global_id: null,
          verification_level: 1,
          onboarding_completed: true,
          photo_url: null,
        }) as never;
      }
      if (table === "employment") {
        const c = makeChain([{ id: "emp-1", job_title: "Freelancer", company: null, sector: null }]);
        c.delete = deleteErrChain;
        return c as never;
      }
      if (table === "education") {
        const c = makeChain([{ id: "edu-1", degree: "B.Com", institution: null, year: null }]);
        c.delete = deleteErrChain;
        return c as never;
      }
      if (table === "member_skills") {
        const c = makeChain([{ id: "sk-1", skill: "Accounting" }]);
        c.delete = deleteErrChain;
        return c as never;
      }
      if (table === "member_languages") {
        const c = makeChain([{ id: "lg-1", language: "Gujarati" }]);
        c.delete = deleteErrChain;
        return c as never;
      }
      if (table === "vouches") {
        return makeChain([
          {
            id: "v-1",
            created_at: new Date().toISOString(),
            note: "Trusted member",
            voucher: { id: "v-m1", first_name: "Raj", last_name: "Patel", photo_url: null, global_id: "KH-001", verification_level: 2 },
          },
          {
            id: "v-2",
            created_at: new Date().toISOString(),
            note: null,
            voucher: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Profile />, { route: "/profile" });

    // L1 verification progress banner
    expect(await screen.findByText(/L1\+ vouches to reach L2: 1\/3/)).toBeTruthy();
    expect(screen.getByText("Freelancer")).toBeTruthy();
    expect(screen.getByText("B.Com")).toBeTruthy();
    expect(screen.getByText("Accounting")).toBeTruthy();
    expect(screen.getByText("Gujarati")).toBeTruthy();

    // Click remove buttons on employment, education, skill, language to exercise error branches
    const skillRemove = screen.getByText("Accounting").querySelector("button");
    if (skillRemove) fireEvent.click(skillRemove);

    const langRemove = screen.getByText("Gujarati").querySelector("button");
    if (langRemove) fireEvent.click(langRemove);

    const empRow = screen.getByText("Freelancer").closest("div")?.parentElement;
    const empBtn = empRow?.querySelector("button");
    if (empBtn) fireEvent.click(empBtn);

    const eduRow = screen.getByText("B.Com").closest("div")?.parentElement;
    const eduBtn = eduRow?.querySelector("button");
    if (eduBtn) fireEvent.click(eduBtn);

    await waitFor(() => {
      expect(screen.getByText("Accounting")).toBeTruthy();
    });
  });
});

describe("Pass 37 — Wave 14: MembersTab.tsx branch coverage", () => {
  const sampleMembers = [
    {
      id: "mem-1",
      user_id: "usr-1",
      first_name: "Aarav",
      last_name: "Shah",
      verification_level: 99, // unknown level -> "Unknown" fallback
      onboarding_completed: false,
      chapter_id: null,
      created_at: undefined, // missing created_at -> "—" fallback
      chapters: null,
    },
    {
      id: "mem-2",
      user_id: "usr-2",
      first_name: "Diya",
      last_name: "Patel",
      verification_level: 2,
      onboarding_completed: true,
      chapter_id: "ch-1",
      created_at: "2026-01-15T00:00:00Z",
      chapters: { name: "Ahmedabad" },
    },
    {
      id: "mem-3",
      user_id: "usr-3",
      first_name: "Kiran",
      last_name: "Desai",
      verification_level: 1,
      onboarding_completed: true,
      chapter_id: "ch-1",
      created_at: "2026-02-15T00:00:00Z",
      chapters: { name: "Ahmedabad" },
    },
  ];

  it("handles RPC errors, unknown level, missing created_at, status/date filters, and member actions without status row", async () => {
    vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_member_emails" || fn === "get_member_phones") {
        return Promise.resolve({ data: null, error: { message: "RPC error" } }) as never;
      }
      return Promise.resolve({ data: null, error: null }) as never;
    });

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([
          { id: "mem-2", suspended: true, blocked: false },
          { id: "mem-3", suspended: false, blocked: true },
        ]) as never;
      }
      return makeChain(null) as never;
    });

    renderApp(
      <MembersTab
        members={sampleMembers}
        myChapterId={null}
        canInvite={true}
        canSendReminders={true}
        isGlobalAdmin={true}
      />
    );

    // Unknown level label fallback
    expect(await screen.findByText(/L99 — Unknown/)).toBeTruthy();

    // Open Member Actions for mem-1 (no status entry in memberStatuses -> !s / ?? false branches)
    const actionBtns = screen.getAllByRole("button", { name: /member admin actions/i });
    fireEvent.click(actionBtns[0]);
    expect(await screen.findByText("Member Actions")).toBeTruthy();

    // Click Delete Permanently -> confirm with failing fetch
    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Cannot delete user" }),
    } as Response);

    const confirmDelete = await screen.findByRole("button", { name: /delete permanently/i });
    fireEvent.click(confirmDelete);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    // Date filter to trigger hasFilters with dateFrom / dateTo
    const fromInput = screen.getByTitle("Joined from date");
    fireEvent.change(fromInput, { target: { value: "2026-01-01" } });
    expect(await screen.findByRole("button", { name: /clear/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
  });

  it("covers resendVerificationEmail (success + error + data.error + sent:0) for non-global admin and non-global edit", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null) as never);

    const invokeSpy = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: "Network fail" } })
      .mockResolvedValueOnce({ data: { error: "Rate limited" }, error: null })
      .mockResolvedValueOnce({ data: { sent: 0, errors: ["SMTP down"] }, error: null })
      .mockResolvedValueOnce({ data: { sent: 1 }, error: null });
    vi.spyOn(supabase, "functions", "get").mockReturnValue({ invoke: invokeSpy } as never);

    renderApp(
      <MembersTab
        members={[sampleMembers[0]]}
        myChapterId={null}
        canInvite={true}
        canSendReminders={true}
        isGlobalAdmin={false}
      />
    );

    const resendBtn = await screen.findByRole("button", { name: /resend verification email/i });
    for (let i = 0; i < 4; i++) {
      fireEvent.click(resendBtn);
      await waitFor(() => expect(invokeSpy).toHaveBeenCalledTimes(i + 1));
    }

    // Non-global admin edit member with chapter_id: null
    fireEvent.click(screen.getByRole("button", { name: /edit member/i }));
    expect(await screen.findByText("Edit Member")).toBeTruthy();
  });

  it("covers inviteMemberMutation error paths and bulkInviteMutation singular/error paths", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapters") return makeChain([{ id: "ch-1", name: "Ahmedabad" }]) as never;
      return makeChain([]) as never;
    });

    const invokeSpy = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: "Invite fail" } })
      .mockResolvedValueOnce({ data: { error: "Already invited" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Bulk fail" } })
      .mockResolvedValueOnce({ data: { error: "Bulk data error" }, error: null })
      .mockResolvedValueOnce({ data: { sent: 1, failed: 0, skipped: 0, errors: [], total: 1 }, error: null });
    vi.spyOn(supabase, "functions", "get").mockReturnValue({ invoke: invokeSpy } as never);

    renderApp(
      <MembersTab
        members={sampleMembers}
        myChapterId={null}
        canInvite={true}
        canSendReminders={false}
        isGlobalAdmin={false}
      />
    );

    // 1. Invite Member error paths
    fireEvent.click(await screen.findByRole("button", { name: /invite member/i }));
    const dialog = await screen.findByRole("dialog");
    const dialogInputs = dialog.querySelectorAll("input");
    fireEvent.change(dialogInputs[0], { target: { value: "new@example.com" } });
    fireEvent.change(dialogInputs[1], { target: { value: "Neha" } });
    const sendInviteBtn = screen.getByRole("button", { name: /send invitation/i });
    fireEvent.click(sendInviteBtn);
    await waitFor(() => expect(invokeSpy).toHaveBeenCalledTimes(1));
    fireEvent.click(sendInviteBtn);
    await waitFor(() => expect(invokeSpy).toHaveBeenCalledTimes(2));

    // Close Invite dialog
    fireEvent.keyDown(document, { key: "Escape" });

    // 2. Bulk Invite with 1 valid, 1 duplicate, 1 invalid line -> singular labels + error + singular sent
    fireEvent.click(screen.getByRole("button", { name: /bulk invite/i }));
    const fileInput = document.getElementById("bulk-file-upload") as HTMLInputElement;
    const file = new File(["one@example.com\none@example.com\nnot-an-email"], "emails.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/1 valid email$/i)).toBeTruthy();
    expect(screen.getByText(/1 duplicate removed/i)).toBeTruthy();
    expect(screen.getByText(/1 invalid line skipped/i)).toBeTruthy();

    const bulkSendBtn = screen.getByRole("button", { name: /send 1 invitation/i });
    fireEvent.click(bulkSendBtn);
    await waitFor(() => expect(invokeSpy).toHaveBeenCalledTimes(3));
    fireEvent.click(bulkSendBtn);
    await waitFor(() => expect(invokeSpy).toHaveBeenCalledTimes(4));
    fireEvent.click(bulkSendBtn);
    await waitFor(() => expect(invokeSpy).toHaveBeenCalledTimes(5));
  });

  it("covers committee role assign error in Edit Member dialog", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          middle_names: "Kumar",
          gender: "male",
          dob: "1990-01-01",
          birth_place: "Ahmedabad",
          ekda: "Kadva",
          kuldevi: "Umiya",
        }) as never;
      }
      if (table === "chapters") return makeChain([{ id: "ch-1", name: "Ahmedabad" }]) as never;
      if (table === "roles") return makeChain([{ id: "role-1", name: "Committee Member" }]) as never;
      if (table === "role_assignments") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    const rpcSpy = vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "assign_role") {
        return Promise.resolve({ data: null, error: { message: "Assign denied" } }) as never;
      }
      return Promise.resolve({ data: [], error: null }) as never;
    });

    renderApp(
      <MembersTab
        members={[sampleMembers[1]]}
        myChapterId={null}
        canInvite={false}
        canSendReminders={false}
        isGlobalAdmin={true}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: /edit member/i }));
    const checkbox = await screen.findByLabelText("Committee Member");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(rpcSpy).toHaveBeenCalledWith("assign_role", expect.objectContaining({ p_role_id: "role-1" }));
    });
  });
});
