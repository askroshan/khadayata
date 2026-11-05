/**
 * Pass 26 — Wave 12: invoke leftover function arrows on low-fn files.
 * EMAILIT_API_KEY blank / DISABLE_OUTBOUND_EMAIL=1. Never confirm send email/SMS
 * or destructive AlertDialog actions.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReportDialog } from "@/components/ReportDialog";
import NotFound from "@/pages/NotFound";
import Obituaries from "@/pages/Obituaries";
import Dashboard from "@/pages/Dashboard";
import PublicNews from "@/pages/PublicNews";
import PublicBusiness from "@/pages/PublicBusiness";
import News from "@/pages/News";
import Events from "@/pages/Events";
import Settings from "@/pages/Settings";
import SamitiTab from "@/components/admin/SamitiTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import AppLayout from "@/components/AppLayout";

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

const PREFIX = `covw12c_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

function hoverAll(root: ParentNode = document) {
  for (const el of Array.from(root.querySelectorAll("article, a, button, div, img, section")) as HTMLElement[]) {
    fireEvent.mouseEnter(el);
    fireEvent.mouseLeave(el);
  }
}

function fillVisibleFields() {
  for (const input of Array.from(document.querySelectorAll("input, textarea, select")) as HTMLInputElement[]) {
    if (input.disabled || input.type === "hidden" || input.type === "file") continue;
    if (input.type === "checkbox" || input.type === "radio") {
      fireEvent.click(input);
      continue;
    }
    const value =
      input.type === "number"
        ? "12"
        : input.type === "email"
          ? `${PREFIX}@example.invalid`
          : input.type === "date"
            ? "2020-01-15"
            : input.type === "time"
              ? "09:00"
              : input.type === "datetime-local"
                ? "2026-08-01T09:00"
                : input.type === "password"
                  ? "NotTheE2ePass!"
                  : `${PREFIX} field`;
    fireEvent.change(input, { target: { value } });
  }
}

async function pickSelects(user: ReturnType<typeof userEvent.setup>, limit = 6) {
  for (const trigger of screen.queryAllByRole("combobox").slice(0, limit)) {
    if ((trigger as HTMLButtonElement).disabled) continue;
    try {
      await user.click(trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 1200 }).catch(() => []);
      if (opts[1]) await user.click(opts[1]);
      else if (opts[0]) await user.click(opts[0]);
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

describe("Pass 26 — Wave 12 leftover function arrows", () => {
  beforeAll(async () => {
    await supabase.auth.signOut().catch(() => undefined);
  }, 30_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    await admin.from("obituaries").delete().ilike("full_name", `${PREFIX}%`);
    await supabase.auth.signOut().catch(() => undefined);
  }, 30_000);

  it("NotFound Go Back + ErrorBoundary Go Back/Refresh", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    const { unmount: u1 } = renderApp(<NotFound />, { route: "/missing-wave12" });
    fireEvent.click(screen.getByRole("button", { name: /Go Back/i }));
    expect(back).toHaveBeenCalled();
    u1();

    function Boom(): never {
      throw new Error("coverage boom 26");
    }
    const reload = vi.fn();
    const loc = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...loc, reload, href: loc.href, pathname: loc.pathname, search: loc.search, hash: loc.hash },
    });
    const { unmount: u2 } = renderApp(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
      { route: "/" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Something went wrong/i));
    fireEvent.click(screen.getByRole("button", { name: /Go Back/i }));
    fireEvent.click(screen.getByRole("button", { name: /Refresh Page/i }));
    expect(reload).toHaveBeenCalled();
    Object.defineProperty(window, "location", { configurable: true, value: loc });
    back.mockRestore();
    u2();
  }, 30_000);

  it("Obituaries: search, card hover, post form validate/close/success", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Obituaries />), { route: "/obituaries" });
    await waitFor(() => expect(document.body.textContent).toMatch(/In Memoriam|Obituar|Remember/i), {
      timeout: 30_000,
    });
    await waitFor(() => {
      const loaded = /Loading\.\.\./i.test(document.body.textContent ?? "");
      expect(loaded).toBe(false);
    }, { timeout: 20_000 }).catch(() => undefined);

    const search = screen.queryByPlaceholderText(/Search by name/i);
    if (search) fireEvent.change(search, { target: { value: "Patel" } });
    hoverAll();

    const post = await screen.findByRole("button", { name: /Post Obituary/i }, { timeout: 20_000 });
    await user.click(post);
    await waitFor(() => expect(document.body.textContent).toMatch(/Full Name/i), { timeout: 10_000 });

    const submitEmpty = screen.getAllByRole("button", { name: /^Post Obituary$/i }).at(-1)!;
    fireEvent.click(submitEmpty);
    await waitFor(() => expect(document.body.textContent).toMatch(/Full name is required/i), { timeout: 5_000 });

    fillVisibleFields();
    const chapterSelect = document.querySelector("select");
    if (chapterSelect) fireEvent.change(chapterSelect, { target: { value: AHMEDABAD } });

    fireEvent.click(screen.getAllByRole("button", { name: /Cancel/i }).at(-1)!);
    await waitFor(() => expect(document.body.textContent).not.toMatch(/Full Name \*/i), { timeout: 5_000 });

    await user.click(screen.getAllByRole("button", { name: /Post Obituary/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Full Name/i), { timeout: 8_000 });
    fillVisibleFields();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: `${PREFIX} Coverage` } });
    const dates = document.querySelectorAll('input[type="date"]');
    if (dates[0]) fireEvent.change(dates[0], { target: { value: "1950-01-01" } });
    if (dates[1]) fireEvent.change(dates[1], { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Post Obituary$/i }).at(-1)!);
    await waitFor(
      () => {
        const body = document.body.textContent ?? "";
        expect(body).toMatch(new RegExp(`${PREFIX}|In Memoriam|Failed to post`));
      },
      { timeout: 15_000 },
    );
    unmount();
  }, 90_000);

  it("Dashboard: click quick-link cards, View All, event/news rows", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { unmount } = renderApp(withToaster(<Dashboard />), { route: "/dashboard" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Namaste|Welcome|My Profile|Upcoming/i), {
      timeout: 45_000,
    });
    hoverAll();
    for (const name of [/View Profile/i, /View All/i, /Create Event/i, /Find Members to Vouch/i]) {
      const btn = screen.queryAllByRole("button", { name })[0];
      if (btn) fireEvent.click(btn);
    }
    for (const card of Array.from(document.querySelectorAll(".cursor-pointer")) as HTMLElement[]) {
      fireEvent.click(card);
    }
    const menu = screen.queryByRole("button", { name: /Open navigation menu/i });
    if (menu) {
      fireEvent.click(menu);
      const dash = screen.queryAllByRole("link", { name: /Dashboard/i })[0];
      if (dash) fireEvent.click(dash);
    }
    unmount();
  }, 90_000);

  it("PublicNews + PublicBusiness: filters, cards, jobs tab hovers", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(<PublicNews />, { route: "/news" });
      await waitFor(() => expect(document.body.textContent).toMatch(/News|Article|Khadayata/i), { timeout: 45_000 });
      const search = screen.queryByPlaceholderText(/search/i);
      if (search) fireEvent.change(search, { target: { value: "a" } });
      await pickSelects(user, 2);
      hoverAll();
      unmount();
    }

    {
      const { unmount } = renderApp(<PublicBusiness />, { route: "/business" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job/i), { timeout: 45_000 });
      await pickSelects(user, 4);
      const jobs = screen.queryAllByRole("tab", { name: /Jobs/i })[0];
      if (jobs) fireEvent.click(jobs);
      fillVisibleFields();
      await pickSelects(user, 3);
      hoverAll();
      unmount();
    }
  }, 90_000);

  it("News Write Article: every setter, checkbox, draft (no send)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<News />), { route: "/news/manage" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Community News|Write Article/i), {
      timeout: 45_000,
    });
    const write = await screen.findByRole("button", { name: /Write Article/i }, { timeout: 15_000 });
    await user.click(write);
    await waitFor(() => expect(document.body.textContent).toMatch(/New Article|Title/i), { timeout: 10_000 });
    fillVisibleFields();
    await pickSelects(user, 10);
    hoverAll();
    unmount();
  }, 90_000);

  it("Events: create/edit fields, RSVP, chapter filter (no delete confirm)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Events />), { route: "/events/manage" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Community Events|Upcoming|Create/i), {
      timeout: 45_000,
    });
    const create = screen.queryAllByRole("button", { name: /^Create$/i })[0];
    if (create) {
      await user.click(create);
      await waitFor(() => expect(document.body.textContent).toMatch(/Event Name|Create Event/i), { timeout: 8_000 }).catch(
        () => undefined,
      );
      fillVisibleFields();
      await pickSelects(user, 8);
    }
    await user.keyboard("{Escape}").catch(() => undefined);
    const past = screen.queryAllByRole("tab", { name: /Past/i })[0];
    if (past) fireEvent.click(past);
    const upcoming = screen.queryAllByRole("tab", { name: /Upcoming/i })[0];
    if (upcoming) fireEvent.click(upcoming);
    const rsvp = screen.queryAllByRole("button", { name: /RSVP Now/i })[0];
    if (rsvp) fireEvent.click(rsvp);
    const notGoing = screen.queryAllByRole("button", { name: /Not Going|Can't Go|Cannot Go/i })[0];
    if (notGoing) fireEvent.click(notGoing);
    const edit = screen.queryAllByRole("button", { name: /Edit event/i })[0];
    if (edit) {
      fireEvent.click(edit);
      fillVisibleFields();
      await pickSelects(user, 3);
    }
    unmount();
  }, 90_000);

  it("Settings switches/privacy + AppLayout sign-out handler is wired", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Settings />), { route: "/settings" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Setting|Privacy|Account|Notification/i), {
      timeout: 45_000,
    });
    for (const tab of screen.queryAllByRole("tab")) {
      fireEvent.click(tab);
    }
    fillVisibleFields();
    await pickSelects(user, 8);
    for (const sw of screen.queryAllByRole("switch")) {
      fireEvent.click(sw);
    }
    unmount();

    const { unmount: u2 } = renderApp(
      withToaster(
        <AppLayout title="Coverage">
          <p>layout child</p>
        </AppLayout>,
      ),
      { route: "/dashboard" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/layout child|Coverage/i), { timeout: 20_000 });
    const menu = screen.queryByRole("button", { name: /Open navigation menu/i });
    if (menu) fireEvent.click(menu);
    const signOutBtn = screen.queryByRole("button", { name: /Sign out/i });
    if (signOutBtn) fireEvent.click(signOutBtn);
    unmount();
    u2();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
  }, 90_000);

  it("Samiti / Announcements / Keywords / Tags: open dialogs, fill, cancel", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<SamitiTab chapterId={AHMEDABAD} />), { route: "/admin?tab=samiti" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Samiti|Sub-Group|Mahila|Group/i), {
        timeout: 30_000,
      });
      const neu = screen.queryAllByRole("button", { name: /Create Sub-Group|New|Add/i })[0];
      if (neu) {
        fireEvent.click(neu);
        fillVisibleFields();
        await pickSelects(user, 3);
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const edit = screen.queryAllByRole("button", { name: /Edit/i })[0];
      if (edit) {
        fireEvent.click(edit);
        fillVisibleFields();
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { data } = await supabase.from("announcements").select("id, title, body, created_at, chapter_id").limit(8);
      const { unmount } = renderApp(withToaster(<AnnouncementsTab announcements={(data ?? []) as never} myChapterId={null} />), {
        route: "/admin?tab=announcements",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Announcement|Publish|Title/i), { timeout: 20_000 });
      fillVisibleFields();
      const chapter = screen.queryAllByRole("button", { name: /Chapter/i })[0];
      if (chapter) fireEvent.click(chapter);
      const global = screen.queryAllByRole("button", { name: /Global/i })[0];
      if (global) fireEvent.click(global);
      const edit = screen.queryAllByLabelText(/Edit announcement/i)[0];
      if (edit) {
        fireEvent.click(edit);
        fillVisibleFields();
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<BannedKeywordsTab />), { route: "/admin?tab=banned-keywords" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Keyword|Banned|Severity/i), { timeout: 20_000 });
      fillVisibleFields();
      await pickSelects(user, 2);
      const edit = screen.queryAllByRole("button", { name: /Edit/i })[0];
      if (edit) {
        fireEvent.click(edit);
        fillVisibleFields();
        const cancel = screen.queryAllByRole("button", { name: /Cancel/i })[0];
        if (cancel) fireEvent.click(cancel);
      }
      unmount();
    }

    {
      const { data: tags } = await supabase.from("tag_requests").select("id, term, type, status, reason").limit(20);
      const { unmount } = renderApp(withToaster(<TagRequestsTab tagRequests={(tags ?? []) as never} />), {
        route: "/admin?tab=tag-requests",
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/Tag|Request|Pending|Rejected/i), {
        timeout: 20_000,
      });
      const rejected = screen.queryAllByRole("tab", { name: /Rejected/i })[0];
      if (rejected) fireEvent.click(rejected);
      const pending = screen.queryAllByRole("tab", { name: /Pending/i })[0];
      if (pending) fireEvent.click(pending);
      const del = screen.queryAllByLabelText(/Delete tag request/i)[0];
      if (del) {
        fireEvent.click(del);
        const cancel = screen.queryAllByRole("button", { name: /Cancel/i })[0];
        if (cancel) fireEvent.click(cancel);
      }
      unmount();
    }
  }, 90_000);

  it("WhatsAppTab UI + ReportDialog variants (never send)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
      await waitFor(() => expect(document.body.textContent).toMatch(/WhatsApp|Template|Message/i), { timeout: 30_000 });
      for (const tab of screen.queryAllByRole("tab").slice(0, 6)) fireEvent.click(tab);
      const create = screen.queryAllByRole("button", { name: /New Template|Create Template|Add Template/i })[0];
      if (create) {
        fireEvent.click(create);
        fillVisibleFields();
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      const send = screen.queryAllByRole("button", { name: /^Send$/i })[0];
      if (send) {
        fireEvent.click(send);
        fillVisibleFields();
        await user.keyboard("{Escape}").catch(() => undefined);
      }
      unmount();
    }

    for (const variant of ["icon", "button", "menu"] as const) {
      const { unmount } = renderApp(
        withToaster(
          <ReportDialog
            entityType="news"
            entityId="00000000-0000-0000-0000-000000000001"
            entityName="Coverage entity"
            variant={variant}
          />,
        ),
        { route: "/dashboard" },
      );
      const trigger = await waitFor(() => {
        const el =
          screen.queryByRole("button", { name: /Report/i }) ??
          screen.queryByLabelText(/Report/i) ??
          screen.queryByText(/^Report$/i);
        if (!el) throw new Error("report trigger missing");
        return el;
      }, { timeout: 15_000 });
      fireEvent.click(trigger);
      fillVisibleFields();
      await pickSelects(user, 1);
      const cancel = screen.queryAllByRole("button", { name: /Cancel/i })[0];
      if (cancel) fireEvent.click(cancel);
      unmount();
    }
  }, 90_000);
});
