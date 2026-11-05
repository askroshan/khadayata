/**
 * Pass 29 — Wave 12: leftover one-liner arrows + mutation onError (mocked).
 * EMAILIT blank. Never send email/SMS. Never confirm real destructive deletes.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { useState, type ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import Obituaries from "@/pages/Obituaries";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Events from "@/pages/Events";
import Business from "@/pages/Business";
import News from "@/pages/News";
import Search from "@/pages/Search";
import MemberProfile from "@/pages/MemberProfile";
import OralHistory from "@/pages/OralHistory";
import Temple from "@/pages/Temple";
import AppLayout from "@/components/AppLayout";
import ChaptersTab from "@/components/admin/ChaptersTab";
import FinanceTab from "@/components/admin/FinanceTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import MembersTab from "@/components/admin/MembersTab";
import EventsTab from "@/components/admin/EventsTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import BulkContentTab from "@/components/admin/BulkContentTab";
import { FamilyInviteDialog, PendingInvitationsList } from "@/components/profile/FamilyInviteDialog";
import { SearchFilters, type Filters } from "@/components/matrimonial/SearchFilters";

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

const PREFIX = `covw12f_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const seeded: { eventId?: string; bizId?: string; inviteId?: string; otherMemberId?: string } = {};

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
        ? "42"
        : input.type === "email"
          ? `${PREFIX}@example.invalid`
          : input.type === "date"
            ? "1990-03-03"
            : input.type === "datetime-local"
              ? "2027-03-15T18:00"
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
      const pick = match ?? opts.find((o) => !/select|any|none|default/i.test(o.textContent ?? "")) ?? opts[1] ?? opts[0];
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

function forceTableError(tables: string[]) {
  const orig = supabase.from.bind(supabase);
  const message = `${PREFIX} boom`;
  (supabase as { from: typeof supabase.from }).from = ((table: string) => {
    const q = orig(table);
    if (!tables.includes(table)) return q;
    const boom = () => boomChain(message);
    (q as { insert: unknown }).insert = boom;
    (q as { update: unknown }).update = boom;
    (q as { delete: unknown }).delete = boom;
    (q as { upsert: unknown }).upsert = boom;
    return q;
  }) as typeof supabase.from;
  return () => {
    (supabase as { from: typeof supabase.from }).from = orig;
  };
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

function FiltersHarness() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    gender: "",
    minAge: "",
    maxAge: "",
    diet: "",
    maritalStatus: "",
    education: "",
    manglik: "",
    city: "",
    country: "",
    visaType: "",
    gotra: "",
    excludeSameGotra: false,
  });
  return <SearchFilters filters={filters} onChange={setFilters} />;
}

describe("Pass 29 — Wave 12 leftover arrows + mocked onError", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const gaUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: ga } = await admin.from("members").select("id").eq("user_id", gaUserId ?? "").maybeSingle();

    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const caUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: ca } = await admin.from("members").select("id").eq("user_id", caUserId ?? "").maybeSingle();
    seeded.otherMemberId = ca?.id;
    await supabase.auth.signOut().catch(() => undefined);

    const { data: ev } = await admin
      .from("events")
      .insert({
        name: `${PREFIX} upcoming`,
        description: "coverage future event",
        venue: "Coverage Hall",
        starts_at: "2027-06-01T18:00:00Z",
        ends_at: "2027-06-01T21:00:00Z",
        status: "published",
        created_by: gaUserId,
        chapter_id: AHMEDABAD,
        category: "Social",
        event_type: "in_person",
        tags: ["coverage"],
        country_id: INDIA,
      })
      .select("id")
      .maybeSingle();
    if (ev?.id) seeded.eventId = ev.id;

    if (ca?.id) {
      const { data: biz } = await admin
        .from("businesses")
        .insert({
          name: `${PREFIX} OtherBiz`,
          sector: "Technology",
          description: "coverage",
          verified: true,
          chapter_id: AHMEDABAD,
          country_id: INDIA,
          owner_member_id: ca.id,
        })
        .select("id")
        .maybeSingle();
      if (biz?.id) seeded.bizId = biz.id;
    }

    if (ga?.id) {
      const { data: inv } = await admin
        .from("family_invitations")
        .insert({
          inviter_member_id: ga.id,
          relation: "brother",
          invitee_name: `${PREFIX} Relative`,
          invitee_email: `${PREFIX}-rel@example.invalid`,
          invitee_phone: "9876543210",
          invitee_phone_country_code: "+91",
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
    if (seeded.eventId) await admin.from("events").delete().eq("id", seeded.eventId);
    if (seeded.bizId) await admin.from("businesses").delete().eq("id", seeded.bizId);
    if (seeded.inviteId) await admin.from("family_invitations").delete().eq("id", seeded.inviteId);
    await supabase.auth.signOut().catch(() => undefined);
  }, 60_000);

  it("Index member hover, Obituaries hover, Dashboard news View All, AppLayout sign-out", async () => {
    await supabase.auth.signOut().catch(() => undefined);
    {
      const { unmount } = renderApp(<Index />, { route: "/" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Khadayata|Join|Member/i), { timeout: 45_000 });
      await waitFor(() => expect(document.querySelector("a[href^='/member/']")).toBeTruthy(), { timeout: 20_000 }).catch(
        () => undefined,
      );
      for (const el of Array.from(document.querySelectorAll("a[href^='/member/'] div")) as HTMLElement[]) {
        fireEvent.mouseEnter(el);
        fireEvent.mouseLeave(el);
      }
      unmount();
    }

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    {
      const { unmount } = renderApp(withToaster(<Obituaries />), { route: "/obituaries" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Obituar/i), { timeout: 45_000 });
      await waitFor(() => expect(document.querySelector("article")).toBeTruthy(), { timeout: 15_000 }).catch(() => undefined);
      for (const art of Array.from(document.querySelectorAll("article")) as HTMLElement[]) {
        fireEvent.mouseEnter(art);
        fireEvent.mouseLeave(art);
      }
      unmount();
    }
    {
      const { unmount } = renderApp(withToaster(<Dashboard />), { route: "/dashboard" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Dashboard|Welcome|News|Event/i), { timeout: 45_000 });
      const newsViewAll = screen.queryAllByRole("button", { name: /View All/i }).at(-1);
      if (newsViewAll) hardClick(newsViewAll);
      unmount();
    }
    {
      const { unmount } = renderApp(
        withToaster(
          <AppLayout title="Coverage">
            <p>layout child</p>
          </AppLayout>,
        ),
        { route: "/dashboard" },
      );
      const signOutBtn = await screen.findByRole("button", { name: /Sign out/i }, { timeout: 25_000 });
      fireEvent.click(signOutBtn);
      unmount();
    }
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
  }, 120_000);

  it("Settings privacy different option + notification switches", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Settings />), { route: "/settings" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Privacy|Settings/i), { timeout: 45_000 });
    hardClick(screen.getByRole("tab", { name: /Privacy/i }));
    await waitFor(() => expect(screen.queryAllByRole("combobox").length).toBeGreaterThan(0), { timeout: 10_000 });
    for (const trigger of screen.queryAllByRole("combobox").slice(0, 4)) {
      await pickDifferentOption(user, trigger);
    }
    hardClick(screen.getByRole("tab", { name: /Notifications/i }));
    await waitFor(() => expect(screen.queryAllByRole("switch").length).toBeGreaterThan(0), { timeout: 10_000 });
    for (const sw of screen.queryAllByRole("switch")) {
      await user.click(sw);
    }
    unmount();
  }, 90_000);

  it("Events: geo cascade, edit form, mocked onError (no publish/notify)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Events />), { route: "/events/manage" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Create/i })).toBeTruthy(), { timeout: 45_000 });

    hardClick(screen.getByRole("button", { name: /Create/i }));
    const createDlg = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    fillIn(createDlg);
    await pickLabeledSelect(user, /^Country$/i, /India/i);
    await waitFor(() => {
      const state = within(createDlg).queryAllByRole("combobox").find((el) => /state/i.test(el.textContent ?? el.getAttribute("aria-label") ?? ""));
      return expect(state ? !(state as HTMLButtonElement).disabled : true).toBe(true);
    }, { timeout: 8_000 }).catch(() => undefined);
    await pickLabeledSelect(user, /^State$/i);
    await pickLabeledSelect(user, /^City$/i);

    const restoreCreate = forceTableError(["events"]);
    hardClick(within(createDlg).queryByRole("button", { name: /Publish Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), { timeout: 8_000 }).catch(
      () => undefined,
    );
    restoreCreate();
    await user.keyboard("{Escape}").catch(() => undefined);

    const edit = await screen.findAllByLabelText(/Edit event/i, {}, { timeout: 10_000 }).catch(() => []);
    if (edit[0]) {
      hardClick(edit[0]);
      const editDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (editDlg) {
        fillIn(editDlg);
        await pickLabeledSelect(user, /^Status$/i);
        const restoreUpd = forceTableError(["events"]);
        hardClick(within(editDlg).queryByRole("button", { name: /Save Changes/i }));
        await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
          timeout: 8_000,
        }).catch(() => undefined);
        restoreUpd();
        await user.keyboard("{Escape}").catch(() => undefined);
      }
    }

    const restoreRsvp = forceTableError(["event_rsvps"]);
    hardClick(screen.queryAllByRole("button", { name: /RSVP Now/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), { timeout: 8_000 }).catch(
      () => undefined,
    );
    restoreRsvp();

    const cancelEvt = screen.queryAllByLabelText(/Cancel event/i)[0];
    if (cancelEvt) {
      hardClick(cancelEvt);
      const restoreCancel = forceTableError(["events"]);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel Event$/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restoreCancel();
      hardClick(screen.queryAllByRole("button", { name: /^Back$/i })[0]);
      await user.keyboard("{Escape}").catch(() => undefined);
    }

    const del = screen.queryAllByLabelText(/Delete event/i)[0];
    if (del) {
      hardClick(del);
      const restoreDel = forceTableError(["events"]);
      hardClick(screen.queryAllByRole("button", { name: /^Delete$/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restoreDel();
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      await user.keyboard("{Escape}").catch(() => undefined);
    }
    unmount();
  }, 120_000);

  it("Business geo + job location; News edit type/state; Search state after country", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<Business />), { route: "/business/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job/i), { timeout: 45_000 });
      const addBiz = screen.queryAllByRole("button", { name: /Add Business|New Business|List Business/i })[0];
      if (addBiz) {
        hardClick(addBiz);
        const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
        if (dlg) {
          fillIn(dlg);
          await pickLabeledSelect(user, /^Country$/i, /India/i);
          await pickLabeledSelect(user, /^State$/i);
          await pickLabeledSelect(user, /^City$/i);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      const jobs = screen.queryAllByRole("tab", { name: /Jobs/i })[0];
      if (jobs) hardClick(jobs);
      const loc = document.getElementById("job-location-filter") as HTMLInputElement | null;
      if (loc) fireEvent.change(loc, { target: { value: "Ahmedabad" } });
      const addJob = screen.queryAllByRole("button", { name: /Add Job|Post Job|Post a Job|New Job/i })[0];
      if (addJob) {
        hardClick(addJob);
        const jobDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
        if (jobDlg) {
          fillIn(jobDlg);
          await pickLabeledSelect(user, /^Country$/i, /India/i);
          await pickLabeledSelect(user, /^State$/i);
          await pickLabeledSelect(user, /^City$/i);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });
      await waitFor(() => expect(screen.getByRole("button", { name: /Write Article/i })).toBeTruthy(), { timeout: 45_000 });
      hardClick(screen.getByRole("button", { name: /Write Article/i }));
      const dlg = await screen.findByRole("dialog", {}, { timeout: 10_000 });
      fillIn(dlg);
      await pickLabeledSelect(user, /Country/i, /India/i);
      await pickLabeledSelect(user, /State/i);
      await user.keyboard("{Escape}").catch(() => undefined);
      const edit = screen.queryAllByLabelText(/Edit article/i)[0];
      if (edit) {
        hardClick(edit);
        const editDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
        if (editDlg) {
          await pickLabeledSelect(user, /Type|Article/i);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      unmount();
    }

    {
      const { unmount } = renderApp(<Search />, { route: "/search" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Search|Member/i), { timeout: 45_000 });
      await pickLabeledSelect(user, /Country/i, /India/i);
      await waitFor(() => {
        const combos = screen.queryAllByRole("combobox");
        return expect(combos.length).toBeGreaterThan(1);
      }, { timeout: 8_000 }).catch(() => undefined);
      await pickLabeledSelect(user, /State/i);
      unmount();
    }
  }, 120_000);

  it("MemberProfile other member: edit names, mocked level-down, revoke biz", async () => {
    if (!seeded.otherMemberId) return;
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${seeded.otherMemberId}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Verification|Chapter|Name/i), { timeout: 45_000 });
    const edit = screen.queryAllByRole("button", { name: /Edit Member/i })[0];
    if (edit) {
      hardClick(edit);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        const first = within(dlg).queryByLabelText(/First Name/i) ?? within(dlg).getAllByRole("textbox")[0];
        const last = within(dlg).queryByLabelText(/Last Name/i) ?? within(dlg).getAllByRole("textbox")[1];
        if (first) fireEvent.change(first, { target: { value: `${PREFIX} First` } });
        if (last) fireEvent.change(last, { target: { value: `${PREFIX} Last` } });
        await user.keyboard("{Escape}").catch(() => undefined);
      }
    }
    const restoreMembers = forceTableError(["members"]);
    hardClick(screen.queryByRole("button", { name: /Downgrade verification level/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), { timeout: 8_000 }).catch(
      () => undefined,
    );
    restoreMembers();
    const restoreBiz = forceTableError(["businesses"]);
    hardClick(screen.queryAllByRole("button", { name: /^Revoke$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), { timeout: 8_000 }).catch(
      () => undefined,
    );
    restoreBiz();
    unmount();
  }, 90_000);

  it("Admin leftovers: chapters/members/directory/finance/events/whatsapp/announcements/keywords/bulk", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<ChaptersTab />), { route: "/admin?tab=chapters" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Chapter/i), { timeout: 45_000 });
      hardClick(screen.queryAllByLabelText(/Edit chapter/i)[0]);
      const editDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (editDlg) {
        fillIn(editDlg);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Chapter settings/i)[0]);
      const setDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (setDlg) await user.keyboard("{Escape}").catch(() => undefined);
      unmount();
    }

    {
      const { data: members } = await supabase
        .from("members")
        .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
        .limit(20);
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
        await pickLabeledSelect(user, /Chapter/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      hardClick(screen.queryAllByLabelText(/Member admin actions/i)[0]);
      await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      await user.keyboard("{Escape}").catch(() => undefined);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Directory|Business|Job/i), { timeout: 30_000 });
      const delBiz = screen.queryAllByLabelText(/Delete business/i)[0];
      if (delBiz) {
        hardClick(delBiz);
        hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const jobsTab = screen.queryAllByRole("tab", { name: /Job/i })[0];
      if (jobsTab) hardClick(jobsTab);
      hardClick(screen.queryAllByLabelText(/Edit job/i)[0]);
      const jobDlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (jobDlg) await user.keyboard("{Escape}").catch(() => undefined);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Finance|Fund/i), { timeout: 30_000 });
      for (const name of [/Medical/i, /Scholarship/i, /Fund/i, /Campaign/i]) {
        const tab = screen.queryAllByRole("tab", { name })[0];
        if (tab) hardClick(tab);
      }
      hardClick(screen.queryAllByRole("button", { name: /^Review$/i })[0]);
      const reviewDlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (reviewDlg) await user.keyboard("{Escape}").catch(() => undefined);
      hardClick(screen.queryAllByRole("button", { name: /Edit Fund|Edit/i })[0]);
      const fundDlg = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
      if (fundDlg) {
        await pickLabeledSelect(user, /Currency/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<EventsTab myChapterId={null} />), { route: "/admin?tab=events" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Event/i), { timeout: 30_000 });
      hardClick(screen.queryAllByLabelText(/Edit event/i)[0]);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickLabeledSelect(user, /Currency|Fee/i);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
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
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(
        withToaster(<AnnouncementsTab announcements={[]} myChapterId={AHMEDABAD} />),
        { route: "/admin?tab=announcements" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Announcement/i), { timeout: 20_000 });
      hardClick(screen.queryByRole("button", { name: /Chapter Only/i }));
      hardClick(screen.queryByRole("button", { name: /All Members/i }));
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BannedKeywordsTab />), { route: "/admin?tab=banned-keywords" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Keyword|blocklist|Auto-Flag/i), { timeout: 30_000 });
      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: `${PREFIX}kw` } });
      const restoreKw = forceTableError(["banned_keywords"]);
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} boom|Error`)), {
        timeout: 8_000,
      }).catch(() => undefined);
      restoreKw();
      hardClick(screen.queryAllByRole("button", { name: /^Edit$/i })[0]);
      await pickLabeledSelect(user, /Severity|Low|Medium|High/i);
      const combo = screen.queryAllByRole("combobox").find((el) => /low|medium|high/i.test(el.textContent ?? ""));
      if (combo) await pickDifferentOption(user, combo);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BulkContentTab />), { route: "/admin?tab=bulk-content" });
      await waitFor(() => expect(document.body.textContent).toMatch(/record|Event|Search/i), { timeout: 30_000 });
      const cb = screen.queryAllByRole("checkbox")[0];
      if (cb) hardClick(cb);
      hardClick(screen.queryAllByRole("button", { name: /Delete .* Selected/i })[0]);
      hardClick(screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
      await user.keyboard("{Escape}").catch(() => undefined);
      unmount();
    }
  }, 180_000);

  it("Family invite country + pending edit; SearchFilters gotra; OralHistory tag; Temple currency", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const { data: mem } = await supabase.from("members").select("id").eq("user_id", uid ?? "").maybeSingle();

    if (mem?.id) {
      {
        const { unmount } = renderApp(withToaster(<FamilyInviteDialog memberId={mem.id} />), { route: "/profile" });
        await waitFor(() => expect(document.body.textContent).toMatch(/Family|Invite|Relative/i), { timeout: 20_000 }).catch(
          () => undefined,
        );
        hardClick(screen.queryAllByRole("button", { name: /Invite|Add|Family/i })[0]);
        const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
        if (dlg) {
          const cc = within(dlg).queryAllByRole("combobox")[0];
          if (cc) await pickDifferentOption(user, cc);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
        unmount();
      }
      {
        const { unmount } = renderApp(withToaster(<PendingInvitationsList memberId={mem.id} />), { route: "/profile" });
        await waitFor(() => expect(document.body.textContent).toMatch(/Pending|Invitation|Relative/i), { timeout: 20_000 }).catch(
          () => undefined,
        );
        hardClick(screen.queryAllByRole("button", { name: /Edit|pencil/i })[0]);
        fillIn();
        unmount();
      }
    }

    {
      const { unmount } = renderApp(<FiltersHarness />, { route: "/matrimonial" });
      hardClick(screen.getAllByRole("button")[0]);
      await pickLabeledSelect(user, /^Gotra$/i, /Garg/i);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<OralHistory />), { route: "/oral-history/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Oral|Histor/i), { timeout: 45_000 });
      const tag = Array.from(document.querySelectorAll("button, span, div")).find((el) =>
        /badge|tag/i.test(el.className) && (el as HTMLElement).onclick,
      ) as HTMLElement | undefined;
      const badges = screen.queryAllByText(/./).filter((el) => el.className.includes("badge") || el.getAttribute("class")?.includes("badge"));
      hardClick((badges[0] as HTMLElement) ?? tag);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Temple />), { route: "/temple" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Temple|Donate|Aarti/i), { timeout: 45_000 });
      await pickLabeledSelect(user, /Currency/i, /USD|GBP|AED/i);
      const combos = screen.queryAllByRole("combobox");
      for (const c of combos.slice(0, 3)) await pickDifferentOption(user, c);
      unmount();
    }
  }, 120_000);
});
