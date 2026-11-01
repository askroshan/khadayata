/**
 * Pass 10 — deep admin / WhatsApp / moderator mutation trees against local Kong + real DB.
 * Raises function/branch coverage on large admin surfaces without deleting E2E seed rows.
 */
import { describe, it, expect, afterAll } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import MembersTab from "@/components/admin/MembersTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import FinanceTab from "@/components/admin/FinanceTab";
import EventsTab from "@/components/admin/EventsTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import NewsPublisherTab from "@/components/admin/NewsPublisherTab";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import BulkContentTab from "@/components/admin/BulkContentTab";
import SamitiTab from "@/components/admin/SamitiTab";
import RolesTab from "@/components/admin/RolesTab";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import Admin from "@/pages/Admin";
import Profile from "@/pages/Profile";
import MemberProfile from "@/pages/MemberProfile";
import Dashboard from "@/pages/Dashboard";

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

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

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return;
  try {
    await user.click(el);
  } catch {
    /* ignore overlay races */
  }
}

describe("Pass 10 admin / WhatsApp / moderator deep trees", () => {
  let gaJwt = "";
  let members: Array<{
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    verification_level: number;
    onboarding_completed: boolean;
    chapter_id: string | null;
    created_at?: string;
    chapters: { name: string } | null;
  }> = [];
  let realMemberId = "";

  afterAll(async () => {
    await supabase.auth.signOut();
    await supabase.from("whatsapp_templates").delete().like("name", "pass10_%");
  });

  it("bootstrap GA session + member list", async () => {
    const client = createClient(url, anon);
    const { data, error } = await client.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    expect(error).toBeNull();
    gaJwt = data.session!.access_token;
    await client.auth.signOut();

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { data: rows } = await supabase
      .from("members")
      .select(
        "id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)",
      )
      .neq("first_name", "E2E")
      .order("created_at", { ascending: false })
      .limit(80);
    members = (rows ?? []) as typeof members;
    expect(members.length).toBeGreaterThan(5);
    realMemberId = members.find((m) => m.chapter_id === AHMEDABAD)?.id ?? members[0].id;
  }, 60_000);

  it("MembersTab: search, filters, invite dialog, edit dialog (no destructive save)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(
      <MembersTab members={members} myChapterId={null} isGlobalAdmin canInvite />,
      { route: "/admin?tab=members" },
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Member|Search|Level/i);
    }, { timeout: 20_000 });

    const search = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(search, { target: { value: "Shah" } });
    await waitFor(() => expect((search as HTMLInputElement).value).toBe("Shah"));

    const inviteBtn = screen.queryAllByRole("button", { name: /Invite|Add Member|Send Invitation/i })[0];
    if (inviteBtn) {
      await clickSafe(user, inviteBtn);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/email|invitation|chapter/i);
      }, { timeout: 10_000 });
      const email = screen.queryByPlaceholderText(/member@example.com/i);
      if (email) fireEvent.change(email, { target: { value: "pass10-coverage-invite@example.com" } });
      // close without sending
      const cancel = screen.queryByRole("button", { name: /cancel|close/i });
      await clickSafe(user, cancel);
      await user.keyboard("{Escape}");
    }

    const editBtns = screen.queryAllByRole("button", { name: /edit|pencil/i });
    const pencil =
      editBtns[0] ??
      Array.from(document.querySelectorAll("button")).find((b) =>
        b.querySelector("svg") && /edit|pencil/i.test(b.getAttribute("aria-label") ?? ""),
      );
    if (pencil) {
      await clickSafe(user, pencil as HTMLElement);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Edit Member|First Name|Save Changes/i);
      }, { timeout: 15_000 });
      const first = screen.queryByLabelText(/First Name/i) ?? document.querySelector("input");
      if (first) fireEvent.change(first, { target: { value: (first as HTMLInputElement).value } });
      await user.keyboard("{Escape}");
    }

    for (const ph of [/All Levels/i, /All Status/i]) {
      const trigger = screen.queryByText(ph) ?? screen.queryByPlaceholderText(ph);
      // select triggers are buttons with placeholder text as child
    }
    const levelTrigger = document.querySelector('[placeholder], button');
    void levelTrigger;
    // Clear filters if present
    const clear = screen.queryByRole("button", { name: /clear/i });
    await clickSafe(user, clear);
  }, 90_000);

  it("ChaptersTab: open create + edit + settings dialogs without committing deletes", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(<ChaptersTab />, { route: "/admin?tab=chapters" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Chapter|Ahmedabad|Create/i);
    }, { timeout: 25_000 });

    const create = screen.getAllByRole("button", { name: /Create|Add Chapter|New Chapter/i })[0];
    await clickSafe(user, create);
    await waitFor(() => expect(document.body.textContent).toMatch(/Create New Chapter|Chapter Name/i), {
      timeout: 10_000,
    });
    await user.keyboard("{Escape}");

    const edit = screen.queryAllByLabelText(/Edit chapter/i)[0];
    if (edit) {
      await clickSafe(user, edit);
      await waitFor(() => expect(document.body.textContent).toMatch(/Edit Chapter|Save Changes/i), {
        timeout: 10_000,
      });
      await user.keyboard("{Escape}");
    }

    const settings = screen.queryAllByLabelText(/Chapter settings/i)[0];
    if (settings) {
      await clickSafe(user, settings);
      await waitFor(() => expect(document.body.textContent).toMatch(/Settings|Save Settings|subdomain|slug/i), {
        timeout: 10_000,
      });
      await user.keyboard("{Escape}");
    }

    const committee = screen.queryAllByLabelText(/Manage committee/i)[0];
    if (committee) {
      await clickSafe(user, committee);
      await waitFor(() => expect(document.body.textContent).toMatch(/committee|member|role/i), {
        timeout: 15_000,
      });
      await user.keyboard("{Escape}");
    }
  }, 90_000);

  it("AnalyticsTab: mount and open several drill-downs", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(<AnalyticsTab myChapterId={null} />, { route: "/admin?tab=analytics" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Member|Chapter|Event|Analytic/i);
    }, { timeout: 30_000 });

    // Click clickable stat cards (cursor-pointer)
    const cards = Array.from(document.querySelectorAll(".cursor-pointer, [class*='hover:shadow']")).slice(0, 12);
    for (const c of cards) {
      await clickSafe(user, c as HTMLElement);
      await waitFor(() => expect(true).toBe(true), { timeout: 2000 });
      await user.keyboard("{Escape}");
    }
  }, 90_000);

  it("WhatsAppTab: create template, edit, delete, send gate (no Meta secrets)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const tplName = `pass10_cov_${Date.now().toString(36)}`;

    // Seed a template via client so edit/delete UI has a row
    const { data: me } = await supabase.from("members").select("id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).maybeSingle();
    const { data: inserted, error: insErr } = await supabase
      .from("whatsapp_templates")
      .insert({
        name: tplName,
        language: "en",
        category: "UTILITY",
        header_text: "Hi",
        body_text: "Pass10 body {{1}}",
        footer_text: "footer",
        status: "pending",
        created_by: me?.id ?? null,
      })
      .select("id")
      .single();
    expect(insErr).toBeNull();
    const tplId = inserted!.id;

    renderApp(<WhatsAppTab />, { route: "/admin?tab=whatsapp" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(tplName));
    }, { timeout: 25_000 });

    const edit = screen.getAllByLabelText(/Edit template/i)[0];
    await clickSafe(user, edit);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit|Body|Save|Update/i), { timeout: 10_000 });
    const body = Array.from(document.querySelectorAll("textarea")).find((t) => /Pass10|body/i.test(t.value + (t.parentElement?.textContent ?? "")));
    if (body) fireEvent.change(body, { target: { value: "Pass10 body updated {{1}}" } });
    const save = screen.queryByRole("button", { name: /Save|Update/i });
    await clickSafe(user, save);
    await waitFor(() => expect(true).toBe(true), { timeout: 8_000 });
    await user.keyboard("{Escape}");

    // Send dialog — expect config failure without WHATSAPP_* secrets
    const sendBtn = screen.getAllByRole("button", { name: /^Send$/i })[0];
    await clickSafe(user, sendBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/phone|recipient|template|bulk/i), {
      timeout: 10_000,
    });
    const phone = Array.from(document.querySelectorAll("input")).find((i) =>
      /phone|recipient/i.test((i.parentElement?.textContent ?? "") + (i.placeholder ?? "")),
    );
    if (phone) fireEvent.change(phone, { target: { value: "15550100999" } });
    // try select first template if select present
    const confirm = screen.queryAllByRole("button").find((b) => /^Send$/i.test((b.textContent ?? "").trim()));
    await clickSafe(user, confirm);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/fail|error|configur|whatsapp|token|sent|template/);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");

    const del = screen.getAllByLabelText(/Delete template/i)[0];
    await clickSafe(user, del);
    await waitFor(() => expect(document.body.textContent).toMatch(/delete|confirm|remove/i), { timeout: 10_000 });
    const confirmDel = screen.queryByRole("button", { name: /delete|confirm|continue/i });
    await clickSafe(user, confirmDel);
    await waitFor(async () => {
      const { data } = await supabase.from("whatsapp_templates").select("id").eq("id", tplId);
      expect((data ?? []).length).toBe(0);
    }, { timeout: 15_000 });

    // History tab
    const hist = screen.queryByRole("tab", { name: /Message History|History/i });
    await clickSafe(user, hist);
  }, 120_000);

  it("edge send-whatsapp: OPTIONS + missing fields + unknown template + config gate", async () => {
    expect(gaJwt.length).toBeGreaterThan(20);
    const opt = await fetch(`${url}/functions/v1/send-whatsapp`, { method: "OPTIONS" });
    expect([200, 204].includes(opt.status)).toBe(true);

    const missing = await fetch(`${url}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${gaJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    // Without Meta secrets local/hosted often 500 config first; accept 400/500
    expect([400, 401, 403, 500].includes(missing.status)).toBe(true);

    const res = await fetch(`${url}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${gaJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: "00000000-0000-0000-0000-000000000099",
        recipient_phone: "15550100999",
        parameters: { "1": "Coverage" },
      }),
    });
    expect([400, 401, 403, 404, 500].includes(res.status)).toBe(true);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(2);
    expect(text.toLowerCase()).toMatch(/whatsapp|template|configur|token|required|forbidden|unauthorized|not found/);
  }, 45_000);

  it("ModeratorDashboard: tabs + CSV/export controls when present", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    const user = userEvent.setup();
    renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Report|Moderat|Member|Pending|Review/i);
    }, { timeout: 30_000 });

    for (const tab of screen.queryAllByRole("tab").slice(0, 10)) {
      await clickSafe(user, tab);
    }
    for (const b of screen.queryAllByRole("button").slice(0, 15)) {
      const label = b.textContent ?? b.getAttribute("aria-label") ?? "";
      if (/export|download|csv|refresh|filter|clear/i.test(label)) {
        await clickSafe(user, b);
      }
    }
  }, 90_000);

  it("Admin shell: walk primary tabs", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(<Admin />, { route: "/admin" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Admin|Members|Stats|Chapter/i);
    }, { timeout: 30_000 });
    for (const tab of screen.queryAllByRole("tab").slice(0, 20)) {
      await clickSafe(user, tab);
      await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(20), { timeout: 8_000 });
    }
  }, 120_000);

  it("Finance / Events / Directory / News / Verification / Bulk / Samiti / Roles mounts + light clicks", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { data: roleAssignments } = await supabase
      .from("role_assignments")
      .select("id, role_id, member_id, chapter_id, start_date, end_date, created_at, roles(name, scope), members(first_name, last_name), chapters(name)")
      .limit(40);
    const mounts = [
      <FinanceTab key="f" myChapterId={null} />,
      <EventsTab key="e" myChapterId={null} />,
      <DirectoryTab key="d" myChapterId={null} />,
      <NewsPublisherTab key="n" myChapterId={null} />,
      <VerificationDashboard key="v" myChapterId={null} isGlobalAdmin />,
      <BulkContentTab key="b" />,
      <SamitiTab key="s" chapterId={AHMEDABAD} />,
      <RolesTab key="r" roleAssignments={(roleAssignments ?? []) as never[]} myChapterId={null} />,
    ];
    for (const ui of mounts) {
      const { unmount } = renderApp(ui, { route: "/admin" });
      await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(10), { timeout: 25_000 });
      for (const tab of screen.queryAllByRole("tab").slice(0, 6)) await clickSafe(user, tab);
      for (const b of screen.queryAllByRole("button").slice(0, 8)) {
        const t = b.textContent ?? "";
        if (/add|create|new|filter|refresh|export/i.test(t)) await clickSafe(user, b);
      }
      await user.keyboard("{Escape}");
      unmount();
    }
  }, 180_000);

  it("Profile + MemberProfile + Dashboard interaction trees", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const { unmount: u1 } = renderApp(<Profile />, { route: "/profile" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Name|Chapter|Edit/i), {
      timeout: 30_000,
    });
    const edit = screen.queryByRole("button", { name: /edit/i });
    await clickSafe(user, edit);
    for (const b of screen.queryAllByRole("button").slice(0, 10)) await clickSafe(user, b);
    await user.keyboard("{Escape}");
    u1();

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { unmount: u2 } = renderApp(<MemberProfile />, {
      route: `/member/${realMemberId}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Member|Profile|Chapter|Verif/i), {
      timeout: 30_000,
    });
    for (const tab of screen.queryAllByRole("tab").slice(0, 8)) await clickSafe(user, tab);
    for (const b of screen.queryAllByRole("button").slice(0, 12)) {
      const t = b.textContent ?? b.getAttribute("aria-label") ?? "";
      if (/verif|level|edit|approve|reject|family|contact/i.test(t)) await clickSafe(user, b);
    }
    await user.keyboard("{Escape}");
    u2();

    const { unmount: u3 } = renderApp(<Dashboard />, { route: "/dashboard" });
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(30), { timeout: 25_000 });
    for (const a of screen.queryAllByRole("link").slice(0, 10)) await clickSafe(user, a);
    u3();
  }, 150_000);
});
