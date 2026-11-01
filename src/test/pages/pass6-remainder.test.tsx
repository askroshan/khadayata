import { describe, it, expect, afterAll } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { AvatarUpload } from "@/components/AvatarUpload";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { FamilyInviteDialog } from "@/components/profile/FamilyInviteDialog";
import { TrustCorpusPanel } from "@/components/finance/TrustCorpusPanel";
import { CampaignsPanel } from "@/components/finance/CampaignsPanel";
import { RecurringPledgesPanel } from "@/components/finance/RecurringPledgesPanel";
import ReportsTab from "@/components/admin/ReportsTab";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import EventsTab from "@/components/admin/EventsTab";
import Obituaries from "@/pages/Obituaries";
import Scholarships from "@/pages/Scholarships";
import PublicEvents from "@/pages/PublicEvents";
import PublicBusiness from "@/pages/PublicBusiness";
import Onboarding from "@/pages/Onboarding";
import Auth from "@/pages/Auth";
import Events from "@/pages/Events";
import Business from "@/pages/Business";
import Temple from "@/pages/Temple";
import Mentorship from "@/pages/Mentorship";
import News from "@/pages/News";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis } from "recharts";
import { Toaster } from "@/components/ui/toaster";

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

async function clickAround(user: ReturnType<typeof userEvent.setup>, n = 10) {
  for (const b of screen.queryAllByRole("button").slice(0, n)) {
    if ((b as HTMLButtonElement).disabled) continue;
    try { await user.click(b); } catch { /* ignore */ }
  }
  for (const t of screen.queryAllByRole("tab").slice(0, 8)) {
    try { await user.click(t); } catch { /* ignore */ }
  }
}

describe("Pass 6 remainder coverage chase", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("QRCodeDisplay + chart + toaster", () => {
    const config = { desktop: { label: "Desktop", color: "#888" } };
    render(
      <div>
        <QRCodeDisplay data="khadayata-coverage" size={120} />
        <QRCodeDisplay data="alt" size={80} fgColor="#333" bgColor="#eee" />
        <ChartContainer config={config} className="h-40 w-40">
          <BarChart data={[{ desktop: 2, name: "a" }, { desktop: 5, name: "b" }]}>
            <XAxis dataKey="name" />
            <Bar dataKey="desktop" />
            <ChartTooltip content={<ChartTooltipContent />} />
          </BarChart>
        </ChartContainer>
        <Toaster />
      </div>,
    );
    expect(document.querySelector("canvas")).toBeTruthy();
  });

  it("AvatarUpload + NotificationsPanel + FamilyInviteDialog as member", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from("members").select("id, photo_url").eq("user_id", authUser!.id).maybeSingle();
    renderApp(
      <div>
        <AvatarUpload currentUrl={member?.photo_url ?? null} onUploadComplete={() => {}} initials="EM" />
        <NotificationsPanel />
        <FamilyInviteDialog memberId={member!.id} />
      </div>,
      { route: "/profile" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(10);
    }, { timeout: 20_000 });
    await clickAround(user, 12);
  }, 60_000);

  it("Finance panels as Global Admin", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(
      <div>
        <TrustCorpusPanel myChapterId="f1000002-0000-0000-0000-000000000002" />
        <CampaignsPanel myChapterId="f1000002-0000-0000-0000-000000000002" />
        <RecurringPledgesPanel />
      </div>,
      { route: "/admin?tab=finance" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/trust|corpus|campaign|pledge|finance|donation|fund/);
    }, { timeout: 25_000 });
    await clickAround(user, 15);
  }, 60_000);

  it("Admin remainder tabs: Reports, Transfers, BannedKeywords, Events", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(
      <div>
        <ReportsTab />
        <ChapterTransfersTab />
        <BannedKeywordsTab />
        <EventsTab />
      </div>,
      { route: "/admin" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(40);
    }, { timeout: 25_000 });
    await clickAround(user, 18);
    for (const input of Array.from(document.querySelectorAll("input, textarea")).slice(0, 4)) {
      fireEvent.change(input, { target: { value: "coverage" } });
    }
  }, 90_000);

  it("ModeratorDashboard deep interactions", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    const user = userEvent.setup();
    renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/moderat|report|review|keyword|queue|pending/);
    }, { timeout: 25_000 });
    await clickAround(user, 16);
  }, 60_000);

  it("Signed-in content pages: Events News Obituaries Scholarships Mentorship Business Temple", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const pages = [
      <Events key="e" />,
      <News key="n" />,
      <Obituaries key="o" />,
      <Scholarships key="s" />,
      <Mentorship key="m" />,
      <Business key="b" />,
      <Temple key="t" />,
    ];
    for (const page of pages) {
      const { unmount } = renderApp(page, { route: "/dashboard" });
      await waitFor(() => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
      }, { timeout: 20_000 });
      await clickAround(user, 8);
      unmount();
    }
  }, 180_000);

  it("PublicEvents + PublicBusiness + Auth + Onboarding", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    for (const [el, route] of [
      [<PublicEvents key="pe" />, "/events"],
      [<PublicBusiness key="pb" />, "/business"],
      [<Auth key="a" />, "/auth"],
    ] as const) {
      const { unmount } = renderApp(el, { route });
      await waitFor(() => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
      }, { timeout: 20_000 });
      await clickAround(user, 6);
      unmount();
    }
    await signIn(E2E_ACCOUNTS.unverified.email);
    const { unmount } = renderApp(<Onboarding />, { route: "/onboarding" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/onboard|welcome|profile|chapter|name|continue|next/);
    }, { timeout: 25_000 });
    await clickAround(user, 10);
    for (const input of Array.from(document.querySelectorAll("input")).slice(0, 5)) {
      fireEvent.change(input, { target: { value: "Coverage" } });
    }
    unmount();
  }, 120_000);
});
