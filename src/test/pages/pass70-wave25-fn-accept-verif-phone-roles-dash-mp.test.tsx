/**
 * Pass 70 — Wave 25 final sweep (Worker B):
 * Close remaining uncovered functions and lines in:
 *  - src/pages/AcceptFamilyInvite.tsx
 *  - src/components/admin/VerificationDashboard.tsx
 *  - src/components/profile/PhoneField.tsx
 *  - src/components/admin/RolesTab.tsx
 *  - src/pages/Dashboard.tsx
 *  - src/pages/MemberProfile.tsx
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import AcceptFamilyInvite from "@/pages/AcceptFamilyInvite";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import { PhoneField } from "@/components/profile/PhoneField";
import RolesTab from "@/components/admin/RolesTab";
import Dashboard from "@/pages/Dashboard";
import MemberProfile from "@/pages/MemberProfile";

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

describe("Pass 70 — Wave 25 final sweep (Worker B)", () => {
  it("AcceptFamilyInvite: already_used state and Go to My Profile button", async () => {
    vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_family_invitation_preview") {
        return Promise.resolve({
          data: {
            found: true,
            status: "accepted",
            invitee_name: "Priya Shah",
            relation: "sister",
            inviter_first_name: "Aarav",
            inviter_last_name: "Shah",
          },
          error: null,
        }) as never;
      }
      return Promise.resolve({ data: null, error: null }) as never;
    });

    renderApp(
      <Routes>
        <Route path="/accept-family-invite/:token" element={<AcceptFamilyInvite />} />
        <Route path="/profile" element={<div>Profile Dest</div>} />
      </Routes>,
      { route: "/accept-family-invite/tok-used" },
    );

    const goBtn = await screen.findByRole("button", { name: /go to my profile/i });
    fireEvent.click(goBtn);
    await screen.findByText("Profile Dest");
  });

  it("AcceptFamilyInvite: handleAccept when no member profile exists", async () => {
    vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_family_invitation_preview") {
        return Promise.resolve({
          data: {
            found: true,
            status: "pending",
            invitee_name: "Priya Shah",
            relation: "sister",
            inviter_first_name: "Aarav",
            inviter_last_name: "Shah",
          },
          error: null,
        }) as never;
      }
      return Promise.resolve({ data: null, error: null }) as never;
    });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain(null) as never;
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/accept-family-invite/:token" element={<AcceptFamilyInvite />} />
      </Routes>,
      { route: "/accept-family-invite/tok-nomem" },
    );

    const acceptBtn = await screen.findByRole("button", { name: /accept & connect/i });
    fireEvent.click(acceptBtn);
    await screen.findByText(/no member profile found/i);
  });

  it("AcceptFamilyInvite: handleAccept RPC error path", async () => {
    vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_family_invitation_preview") {
        return Promise.resolve({
          data: {
            found: true,
            status: "pending",
            invitee_name: "Priya Shah",
            relation: "sister",
            inviter_first_name: "Aarav",
            inviter_last_name: "Shah",
          },
          error: null,
        }) as never;
      }
      if (fn === "accept_family_invitation") {
        return Promise.resolve({
          data: { error: "Already connected" },
          error: null,
        }) as never;
      }
      return Promise.resolve({ data: null, error: null }) as never;
    });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain({ id: "m-1" }) as never;
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/accept-family-invite/:token" element={<AcceptFamilyInvite />} />
      </Routes>,
      { route: "/accept-family-invite/tok-err" },
    );

    const acceptBtn = await screen.findByRole("button", { name: /accept & connect/i });
    fireEvent.click(acceptBtn);
    await screen.findByText("Already connected");
  });

  it("AcceptFamilyInvite: handleAccept success and View My Profile button", async () => {
    vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_family_invitation_preview") {
        return Promise.resolve({
          data: {
            found: true,
            status: "pending",
            invitee_name: "Priya Shah",
            relation: "sister",
            inviter_first_name: "Aarav",
            inviter_last_name: "Shah",
          },
          error: null,
        }) as never;
      }
      if (fn === "accept_family_invitation") {
        return Promise.resolve({ data: { ok: true }, error: null }) as never;
      }
      return Promise.resolve({ data: null, error: null }) as never;
    });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") return makeChain({ id: "m-1" }) as never;
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/accept-family-invite/:token" element={<AcceptFamilyInvite />} />
        <Route path="/profile" element={<div>Profile Success Dest</div>} />
      </Routes>,
      { route: "/accept-family-invite/tok-ok" },
    );

    const acceptBtn = await screen.findByRole("button", { name: /accept & connect/i });
    fireEvent.click(acceptBtn);
    const viewBtn = await screen.findByRole("button", { name: /view my profile/i });
    fireEvent.click(viewBtn);
    await screen.findByText("Profile Success Dest");
  });

  it("AcceptFamilyInvite: unauthenticated user sees Sign In to Accept link", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    vi.spyOn(supabase.auth, "onAuthStateChange").mockImplementation((cb) => {
      cb("SIGNED_OUT", null);
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
    vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_family_invitation_preview") {
        return Promise.resolve({
          data: {
            found: true,
            status: "pending",
            invitee_name: "Priya Shah",
            relation: "sister",
            inviter_first_name: "Aarav",
            inviter_last_name: "Shah",
          },
          error: null,
        }) as never;
      }
      return Promise.resolve({ data: null, error: null }) as never;
    });

    renderApp(
      <Routes>
        <Route path="/accept-family-invite/:token" element={<AcceptFamilyInvite />} />
      </Routes>,
      { route: "/accept-family-invite/tok-anon" },
    );

    const signInLink = await screen.findByRole("link", { name: /sign in to accept/i });
    expect(signInLink.getAttribute("href")).toContain("/auth?redirect=/accept-family-invite/tok-anon");
  });

  it("VerificationDashboard: bulk Send Reminder and dialog Approve buttons", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({ data: { sent: 1, failed: 0, errors: [] }, error: null });
    vi.spyOn(supabase, "functions", "get").mockReturnValue({ invoke: invokeSpy } as never);
    const vrUpdateSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_member_emails") {
        return Promise.resolve({
          data: [{ member_id: "pm-1", email: "pm1@example.com", email_confirmed_at: null }],
          error: null,
        }) as never;
      }
      return Promise.resolve({ data: [], error: null }) as never;
    });

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain([
          {
            id: "pm-1",
            first_name: "Pending",
            last_name: "Member",
            verification_level: 0,
            chapter_id: "ch-1",
          },
        ]) as never;
      }
      if (table === "verification_requests") {
        const c = makeChain([
          {
            id: "vr-1",
            member_id: "m-2",
            requested_level: 2,
            status: "pending",
            created_at: new Date().toISOString(),
            notes: "ID uploaded",
            members: {
              first_name: "Verify",
              last_name: "Me",
              chapter_id: "ch-1",
              verification_level: 1,
            },
          },
        ]);
        c.update = vrUpdateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders />);

    const selectAll = await screen.findByRole("checkbox", { name: /select all pending members/i });
    fireEvent.click(selectAll);
    const sendSelectedBtn = await screen.findByRole("button", { name: /send reminder \(1\)/i });
    fireEvent.click(sendSelectedBtn);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalled();
    });

    const moreBtn = await screen.findByRole("button", { name: /more/i });
    fireEvent.click(moreBtn);
    const approveBtns = await screen.findAllByRole("button", { name: /approve/i });
    // Last Approve button is inside the Verification Decision dialog
    fireEvent.click(approveBtns[approveBtns.length - 1]);
    await waitFor(() => {
      expect(vrUpdateSpy).toHaveBeenCalled();
    });
  });

  it("PhoneField: parses plain phone without country code, cancel button, and save onSuccess", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "member_contacts") {
        const c = makeChain({ id: "mc-1", member_id: "m-1", type: "phone", value: "9876543210", primary_flag: true });
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PhoneField memberId="m-1" />);
    await screen.findByText("9876543210");

    // Enter edit mode, then cancel (covers setEditing(false))
    fireEvent.click(screen.getByRole("button"));
    const input = await screen.findByPlaceholderText("9876543210");
    expect((input as HTMLInputElement).value).toBe("9876543210");

    const buttonsInEdit = screen.getAllByRole("button");
    // Cancel is the last button (X icon)
    fireEvent.click(buttonsInEdit[buttonsInEdit.length - 1]);
    await screen.findByText("9876543210");

    // Re-enter edit mode and save (covers onSuccess)
    fireEvent.click(screen.getByRole("button"));
    const saveButtons = await screen.findAllByRole("button");
    // Check button is second-to-last button
    fireEvent.click(saveButtons[saveButtons.length - 2]);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  it("RolesTab: revokeRole onSuccess callback", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never);

    renderApp(
      <RolesTab
        myChapterId={null}
        roleAssignments={[
          {
            id: "ra-1",
            start_date: "2026-01-01",
            members: { first_name: "Neha", last_name: "Shah" },
            roles: { name: "Moderator", scope: "global" },
            chapters: null,
          },
        ]}
      />,
    );
    const revokeIconBtn = await screen.findByRole("button", { name: /revoke moderator from neha shah/i });
    fireEvent.click(revokeIconBtn);

    const confirmBtn = await screen.findByRole("button", { name: /^revoke role$/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(rpcSpy).toHaveBeenCalledWith("revoke_role", { p_assignment_id: "ra-1" });
    });
  });

  it("Dashboard: clicking Find Members to Vouch navigates to /directory", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Level0",
          last_name: "User",
          verification_level: 0,
          onboarding_completed: true,
          chapter_id: "ch-1",
          chapters: { name: "Ahmedabad" },
        }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/directory" element={<div>Directory Dest</div>} />
      </Routes>,
      { route: "/dashboard" },
    );

    const vouchBtn = await screen.findByRole("button", { name: /find members to vouch/i });
    fireEvent.click(vouchBtn);
    await screen.findByText("Directory Dest");
  });

  it("MemberProfile: verifyEmploymentMutation onError path", async () => {
    const empUpdateSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("Employment verify failed")));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-other",
          user_id: "other-user-id",
          first_name: "Other",
          last_name: "Member",
          verification_level: 1,
          chapter_id: "ch-1",
          privacy: {},
          chapters: { name: "Ahmedabad" },
        }) as never;
      }
      if (table === "employment") {
        const c = makeChain([
          {
            id: "emp-1",
            member_id: "m-other",
            job_title: "Engineer",
            company: "Acme",
            verified: false,
          },
        ]);
        c.update = empUpdateSpy;
        return c as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-admin",
            chapter_id: null,
            roles: { name: "Global Admin", scope: "global" },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/member/:id" element={<MemberProfile />} />
      </Routes>,
      { route: "/member/m-other" },
    );

    const verifyBtn = await screen.findByRole("button", { name: /^verify$/i });
    fireEvent.click(verifyBtn);
    await waitFor(() => {
      expect(empUpdateSpy).toHaveBeenCalled();
    });
  });
});
