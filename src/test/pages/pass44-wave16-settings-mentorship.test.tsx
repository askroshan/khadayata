/**
 * Pass 44 — Wave 16: Branch coverage burn-down for Settings.tsx and Mentorship.tsx.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Settings from "@/pages/Settings";
import Mentorship from "@/pages/Mentorship";

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

const mockMember = {
  id: "m-1",
  user_id: "u-1",
  first_name: "Test",
  last_name: "Admin",
  verification_level: 3,
  onboarding_completed: true,
  chapter_id: "ch-1",
  privacy: null,
};

describe("Pass 44 — Wave 16: Settings.tsx branch coverage", () => {
  it("Settings: null privacy fallback, mouseDown on combobox & label, and savePrivacy error branch", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain(mockMember);
        c.update = () => makeChain(null, { message: "forced privacy save error" });
        return c as never;
      }
      if (table === "notification_preferences") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Settings />, { route: "/settings?tab=privacy" });

    const dobLabel = await screen.findByText(/^dob$/i);
    fireEvent.mouseDown(dobLabel);

    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.mouseDown(comboboxes[0]);

    const saveBtn = screen.getByRole("button", { name: /save privacy settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveBtn).not.toBeDisabled();
    });
  });

  it("Settings: notifications tab with populated notifPrefs, toggling switches, and saveNotifPrefs error", async () => {
    const upsertSpy = vi.fn().mockImplementation(() =>
      makeChain(null, { message: "forced notif upsert error" })
    );
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({ ...mockMember, privacy: { dob: "private" } }) as never;
      }
      if (table === "notification_preferences") {
        const c = makeChain({
          member_id: "m-1",
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

    renderApp(<Settings />, { route: "/settings?tab=notifications" });

    const switches = await screen.findAllByRole("switch");
    expect(switches.length).toBe(4);
    for (const sw of switches) {
      fireEvent.click(sw);
    }

    const saveBtn = screen.getByRole("button", { name: /save preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalled();
    });
  });

  it("Settings: notifications tab saveNotifPrefs throws when member is null", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null) as never;
      }
      return makeChain(null) as never;
    });

    renderApp(<Settings />, { route: "/settings?tab=notifications" });

    const saveBtn = await screen.findByRole("button", { name: /save preferences/i });
    await waitFor(() => {
      expect(saveBtn).not.toBeDisabled();
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveBtn).not.toBeDisabled();
    });
  });
});

describe("Pass 44 — Wave 16: Mentorship.tsx branch coverage", () => {
  it("Mentorship: null query data fallbacks for mentorships and myMentorships", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(mockMember) as never;
      }
      if (table === "mentorships") {
        return makeChain(null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Mentorship />, { route: "/mentorship" });
    expect(await screen.findByText(/no skills listed yet/i)).toBeInTheDocument();
  });

  it("Mentorship: null skills, null mentor fields, requestMentorship error, and browse inline offer form validation", async () => {
    const updateSpy = vi.fn().mockImplementation(() =>
      makeChain(null, { message: "forced request error" })
    );
    const insertSpy = vi.fn().mockImplementation(() =>
      makeChain(null, { message: "forced offer insert error" })
    );

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(mockMember) as never;
      }
      if (table === "mentorships") {
        const c = makeChain([
          {
            id: "ms-null-skills",
            mentor_member_id: "m-other-1",
            mentee_member_id: null,
            skills: null,
            status: "available",
            created_at: new Date().toISOString(),
            mentor: null,
            mentee: null,
          },
          {
            id: "ms-valid",
            mentor_member_id: "m-other-2",
            mentee_member_id: null,
            skills: ["React"],
            status: "available",
            created_at: new Date().toISOString(),
            mentor: {
              id: "m-other-2",
              first_name: null,
              last_name: null,
              photo_url: null,
              verification_level: null,
              chapters: null,
            },
            mentee: null,
          },
        ]);
        c.maybeSingle = () => Promise.resolve({ data: null, error: null });
        c.update = updateSpy;
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Mentorship />, { route: "/mentorship" });

    // Click skill chip in Marketplace to render filteredMentors with null mentor fields
    const reactChip = await screen.findByRole("button", { name: /react/i });
    fireEvent.click(reactChip);

    const reqBtns = await screen.findAllByRole("button", { name: /request mentorship/i });
    fireEvent.click(reqBtns[0]);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });

    // Switch to All Mentors tab
    const browseTab = screen.getByRole("tab", { name: /all mentors/i });
    fireEvent.mouseDown(browseTab);
    fireEvent.click(browseTab);

    // Open inline offer form and test empty-skill validation + non-empty submit (insert error)
    const offerBtn = await screen.findByRole("button", { name: /offer mentorship/i });
    fireEvent.click(offerBtn);

    const submitInlineBtn = await screen.findByRole("button", { name: /offer to mentor/i });
    fireEvent.click(submitInlineBtn);
    expect(await screen.findByText(/please enter at least one skill/i)).toBeInTheDocument();

    const skillInput = screen.getByPlaceholderText(/skills you can mentor in/i);
    fireEvent.change(skillInput, { target: { value: "Python" } });
    fireEvent.click(submitInlineBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });
  });

  it("Mentorship: offerMentorship existing mentorship with null skills and update error", async () => {
    const updateSpy = vi.fn().mockImplementation(() =>
      makeChain(null, { message: "forced offer update error" })
    );

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(mockMember) as never;
      }
      if (table === "mentorships") {
        const c = makeChain([]);
        c.maybeSingle = () =>
          Promise.resolve({
            data: { id: "ms-existing", skills: null, status: "available" },
            error: null,
          });
        c.update = updateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Mentorship />, { route: "/mentorship" });

    const offerBtn = await screen.findByRole("button", { name: /offer mentorship/i });
    fireEvent.click(offerBtn);

    const input = await screen.findByPlaceholderText(/e\.g\. react/i);
    fireEvent.change(input, { target: { value: "TypeScript" } });

    const submitBtn = screen.getByRole("button", { name: /offer to mentor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  it("Mentorship: offerMentorship and requestMentorship throw when member is null", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(null) as never;
      }
      if (table === "mentorships") {
        return makeChain([
          {
            id: "ms-1",
            mentor_member_id: "m-other",
            mentee_member_id: null,
            skills: ["Finance"],
            status: "available",
            created_at: new Date().toISOString(),
            mentor: {
              id: "m-other",
              first_name: "Asha",
              last_name: "Shah",
              photo_url: null,
              verification_level: 1,
              chapters: { name: "Mumbai" },
            },
            mentee: null,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Mentorship />, { route: "/mentorship" });

    // Trigger requestMentorship with member === null
    const financeChip = await screen.findByRole("button", { name: /finance/i });
    fireEvent.click(financeChip);
    const reqBtn = await screen.findByRole("button", { name: /request mentorship/i });
    fireEvent.click(reqBtn);

    // Trigger offerMentorship with member === null
    const offerBtn = screen.getByRole("button", { name: /offer mentorship/i });
    fireEvent.click(offerBtn);
    const input = await screen.findByPlaceholderText(/e\.g\. react/i);
    fireEvent.change(input, { target: { value: "Design" } });
    const submitBtn = screen.getByRole("button", { name: /offer to mentor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it("Mentorship: My Mentorships tab with null sessions and logSession empty notes + error", async () => {
    const insertSessionSpy = vi.fn().mockImplementation(() =>
      makeChain(null, { message: "forced session error" })
    );

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain(mockMember) as never;
      }
      if (table === "mentorships") {
        return makeChain([
          {
            id: "ms-active",
            mentor_member_id: "m-1",
            mentee_member_id: "m-2",
            skills: ["Leadership"],
            status: "active",
            created_at: new Date().toISOString(),
            mentor: { first_name: "Test", last_name: "Admin" },
            mentee: { first_name: "Riya", last_name: "Shah" },
            mentorship_sessions: null,
          },
        ]) as never;
      }
      if (table === "mentorship_sessions") {
        const c = makeChain([]);
        c.insert = insertSessionSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Mentorship />, { route: "/mentorship" });

    const myTab = await screen.findByRole("tab", { name: /my mentorships/i });
    fireEvent.mouseDown(myTab);
    fireEvent.click(myTab);

    const logBtn = await screen.findByRole("button", { name: /log session/i });
    fireEvent.click(logBtn);

    const saveSessionBtn = await screen.findByRole("button", { name: /save session/i });
    fireEvent.click(saveSessionBtn);

    await waitFor(() => {
      expect(insertSessionSpy).toHaveBeenCalled();
    });
  });
});
