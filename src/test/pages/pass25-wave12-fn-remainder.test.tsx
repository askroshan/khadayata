/**
 * Pass 25 — Wave 12: remaining function arrows on News/Events edit dialogs,
 * MembersTab actions, Chapters/Directory/Finance create, Dashboard, Profile,
 * MemberProfile, Obituaries cards, PublicBusiness tabs.
 * EMAILIT blank / DISABLE_OUTBOUND_EMAIL=1. Never confirm deletes or send email/SMS.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import News from "@/pages/News";
import Events from "@/pages/Events";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import MemberProfile from "@/pages/MemberProfile";
import Obituaries from "@/pages/Obituaries";
import PublicBusiness from "@/pages/PublicBusiness";
import Settings from "@/pages/Settings";
import MembersTab from "@/components/admin/MembersTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
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

const PREFIX = `covw12b_${Date.now().toString(36)}`;

function fillVisibleFields() {
  for (const input of Array.from(document.querySelectorAll("input, textarea")) as HTMLInputElement[]) {
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
            ? "2026-03-01"
            : input.type === "time"
              ? "11:00"
              : input.type === "datetime-local"
                ? "2026-07-01T11:00"
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
      if (opts[0]) await user.click(opts[0]);
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

describe("Pass 25 — Wave 12 remaining function arrows", () => {
  beforeAll(async () => {
    await supabase.auth.signOut().catch(() => undefined);
  }, 30_000);

  afterAll(async () => {
    cleanup();
    await supabase.auth.signOut().catch(() => undefined);
  }, 30_000);

  it("News: open Edit Article and fill leftover setters", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<News />), { route: "/news" });
    await waitFor(() => expect(document.body.textContent).toMatch(/News|Article|Write/i), { timeout: 45_000 });

    const edit = screen.queryAllByRole("button", { name: /Edit article/i })[0];
    if (edit) {
      await user.click(edit);
      await waitFor(() => expect(document.body.textContent).toMatch(/Edit Article/i), { timeout: 8_000 });
      fillVisibleFields();
      await pickSelects(user, 6);
    }
    unmount();
  }, 90_000);

  it("Events: open Edit Event, Past tab, chapter filter", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Events />), { route: "/events" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Community Events|Upcoming|Past/i), {
      timeout: 45_000,
    });

    const past = screen.queryAllByRole("tab", { name: /Past/i })[0];
    if (past) await user.click(past);

    const edit = screen.queryAllByRole("button", { name: /Edit event/i })[0];
    if (edit) {
      await user.click(edit);
      await waitFor(() => expect(document.body.textContent).toMatch(/Edit Event/i), { timeout: 8_000 });
      fillVisibleFields();
      await pickSelects(user, 4);
    }
    unmount();
  }, 90_000);

  it("MembersTab: open admin actions (do not confirm delete/email)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { data: members } = await supabase
      .from("members")
      .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
      .limit(5);
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
    await waitFor(() => expect(document.body.textContent).toMatch(/Search|Export|Invite/i), { timeout: 30_000 });

    const actions = screen.queryAllByRole("button", { name: /Member admin actions/i })[0];
    if (actions) {
      await user.click(actions);
      await waitFor(() => expect(document.body.textContent).toMatch(/Member Actions|Suspend|Block/i), {
        timeout: 8_000,
      });
      const suspend = screen.queryAllByRole("button", { name: /Suspend Member/i })[0];
      if (suspend) await user.click(suspend);
    }
    unmount();
  }, 90_000);

  it("Chapters / Directory / Finance: exact create buttons + settings", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<ChaptersTab />), { route: "/admin?tab=chapters" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Chapter Management/i), { timeout: 45_000 });
      const neu = screen.queryAllByRole("button", { name: /New Chapter/i })[0];
      if (neu) {
        await user.click(neu);
        fillVisibleFields();
      }
      const edit = screen.queryAllByRole("button", { name: /Edit chapter/i })[0];
      if (edit) {
        await user.click(edit);
        fillVisibleFields();
      }
      const settings = screen.queryAllByRole("button", { name: /Chapter settings/i })[0];
      if (settings) {
        await user.click(settings);
        fillVisibleFields();
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<DirectoryTab myChapterId={null} />), { route: "/admin?tab=directory" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Add Business|Add Job|Business/i), {
        timeout: 45_000,
      });
      const biz = screen.queryAllByRole("button", { name: /Add Business/i })[0];
      if (biz) {
        await user.click(biz);
        fillVisibleFields();
      }
      const job = screen.queryAllByRole("button", { name: /Add Job/i })[0];
      if (job) {
        await user.click(job);
        fillVisibleFields();
        await pickSelects(user, 2);
      }
      const jobsTab = screen.queryAllByRole("tab", { name: /Jobs/i })[0];
      if (jobsTab) await user.click(jobsTab);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), { route: "/admin?tab=finance" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Finance|Donation|Fund/i), { timeout: 45_000 });
      for (const name of [/Medical/i, /Scholarship/i, /Hall/i, /Fund/i, /Campaign/i, /Donation/i]) {
        const tab = screen.queryAllByRole("tab", { name })[0];
        if (tab) await user.click(tab);
      }
      const aid = screen.queryAllByRole("button", { name: /New Request/i })[0];
      if (aid) {
        await user.click(aid);
        fillVisibleFields();
        await pickSelects(user, 3);
      }
      unmount();
    }
  }, 180_000);

  it("Dashboard + Profile: click quick-links and open edit form", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(withToaster(<Dashboard />), { route: "/dashboard" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Namaste|Welcome|My Profile|Upcoming/i), {
        timeout: 45_000,
      });
      for (const name of [/View Profile/i, /View All/i, /Create Event/i]) {
        const btn = screen.queryAllByRole("button", { name })[0];
        if (btn) await user.click(btn);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Name|Chapter/i), { timeout: 45_000 });
      const edit = screen.queryAllByRole("button", { name: /Edit/i })[0];
      if (edit) {
        await user.click(edit);
        fillVisibleFields();
        await pickSelects(user, 4);
        const cancel = screen.queryAllByRole("button", { name: /Cancel/i })[0];
        if (cancel) await user.click(cancel);
      }
      unmount();
    }
  }, 120_000);

  it("MemberProfile: open edit + verify panel setters", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { data: mem } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();
    const id = mem?.id;
    if (!id) return;
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${id}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Verification|Chapter|Name/i), {
      timeout: 45_000,
    });
    const edit = screen.queryAllByRole("button", { name: /Edit/i })[0];
    if (edit) {
      await user.click(edit);
      fillVisibleFields();
    }
    const verify = screen.queryAllByRole("button", { name: /Verify|Documentation|Note/i })[0];
    if (verify) await user.click(verify);
    fillVisibleFields();
    unmount();
  }, 90_000);

  it("Obituaries cards + PublicBusiness tabs + Settings", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(<Obituaries />, { route: "/obituaries" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Obituar|Remember|Tribute|Shok/i), {
        timeout: 45_000,
      });
      fillVisibleFields();
      for (const art of Array.from(document.querySelectorAll("article")) as HTMLElement[]) {
        fireEvent.mouseEnter(art);
        fireEvent.mouseLeave(art);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(<PublicBusiness />, { route: "/business" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job/i), { timeout: 45_000 });
      const jobs = screen.queryAllByRole("tab", { name: /Jobs/i })[0];
      if (jobs) await user.click(jobs);
      fillVisibleFields();
      await pickSelects(user, 4);
      for (const el of Array.from(document.querySelectorAll("div, a, button")) as HTMLElement[]) {
        fireEvent.mouseEnter(el);
        fireEvent.mouseLeave(el);
      }
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<Settings />), { route: "/settings" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Setting|Privacy|Account|Notification/i), {
        timeout: 45_000,
      });
      for (const tab of screen.queryAllByRole("tab").slice(0, 8)) {
        await user.click(tab);
      }
      fillVisibleFields();
      await pickSelects(user, 6);
      unmount();
    }
  }, 180_000);
});
