/**
 * Pass 33 — Wave 13 Batch 3a: Uncovered mutation onError callbacks in
 * Matrimonial, EldersCouncil, and Scholarships.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Matrimonial from "@/pages/Matrimonial";
import EldersCouncil from "@/pages/EldersCouncil";
import Scholarships from "@/pages/Scholarships";

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

const ADMIN_MEMBER = {
  id: "m-1",
  user_id: "u-1",
  first_name: "Test",
  last_name: "Admin",
  verification_level: 3,
  onboarding_completed: true,
  chapter_id: "ch-1",
  chapters: { name: "Ahmedabad" },
};

const GLOBAL_ADMIN_ROLES = [
  {
    id: "ra-1",
    role_id: "r-1",
    chapter_id: null,
    roles: { name: "Global Admin", scope: "global" },
    start_date: null,
    end_date: null,
  },
];

describe("Pass 33 — Wave 13 Batch 3a: onError callbacks", () => {
  describe("Matrimonial.tsx (4 onError callbacks)", () => {
    function setupMatrimonialMock() {
      const myProfile = {
        id: "mp-me",
        member_id: "m-1",
        verified: true,
        height_cm: 175,
        current_city: "Ahmedabad",
        diet: "Vegetarian",
        marital_status: "Never Married",
        preferences: {},
      };
      const otherProfile = {
        id: "mp-other",
        member_id: "m-2",
        verified: false,
        height_cm: 165,
        current_city: "Mumbai",
        diet: "Vegetarian",
        marital_status: "Never Married",
        preferences: {},
        member: {
          id: "m-2",
          first_name: "Diya",
          last_name: "Shah",
          gender: "female",
          dob: "1996-05-10",
          photo_url: null,
          chapters: { name: "Mumbai" },
        },
      };
      const pendingIntro = {
        id: "intro-1",
        from_member_id: "m-3",
        to_member_id: "m-1",
        status: "pending",
        message: "Namaste",
        created_at: new Date().toISOString(),
        from: { first_name: "Riya", last_name: "Patel" },
        to: { first_name: "Test", last_name: "Admin" },
      };

      const moderateSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced moderate error" }));
      const rishtaSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced rishta error" }));
      const sendIntroSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced sendIntro error" }));
      const respondIntroSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced respondIntro error" }));

      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") return makeChain(ADMIN_MEMBER) as never;
        if (table === "role_assignments") return makeChain(GLOBAL_ADMIN_ROLES) as never;
        if (table === "matrimonial_profiles") {
          const c = makeChain([otherProfile]);
          c.maybeSingle = () => Promise.resolve({ data: myProfile, error: null });
          c.update = moderateSpy;
          c.delete = moderateSpy;
          return c as never;
        }
        if (table === "rishta_requests") {
          const c = makeChain([]);
          c.insert = rishtaSpy;
          return c as never;
        }
        if (table === "matrimonial_introductions") {
          const c = makeChain([pendingIntro]);
          c.insert = sendIntroSpy;
          c.update = respondIntroSpy;
          return c as never;
        }
        return makeChain([]) as never;
      });

      return { moderateSpy, rishtaSpy, sendIntroSpy, respondIntroSpy };
    }

    it("triggers sendIntro and sendRishta onError callbacks", async () => {
      const { sendIntroSpy, rishtaSpy } = setupMatrimonialMock();
      renderApp(<Matrimonial />, { route: "/matrimonial" });

      const introBtn = await screen.findByRole("button", { name: /introduce/i });
      fireEvent.click(introBtn);
      await waitFor(() => {
        expect(sendIntroSpy).toHaveBeenCalled();
      });

      const rishtaTrigger = screen.getByRole("button", { name: /send formal rishta request/i });
      fireEvent.click(rishtaTrigger);
      const contactInput = await screen.findByPlaceholderText(/Ramesh Shah/i);
      fireEvent.change(contactInput, { target: { value: "Ramesh Shah" } });
      fireEvent.click(screen.getByRole("button", { name: /send rishta request/i }));
      await waitFor(() => {
        expect(rishtaSpy).toHaveBeenCalled();
      });
    });

    it("triggers respondIntro onError callback", async () => {
      const { respondIntroSpy } = setupMatrimonialMock();
      renderApp(<Matrimonial />, { route: "/matrimonial" });

      const introsTab = await screen.findByRole("tab", { name: /intros/i });
      fireEvent.mouseDown(introsTab);
      fireEvent.click(introsTab);

      const acceptBtn = await screen.findByRole("button", { name: /accept/i });
      fireEvent.click(acceptBtn);
      await waitFor(() => {
        expect(respondIntroSpy).toHaveBeenCalled();
      });
    });

    it("triggers moderateProfile onError callback", async () => {
      const { moderateSpy } = setupMatrimonialMock();
      renderApp(<Matrimonial />, { route: "/matrimonial" });

      const moderateTab = await screen.findByRole("tab", { name: /moderate/i });
      fireEvent.mouseDown(moderateTab);
      fireEvent.click(moderateTab);

      const verifyBtn = await screen.findByRole("button", { name: /verify profile/i });
      fireEvent.click(verifyBtn);
      await waitFor(() => {
        expect(moderateSpy).toHaveBeenCalled();
      });
    });
  });

  describe("EldersCouncil.tsx (3 onError callbacks)", () => {
    it("triggers vote, postReply, and createThread onError callbacks", async () => {
      const voteSpy = vi.fn().mockRejectedValue(new Error("forced vote error"));
      const replySpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced reply error" }));
      const threadSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced thread error" }));

      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") return makeChain(ADMIN_MEMBER) as never;
        if (table === "role_assignments") return makeChain(GLOBAL_ADMIN_ROLES) as never;
        if (table === "council_threads") {
          const c = makeChain([
            {
              id: "th-1",
              title: "Wave13 Council Topic",
              body: "Discussion body",
              category: "governance",
              closed: false,
              pinned: false,
              created_at: new Date().toISOString(),
              author: { first_name: "Elder", last_name: "Shah", verification_level: 3 },
              council_replies: [],
              council_votes: [],
            },
          ]);
          c.insert = threadSpy;
          return c as never;
        }
        if (table === "council_votes") {
          const c = makeChain(null);
          c.upsert = voteSpy;
          return c as never;
        }
        if (table === "council_replies") {
          const c = makeChain([]);
          c.insert = replySpy;
          return c as never;
        }
        return makeChain([]) as never;
      });

      renderApp(<EldersCouncil />, { route: "/elders-council" });

      // 1. vote onError
      const upvoteBtn = await screen.findByRole("button", { name: /upvote/i });
      fireEvent.click(upvoteBtn);
      await waitFor(() => {
        expect(voteSpy).toHaveBeenCalled();
      });

      // 2. postReply onError
      fireEvent.click(screen.getByText("Wave13 Council Topic"));
      const replyInput = await screen.findByPlaceholderText(/add your reply/i);
      fireEvent.change(replyInput, { target: { value: "My council reply" } });
      fireEvent.click(screen.getByRole("button", { name: /post reply/i }));
      await waitFor(() => {
        expect(replySpy).toHaveBeenCalled();
      });

      // Close thread dialog via Escape
      fireEvent.keyDown(document, { key: "Escape" });

      // 3. createThread onError
      fireEvent.click(screen.getByRole("button", { name: /new thread/i }));
      const titleInput = await screen.findByPlaceholderText(/thread title/i);
      const bodyInput = screen.getByPlaceholderText(/share your thoughts/i);
      fireEvent.change(titleInput, { target: { value: "New Topic" } });
      fireEvent.change(bodyInput, { target: { value: "New Body" } });
      fireEvent.click(screen.getByRole("button", { name: /post thread/i }));
      await waitFor(() => {
        expect(threadSpy).toHaveBeenCalled();
      });
    });
  });

  describe("Scholarships.tsx (2 onError callbacks)", () => {
    it("triggers applyScholarship and createScholarship onError callbacks", async () => {
      const applySpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced apply error" }));
      const createSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced create error" }));

      vi.spyOn(supabase, "from").mockImplementation((table: string) => {
        if (table === "members") return makeChain(ADMIN_MEMBER) as never;
        if (table === "role_assignments") return makeChain(GLOBAL_ADMIN_ROLES) as never;
        if (table === "scholarships") {
          const c = makeChain([
            {
              id: "sch-1",
              name: "Wave13 Merit Award",
              description: "For students",
              amount: 50000,
              currency: "INR",
              deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
              chapter_id: "ch-1",
              eligibility: "L1+",
              chapters: { name: "Ahmedabad" },
            },
          ]);
          c.insert = createSpy;
          return c as never;
        }
        if (table === "scholarship_applications") {
          const c = makeChain([]);
          c.insert = applySpy;
          return c as never;
        }
        return makeChain([]) as never;
      });

      renderApp(<Scholarships />, { route: "/scholarships" });

      // 1. applyScholarship onError
      const applyBtn = await screen.findByRole("button", { name: /apply now/i });
      fireEvent.click(applyBtn);
      const submitAppBtn = await screen.findByRole("button", { name: /submit application/i });
      fireEvent.click(submitAppBtn);
      await waitFor(() => {
        expect(applySpy).toHaveBeenCalled();
      });

      // Close apply dialog
      fireEvent.keyDown(document, { key: "Escape" });

      // 2. createScholarship onError
      const createTrigger = await screen.findByRole("button", { name: /create scholarship/i });
      fireEvent.click(createTrigger);
      const nameInputs = await screen.findAllByRole("textbox");
      fireEvent.change(nameInputs[0], { target: { value: "New Merit Scholarship" } });
      const submitCreateBtns = screen.getAllByRole("button", { name: /create scholarship/i });
      fireEvent.click(submitCreateBtns[submitCreateBtns.length - 1]);
      await waitFor(() => {
        expect(createSpy).toHaveBeenCalled();
      });
    });
  });
});
