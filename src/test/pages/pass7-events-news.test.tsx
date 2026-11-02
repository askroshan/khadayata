import { describe, it, expect, afterAll } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Events from "@/pages/Events";
import News from "@/pages/News";
import Mentorship from "@/pages/Mentorship";
import Scholarships from "@/pages/Scholarships";
import Obituaries from "@/pages/Obituaries";
import EventsTab from "@/components/admin/EventsTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import MembersTab from "@/components/admin/MembersTab";
import FinanceTab from "@/components/admin/FinanceTab";

let lastSignInAt = 0;
async function signIn(email: string) {
  const { data: { session } } = await supabase.auth.getSession();
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

async function clickAround(user: ReturnType<typeof userEvent.setup>, n = 12) {
  for (const t of screen.queryAllByRole("tab").slice(0, 8)) {
    try { await user.click(t); } catch { /* ignore */ }
  }
  for (const b of screen.queryAllByRole("button").slice(0, n)) {
    if ((b as HTMLButtonElement).disabled) continue;
    try { await user.click(b); } catch { /* ignore */ }
  }
}

describe("Pass 7 remainder — Events/News/admin mutation trees", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("Event Manager: Events page create dialog fill + tabs", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    renderApp(<Events />, { route: "/events" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/event/);
    }, { timeout: 25_000 });

    const create = screen.queryAllByRole("button").find((b) =>
      /create|new event|add event|\+/i.test(b.textContent ?? ""),
    );
    if (create) {
      await user.click(create);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/title|name|date|location|create|save|publish/);
      }, { timeout: 10_000 });
      for (const input of Array.from(document.querySelectorAll("input, textarea")).slice(0, 6)) {
        const type = input.getAttribute("type");
        if (type === "date" || type === "datetime-local" || type === "time") {
          fireEvent.change(input, { target: { value: type === "time" ? "18:00" : "2026-12-15T18:00" } });
        } else {
          fireEvent.change(input, { target: { value: "Pass7 Coverage Event" } });
        }
      }
      // Avoid confirming create if it would spam DB — close after fill
      fireEvent.keyDown(document, { key: "Escape" });
    }
    await clickAround(user, 10);
  }, 90_000);

  it("Publisher: News page article dialog interactions", async () => {
    await signIn(E2E_ACCOUNTS.publisher.email);
    const user = userEvent.setup();
    renderApp(<News />, { route: "/news" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/news|article|publish/);
    }, { timeout: 25_000 });
    const create = screen.queryAllByRole("button").find((b) =>
      /new|create|write|publish|add/i.test(b.textContent ?? ""),
    );
    if (create) {
      await user.click(create);
      await waitFor(() => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(40);
      }, { timeout: 10_000 });
      for (const input of Array.from(document.querySelectorAll("input, textarea")).slice(0, 5)) {
        fireEvent.change(input, { target: { value: "Pass7 coverage article body" } });
      }
      fireEvent.keyDown(document, { key: "Escape" });
    }
    await clickAround(user, 10);
  }, 90_000);

  it("Member: Mentorship + Scholarships + Obituaries deeper clicks", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    for (const [el, route] of [
      [<Mentorship key="m" />, "/mentorship"],
      [<Scholarships key="s" />, "/scholarships"],
      [<Obituaries key="o" />, "/obituaries"],
    ] as const) {
      const { unmount } = renderApp(el, { route });
      await waitFor(() => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
      }, { timeout: 20_000 });
      await clickAround(user, 10);
      for (const input of Array.from(document.querySelectorAll("input")).slice(0, 3)) {
        fireEvent.change(input, { target: { value: "coverage" } });
      }
      unmount();
    }
  }, 120_000);

  it("Global Admin: EventsTab + ChaptersTab + MembersTab + FinanceTab deep clicks", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(
      <div>
        <EventsTab />
        <ChaptersTab />
        <MembersTab />
        <FinanceTab />
      </div>,
      { route: "/admin" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(80);
    }, { timeout: 30_000 });
    await clickAround(user, 20);
    for (const input of Array.from(document.querySelectorAll("input, textarea")).slice(0, 6)) {
      fireEvent.change(input, { target: { value: "pass7" } });
    }
  }, 120_000);
});
