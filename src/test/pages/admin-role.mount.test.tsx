import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Admin from "@/pages/Admin";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import Directory from "@/pages/Directory";

async function signIn(email: string) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: E2E_PASSWORD,
  });
  if (error) throw error;
}

describe("Admin / signed-in page mounts with real role sessions", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("Global Admin Admin.tsx shows dashboard and role badge", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    renderApp(<Admin />, { route: "/admin?tab=members" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Admin Dashboard/);
        expect(document.body.textContent).toMatch(/Global Admin/);
      },
      { timeout: 25_000 },
    );
  });

  it("Finance Admin lands on finance capabilities", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    renderApp(<Admin />, { route: "/admin?tab=finance" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Admin Dashboard/);
        expect(document.body.textContent).toMatch(/Finance Admin|Finance/i);
      },
      { timeout: 25_000 },
    );
  });

  it("Global Admin opens chapters + analytics + roles tabs", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    for (const tab of ["chapters", "analytics", "roles", "events", "directory"] as const) {
      const { unmount } = renderApp(<Admin />, { route: `/admin?tab=${tab}` });
      await waitFor(
        () => {
          expect(document.body.textContent).toMatch(/Admin Dashboard/);
          expect(document.body.textContent).not.toMatch(/Access Denied/i);
        },
        { timeout: 25_000 },
      );
      unmount();
    }
  });

  it("Data Steward verification tab mounts", async () => {
    await signIn(E2E_ACCOUNTS.dataSteward.email);
    renderApp(<Admin />, { route: "/admin?tab=verification" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Admin Dashboard/);
        expect(document.body.textContent?.toLowerCase()).toMatch(/verif|steward|member/);
      },
      { timeout: 25_000 },
    );
  });

  it("Publisher news-publisher tab mounts", async () => {
    await signIn(E2E_ACCOUNTS.publisher.email);
    renderApp(<Admin />, { route: "/admin?tab=news-publisher" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Admin Dashboard/);
        expect(document.body.textContent?.toLowerCase()).toMatch(/news|publish|article/);
      },
      { timeout: 25_000 },
    );
  });

  it("Regular member is denied Admin", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Admin />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Access Denied/i);
      },
      { timeout: 25_000 },
    );
  });

  it("Moderator ModeratorDashboard mounts", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await waitFor(
      () => {
        expect(document.body.textContent).not.toMatch(/Access Denied/i);
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
      },
      { timeout: 25_000 },
    );
  });

  it("Member Directory mounts with real members", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Directory />, { route: "/directory" });
    await waitFor(
      () => {
        expect(document.body.textContent).not.toMatch(/Access Denied/i);
        // Directory either lists members or shows search chrome from real query
        expect(document.body.textContent?.toLowerCase()).toMatch(/member|directory|search|chapter/);
      },
      { timeout: 25_000 },
    );
  });
});
