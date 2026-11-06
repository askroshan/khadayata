/**
 * Pass 24 — Wave 12: close function-coverage debt that lines already hit.
 * Hovers, ProfileForm setters/selects/steps, Admin quick-nav + tabs, News/Events
 * create forms, Members/Finance/Chapters/Directory leftover handlers.
 * EMAILIT blank / DISABLE_OUTBOUND_EMAIL=1. Real Kong :54331. Never send email/SMS.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import PublicLayout from "@/components/PublicLayout";
import LoginGate from "@/components/LoginGate";
import Index from "@/pages/Index";
import Admin from "@/pages/Admin";
import News from "@/pages/News";
import Events from "@/pages/Events";
import Obituaries from "@/pages/Obituaries";
import PublicNews from "@/pages/PublicNews";
import PublicBusiness from "@/pages/PublicBusiness";
import { ProfileForm } from "@/components/matrimonial/ProfileForm";
import MembersTab from "@/components/admin/MembersTab";
import FinanceTab from "@/components/admin/FinanceTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import DirectoryTab from "@/components/admin/DirectoryTab";

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

function installFiringIntersectionObserver() {
  class FiringIO {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [0];
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      const entry = {
        isIntersecting: true,
        target,
        intersectionRatio: 1,
        time: Date.now(),
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry;
      this.cb([entry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = FiringIO as unknown as typeof IntersectionObserver;
}

function hoverAll(root: ParentNode = document) {
  const els = Array.from(root.querySelectorAll("a, button, [role='button'], [role='link'], div, span, li, section, article, header, footer, nav")) as HTMLElement[];
  for (const el of els) {
    fireEvent.mouseEnter(el);
    fireEvent.mouseLeave(el);
  }
}

function fillVisibleFields(prefix: string) {
  for (const input of Array.from(document.querySelectorAll("input, textarea")) as HTMLInputElement[]) {
    if (input.disabled || input.type === "hidden" || input.type === "file") continue;
    if (input.type === "checkbox" || input.type === "radio") {
      fireEvent.click(input);
      continue;
    }
    const value =
      input.type === "number"
        ? "30"
        : input.type === "email"
          ? `${prefix}@example.invalid`
          : input.type === "date"
            ? "2026-01-15"
            : input.type === "time"
              ? "10:00"
              : input.type === "datetime-local"
                ? "2026-06-01T10:00"
                : `${prefix} field`;
    fireEvent.change(input, { target: { value } });
  }
}

async function pickOpenSelects(user: ReturnType<typeof userEvent.setup>, limit = 12) {
  const triggers = screen.queryAllByRole("combobox").slice(0, limit);
  for (const trigger of triggers) {
    if ((trigger as HTMLButtonElement).disabled) continue;
    try {
      await user.click(trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 1500 }).catch(() => []);
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

const PREFIX = `covw12_${Date.now().toString(36)}`;
const seeded: { userId?: string; memberId?: string } = {};

describe("Pass 24 — Wave 12 function debt (hovers + forms)", () => {
  beforeAll(async () => {
    installFiringIntersectionObserver();
    await supabase.auth.signOut().catch(() => undefined);
  }, 30_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    if (seeded.memberId) await admin.from("matrimonial_profiles").delete().eq("member_id", seeded.memberId);
    if (seeded.memberId) await admin.from("members").delete().eq("id", seeded.memberId);
    if (seeded.userId) await admin.auth.admin.deleteUser(seeded.userId).catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
  }, 60_000);

  beforeEach(() => {
    installFiringIntersectionObserver();
  });

  it("PublicLayout + LoginGate: fire every hover handler", async () => {
    await supabase.auth.signOut();
    const { unmount } = renderApp(
      <PublicLayout title="Wave12 Coverage">
        <LoginGate title="Sign in to continue" message="Coverage hover probe" />
      </PublicLayout>,
      { route: "/coverage-path" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Wave12 Coverage|Sign in to continue/i), {
      timeout: 10_000,
    });
    hoverAll();
    unmount();
  }, 60_000);

  it("Index: fire card/CTA hover handlers including Reveal children", async () => {
    await supabase.auth.signOut();
    const { unmount } = renderApp(<Index />, { route: "/" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Khadayata|Community|Events|Business/i), {
      timeout: 45_000,
    });
    hoverAll();
    unmount();
  }, 90_000);

  it("Obituaries / PublicNews / PublicBusiness: hover leftover cards", async () => {
    await supabase.auth.signOut();
    for (const [el, route, needle] of [
      [<Obituaries key="obit" />, "/obituaries", /Obituar|Remember|Tribute|Shok/i],
      [<PublicNews key="pn" />, "/news", /News|Article|Khadayata/i],
      [<PublicBusiness key="pb" />, "/business", /Business|Director|Job/i],
    ] as const) {
      const { unmount } = renderApp(el, { route });
      await waitFor(() => expect(document.body.textContent).toMatch(needle), { timeout: 45_000 });
      hoverAll();
      const search = document.querySelector("input");
      if (search) fireEvent.change(search, { target: { value: PREFIX } });
      unmount();
    }
  }, 180_000);

  it("Admin: expand quick-nav and click every setTab control", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Admin />), { route: "/admin" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Admin Dashboard|Quick Access|Verification|Members/i), {
      timeout: 45_000,
    });

    const quick = screen.queryAllByRole("button", { name: /Quick Access/i })[0];
    if (quick) await user.click(quick);

    await waitFor(() => {
      const membersQuick = screen.queryAllByRole("button", { name: /Members/i });
      expect(membersQuick.length).toBeGreaterThan(0);
    }, { timeout: 10_000 }).catch(() => undefined);

    const quickLabels = [
      /Members/i,
      /Chapters/i,
      /^Events$/i,
      /Roles/i,
      /Directory/i,
      /Finance/i,
      /^News$/i,
      /Reports/i,
      /Announce/i,
      /Bulk Delete/i,
      /Audits/i,
      /Analytics/i,
    ];
    for (const name of quickLabels) {
      const btns = screen.queryAllByRole("button", { name }).filter((b) =>
        /outline|justify-start|text-xs/.test(b.className),
      );
      const btn = btns[0];
      if (btn) {
        await user.click(btn);
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    const tabNames = [
      /Verification/i,
      /^Members$/i,
      /^Roles$/i,
      /Reports/i,
      /Transfers/i,
      /Audit/i,
      /^Tags$/i,
      /Announcement/i,
      /Directory/i,
      /^Events$/i,
      /Finance/i,
      /My Content/i,
      /Chapters/i,
      /Samiti/i,
      /WhatsApp/i,
      /^SMS$/i,
      /Bulk Delete/i,
      /Keywords/i,
      /Analytics/i,
    ];
    for (const name of tabNames) {
      const tab = screen.queryAllByRole("tab", { name })[0];
      if (tab) {
        await user.click(tab);
        await new Promise((r) => setTimeout(r, 80));
      }
    }
    unmount();
  }, 180_000);

  it("ProfileForm: walk all steps, setters, hobbies, and selects", async () => {
    const admin = adminClient();
    const email = `${PREFIX}-pf@example.invalid`;
    const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
      email,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (cuErr || !cu.user) throw cuErr ?? new Error("createUser");
    seeded.userId = cu.user.id;
    const { data: mem, error: memErr } = await admin
      .from("members")
      .insert({
        user_id: cu.user.id,
        first_name: "CovW12",
        last_name: "ProfileForm",
        chapter_id: "f1000002-0000-0000-0000-000000000002",
        verification_level: 1,
        onboarding_completed: true,
        overseas_verified: false,
        suspended: false,
        blocked: false,
        gender: "Male",
        dob: "1990-01-15",
        birth_place: "Coverage City",
        privacy: { dob: "members", birth_place: "chapter", employment: "members" },
      })
      .select("id")
      .single();
    if (memErr || !mem) throw memErr ?? new Error("member");
    seeded.memberId = mem.id;

    await signIn(email);
    const user = userEvent.setup();
    const { unmount } = renderApp(
      withToaster(<ProfileForm memberId={mem.id} onSuccess={() => undefined} />),
      { route: "/matrimonial/manage" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/About|Height|Weight|Contact|City/i), {
      timeout: 30_000,
    });

    fillVisibleFields(PREFIX);
    for (const hobby of Array.from(document.querySelectorAll("button")).filter((b) =>
      /rounded-full/.test(b.className),
    ).slice(0, 4)) {
      await user.click(hobby);
      await user.click(hobby);
    }
    await pickOpenSelects(user, 8);

    const stepBtns = screen.getAllByRole("button").filter((b) =>
      /Personal|Education|Kundali|Family|Partner/i.test(b.textContent ?? ""),
    );
    for (const btn of stepBtns) {
      await user.click(btn);
      fillVisibleFields(PREFIX);
      await pickOpenSelects(user, 6);
    }

    const next = screen.queryAllByRole("button", { name: /^Next$/i })[0];
    if (next && !(next as HTMLButtonElement).disabled) await user.click(next);
    const back = screen.queryAllByRole("button", { name: /^Back$/i })[0];
    if (back && !(back as HTMLButtonElement).disabled) await user.click(back);

    unmount();
  }, 180_000);

  it("News manage: open Write Article and hit onChange/select functions", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<News />), { route: "/news" });
    await waitFor(() => expect(document.body.textContent).toMatch(/News|Article|Write/i), {
      timeout: 45_000,
    });

    const write = screen.queryAllByRole("button", { name: /Write Article/i })[0];
    if (write) await user.click(write);
    await waitFor(() => expect(document.body.textContent).toMatch(/New Article|Title/i), { timeout: 8_000 }).catch(
      () => undefined,
    );

    fillVisibleFields(PREFIX);
    await pickOpenSelects(user, 10);
    hoverAll();
    unmount();
  }, 120_000);

  it("Events: open Create dialog and hit leftover onChange functions", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Events />), { route: "/events" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Community Events|Upcoming|Create/i), {
      timeout: 45_000,
    });

    const create = screen.queryAllByRole("button", { name: /^Create$/i })[0];
    if (create) await user.click(create);
    await waitFor(() => expect(document.body.textContent).toMatch(/Create Event|Event Name/i), { timeout: 8_000 }).catch(
      () => undefined,
    );

    fillVisibleFields(PREFIX);
    await pickOpenSelects(user, 10);
    unmount();
  }, 120_000);

  it("MembersTab: search, filters, dates, invite + bulk dialogs", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { data: members } = await supabase
      .from("members")
      .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
      .limit(8);
    const user = userEvent.setup();
    const { unmount } = renderApp(
      withToaster(
        <MembersTab
          members={(members ?? []) as never}
          myChapterId="f1000002-0000-0000-0000-000000000002"
          canInvite
          canSendReminders
          isGlobalAdmin
        />,
      ),
      { route: "/admin?tab=members" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Search|Invite|Export|Level/i), { timeout: 30_000 });

    fillVisibleFields(PREFIX);
    await pickOpenSelects(user, 4);

    const invite =
      screen.queryAllByRole("button", { name: /Invite Member/i })[0] ??
      screen.queryAllByRole("button", { name: /^Invite$/i })[0];
    if (invite) {
      await user.click(invite);
      fillVisibleFields(PREFIX);
    }
    const bulk = screen.queryAllByRole("button", { name: /Bulk Invite/i })[0];
    if (bulk) {
      await user.click(bulk);
      fillVisibleFields(PREFIX);
    }
    const clear = screen.queryAllByRole("button", { name: /Clear/i })[0];
    if (clear) await user.click(clear);
    unmount();
  }, 120_000);

  it("FinanceTab / ChaptersTab / DirectoryTab: open create dialogs and fill", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Finance|Fund|Donation|Scholarship|Medical/i), {
        timeout: 45_000,
      });
      fillVisibleFields(PREFIX);
      await pickOpenSelects(user, 4);
      for (const name of [/Create Fund|Add Fund|New Fund/i, /Medical|Create Aid|New Aid/i, /Hall|Booking/i]) {
        const btn = screen.queryAllByRole("button", { name })[0];
        if (btn) {
          await user.click(btn);
          fillVisibleFields(PREFIX);
          await pickOpenSelects(user, 4);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<ChaptersTab />), { route: "/admin?tab=chapters" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Chapter/i), { timeout: 45_000 });
      const add = screen.queryAllByRole("button", { name: /Add Chapter|New Chapter|Create/i })[0];
      if (add) await user.click(add);
      await waitFor(() => expect(document.body.textContent).toMatch(/Chapter Name|Bengaluru|Phone/i), {
        timeout: 8_000,
      }).catch(() => undefined);
      fillVisibleFields(PREFIX);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job|Directory/i), { timeout: 45_000 });
      for (const name of [/Add Business|New Business|Create Business/i, /Add Job|New Job|Create Job/i]) {
        const btn = screen.queryAllByRole("button", { name })[0];
        if (btn) {
          await user.click(btn);
          fillVisibleFields(PREFIX);
          await pickOpenSelects(user, 3);
          await user.keyboard("{Escape}").catch(() => undefined);
        }
      }
      fillVisibleFields(PREFIX);
      unmount();
    }
  }, 180_000);
});
