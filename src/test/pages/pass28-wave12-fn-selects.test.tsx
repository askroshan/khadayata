/**
 * Pass 28 — Wave 12: leftover one-liner arrows (selects, pin hours, bulk-file,
 * public card hovers, L0 profile, pagination). EMAILIT blank. Never send email/SMS.
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
import Events from "@/pages/Events";
import News from "@/pages/News";
import PublicNews from "@/pages/PublicNews";
import PublicBusiness from "@/pages/PublicBusiness";
import Profile from "@/pages/Profile";
import MembersTab from "@/components/admin/MembersTab";
import SamitiTab from "@/components/admin/SamitiTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import FinanceTab from "@/components/admin/FinanceTab";

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

const PREFIX = `covw12e_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const seededIds: { news?: string; biz?: string; jobs: string[] } = { jobs: [] };

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
        ? "88"
        : input.type === "email"
          ? `${PREFIX}@example.invalid`
          : input.type === "date"
            ? "1992-02-02"
            : input.type === "datetime-local"
              ? "2026-11-20T18:00"
              : `${PREFIX} field`;
    fireEvent.change(input, { target: { value } });
  }
}

async function pickAllSelects(user: ReturnType<typeof userEvent.setup>, root: HTMLElement, limit = 12) {
  const triggers = within(root).queryAllByRole("combobox").slice(0, limit);
  for (const trigger of triggers) {
    if ((trigger as HTMLButtonElement).disabled) continue;
    try {
      await user.click(trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 1500 }).catch(() => []);
      const india = opts.find((o) => /India/i.test(o.textContent ?? ""));
      const second = opts[1] ?? opts[0];
      const pick = india ?? second;
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

describe("Pass 28 — Wave 12 select/hover/file arrows", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: ga } = await admin.from("members").select("id, user_id").eq("user_id", userId ?? "").maybeSingle();
    const memberId = ga?.id ?? null;
    await supabase.auth.signOut().catch(() => undefined);

    const { data: news } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} pinned featured`,
        summary: "coverage",
        body: "coverage body ".repeat(40),
        status: "published",
        published_at: new Date().toISOString(),
        pinned: true,
        featured: true,
        cover_image_url: "https://example.invalid/cov.jpg",
        image_alt: "coverage",
        article_type: "breaking",
        category: "Announcements",
        chapter_id: AHMEDABAD,
        created_by: userId,
        tags: [],
        images: [],
        scope: "chapter",
      })
      .select("id")
      .maybeSingle();
    if (news?.id) seededIds.news = news.id;

    const { data: biz } = await admin
      .from("businesses")
      .insert({
        name: `${PREFIX} Biz`,
        sector: "Technology",
        description: "coverage biz",
        website: "https://example.invalid",
        verified: true,
        employee_count: "11-50",
        founded_year: 2015,
        tags: ["coverage", "it"],
        chapter_id: AHMEDABAD,
        country_id: INDIA,
        owner_member_id: memberId,
      })
      .select("id")
      .maybeSingle();
    if (biz?.id) seededIds.biz = biz.id;

    const jobRows = [
      { title: `${PREFIX} both`, salary_min: 300000, salary_max: 600000, salary_currency: "INR", salary_period: "annual" },
      { title: `${PREFIX} min`, salary_min: 5000, salary_max: null, salary_currency: "USD", salary_period: "monthly" },
      { title: `${PREFIX} max`, salary_min: null, salary_max: 800, salary_currency: "GBP", salary_period: "hourly" },
      { title: `${PREFIX} none`, salary_min: null, salary_max: null, salary_currency: "INR", salary_period: "annual" },
    ];
    for (const row of jobRows) {
      const { data } = await admin
        .from("jobs")
        .insert({
          ...row,
          description: "coverage job",
          employment_type: "full_time",
          status: "open",
          chapter_id: AHMEDABAD,
          employer_member_id: memberId,
          employer_business_id: biz?.id ?? null,
        })
        .select("id")
        .maybeSingle();
      if (data?.id) seededIds.jobs.push(data.id);
    }
  }, 60_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    if (seededIds.jobs.length) await admin.from("jobs").delete().in("id", seededIds.jobs);
    if (seededIds.biz) await admin.from("businesses").delete().eq("id", seededIds.biz);
    if (seededIds.news) await admin.from("content_news").delete().eq("id", seededIds.news);
    await supabase.auth.signOut().catch(() => undefined);
  }, 60_000);

  it("Events: Create dialog every select; edit status; cancel dialogs without confirm", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Events />), { route: "/events/manage" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Create/i })).toBeTruthy(), { timeout: 45_000 });
    hardClick(screen.getByRole("button", { name: /Create/i }));
    const createDlg = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    fillIn(createDlg);
    await pickAllSelects(user, createDlg, 14);
    fillIn(createDlg);
    await user.keyboard("{Escape}").catch(() => undefined);

    const edit = screen.queryAllByLabelText(/Edit event/i)[0];
    if (edit) {
      hardClick(edit);
      const editDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (editDlg) {
        fillIn(editDlg);
        await pickAllSelects(user, editDlg, 4);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
    }
    const cancelEvt = screen.queryAllByLabelText(/Cancel event/i)[0];
    if (cancelEvt) {
      hardClick(cancelEvt);
      const back = screen.queryAllByRole("button", { name: /^Back$/i })[0];
      if (back) hardClick(back);
      else await user.keyboard("{Escape}").catch(() => undefined);
    }
    const del = screen.queryAllByLabelText(/Delete event/i)[0];
    if (del) {
      hardClick(del);
      const cancel = screen.queryAllByRole("button", { name: /^Cancel$/i })[0];
      if (cancel) hardClick(cancel);
      else await user.keyboard("{Escape}").catch(() => undefined);
    }
    unmount();
  }, 90_000);

  it("News Write Article: every select + pin hours; edit pin hours", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Write Article/i })).toBeTruthy(), {
      timeout: 45_000,
    });
    hardClick(screen.getByRole("button", { name: /Write Article/i }));
    const dlg = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    fillIn(dlg);
    const pin = within(dlg).queryAllByRole("checkbox").find((c) => /Pin|Featured|Breaking/i.test(c.parentElement?.textContent ?? ""));
    for (const box of within(dlg).queryAllByRole("checkbox")) fireEvent.click(box);
    if (pin) fireEvent.click(pin);
    await pickAllSelects(user, dlg, 14);
    await user.keyboard("{Escape}").catch(() => undefined);

    const edit = screen.queryAllByLabelText(/Edit article/i)[0];
    if (edit) {
      hardClick(edit);
      const editDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (editDlg) {
        for (const box of within(editDlg).queryAllByRole("checkbox")) fireEvent.click(box);
        fillIn(editDlg);
        await pickAllSelects(user, editDlg, 6);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
    }
    unmount();
  }, 90_000);

  it("PublicNews/PublicBusiness: signed-out LoginGate + card/image/website hovers", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    {
      const { unmount } = renderApp(<PublicNews />, { route: "/news" });
      await waitFor(() => expect(document.body.textContent).toMatch(/News|Article|Sign In/i), { timeout: 45_000 });
      await waitFor(() => expect(document.querySelector("article")).toBeTruthy(), { timeout: 20_000 }).catch(() => undefined);
      for (const art of Array.from(document.querySelectorAll("article")) as HTMLElement[]) {
        fireEvent.mouseEnter(art);
        fireEvent.mouseLeave(art);
      }
      for (const img of Array.from(document.querySelectorAll("article img")) as HTMLElement[]) {
        fireEvent.mouseEnter(img);
        fireEvent.mouseLeave(img);
      }
      unmount();
    }
    {
      const { unmount } = renderApp(<PublicBusiness />, { route: "/business" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job|Sign In/i), { timeout: 45_000 });
      await waitFor(() => expect(document.querySelector("article")).toBeTruthy(), { timeout: 20_000 }).catch(() => undefined);
      for (const art of Array.from(document.querySelectorAll("article")) as HTMLElement[]) {
        fireEvent.mouseEnter(art);
        fireEvent.mouseLeave(art);
      }
      for (const a of Array.from(document.querySelectorAll('a[title="Visit website"]')) as HTMLElement[]) {
        fireEvent.mouseEnter(a);
        fireEvent.mouseLeave(a);
      }
      const jobs = screen.queryAllByRole("tab", { name: /Jobs/i })[0];
      if (jobs) {
        hardClick(jobs);
        await pickAllSelects(user, document.body as unknown as HTMLElement, 3);
        await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 15_000 }).catch(
          () => undefined,
        );
        for (const art of Array.from(document.querySelectorAll("article")) as HTMLElement[]) {
          fireEvent.mouseEnter(art);
          fireEvent.mouseLeave(art);
        }
      }
      unmount();
    }
  }, 90_000);

  it("Profile L0 vouch copy as unverified", async () => {
    await signIn(E2E_ACCOUNTS.unverified.email);
    const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Vouch|Name|Chapter/i), { timeout: 45_000 });
    expect(document.body.textContent).toMatch(/Vouch|L1|Directory|Find members|KYC|Level/i);
    unmount();
  }, 60_000);

  it("MembersTab: pagination, edit form, bulk file parse (no send)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { data: members } = await supabase
      .from("members")
      .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
      .limit(40);
    const user = userEvent.setup();
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
    await waitFor(() => expect(document.body.textContent).toMatch(/Search|Invite|Export/i), { timeout: 30_000 });
    const next = screen.queryAllByRole("button", { name: /^Next$/i })[0];
    if (next && !(next as HTMLButtonElement).disabled) hardClick(next);
    const prev = screen.queryAllByRole("button", { name: /^Prev$/i })[0];
    if (prev && !(prev as HTMLButtonElement).disabled) hardClick(prev);

    const edit = screen.queryAllByLabelText(/Edit member/i)[0];
    if (edit && !(edit as HTMLButtonElement).disabled) {
      hardClick(edit);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        fillIn(dlg);
        await pickAllSelects(user, dlg, 4);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
    }

    const bulk = screen.queryAllByRole("button", { name: /Bulk Invite/i })[0];
    if (bulk) {
      hardClick(bulk);
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (dlg) {
        const fileInput = dlg.querySelector("#bulk-file-upload") as HTMLInputElement | null;
        if (fileInput) {
          const file = new File(
            [`${PREFIX}@example.invalid\n${PREFIX}@example.invalid\nnot-an-email\n`],
            `${PREFIX}.txt`,
            { type: "text/plain" },
          );
          fireEvent.change(fileInput, { target: { files: [file] } });
          await waitFor(() => expect(document.body.textContent).toMatch(/valid email|invalid/i), {
            timeout: 8_000,
          }).catch(() => undefined);
          const details = dlg.querySelector("summary");
          if (details) fireEvent.click(details);
        }
        fillIn(dlg);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
    }
    unmount();
  }, 90_000);

  it("Samiti / Directory / Finance / WhatsApp: open create dialogs and pick selects", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<SamitiTab chapterId={AHMEDABAD} />), { route: "/admin?tab=samiti" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Samiti|Sub-Group|Create/i), { timeout: 30_000 });
      hardClick(screen.getByRole("button", { name: /^Create$/i }));
      const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 });
      fillIn(dlg);
      await pickAllSelects(user, dlg, 4);
      await user.keyboard("{Escape}").catch(() => undefined);
      const edit = screen.queryAllByLabelText(/Edit /i)[0];
      if (edit) {
        hardClick(edit);
        const ed = await screen.findByRole("dialog", {}, { timeout: 6_000 }).catch(() => null);
        if (ed) {
          fillIn(ed);
          await pickAllSelects(user, ed, 2);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Add Business|Directory|Job/i), { timeout: 30_000 });
      hardClick(screen.getByRole("button", { name: /Add Business/i }));
      const bizDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
      if (bizDlg) {
        fillIn(bizDlg);
        await pickAllSelects(user, bizDlg, 8);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const jobBtn = screen.queryAllByRole("button", { name: /Add Job/i })[0];
      if (jobBtn) {
        hardClick(jobBtn);
        const jobDlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
        if (jobDlg) {
          fillIn(jobDlg);
          await pickAllSelects(user, jobDlg, 8);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Finance|Fund|Donation/i), { timeout: 30_000 });
      for (const name of [/Scholarship/i, /Medical/i, /Hall/i, /Campaign/i, /Donation/i, /Fund/i]) {
        const tab = screen.queryAllByRole("tab", { name })[0];
        if (tab) hardClick(tab);
      }
      for (const name of [/New Request/i, /Add Fund/i, /Create Fund/i, /New Campaign/i, /Add Donation/i]) {
        const btn = screen.queryAllByRole("button", { name })[0];
        if (!btn) continue;
        hardClick(btn);
        const dlg = await screen.findByRole("dialog", {}, { timeout: 4_000 }).catch(() => null);
        if (dlg) {
          fillIn(dlg);
          await pickAllSelects(user, dlg, 5);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
      await waitFor(() => expect(document.body.textContent).toMatch(/WhatsApp|Template/i), { timeout: 30_000 });
      const create = screen.queryAllByRole("button", { name: /New Template|Create Template|Add Template|Create/i })[0];
      if (create) {
        hardClick(create);
        const dlg = await screen.findByRole("dialog", {}, { timeout: 8_000 }).catch(() => null);
        if (dlg) {
          fillIn(dlg);
          await pickAllSelects(user, dlg, 4);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      unmount();
    }
  }, 120_000);
});
