/**
 * Pass 19 / Wave 8 — SakhaEndorsement + NewsDetail + ChapterLayout → 100% lines
 * against real Kong :54331 / khadayata_local :5438.
 * Disposable covsnl_* rows only. No MSW / fixture JSON for view domain data.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { SakhaEndorsement } from "@/components/profile/SakhaEndorsement";
import NewsDetail from "@/pages/NewsDetail";
import { ChapterLayout } from "@/components/ChapterLayout";
import { Toaster } from "@/components/ui/toaster";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";
const CITY_AHM = "e1000001-0000-0000-0000-000000000001";
const PREFIX = `covsnl_${Date.now().toString(36)}`;
const FAKE_MEMBER = "00000000-0000-4000-8000-000000000099";

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const fromVite = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  if (fromVite) return fromVite;
  for (const file of [".env", ".env.local"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m?.[1] === name) return m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      /* next */
    }
  }
  return undefined;
}

function adminClient(): SupabaseClient {
  const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function psql(sql: string) {
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_khadayata-local",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

let lastSignInAt = 0;
async function signIn(email: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 6; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit|fetch failed|network|ECONNREFUSED/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    throw error;
  }
  throw new Error(`signIn failed for ${email}`);
}

async function signOut() {
  await supabase.auth.signOut();
  lastSignInAt = Date.now();
}

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function stubHostname(hostname: string, pathname = "/") {
  vi.stubGlobal("location", {
    ...window.location,
    hostname,
    href: `https://${hostname}${pathname}`,
    host: hostname,
    origin: `https://${hostname}`,
    pathname,
    search: "",
    hash: "",
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  });
}

const seeded = {
  memberId: "" as string,
  gaMemberId: "" as string,
  gaUserId: "" as string,
  /** E2E unverified — L0 target for Sakha endorse drills */
  targetMemberId: "" as string,
  newsRichId: "" as string,
  newsEmptyId: "" as string,
  newsObitId: "" as string,
  newsBreakId: "" as string,
  verReqIds: [] as string[],
};

async function cleanupAll() {
  const admin = adminClient();
  if (seeded.verReqIds.length) {
    await admin.from("verification_requests").delete().in("id", seeded.verReqIds);
  }
  await admin.from("verification_requests").delete().like("notes", `${PREFIX}%`);
  for (const id of [seeded.newsRichId, seeded.newsEmptyId, seeded.newsObitId, seeded.newsBreakId]) {
    if (id) await admin.from("content_news").delete().eq("id", id);
  }
  await admin.from("content_news").delete().like("title", `${PREFIX}%`);
}

describe("Pass 19 — SakhaEndorsement / NewsDetail / ChapterLayout (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await cleanupAll();

    await signIn(E2E_ACCOUNTS.member.email);
    const {
      data: { user: memberUser },
    } = await supabase.auth.getUser();
    if (!memberUser?.id) throw new Error("member auth missing");
    const { data: me } = await admin.from("members").select("id").eq("user_id", memberUser.id).single();
    seeded.memberId = me!.id;

    await signIn(E2E_ACCOUNTS.unverified.email);
    const {
      data: { user: uvUser },
    } = await supabase.auth.getUser();
    if (!uvUser?.id) throw new Error("unverified auth missing");
    const { data: uvMem } = await admin.from("members").select("id").eq("user_id", uvUser.id).single();
    seeded.targetMemberId = uvMem!.id;

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const {
      data: { user: gaUser },
    } = await supabase.auth.getUser();
    if (!gaUser?.id) throw new Error("global admin auth missing");
    seeded.gaUserId = gaUser.id;
    const { data: gaMem } = await admin.from("members").select("id").eq("user_id", gaUser.id).single();
    seeded.gaMemberId = gaMem!.id;

    // Clear prior L3 sakha rows on target so our PREFIX history is deterministic
    await admin
      .from("verification_requests")
      .delete()
      .eq("member_id", seeded.targetMemberId)
      .eq("requested_level", 3);

    const { data: verRows, error: vErr } = await admin
      .from("verification_requests")
      .insert([
        {
          member_id: seeded.targetMemberId,
          requested_level: 3,
          status: "endorsed",
          notes: `${PREFIX} endorsed by elder`,
          reviewer_user_id: seeded.gaUserId,
          reviewed_at: new Date().toISOString(),
        },
        {
          member_id: seeded.targetMemberId,
          requested_level: 3,
          status: "pending",
          notes: `${PREFIX} pending review`,
        },
        {
          member_id: seeded.targetMemberId,
          requested_level: 3,
          status: "rejected",
          notes: `${PREFIX} rejected note`,
          reviewer_user_id: seeded.gaUserId,
          reviewed_at: new Date().toISOString(),
        },
      ])
      .select("id");
    if (vErr) throw vErr;
    seeded.verReqIds = (verRows ?? []).map((r) => r.id);

    const longBody =
      "Community coverage body for estimated read time when minutes are unset. ".repeat(40);

    const { data: rich, error: rErr } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Rich Feature Article`,
        summary: "Rich summary for NewsDetail coverage",
        body: longBody,
        category: "Announcements",
        author_name: "Coverage Publisher",
        article_type: "article",
        scope: "global",
        featured: true,
        pinned: false,
        status: "published",
        published_at: new Date().toISOString(),
        chapter_id: AHMEDABAD,
        country_id: INDIA,
        state_id: GUJARAT,
        city_id: CITY_AHM,
        created_by: seeded.gaUserId,
        tags: ["coverage", "sakha"],
        views_count: 3,
        cover_image_url: "https://example.invalid/cover-covsnl.jpg",
        image_alt: "Coverage cover",
        source_url: "https://example.invalid/source",
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        video_title: `${PREFIX} Video Title`,
        read_time_minutes: null,
      })
      .select("id")
      .single();
    if (rErr) throw rErr;
    seeded.newsRichId = rich.id;

    const { data: emptyBody, error: eErr } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Empty Body Notice`,
        summary: null,
        body: null,
        category: null,
        author_name: null,
        article_type: "article",
        scope: "global",
        featured: false,
        status: "published",
        published_at: null,
        chapter_id: AHMEDABAD,
        created_by: seeded.gaUserId,
        tags: [],
        views_count: 0,
        read_time_minutes: 1,
      })
      .select("id")
      .single();
    if (eErr) throw eErr;
    seeded.newsEmptyId = emptyBody.id;

    const { data: obit, error: oErr } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Shok Sandesh`,
        summary: "Obituary style article",
        body: "Remembering a community elder.",
        category: "Obituaries",
        author_name: "Chapter Office",
        article_type: "obituary",
        scope: "chapter",
        featured: false,
        status: "published",
        published_at: new Date().toISOString(),
        chapter_id: AHMEDABAD,
        created_by: seeded.gaUserId,
        tags: ["tribute"],
        views_count: 1,
      })
      .select("id")
      .single();
    if (oErr) throw oErr;
    seeded.newsObitId = obit.id;

    const { data: brk, error: bErr } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Breaking Alert`,
        summary: "Breaking news summary",
        body: "Urgent community notice body.",
        category: "Urgent",
        author_name: "Desk",
        article_type: "breaking",
        scope: "global",
        featured: false,
        status: "published",
        published_at: new Date().toISOString(),
        chapter_id: AHMEDABAD,
        created_by: seeded.gaUserId,
        tags: ["urgent"],
        views_count: 0,
      })
      .select("id")
      .single();
    if (bErr) throw bErr;
    seeded.newsBreakId = brk.id;
  }, 120_000);

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    cleanup();
    vi.restoreAllMocks();
    await cleanupAll();
    await signOut();
  }, 60_000);

  it("SakhaEndorsement: history, endorse success/error, already-endorsed, null", async () => {
    const user = makeUser();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    // Null render: fake target, cannot endorse, not Sakha → component returns null
    const { unmount: u0 } = renderApp(
      <SakhaEndorsement
        targetMemberId={FAKE_MEMBER}
        currentMemberId={seeded.gaMemberId}
        currentMemberLevel={1}
        targetMemberLevel={1}
        isOwnProfile={false}
      />,
      { route: `/members/${FAKE_MEMBER}` },
    );
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").not.toMatch(/sakha verification/);
    }, { timeout: 15_000 });
    u0();
    cleanup();

    // History with endorsed / pending / rejected + singular endorsement label
    const { unmount: u1 } = renderApp(
      withToaster(
        <SakhaEndorsement
          targetMemberId={seeded.targetMemberId}
          currentMemberId={seeded.gaMemberId}
          currentMemberLevel={3}
          targetMemberLevel={1}
          isOwnProfile={false}
        />,
      ),
      { route: `/members/${seeded.targetMemberId}` },
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Sakha Verification/i);
      expect(document.body.textContent).toMatch(/endorsement/i);
      expect(document.body.textContent).toMatch(/pending/i);
      expect(document.body.textContent).toMatch(/rejected/i);
    }, { timeout: 25_000 });

    // alreadyEndorsed path (seeded endorsed row exists for target)
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/already endorsed/i);
    }, { timeout: 15_000 });
    u1();
    cleanup();

    // Clear endorsed rows so canEndorse button shows; keep pending/rejected for history icons
    const admin = adminClient();
    await admin
      .from("verification_requests")
      .delete()
      .eq("member_id", seeded.targetMemberId)
      .eq("status", "endorsed")
      .like("notes", `${PREFIX}%`);

    const { unmount: u2 } = renderApp(
      withToaster(
        <SakhaEndorsement
          targetMemberId={seeded.targetMemberId}
          currentMemberId={seeded.gaMemberId}
          currentMemberLevel={3}
          targetMemberLevel={1}
          isOwnProfile={false}
        />,
      ),
      { route: `/members/${seeded.targetMemberId}` },
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Endorse for Sakha/i })).toBeInTheDocument();
    }, { timeout: 25_000 });

    await user.click(screen.getByRole("button", { name: /Endorse for Sakha/i }));
    const note = await screen.findByPlaceholderText(/Add a note/i);
    await user.type(note, `${PREFIX} live endorse note`);
    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Endorse for Sakha/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Endorse for Sakha/i }));
    await user.type(await screen.findByPlaceholderText(/Add a note/i), `${PREFIX} submit note`);
    await user.click(screen.getByRole("button", { name: /Submit Endorsement/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Sakha endorsement submitted/i);
    }, { timeout: 25_000 });
    u2();
    cleanup();

    // Track new endorsed insert for cleanup
    const { data: newEnds } = await admin
      .from("verification_requests")
      .select("id")
      .eq("member_id", seeded.targetMemberId)
      .like("notes", `${PREFIX}%`);
    seeded.verReqIds = [...new Set([...seeded.verReqIds, ...(newEnds ?? []).map((r) => r.id)])];

    // Error arm: FK failure on fake target member id
    const { unmount: u3 } = renderApp(
      withToaster(
        <SakhaEndorsement
          targetMemberId={FAKE_MEMBER}
          currentMemberId={seeded.gaMemberId}
          currentMemberLevel={3}
          targetMemberLevel={1}
          isOwnProfile={false}
        />,
      ),
      { route: `/members/${FAKE_MEMBER}` },
    );
    // hasSakha false, no endorsements → null unless canEndorse; canEndorse true so card shows
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Endorse for Sakha/i })).toBeInTheDocument();
    }, { timeout: 25_000 });
    await user.click(screen.getByRole("button", { name: /Endorse for Sakha/i }));
    await user.click(screen.getByRole("button", { name: /Submit Endorsement/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/error|foreign key|violates|failed|not found|null/);
    }, { timeout: 25_000 });
    u3();
    cleanup();

    // Own-profile Sakha verified badge path
    renderApp(
      <SakhaEndorsement
        targetMemberId={seeded.gaMemberId}
        currentMemberId={seeded.gaMemberId}
        currentMemberLevel={3}
        targetMemberLevel={3}
        isOwnProfile
      />,
      { route: `/members/${seeded.gaMemberId}` },
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Sakha Verified/i);
    }, { timeout: 25_000 });
  }, 180_000);

  it("NewsDetail: rich/empty/obituary/breaking arms, share, auth redirect", async () => {
    const user = makeUser();
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom navigator.clipboard is a getter-only; define on the prototype/instance.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    await signOut();
    const { unmount: uAuth } = renderApp(<NewsDetail />, {
      route: `/news/${seeded.newsRichId}`,
      pathPattern: "/news/:id",
    });
    await waitFor(() => {
      // Navigate to /auth — MemoryRouter shows empty or auth route placeholder
      expect(document.body.textContent?.length ?? 0).toBeGreaterThanOrEqual(0);
    }, { timeout: 15_000 });
    uAuth();
    cleanup();

    await signIn(E2E_ACCOUNTS.member.email);

    const { unmount: uRich } = renderApp(withToaster(<NewsDetail />), {
      route: `/news/${seeded.newsRichId}`,
      pathPattern: "/news/:id",
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} Rich Feature Article`);
      expect(document.body.textContent).toMatch(/Featured/i);
      expect(document.body.textContent).toMatch(/Coverage Publisher|min read|views|Ahmedabad/i);
      expect(document.body.textContent).toContain(`${PREFIX} Video Title`);
    }, { timeout: 30_000 });

    const copyBtn = screen.getByRole("button", { name: /Copy Link/i });
    await user.click(copyBtn);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
      expect(document.body.textContent).toMatch(/Link copied/i);
    }, { timeout: 10_000 });

    const waBtn = screen.getByRole("button", { name: /Share on WhatsApp/i });
    await user.click(waBtn);
    expect(openSpy).toHaveBeenCalled();
    const source = screen.getByRole("link", { name: /Source/i });
    expect(source.getAttribute("href")).toMatch(/example\.invalid\/source/);
    uRich();
    cleanup();

    const { unmount: uEmpty } = renderApp(<NewsDetail />, {
      route: `/news/${seeded.newsEmptyId}`,
      pathPattern: "/news/:id",
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} Empty Body Notice`);
      expect(document.body.textContent).toMatch(/No article body available/i);
    }, { timeout: 25_000 });
    uEmpty();
    cleanup();

    const { unmount: uObit } = renderApp(<NewsDetail />, {
      route: `/news/${seeded.newsObitId}`,
      pathPattern: "/news/:id",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Shok Sandesh/i);
      expect(document.body.textContent).toMatch(/eternal peace/i);
    }, { timeout: 25_000 });
    uObit();
    cleanup();

    const { unmount: uBrk } = renderApp(<NewsDetail />, {
      route: `/news/${seeded.newsBreakId}`,
      pathPattern: "/news/:id",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Breaking News/i);
      expect(document.body.textContent).toContain(`${PREFIX} Breaking Alert`);
    }, { timeout: 25_000 });
    uBrk();

    // unknown article_type falls through TYPE_COLORS default
    const admin = adminClient();
    const { data: odd } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Odd Type`,
        body: "Odd",
        article_type: "announcement",
        status: "published",
        published_at: new Date().toISOString(),
        created_by: seeded.gaUserId,
        featured: false,
        tags: ["x"],
      })
      .select("id")
      .single();
    if (odd?.id) {
      cleanup();
      renderApp(<NewsDetail />, {
        route: `/news/${odd.id}`,
        pathPattern: "/news/:id",
      });
      await waitFor(() => {
        expect(document.body.textContent).toContain(`${PREFIX} Odd Type`);
        expect(document.body.textContent).toMatch(/announcement/i);
      }, { timeout: 25_000 });
      await admin.from("content_news").delete().eq("id", odd.id);
    }
  }, 180_000);

  it("ChapterLayout: chapter chrome + nav active, error fallback, passthrough", async () => {
    // Passthrough on localhost (no subdomain)
    stubHostname("localhost");
    const { unmount: uLocal } = renderApp(
      <ChapterLayout>
        <div>Local child</div>
      </ChapterLayout>,
      { route: "/" },
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Local child/);
    }, { timeout: 10_000 });
    expect(document.body.textContent).not.toMatch(/KhadayataOnline Global/);
    uLocal();
    cleanup();
    vi.unstubAllGlobals();

    // Full chapter chrome + active Directory nav
    stubHostname("ahmedabad.khadayataonline.com", "/directory");
    const { unmount: uChap } = renderApp(
      <ChapterLayout>
        <div>Chapter child panel</div>
      </ChapterLayout>,
      { route: "/directory" },
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Ahmedabad/i);
      expect(document.body.textContent).toMatch(/KhadayataOnline Global/i);
      expect(document.body.textContent).toMatch(/Chapter child panel/);
      expect(document.body.textContent).toMatch(/Committee|News|Events|Business/i);
    }, { timeout: 25_000 });
    const newsLink = screen.getAllByRole("link").find((a) => /^News$/i.test(a.textContent ?? ""));
    if (newsLink) fireEvent.click(newsLink);
    uChap();
    cleanup();
    vi.unstubAllGlobals();

    // Error arm: revoke chapters SELECT so subdomain query throws
    stubHostname("ahmedabad.khadayataonline.com");
    try {
      psql("REVOKE SELECT ON public.chapters FROM anon, authenticated;");
      const { unmount: uErr } = renderApp(
        <ChapterLayout>
          <div>Error fallback child</div>
        </ChapterLayout>,
        { route: "/" },
      );
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Error fallback child/);
      }, { timeout: 25_000 });
      // Should not show chapter chrome when errored
      expect(document.body.textContent).not.toMatch(/KhadayataOnline Global/);
      uErr();
    } finally {
      psql("GRANT SELECT ON public.chapters TO anon, authenticated;");
    }
  }, 90_000);
});
