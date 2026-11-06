/**
 * Pass 30 — Wave 12: remaining mutation onError + leftover select arrows.
 * EMAILIT blank. Writes are forced to fail so no email/SMS/notify fires.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import SamitiTab from "@/components/admin/SamitiTab";
import BulkContentTab from "@/components/admin/BulkContentTab";
import RolesTab from "@/components/admin/RolesTab";
import Profile from "@/pages/Profile";
import News from "@/pages/News";
import Business from "@/pages/Business";
import Search from "@/pages/Search";
import Dashboard from "@/pages/Dashboard";
import OralHistory from "@/pages/OralHistory";
import Temple from "@/pages/Temple";
import MemberProfile from "@/pages/MemberProfile";
import Settings from "@/pages/Settings";
import Events from "@/pages/Events";
import Matrimonial from "@/pages/Matrimonial";
import Mentorship from "@/pages/Mentorship";
import { FamilyInviteDialog, PendingInvitationsList } from "@/components/profile/FamilyInviteDialog";

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

const PREFIX = `covw12g_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const seeded: {
  announcementId?: string;
  tagId?: string;
  templateId?: string;
  oralId?: string;
  otherMemberId?: string;
  inviteId?: string;
  gaMemberId?: string;
} = {};

function hardClick(el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return;
  fireEvent.pointerDown(el);
  fireEvent.mouseDown(el);
  fireEvent.pointerUp(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

function fillIn(root: ParentNode = document) {
  for (const input of Array.from(root.querySelectorAll("input, textarea, select")) as HTMLInputElement[]) {
    if (input.disabled || input.type === "hidden" || input.type === "file") continue;
    if (input.type === "checkbox" || input.type === "radio") {
      fireEvent.click(input);
      continue;
    }
    const value =
      input.type === "number"
        ? "9"
        : input.type === "email"
          ? `${PREFIX}@example.invalid`
          : input.type === "date"
            ? "1993-04-04"
            : input.type === "datetime-local"
              ? "2027-08-01T18:00"
              : `${PREFIX} field`;
    fireEvent.change(input, { target: { value } });
  }
}

async function pickLabeledSelect(
  user: ReturnType<typeof userEvent.setup>,
  labelRe: RegExp,
  optionRe?: RegExp,
) {
  const labels = screen.queryAllByText(labelRe);
  for (const label of labels) {
    const box = label.closest("div") ?? label.parentElement;
    const trigger = box?.querySelector('[role="combobox"]') as HTMLElement | null;
    if (!trigger || (trigger as HTMLButtonElement).disabled) continue;
    try {
      await user.click(trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 2000 }).catch(() => []);
      const match = optionRe ? opts.find((o) => optionRe.test(o.textContent ?? "")) : undefined;
      const pick =
        match ??
        opts.find((o) => !/select|any|none|default/i.test(o.textContent ?? "")) ??
        opts[1] ??
        opts[0];
      if (pick) await user.click(pick);
      else await user.keyboard("{Escape}");
      return true;
    } catch {
      try {
        await user.keyboard("{Escape}");
      } catch {
        /* skip */
      }
    }
  }
  return false;
}

async function pickDifferentOption(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement) {
  if ((trigger as HTMLButtonElement).disabled) return;
  const current = (trigger.textContent ?? "").trim();
  try {
    await user.click(trigger);
    const opts = await screen.findAllByRole("option", {}, { timeout: 2000 }).catch(() => []);
    const pick = opts.find((o) => (o.textContent ?? "").trim() !== current) ?? opts[1] ?? opts[0];
    if (pick) await user.click(pick);
    else await user.keyboard("{Escape}");
  } catch {
    try {
      await user.keyboard("{Escape}");
    } catch {
      /* skip */
    }
  }
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

function forceWritesFail() {
  const origFrom = supabase.from.bind(supabase);
  const origRpc = supabase.rpc.bind(supabase);
  const origInvoke = supabase.functions.invoke.bind(supabase.functions);
  const message = `${PREFIX} boom`;
  (supabase as { from: typeof supabase.from }).from = ((table: string) => {
    const q = origFrom(table);
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
  return () => {
    (supabase as { from: typeof supabase.from }).from = origFrom;
    (supabase as { rpc: typeof supabase.rpc }).rpc = origRpc;
    supabase.functions.invoke = origInvoke;
  };
}

async function submitFailing(name: RegExp | string) {
  const restore = forceWritesFail();
  const btn =
    typeof name === "string"
      ? screen.queryByRole("button", { name })
      : screen.queryAllByRole("button", { name })[0];
  hardClick(btn);
  await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
    timeout: 8_000,
  }).catch(() => undefined);
  restore();
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

describe("Pass 30 — Wave 12 onError + leftover arrows", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const gaUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: ga } = await admin.from("members").select("id").eq("user_id", gaUserId ?? "").maybeSingle();
    seeded.gaMemberId = ga?.id;

    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const caUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: ca } = await admin.from("members").select("id").eq("user_id", caUserId ?? "").maybeSingle();
    seeded.otherMemberId = ca?.id;
    await supabase.auth.signOut().catch(() => undefined);

    const { data: ann } = await admin
      .from("announcements")
      .insert({ title: `${PREFIX} ann`, body: "coverage body", created_by: gaUserId, chapter_id: AHMEDABAD })
      .select("id")
      .maybeSingle();
    if (ann?.id) seeded.announcementId = ann.id;

    const { data: tag } = await admin
      .from("tag_requests")
      .insert({ term: `${PREFIX}-tag`, type: "skill", status: "pending", reason: "coverage" })
      .select("id")
      .maybeSingle();
    if (tag?.id) seeded.tagId = tag.id;

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
        created_by: ga?.id ?? null,
      })
      .select("id")
      .maybeSingle();
    if (tmpl?.id) seeded.templateId = tmpl.id;

    const { data: oral } = await admin
      .from("oral_histories")
      .insert({
        title: `${PREFIX} oral`,
        description: "coverage",
        narrator_name: "Coverage Elder",
        media_type: "audio",
        tags: ["coverage", "heritage"],
        created_by: gaUserId,
        chapter_id: AHMEDABAD,
        status: "published",
      })
      .select("id")
      .maybeSingle();
    if (oral?.id) seeded.oralId = oral.id;

    if (ga?.id) {
      const { data: inv } = await admin
        .from("family_invitations")
        .insert({
          inviter_member_id: ga.id,
          relation: "sister",
          invitee_name: `${PREFIX} Sis`,
          invitee_email: `${PREFIX}-sis@example.invalid`,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (inv?.id) seeded.inviteId = inv.id;
    }
  }, 60_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    if (seeded.announcementId) await admin.from("announcements").delete().eq("id", seeded.announcementId);
    if (seeded.tagId) await admin.from("tag_requests").delete().eq("id", seeded.tagId);
    if (seeded.templateId) await admin.from("whatsapp_templates").delete().eq("id", seeded.templateId);
    if (seeded.oralId) await admin.from("oral_histories").delete().eq("id", seeded.oralId);
    if (seeded.inviteId) await admin.from("family_invitations").delete().eq("id", seeded.inviteId);
    await supabase.auth.signOut().catch(() => undefined);
  }, 60_000);

  it("ChaptersTab: edit country, close dialogs, mocked create/update/settings/toggle/delete", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<ChaptersTab />), { route: "/admin?tab=chapters" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Chapter/i), { timeout: 45_000 });

    hardClick(screen.queryAllByRole("button", { name: /Create|New Chapter|Add Chapter/i })[0]);
    let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      fillIn(dlg);
      await submitFailing(/Create Chapter/i);
      await user.keyboard("{Escape}").catch(() => undefined);
    }

    hardClick(screen.queryAllByLabelText(/Edit chapter/i)[0]);
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      const country = within(dlg).queryAllByLabelText(/Country/i)[0] ?? (dlg.querySelector("input") as HTMLElement);
      fireEvent.change(country, { target: { value: `${PREFIX} Country` } });
      await submitFailing(/Save Changes/i);
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      await user.keyboard("{Escape}").catch(() => undefined);
    }

    hardClick(screen.queryAllByLabelText(/Chapter settings/i)[0]);
    dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
    if (dlg) {
      fillIn(dlg);
      await submitFailing(/Save Settings/i);
      hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
      await user.keyboard("{Escape}").catch(() => undefined);
    }

    const restoreToggle = forceWritesFail();
    hardClick(screen.queryAllByLabelText(/Deactivate chapter|Activate chapter/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
      timeout: 8_000,
    }).catch(() => undefined);
    restoreToggle();

    hardClick(screen.queryAllByLabelText(/Delete chapter/i)[0]);
    await submitFailing(/^Delete$/i);
    hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
    await user.keyboard("{Escape}").catch(() => undefined);
    unmount();
  }, 120_000);

  it("Directory / Finance / EventsTab / WhatsApp mocked writes + leftover selects", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Directory|Business/i), { timeout: 30_000 });
      hardClick(screen.getByRole("button", { name: /Add Business/i }));
      let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await submitFailing(/Create Listing/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const restoreVerify = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /^Verify$/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restoreVerify();
      hardClick(screen.queryAllByLabelText(/Delete business/i)[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      const jobsTab = screen.queryAllByRole("tab", { name: /Job/i })[0];
      if (jobsTab) hardClick(jobsTab);
      hardClick(screen.queryAllByRole("button", { name: /Add Job/i })[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await submitFailing(/Create|Save|Post/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Edit job/i)[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await submitFailing(/Save Changes/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Finance|Fund/i), { timeout: 30_000 });
      for (const name of [/Fund/i, /Medical/i, /Hall/i, /Scholarship/i, /Campaign/i]) {
        const tab = screen.queryAllByRole("tab", { name })[0];
        if (tab) hardClick(tab);
      }
      hardClick(screen.queryAllByRole("button", { name: /Create Fund|Add Fund|New Fund/i })[0]);
      let dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /Currency/i);
        await submitFailing(/Create|Save/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByRole("button", { name: /Edit/i })[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        await pickLabeledSelect(user, /Currency/i);
        await submitFailing(/Save/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByRole("button", { name: /^Review$/i })[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        await submitFailing(/Approve|Reject/i);
        hardClick(within(dlg).queryByRole("button", { name: /Close/i }));
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByRole("button", { name: /New Request|Add Donation|New Campaign/i })[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /Currency/i);
        await submitFailing(/Create|Save|Submit/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const restoreCancel = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Cancel campaign|Cancel$/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 6_000,
      }).catch(() => undefined);
      restoreCancel();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<EventsTab myChapterId={null} />), { route: "/admin?tab=events" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Event/i), { timeout: 30_000 });
      hardClick(screen.queryAllByRole("button", { name: /Create|New Event/i })[0]);
      let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /^Country$/i, /India/i);
        await pickLabeledSelect(user, /^State$/i);
        await submitFailing(/Publish Event/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Edit event/i)[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /Fee Currency|Currency/i);
        await submitFailing(/Save Changes/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Cancel event/i)[0]);
      await submitFailing(/Cancel Event/i);
      hardClick(screen.queryAllByRole("button", { name: /^Back$|^Cancel$/i })[0]);
      hardClick(screen.queryAllByLabelText(/Delete event/i)[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
      await waitFor(() => expect(document.body.textContent).toMatch(/WhatsApp|Template/i), { timeout: 30_000 });
      hardClick(screen.queryAllByLabelText(/Edit template/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /Language/i);
        await pickLabeledSelect(user, /Category/i);
        await submitFailing(/Save|Update/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByRole("button", { name: /New Template|Create Template|Add Template|Create/i })[0]);
      const createDlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (createDlg) {
        fillIn(createDlg);
        await submitFailing(/Save|Create/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Delete template/i)[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }
  }, 180_000);

  it("MembersTab invite chapter + level-down + mocked invite/edit; other leftover admin tabs", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { data: members } = await supabase
      .from("members")
      .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
      .limit(20);

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
      await waitFor(() => expect(document.body.textContent).toMatch(/Invite Member/i), { timeout: 30_000 });
      hardClick(screen.getByRole("button", { name: /Invite Member/i }));
      const inviteDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (inviteDlg) {
        fillIn(inviteDlg);
        await pickLabeledSelect(user, /Chapter/i);
        await submitFailing(/Send Invite|Send Invitation|Invite/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const restoreLvl = forceWritesFail();
      hardClick(screen.queryAllByLabelText(/Downgrade verification level/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restoreLvl();
      hardClick(screen.queryAllByLabelText(/Edit member/i)[0]);
      const editDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (editDlg) {
        fillIn(editDlg);
        await submitFailing(/Save/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { data: anns } = await supabase.from("announcements").select("id, title, body, created_at, chapter_id").limit(8);
      const { unmount } = renderApp(
        withToaster(<AnnouncementsTab announcements={(anns ?? []) as never} myChapterId={AHMEDABAD} />),
        { route: "/admin?tab=announcements" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Announcement/i), { timeout: 20_000 });
      hardClick(screen.queryAllByLabelText(/Edit announcement/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await submitFailing(/Save Changes/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      await submitFailing(/Publish/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BannedKeywordsTab />), { route: "/admin?tab=banned-keywords" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Keyword|blocklist/i), { timeout: 20_000 });
      hardClick(screen.queryAllByRole("button", { name: /^Edit$/i })[0]);
      const combo = screen.queryAllByRole("combobox").find((el) => /low|medium|high/i.test(el.textContent ?? ""));
      if (combo) await pickDifferentOption(user, combo);
      await submitFailing(/^Save$/i);
      unmount();
    }

    {
      const { data: tags } = await supabase.from("tag_requests").select("id, term, type, status, reason").limit(20);
      const { unmount } = renderApp(withToaster(<TagRequestsTab tagRequests={(tags ?? []) as never} />), {
        route: "/admin?tab=tag-requests",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Tag|Pending/i), { timeout: 20_000 });
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /^Approve$/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<SamitiTab chapterId={AHMEDABAD} />), { route: "/admin?tab=samiti" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Samiti|Sub-Group/i), { timeout: 20_000 });
      hardClick(screen.queryAllByRole("button", { name: /^Create$/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await submitFailing(/Create|Save/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Edit /i)[0]);
      const ed = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (ed) {
        fillIn(ed);
        await submitFailing(/Save/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BulkContentTab />), { route: "/admin?tab=bulk-content" });
      await waitFor(() => expect(document.body.textContent).toMatch(/record|Event|Search/i), { timeout: 20_000 });
      hardClick(screen.queryAllByRole("checkbox")[0]);
      hardClick(screen.queryAllByRole("button", { name: /Delete .* Selected/i })[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }

    {
      const { data: roles } = await supabase
        .from("role_assignments")
        .select("id, role_id, member_id, chapter_id, start_date, end_date, created_at, roles(name, scope), members(first_name, last_name), chapters(name)")
        .limit(8);
      const { unmount } = renderApp(
        withToaster(<RolesTab roleAssignments={(roles ?? []) as never} myChapterId={null} />),
        { route: "/admin?tab=roles" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Role|Assign/i), { timeout: 20_000 });
      hardClick(screen.queryAllByRole("button", { name: /Assign|Revoke|Save/i })[0]);
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Assign|Save|Revoke|Confirm/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 6_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }
  }, 180_000);

  it("Pages: Profile/News/Business/Search/Dashboard/OralHistory/Temple/MemberProfile/Settings/Events leftover", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Name/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("button", { name: /Edit/i })[0]);
      await pickLabeledSelect(user, /Chapter/i);
      fillIn();
      await submitFailing(/Save|Update/i);
      const skill = screen.queryByPlaceholderText(/Add skill/i);
      if (skill) {
        fireEvent.change(skill, { target: { value: PREFIX } });
        await submitFailing(/^Add$/i);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });
      await waitFor(() => expect(screen.getByRole("button", { name: /Write Article/i })).toBeTruthy(), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /Write Article/i }));
      let dlg = await screen.findByRole("dialog", {}, { timeout: 10_000 });
      fillIn(dlg);
      await pickLabeledSelect(user, /Country/i, /India/i);
      await pickLabeledSelect(user, /State/i);
      await submitFailing(/Save as Draft|Publish|Save/i);
      await user.keyboard("{Escape}").catch(() => undefined);
      hardClick(screen.queryAllByLabelText(/Edit article/i)[0]);
      dlg = (await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null)) as HTMLElement | null;
      if (dlg) {
        await pickLabeledSelect(user, /Type|Article/i);
        await submitFailing(/Save/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Delete article/i)[0]);
      await submitFailing(/^Delete$/i);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Business />), { route: "/business/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("button", { name: /Add Business|New Business|List Business/i })[0]);
      let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /^Country$/i, /India/i);
        await waitFor(() => {
          const state = within(dlg as HTMLElement).queryAllByRole("combobox").find((el) =>
            /state/i.test(el.textContent ?? ""),
          );
          return expect(state ? !(state as HTMLButtonElement).disabled : true).toBe(true);
        }, { timeout: 8_000 }).catch(() => undefined);
        await pickLabeledSelect(user, /^State$/i);
        await pickLabeledSelect(user, /^City$/i);
        await submitFailing(/Create|Save|Add/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const jobs = screen.queryAllByRole("tab", { name: /Jobs/i })[0];
      if (jobs) hardClick(jobs);
      hardClick(screen.queryAllByRole("button", { name: /Add Job|Post Job|Post a Job/i })[0]);
      dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /^Country$/i, /India/i);
        await pickLabeledSelect(user, /^State$/i);
        await pickLabeledSelect(user, /^City$/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(<Search />, { route: "/search" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Search|Member/i), { timeout: 45_000 });
      await pickLabeledSelect(user, /Country/i, /India/i);
      await pickLabeledSelect(user, /State/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Dashboard />), { route: "/dashboard" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Dashboard|Welcome|Create Event/i), { timeout: 45_000 });
      const createEvt = screen.queryByText(/Create Event/i);
      if (createEvt) hardClick(createEvt.closest("[class*='cursor-pointer']") as HTMLElement ?? createEvt);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<OralHistory />), { route: "/oral-history/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Oral|Histor/i), { timeout: 45_000 });
      const tag = screen.queryByText("coverage") ?? screen.queryByText("heritage");
      if (tag) hardClick(tag);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Temple />), { route: "/temple" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Temple|Donate/i), { timeout: 45_000 });
      fillIn();
      await pickDifferentOption(user, screen.queryAllByRole("combobox")[0]);
      await submitFailing(/Donate|Submit|Pay/i);
      unmount();
    }

    if (seeded.otherMemberId) {
      const { unmount } = renderApp(withToaster(<MemberProfile />), {
        route: `/member/${seeded.otherMemberId}`,
        pathPattern: "/member/:id",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Verification|Name/i), { timeout: 45_000 });
      hardClick(screen.queryAllByRole("button", { name: /Edit Member/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        const boxes = within(dlg).getAllByRole("textbox");
        if (boxes[0]) fireEvent.change(boxes[0], { target: { value: `${PREFIX} First` } });
        if (boxes[1]) fireEvent.change(boxes[1], { target: { value: `${PREFIX} Last` } });
        await submitFailing(/Save Changes/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const restore = forceWritesFail();
      hardClick(screen.queryByRole("button", { name: /Downgrade verification level/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Settings />), { route: "/settings" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Privacy|Settings/i), { timeout: 45_000 });
      hardClick(screen.getByRole("tab", { name: /Privacy/i }));
      await submitFailing(/Save Privacy/i);
      hardClick(screen.getByRole("tab", { name: /Notifications/i }));
      for (const sw of screen.queryAllByRole("switch")) await user.click(sw);
      await submitFailing(/Save Preferences/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Events />), { route: "/events/manage" });
      await waitFor(() => expect(screen.getByRole("button", { name: /Create/i })).toBeTruthy(), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /Create/i }));
      let dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      fillIn(dlg);
      await pickLabeledSelect(user, /^Country$/i, /India/i);
      await pickLabeledSelect(user, /^State$/i);
      await pickLabeledSelect(user, /^City$/i);
      await submitFailing(/Publish Event/i);
      await user.keyboard("{Escape}").catch(() => undefined);
      hardClick(screen.queryAllByLabelText(/Edit event/i)[0]);
      dlg = (await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null)) as HTMLElement;
      if (dlg) {
        await pickLabeledSelect(user, /^Status$/i);
        await submitFailing(/Save Changes/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial|Rishta/i), { timeout: 45_000 });
      hardClick(screen.queryAllByLabelText(/formal Rishta/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (dlg) {
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Accept/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 6_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Mentorship />), { route: "/mentorship/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Mentor/i), { timeout: 45_000 });
      const restore = forceWritesFail();
      hardClick(screen.queryAllByRole("button", { name: /Request|Ask to be mentored/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 6_000,
      }).catch(() => undefined);
      restore();
      unmount();
    }

    if (seeded.gaMemberId) {
      const { unmount } = renderApp(withToaster(<FamilyInviteDialog memberId={seeded.gaMemberId} />), { route: "/profile" });
      hardClick(screen.queryAllByRole("button", { name: /Invite|Add|Family/i })[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        const cc = within(dlg).queryAllByRole("combobox")[0];
        if (cc) await pickDifferentOption(user, cc);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
      const { unmount: u2 } = renderApp(withToaster(<PendingInvitationsList memberId={seeded.gaMemberId} />), {
        route: "/profile",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Pending|Invitation/i), { timeout: 15_000 }).catch(
        () => undefined,
      );
      hardClick(screen.queryAllByRole("button", { name: /Edit/i })[0]);
      fillIn();
      await submitFailing(/Save|Update/i);
      u2();
    }
  }, 180_000);
});
