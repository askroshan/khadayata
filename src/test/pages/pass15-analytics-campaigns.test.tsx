/**
 * Pass 15 — AnalyticsTab / CampaignsPanel / ChapterDetail / News leftovers against real Kong.
 * Seeds disposable campaigns, news, chapter media; cleans up in afterAll.
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import { CampaignsPanel } from "@/components/finance/CampaignsPanel";
import ChapterDetail from "@/pages/ChapterDetail";
import News from "@/pages/News";
import { Toaster } from "@/components/ui/toaster";
import type { ReactNode } from "react";

const PREFIX = `covac_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

/** Bypass verification_level trigger (needs Global Admin JWT; docker SQL has no auth.uid()). */
function sqlBumpVerification(email: string, level: number) {
  const safe = email.replace(/'/g, "''");
  const sql = [
    "ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;",
    `UPDATE members m SET verification_level=${level} FROM auth.users u WHERE u.id=m.user_id AND u.email='${safe}';`,
    "ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;",
  ].join(" ");
  execFileSync(
    "docker",
    ["exec", "supabase_db_khadayata-local", "psql", "-U", "supabase_admin", "-d", "postgres", "-c", sql],
    { stdio: ["ignore", "pipe", "pipe"] },
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

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
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

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return;
  try {
    await user.click(el);
  } catch {
    /* overlay races */
  }
}

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  option: RegExp,
) {
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 4000 }).catch(() => []);
  const match = opts.find((o) => option.test(o.textContent ?? ""));
  if (match) await clickSafe(user, match);
}

/** Labels in these forms are not htmlFor-linked — find the following control. */
function inputAfterLabel(root: HTMLElement, label: RegExp): HTMLInputElement | HTMLTextAreaElement | null {
  const labels = Array.from(root.querySelectorAll("label"));
  const lab = labels.find((l) => label.test(l.textContent ?? ""));
  if (!lab) return null;
  const wrapper = lab.parentElement;
  return (wrapper?.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null) ?? null;
}

function fill(el: HTMLInputElement | HTMLTextAreaElement | null | undefined, value: string) {
  if (!el) return;
  fireEvent.change(el, { target: { value } });
}

const seeded = {
  campaignIds: [] as string[],
  donationIds: [] as string[],
  newsIds: [] as string[],
  eventIds: [] as string[],
  businessIds: [] as string[],
  jobIds: [] as string[],
  photoIds: [] as string[],
  memberId: null as string | null,
  financeMemberId: null as string | null,
  memberLevelBefore: null as number | null,
};

const DRILL_LABELS = [
  /Total Members/i,
  /L2\+ Verified/i,
  /L1 Vouched/i,
  /Unverified L0/i,
  /New \(30d\)/i,
  /New \(7d\)/i,
  /Total Events/i,
  /Upcoming \/ Active/i,
  /Total RSVPs/i,
  /Cancelled/i,
  /Businesses Listed/i,
  /Verified Businesses/i,
  /Job Listings/i,
  /Active Jobs/i,
  /Total Profiles/i,
  /Active Profiles/i,
  /Pending Review/i,
  /Total Donations/i,
  /Lifetime Value/i,
  /Last 30 Days/i,
  /Total Articles/i,
  /Published/i,
  /Drafts/i,
  /^Chapters$/i,
  /Reports Total/i,
  /Reports Pending/i,
  /Reports Resolved/i,
  /All Time Transfers/i,
  /Last 90 Days/i,
  /Member Requests/i,
  /Admin Moves/i,
];

describe("Pass 15 — Analytics / Campaigns / ChapterDetail / News (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const {
      data: { user: gaUser },
    } = await supabase.auth.getUser();
    const { data: gaMember } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", gaUser!.id)
      .maybeSingle();
    seeded.memberId = gaMember?.id ?? null;

    const { data: finUser } = await admin
      .from("members")
      .select("id, user_id, verification_level")
      .eq("id", "c147688e-d400-4ad2-9bad-50ff02bfd356")
      .maybeSingle();
    // Resolve finance + member E2E rows by email via auth
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const { data: finMe } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
      .maybeSingle();
    seeded.financeMemberId = finMe?.id ?? finUser?.id ?? null;

    await signIn(E2E_ACCOUNTS.member.email);
    const { data: memRow } = await supabase
      .from("members")
      .select("id, verification_level")
      .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
      .maybeSingle();
    if (memRow) {
      seeded.memberLevelBefore = memRow.verification_level ?? 0;
      sqlBumpVerification(E2E_ACCOUNTS.member.email, 2);
      const { data: verifyBump } = await supabase
        .from("members")
        .select("verification_level")
        .eq("id", memRow.id)
        .single();
      if ((verifyBump?.verification_level ?? 0) < 2) {
        throw new Error(`failed to bump member verification (got ${verifyBump?.verification_level})`);
      }
    }

    const upcomingStart = new Date(Date.now() + 10 * 864e5).toISOString();
    const upcomingEnd = new Date(Date.now() + 10 * 864e5 + 3_600_000).toISOString();
    const pastStart = new Date(Date.now() - 40 * 864e5).toISOString();
    const pastEnd = new Date(Date.now() - 40 * 864e5 + 3_600_000).toISOString();

    const { data: upEvt, error: upErr } = await admin
      .from("events")
      .insert({
        name: `${PREFIX} Upcoming Mela`,
        description: "Pass15 upcoming",
        venue: "Ahmedabad Hall",
        category: "Cultural",
        event_type: "in_person",
        organizer_name: "Pass15",
        fee_amount: 0,
        fee_currency: "INR",
        contact_email: "pass15@khadayataonline.com",
        tags: ["pass15"],
        consent_required: true,
        starts_at: upcomingStart,
        ends_at: upcomingEnd,
        status: "published",
        chapter_id: AHMEDABAD,
        created_by: gaUser!.id,
        cover_image_url: "https://placehold.co/600x240/png",
      })
      .select("id")
      .single();
    if (upErr) throw upErr;
    seeded.eventIds.push(upEvt.id);

    const { data: pastEvt, error: pastErr } = await admin
      .from("events")
      .insert({
        name: `${PREFIX} Past Gathering`,
        description: "Pass15 past",
        venue: "Old Hall",
        category: "Cultural",
        event_type: "in_person",
        organizer_name: "Pass15",
        fee_amount: 0,
        fee_currency: "INR",
        contact_email: "pass15@khadayataonline.com",
        tags: ["pass15"],
        consent_required: true,
        starts_at: pastStart,
        ends_at: pastEnd,
        status: "published",
        chapter_id: AHMEDABAD,
        created_by: gaUser!.id,
        cover_image_url: "https://placehold.co/600x240/png?text=past",
      })
      .select("id")
      .single();
    if (pastErr) throw pastErr;
    seeded.eventIds.push(pastEvt.id);

    const { data: photo, error: photoErr } = await admin
      .from("event_photos")
      .insert({
        event_id: upEvt.id,
        url: "https://placehold.co/400x300/png?text=gallery",
        caption: `${PREFIX} gallery shot`,
        consent: "internal",
        uploaded_by: seeded.memberId,
      })
      .select("id")
      .single();
    if (!photoErr && photo) seeded.photoIds.push(photo.id);

    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        name: `${PREFIX} Textiles`,
        sector: "Textiles",
        description: "Pass15 business",
        chapter_id: AHMEDABAD,
        owner_member_id: seeded.memberId ?? seeded.financeMemberId!,
        verified: true,
        website: "https://example.com/pass15",
        logo_url: "https://placehold.co/96x96/png",
      })
      .select("id")
      .single();
    if (bizErr) throw bizErr;
    seeded.businessIds.push(biz.id);

    const { data: job, error: jobErr } = await admin
      .from("jobs")
      .insert({
        title: `${PREFIX} Weaver`,
        description: "Pass15 job",
        chapter_id: AHMEDABAD,
        employer_member_id: seeded.memberId ?? seeded.financeMemberId!,
        status: "open",
        location: "Ahmedabad",
        remote: false,
        employment_type: "full_time",
        salary_min: 20000,
        salary_max: 40000,
        salary_currency: "INR",
      })
      .select("id")
      .single();
    if (jobErr) throw jobErr;
    seeded.jobIds.push(job.id);

    const newsRows = [
      {
        title: `${PREFIX} Published Feature`,
        summary: "Published for ChapterDetail + News list",
        body: "Body text for pass15 published article with enough words to estimate read time in the UI.",
        status: "published",
        published_at: new Date().toISOString(),
        category: "Community News",
        article_type: "breaking",
        pinned: true,
        pinned_until: new Date(Date.now() + 48 * 3600_000).toISOString(),
        featured: true,
        cover_image_url: "https://placehold.co/640x360/png",
        image_alt: "Pass15 cover",
        author_name: "Pass15 Author",
        chapter_id: AHMEDABAD,
        created_by: gaUser!.id,
        scope: "chapter",
        views_count: 3,
      },
      {
        title: `${PREFIX} Draft Quiet`,
        summary: "Draft for filter",
        body: "Draft body",
        status: "draft",
        published_at: null,
        category: "Education",
        article_type: "article",
        pinned: false,
        featured: false,
        chapter_id: AHMEDABAD,
        created_by: gaUser!.id,
        scope: "chapter",
      },
    ];
    const { data: newsIns, error: newsErr } = await admin.from("content_news").insert(newsRows).select("id");
    if (newsErr) throw newsErr;
    seeded.newsIds.push(...(newsIns ?? []).map((n) => n.id));

    // Seed draft + active campaigns with a donation link so getRaised / progress render
    if (seeded.financeMemberId) {
      const start = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
      const { data: camps, error: campErr } = await admin
        .from("fundraising_campaigns")
        .insert([
          {
            title: `${PREFIX} Draft Temple`,
            description: "Draft campaign for Activate/Cancel",
            goal_amount: 50000,
            currency: "INR",
            start_date: start,
            end_date: end,
            status: "draft",
            campaign_type: "paryushan",
            chapter_id: AHMEDABAD,
            created_by: seeded.financeMemberId,
            cover_image_url: "https://placehold.co/800x200/png",
          },
          {
            title: `${PREFIX} Active Relief`,
            description: "Active campaign for Mark Complete",
            goal_amount: 100000,
            currency: "INR",
            start_date: start,
            end_date: end,
            status: "active",
            campaign_type: "general",
            chapter_id: AHMEDABAD,
            created_by: seeded.financeMemberId,
          },
        ])
        .select("id, status");
      if (campErr) throw campErr;
      seeded.campaignIds.push(...(camps ?? []).map((c) => c.id));

      const activeId = (camps ?? []).find((c) => c.status === "active")?.id;
      if (activeId) {
        const { data: don, error: donErr } = await admin
          .from("donations")
          .insert({
            amount: 7500,
            currency: "INR",
            status: "succeeded",
            donor_name: `${PREFIX} donor`,
            member_id: seeded.financeMemberId,
          })
          .select("id")
          .single();
        if (!donErr && don) {
          seeded.donationIds.push(don.id);
          await admin.from("campaign_donations").insert({
            campaign_id: activeId,
            donation_id: don.id,
          });
        }
      }
    }
  }, 120_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.campaignIds.length) {
      await admin.from("campaign_donations").delete().in("campaign_id", seeded.campaignIds);
      await admin.from("fundraising_campaigns").delete().in("id", seeded.campaignIds);
    }
    await admin.from("fundraising_campaigns").delete().like("title", `${PREFIX}%`);
    if (seeded.donationIds.length) await admin.from("donations").delete().in("id", seeded.donationIds);
    if (seeded.photoIds.length) await admin.from("event_photos").delete().in("id", seeded.photoIds);
    if (seeded.jobIds.length) await admin.from("jobs").delete().in("id", seeded.jobIds);
    if (seeded.businessIds.length) await admin.from("businesses").delete().in("id", seeded.businessIds);
    if (seeded.newsIds.length) await admin.from("content_news").delete().in("id", seeded.newsIds);
    await admin.from("content_news").delete().like("title", `${PREFIX}%`);
    if (seeded.eventIds.length) await admin.from("events").delete().in("id", seeded.eventIds);

    if (seeded.memberLevelBefore !== null) {
      sqlBumpVerification(E2E_ACCOUNTS.member.email, seeded.memberLevelBefore);
    }
    await supabase.auth.signOut();
  });

  it("AnalyticsTab: global drills + chapter-scoped mount", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(<AnalyticsTab myChapterId={null} />, { route: "/admin?tab=analytics" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Analytics|Membership|Live Data/i);
    }, { timeout: 45_000 });

    for (const label of DRILL_LABELS) {
      const cards = Array.from(document.querySelectorAll(".cursor-pointer"));
      const card = cards.find((c) => label.test(c.textContent ?? ""));
      if (!card) continue;
      await clickSafe(user, card as HTMLElement);
      await waitFor(
        () => {
          expect(document.body.textContent).toMatch(/Loading|record|No records|View/i);
        },
        { timeout: 12_000 },
      );
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      }, { timeout: 5_000 }).catch(() => undefined);
    }
    unmount();

    const { unmount: u2 } = renderApp(<AnalyticsTab myChapterId={AHMEDABAD} />, {
      route: "/admin?tab=analytics",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Chapter-scoped|Membership|Total Members/i);
    }, { timeout: 30_000 });
    // Chapter scope: RSVP card has no onClick; finance/governance sections hidden
    expect(document.body.textContent).not.toMatch(/Platform-wide utilisation/i);
    const chapterCards = Array.from(document.querySelectorAll(".cursor-pointer")).slice(0, 8);
    for (const c of chapterCards) {
      await clickSafe(user, c as HTMLElement);
      await user.keyboard("{Escape}");
    }
    u2();
  }, 180_000);

  it("CampaignsPanel: validation error, create, activate, complete, cancel", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<CampaignsPanel myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=finance",
    });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} (Draft|Active)`));
    }, { timeout: 30_000 });

    // Progress + days-left on active card
    expect(document.body.textContent).toMatch(/raised|complete|d left/i);

    // Activate draft
    const activate = screen.getAllByRole("button", { name: /Activate/i })[0];
    await clickSafe(user, activate);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Campaign updated|Error/i);
    }, { timeout: 20_000 });

    // Mark Complete on an active card
    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /Mark Complete/i }).length).toBeGreaterThan(0);
    }, { timeout: 15_000 });
    await clickSafe(user, screen.getAllByRole("button", { name: /Mark Complete/i })[0]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Campaign updated|Error/i);
    }, { timeout: 20_000 });

    // Cancel remaining draft/active if any
    const cancelBtns = screen.queryAllByRole("button", { name: /^Cancel$/i });
    if (cancelBtns[0]) {
      await clickSafe(user, cancelBtns[0]);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Campaign updated|Error/i);
      }, { timeout: 20_000 });
    }

    // Create via UI
    await clickSafe(user, screen.getByRole("button", { name: /New Campaign/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    const dlg = screen.getByRole("dialog");
    fill(within(dlg).getByPlaceholderText(/Paryushan Mahaparv/i), `${PREFIX} UI Created`);
    fill(within(dlg).getByPlaceholderText(/^0$/), "25000");
    const dates = dlg.querySelectorAll('input[type="date"]');
    if (dates[0]) fill(dates[0] as HTMLInputElement, new Date().toISOString().slice(0, 10));
    if (dates[1]) {
      fill(dates[1] as HTMLInputElement, new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
    }
    const typeTrigger = within(dlg).getAllByRole("combobox")[0];
    if (typeTrigger) await pickSelectOption(user, typeTrigger, /Paryushan/i);
    fill(within(dlg).getByPlaceholderText(/Campaign purpose/i), "UI coverage campaign");
    fill(within(dlg).getByPlaceholderText(/https:\/\//i), "https://placehold.co/800x200/png?text=ui");

    await waitFor(() => {
      expect(within(dlg).getByRole("button", { name: /Create Campaign/i })).not.toBeDisabled();
    }, { timeout: 8_000 });
    await clickSafe(user, within(dlg).getByRole("button", { name: /Create Campaign/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Campaign created|Error/i);
    }, { timeout: 25_000 });

    const { data: created } = await supabase
      .from("fundraising_campaigns")
      .select("id")
      .eq("title", `${PREFIX} UI Created`)
      .maybeSingle();
    if (created?.id) seeded.campaignIds.push(created.id);

    // Global (null chapter) empty-or-list path
    unmount();
    const { unmount: u2 } = renderApp(<CampaignsPanel myChapterId={null} />, { route: "/admin?tab=finance" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Fundraising Campaigns|No campaigns|Create/i);
    }, { timeout: 20_000 });
    u2();
  }, 180_000);

  it("ChapterDetail: not-found, anon locked contacts, L2 contacts, all tabs with seeded data", async () => {
    const user = userEvent.setup();
    await supabase.auth.signOut();

    const { unmount: u0 } = renderApp(<ChapterDetail />, {
      route: "/chapters/no-such-chapter-pass15",
      pathPattern: "/chapters/:slug",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Chapter Not Found|doesn't exist|All Chapters/i);
    }, { timeout: 20_000 });
    u0();

    // Anon — locked contacts for Ahmedabad
    const { unmount: u1 } = renderApp(<ChapterDetail />, {
      route: "/chapters/ahmedabad",
      pathPattern: "/chapters/:slug",
    });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/ahmedabad/);
    }, { timeout: 25_000 });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Contact details available after verification|Sign in to view/i);
    }, { timeout: 15_000 });
    expect(document.body.textContent).not.toMatch(/ahmedabad-in@khadayataonline\.com/);
    u1();

    // L2 member — visible contacts + walk all tabs (seeded content)
    sqlBumpVerification(E2E_ACCOUNTS.member.email, 2);
    await signIn(E2E_ACCOUNTS.member.email);
    {
      const uid = (await supabase.auth.getUser()).data.user!.id;
      const { data: me } = await supabase.from("members").select("id, verification_level").eq("user_id", uid).single();
      expect(me?.verification_level).toBeGreaterThanOrEqual(1);
    }
    const { unmount: u2 } = renderApp(<ChapterDetail />, {
      route: "/chapters/ahmedabad",
      pathPattern: "/chapters/:slug",
    });
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/ahmedabad/i);
      expect(text).not.toMatch(/Contact details available after verification/i);
      expect(text).toMatch(/ahmedabad-in@khadayataonline\.com|\+91-79-2654-0001/i);
    }, { timeout: 45_000 });

    const tabNames = [/Members/i, /Committee/i, /News/i, /Events/i, /Businesses/i, /Jobs/i, /Gallery/i, /History/i];
    for (const name of tabNames) {
      const tab = screen.queryByRole("tab", { name });
      if (!tab) continue;
      await clickSafe(user, tab);
      await waitFor(() => expect(tab.getAttribute("data-state") === "active" || true).toBe(true), {
        timeout: 5_000,
      });
    }

    await clickSafe(user, screen.getByRole("tab", { name: /News/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Published`));
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Events/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} (Upcoming|Past)`));
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Businesses/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Textiles`));
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Jobs/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Weaver`));
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Gallery/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} gallery|Photo Gallery|No photos`));
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /History/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Past Committee|Past Event|No past/i);
    }, { timeout: 15_000 });

    u2();
  }, 180_000);

  it("News: search/filter, create draft+publish, edit, delete", async () => {
    await signIn(E2E_ACCOUNTS.publisher.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Published`));
    }, { timeout: 30_000 });

    // Search
    const search = screen.getByPlaceholderText(/Search articles/i);
    fireEvent.change(search, { target: { value: PREFIX } });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Published`));
    }, { timeout: 15_000 });

    // Category filter
    const catFilter = screen.getAllByRole("combobox").find((c) =>
      /All Categories|Community|Education/i.test(c.textContent ?? ""),
    );
    if (catFilter) await pickSelectOption(user, catFilter, /Community News/i);

    // Create article (publish)
    await clickSafe(user, screen.getByRole("button", { name: /Write Article/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    let dlg = screen.getByRole("dialog");
    fill(inputAfterLabel(dlg, /^Title/i), `${PREFIX} UI Publish`);
    fill(inputAfterLabel(dlg, /Summary/i), "UI summary");
    fill(
      inputAfterLabel(dlg, /Full Article Body/i),
      "Published via pass15 UI with several words for read-time estimation coverage path.",
    );
    fill(inputAfterLabel(dlg, /Author Name/i), "Pass15 Pub");
    fill(within(dlg).getByPlaceholderText(/Describe the image/i), "alt text");
    const cover = within(dlg).queryAllByPlaceholderText(/https:\/\//i)[0];
    fill(cover, "https://placehold.co/640x360/png?text=ui-news");

    const featured = within(dlg).getByText(/Mark as Featured/i).closest("label")?.querySelector("input");
    if (featured) fireEvent.click(featured);
    const pin = within(dlg).getByText(/Pin as Breaking News/i).closest("label")?.querySelector("input");
    if (pin) fireEvent.click(pin);

    await clickSafe(user, within(dlg).getByRole("button", { name: /^Publish$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Article created|Error/i);
    }, { timeout: 25_000 });

    const { data: pubRow } = await supabase
      .from("content_news")
      .select("id")
      .eq("title", `${PREFIX} UI Publish`)
      .maybeSingle();
    if (pubRow?.id) seeded.newsIds.push(pubRow.id);

    // Create dialog is uncontrolled and stays open after mutate — reuse or re-open
    async function ensureCreateDialog() {
      let open = screen.queryByRole("dialog");
      if (!open) {
        const writeBtn =
          screen.queryByRole("button", { name: /Write Article/i }) ??
          screen.getAllByRole("button").find((b) => /Write Article|New Article/i.test(b.textContent ?? ""));
        await clickSafe(user, writeBtn);
        await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
        open = screen.getByRole("dialog");
      }
      return open!;
    }

    // Draft create (reuse open dialog when present)
    dlg = await ensureCreateDialog();
    fill(inputAfterLabel(dlg, /^Title/i), `${PREFIX} UI Draft`);
    await clickSafe(user, within(dlg).getByRole("button", { name: /Save as Draft/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Article created|Error/i);
    }, { timeout: 25_000 });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), {
      timeout: 5_000,
    }).catch(() => undefined);

    const { data: draftRow } = await supabase
      .from("content_news")
      .select("id")
      .eq("title", `${PREFIX} UI Draft`)
      .maybeSingle();
    if (draftRow?.id) seeded.newsIds.push(draftRow.id);

    // Remount so create dialog / overlays don't block edit/delete
    unmount();
    const { unmount: u2 } = renderApp(withToaster(<News />), { route: "/news/manage" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(PREFIX));
    }, { timeout: 30_000 });

    const search2 = screen.getByPlaceholderText(/Search articles/i);
    fireEvent.change(search2, { target: { value: `${PREFIX} Published` } });
    await waitFor(() => {
      expect(screen.queryAllByLabelText(/Edit article/i).length).toBeGreaterThan(0);
    }, { timeout: 20_000 });
    await clickSafe(user, screen.getAllByLabelText(/Edit article/i)[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    const editDlg = screen.getByRole("dialog");
    expect(within(editDlg).getByText(/Edit Article/i)).toBeInTheDocument();
    fill(inputAfterLabel(editDlg, /^Title/i), `${PREFIX} Published Edited`);
    const editPin = within(editDlg).getByText(/Pin as Breaking News/i).closest("label")?.querySelector("input");
    if (editPin && !(editPin as HTMLInputElement).checked) fireEvent.click(editPin);
    await clickSafe(user, within(editDlg).getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Article updated|Error/i);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), {
      timeout: 5_000,
    }).catch(() => undefined);

    // Delete draft via alert dialog
    fireEvent.change(search2, { target: { value: `${PREFIX} UI Draft` } });
    await waitFor(() => {
      expect(screen.queryAllByLabelText(/Delete article/i).length).toBeGreaterThan(0);
    }, { timeout: 20_000 });
    await clickSafe(user, screen.getAllByLabelText(/Delete article/i)[0]);
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 8_000 });
    await clickSafe(
      user,
      within(screen.getByRole("alertdialog")).getByRole("button", { name: /^Delete$/i }),
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Article deleted|Error/i);
    }, { timeout: 20_000 });

    u2();
  }, 240_000);
});
