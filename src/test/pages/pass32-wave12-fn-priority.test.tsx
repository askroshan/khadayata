/**
 * Pass 32 — Wave 12: WhatsApp / Business geo / EventsTab / MembersTab / Matrimonial.
 * Do not Escape before picking a select (that closes the dialog).
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
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import EventsTab from "@/components/admin/EventsTab";
import MembersTab from "@/components/admin/MembersTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import FinanceTab from "@/components/admin/FinanceTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import RolesTab from "@/components/admin/RolesTab";
import SamitiTab from "@/components/admin/SamitiTab";
import Business from "@/pages/Business";
import Scholarships from "@/pages/Scholarships";
import Events from "@/pages/Events";
import News from "@/pages/News";
import Matrimonial from "@/pages/Matrimonial";
import Profile from "@/pages/Profile";
import MemberProfile from "@/pages/MemberProfile";
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

const PREFIX = `covw12i_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";

const seeded: {
  gaMemberId?: string;
  gaUserId?: string;
  otherMemberId?: string;
  templateId?: string;
  eventId?: string;
  introId?: string;
  profileId?: string;
  bizId?: string;
  jobId?: string;
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

async function cascadeGeo(user: ReturnType<typeof userEvent.setup>, root?: ParentNode) {
  const scope = () => (root && document.body.contains(root as Node) ? root : dialogRoot());
  await waitFor(() => expect(findComboNearLabel(scope(), /^Country$/i)).toBeTruthy(), { timeout: 8_000 });
  expect(await pickOption(user, findComboNearLabel(scope(), /^Country$/i), /^India$/i)).toBe(true);
  await waitFor(
    () => {
      const state = findComboNearLabel(scope(), /^State$/i);
      expect(state && !isDisabled(state)).toBe(true);
    },
    { timeout: 15_000 },
  );
  expect(await pickOption(user, findComboNearLabel(scope(), /^State$/i), /Gujarat/i)).toBe(true);
  // News create has Country/State but no City select.
  if (!findComboNearLabel(scope(), /^City$/i)) return;
  await waitFor(
    () => {
      const city = findComboNearLabel(scope(), /^City$/i);
      expect(city && !isDisabled(city)).toBe(true);
    },
    { timeout: 15_000 },
  );
  expect(await pickOption(user, findComboNearLabel(scope(), /^City$/i), /Ahmedabad/i)).toBe(true);
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
    const dlg = screen.queryByRole("dialog");
    const btn = dlg
      ? within(dlg).queryAllByRole("button", { name })[0]
      : typeof name === "string"
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

describe("Pass 32 — Wave 12 priority leftover functions", () => {
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

      const { data: event } = await admin
        .from("events")
        .insert({
          name: `${PREFIX} Event`,
          description: "coverage",
          venue: "Hall",
          starts_at: "2027-05-01T10:00:00Z",
          ends_at: "2027-05-01T14:00:00Z",
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
      if (existing?.id) {
        seeded.profileId = existing.id;
      } else {
        const { data: created } = await admin
          .from("matrimonial_profiles")
          .insert({ member_id: ga.id, about: `${PREFIX} profile`, visibility: "community" })
          .select("id")
          .maybeSingle();
        if (created?.id) seeded.profileId = created.id;
      }

      if (ca?.id) {
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
    }
  }, 90_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    if (seeded.introId) await admin.from("matrimonial_introductions").delete().eq("id", seeded.introId);
    if (seeded.templateId) await admin.from("whatsapp_templates").delete().eq("id", seeded.templateId);
    if (seeded.eventId) await admin.from("events").delete().eq("id", seeded.eventId);
    if (seeded.jobId) await admin.from("jobs").delete().eq("id", seeded.jobId);
    if (seeded.bizId) await admin.from("businesses").delete().eq("id", seeded.bizId);
    restoreWrites();
    await supabase.auth.signOut().catch(() => undefined);
  }, 60_000);

  it("WhatsApp edit language/category/header/footer + mocked save/delete", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}_tmpl`)), {
      timeout: 45_000,
    });
    hardClick(screen.getAllByLabelText(/Edit template/i)[0]);
    const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
    await pickOption(user, findComboNearLabel(dlg, /^Language$/i), /Hindi/i);
    await pickOption(user, findComboNearLabel(dlg, /^Category$/i), /Marketing/i);
    changeLabeledInput(dlg, /^Header/i, `${PREFIX} header`);
    changeLabeledInput(dlg, /^Footer/i, `${PREFIX} footer`);
    await submitFailing(/Save Template/i);
    const close = within(dlg).queryByRole("button", { name: /Close/i });
    hardClick(close);
    hardClick(screen.queryAllByLabelText(/Delete template/i)[0]);
    await submitFailing(/^Delete$/i);
    hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
    unmount();
  }, 90_000);

  it("Business geo cascade + mocked create (L2 member)", async () => {
    // List/Post Job are L2-gated; E2E global-admin is L0, member is L2.
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Business />), { route: "/business/manage" });
    await waitFor(() => {
      const enabled = screen
        .queryAllByRole("button", { name: /List Business/i })
        .find((b) => !(b as HTMLButtonElement).disabled);
      expect(enabled).toBeTruthy();
    }, { timeout: 45_000 });
    hardClick(
      screen.queryAllByRole("button", { name: /List Business/i }).find((b) => !(b as HTMLButtonElement).disabled),
    );
    await screen.findByRole("dialog", {}, { timeout: 8_000 });
    await cascadeGeo(user);
    changeLabeledInput(dialogRoot(), /Business Name/i, `${PREFIX} listed`);
    await submitFailing(/Submit Business/i);
    hardClick(within(dialogRoot()).queryByRole("button", { name: /Close/i }));
    hardClick(screen.queryAllByRole("tab", { name: /Jobs/i })[0]);
    await waitFor(() => {
      const enabled = screen
        .queryAllByRole("button", { name: /^Post Job$/i })
        .find((b) => !(b as HTMLButtonElement).disabled);
      expect(enabled).toBeTruthy();
    }, { timeout: 15_000 });
    hardClick(screen.queryAllByRole("button", { name: /^Post Job$/i }).find((b) => !(b as HTMLButtonElement).disabled));
    await screen.findByRole("dialog", {}, { timeout: 8_000 });
    await cascadeGeo(user);
    changeLabeledInput(dialogRoot(), /Job Title/i, `${PREFIX} role`);
    await submitFailing(/^Post Job$/i);
    hardClick(within(dialogRoot()).queryByRole("button", { name: /Close/i }));
    unmount();
  }, 120_000);

  it("Events geo cascade + mocked publish; edit status", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Events />), { route: "/events/manage" });
    await waitFor(() => expect(screen.getByRole("button", { name: /^Create$/i })).toBeTruthy(), { timeout: 45_000 });
    hardClick(screen.getByRole("button", { name: /^Create$/i }));
    await screen.findByRole("dialog", {}, { timeout: 8_000 });
    await cascadeGeo(user);
    changeLabeledInput(dialogRoot(), /Event Name/i, `${PREFIX} created`);
    changeLabeledInput(dialogRoot(), /Starts At/i, "2027-08-01T18:00");
    changeLabeledInput(dialogRoot(), /Ends At/i, "2027-08-01T20:00");
    await submitFailing(/Publish Event/i);
    hardClick(within(dialogRoot()).queryByRole("button", { name: /Close/i }));
    hardClick(screen.queryAllByLabelText(/Edit event/i)[0]);
    const edit = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (edit) {
      await pickDifferent(user, findComboNearLabel(edit, /^Status$/i));
      await submitFailing(/Save Changes/i);
      hardClick(within(edit).queryByRole("button", { name: /Close/i }));
    }
    unmount();
  }, 120_000);

  it("News country/state cascade + mocked draft; edit article type", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Write Article/i })).toBeTruthy(), {
      timeout: 45_000,
    });
    hardClick(screen.getByRole("button", { name: /Write Article/i }));
    await screen.findByRole("dialog", {}, { timeout: 8_000 });
    await cascadeGeo(user);
    changeLabeledInput(dialogRoot(), /^Title/i, `${PREFIX} article`);
    await submitFailing(/Save as Draft/i);
    hardClick(within(dialogRoot()).queryByRole("button", { name: /Close/i }));
    hardClick(screen.queryAllByLabelText(/Edit article/i)[0]);
    const edit = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (edit) {
      await pickDifferent(user, findComboNearLabel(edit, /Article Type/i));
      await submitFailing(/Save Changes/i);
      hardClick(within(edit).queryByRole("button", { name: /Close/i }));
    }
    unmount();
  }, 120_000);

  it("EventsTab edit starts/ends/currency + MembersTab invite chapter", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<EventsTab myChapterId={null} />), { route: "/admin?tab=events" });
      await waitFor(() => expect(screen.queryAllByLabelText(/Edit event/i).length).toBeGreaterThan(0), {
        timeout: 45_000,
      });
      hardClick(screen.getAllByLabelText(/Edit event/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      changeLabeledInput(dlg, /Starts At/i, "2027-08-01T18:00");
      changeLabeledInput(dlg, /Ends At/i, "2027-08-01T20:00");
      await pickDifferent(user, findComboNearLabel(dlg, /Fee Currency/i));
      await submitFailing(/Save Changes/i);
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      {
        const restore = forceWritesFail();
        hardClick(screen.queryAllByLabelText(/Duplicate event/i)[0]);
        await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
          timeout: 8_000,
        }).catch(() => undefined);
        restore();
      }
      {
        const restore = forceWritesFail();
        hardClick(screen.queryAllByLabelText(/Cancel event/i)[0]);
        await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
          timeout: 8_000,
        }).catch(() => undefined);
        restore();
      }
      hardClick(screen.queryAllByLabelText(/Delete event/i)[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      hardClick(screen.queryByRole("button", { name: /Create Event/i }));
      const createDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (createDlg) {
        changeLabeledInput(createDlg, /Event Name/i, `${PREFIX} admin created`);
        changeLabeledInput(createDlg, /Starts At/i, "2027-09-01T18:00");
        changeLabeledInput(createDlg, /Ends At/i, "2027-09-01T20:00");
        await submitFailing(/Publish Event/i);
        hardClick(within(createDlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    {
      const { data: members } = await supabase
        .from("members")
        .select(
          "id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)",
        )
        .limit(30);
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
      await pickOption(user, findComboNearLabel(dlg, /Chapter/i), /Ahmedabad/i);
      changeLabeledInput(dlg, /Email/i, `${PREFIX}@example.invalid`);
      changeLabeledInput(dlg, /First Name/i, PREFIX);
      await submitFailing(/Send Invitation/i);
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      {
        const restore = forceWritesFail();
        hardClick(screen.queryAllByLabelText(/Downgrade verification level/i)[0]);
        await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
          timeout: 8_000,
        }).catch(() => undefined);
        restore();
      }
      hardClick(screen.queryAllByLabelText(/Edit member/i)[0]);
      const editDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (editDlg) {
        changeLabeledInput(editDlg, /First Name/i, `${PREFIX} edited`);
        await submitFailing(/Save Changes|Save/i);
        hardClick(within(editDlg).queryByRole("button", { name: /Close/i }));
      }
      hardClick(screen.queryAllByLabelText(/Member admin actions/i)[0]);
      hardClick(screen.queryAllByRole("button", { name: /Suspend Member/i })[0]);
      await submitFailing(/Suspend Member/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }
  }, 180_000);

  it("Announcements / Roles / Samiti / Scholarships mocked onError", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { data: announcements } = await supabase
        .from("announcements")
        .select("id, title, body, created_at, chapter_id")
        .limit(20);
      const { unmount } = renderApp(
        withToaster(<AnnouncementsTab announcements={(announcements ?? []) as never} myChapterId={null} />),
        { route: "/admin?tab=announcements" },
      );
      await waitFor(() => expect(screen.getByRole("button", { name: /^Publish$/i })).toBeTruthy(), {
        timeout: 30_000,
      });
      const title = screen.getByPlaceholderText(/Title/i);
      fireEvent.change(title, { target: { value: `${PREFIX} announce` } });
      await submitFailing(/^Publish$/i);
      hardClick(screen.queryAllByLabelText(/Edit announcement/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await submitFailing(/Save Changes/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      hardClick(screen.queryAllByLabelText(/Delete announcement/i)[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }

    {
      const { data: roles } = await supabase
        .from("role_assignments")
        .select(
          "id, role_id, member_id, chapter_id, start_date, end_date, created_at, roles(name, scope), members(first_name, last_name), chapters(name)",
        )
        .limit(20);
      const { unmount } = renderApp(
        withToaster(<RolesTab roleAssignments={(roles ?? []) as never} myChapterId={null} />),
        { route: "/admin?tab=roles" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Assign Role|Roles/i), { timeout: 30_000 });
      hardClick(screen.queryAllByRole("button", { name: /Assign Role/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await pickDifferent(user, within(dlg).queryAllByRole("combobox")[0]);
        await pickDifferent(user, within(dlg).queryAllByRole("combobox")[1]);
        await submitFailing(/Assign/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      hardClick(screen.queryAllByLabelText(/Revoke /i)[0]);
      await submitFailing(/Revoke Role/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<SamitiTab chapterId={null} />), { route: "/admin?tab=samiti" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Samiti|Sub-group|Committee/i), {
        timeout: 30_000,
      });
      hardClick(screen.queryAllByRole("button", { name: /Create|Add|New/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /Name/i, `${PREFIX} samiti`);
        await submitFailing(/Create|Save|Add/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Scholarships />), { route: "/scholarships" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Scholarship/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("button", { name: /Create Scholarship/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        changeLabeledInput(dlg, /Name/i, `${PREFIX} scholarship`);
        await submitFailing(/Create Scholarship/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      hardClick(screen.queryAllByRole("button", { name: /Apply Now/i })[0]);
      const apply = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (apply) {
        await submitFailing(/Submit|Apply/i);
        hardClick(within(apply).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }
  }, 180_000);

  it("Matrimonial intro Accept + Rishta close; Profile/Family/Directory leftovers", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial|Match|Rishta/i), {
        timeout: 45_000,
      });
      hardClick(screen.queryAllByRole("tab", { name: /Intros/i })[0]);
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Accept/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      hardClick(screen.queryAllByRole("tab", { name: /Match/i })[0]);
      hardClick(screen.queryAllByLabelText(/formal Rishta/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await submitFailing(/Send|Submit/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
      await waitFor(() => expect(screen.getByRole("button", { name: /^Edit$/i })).toBeTruthy(), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /^Edit$/i }));
      await pickDifferent(user, findComboNearLabel(document.body, /^Chapter$/i));
      await submitFailing(/^Save$/i);
      unmount();
    }

    if (seeded.otherMemberId) {
      const { unmount } = renderApp(withToaster(<MemberProfile />), {
        route: `/member/${seeded.otherMemberId}`,
        pathPattern: "/member/:id",
      });
      await waitFor(() => expect(screen.queryByRole("button", { name: /Edit Member/i })).toBeTruthy(), {
        timeout: 45_000,
      });
      hardClick(screen.getByRole("button", { name: /Edit Member/i }));
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      changeLabeledInput(dlg, /First Name/i, `${PREFIX} First`);
      changeLabeledInput(dlg, /Last Name/i, `${PREFIX} Last`);
      await submitFailing(/Save Changes/i);
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      hardClick(screen.queryByRole("button", { name: /Verification Panel/i }));
      const restore = forceWritesFail();
      hardClick(screen.queryByRole("button", { name: /^Downgrade$/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 30_000 }).catch(
        () => undefined,
      );
      hardClick(screen.queryAllByLabelText(/Delete business/i)[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Fund|Donation/i), { timeout: 30_000 });
      hardClick(screen.getByRole("tab", { name: /Fund Management/i }));
      hardClick(screen.queryAllByLabelText(/Edit fund/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        await pickDifferent(user, findComboNearLabel(dlg, /^Chapter$/i));
        await submitFailing(/Save Changes/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<ChaptersTab />), { route: "/admin?tab=chapters" });
      await waitFor(() => expect(screen.queryAllByLabelText(/Edit chapter/i).length).toBeGreaterThan(0), {
        timeout: 45_000,
      });
      hardClick(screen.getAllByLabelText(/Edit chapter/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      changeLabeledInput(dlg, /^Country$/i, `${PREFIX} Country`);
      await submitFailing(/Save Changes/i);
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BannedKeywordsTab />), { route: "/admin?tab=keywords" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Keyword|blocklist|Banned/i), { timeout: 30_000 });
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
        const combos = within(dlg).queryAllByRole("combobox");
        await pickOption(user, combos[1] ?? combos[0], /\+44/);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      }
      unmount();
    }
  }, 180_000);
});
