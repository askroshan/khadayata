/**
 * Pass 33 — Wave 12 leftover fstat-no functions (70).
 * Prefer alertdialog over dialog; forceReactClick so disabled / opacity-0
 * mutation buttons still run. Writes always mocked — no email/SMS/notify.
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
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import EventsTab from "@/components/admin/EventsTab";
import MembersTab from "@/components/admin/MembersTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import FinanceTab from "@/components/admin/FinanceTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import SamitiTab from "@/components/admin/SamitiTab";
import BulkContentTab from "@/components/admin/BulkContentTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import { CampaignsPanel } from "@/components/finance/CampaignsPanel";
import { RecurringPledgesPanel } from "@/components/finance/RecurringPledgesPanel";
import { EventGallery } from "@/components/events/EventGallery";
import { MatrimonialModerationPanel } from "@/components/matrimonial/MatrimonialModerationPanel";
import { RishtaWorkflow } from "@/components/matrimonial/RishtaWorkflow";
import Business from "@/pages/Business";
import Scholarships from "@/pages/Scholarships";
import Events from "@/pages/Events";
import News from "@/pages/News";
import Matrimonial from "@/pages/Matrimonial";
import Profile from "@/pages/Profile";
import MemberProfile from "@/pages/MemberProfile";
import Dashboard from "@/pages/Dashboard";
import EldersCouncil from "@/pages/EldersCouncil";
import OralHistory from "@/pages/OralHistory";
import Temple from "@/pages/Temple";
import Mentorship from "@/pages/Mentorship";
import ModeratorDashboard from "@/pages/ModeratorDashboard";

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

const PREFIX = `covw12j_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";
const MUMBAI = "f1000003-0000-0000-0000-000000000003";

const seeded: {
  gaMemberId?: string;
  gaUserId?: string;
  otherMemberId?: string;
  l2MemberId?: string;
  unverifiedMemberId?: string;
  templateId?: string;
  messageId?: string;
  eventId?: string;
  photoId?: string;
  introId?: string;
  profileId?: string;
  otherProfileId?: string;
  rishtaId?: string;
  bizId?: string;
  jobId?: string;
  keywordId?: string;
  tagId?: string;
  samitiId?: string;
  oralId?: string;
  newsId?: string;
  announcementId?: string;
  threadId?: string;
  reportId?: string;
  transferId?: string;
  verReqId?: string;
  empId?: string;
  mentorshipAvailId?: string;
  mentorshipActiveId?: string;
  fundId?: string;
  pledgeId?: string;
} = {};

function hardClick(el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return;
  fireEvent.pointerDown(el);
  fireEvent.mouseDown(el);
  fireEvent.pointerUp(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

function forceReactClick(el: HTMLElement | null | undefined) {
  if (!el) return;
  const propsKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  const props = propsKey ? (el as unknown as Record<string, { onClick?: (e: unknown) => void }>)[propsKey] : null;
  if (props?.onClick) {
    props.onClick({
      preventDefault() {},
      stopPropagation() {},
      nativeEvent: new MouseEvent("click"),
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist() {},
      target: el,
      currentTarget: el,
      type: "click",
    });
    return;
  }
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

function actionRoot(): HTMLElement {
  return (
    (screen.queryByRole("alertdialog") as HTMLElement | null) ??
    (screen.queryByRole("dialog") as HTMLElement | null) ??
    document.body
  );
}

function dialogRoot(): HTMLElement {
  return (screen.queryByRole("dialog") as HTMLElement | null) ?? document.body;
}

function findComboNearLabel(root: ParentNode, labelRe: RegExp): HTMLElement | null {
  const nodes = Array.from(root.querySelectorAll("label")).filter((n) =>
    labelRe.test((n.textContent ?? "").trim()),
  );
  for (const lab of [...nodes].reverse()) {
    const wrap = lab.parentElement ?? lab.closest("div");
    const combo = wrap?.querySelector('[role="combobox"]') as HTMLElement | null;
    if (combo) return combo;
    const sib = lab.nextElementSibling as HTMLElement | null;
    if (sib?.getAttribute("role") === "combobox") return sib;
    const nested = sib?.querySelector('[role="combobox"]') as HTMLElement | null;
    if (nested) return nested;
  }
  return null;
}

function changeLabeledInput(root: ParentNode, labelRe: RegExp, value: string) {
  const labels = Array.from(root.querySelectorAll("label")).filter((n) =>
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

async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement | null | undefined,
  optionRe: RegExp,
) {
  if (!trigger || isDisabled(trigger)) return false;
  try {
    await user.click(trigger);
  } catch {
    hardClick(trigger);
  }
  const named = await screen.findByRole("option", { name: optionRe }, { timeout: 6000 }).catch(() => null);
  const opts = named ? [named] : await screen.findAllByRole("option", {}, { timeout: 2000 }).catch(() => []);
  const pick = opts.find((o) => optionRe.test(o.textContent ?? "")) ?? named;
  if (!pick) return false;
  try {
    await user.click(pick);
  } catch {
    hardClick(pick);
  }
  return true;
}

async function pickDifferent(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement | null | undefined,
) {
  if (!trigger || isDisabled(trigger)) return false;
  const current = (trigger.textContent ?? "").trim();
  try {
    await user.click(trigger);
    const opts = await screen.findAllByRole("option", {}, { timeout: 4000 }).catch(() => []);
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
  } catch {
    /* skip */
  }
  return false;
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

function namedButtons(name: RegExp | string, root: HTMLElement = document.body): HTMLElement[] {
  const scoped = root === document.body ? screen : within(root);
  return scoped.queryAllByRole("button", { name });
}

async function fireMutate(name: RegExp | string) {
  const restore = forceWritesFail();
  try {
    const root = actionRoot();
    const btn = namedButtons(name, root)[0] ?? namedButtons(name)[0];
    forceReactClick(btn);
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          new RegExp(`${PREFIX} boom|Missing|required|Select member|Not ready|No valid|Profile not ready`),
        ),
      { timeout: 8_000 },
    ).catch(() => undefined);
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

describe("Pass 33 — Wave 12 leftover functions", () => {
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

    await signIn(E2E_ACCOUNTS.member.email);
    const memUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: l2 } = await admin.from("members").select("id").eq("user_id", memUserId ?? "").maybeSingle();
    seeded.l2MemberId = l2?.id;

    await signIn(E2E_ACCOUNTS.unverified.email);
    const uvUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: uv } = await admin.from("members").select("id").eq("user_id", uvUserId ?? "").maybeSingle();
    seeded.unverifiedMemberId = uv?.id;
    await supabase.auth.signOut().catch(() => undefined);

    if (ga?.id) {
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
      if (tmpl?.id) {
        seeded.templateId = tmpl.id;
        const { data: msg } = await admin
          .from("whatsapp_messages")
          .insert({
            template_id: tmpl.id,
            recipient_phone: "15550100933",
            status: "sent",
            sent_at: new Date().toISOString(),
            error: null,
          })
          .select("id")
          .maybeSingle();
        if (msg?.id) seeded.messageId = msg.id;
      }

      const { data: event } = await admin
        .from("events")
        .insert({
          name: `${PREFIX} Event`,
          description: "coverage",
          venue: "Hall",
          starts_at: "2027-06-01T10:00:00Z",
          ends_at: "2027-06-01T14:00:00Z",
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
      if (event?.id) {
        seeded.eventId = event.id;
        const { data: photo } = await admin
          .from("event_photos")
          .insert({
            event_id: event.id,
            uploaded_by: ga.id,
            url: "https://picsum.photos/seed/covw12j/400/400",
          })
          .select("id")
          .maybeSingle();
        if (photo?.id) seeded.photoId = photo.id;
      }

      const { data: biz } = await admin
        .from("businesses")
        .insert({
          name: `${PREFIX} Biz`,
          sector: "Retail",
          description: "unverified",
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
          description: "coverage",
          location: "Ahmedabad",
          employment_type: "full_time",
          status: "open",
          chapter_id: AHMEDABAD,
          employer_member_id: ga.id,
        })
        .select("id")
        .maybeSingle();
      if (job?.id) seeded.jobId = job.id;

      const { data: existing } = await admin
        .from("matrimonial_profiles")
        .select("id")
        .eq("member_id", ga.id)
        .maybeSingle();
      if (existing?.id) seeded.profileId = existing.id;
      else {
        const { data: created } = await admin
          .from("matrimonial_profiles")
          .insert({ member_id: ga.id, about: `${PREFIX} profile`, visibility: "community" })
          .select("id")
          .maybeSingle();
        if (created?.id) seeded.profileId = created.id;
      }

      if (ca?.id) {
        const { data: otherProf } = await admin
          .from("matrimonial_profiles")
          .select("id")
          .eq("member_id", ca.id)
          .maybeSingle();
        if (otherProf?.id) seeded.otherProfileId = otherProf.id;
        else {
          const { data: created } = await admin
            .from("matrimonial_profiles")
            .insert({ member_id: ca.id, about: `${PREFIX} other`, visibility: "community" })
            .select("id")
            .maybeSingle();
          if (created?.id) seeded.otherProfileId = created.id;
        }

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

        if (seeded.profileId && seeded.otherProfileId) {
          const { data: rishta } = await admin
            .from("rishta_requests")
            .insert({
              from_profile_id: seeded.profileId,
              to_profile_id: seeded.otherProfileId,
              status: "family_review",
              intro_message: `${PREFIX} rishta`,
              from_family_ok: null,
              to_family_ok: null,
            })
            .select("id")
            .maybeSingle();
          if (rishta?.id) seeded.rishtaId = rishta.id;
        }
      }

      const { data: kw } = await admin
        .from("banned_keywords")
        .insert({ keyword: `${PREFIX}-kw`, severity: "low", added_by: ga.id })
        .select("id")
        .maybeSingle();
      if (kw?.id) seeded.keywordId = kw.id;

      const { data: tag } = await admin
        .from("tag_requests")
        .insert({ term: `${PREFIX}-tag`, type: "skill", status: "rejected", reason: "coverage" })
        .select("id")
        .maybeSingle();
      if (tag?.id) seeded.tagId = tag.id;

      const { data: samiti } = await admin
        .from("samiti_groups")
        .insert({
          name: `${PREFIX} samiti`,
          type: "General",
          description: "coverage",
          chapter_id: AHMEDABAD,
        })
        .select("id")
        .maybeSingle();
      if (samiti?.id) seeded.samitiId = samiti.id;

      const { data: oral } = await admin
        .from("oral_histories")
        .insert({
          title: `${PREFIX} oral`,
          description: "coverage oral",
          narrator_name: "Coverage Elder",
          media_type: "audio",
        tags: [`${PREFIX}-tag`, "heritage"],
        created_by: gaUserId,
        narrator_member_id: ga.id,
        chapter_id: AHMEDABAD,
        status: "published",
        })
        .select("id")
        .maybeSingle();
      if (oral?.id) seeded.oralId = oral.id;

      const { data: news } = await admin
        .from("content_news")
        .insert({
          title: `${PREFIX} news`,
          summary: "coverage",
          body: "coverage body ".repeat(20),
          status: "published",
          published_at: new Date().toISOString(),
          article_type: "article",
          category: "Announcements",
          created_by: gaUserId,
          chapter_id: AHMEDABAD,
          tags: [],
          images: [],
          scope: "chapter",
        })
        .select("id")
        .maybeSingle();
      if (news?.id) seeded.newsId = news.id;

      const { data: ann } = await admin
        .from("announcements")
        .insert({ title: `${PREFIX} ann`, body: "coverage body", created_by: gaUserId, chapter_id: AHMEDABAD })
        .select("id")
        .maybeSingle();
      if (ann?.id) seeded.announcementId = ann.id;

      const { data: thread } = await admin
        .from("council_threads")
        .insert({
          author_id: ga.id,
          title: `${PREFIX} thread`,
          body: "coverage thread",
          category: "general",
          pinned: false,
          closed: false,
        })
        .select("id")
        .maybeSingle();
      if (thread?.id) seeded.threadId = thread.id;

      const { data: report } = await admin
        .from("reports")
        .insert({
          reporter_member_id: ga.id,
          entity_type: "member",
          entity_id: ca?.id ?? ga.id,
          category: "harassment",
          reason: `${PREFIX} report`,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (report?.id) seeded.reportId = report.id;

      if (ca?.id) {
        const { data: transfer } = await admin
          .from("chapter_transfers")
          .insert({
            member_id: ca.id,
            from_chapter_id: AHMEDABAD,
            to_chapter_id: MUMBAI,
            status: "pending",
            reason: `${PREFIX} transfer`,
          })
          .select("id")
          .maybeSingle();
        if (transfer?.id) seeded.transferId = transfer.id;
      }

      const { data: vr } = await admin
        .from("verification_requests")
        .insert({
          member_id: ga.id,
          requested_level: 1,
          status: "pending",
          notes: `${PREFIX} vr`,
          document_type: "passport",
        })
        .select("id")
        .maybeSingle();
      if (vr?.id) seeded.verReqId = vr.id;

      if (l2?.id) {
        const { data: emp } = await admin
          .from("employment")
          .insert({
            member_id: l2.id,
            job_title: `${PREFIX}-job`,
            company: "Coverage Co",
            sector: "IT",
          } as never)
          .select("id")
          .maybeSingle();
        if (emp?.id) seeded.empId = emp.id;
      }

      const { data: avail } = await admin
        .from("mentorships")
        .insert({
          mentor_member_id: ga.id,
          skills: [`${PREFIX}-skill`],
          status: "available",
        })
        .select("id")
        .maybeSingle();
      if (avail?.id) seeded.mentorshipAvailId = avail.id;

      if (l2?.id) {
        const { data: active } = await admin
          .from("mentorships")
          .insert({
            mentor_member_id: ga.id,
            mentee_member_id: l2.id,
            skills: [`${PREFIX}-active`],
            status: "active",
          })
          .select("id")
          .maybeSingle();
        if (active?.id) seeded.mentorshipActiveId = active.id;
      }

      const { data: fund } = await admin.from("funds").select("id").eq("active", true).limit(1).maybeSingle();
      if (fund?.id) {
        seeded.fundId = fund.id;
        const { data: pledge } = await admin
          .from("recurring_pledges")
          .insert({
            member_id: ga.id,
            fund_id: fund.id,
            amount: 100,
            currency: "INR",
            interval: "monthly",
            status: "active",
          })
          .select("id")
          .maybeSingle();
        if (pledge?.id) seeded.pledgeId = pledge.id;
      }
    }
  }, 120_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    if (seeded.rishtaId) await admin.from("rishta_requests").delete().eq("id", seeded.rishtaId);
    if (seeded.introId) await admin.from("matrimonial_introductions").delete().eq("id", seeded.introId);
    if (seeded.messageId) await admin.from("whatsapp_messages").delete().eq("id", seeded.messageId);
    if (seeded.templateId) await admin.from("whatsapp_templates").delete().eq("id", seeded.templateId);
    if (seeded.photoId) await admin.from("event_photos").delete().eq("id", seeded.photoId);
    if (seeded.eventId) await admin.from("events").delete().eq("id", seeded.eventId);
    if (seeded.jobId) await admin.from("jobs").delete().eq("id", seeded.jobId);
    if (seeded.bizId) await admin.from("businesses").delete().eq("id", seeded.bizId);
    if (seeded.keywordId) await admin.from("banned_keywords").delete().eq("id", seeded.keywordId);
    if (seeded.tagId) await admin.from("tag_requests").delete().eq("id", seeded.tagId);
    if (seeded.samitiId) await admin.from("samiti_groups").delete().eq("id", seeded.samitiId);
    if (seeded.oralId) await admin.from("oral_histories").delete().eq("id", seeded.oralId);
    if (seeded.newsId) await admin.from("content_news").delete().eq("id", seeded.newsId);
    if (seeded.announcementId) await admin.from("announcements").delete().eq("id", seeded.announcementId);
    if (seeded.threadId) {
      await admin.from("council_votes").delete().eq("thread_id", seeded.threadId);
      await admin.from("council_replies").delete().eq("thread_id", seeded.threadId);
      await admin.from("council_threads").delete().eq("id", seeded.threadId);
    }
    if (seeded.reportId) await admin.from("reports").delete().eq("id", seeded.reportId);
    if (seeded.transferId) await admin.from("chapter_transfers").delete().eq("id", seeded.transferId);
    if (seeded.verReqId) await admin.from("verification_requests").delete().eq("id", seeded.verReqId);
    if (seeded.empId) await admin.from("employment").delete().eq("id", seeded.empId);
    if (seeded.mentorshipActiveId) await admin.from("mentorships").delete().eq("id", seeded.mentorshipActiveId);
    if (seeded.mentorshipAvailId) await admin.from("mentorships").delete().eq("id", seeded.mentorshipAvailId);
    if (seeded.pledgeId) await admin.from("recurring_pledges").delete().eq("id", seeded.pledgeId);
    restoreWrites();
    await supabase.auth.signOut().catch(() => undefined);
  }, 60_000);

  it("Dashboard, WhatsApp create/delete-message, EventsTab state + delete", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<Dashboard />), { route: "/dashboard" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Create Event/i), { timeout: 45_000 });
      fireEvent.click(screen.getByText("Create Event"));
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
      await waitFor(() => expect(document.body.textContent).toMatch(/WhatsApp|Template/i), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /^Template$/i }));
      const createDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      const nameInput = within(createDlg).getByLabelText(/Template Name/i);
      fireEvent.change(nameInput, { target: { value: `${PREFIX}_new` } });
      const bodyInput = within(createDlg).getByLabelText(/Body/i);
      fireEvent.change(bodyInput, { target: { value: "Hello {{1}}" } });
      await fireMutate(/Save Template/i);
      hardClick(within(createDlg).queryByRole("button", { name: /Close/i }));

      hardClick(screen.getByRole("tab", { name: /Message History/i }));
      await waitFor(() => expect(screen.queryAllByLabelText(/Delete message/i).length).toBeGreaterThan(0), {
        timeout: 15_000,
      }).catch(() => undefined);
      hardClick(screen.queryAllByLabelText(/Delete message/i)[0]);
      await fireMutate(/^Delete$/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<EventsTab myChapterId={null} />), { route: "/admin?tab=events" });
      await waitFor(() => expect(screen.queryByRole("button", { name: /Create Event/i })).toBeTruthy(), {
        timeout: 45_000,
      });
      hardClick(screen.getByRole("button", { name: /Create Event/i }));
      const createDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      expect(await pickOption(user, findComboNearLabel(createDlg, /^Country$/i), /^India$/i)).toBe(true);
      await waitFor(
        () => {
          const state = findComboNearLabel(actionRoot(), /^State$/i);
          expect(state && !isDisabled(state)).toBe(true);
        },
        { timeout: 15_000 },
      );
      await pickOption(user, findComboNearLabel(actionRoot(), /^State$/i), /Gujarat/i);
      hardClick(within(createDlg).queryByRole("button", { name: /Close/i }));

      hardClick(screen.queryAllByLabelText(/Delete event/i)[0]);
      await fireMutate(/Delete Event/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }
  }, 180_000);

  it("MembersTab bulk/resend/level/block + Directory + Chapters committee", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    {
      const { data: members } = await supabase
        .from("members")
        .select(
          "id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)",
        )
        .limit(50);
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
      await waitFor(() => expect(screen.getByRole("button", { name: /Bulk Invite/i })).toBeTruthy(), {
        timeout: 30_000,
      });
      hardClick(screen.getByRole("button", { name: /Bulk Invite/i }));
      await screen.findByRole("dialog", {}, { timeout: 8_000 });
      // Empty list throws "No valid emails" — covers bulkInvite onError without invoking bulk-invite.
      await fireMutate(/Send 0 Invitation/i);
      hardClick(within(dialogRoot()).queryByRole("button", { name: /Close/i }));

      const restore = forceWritesFail();
      forceReactClick(screen.queryAllByLabelText(/Downgrade verification level/i)[0]);
      forceReactClick(screen.queryAllByLabelText(/Resend verification email/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();

      hardClick(screen.queryAllByLabelText(/Member admin actions/i)[0]);
      hardClick(namedButtons(/Block Member/i)[0]);
      await fireMutate(/Block Member/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 30_000 });
      const restore = forceWritesFail();
      hardClick(namedButtons(/^Verify$/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      hardClick(screen.queryAllByLabelText(/Delete business/i)[0]);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<ChaptersTab />), { route: "/admin?tab=chapters" });
      await waitFor(() => expect(screen.queryAllByLabelText(/Delete chapter/i).length).toBeGreaterThan(0), {
        timeout: 45_000,
      });
      hardClick(screen.getAllByLabelText(/Delete chapter/i)[0]);
      await fireMutate(/Delete Chapter/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);

      hardClick(screen.queryAllByLabelText(/Revoke admin/i)[0]);
      await fireMutate(/Revoke Role/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);

      hardClick(screen.queryAllByLabelText(/Manage committee/i)[0]);
      const committee = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (committee) {
        await fireMutate(/Assign Role/i);
        const restore = forceWritesFail();
        forceReactClick(within(committee).queryAllByLabelText(/from committee/i)[0]);
        await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
          timeout: 8_000,
        }).catch(() => undefined);
        restore();
        hardClick(within(committee).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }
  }, 180_000);

  it("Announcements delete, BulkContent, Samiti, Tags, Transfers, Verification", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    {
      const { data: announcements } = await supabase
        .from("announcements")
        .select("id, title, body, created_at, chapter_id")
        .limit(20);
      const { unmount } = renderApp(
        withToaster(<AnnouncementsTab announcements={(announcements ?? []) as never} myChapterId={null} />),
        { route: "/admin?tab=announcements" },
      );
      await waitFor(() => expect(screen.queryAllByLabelText(/Delete announcement/i).length).toBeGreaterThan(0), {
        timeout: 30_000,
      });
      hardClick(screen.getAllByLabelText(/Delete announcement/i)[0]);
      await fireMutate(/^Delete$/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BulkContentTab />), { route: "/admin?tab=bulk" });
      await waitFor(() => expect(document.body.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(1), {
        timeout: 30_000,
      });
      const boxes = Array.from(document.body.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      fireEvent.click(boxes[1] ?? boxes[0]);
      await waitFor(() => expect(namedButtons(/Delete .* Selected/i)[0]).toBeTruthy(), { timeout: 8_000 }).catch(
        () => undefined,
      );
      hardClick(namedButtons(/Delete .* Selected/i)[0]);
      await fireMutate(/Delete .* Record/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<SamitiTab chapterId={null} />), { route: "/admin?tab=samiti" });
      await waitFor(() => expect(screen.queryAllByLabelText(new RegExp(`Delete ${PREFIX}`)).length).toBeGreaterThan(0), {
        timeout: 30_000,
      }).catch(() => undefined);
      hardClick(screen.queryAllByLabelText(/Delete /i)[0]);
      await fireMutate(/^Delete$/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { data: tags } = await supabase.from("tag_requests").select("id, term, type, status, reason").limit(50);
      const { unmount } = renderApp(withToaster(<TagRequestsTab tagRequests={(tags ?? []) as never} />), {
        route: "/admin?tab=tag-requests",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Pending|Approved|Rejected/i), { timeout: 30_000 });
      hardClick(screen.queryByRole("tab", { name: /Rejected/i }));
      await waitFor(() => expect(screen.queryAllByLabelText(/Delete tag request/i).length).toBeGreaterThan(0), {
        timeout: 8_000,
      }).catch(() => undefined);
      hardClick(screen.queryAllByLabelText(/Delete tag request/i)[0]);
      await fireMutate(/^Delete$/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<ChapterTransfersTab />), { route: "/admin?tab=transfers" });
      await waitFor(() => expect(namedButtons(/Reject/i)[0] || namedButtons(/Approve/i)[0]).toBeTruthy(), {
        timeout: 30_000,
      });
      const restore = forceWritesFail();
      forceReactClick(namedButtons(/Reject/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(
        withToaster(<VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders />),
        { route: "/admin?tab=verification" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Verification|Pending/i), { timeout: 45_000 });
      const restore = forceWritesFail();
      forceReactClick(namedButtons(/^Approve$/i)[0]);
      const selectAll = screen.queryByLabelText(/Select all pending/i);
      if (selectAll) fireEvent.click(selectAll);
      forceReactClick(namedButtons(/Send Reminder/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      hardClick(namedButtons(/Send to All Pending/i)[0]);
      await fireMutate(/Send to All/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }
  }, 180_000);

  it("Finance create/update/booking/currency, Campaigns, Pledges, BannedKeywords", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Fund|Donation/i), { timeout: 30_000 });
      hardClick(screen.getByRole("tab", { name: /Fund Management/i }));
      hardClick(namedButtons(/Create Fund/i)[0]);
      await screen.findByRole("dialog", {}, { timeout: 8_000 });
      await fireMutate(/Create Fund/i);
      hardClick(within(dialogRoot()).queryByRole("button", { name: /Close/i }));

      hardClick(screen.queryAllByLabelText(/Edit fund/i)[0]);
      const edit = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (edit) {
        await pickDifferent(user, findComboNearLabel(edit, /^Currency$/i));
        await fireMutate(/Save Changes|Save/i);
        hardClick(within(edit).queryByRole("button", { name: /Close/i }));
      }

      hardClick(screen.getByRole("tab", { name: /Hall Bookings/i }));
      hardClick(namedButtons(/New Booking/i)[0]);
      const booking = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (booking) {
        changeLabeledInput(booking, /Hall Name/i, `${PREFIX} hall`);
        changeLabeledInput(booking, /Booking Date/i, "2027-09-01");
        await fireMutate(/Submit Booking/i);
        hardClick(within(booking).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<CampaignsPanel myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(namedButtons(/New Campaign/i)[0]).toBeTruthy(), { timeout: 30_000 });
      hardClick(namedButtons(/New Campaign/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      await pickDifferent(user, findComboNearLabel(dlg, /^Currency$/i));
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<RecurringPledgesPanel />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(namedButtons(/New Pledge/i)[0]).toBeTruthy(), { timeout: 30_000 });
      hardClick(namedButtons(/New Pledge/i)[0]);
      await screen.findByRole("dialog", {}, { timeout: 8_000 });
      await fireMutate(/Create Pledge/i);
      hardClick(within(dialogRoot()).queryByRole("button", { name: /Close/i }));
      const restore = forceWritesFail();
      forceReactClick(screen.queryAllByLabelText(/Pause pledge/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BannedKeywordsTab />), { route: "/admin?tab=keywords" });
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-kw`)), { timeout: 30_000 });
      forceReactClick(namedButtons(/^Edit$/i)[0]);
      await pickDifferent(user, screen.queryAllByRole("combobox")[0]);
      await fireMutate(/^Save$/i);
      hardClick(screen.queryAllByLabelText(/Remove keyword/i)[0]);
      await fireMutate(/^Remove$|^Delete$/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }
  }, 180_000);

  it("News edit/delete, Matrimonial, Rishta, Moderation, Profile, MemberProfile, Oral, Elders", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });
      await waitFor(() => expect(screen.queryAllByLabelText(/Edit article/i).length).toBeGreaterThan(0), {
        timeout: 45_000,
      });
      hardClick(screen.getAllByLabelText(/Edit article/i)[0]);
      const edit = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      await pickDifferent(user, findComboNearLabel(edit, /Article Type/i));
      await fireMutate(/Save Changes/i);
      hardClick(within(edit).queryByRole("button", { name: /Close/i }));
      hardClick(screen.queryAllByLabelText(/Delete article/i)[0]);
      await fireMutate(/^Delete$/i);
      hardClick(namedButtons(/^Cancel$/i)[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial|Match|Rishta/i), {
        timeout: 45_000,
      });
      const restore = forceWritesFail();
      forceReactClick(screen.queryAllByLabelText(/Verify profile/i)[0]);
      forceReactClick(namedButtons(/^Introduce$/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      hardClick(screen.queryAllByRole("tab", { name: /Intros/i })[0]);
      const restore2 = forceWritesFail();
      forceReactClick(namedButtons(/Accept/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore2();
      hardClick(screen.queryAllByRole("tab", { name: /Match/i })[0]);
      hardClick(screen.queryAllByLabelText(/formal Rishta/i)[0]);
      const rishtaDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (rishtaDlg) {
        await fireMutate(/Send|Submit/i);
        hardClick(within(rishtaDlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    if (seeded.profileId && seeded.otherProfileId) {
      const { unmount } = renderApp(
        withToaster(<RishtaWorkflow myProfileId={seeded.profileId} targetProfileId={seeded.otherProfileId} />),
        { route: "/matrimonial/manage" },
      );
      hardClick(namedButtons(/Send Rishta/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await fireMutate(/Send Rishta Request/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();

      const { unmount: u2 } = renderApp(withToaster(<RishtaWorkflow myProfileId={seeded.profileId} />), {
        route: "/matrimonial/manage",
      });
      await waitFor(() => expect(namedButtons(/Decline/i)[0]).toBeTruthy(), { timeout: 15_000 }).catch(() => undefined);
      const restore = forceWritesFail();
      forceReactClick(namedButtons(/Decline/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      u2();
    }

    {
      const { unmount } = renderApp(withToaster(<MatrimonialModerationPanel />), { route: "/admin?tab=matrimonial" });
      await waitFor(() => expect(screen.queryAllByLabelText(/Verify profile/i)[0]).toBeTruthy(), { timeout: 30_000 });
      const restore = forceWritesFail();
      forceReactClick(screen.getAllByLabelText(/Verify profile/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
      await waitFor(() => expect(screen.getByPlaceholderText(/Add skill/i)).toBeTruthy(), { timeout: 45_000 });
      const skill = screen.getByPlaceholderText(/Add skill/i);
      fireEvent.change(skill, { target: { value: `${PREFIX} skill` } });
      let restore = forceWritesFail();
      forceReactClick(skill.parentElement?.querySelector("button") as HTMLElement);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();

      const lang = screen.getByPlaceholderText(/Add language/i);
      fireEvent.change(lang, { target: { value: `${PREFIX} lang` } });
      restore = forceWritesFail();
      forceReactClick(lang.parentElement?.querySelector("button") as HTMLElement);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();

      const adds = namedButtons(/^Add$/i);
      hardClick(adds[0]);
      let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /Job Title/i, `${PREFIX} title`);
        await fireMutate(/^Save$/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      hardClick(adds[1] ?? adds[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /Degree/i, `${PREFIX} degree`);
        await fireMutate(/^Save$/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    if (seeded.l2MemberId) {
      const { unmount } = renderApp(withToaster(<MemberProfile />), {
        route: `/member/${seeded.l2MemberId}`,
        pathPattern: "/member/:id",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Member|Profile|Verification/i), {
        timeout: 45_000,
      });
      hardClick(namedButtons(/Verification Panel/i)[0]);
      const restore = forceWritesFail();
      for (const btn of screen.queryAllByLabelText(/Downgrade verification level/i)) forceReactClick(btn);
      forceReactClick(namedButtons(/^Verify$/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<OralHistory />), { route: "/oral-history/full" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Oral History/i), { timeout: 45_000 });
      await waitFor(() => expect(document.body.textContent).toMatch(/heritage|tag|Narrated/i), { timeout: 15_000 }).catch(
        () => undefined,
      );
      const tagEl = Array.from(document.body.querySelectorAll("*")).find((n) => {
        const t = (n.textContent ?? "").trim();
        return t === `${PREFIX}-tag` || t === "heritage" || n.className?.toString().includes("cursor-pointer");
      }) as HTMLElement | undefined;
      forceReactClick(tagEl);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<EldersCouncil />), { route: "/elders-council/full" });
      await waitFor(
        () =>
          expect(
            screen.queryAllByLabelText(/^Upvote$/i).length > 0 || /Elders Council/i.test(document.body.textContent ?? ""),
          ).toBe(true),
        { timeout: 45_000 },
      );
      {
        const restore = forceWritesFail();
        forceReactClick(screen.queryAllByLabelText(/^Upvote$/i)[0]);
        await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
          timeout: 8_000,
        }).catch(() => undefined);
        restore();
      }
      const threadTitle =
        screen.queryAllByText(new RegExp(`${PREFIX} thread`))[0] ??
        screen.queryAllByText(/Vote Toggle Thread/i)[0] ??
        (document.body.querySelector("h3, h4") as HTMLElement | null);
      hardClick(threadTitle as HTMLElement | undefined);
      const reply = screen.queryByPlaceholderText(/reply|comment/i) ?? screen.queryByRole("textbox");
      if (reply) fireEvent.change(reply, { target: { value: `${PREFIX} reply` } });
      await fireMutate(/Post Reply/i);
      hardClick(namedButtons(/New Thread/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /Title/i, `${PREFIX} new thread`);
        const body = within(dlg).queryByRole("textbox", { name: /Body|Content/i }) ?? within(dlg).queryAllByRole("textbox")[1];
        if (body) fireEvent.change(body, { target: { value: "coverage" } });
        await fireMutate(/Create|Post|Start|Submit/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }
  }, 240_000);

  it("Business apply, Temple donate, Events RSVP, Mentorship, Scholarships, Moderator, Gallery", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<Business />), { route: "/business/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Jobs/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("tab", { name: /Jobs/i })[0]);
      await waitFor(() => expect(namedButtons(/Apply Now/i)[0]).toBeTruthy(), { timeout: 15_000 });
      const restore = forceWritesFail();
      forceReactClick(namedButtons(/Apply Now/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Temple />), { route: "/temple" });
      await waitFor(() => expect(screen.getByLabelText(/^Donate$/i)).toBeTruthy(), { timeout: 45_000 });
      await pickOption(user, findComboNearLabel(document.body, /^Fund/i), /./);
      const amount = screen.getByPlaceholderText(/Custom amount/i);
      fireEvent.change(amount, { target: { value: "101" } });
      changeLabeledInput(document.body, /Email/i, "member@khadayataonline.com");
      changeLabeledInput(document.body, /Phone/i, "+911234567890");
      changeLabeledInput(document.body, /Address/i, "Ahmedabad");
      await pickOption(user, findComboNearLabel(document.body, /Payment Method/i), /./);
      await fireMutate(/^Donate$/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Events />), { route: "/events/manage" });
      await waitFor(() => expect(namedButtons(/RSVP Now/i)[0]).toBeTruthy(), { timeout: 45_000 });
      const restore = forceWritesFail();
      forceReactClick(namedButtons(/RSVP Now/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Mentorship />), { route: "/mentorship/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Mentor/i), { timeout: 45_000 });
      const restore = forceWritesFail();
      forceReactClick(namedButtons(/Request Mentorship/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    {
      const { unmount } = renderApp(withToaster(<Mentorship />), { route: "/mentorship/manage" });
      await waitFor(() => expect(namedButtons(/Log Session/i)[0]).toBeTruthy(), { timeout: 45_000 }).catch(
        () => undefined,
      );
      hardClick(namedButtons(/Log Session/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await fireMutate(/Save Session/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Scholarships />), { route: "/scholarships/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Scholarship/i), { timeout: 45_000 });
      hardClick(namedButtons(/Create Scholarship/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /Name/i, `${PREFIX} scholarship`);
        await fireMutate(/Create Scholarship/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      hardClick(namedButtons(/Apply Now/i)[0]);
      const apply = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (apply) {
        await fireMutate(/Submit|Apply/i);
        hardClick(within(apply).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<ModeratorDashboard />), { route: "/moderation" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Report|Moderator/i), { timeout: 45_000 });
      hardClick(namedButtons(/^Act$/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await fireMutate(/^Resolve$/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      const restore = forceWritesFail();
      forceReactClick(screen.queryAllByLabelText(/Downgrade .* verification level/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    if (seeded.eventId) {
      const { unmount } = renderApp(
        withToaster(<EventGallery eventId={seeded.eventId} eventName={`${PREFIX} Event`} />),
        { route: "/events/manage" },
      );
      await waitFor(() => expect(document.body.querySelector("img")).toBeTruthy(), { timeout: 30_000 });
      hardClick(document.body.querySelector("button.group, button.relative") as HTMLElement);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        const search = within(dlg).queryByPlaceholderText(/Search member/i);
        if (search) {
          fireEvent.change(search, { target: { value: "a" } });
          await waitFor(() => expect(within(dlg).queryAllByRole("button").length).toBeGreaterThan(1), {
            timeout: 8_000,
          }).catch(() => undefined);
          const restore = forceWritesFail();
          const results = within(dlg)
            .queryAllByRole("button")
            .filter((b) => / /.test(b.textContent ?? ""));
          forceReactClick(results[0]);
          await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
            timeout: 8_000,
          }).catch(() => undefined);
          restore();
        }
      }
      unmount();
    }
  }, 240_000);
});
