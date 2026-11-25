/**
 * Pass 71 — Wave 25 final sweep (Worker C):
 * Close remaining uncovered branches in Profile.tsx, MembersTab.tsx, and Settings.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import MembersTab from "@/components/admin/MembersTab";

let signedInUserId = "";

beforeAll(async () => {
  const { data } = await supabase.auth.signInWithPassword({
    email: E2E_ACCOUNTS.globalAdmin.email,
    password: E2E_PASSWORD,
  });
  signedInUserId = data.user?.id ?? "u-1";
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

function spyFunctionsInvoke() {
  return vi.spyOn(Object.getPrototypeOf(supabase.functions), "invoke");
}

describe("Pass 71 — Wave 25 branch coverage: Settings.tsx", () => {
  it("loads existing notification_preferences, toggles all 4 switches, and saves; handles privacy update error", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "Privacy update failed" }));
    const upsertSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain({
          id: "m-settings-1",
          user_id: signedInUserId,
          first_name: "Settings",
          last_name: "User",
          verification_level: 2,
          onboarding_completed: true,
          chapter_id: "ch-1",
          privacy: { dob: "private", phone: "chapter" },
        });
        c.update = updateSpy;
        return c as never;
      }
      if (table === "notification_preferences") {
        const c = makeChain({
          member_id: "m-settings-1",
          email_enabled: false,
          whatsapp_enabled: true,
          push_enabled: true,
          chapter_notifications_enabled: false,
        });
        c.upsert = upsertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    // 1. Render on privacy tab and wait for member to load (notification_preferences query fires when !!member)
    const fromSpy = vi.mocked(supabase.from);
    renderApp(<Settings />, { route: "/settings?tab=privacy" });
    const savePrivacyBtn = await screen.findByRole("button", { name: /save privacy settings/i });
    await waitFor(() => {
      expect(fromSpy).toHaveBeenCalledWith("notification_preferences");
    });
    fireEvent.click(savePrivacyBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });

    cleanup();

    // 2. Render on notifications tab with explicit notifPrefs (L60-63, L185, L189, L194, L198)
    renderApp(<Settings />, { route: "/settings?tab=notifications" });
    const switches = await screen.findAllByRole("switch");
    expect(switches.length).toBe(4);
    for (const sw of switches) {
      fireEvent.click(sw);
    }
    const savePrefsBtn = screen.getByRole("button", { name: /save preferences/i });
    fireEvent.click(savePrefsBtn);
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalled();
    });
  });
});

describe("Pass 71 — Wave 25 branch coverage: Profile.tsx", () => {
  function mockProfileTables(memberOverrides: Record<string, unknown>, vouchesData: unknown[] = []) {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-prof-1",
          user_id: signedInUserId,
          first_name: "Aarav",
          last_name: "Shah",
          middle_names: "",
          verification_level: 0,
          onboarding_completed: true,
          chapter_id: "ch-1",
          global_id: null,
          photo_url: null,
          dob: null,
          gender: null,
          birth_place: null,
          ekda: null,
          kuldevi: null,
          chapters: { name: "Ahmedabad" },
          ...memberOverrides,
        }) as never;
      }
      if (table === "vouches") return makeChain(vouchesData) as never;
      if (table === "chapters") return makeChain([{ id: "ch-1", name: "Ahmedabad" }]) as never;
      if (table === "matrimonial_profiles") return makeChain(null) as never;
      return makeChain([]) as never;
    });
  }

  it("renders L0 member with vouch progress, handles Generate Global ID error & success, and edits profile", async () => {
    mockProfileTables(
      { verification_level: 0, global_id: null, chapter_id: "ch-1" },
      [
        {
          id: "v-1",
          created_at: new Date().toISOString(),
          voucher: { id: "m-v1", first_name: "Diya", last_name: "Patel", photo_url: null, global_id: "KH-1", verification_level: 1 },
        },
      ]
    );

    const invokeSpy = spyFunctionsInvoke()
      .mockResolvedValueOnce({ data: null, error: new Error("ID gen failed") } as never)
      .mockResolvedValueOnce({ data: { global_id: "KH-IND-0001" }, error: null } as never);

    renderApp(<Profile />, { route: "/profile" });
    expect(await screen.findByText(/Vouches to reach L1: 1\/2/i)).toBeInTheDocument();
    expect(screen.getByText(/L0 Basic/i)).toBeInTheDocument();

    // Trigger Generate Global ID error (L407)
    const genBtn = screen.getByRole("button", { name: /generate global id/i });
    fireEvent.click(genBtn);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledTimes(1);
    });

    // Trigger Generate Global ID success (L409)
    fireEvent.click(genBtn);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledTimes(2);
    });

    // Open Edit mode and save (L319, L327, L187)
    const editBtn = screen.getByRole("button", { name: /^edit$/i });
    fireEvent.click(editBtn);
    const saveBtn = await screen.findByRole("button", { name: /^save$/i });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
    });
  });

  it("renders L1 member with L1+ vouch progress and no chapter", async () => {
    mockProfileTables(
      { verification_level: 1, global_id: null, chapter_id: null, chapters: null },
      [
        {
          id: "v-2",
          created_at: new Date().toISOString(),
          voucher: { id: "m-v2", first_name: "Kiran", last_name: "Mehta", photo_url: null, global_id: "KH-2", verification_level: 2 },
        },
      ]
    );

    renderApp(<Profile />, { route: "/profile" });
    expect(await screen.findByText(/L1\+ vouches to reach L2: 1\/3/i)).toBeInTheDocument();
    expect(screen.getByText(/L1 Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/Join a chapter to get your Global ID/i)).toBeInTheDocument();
  });

  it("renders L2 Trusted member without L0/L1 vouch progress banner", async () => {
    mockProfileTables({ verification_level: 2, global_id: "KH-IND-0002", chapter_id: "ch-1" }, []);

    renderApp(<Profile />, { route: "/profile" });
    expect(await screen.findByText(/L2 Trusted/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vouches to reach L1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/L1\+ vouches to reach L2/i)).not.toBeInTheDocument();
  });
});

describe("Pass 71 — Wave 25 branch coverage: MembersTab.tsx", () => {
  const sampleMembers = [
    {
      id: "mem-1",
      user_id: "usr-1",
      first_name: "Asha",
      last_name: "Desai",
      verification_level: 0,
      onboarding_completed: false,
      chapter_id: "ch-1",
      created_at: "2026-01-10T00:00:00Z",
      chapters: { name: "Ahmedabad" },
    },
    {
      id: "mem-2",
      user_id: "usr-2",
      first_name: "Bharat",
      last_name: "Modi",
      verification_level: 1,
      onboarding_completed: true,
      chapter_id: "ch-1",
      created_at: "2026-02-15T00:00:00Z",
      chapters: { name: "Ahmedabad" },
    },
    {
      id: "mem-3",
      user_id: "usr-3",
      first_name: "Chetan",
      last_name: "Shah",
      verification_level: 2,
      onboarding_completed: true,
      chapter_id: "ch-1",
      created_at: "2026-03-20T00:00:00Z",
      chapters: { name: "Ahmedabad" },
    },
  ];

  function mockMembersTabData() {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([
          { id: "mem-1", suspended: false, blocked: false },
          { id: "mem-2", suspended: true, blocked: false },
          { id: "mem-3", suspended: false, blocked: true },
        ]) as never;
      }
      if (table === "chapters") return makeChain([{ id: "ch-1", name: "Ahmedabad" }]) as never;
      if (table === "roles") return makeChain([{ id: "r-1", name: "Global Admin" }]) as never;
      if (table === "role_assignments") return makeChain([]) as never;
      return makeChain([]) as never;
    });

    vi.spyOn(supabase, "rpc").mockImplementation((fnName: string) => {
      if (fnName === "get_member_emails") {
        return makeChain([
          { member_id: "mem-1", email: "asha@example.com", email_confirmed_at: null },
          { member_id: "mem-2", email: "bharat@example.com", email_confirmed_at: "2026-02-15T00:00:00Z" },
          { member_id: "mem-3", email: "chetan@example.com", email_confirmed_at: "2026-03-20T00:00:00Z" },
        ]) as never;
      }
      if (fnName === "get_member_phones") {
        return makeChain([]) as never;
      }
      return makeChain([]) as never;
    });
  }

  it("handles bulk invite file upload (duplicates & invalid lines), zero-sent result, and error path", async () => {
    mockMembersTabData();
    const invokeSpy = spyFunctionsInvoke()
      .mockResolvedValueOnce({
        data: { sent: 0, failed: 1, skipped: 0, errors: ["Already exists"], total: 1 },
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Bulk invite server error" },
      } as never);

    renderApp(
      <MembersTab
        members={sampleMembers}
        myChapterId={null}
        canInvite={true}
        canSendReminders={true}
        isGlobalAdmin={true}
      />,
      { route: "/admin" }
    );
    expect(await screen.findByText(/Asha Desai/i)).toBeInTheDocument();

    // Open Bulk Invite dialog
    const bulkBtn = screen.getByRole("button", { name: /bulk invite/i });
    fireEvent.click(bulkBtn);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Upload file with 1 valid, 1 duplicate, 1 invalid line (singular branches L1038, L1041)
    const csvContent = "alice@example.com\nalice@example.com\nnot-an-email";
    const file = new File([csvContent], "invites.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/1 duplicate removed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 invalid line skipped/i)).toBeInTheDocument();

    // Submit bulk invite -> sent: 0, failed: 1 (L185 singular)
    const sendBulkBtn = screen.getByRole("button", { name: /send 1 invitation/i });
    fireEvent.click(sendBulkBtn);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledTimes(1);
    });

    // Re-open Bulk Invite and trigger error branch (L172)
    fireEvent.click(screen.getByRole("button", { name: /bulk invite/i }));
    const fileInput2 = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file2 = new File(["bob@example.com"], "invites2.csv", { type: "text/csv" });
    fireEvent.change(fileInput2, { target: { files: [file2] } });
    const sendBulkBtn2 = await screen.findByRole("button", { name: /send 1 invitation/i });
    fireEvent.click(sendBulkBtn2);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("handles invite-member error branch", async () => {
    mockMembersTabData();
    const invokeSpy = spyFunctionsInvoke().mockResolvedValueOnce({
      data: null,
      error: { message: "Invite service down" },
    } as never);

    renderApp(
      <MembersTab
        members={sampleMembers}
        myChapterId={null}
        canInvite={true}
        canSendReminders={true}
        isGlobalAdmin={true}
      />,
      { route: "/admin" }
    );
    expect(await screen.findByText(/Asha Desai/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /invite member/i }));
    const dialog = await screen.findByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "new@example.com" } });
    fireEvent.change(inputs[1], { target: { value: "New" } });

    const sendBtn = screen.getByRole("button", { name: /send invitation/i });
    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledWith("invite-member", expect.anything());
    });
  });
});
