import { describe, it, expect, afterAll } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Profile from "@/pages/Profile";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Temple from "@/pages/Temple";
import Search from "@/pages/Search";
import Events from "@/pages/Events";
import Business from "@/pages/Business";
import Matrimonial from "@/pages/Matrimonial";
import News from "@/pages/News";
import Mentorship from "@/pages/Mentorship";
import Scholarships from "@/pages/Scholarships";
import Services from "@/pages/Services";
import OralHistory from "@/pages/OralHistory";
import EldersCouncil from "@/pages/EldersCouncil";
import Archives from "@/pages/Archives";
import EmergencyContacts from "@/pages/EmergencyContacts";
import MemberProfile from "@/pages/MemberProfile";
import Onboarding from "@/pages/Onboarding";

const AHMEDABAD_MEMBER = "608bd52f-ef79-46bf-be89-2c502e25f09f";

async function signIn(email: string) {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: E2E_PASSWORD,
  });
  if (error) throw error;
}

describe("Signed-in page mounts with real member session", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("Dashboard mounts for member", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Dashboard />, { route: "/dashboard" });
    await waitFor(
      () => {
        expect(document.body.textContent).not.toMatch(/Access Denied/i);
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(40);
      },
      { timeout: 25_000 },
    );
  });

  it("Profile mounts for member", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Profile />, { route: "/profile" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/profile|name|chapter/);
      },
      { timeout: 25_000 },
    );
  });

  it("Settings mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Settings />, { route: "/settings" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/settings|privacy/);
      },
      { timeout: 25_000 },
    );
  });

  it("Temple mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Temple />, { route: "/temple" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/temple|kotyark|donat|seva/);
      },
      { timeout: 25_000 },
    );
  });

  it("Search mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Search />, { route: "/search" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/search/);
      },
      { timeout: 25_000 },
    );
  });

  it("Events manage mounts", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    renderApp(<Events />, { route: "/events/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/event/);
      },
      { timeout: 25_000 },
    );
  });

  it("Business manage mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Business />, { route: "/business/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/business|job|listing/);
      },
      { timeout: 25_000 },
    );
  });

  it("Matrimonial manage mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Matrimonial />, { route: "/matrimonial/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/matrimonial|profile|match/);
      },
      { timeout: 25_000 },
    );
  });

  it("News manage mounts", async () => {
    await signIn(E2E_ACCOUNTS.publisher.email);
    renderApp(<News />, { route: "/news/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/news|article|publish/);
      },
      { timeout: 25_000 },
    );
  });

  it("Mentorship manage mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Mentorship />, { route: "/mentorship/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/mentor/);
      },
      { timeout: 25_000 },
    );
  });

  it("Scholarships manage mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Scholarships />, { route: "/scholarships/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/scholarship/);
      },
      { timeout: 25_000 },
    );
  });

  it("Services mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Services />, { route: "/services" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/service/);
      },
      { timeout: 25_000 },
    );
  });

  it("OralHistory full mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<OralHistory />, { route: "/oral-history/full" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/oral|history|stor|recording/);
      },
      { timeout: 25_000 },
    );
  });

  it("EldersCouncil full mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<EldersCouncil />, { route: "/elders-council/full" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/elder/);
      },
      { timeout: 25_000 },
    );
  });

  it("Archives full mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Archives />, { route: "/archives/full" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/archive/);
      },
      { timeout: 25_000 },
    );
  });

  it("EmergencyContacts mounts", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<EmergencyContacts />, { route: "/emergency" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/emergency|contact/);
      },
      { timeout: 25_000 },
    );
  });

  it("MemberProfile mounts real member id", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<MemberProfile />, {
      route: `/member/${AHMEDABAD_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/hemal|member|profile|chapter|verif/);
      },
      { timeout: 25_000 },
    );
  });

  it("Onboarding mounts for signed-in user", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Onboarding />, { route: "/onboarding" });
    await waitFor(
      () => {
        // Completed members may redirect; incomplete show form — either is a successful mount path
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(5);
      },
      { timeout: 25_000 },
    );
  });
});
