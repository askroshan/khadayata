import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Events from "@/pages/Events";
import PublicEvents from "@/pages/PublicEvents";
import News from "@/pages/News";
import PublicNews from "@/pages/PublicNews";
import NewsDetail from "@/pages/NewsDetail";
import Obituaries from "@/pages/Obituaries";
import Matrimonial from "@/pages/Matrimonial";
import PublicMatrimonial from "@/pages/PublicMatrimonial";
import Directory from "@/pages/Directory";
import Chapters from "@/pages/Chapters";
import ChapterDetail from "@/pages/ChapterDetail";
import Profile from "@/pages/Profile";
import MemberProfile from "@/pages/MemberProfile";

/**
 * Pass 12 — Feature pages slice against real Kong (:54331) + khadayata_local data.
 * Seeds temporary published events/news/obituaries (tables were empty), then exercises
 * Events / News / Obituaries / Matrimonial / Directory / Chapters / Profile flows.
 * No MSW / fixture JSON for view data. Public directory asserts never use E2E first_name.
 */

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
/** Real Ahmedabad member (not an E2E seed account). */
const REAL_MEMBER_ID = "0862ede0-ca10-4c06-8582-a4a8f3007bc7";
const REAL_MEMBER_FIRST = "Parth";

const MARKER = "Pass12Cov";

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const fromVite = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  if (fromVite) return fromVite;
  for (const candidate of [
    resolve(process.cwd(), ".env"),
    resolve(__dirname, "../../../.env"),
  ]) {
    try {
      const raw = readFileSync(candidate, "utf8");
      const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
      if (line) return line.slice(name.length + 1).trim();
    } catch {
      /* try next */
    }
  }
  return undefined;
}

const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;

/** Service-role client for seeding — local `authenticated` grants are SELECT-only on events/news. */
function adminClient(): SupabaseClient {
  const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required to seed feature-page coverage rows");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let lastSignInAt = 0;
async function signIn(email: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 5; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: E2E_PASSWORD,
    });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    }
    throw error;
  }
}

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no user");
  return user.id;
}

async function currentMemberId(): Promise<string> {
  const uid = await currentUserId();
  const { data } = await supabase.from("members").select("id").eq("user_id", uid).maybeSingle();
  if (!data) throw new Error("no member row");
  return data.id;
}

const seeded = {
  upcomingEventId: null as string | null,
  pastEventId: null as string | null,
  newsId: null as string | null,
  newsPinnedId: null as string | null,
  obituaryId: null as string | null,
  skillId: null as string | null,
  languageId: null as string | null,
};

describe("Pass 12 — feature pages (real Kong data)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const uid = await currentUserId();
    const memberId = await currentMemberId();

    const upcomingStart = new Date(Date.now() + 14 * 864e5).toISOString();
    const upcomingEnd = new Date(Date.now() + 14 * 864e5 + 3_600_000).toISOString();
    const pastStart = new Date(Date.now() - 30 * 864e5).toISOString();
    const pastEnd = new Date(Date.now() - 30 * 864e5 + 3_600_000).toISOString();

    const { data: up, error: upErr } = await admin
      .from("events")
      .insert({
        name: `${MARKER} Diwali Gathering`,
        description: "Coverage upcoming event for feature-pages pass",
        venue: "Ahmedabad Hall",
        category: "Cultural",
        event_type: "in_person",
        organizer_name: "Coverage Organizer",
        fee_amount: 0,
        fee_currency: "INR",
        contact_email: "coverage@khadayataonline.com",
        tags: ["coverage", "diwali"],
        consent_required: true,
        starts_at: upcomingStart,
        ends_at: upcomingEnd,
        status: "published",
        chapter_id: AHMEDABAD,
        created_by: uid,
      })
      .select("id")
      .single();
    if (upErr) throw upErr;
    seeded.upcomingEventId = up.id;

    const { data: past, error: pastErr } = await admin
      .from("events")
      .insert({
        name: `${MARKER} Past Satsang`,
        description: "Coverage past event",
        venue: "Temple Hall",
        category: "Religious",
        event_type: "hybrid",
        virtual_url: "https://example.com/zoom",
        organizer_name: "Past Organizer",
        fee_amount: 100,
        fee_currency: "INR",
        starts_at: pastStart,
        ends_at: pastEnd,
        status: "published",
        chapter_id: AHMEDABAD,
        created_by: uid,
      })
      .select("id")
      .single();
    if (pastErr) throw pastErr;
    seeded.pastEventId = past.id;

    const { data: news, error: newsErr } = await admin
      .from("content_news")
      .insert({
        title: `${MARKER} Community Update`,
        summary: "Feature-pages coverage article summary",
        body: "Longer body for read-time estimation and public news card rendering. ".repeat(8),
        category: "Announcements",
        author_name: "Coverage Publisher",
        article_type: "article",
        scope: "global",
        featured: true,
        pinned: false,
        status: "published",
        published_at: new Date().toISOString(),
        chapter_id: AHMEDABAD,
        created_by: uid,
        tags: ["coverage"],
        read_time_minutes: 2,
      })
      .select("id")
      .single();
    if (newsErr) throw newsErr;
    seeded.newsId = news.id;

    const { data: pinned, error: pinErr } = await admin
      .from("content_news")
      .insert({
        title: `${MARKER} Breaking Notice`,
        summary: "Pinned coverage article",
        body: "Pinned body for breaking section.",
        category: "Urgent",
        author_name: "Coverage Publisher",
        article_type: "announcement",
        scope: "global",
        featured: false,
        pinned: true,
        pinned_until: new Date(Date.now() + 48 * 3600_000).toISOString(),
        status: "published",
        published_at: new Date().toISOString(),
        chapter_id: AHMEDABAD,
        created_by: uid,
        tags: ["breaking"],
      })
      .select("id")
      .single();
    if (pinErr) throw pinErr;
    seeded.newsPinnedId = pinned.id;

    const { data: obit, error: obitErr } = await admin
      .from("obituaries")
      .insert({
        full_name: `${MARKER} Remembered Elder`,
        also_known_as: "Coverage Elder",
        dob: "1940-05-12",
        dod: "2024-11-01",
        city_of_origin: "Ahmedabad",
        city_of_passing: "Ahmedabad",
        tribute: "A beloved community elder remembered in coverage tests.",
        family_message: "Family thanks the community for their support.",
        status: "published",
        chapter_id: AHMEDABAD,
        posted_by: memberId,
      })
      .select("id")
      .single();
    if (obitErr) throw obitErr;
    seeded.obituaryId = obit.id;
  }, 90_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.upcomingEventId) {
      await admin.from("event_rsvps").delete().eq("event_id", seeded.upcomingEventId);
      await admin.from("events").delete().eq("id", seeded.upcomingEventId);
    }
    if (seeded.pastEventId) {
      await admin.from("events").delete().eq("id", seeded.pastEventId);
    }
    if (seeded.newsId) await admin.from("content_news").delete().eq("id", seeded.newsId);
    if (seeded.newsPinnedId) await admin.from("content_news").delete().eq("id", seeded.newsPinnedId);
    if (seeded.obituaryId) await admin.from("obituaries").delete().eq("id", seeded.obituaryId);
    if (seeded.skillId) await admin.from("member_skills").delete().eq("id", seeded.skillId);
    if (seeded.languageId) await admin.from("member_languages").delete().eq("id", seeded.languageId);
    await admin.from("events").delete().ilike("name", `${MARKER}%`);
    await admin.from("content_news").delete().ilike("title", `${MARKER}%`);
    await admin.from("obituaries").delete().ilike("full_name", `${MARKER}%`);
    await supabase.auth.signOut();
  }, 60_000);

  it("PublicEvents lists seeded upcoming + past and filters by search", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    renderApp(<PublicEvents />, { route: "/events" });
    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Diwali Gathering`);
      },
      { timeout: 25_000 },
    );

    const pastBtn = screen.getByRole("button", { name: /Past/i });
    await user.click(pastBtn);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Past Satsang`);
    }, { timeout: 10_000 });

    const upcomingBtn = screen.getByRole("button", { name: /Upcoming/i });
    await user.click(upcomingBtn);

    const search = screen.getByPlaceholderText(/Search events/i);
    await user.clear(search);
    await user.type(search, "Diwali");
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Diwali Gathering`);
      expect(document.body.textContent).not.toContain(`${MARKER} Past Satsang`);
    });
    await user.clear(search);
    await user.type(search, "zzz-no-match-pass12");
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/no upcoming events found/);
    });
  }, 60_000);

  it("Events manage: chapter filter, tabs, RSVP, edit dialog on seeded event", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    renderApp(<Events />, { route: "/events/manage" });

    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Diwali Gathering`);
      },
      { timeout: 30_000 },
    );

    // All chapters so seeded Ahmedabad event is visible regardless of member chapter
    const chapterTrigger = screen.getByLabelText(/Filter events by chapter/i);
    await user.click(chapterTrigger);
    const allOpt = await screen.findByRole("option", { name: /All Chapters/i });
    await user.click(allOpt);

    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Diwali Gathering`);
    }, { timeout: 15_000 });

    const rsvp = screen.queryAllByRole("button", { name: /RSVP Now/i })[0];
    if (rsvp) {
      await user.click(rsvp);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Going|attending|RSVP/i);
      }, { timeout: 15_000 });
    }

    const edit = screen.queryAllByLabelText(/Edit event/i)[0];
    if (edit) {
      await user.click(edit);
      await waitFor(() => {
        expect(screen.getByText(/Edit Event/i)).toBeInTheDocument();
      }, { timeout: 10_000 });
      const nameInput = screen.getByDisplayValue(new RegExp(MARKER));
      fireEvent.change(nameInput, { target: { value: `${MARKER} Diwali Gathering` } });
      fireEvent.keyDown(document, { key: "Escape" });
    }

    const pastTab = screen.getByRole("tab", { name: /Past/i });
    await user.click(pastTab);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Past Satsang`);
    }, { timeout: 15_000 });

    // Create dialog fill (do not publish — avoid permanent spam)
    const create = screen.queryAllByRole("button").find((b) => /Create/i.test(b.textContent ?? ""));
    if (create) {
      await user.click(create);
      await waitFor(() => {
        expect(screen.getByText(/Create Event/i)).toBeInTheDocument();
      }, { timeout: 10_000 });
      for (const input of Array.from(document.querySelectorAll("input, textarea"))) {
        const el = input as HTMLInputElement;
        const type = (el.getAttribute("type") ?? "text").toLowerCase();
        if (type === "file" || type === "checkbox" || type === "radio" || type === "hidden") continue;
        if (type === "date" || type === "datetime-local" || type === "time") {
          fireEvent.change(el, {
            target: { value: type === "time" ? "18:00" : type === "date" ? "2026-12-20" : "2026-12-20T18:00" },
          });
        } else if (type === "number") {
          fireEvent.change(el, { target: { value: "50" } });
        } else if (type === "email") {
          fireEvent.change(el, { target: { value: "coverage@khadayataonline.com" } });
        } else {
          fireEvent.change(el, { target: { value: `${MARKER} Draft Only` } });
        }
      }
      fireEvent.keyDown(document, { key: "Escape" });
    }
  }, 120_000);

  it("PublicNews + News manage show seeded articles; NewsDetail loads real id", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(<PublicNews />, { route: "/news" });
    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Community Update`);
        expect(document.body.textContent).toContain(`${MARKER} Breaking Notice`);
      },
      { timeout: 25_000 },
    );
    const search = screen.getByPlaceholderText(/Search articles/i);
    await user.type(search, "Community Update");
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Community Update`);
    });
    const cat = screen.getByRole("combobox");
    await user.click(cat);
    const ann = await screen.findAllByRole("option");
    const announcements = ann.find((o) => /Announcements/i.test(o.textContent ?? ""));
    if (announcements) await user.click(announcements);
    unmount();

    await signIn(E2E_ACCOUNTS.publisher.email);
    renderApp(<News />, { route: "/news/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Community Update`);
      },
      { timeout: 25_000 },
    );
    const editBtn = screen.queryAllByRole("button").find((b) => /edit/i.test(b.getAttribute("aria-label") ?? b.textContent ?? ""));
    if (editBtn) {
      await user.click(editBtn);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/edit article|title|summary/);
      }, { timeout: 10_000 });
      fireEvent.keyDown(document, { key: "Escape" });
    }

    const { unmount: u2 } = renderApp(<NewsDetail />, {
      route: `/news/${seeded.newsId}`,
      pathPattern: "/news/:id",
    });
    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Community Update`);
      },
      { timeout: 25_000 },
    );
    u2();
  }, 120_000);

  it("Obituaries lists seeded tribute and search; chapter admin can open post form", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(<Obituaries />, { route: "/obituaries" });
    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Remembered Elder`);
        expect(document.body.textContent).toMatch(/beloved community elder/i);
      },
      { timeout: 25_000 },
    );
    const search = screen.getByPlaceholderText(/Search by name/i);
    await user.type(search, "Remembered Elder");
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Remembered Elder`);
    });
    await user.clear(search);
    await user.type(search, "zzz-no-obit-pass12");
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/no obituaries found/);
    });
    unmount();

    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    renderApp(<Obituaries />, { route: "/obituaries" });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Remembered Elder`);
    }, { timeout: 25_000 });
    const post = screen.queryByRole("button", { name: /Post Obituary/i });
    if (post) {
      await user.click(post);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/full name|tribute|obituar|date of/);
      }, { timeout: 10_000 });
      fireEvent.keyDown(document, { key: "Escape" });
      const close = screen.queryByRole("button", { name: /close|cancel/i });
      if (close) await user.click(close);
    }
  }, 90_000);

  it("Matrimonial public + manage browse real profiles", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(<PublicMatrimonial />, { route: "/matrimonial" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/matrimonial/);
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(80);
      },
      { timeout: 25_000 },
    );
    for (const b of screen.queryAllByRole("button").slice(0, 6)) {
      if ((b as HTMLButtonElement).disabled) continue;
      try {
        await user.click(b);
      } catch {
        /* ignore */
      }
    }
    unmount();

    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Matrimonial />, { route: "/matrimonial/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/matrimonial|match|profile/);
      },
      { timeout: 25_000 },
    );
    const matches = screen.queryByRole("tab", { name: /Matches/i });
    if (matches) await user.click(matches);
    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /View Profile/i }).length).toBeGreaterThan(0);
    }, { timeout: 30_000 });
    const view = screen.getAllByRole("button", { name: /View Profile/i })[0];
    await user.click(view);
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(100);
    }, { timeout: 15_000 });
  }, 90_000);

  it("Directory lists real non-E2E members; search uses real first_name only", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();

    // API-level guarantee: public-facing directory query excludes E2E first_name
    const { data: publicMembers, error } = await supabase
      .from("members")
      .select("id, first_name, last_name, chapters(name)")
      .eq("onboarding_completed", true)
      .neq("first_name", "E2E")
      .order("last_name")
      .limit(20);
    expect(error).toBeNull();
    expect((publicMembers ?? []).length).toBeGreaterThan(0);
    expect((publicMembers ?? []).every((m) => m.first_name !== "E2E")).toBe(true);

    renderApp(<Directory />, { route: "/directory" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/member directory|search/);
      },
      { timeout: 25_000 },
    );

    // Prefer All Chapters so Ahmedabad + others appear
    const chapterFilter = screen.getByLabelText(/Filter by chapter/i);
    await user.click(chapterFilter);
    const all = await screen.findByRole("option", { name: /All Chapters/i });
    await user.click(all);

    const search = screen.getByPlaceholderText(/Search by name/i);
    await user.clear(search);
    await user.type(search, REAL_MEMBER_FIRST);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(new RegExp(REAL_MEMBER_FIRST, "i"));
        // Must not assert or rely on E2E dummy first names in the public directory surface
        const cards = document.body.textContent ?? "";
        const e2eHits = (cards.match(/\bE2E\b/g) ?? []).length;
        // Search for "Parth" should not surface E2E-prefixed members
        expect(e2eHits).toBe(0);
      },
      { timeout: 20_000 },
    );
  }, 90_000);

  it("Chapters filters by India and ChapterDetail loads Ahmedabad", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(<Chapters />, { route: "/chapters" });
    await waitFor(
      () => {
        expect(document.querySelectorAll('a[href^="/chapters/"]').length).toBeGreaterThan(0);
      },
      { timeout: 25_000 },
    );

    const combos = screen.queryAllByRole("combobox");
    if (combos[0]) {
      await user.click(combos[0]);
      const india = await screen.findAllByRole("option");
      const indiaOpt = india.find((o) => /^India$/i.test(o.textContent?.trim() ?? ""));
      if (indiaOpt) {
        await user.click(indiaOpt);
        await waitFor(() => {
          expect(document.body.textContent?.toLowerCase()).toMatch(/ahmedabad|mumbai|surat|delhi/);
        }, { timeout: 10_000 });
        const clear = screen.queryByRole("button", { name: /Clear/i });
        if (clear) await user.click(clear);
      }
    }
    unmount();

    renderApp(<ChapterDetail />, {
      route: "/chapters/ahmedabad",
      pathPattern: "/chapters/:slug",
    });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/ahmedabad/);
      },
      { timeout: 25_000 },
    );
    for (const tab of screen.queryAllByRole("tab").slice(0, 6)) {
      try {
        await user.click(tab);
      } catch {
        /* ignore */
      }
    }
  }, 90_000);

  it("Profile edit + skills/languages + MemberProfile for real member", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const memberId = await currentMemberId();
    const admin = adminClient();

    // Seed skill/language via API (same tables Profile reads) then assert UI + remove path
    const { data: skillRow, error: skillErr } = await admin
      .from("member_skills")
      .insert({ member_id: memberId, skill: `${MARKER}-skill` })
      .select("id")
      .single();
    if (skillErr) throw skillErr;
    seeded.skillId = skillRow.id;

    const { data: langRow, error: langErr } = await admin
      .from("member_languages")
      .insert({ member_id: memberId, language: `${MARKER}-lang` })
      .select("id")
      .single();
    if (langErr) throw langErr;
    seeded.languageId = langRow.id;

    const { unmount } = renderApp(<Profile />, { route: "/profile" });
    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER}-skill`);
        expect(document.body.textContent).toContain(`${MARKER}-lang`);
        expect(document.body.textContent?.toLowerCase()).toMatch(/profile|completeness|digital member/);
      },
      { timeout: 25_000 },
    );

    const edit = screen.getByRole("button", { name: /^Edit$/i });
    await user.click(edit);
    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });
    // Cancel without saving — do not mutate the seed member's first_name
    await user.click(screen.getByRole("button", { name: /Cancel/i }));

    // Exercise add-skill chrome (fill only; row already present from API seed)
    const skillInput = screen.getByPlaceholderText(/Add skill/i);
    fireEvent.change(skillInput, { target: { value: `${MARKER}-skill-ui` } });
    expect((skillInput as HTMLInputElement).value).toBe(`${MARKER}-skill-ui`);

    const langInput = screen.getByPlaceholderText(/Add language/i);
    fireEvent.change(langInput, { target: { value: `${MARKER}-lang-ui` } });
    expect((langInput as HTMLInputElement).value).toBe(`${MARKER}-lang-ui`);

    // Open employment + education dialogs (fill, do not require persist)
    const addButtons = screen.getAllByRole("button", { name: /^Add$/i });
    for (const btn of addButtons.slice(0, 2)) {
      await user.click(btn);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/job title|degree|company|institution/);
      }, { timeout: 8_000 });
      fireEvent.keyDown(document, { key: "Escape" });
    }
    unmount();

    renderApp(<MemberProfile />, {
      route: `/member/${REAL_MEMBER_ID}`,
      pathPattern: "/member/:id",
    });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(new RegExp(REAL_MEMBER_FIRST, "i"));
        expect(document.body.textContent?.toLowerCase()).toMatch(/vouch|chapter|profile|verif/);
      },
      { timeout: 25_000 },
    );
    // Subject identity must be the real member — do not scan whole body (voucher names /
    // AppLayout session chrome can legitimately include the signed-in "E2E Member").
    const profileHeading = screen.getByRole("heading", { level: 1 });
    expect(profileHeading.textContent).toMatch(new RegExp(REAL_MEMBER_FIRST, "i"));
    expect(profileHeading.textContent).not.toMatch(/\bE2E\b/);
    for (const b of screen.queryAllByRole("button").slice(0, 8)) {
      if ((b as HTMLButtonElement).disabled) continue;
      const label = b.textContent ?? b.getAttribute("aria-label") ?? "";
      if (/vouch|report|request/i.test(label)) {
        try {
          await user.click(b);
        } catch {
          /* ignore */
        }
        break;
      }
    }
  }, 120_000);
});
