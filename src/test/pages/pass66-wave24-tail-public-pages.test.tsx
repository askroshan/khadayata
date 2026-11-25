/**
 * Pass 66 — Wave 24: Final-tail branch coverage sweep for public pages,
 * admin tabs, HeritageTagging, and ProfileDetailDialog.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import PublicEldersCouncil from "@/pages/PublicEldersCouncil";
import PublicOralHistory from "@/pages/PublicOralHistory";
import PublicScholarships from "@/pages/PublicScholarships";
import Archives from "@/pages/Archives";
import EmergencyContacts from "@/pages/EmergencyContacts";
import Obituaries from "@/pages/Obituaries";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import SMSTab from "@/components/admin/SMSTab";
import { HeritageTagging } from "@/components/heritage/HeritageTagging";
import { ProfileDetailDialog } from "@/components/matrimonial/ProfileDetailDialog";
import type { MatrimonialProfile } from "@/components/matrimonial/constants";

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
    ilike: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

describe("Pass 66 — Wave 24 unauthenticated public pages & pure components", () => {
  it("PublicEldersCouncil: handles query error, null data, and unknown category fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "council_threads") {
        return makeChain(null, new Error("council query failed")) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicEldersCouncil />, { route: "/elders-council" });
    await screen.findByRole("heading", { name: "Elders Council" });
    cleanup();
    vi.restoreAllMocks();

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "council_threads") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicEldersCouncil />, { route: "/elders-council" });
    await screen.findByRole("heading", { name: "Elders Council" });
    cleanup();
    vi.restoreAllMocks();

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "council_threads") {
        return makeChain([
          {
            id: "th-unknown",
            title: "Unknown Category Thread",
            body: "Discussion body",
            category: "nonexistent_category",
            pinned: false,
            created_at: new Date().toISOString(),
            author: { first_name: "Elder", last_name: "One", verification_level: 3 },
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicEldersCouncil />, { route: "/elders-council" });
    expect(await screen.findByText("Unknown Category Thread")).toBeInTheDocument();
  });

  it("PublicOralHistory: handles query error, null data, and null tags fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "oral_histories") {
        return makeChain(null, new Error("oral history failed")) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicOralHistory />, { route: "/oral-history" });
    await screen.findByRole("heading", { name: "Oral History Project" });
    cleanup();
    vi.restoreAllMocks();

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "oral_histories") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicOralHistory />, { route: "/oral-history" });
    await screen.findByRole("heading", { name: "Oral History Project" });
    cleanup();
    vi.restoreAllMocks();

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "oral_histories") {
        return makeChain([
          {
            id: "oh-null-tags",
            title: "Story Without Tags",
            description: "Oral history description",
            narrator_name: "Dada Ji",
            media_type: "audio",
            duration_seconds: 95,
            tags: null,
            elder_priority: false,
            created_at: new Date().toISOString(),
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicOralHistory />, { route: "/oral-history" });
    expect(await screen.findByText("Story Without Tags")).toBeInTheDocument();
  });

  it("PublicScholarships: handles query error, null data, and chapter name fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "scholarships") {
        return makeChain(null, new Error("scholarships failed")) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicScholarships />, { route: "/scholarships" });
    await screen.findByRole("heading", { name: "Scholarships" });
    cleanup();
    vi.restoreAllMocks();

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "scholarships") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicScholarships />, { route: "/scholarships" });
    await screen.findByText("No active scholarships found.");
    cleanup();
    vi.restoreAllMocks();

    let nameReads = 0;
    const dynamicChapter = {
      get name() {
        nameReads += 1;
        return nameReads === 1 ? "Ahmedabad" : null;
      },
    };
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "scholarships") {
        return makeChain([
          {
            id: "sch-1",
            name: "Merit Scholarship",
            description: "For students",
            amount: 50000,
            currency: "INR",
            deadline: null,
            eligibility: "Undergraduate",
            chapters: dynamicChapter,
          },
        ]) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<PublicScholarships />, { route: "/scholarships" });
    expect(await screen.findByText("Merit Scholarship")).toBeInTheDocument();
  });

  it("Obituaries: handles query error and null data fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "obituaries") {
        return makeChain(null, new Error("obituaries failed")) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<Obituaries />, { route: "/obituaries" });
    await screen.findByText("In Memoriam");
    cleanup();
    vi.restoreAllMocks();

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "obituaries") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<Obituaries />, { route: "/obituaries" });
    await screen.findByText("In Memoriam");
  });

  it("ProfileDetailDialog: renders education without field and income with default INR currency", async () => {
    const profile = {
      id: "mp-1",
      member_id: "m-1",
      verified: false,
      about: null,
      height_cm: null,
      weight_kg: null,
      complexion: null,
      diet: null,
      marital_status: null,
      blood_group: null,
      glasses: null,
      driving: null,
      contact_number: null,
      current_city: null,
      current_state: null,
      country: null,
      citizenship: null,
      visa_type: null,
      education_level: "MBA",
      education_field: null,
      position_title: null,
      business_name: null,
      income: 1200000,
      income_currency: null,
      linkedin_url: null,
      manglik: null,
      gotra: null,
      rashi: null,
      nakshatra: null,
      native_place: null,
      ekda: null,
      kuldevi: null,
      preferences: {},
      member: {
        first_name: "Kiran",
        last_name: "Shah",
        dob: null,
        chapters: { name: "Ahmedabad" },
      },
    } as unknown as MatrimonialProfile;

    renderApp(
      <ProfileDetailDialog profile={profile}>
        <button type="button">Open Profile</button>
      </ProfileDetailDialog>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Profile" }));
    expect(await screen.findByText("MBA")).toBeInTheDocument();
    expect(screen.getByText(/INR 1,200,000 \/ year/)).toBeInTheDocument();
  });
});

describe("Pass 66 — Wave 24 authenticated pages & admin/heritage components", () => {
  beforeAll(async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("Archives: handles null data fallback for magazine_issues and book_pages", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "magazine_issues" || table === "book_pages") {
        return makeChain(null, null) as never;
      }
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
      return makeChain([]) as never;
    });

    renderApp(<Archives />, { route: "/archives" });
    await waitFor(() => {
      expect(screen.getAllByText(/Heritage Archives/i).length).toBeGreaterThan(0);
    });
  });

  it("EmergencyContacts: handles null data fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "emergency_contacts") {
        return makeChain(null, null) as never;
      }
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
      return makeChain([]) as never;
    });

    renderApp(<EmergencyContacts />, { route: "/emergency" });
    expect(await screen.findByText("No emergency contacts found")).toBeInTheDocument();
  });

  it("ChapterTransfersTab: handles query error and member chapter update error on approve", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapter_transfers") {
        return makeChain(null, new Error("transfers fetch failed")) as never;
      }
      return makeChain([]) as never;
    });
    renderApp(<ChapterTransfersTab />);
    await screen.findByText(/Pending Transfers \(0\)/);
    cleanup();
    vi.restoreAllMocks();

    const memberUpdateSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("member update failed")));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "chapter_transfers") {
        const c = makeChain([
          {
            id: "tr-1",
            status: "pending",
            member_id: "m-1",
            from_chapter_id: "ch-1",
            to_chapter_id: "ch-2",
            reason: "Relocated",
            created_at: new Date().toISOString(),
            members: { first_name: "Aarav", last_name: "Shah" },
            from_ch: { name: "Ahmedabad" },
            to_ch: { name: "Mumbai" },
          },
        ]);
        c.update = () => makeChain(null, null);
        return c as never;
      }
      if (table === "members") {
        const c = makeChain([]);
        c.update = memberUpdateSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<ChapterTransfersTab />);
    await screen.findByText(/Aarav Shah/);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    await waitFor(() => {
      expect(memberUpdateSpy).toHaveBeenCalled();
    });
  });

  it("SMSTab: handles null sms_messages data fallback", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "sms_messages") {
        return makeChain(null, null) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<SMSTab />);
    await waitFor(() => {
      expect(screen.getAllByText(/SMS/i).length).toBeGreaterThan(0);
    });
  });

  it("HeritageTagging: handles null tags data fallback and insert error", async () => {
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("tag insert failed")));
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
      if (table === "heritage_tags") {
        const c = makeChain(null, null);
        c.insert = insertSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<HeritageTagging entityType="magazine" entityId="mag-1" />);
    const addBtn = await screen.findByRole("button", { name: /^Add$/i });
    fireEvent.click(addBtn);

    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "festival" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });
  });
});
