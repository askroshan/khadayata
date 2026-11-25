/**
 * Pass 34 — Wave 13 Batch 3b:
 * Cover remaining uncovered callbacks & mutation onError paths in:
 * 1. VerificationDashboard.tsx (resolveVerification, sendReminder, sendMassReminders onError)
 * 2. Mentorship.tsx (offerMentorship, requestMentorship, logSession onError + requestMentorship onClick)
 * 3. ModeratorDashboard.tsx (resolveReport, updateLevel onError + downgrade updateLevel onClick)
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import Mentorship from "@/pages/Mentorship";
import ModeratorDashboard from "@/pages/ModeratorDashboard";

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

function makeChain(
  data: unknown,
  error: unknown = null,
  singleData?: unknown
) {
  const result = { data, error, count: Array.isArray(data) ? data.length : 0 };
  const singleResult = {
    data: singleData !== undefined ? singleData : Array.isArray(data) ? data[0] ?? null : data,
    error,
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
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(singleResult),
    maybeSingle: () => Promise.resolve(singleResult),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

const ADMIN_MEMBER = {
  id: "m-admin-1",
  user_id: "u-admin-1",
  first_name: "Admin",
  last_name: "User",
  verification_level: 4,
  onboarding_completed: true,
  chapter_id: "ch-1",
  chapters: { name: "Ahmedabad" },
};

describe("Pass 34 — Wave 13 Batch 3b uncovered callbacks & onError paths", () => {
  it("VerificationDashboard: triggers resolveVerification, sendReminder, and sendMassReminders onError", async () => {
    const invokeSpy = vi
      .spyOn(Object.getPrototypeOf(supabase.functions), "invoke")
      .mockResolvedValue({ data: null, error: { message: "forced reminder error" } } as never);

    const resolveUpdateSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, { message: "forced resolve error" }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(
          [
            {
              id: "m-pending-1",
              first_name: "Pending",
              last_name: "Member",
              verification_level: 0,
              chapter_id: "ch-1",
            },
          ],
          null,
          ADMIN_MEMBER
        ) as never;
      }
      if (table === "verification_requests") {
        const c = makeChain([
          {
            id: "vr-1",
            member_id: "m-req-1",
            requested_level: 2,
            status: "pending",
            created_at: new Date().toISOString(),
            notes: "Please verify",
            members: {
              first_name: "Ravi",
              last_name: "Shah",
              chapter_id: "ch-1",
              verification_level: 1,
            },
          },
        ]);
        c.update = resolveUpdateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <VerificationDashboard
        myChapterId={null}
        isGlobalAdmin={false}
        canSendReminders={true}
      />
    );

    // 1. Trigger resolveVerification onError
    const approveBtn = await screen.findByRole("button", { name: /approve/i });
    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(resolveUpdateSpy).toHaveBeenCalled();
    });

    // 2. Trigger sendReminder onError
    const reminderBtn = await screen.findByRole("button", { name: /send reminder email$/i });
    fireEvent.click(reminderBtn);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledWith("send-reminder", {
        body: { member_ids: ["m-pending-1"] },
      });
    });

    // 3. Trigger sendMassReminders onError
    const massBtn = screen.getByRole("button", { name: /send reminder emails to all/i });
    fireEvent.click(massBtn);
    const confirmMassBtn = await screen.findByRole("button", { name: /^Send to All$/i });
    fireEvent.click(confirmMassBtn);
    await waitFor(() => {
      expect(invokeSpy).toHaveBeenCalledWith("send-reminder", {
        body: { send_to_all: true, chapter_id: null },
      });
    });
  });

  it("Mentorship: triggers offerMentorship, requestMentorship (marketplace + browse), and logSession onError", async () => {
    const user = userEvent.setup();
    const insertMentorshipSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, { message: "forced offer error" }));
    const updateMentorshipSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, { message: "forced request error" }));
    const insertSessionSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, { message: "forced session error" }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(ADMIN_MEMBER) as never;
      }
      if (table === "mentorships") {
        const c = makeChain(
          [
            {
              id: "ment-avail-1",
              mentor_member_id: "m-other-1",
              mentee_member_id: null,
              status: "available",
              skills: ["TypeScript"],
              created_at: new Date().toISOString(),
              mentor: {
                id: "m-other-1",
                first_name: "Meera",
                last_name: "Shah",
                photo_url: null,
                verification_level: 2,
                chapters: { name: "Mumbai" },
              },
              mentee: null,
              mentorship_sessions: [],
            },
            {
              id: "ment-active-1",
              mentor_member_id: ADMIN_MEMBER.id,
              mentee_member_id: "m-other-2",
              status: "active",
              skills: ["Leadership"],
              created_at: new Date().toISOString(),
              mentor: { first_name: "Admin", last_name: "User" },
              mentee: { first_name: "Kiran", last_name: "Patel" },
              mentorship_sessions: [],
            },
          ],
          null,
          null
        );
        c.insert = insertMentorshipSpy;
        c.update = updateMentorshipSpy;
        return c as never;
      }
      if (table === "mentorship_sessions") {
        const c = makeChain([]);
        c.insert = insertSessionSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Mentorship />, { route: "/mentorship" });

    // 1. Marketplace tab: click skill pill -> click Request Mentorship (covers line 271 + requestMentorship onError)
    const skillBtn = await screen.findByRole("button", { name: /TypeScript/i });
    await user.click(skillBtn);
    const reqBtnMarketplace = await screen.findByRole("button", { name: /Request Mentorship/i });
    await user.click(reqBtnMarketplace);
    await waitFor(() => {
      expect(updateMentorshipSpy).toHaveBeenCalled();
    });

    // 2. Offer Mentorship dialog -> trigger offerMentorship onError
    const offerBtn = screen.getByRole("button", { name: /Offer Mentorship/i });
    await user.click(offerBtn);
    const skillsInput = await screen.findByPlaceholderText(/e\.g\. React/i);
    await user.type(skillsInput, "Finance");
    const submitOfferBtn = screen.getByRole("button", { name: /Offer to Mentor/i });
    await user.click(submitOfferBtn);
    await waitFor(() => {
      expect(insertMentorshipSpy).toHaveBeenCalled();
    });
    // Close dialog via Escape
    await user.keyboard("{Escape}");

    // 3. All Mentors (browse) tab -> click Request Mentorship (covers line 386)
    const browseTab = screen.getByRole("tab", { name: /All Mentors/i });
    await user.click(browseTab);
    const reqBtnBrowse = await screen.findByRole("button", { name: /Request Mentorship/i });
    await user.click(reqBtnBrowse);
    await waitFor(() => {
      expect(updateMentorshipSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    // 4. My Mentorships tab -> Log Session -> Save Session (triggers logSession onError)
    const myTab = screen.getByRole("tab", { name: /My Mentorships/i });
    await user.click(myTab);
    const logSessionBtn = await screen.findByRole("button", { name: /Log Session/i });
    await user.click(logSessionBtn);
    const saveSessionBtn = await screen.findByRole("button", { name: /Save Session/i });
    await user.click(saveSessionBtn);
    await waitFor(() => {
      expect(insertSessionSpy).toHaveBeenCalled();
    });
  });

  it("ModeratorDashboard: triggers resolveReport onError and downgrade updateLevel onClick + onError", async () => {
    const user = userEvent.setup();
    const reportUpdateSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, { message: "forced report error" }));
    const memberUpdateSpy = vi
      .fn()
      .mockImplementation(() => makeChain(null, { message: "forced level error" }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "role_assignments") {
        return makeChain([
          {
            id: "ra-1",
            role_id: "r-ga",
            chapter_id: null,
            roles: { name: "Global Admin", scope: "global" },
            start_date: null,
            end_date: null,
          },
        ]) as never;
      }
      if (table === "members") {
        const c = makeChain(
          [
            {
              id: "m-dir-1",
              first_name: "Neha",
              last_name: "Desai",
              verification_level: 2,
              chapter_id: "ch-1",
              chapters: { name: "Ahmedabad" },
            },
          ],
          null,
          ADMIN_MEMBER
        );
        c.update = memberUpdateSpy;
        return c as never;
      }
      if (table === "reports") {
        const c = makeChain([
          {
            id: "rep-1",
            entity_type: "member",
            entity_id: "m-dir-1",
            category: "fake",
            reason: "Suspicious account",
            status: "pending",
            admin_action: null,
            admin_notes: null,
            reviewed_at: null,
            created_at: new Date().toISOString(),
            reporter: {
              id: "m-rep-1",
              first_name: "Amit",
              last_name: "Shah",
              photo_url: null,
            },
            reviewer: null,
          },
        ]);
        c.update = reportUpdateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ModeratorDashboard />, { route: "/moderator" });

    // 1. Reports tab: click Act -> click Dismiss (triggers resolveReport onError)
    const actBtn = await screen.findByRole("button", { name: /^Act$/i });
    await user.click(actBtn);
    const dismissBtn = await screen.findByRole("button", { name: /Dismiss/i });
    await user.click(dismissBtn);
    await waitFor(() => {
      expect(reportUpdateSpy).toHaveBeenCalled();
    });
    await user.keyboard("{Escape}");

    // 2. Members tab: click Downgrade button (triggers downgrade updateLevel onClick + onError)
    const membersTab = screen.getByRole("tab", { name: /Members/i });
    await user.click(membersTab);
    const downgradeBtn = await screen.findByRole("button", {
      name: /Downgrade Neha Desai verification level/i,
    });
    await user.click(downgradeBtn);
    await waitFor(() => {
      expect(memberUpdateSpy).toHaveBeenCalledWith({ verification_level: 1 });
    });
  });
});
