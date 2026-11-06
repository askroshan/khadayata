/**
 * Pass 31 — Wave 12: leftover onError + geo/edit selects.
 * EMAILIT blank. Writes are forced to fail so no email/SMS/notify fires.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import ChaptersTab from "@/components/admin/ChaptersTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import FinanceTab from "@/components/admin/FinanceTab";
import MembersTab from "@/components/admin/MembersTab";
import EventsTab from "@/components/admin/EventsTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import SamitiTab from "@/components/admin/SamitiTab";
import BulkContentTab from "@/components/admin/BulkContentTab";
import RolesTab from "@/components/admin/RolesTab";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import { RecurringPledgesPanel } from "@/components/finance/RecurringPledgesPanel";
import Profile from "@/pages/Profile";
import News from "@/pages/News";
import Business from "@/pages/Business";
import Search from "@/pages/Search";
import OralHistory from "@/pages/OralHistory";
import Temple from "@/pages/Temple";
import MemberProfile from "@/pages/MemberProfile";
import Events from "@/pages/Events";
import Matrimonial from "@/pages/Matrimonial";
import Mentorship from "@/pages/Mentorship";
import Scholarships from "@/pages/Scholarships";
import EldersCouncil from "@/pages/EldersCouncil";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import { FamilyInviteDialog } from "@/components/profile/FamilyInviteDialog";

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

const PREFIX = `covw12h_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";

const seeded: {
  gaMemberId?: string;
  gaUserId?: string;
  otherMemberId?: string;
  aidId?: string;
  scholarshipId?: string;
  appId?: string;
  bookingId?: string;
  bizId?: string;
  jobId?: string;
  templateId?: string;
  oralId?: string;
  newsId?: string;
  eventId?: string;
  keywordId?: string;
  introId?: string;
  campaignId?: string;
} = {};

function hardClick(el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return;
  fireEvent.pointerDown(el);
  fireEvent.mouseDown(el);
  fireEvent.pointerUp(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

function isDisabled(el: HTMLElement | null | undefined) {
  if (!el) return true;
  return (
    (el as HTMLButtonElement).disabled ||
    el.getAttribute("aria-disabled") === "true" ||
    el.hasAttribute("data-disabled")
  );
}

function findComboNearLabel(root: ParentNode, labelRe: RegExp): HTMLElement | null {
  const nodes = Array.from(root.querySelectorAll("label, p, span, div")).filter((n) =>
    labelRe.test((n.textContent ?? "").trim()),
  );
  for (const lab of nodes) {
    const wrap = lab.closest("div") ?? lab.parentElement;
    const combo = wrap?.querySelector('[role="combobox"]') as HTMLElement | null;
    if (combo) return combo;
  }
  return null;
}

function changeLabeledInput(root: ParentNode, labelRe: RegExp, value: string) {
  const labels = Array.from(root.querySelectorAll("label, p")).filter((n) =>
    labelRe.test((n.textContent ?? "").trim()),
  );
  for (const lab of labels) {
    const wrap = lab.closest("div") ?? lab.parentElement;
    const input = wrap?.querySelector("input, textarea, select") as HTMLInputElement | null;
    if (input && input.type !== "hidden" && input.type !== "file") {
      fireEvent.change(input, { target: { value } });
      return true;
    }
  }
  return false;
}

async function escapeOpen() {
  fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
  fireEvent.keyUp(document.body, { key: "Escape", code: "Escape" });
  const closeBtn = screen.queryByRole("button", { name: /Close/i });
  if (closeBtn) hardClick(closeBtn);
}

async function openAndPick(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement | null | undefined,
  optionRe: RegExp,
) {
  if (!trigger || isDisabled(trigger)) return false;
  await escapeOpen();
  try {
    await user.click(trigger);
    const opts = await screen.findAllByRole("option", {}, { timeout: 3000 }).catch(() => []);
    const pick = opts.find((o) => optionRe.test(o.textContent ?? ""));
    if (pick) {
      await user.click(pick);
      return true;
    }
    await escapeOpen();
  } catch {
    await escapeOpen();
  }
  return false;
}

async function pickDifferent(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement | null | undefined,
) {
  if (!trigger || isDisabled(trigger)) return false;
  const current = (trigger.textContent ?? "").trim();
  await escapeOpen();
  try {
    await user.click(trigger);
    const opts = await screen.findAllByRole("option", {}, { timeout: 3000 }).catch(() => []);
    const pick =
      opts.find(
        (o) =>
          (o.textContent ?? "").trim() !== current &&
          !/select|any|none|default|no country|no state/i.test(o.textContent ?? ""),
      ) ?? opts[1];
    if (pick) {
      await user.click(pick);
      return true;
    }
    await escapeOpen();
  } catch {
    await escapeOpen();
  }
  return false;
}

async function cascadeGeo(user: ReturnType<typeof userEvent.setup>, root: ParentNode = document.body) {
  const country = findComboNearLabel(root, /^Country$/i);
  await openAndPick(user, country, /^India$/i);
  await waitFor(
    () => {
      const state = findComboNearLabel(root, /^State$/i);
      expect(state && !isDisabled(state)).toBe(true);
    },
    { timeout: 10_000 },
  ).catch(() => undefined);
  const state = findComboNearLabel(root, /^State$/i);
  await openAndPick(user, state, /Gujarat/i);
  await waitFor(
    () => {
      const city = findComboNearLabel(root, /^City$/i);
      expect(city && !isDisabled(city)).toBe(true);
    },
    { timeout: 10_000 },
  ).catch(() => undefined);
  const city = findComboNearLabel(root, /^City$/i);
  await openAndPick(user, city, /Ahmedabad/i);
}

function boomChain(message: string) {
  const result = { data: null, error: { message } };
  const p = Promise.resolve(result);
  const chain: Record<string, unknown> = {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
  };
  for (const k of ["eq", "in", "neq", "match", "select", "single", "maybeSingle", "order", "limit", "is"]) {
    chain[k] = () => boomChain(message);
  }
  return chain;
}

const REAL_FROM = supabase.from.bind(supabase);
const REAL_RPC = supabase.rpc.bind(supabase);
const REAL_INVOKE = supabase.functions.invoke.bind(supabase.functions);

function restoreWrites() {
  const client = supabase as unknown as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(client, "from")) delete client.from;
  if (Object.prototype.hasOwnProperty.call(client, "rpc")) delete client.rpc;
  const fns = supabase.functions as unknown as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(fns, "invoke")) delete fns.invoke;
  if (typeof supabase.from !== "function") {
    (supabase as { from: typeof supabase.from }).from = REAL_FROM as typeof supabase.from;
  }
  if (typeof supabase.rpc !== "function") {
    (supabase as { rpc: typeof supabase.rpc }).rpc = REAL_RPC as typeof supabase.rpc;
  }
  if (typeof supabase.functions.invoke !== "function") {
    supabase.functions.invoke = REAL_INVOKE;
  }
}

function forceWritesFail() {
  const message = `${PREFIX} boom`;
  (supabase as { from: typeof supabase.from }).from = ((table: string) => {
    const q = REAL_FROM(table);
    const boom = () => boomChain(message);
    (q as { insert: unknown }).insert = boom;
    (q as { update: unknown }).update = boom;
    (q as { delete: unknown }).delete = boom;
    (q as { upsert: unknown }).upsert = boom;
    return q;
  }) as typeof supabase.from;
  (supabase as { rpc: typeof supabase.rpc }).rpc = (async () => ({
    data: null,
    error: { message },
  })) as typeof supabase.rpc;
  supabase.functions.invoke = (async () => ({
    data: null,
    error: { message },
  })) as typeof supabase.functions.invoke;
  return restoreWrites;
}

async function submitFailing(name: RegExp | string) {
  const restore = forceWritesFail();
  try {
    const btn =
      typeof name === "string"
        ? screen.queryByRole("button", { name })
        : screen.queryAllByRole("button", { name })[0];
    hardClick(btn);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
      timeout: 8_000,
    }).catch(() => undefined);
  } finally {
    restore();
  }
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

describe("Pass 31 — Wave 12 leftover onError + geo/edit selects", () => {
  afterEach(() => {
    restoreWrites();
  });

  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const gaUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    seeded.gaUserId = gaUserId ?? undefined;
    const { data: ga } = await admin.from("members").select("id").eq("user_id", gaUserId ?? "").maybeSingle();
    seeded.gaMemberId = ga?.id;

    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const caUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: ca } = await admin.from("members").select("id").eq("user_id", caUserId ?? "").maybeSingle();
    seeded.otherMemberId = ca?.id;
    await supabase.auth.signOut().catch(() => undefined);

    if (ga?.id) {
      const { data: aid } = await admin
        .from("medical_aid_requests")
        .insert({
          patient_name: `${PREFIX} Patient`,
          relation: "self",
          condition_summary: "coverage aid",
          amount_needed: 1500,
          currency: "INR",
          member_id: ga.id,
          chapter_id: AHMEDABAD,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (aid?.id) seeded.aidId = aid.id;

      const { data: sch } = await admin
        .from("scholarships")
        .insert({
          name: `${PREFIX} Grant`,
          description: "coverage",
          amount: 8000,
          currency: "INR",
          deadline: "2027-06-01",
          status: "active",
        })
        .select("id")
        .maybeSingle();
      if (sch?.id) {
        seeded.scholarshipId = sch.id;
        const { data: app } = await admin
          .from("scholarship_applications")
          .insert({
            scholarship_id: sch.id,
            member_id: ga.id,
            essay: `${PREFIX} essay`,
            status: "submitted",
          })
          .select("id")
          .maybeSingle();
        if (app?.id) seeded.appId = app.id;
      }

      const { data: book } = await admin
        .from("hall_bookings")
        .insert({
          hall_name: `${PREFIX} Hall`,
          purpose: "coverage",
          booking_date: "2027-03-15",
          start_time: "09:00",
          end_time: "12:00",
          guests: 40,
          member_id: ga.id,
          chapter_id: AHMEDABAD,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (book?.id) seeded.bookingId = book.id;

      const { data: biz } = await admin
        .from("businesses")
        .insert({
          name: `${PREFIX} Biz`,
          sector: "Retail",
          description: "unverified coverage",
          verified: false,
          chapter_id: AHMEDABAD,
          owner_member_id: ga.id,
          country_id: INDIA,
        })
        .select("id")
        .maybeSingle();
      if (biz?.id) seeded.bizId = biz.id;

      const { data: job } = await admin
        .from("jobs")
        .insert({
          title: `${PREFIX} Job`,
          description: "coverage job",
          location: "Ahmedabad",
          employment_type: "full_time",
          status: "open",
          chapter_id: AHMEDABAD,
          employer_member_id: ga.id,
          country_id: INDIA,
          state_id: GUJARAT,
        })
        .select("id")
        .maybeSingle();
      if (job?.id) seeded.jobId = job.id;

      const { data: tmpl } = await admin
        .from("whatsapp_templates")
        .insert({
          name: `${PREFIX}_tmpl`,
          language: "en",
          category: "UTILITY",
          header_text: "Hi",
          body_text: "Hello {{1}}",
          footer_text: "Khadayata",
          status: "pending",
          created_by: ga.id,
        })
        .select("id")
        .maybeSingle();
      if (tmpl?.id) seeded.templateId = tmpl.id;

      const { data: campaign } = await admin
        .from("fundraising_campaigns")
        .insert({
          title: `${PREFIX} Campaign`,
          description: "coverage campaign",
          goal_amount: 5000,
          currency: "INR",
          start_date: "2026-01-01",
          end_date: "2027-12-31",
          campaign_type: "general",
          status: "active",
          chapter_id: AHMEDABAD,
          created_by: ga.id,
        })
        .select("id")
        .maybeSingle();
      if (campaign?.id) seeded.campaignId = campaign.id;
    }

    if (ca?.id && ga?.id) {
      const { data: intro } = await admin
        .from("matrimonial_introductions")
        .insert({
          from_member_id: ca.id,
          to_member_id: ga.id,
          status: "pending",
          message: `${PREFIX} intro`,
        })
        .select("id")
        .maybeSingle();
      if (intro?.id) seeded.introId = intro.id;
    }

    const { data: oral } = await admin
      .from("oral_histories")
      .insert({
        title: `${PREFIX} oral`,
        description: "coverage oral",
        narrator_name: "Coverage Elder",
        media_type: "audio",
        tags: [`${PREFIX}-tag`, "heritage"],
        created_by: gaUserId,
        chapter_id: AHMEDABAD,
        status: "published",
      })
      .select("id")
      .maybeSingle();
    if (oral?.id) seeded.oralId = oral.id;

    const { data: news } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} article`,
        summary: "coverage",
        body: "coverage body ".repeat(20),
        status: "published",
        published_at: new Date().toISOString(),
        article_type: "article",
        category: "Announcements",
        chapter_id: AHMEDABAD,
        created_by: gaUserId,
        tags: [],
        images: [],
        scope: "chapter",
      })
      .select("id")
      .maybeSingle();
    if (news?.id) seeded.newsId = news.id;

    const { data: event } = await admin
      .from("events")
      .insert({
        name: `${PREFIX} Event`,
        description: "coverage event",
        venue: "Hall",
        starts_at: "2027-04-01T10:00:00Z",
        ends_at: "2027-04-01T14:00:00Z",
        status: "published",
        created_by: gaUserId,
        chapter_id: AHMEDABAD,
        category: "Cultural",
        event_type: "in_person",
        fee_amount: 10,
        fee_currency: "INR",
        country_id: INDIA,
        state_id: GUJARAT,
      })
      .select("id")
      .maybeSingle();
    if (event?.id) seeded.eventId = event.id;

    const { data: kw } = await admin
      .from("banned_keywords")
      .insert({
        keyword: `${PREFIX}-kw`,
        severity: "low",
        added_by: ga?.id ?? null,
      })
      .select("id")
      .maybeSingle();
    if (kw?.id) seeded.keywordId = kw.id;
  }, 90_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    if (seeded.introId) await admin.from("matrimonial_introductions").delete().eq("id", seeded.introId);
    if (seeded.appId) await admin.from("scholarship_applications").delete().eq("id", seeded.appId);
    if (seeded.scholarshipId) await admin.from("scholarships").delete().eq("id", seeded.scholarshipId);
    if (seeded.aidId) await admin.from("medical_aid_requests").delete().eq("id", seeded.aidId);
    if (seeded.bookingId) await admin.from("hall_bookings").delete().eq("id", seeded.bookingId);
    if (seeded.jobId) await admin.from("jobs").delete().eq("id", seeded.jobId);
    if (seeded.bizId) await admin.from("businesses").delete().eq("id", seeded.bizId);
    if (seeded.templateId) await admin.from("whatsapp_templates").delete().eq("id", seeded.templateId);
    if (seeded.oralId) await admin.from("oral_histories").delete().eq("id", seeded.oralId);
    if (seeded.newsId) await admin.from("content_news").delete().eq("id", seeded.newsId);
    if (seeded.eventId) await admin.from("events").delete().eq("id", seeded.eventId);
    if (seeded.keywordId) await admin.from("banned_keywords").delete().eq("id", seeded.keywordId);
    if (seeded.campaignId) await admin.from("fundraising_campaigns").delete().eq("id", seeded.campaignId);
    restoreWrites();
    await supabase.auth.signOut().catch(() => undefined);
  }, 60_000);

  it("geo cascade: Search / Business / News / Events", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(<Search />, { route: "/search" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Search|Advanced Filters/i), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /Advanced Filters/i }));
      await waitFor(() => expect(screen.getByText(/Any country/i)).toBeTruthy(), { timeout: 8_000 });
      await cascadeGeo(user);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Business />), { route: "/business/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job/i), { timeout: 45_000 });
      await waitFor(() => {
        const enabled = screen
          .queryAllByRole("button", { name: /List Business/i })
          .find((b) => !(b as HTMLButtonElement).disabled);
        expect(enabled).toBeTruthy();
      }, { timeout: 20_000 }).catch(() => undefined);
      const listBtn = screen
        .queryAllByRole("button", { name: /List Business/i })
        .find((b) => !(b as HTMLButtonElement).disabled);
      hardClick(listBtn);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await cascadeGeo(user, dlg);
        await escapeOpen();
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Business />), { route: "/business/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("tab", { name: /Jobs/i })[0]);
      hardClick(screen.queryAllByRole("button", { name: /^Post Job$/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 10_000 }).catch(() => null);
      if (dlg) {
        await cascadeGeo(user, dlg);
        await escapeOpen();
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });
      await waitFor(() => expect(screen.getByRole("button", { name: /Write Article/i })).toBeTruthy(), {
        timeout: 45_000,
      });
      hardClick(screen.getByRole("button", { name: /Write Article/i }));
      const dlg = await screen.findByRole("dialog", {}, { timeout: 10_000 });
      await cascadeGeo(user, dlg);
      await escapeOpen();
      hardClick(screen.queryAllByLabelText(/Edit article/i)[0]);
      const edit = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (edit) {
        await pickDifferent(user, findComboNearLabel(edit, /Article Type/i));
        await escapeOpen();
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Events />), { route: "/events/manage" });
      await waitFor(() => expect(screen.getByRole("button", { name: /Create/i })).toBeTruthy(), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /Create/i }));
      const dlg = await screen.findByRole("dialog", {}, { timeout: 10_000 });
      await cascadeGeo(user, dlg);
      await escapeOpen();
      hardClick(screen.queryAllByLabelText(/Edit event/i)[0]);
      const edit = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (edit) {
        await pickDifferent(user, findComboNearLabel(edit, /^Status$/i));
        await escapeOpen();
      }
      unmount();
    }
  }, 180_000);

  it("FinanceTab: Review/Approve/fund currency/campaign with mocked writes", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Donations|Fund/i), { timeout: 45_000 });

    hardClick(screen.getByRole("tab", { name: /Medical Aid/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 15_000 }).catch(
      () => undefined,
    );
    hardClick(screen.queryAllByRole("button", { name: /^Review$/i })[0]);
    let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      await submitFailing(/Approve/i);
      await escapeOpen();
    }

    hardClick(screen.getByRole("tab", { name: /Scholarships/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Grant|Application/i), { timeout: 15_000 }).catch(
      () => undefined,
    );
    hardClick(screen.queryAllByRole("button", { name: /^Review$/i })[0]);
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      await submitFailing(/Approve/i);
      await escapeOpen();
    }

    hardClick(screen.getByRole("tab", { name: /Hall Bookings/i }));
    const restoreHall = forceWritesFail();
    hardClick(screen.queryAllByRole("button", { name: /Approve/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
      timeout: 8_000,
    }).catch(() => undefined);
    restoreHall();
    hardClick(screen.queryAllByLabelText(/Delete booking/i)[0]);
    await submitFailing(/^Delete$/i);
    hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);

    hardClick(screen.getByRole("tab", { name: /Fund Management/i }));
    hardClick(screen.queryAllByLabelText(/Edit fund/i)[0]);
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      await pickDifferent(user, findComboNearLabel(dlg, /^Currency$/i));
      await submitFailing(/Save Changes/i);
      await escapeOpen();
    }
    hardClick(screen.getByRole("button", { name: /Create Fund/i }));
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      changeLabeledInput(dlg, /Fund Name/i, `${PREFIX} fund`);
      await pickDifferent(user, findComboNearLabel(dlg, /^Currency$/i));
      await submitFailing(/Create Fund/i);
      await escapeOpen();
    }

    hardClick(screen.getByRole("tab", { name: /Medical Aid/i }));
    hardClick(screen.getByRole("button", { name: /New Request/i }));
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      changeLabeledInput(dlg, /Patient Name/i, `${PREFIX} new`);
      await submitFailing(/Submit Request/i);
      await escapeOpen();
    }

    hardClick(screen.getByRole("tab", { name: /Campaigns/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Campaign/i), { timeout: 15_000 });
    hardClick(screen.queryAllByRole("button", { name: /New Campaign|Create Campaign/i })[0]);
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      changeLabeledInput(dlg, /Title|Campaign/i, `${PREFIX} camp`);
      await pickDifferent(user, findComboNearLabel(dlg, /^Currency$/i));
      await submitFailing(/Create|Save/i);
      await escapeOpen();
    }
    const restoreCancel = forceWritesFail();
    hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i }).find((b) => /campaign/i.test(b.closest("div")?.textContent ?? "")) ?? screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
      timeout: 6_000,
    }).catch(() => undefined);
    restoreCancel();

    unmount();
  }, 180_000);

  it("DirectoryTab: delete business, edit/close job, mocked writes", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Directory|Business/i), { timeout: 45_000 });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 15_000 }).catch(
      () => undefined,
    );

    hardClick(screen.queryAllByLabelText(/Delete business/i)[0]);
    await submitFailing(/^Delete$/i);
    hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);

    hardClick(screen.queryAllByLabelText(/Edit business/i)[0]);
    let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      await submitFailing(/Save Changes/i);
      await escapeOpen();
    }

    hardClick(screen.getByRole("tab", { name: /Job/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Job`)), { timeout: 15_000 }).catch(
      () => undefined,
    );
    hardClick(screen.queryAllByLabelText(/Edit job/i)[0]);
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      await submitFailing(/Save Changes/i);
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      await escapeOpen();
    }
    const restoreClose = forceWritesFail();
    hardClick(screen.queryAllByRole("button", { name: /^Close$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
      timeout: 8_000,
    }).catch(() => undefined);
    restoreClose();
    hardClick(screen.queryAllByLabelText(/Delete job/i)[0]);
    await submitFailing(/^Delete$/i);
    hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);

    hardClick(screen.queryAllByRole("button", { name: /Add Job/i })[0]);
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      changeLabeledInput(dlg, /Job Title|Title/i, `${PREFIX} new job`);
      await submitFailing(/Create|Save|Post/i);
      await escapeOpen();
    }

    unmount();
  }, 120_000);

  it("Chapters / WhatsApp / EventsTab edit fields + mocked writes", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<ChaptersTab />), { route: "/admin?tab=chapters" });
      await waitFor(() => expect(screen.queryAllByLabelText(/Edit chapter/i).length).toBeGreaterThan(0), {
        timeout: 45_000,
      });
      hardClick(screen.queryAllByLabelText(/Edit chapter/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /^Country$/i, `${PREFIX} Country`);
        await submitFailing(/Save Changes/i);
        await escapeOpen();
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
      await waitFor(() => expect(document.body.textContent).toMatch(/WhatsApp|Template/i), { timeout: 45_000 });
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}_tmpl`)), {
        timeout: 15_000,
      }).catch(() => undefined);
      hardClick(screen.queryAllByLabelText(/Edit template/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await openAndPick(user, findComboNearLabel(dlg, /^Language$/i), /Hindi/i);
        await openAndPick(user, findComboNearLabel(dlg, /^Category$/i), /Marketing/i);
        changeLabeledInput(dlg, /^Header/i, `${PREFIX} header`);
        changeLabeledInput(dlg, /^Footer/i, `${PREFIX} footer`);
        await submitFailing(/Save Template/i);
        await escapeOpen();
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<EventsTab myChapterId={null} />), { route: "/admin?tab=events" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Event/i), { timeout: 45_000 });
      hardClick(screen.queryAllByLabelText(/Edit event/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /Starts At/i, "2027-08-01T18:00");
        changeLabeledInput(dlg, /Ends At/i, "2027-08-01T20:00");
        await pickDifferent(user, findComboNearLabel(dlg, /Fee Currency/i));
        await submitFailing(/Save Changes/i);
        await escapeOpen();
      }
      unmount();
    }
  }, 150_000);

  it("MembersTab invite chapter + MemberProfile names/level-down", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { data: members } = await supabase
      .from("members")
      .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
      .limit(30);

    {
      const { unmount } = renderApp(
        withToaster(
          <MembersTab
            members={(members ?? []) as never}
            myChapterId={null}
            canInvite
            canSendReminders
            isGlobalAdmin
          />,
        ),
        { route: "/admin?tab=members" },
      );
      await waitFor(() => expect(screen.getByRole("button", { name: /Invite Member/i })).toBeTruthy(), {
        timeout: 30_000,
      });
      hardClick(screen.getByRole("button", { name: /Invite Member/i }));
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      await openAndPick(user, findComboNearLabel(dlg, /Chapter/i), /Ahmedabad/i);
      changeLabeledInput(dlg, /Email/i, `${PREFIX}@example.invalid`);
      changeLabeledInput(dlg, /First Name/i, PREFIX);
      await submitFailing(/Send Invitation/i);
      await escapeOpen();
      const restoreLevel = forceWritesFail();
      hardClick(screen.queryAllByLabelText(/Downgrade verification level/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restoreLevel();
      unmount();
    }

    if (seeded.otherMemberId) {
      const { unmount } = renderApp(withToaster(<MemberProfile />), {
        route: `/member/${seeded.otherMemberId}`,
        pathPattern: "/member/:id",
      });
      await waitFor(() => expect(screen.getByRole("button", { name: /Edit Member/i })).toBeTruthy(), {
        timeout: 45_000,
      });
      hardClick(screen.getByRole("button", { name: /Edit Member/i }));
      const dlg = await screen.findByRole("dialog", { name: /Edit Member/i }, { timeout: 8_000 }).catch(
        () => screen.queryByRole("dialog"),
      );
      if (dlg) {
        changeLabeledInput(dlg, /First Name/i, `${PREFIX} First`);
        changeLabeledInput(dlg, /Last Name/i, `${PREFIX} Last`);
        await submitFailing(/Save Changes/i);
        await escapeOpen();
      }
      hardClick(screen.queryByRole("button", { name: /Verification Panel/i }));
      const restore = forceWritesFail();
      hardClick(screen.queryByRole("button", { name: /Downgrade verification level/i }));
      hardClick(screen.queryByRole("button", { name: /^Downgrade$/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      const note = screen.queryByPlaceholderText(/Record a note/i);
      if (note) fireEvent.change(note, { target: { value: `${PREFIX} note` } });
      await submitFailing(/Save Note/i);
      await submitFailing(/^Request$/i);
      unmount();
    }
  }, 150_000);

  it("Profile chapter, Matrimonial, Oral tag, keywords, family country", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
      await waitFor(() => expect(screen.getByRole("button", { name: /^Edit$/i })).toBeTruthy(), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /^Edit$/i }));
      await pickDifferent(user, findComboNearLabel(document.body, /^Chapter$/i));
      await submitFailing(/^Save$/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial|Rishta|Match/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("tab", { name: /Introductions/i })[0]);
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Accept/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      hardClick(screen.queryAllByRole("tab", { name: /Match/i })[0]);
      hardClick(screen.queryAllByLabelText(/formal Rishta/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) await escapeOpen();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<OralHistory />), { route: "/oral-history/full" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Oral|Histor/i), { timeout: 45_000 });
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-tag`)), {
        timeout: 15_000,
      }).catch(() => undefined);
      const tag = screen.queryByText(`${PREFIX}-tag`) ?? screen.queryByText("heritage");
      if (tag) hardClick(tag);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BannedKeywordsTab />), { route: "/admin?tab=keywords" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Keyword|Blocklist|Banned/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("button", { name: /^Edit$/i })[0]);
      await pickDifferent(user, screen.queryByLabelText(/Severity/i) ?? screen.queryAllByRole("combobox")[0]);
      await submitFailing(/^Save$/i);
      unmount();
    }

    if (seeded.gaMemberId) {
      const { unmount } = renderApp(withToaster(<FamilyInviteDialog memberId={seeded.gaMemberId} />), {
        route: "/profile",
      });
      hardClick(screen.queryAllByRole("button", { name: /Invite|Add|Family/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await openAndPick(user, within(dlg).queryAllByRole("combobox")[1] ?? within(dlg).queryAllByRole("combobox")[0], /\+44/);
        await escapeOpen();
      }
      unmount();
    }
  }, 180_000);

  it("leftover page/admin onError sweep", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    {
      const { unmount } = renderApp(withToaster(<Temple />), { route: "/temple" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Temple|Donate/i), { timeout: 45_000 });
      await submitFailing(/Donate|Submit|Pay/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Mentorship />), { route: "/mentorship/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Mentor/i), { timeout: 45_000 });
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Request Mentorship/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Scholarships />), { route: "/scholarships/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Scholarship/i), { timeout: 45_000 });
      await submitFailing(/Apply|Submit/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<EldersCouncil />), { route: "/elders-council/full" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Elder|Council/i), { timeout: 45_000 });
      await submitFailing(/Nominate|Submit|Save/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<ModeratorDashboard />), { route: "/moderation" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Moderator|Report|Verification/i), {
        timeout: 45_000,
      });
      const restore = forceWritesFail();
      hardClick(screen.queryAllByLabelText(/Downgrade .* verification level/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders />), { route: "/admin?tab=verification" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Verification|Pending/i), { timeout: 45_000 });
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Remind|Approve|Reject/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<RecurringPledgesPanel />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Pledge|Recurring/i), { timeout: 30_000 }).catch(
        () => undefined,
      );
      await submitFailing(/Create|Save|Pause|Cancel/i);
      unmount();
    }

    {
      const { data: anns } = await supabase.from("announcements").select("id, title, body, created_at, chapter_id").limit(8);
      const { unmount } = renderApp(withToaster(<AnnouncementsTab announcements={(anns ?? []) as never} myChapterId={null} />), {
        route: "/admin?tab=announcements",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Announcement/i), { timeout: 30_000 });
      await submitFailing(/Publish|Create|Save/i);
      unmount();
    }

    {
      const { data: tags } = await supabase.from("tag_requests").select("id, term, type, status, reason").limit(20);
      const { unmount } = renderApp(withToaster(<TagRequestsTab tagRequests={(tags ?? []) as never} />), { route: "/admin?tab=tag-requests" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Tag/i), { timeout: 30_000 });
      await submitFailing(/Approve|Reject|Delete/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<SamitiTab />), { route: "/admin?tab=samiti" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Samiti|Committee/i), { timeout: 30_000 });
      await submitFailing(/Save|Create|Add/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BulkContentTab />), { route: "/admin?tab=bulk" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Bulk|Import|Content/i), { timeout: 30_000 });
      hardClick(screen.queryAllByRole("button", { name: /Delete/i })[0]);
      await submitFailing(/Confirm|Delete/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<RolesTab roleAssignments={[] as never} myChapterId={null} />), { route: "/admin?tab=roles" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Role/i), { timeout: 30_000 });
      await submitFailing(/Assign|Revoke|Save/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<ChapterTransfersTab />), { route: "/admin?tab=transfers" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Transfer/i), { timeout: 30_000 }).catch(
        () => undefined,
      );
      await submitFailing(/Approve|Reject|Transfer/i);
      unmount();
    }
  }, 240_000);
});
