import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import AdminStats from "@/components/admin/AdminStats";
import MembersTab from "@/components/admin/MembersTab";
import RolesTab from "@/components/admin/RolesTab";
import AuditsTab from "@/components/admin/AuditsTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import ReportsTab from "@/components/admin/ReportsTab";
import SamitiTab from "@/components/admin/SamitiTab";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import DirectoryTab from "@/components/admin/DirectoryTab";
import EventsTab from "@/components/admin/EventsTab";
import FinanceTab from "@/components/admin/FinanceTab";
import NewsPublisherTab from "@/components/admin/NewsPublisherTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import SMSTab from "@/components/admin/SMSTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import BulkContentTab from "@/components/admin/BulkContentTab";
import LoginGate from "@/components/LoginGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NavLink } from "@/components/NavLink";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { VideoEmbed } from "@/components/VideoEmbed";
import { ReportDialog } from "@/components/ReportDialog";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { AvatarUpload } from "@/components/AvatarUpload";
import AppLayout from "@/components/AppLayout";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

async function signIn(email: string) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: E2E_PASSWORD,
  });
  if (error) throw error;
}

describe("Admin tab mounts (real GA session + live queries)", () => {
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

  beforeAll(async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const { data } = await supabase
      .from("members")
      .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    members = (data ?? []) as typeof members;
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("AdminStats with real members", async () => {
    renderApp(<AdminStats members={members} myChapterId={null} />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Members|Verified|Events|Chapters/i);
      },
      { timeout: 20_000 },
    );
  });

  it("MembersTab lists real members", async () => {
    renderApp(
      <MembersTab members={members} myChapterId={null} canInvite isGlobalAdmin />,
      { route: "/admin" },
    );
    await waitFor(
      () => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(40);
      },
      { timeout: 20_000 },
    );
  });

  it("RolesTab mounts", async () => {
    const { data } = await supabase
      .from("role_assignments")
      .select("id, start_date, end_date, roles(name, scope), members(first_name, last_name), chapters(name)")
      .limit(20);
    renderApp(<RolesTab roleAssignments={(data ?? []) as never[]} myChapterId={null} />, {
      route: "/admin",
    });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/role|assign|admin/);
    }, { timeout: 20_000 });
  });

  it("AuditsTab mounts", async () => {
    const { data } = await supabase.from("audits").select("*").limit(20);
    renderApp(<AuditsTab audits={data ?? []} />, { route: "/admin" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/audit/);
    });
  });

  it("TagRequestsTab mounts", async () => {
    const { data } = await supabase.from("tag_requests").select("*").limit(20);
    renderApp(<TagRequestsTab tagRequests={data ?? []} />, { route: "/admin" });
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(10);
    });
  });

  it("AnnouncementsTab mounts", async () => {
    const { data } = await supabase.from("announcements").select("*").limit(20);
    renderApp(<AnnouncementsTab announcements={data ?? []} />, { route: "/admin" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/announce/);
    }, { timeout: 15_000 });
  });

  it("ChapterTransfersTab mounts", async () => {
    renderApp(<ChapterTransfersTab />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/transfer/);
      },
      { timeout: 20_000 },
    );
  });

  it("ReportsTab mounts", async () => {
    renderApp(<ReportsTab />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/report/);
      },
      { timeout: 20_000 },
    );
  });

  it("SamitiTab mounts for Ahmedabad", async () => {
    renderApp(<SamitiTab chapterId={AHMEDABAD} />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/samiti|committee|member/);
      },
      { timeout: 20_000 },
    );
  });

  it("VerificationDashboard mounts", async () => {
    renderApp(<VerificationDashboard myChapterId={null} isGlobalAdmin />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/verif/);
      },
      { timeout: 20_000 },
    );
  });

  it("DirectoryTab mounts", async () => {
    renderApp(<DirectoryTab myChapterId={null} />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/business|job|director/);
      },
      { timeout: 20_000 },
    );
  });

  it("EventsTab mounts", async () => {
    renderApp(<EventsTab myChapterId={null} />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/event/);
      },
      { timeout: 20_000 },
    );
  });

  it("FinanceTab mounts", async () => {
    renderApp(<FinanceTab myChapterId={null} />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/finance|fund|donat|aid|scholarship/);
      },
      { timeout: 25_000 },
    );
  });

  it("NewsPublisherTab mounts", async () => {
    renderApp(<NewsPublisherTab myChapterId={null} />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/news|publish|article/);
      },
      { timeout: 20_000 },
    );
  });

  it("WhatsAppTab mounts", async () => {
    renderApp(<WhatsAppTab />, { route: "/admin" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/whatsapp|message|template/);
    }, { timeout: 15_000 });
  });

  it("SMSTab mounts", async () => {
    renderApp(<SMSTab />, { route: "/admin" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/sms|message|text/);
    }, { timeout: 15_000 });
  });

  it("BannedKeywordsTab mounts", async () => {
    renderApp(<BannedKeywordsTab />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/keyword|banned|moderat/);
      },
      { timeout: 20_000 },
    );
  });

  it("ChaptersTab mounts with real chapters", async () => {
    renderApp(<ChaptersTab />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/chapter|ahmedabad/);
      },
      { timeout: 25_000 },
    );
  });

  it("AnalyticsTab mounts", async () => {
    renderApp(<AnalyticsTab myChapterId={null} />, { route: "/admin" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/analytic|member|chapter|stat|chart|growth/);
      },
      { timeout: 25_000 },
    );
  });

  it("BulkContentTab mounts", async () => {
    renderApp(<BulkContentTab />, { route: "/admin" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/bulk|content|upload|import/);
    }, { timeout: 15_000 });
  });
});

describe("Shared component mounts", () => {
  it("LoginGate mounts", () => {
    renderApp(
      <LoginGate title="Sign In Required" message="Coverage message" ctaLabel="Sign in" />,
      { route: "/" },
    );
    expect(document.body.textContent).toMatch(/Sign In Required/);
  });

  it("ErrorBoundary catches child throw", () => {
    function Boom(): never {
      throw new Error("coverage boom");
    }
    renderApp(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
      { route: "/" },
    );
    expect(document.body.textContent?.toLowerCase()).toMatch(/error|something|went wrong|try/);
  });

  it("LanguageToggle mounts", () => {
    renderApp(
      <LanguageToggle
        content={{ en: "Hello", gu: "નમસ્તે", hi: "नमस्ते" }}
        onChange={() => {}}
      />,
      { route: "/" },
    );
    expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it("NavLink mounts", () => {
    renderApp(<NavLink to="/chapters">Chapters</NavLink>, { route: "/" });
    expect(document.body.textContent).toMatch(/Chapters/);
  });

  it("QRCodeDisplay mounts", () => {
    renderApp(<QRCodeDisplay data="https://khadayataonline.com" />, { route: "/" });
    expect(document.querySelector("canvas, svg, img") || document.body.textContent).toBeTruthy();
  });

  it("VideoEmbed mounts", () => {
    renderApp(<VideoEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />, { route: "/" });
    expect(document.querySelector("iframe") || document.body.textContent).toBeTruthy();
  });

  it("ReportDialog mounts for moderator", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    renderApp(
      <ReportDialog
        entityType="member"
        entityId="00000000-0000-0000-0000-000000000001"
        variant="button"
      />,
      { route: "/" },
    );
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/report/);
      },
      { timeout: 20_000 },
    );
  });

  it("AppLayout mounts children", () => {
    renderApp(
      <AppLayout title="Coverage">
        <div>App layout child</div>
      </AppLayout>,
      { route: "/" },
    );
    expect(document.body.textContent).toMatch(/App layout child/);
  });

  it("NotificationsPanel mounts when signed in", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<NotificationsPanel />, { route: "/dashboard" });
    await waitFor(
      () => {
        const btn = document.querySelector('button[aria-label*="Notification"]');
        expect(btn).toBeTruthy();
      },
      { timeout: 20_000 },
    );
    await supabase.auth.signOut();
  });

  it("AvatarUpload mounts for member", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(
      <AvatarUpload currentUrl={null} onUploadComplete={() => {}} initials="KM" />,
      { route: "/profile" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0);
    });
    await supabase.auth.signOut();
  });
});
