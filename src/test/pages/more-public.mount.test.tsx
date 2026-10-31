import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Terms from "@/pages/Terms";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Accessibility from "@/pages/Accessibility";
import ResetPassword from "@/pages/ResetPassword";
import PublicBusiness from "@/pages/PublicBusiness";
import PublicMatrimonial from "@/pages/PublicMatrimonial";
import PublicMentorship from "@/pages/PublicMentorship";
import PublicScholarships from "@/pages/PublicScholarships";
import PublicOralHistory from "@/pages/PublicOralHistory";
import PublicEldersCouncil from "@/pages/PublicEldersCouncil";
import PublicArchives from "@/pages/PublicArchives";
import ChapterDetail from "@/pages/ChapterDetail";
import NewsDetail from "@/pages/NewsDetail";
import AcceptFamilyInvite from "@/pages/AcceptFamilyInvite";

describe("More public page mounts (real API data)", () => {
  beforeAll(async () => {
    await supabase.auth.signOut();
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("Index hero mounts with brand signal", async () => {
    renderApp(<Index />, { route: "/" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/khadayata/);
      },
      { timeout: 25_000 },
    );
  });

  it("Auth sign-in surface mounts", async () => {
    renderApp(<Auth />, { route: "/auth" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/sign in|email|password/);
      },
      { timeout: 20_000 },
    );
  });

  it("Terms of Use mounts", async () => {
    renderApp(<Terms />, { route: "/terms" });
    expect(await screen.findByRole("heading", { name: /Terms of Use/i })).toBeInTheDocument();
  });

  it("Privacy Policy mounts", async () => {
    renderApp(<PrivacyPolicy />, { route: "/privacy" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/privacy/);
    });
  });

  it("Accessibility mounts", async () => {
    renderApp(<Accessibility />, { route: "/accessibility" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/accessib/);
    });
  });

  it("ResetPassword mounts", async () => {
    renderApp(<ResetPassword />, { route: "/reset-password" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/reset|password/);
    });
  });

  it("PublicBusiness mounts", async () => {
    renderApp(<PublicBusiness />, { route: "/business" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/business|job/);
      },
      { timeout: 20_000 },
    );
  });

  it("PublicMatrimonial mounts", async () => {
    renderApp(<PublicMatrimonial />, { route: "/matrimonial" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/matrimonial|match|profile/);
      },
      { timeout: 20_000 },
    );
  });

  it("PublicMentorship mounts", async () => {
    renderApp(<PublicMentorship />, { route: "/mentorship" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/mentor/);
      },
      { timeout: 20_000 },
    );
  });

  it("PublicScholarships mounts", async () => {
    renderApp(<PublicScholarships />, { route: "/scholarships" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/scholarship/);
      },
      { timeout: 20_000 },
    );
  });

  it("PublicOralHistory mounts", async () => {
    renderApp(<PublicOralHistory />, { route: "/oral-history" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/oral|history|stor/);
      },
      { timeout: 20_000 },
    );
  });

  it("PublicEldersCouncil mounts", async () => {
    renderApp(<PublicEldersCouncil />, { route: "/elders-council" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/elder/);
      },
      { timeout: 20_000 },
    );
  });

  it("PublicArchives mounts", async () => {
    renderApp(<PublicArchives />, { route: "/archives" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/archive/);
      },
      { timeout: 20_000 },
    );
  });

  it("ChapterDetail mounts Ahmedabad from real slug", async () => {
    renderApp(<ChapterDetail />, {
      route: "/chapters/ahmedabad",
      pathPattern: "/chapters/:slug",
    });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/ahmedabad/);
      },
      { timeout: 25_000 },
    );
  });

  it("NewsDetail mounts for missing id without crash", async () => {
    // NewsDetail is auth-gated; sign in so we hit the not-found branch (not Navigate).
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    if (error) throw error;
    renderApp(<NewsDetail />, {
      route: "/news/00000000-0000-0000-0000-000000000099",
      pathPattern: "/news/:id",
    });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/not found|article|news|back/);
      },
      { timeout: 25_000 },
    );
    await supabase.auth.signOut();
  });

  it("AcceptFamilyInvite mounts for token route", async () => {
    renderApp(<AcceptFamilyInvite />, {
      route: "/accept-family-invite/coverage-token",
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(
      () => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(10);
      },
      { timeout: 20_000 },
    );
  });
});
