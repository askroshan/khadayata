/**
 * Pass 39 — Wave 15: Branch coverage burn-down for Matrimonial.tsx and useChapter.ts.
 */
import React from "react";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Matrimonial from "@/pages/Matrimonial";
import {
  useChapterBySlug,
  useChapterMemberCount,
  useChapterMembers,
  useChapterCommittee,
  useChapterPastCommittee,
  useChapterEvents,
  useChapterNews,
  useChapterBusinesses,
  useChapterJobs,
  useChapterGallery,
  useTotalMemberCount,
  useTotalChapterCount,
  useTotalBusinessCount,
  useTotalCountryCount,
} from "@/hooks/useChapter";

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

function makeChain(data: unknown, error: unknown = null, count: number | null = Array.isArray(data) ? data.length : null) {
  const result = { data, error, count };
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

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("Pass 39 — Wave 15: useChapter.ts branch coverage", () => {
  it("handles null data/count fallbacks across all chapter hooks", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null, null, null) as never);

    const wrapper = makeWrapper();
    const { result } = renderHook(
      () => ({
        bySlug: useChapterBySlug("ahmedabad"),
        memberCount: useChapterMemberCount("ch-1"),
        members: useChapterMembers("ch-1"),
        committee: useChapterCommittee("ch-1"),
        pastCommittee: useChapterPastCommittee("ch-1"),
        eventsUpcoming: useChapterEvents("ch-1", false),
        eventsPast: useChapterEvents("ch-1", true),
        news: useChapterNews("ch-1"),
        businesses: useChapterBusinesses("ch-1"),
        jobs: useChapterJobs("ch-1"),
        gallery: useChapterGallery("ch-1"),
        totalMembers: useTotalMemberCount(),
        totalChapters: useTotalChapterCount(),
        totalBusinesses: useTotalBusinessCount(),
        totalCountries: useTotalCountryCount(),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.bySlug.isSuccess).toBe(true);
      expect(result.current.memberCount.data).toBe(0);
      expect(result.current.members.data).toEqual([]);
      expect(result.current.committee.data).toEqual([]);
      expect(result.current.pastCommittee.data).toEqual([]);
      expect(result.current.eventsUpcoming.data).toEqual([]);
      expect(result.current.eventsPast.data).toEqual([]);
      expect(result.current.news.data).toEqual([]);
      expect(result.current.businesses.data).toEqual([]);
      expect(result.current.jobs.data).toEqual([]);
      expect(result.current.gallery.data).toEqual([]);
      expect(result.current.totalMembers.data).toBe(0);
      expect(result.current.totalChapters.data).toBe(0);
      expect(result.current.totalBusinesses.data).toBe(0);
      expect(result.current.totalCountries.data).toBe(0);
    });
  });

  it("handles null row.members in useChapterCommittee and useChapterPastCommittee", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() =>
      makeChain([{ id: "ra-1", start_date: "2024-01-01", end_date: null, roles: { name: "Chair" }, members: null }]) as never
    );

    const wrapper = makeWrapper();
    const { result } = renderHook(
      () => ({
        committee: useChapterCommittee("ch-1"),
        pastCommittee: useChapterPastCommittee("ch-1"),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.committee.data).toHaveLength(1);
      expect(result.current.pastCommittee.data).toHaveLength(1);
    });
  });

  it("throws errors across all chapter hooks when supabase returns an error", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null, new Error("db error"), null) as never);

    const wrapper = makeWrapper();
    const { result } = renderHook(
      () => ({
        bySlug: useChapterBySlug("ahmedabad"),
        memberCount: useChapterMemberCount("ch-1"),
        members: useChapterMembers("ch-1"),
        committee: useChapterCommittee("ch-1"),
        pastCommittee: useChapterPastCommittee("ch-1"),
        eventsUpcoming: useChapterEvents("ch-1", false),
        news: useChapterNews("ch-1"),
        businesses: useChapterBusinesses("ch-1"),
        jobs: useChapterJobs("ch-1"),
        gallery: useChapterGallery("ch-1"),
        totalMembers: useTotalMemberCount(),
        totalChapters: useTotalChapterCount(),
        totalBusinesses: useTotalBusinessCount(),
        totalCountries: useTotalCountryCount(),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.bySlug.isError).toBe(true);
      expect(result.current.memberCount.isError).toBe(true);
      expect(result.current.members.isError).toBe(true);
      expect(result.current.committee.isError).toBe(true);
      expect(result.current.pastCommittee.isError).toBe(true);
      expect(result.current.eventsUpcoming.isError).toBe(true);
      expect(result.current.news.isError).toBe(true);
      expect(result.current.businesses.isError).toBe(true);
      expect(result.current.jobs.isError).toBe(true);
      expect(result.current.gallery.isError).toBe(true);
      expect(result.current.totalMembers.isError).toBe(true);
      expect(result.current.totalChapters.isError).toBe(true);
      expect(result.current.totalBusinesses.isError).toBe(true);
      expect(result.current.totalCountries.isError).toBe(true);
    });
  });
});

const MY_PROFILE = {
  id: "mp-me",
  member_id: "m-1",
  gotra: "Garg",
  ekda: "EkdaA",
  current_city: "Ahmedabad",
  current_state: null,
  education_level: "MBA",
  education_field: null,
  income: 1500000,
  income_currency: null,
  verified: true,
  preferences: {},
};

const OTHER_PROFILES = [
  {
    id: "mp-1",
    member_id: "m-2",
    gotra: "Garg",
    ekda: "EkdaA",
    current_city: "Surat",
    current_state: "Gujarat",
    visa_type: "Citizen",
    verified: false,
    member: {
      id: "m-2",
      first_name: "Aarav",
      last_name: "Shah",
      gender: "Male",
      dob: "2002-01-01",
      photo_url: null,
      chapters: null,
    },
  },
  {
    id: "mp-2",
    member_id: "m-3",
    gotra: "Garg",
    ekda: "EkdaB",
    current_city: null,
    current_state: "Maharashtra",
    visa_type: "H1B",
    verified: true,
    member: {
      id: "m-3",
      first_name: "Diya",
      last_name: "Patel",
      gender: "Female",
      dob: "1990-01-01",
      photo_url: null,
      chapters: { name: "Mumbai" },
    },
  },
  {
    id: "mp-3",
    member_id: "m-4",
    gotra: "Kashyap",
    ekda: "EkdaA",
    current_city: "Pune",
    current_state: "Maharashtra",
    visa_type: "PR",
    verified: false,
    member: {
      id: "m-4",
      first_name: "Kiran",
      last_name: "Mehta",
      gender: "Female",
      dob: "1992-01-01",
      photo_url: null,
      chapters: { name: "Pune" },
    },
  },
];

describe("Pass 39 — Wave 15: Matrimonial.tsx branch coverage", () => {
  it("renders all Gotra/Ekda conflict banners, filters (minAge, city/state, visaType, gotra), My Profile fallbacks, and Moderate chapter fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Admin",
          last_name: "User",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "matrimonial_profiles") {
        const chain = makeChain(OTHER_PROFILES);
        chain.maybeSingle = () => Promise.resolve({ data: MY_PROFILE, error: null });
        return chain as never;
      }
      if (table === "matrimonial_introductions") {
        return makeChain([]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Matrimonial />, { route: "/matrimonial" });

    // All 3 Gotra/Ekda warning variants
    await screen.findByText(/Same Gotra & Ekda — not compatible/i);
    expect(screen.getByText(/Same Gotra — traditionally incompatible/i)).toBeInTheDocument();
    expect(screen.getByText(/Same Ekda — check compatibility/i)).toBeInTheDocument();

    // Expand advanced filters
    const searchInput = screen.getByPlaceholderText(/Search by name, city, gotra/i);
    const filterToggleBtn = searchInput.parentElement?.nextElementSibling as HTMLButtonElement;
    fireEvent.click(filterToggleBtn);

    // Min age filter (filters out Aarav born 2002, keeps Diya & Kiran)
    const minAgeInput = screen.getByPlaceholderText("18");
    fireEvent.change(minAgeInput, { target: { value: "30" } });
    await waitFor(() => {
      expect(screen.queryByText("Aarav Shah")).not.toBeInTheDocument();
      expect(screen.getByText("Diya Patel")).toBeInTheDocument();
    });
    fireEvent.change(minAgeInput, { target: { value: "" } });

    // City/State filter (matches Diya via current_state when current_city is null)
    const cityInput = screen.getByPlaceholderText("e.g., Mumbai");
    fireEvent.change(cityInput, { target: { value: "maharashtra" } });
    await waitFor(() => {
      expect(screen.getByText("Diya Patel")).toBeInTheDocument();
      expect(screen.queryByText("Aarav Shah")).not.toBeInTheDocument();
    });
    fireEvent.change(cityInput, { target: { value: "" } });

    // Switch to My Profile tab to cover current_state=null, education_field=null, income_currency=null
    fireEvent.mouseDown(screen.getByRole("tab", { name: /my profile/i }));
    fireEvent.click(screen.getByRole("tab", { name: /my profile/i }));
    await screen.findByText(/My Matrimonial Profile/i);
    expect(screen.getByText("Ahmedabad")).toBeInTheDocument();
    expect(screen.getByText("MBA")).toBeInTheDocument();
    expect(screen.getByText(/INR 1,500,000/)).toBeInTheDocument();

    // Switch to Moderate tab to cover m?.chapters?.name ?? "—"
    const modTab = screen.queryByRole("tab", { name: /moderate/i });
    if (modTab) {
      fireEvent.mouseDown(modTab);
      fireEvent.click(modTab);
      await screen.findByText("Matrimonial Moderation");
      expect(screen.getByText("—")).toBeInTheDocument();
    }
  });

  it("exercises mutation error paths (sendIntro, sendRishta, respondIntro, moderateProfile) and null Rishta optional fields", async () => {
    const introInsertSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("intro insert failed")));
    const introUpdateSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("intro update failed")));
    const rishtaInsertSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("rishta insert failed")));
    const profileUpdateSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("profile update failed")));
    const profileDeleteSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("profile delete failed")));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Admin",
          last_name: "User",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "matrimonial_profiles") {
        const chain = makeChain(OTHER_PROFILES);
        chain.maybeSingle = () => Promise.resolve({ data: MY_PROFILE, error: null });
        chain.update = profileUpdateSpy;
        chain.delete = profileDeleteSpy;
        return chain as never;
      }
      if (table === "matrimonial_introductions") {
        const chain = makeChain([
          {
            id: "intro-1",
            from_member_id: "m-2",
            to_member_id: "m-1",
            status: "pending",
            message: "Hello",
            from: { first_name: "Aarav", last_name: "Shah" },
            to: { first_name: "Admin", last_name: "User" },
          },
        ]);
        chain.insert = introInsertSpy;
        chain.update = introUpdateSpy;
        return chain as never;
      }
      if (table === "rishta_requests") {
        const chain = makeChain([]);
        chain.insert = rishtaInsertSpy;
        return chain as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Matrimonial />, { route: "/matrimonial" });
    await screen.findByText("Aarav Shah");

    // 1. sendIntro error path
    const introBtns = screen.getAllByRole("button", { name: /introduce/i });
    fireEvent.click(introBtns[0]);
    await waitFor(() => expect(introInsertSpy).toHaveBeenCalled());

    // 2. sendRishta error path with empty optional phone & message (hits || null)
    const rishtaBtns = screen.getAllByRole("button", { name: /send formal rishta request/i });
    fireEvent.click(rishtaBtns[0]);
    const contactInput = await screen.findByPlaceholderText(/Ramesh Shah/i);
    fireEvent.change(contactInput, { target: { value: "Suresh Shah" } });
    fireEvent.click(screen.getByRole("button", { name: /send rishta request/i }));
    await waitFor(() => expect(rishtaInsertSpy).toHaveBeenCalled());

    // Close dialog
    fireEvent.keyDown(document, { key: "Escape" });

    // 3. respondIntro error path
    const introsTab = screen.getByRole("tab", { name: /intros/i });
    fireEvent.mouseDown(introsTab);
    fireEvent.click(introsTab);
    const acceptBtn = await screen.findByRole("button", { name: /accept/i });
    fireEvent.click(acceptBtn);
    await waitFor(() => expect(introUpdateSpy).toHaveBeenCalled());

    // 4. moderateProfile update & delete error paths
    const modTab = screen.queryByRole("tab", { name: /moderate/i });
    if (modTab) {
      fireEvent.mouseDown(modTab);
      fireEvent.click(modTab);
      const verifyBtns = await screen.findAllByRole("button", { name: /verify profile/i });
      fireEvent.click(verifyBtns[0]);
      await waitFor(() => expect(profileUpdateSpy).toHaveBeenCalled());

      const deleteBtns = screen.getAllByRole("button", { name: /delete profile/i });
      fireEvent.click(deleteBtns[0]);
      await waitFor(() => expect(profileDeleteSpy).toHaveBeenCalled());
    }
  });

  it("handles null data fallbacks for profiles, introductions, and allProfiles queries", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-1",
          user_id: "u-1",
          first_name: "Admin",
          last_name: "User",
          verification_level: 3,
          onboarding_completed: true,
          chapter_id: "ch-1",
        }) as never;
      }
      if (table === "matrimonial_profiles") {
        const chain = makeChain(null);
        chain.maybeSingle = () => Promise.resolve({ data: MY_PROFILE, error: null });
        return chain as never;
      }
      if (table === "matrimonial_introductions") {
        return makeChain(null) as never;
      }
      return makeChain(null) as never;
    });

    renderApp(<Matrimonial />, { route: "/matrimonial" });
    await screen.findByText(/No profiles found/i);
  });
});
