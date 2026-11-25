/**
 * Pass 47 — Wave 17: Branch coverage burn-down for PublicMatrimonial and Dashboard.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import PublicMatrimonial from "@/pages/PublicMatrimonial";
import Dashboard from "@/pages/Dashboard";

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
  const singleResult = { data: Array.isArray(data) ? (data[0] ?? null) : data, error };
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

describe("Pass 47 — Wave 17: PublicMatrimonial branch coverage", () => {
  it("renders female, male, and null-member/null-dob/partial-field profiles and exercises filters", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "matrimonial_profiles") {
        return makeChain([
          {
            id: "mp-female",
            about: "Loves classical music",
            diet: "jain",
            marital_status: "never_married",
            gotra: "Kashyap",
            education_level: null,
            education_field: "Computer Science",
            position_title: "Software Engineer",
            current_city: null,
            current_state: "Gujarat",
            country: "India",
            citizenship: "Indian",
            hobbies: ["Music"],
            verified: true,
            manglik: true,
            ekda: "52",
            member: {
              id: "mem-f",
              first_name: "Diya",
              last_name: "Shah",
              gender: "female",
              dob: "1996-04-15",
              photo_url: "https://example.com/diya.jpg",
              chapters: { name: "Ahmedabad" },
            },
          },
          {
            id: "mp-male",
            about: null,
            diet: "custom_diet",
            marital_status: "custom_status",
            gotra: null,
            education_level: "MBA",
            education_field: null,
            position_title: null,
            current_city: "Surat",
            current_state: null,
            country: null,
            citizenship: null,
            hobbies: null,
            verified: false,
            manglik: false,
            ekda: null,
            member: {
              id: "mem-m",
              first_name: "Aarav",
              last_name: "Patel",
              gender: "male",
              dob: "1994-08-20",
              photo_url: null,
              chapters: null,
            },
          },
          {
            id: "mp-minimal",
            about: null,
            diet: null,
            marital_status: null,
            gotra: null,
            education_level: null,
            education_field: null,
            position_title: null,
            current_city: null,
            current_state: null,
            country: null,
            citizenship: null,
            hobbies: null,
            verified: false,
            manglik: false,
            ekda: null,
            member: {
              id: "mem-x",
              first_name: null,
              last_name: null,
              gender: null,
              dob: null,
              photo_url: null,
              chapters: null,
            },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicMatrimonial />, { route: "/matrimonial" });

    await screen.findByText(/Diya S\./);
    expect(screen.getByText(/Bride/)).toBeInTheDocument();
    expect(screen.getByText(/Groom/)).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("Surat")).toBeInTheDocument();
    expect(screen.getByText("custom_diet")).toBeInTheDocument();
    expect(screen.getByText("custom_status")).toBeInTheDocument();
    expect(screen.getByText("Manglik")).toBeInTheDocument();
    expect(screen.getByText("Ekda: 52")).toBeInTheDocument();

    // Exercise search matching education_field, gotra, city, position_title
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: "Kashyap" } });
    expect(screen.getByText(/Diya S\./)).toBeInTheDocument();
    expect(screen.queryByText(/Aarav P\./)).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz" } });
    expect(screen.getByText(/No profiles match your search/i)).toBeInTheDocument();
  });

  it("handles null data response (data ?? [])", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "matrimonial_profiles") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicMatrimonial />, { route: "/matrimonial" });
    await screen.findByText(/No profiles match your search/i);
  });

  it("handles query error branch (if (error) throw error)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "matrimonial_profiles") {
        return makeChain(null, { message: "DB failure" }) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<PublicMatrimonial />, { route: "/matrimonial" });
    await waitFor(() => {
      expect(screen.getByText(/No profiles match your search/i)).toBeInTheDocument();
    });
  });
});

describe("Pass 47 — Wave 17: Dashboard branch coverage", () => {
  it("handles null announcements/events/news data, null first_name, null verification_level, and null chapter_id", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-null",
          user_id: "u-null",
          first_name: null,
          last_name: null,
          verification_level: null,
          onboarding_completed: true,
          chapter_id: null,
          chapters: null,
          global_id: null,
        }) as never;
      }
      if (table === "announcements" || table === "events" || table === "content_news") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Dashboard />, { route: "/dashboard" });

    await screen.findByText(/Namaste, Member/);
    expect(screen.getAllByText(/Find your chapter/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/No announcements right now/i)).toBeInTheDocument();
    expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
    expect(screen.getByText(/No news yet/i)).toBeInTheDocument();
  });

  it("handles chapterPath with null member.chapters, chapter-scoped upcoming events badge, and unknown verification_level", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-ch",
          user_id: "u-ch",
          first_name: "Kiran",
          last_name: "Shah",
          verification_level: 99,
          onboarding_completed: true,
          chapter_id: "ch-1",
          chapters: null,
          global_id: "KH-999",
        }) as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-1", slug: "ahmedabad" }]) as never;
      }
      if (table === "events") {
        return makeChain([
          {
            id: "ev-ch-1",
            name: "Chapter Diwali Gala",
            starts_at: new Date(Date.now() + 86400000).toISOString(),
            venue: "Community Hall",
            chapter_id: "ch-1",
          },
          {
            id: "ev-global-1",
            name: "Global Summit",
            starts_at: new Date(Date.now() + 172800000).toISOString(),
            venue: null,
            chapter_id: "ch-other",
          },
        ]) as never;
      }
      if (table === "content_news") {
        return makeChain([
          {
            id: "n-1",
            title: "Chapter Update",
            published_at: new Date().toISOString(),
            summary: "Summary",
            chapter_id: "ch-1",
          },
          {
            id: "n-2",
            title: "Global Update",
            published_at: new Date().toISOString(),
            summary: null,
            chapter_id: "ch-other",
          },
        ]) as never;
      }
      if (table === "announcements") {
        return makeChain([
          {
            id: "a-1",
            title: "Important Notice",
            body: "Details here",
            created_at: new Date().toISOString(),
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Dashboard />, { route: "/dashboard" });

    await screen.findByText(/Namaste, Kiran/);
    await screen.findByText(/1 upcoming/);
    expect(screen.getAllByText("View chapter").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("ID: KH-999")).toBeInTheDocument();
    expect(screen.getByText("Chapter Diwali Gala")).toBeInTheDocument();
    expect(screen.getByText("Important Notice")).toBeInTheDocument();
  });

  it("handles chapters query returning null slug (data?.slug ?? null)", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        return makeChain({
          id: "m-noslug",
          user_id: "u-noslug",
          first_name: "Meera",
          last_name: "Desai",
          verification_level: 0,
          onboarding_completed: true,
          chapter_id: "ch-noslug",
          chapters: { name: "Vadodara" },
        }) as never;
      }
      if (table === "chapters") {
        return makeChain([{ id: "ch-noslug", slug: null }]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<Dashboard />, { route: "/dashboard" });

    await screen.findByText(/Namaste, Meera/);
    expect(screen.getByText("Vadodara")).toBeInTheDocument();
    expect(screen.getByText(/Get Verified — Unlock Full Access/i)).toBeInTheDocument();
  });
});
