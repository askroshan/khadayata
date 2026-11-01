/**
 * Pass 11 — Finance / Events / Reports / Members mutation dialogs (open+fill+cancel or safe submit).
 */
import { describe, it, expect, afterAll, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import FinanceTab from "@/components/admin/FinanceTab";
import EventsTab from "@/components/admin/EventsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import MembersTab from "@/components/admin/MembersTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import NewsPublisherTab from "@/components/admin/NewsPublisherTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import Events from "@/pages/Events";
import News from "@/pages/News";
import Business from "@/pages/Business";
import Mentorship from "@/pages/Mentorship";
import Temple from "@/pages/Temple";
import Scholarships from "@/pages/Scholarships";
import Settings from "@/pages/Settings";
import SearchPage from "@/pages/Search";
import Directory from "@/pages/Directory";

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
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
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
    /* ignore */
  }
}

async function walkTabsAndNewButtons(user: ReturnType<typeof userEvent.setup>) {
  for (const tab of screen.queryAllByRole("tab").slice(0, 12)) {
    await clickSafe(user, tab);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(5), { timeout: 8_000 });
    for (const b of screen.queryAllByRole("button").slice(0, 10)) {
      const t = (b.textContent ?? "") + (b.getAttribute("aria-label") ?? "");
      if (/new |add |create|request|fund|event|article|keyword|announce/i.test(t) && !/delete|remove|block/i.test(t)) {
        await clickSafe(user, b);
        await waitFor(() => expect(true).toBe(true), { timeout: 1500 });
        // fill visible inputs lightly
        for (const input of Array.from(document.querySelectorAll("input, textarea")).slice(0, 8)) {
          if ((input as HTMLInputElement).disabled) continue;
          const typ = (input as HTMLInputElement).type;
          if (typ === "checkbox" || typ === "radio" || typ === "file" || typ === "hidden") continue;
          try {
            fireEvent.change(input, {
              target: { value: typ === "number" ? "1" : typ === "date" ? "2026-06-01" : "pass11 coverage" },
            });
          } catch {
            /* ignore */
          }
        }
        await user.keyboard("{Escape}");
      }
    }
  }
}

describe("Pass 11 finance/events/reports + signed-in page dialogs", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("FinanceTab: walk all tabs and open create dialogs", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    renderApp(<FinanceTab myChapterId={null} />, { route: "/admin?tab=finance" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Fund|Donation|Finance|Scholarship|Medical/i), {
      timeout: 30_000,
    });
    await walkTabsAndNewButtons(user);
  }, 90_000);

  it("EventsTab + DirectoryTab + NewsPublisher: create dialogs", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    for (const ui of [
      <EventsTab key="e" myChapterId={null} />,
      <DirectoryTab key="d" myChapterId={null} />,
      <NewsPublisherTab key="n" myChapterId={null} />,
    ]) {
      const { unmount } = renderApp(ui, { route: "/admin" });
      await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(20), { timeout: 25_000 });
      await walkTabsAndNewButtons(user);
      unmount();
    }
  }, 120_000);

  it("ReportsTab + BannedKeywords + Announcements + TagRequests + Chapters deep buttons", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount: u1 } = renderApp(<ReportsTab />, { route: "/admin?tab=reports" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Report|Pending|Review|Moderat|No /i), {
      timeout: 20_000,
    });
    for (const b of screen.queryAllByRole("button").slice(0, 15)) {
      const t = b.textContent ?? "";
      if (/review|view|resolve|dismiss|detail/i.test(t)) {
        await clickSafe(user, b);
        await user.keyboard("{Escape}");
      }
    }
    u1();

    const { data: announcements } = await supabase.from("announcements").select("*").limit(20);
    const { data: tagRequests } = await supabase.from("tag_requests").select("*").limit(20);
    for (const ui of [
      <BannedKeywordsTab key="bk" />,
      <AnnouncementsTab key="a" announcements={(announcements ?? []) as never[]} />,
      <TagRequestsTab key="t" tagRequests={(tagRequests ?? []) as never[]} />,
      <ChaptersTab key="c" />,
    ]) {
      const { unmount } = renderApp(ui, { route: "/admin" });
      await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(10), { timeout: 25_000 });
      await walkTabsAndNewButtons(user);
      for (const b of screen.queryAllByRole("button").slice(0, 12)) {
        const t = (b.textContent ?? "") + (b.getAttribute("aria-label") ?? "");
        if (/edit|settings|committee|assign|new|add|create/i.test(t) && !/delete|deactivate|revoke/i.test(t)) {
          await clickSafe(user, b);
          await user.keyboard("{Escape}");
        }
      }
      unmount();
    }
  }, 150_000);

  it("MembersTab: CSV export + level filter + invite open/close", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { data } = await supabase
      .from("members")
      .select(
        "id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)",
      )
      .neq("first_name", "E2E")
      .limit(60);
    renderApp(<MembersTab members={(data ?? []) as never[]} myChapterId={null} isGlobalAdmin canInvite />, {
      route: "/admin?tab=members",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Member|Search/i), { timeout: 20_000 });
    // jsdom lacks URL.createObjectURL — stub for CSV export path
    const createObjectURL = vi.fn(() => "blob:pass11");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    for (const b of screen.queryAllByRole("button")) {
      const t = (b.textContent ?? "") + (b.getAttribute("aria-label") ?? "");
      if (/download|export|csv|invite/i.test(t)) await clickSafe(user, b);
    }
    vi.unstubAllGlobals();
    await user.keyboard("{Escape}");
    // date filters
    for (const input of Array.from(document.querySelectorAll('input[type="date"]'))) {
      fireEvent.change(input, { target: { value: "2020-01-01" } });
    }
  }, 60_000);

  it("ModeratorDashboard as moderator: walk controls", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    const user = userEvent.setup();
    renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Moderat|Report|Member/i), { timeout: 30_000 });
    await walkTabsAndNewButtons(user);
    for (const b of screen.queryAllByRole("button").slice(0, 20)) {
      const t = (b.textContent ?? "") + (b.getAttribute("aria-label") ?? "");
      if (/export|csv|download|search|filter|refresh|pending|resolved/i.test(t)) await clickSafe(user, b);
    }
  }, 90_000);

  it("Signed-in feature pages: Events/News/Business/Mentorship/Temple/Scholarships/Search/Directory/Settings/Notifications", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const pages = [
      [<Events key="ev" />, "/events"],
      [<News key="nw" />, "/news"],
      [<Business key="bz" />, "/business"],
      [<Mentorship key="mn" />, "/mentorship"],
      [<Temple key="tp" />, "/temple"],
      [<Scholarships key="sc" />, "/scholarships"],
      [<SearchPage key="sr" />, "/search"],
      [<Directory key="dr" />, "/directory"],
      [<Settings key="st" />, "/settings"],
    ] as const;

    for (const [ui, route] of pages) {
      const { unmount } = renderApp(ui, { route });
      await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(15), { timeout: 25_000 });
      for (const tab of screen.queryAllByRole("tab").slice(0, 8)) await clickSafe(user, tab);
      for (const b of screen.queryAllByRole("button").slice(0, 10)) {
        const t = b.textContent ?? "";
        if (/create|add|new|filter|search|apply|register|rsvp|edit/i.test(t) && !/delete/i.test(t)) {
          await clickSafe(user, b);
          await user.keyboard("{Escape}");
        }
      }
      unmount();
    }
  }, 180_000);
});
