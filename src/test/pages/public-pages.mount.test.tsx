import { describe, it, expect, beforeAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import PublicEvents from "@/pages/PublicEvents";
import PublicNews from "@/pages/PublicNews";
import Chapters from "@/pages/Chapters";
import Obituaries from "@/pages/Obituaries";
import NotFound from "@/pages/NotFound";
import Contact from "@/pages/Contact";

/**
 * Mount public pages against the real Supabase client (real chapters/events/news).
 * No MSW / no fixture JSON for view data.
 */
describe("Public page mounts (real API data)", () => {
  beforeAll(async () => {
    await supabase.auth.signOut();
  });

  it("Chapters lists real chapter links", async () => {
    renderApp(<Chapters />, { route: "/chapters" });
    await waitFor(
      () => {
        const links = document.querySelectorAll('a[href^="/chapters/"]');
        expect(links.length).toBeGreaterThan(0);
      },
      { timeout: 20_000 },
    );
  });

  it("PublicEvents renders without crashing", async () => {
    renderApp(<PublicEvents />, { route: "/events" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/event/);
    }, { timeout: 20_000 });
  });

  it("PublicNews renders without crashing", async () => {
    renderApp(<PublicNews />, { route: "/news" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/news|article|khadayata/);
    }, { timeout: 20_000 });
  });

  it("Obituaries renders remembrance surface", async () => {
    renderApp(<Obituaries />, { route: "/obituaries" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/obituar|remember|memoriam|tribute/);
    }, { timeout: 20_000 });
  });

  it("Contact page mounts", async () => {
    renderApp(<Contact />, { route: "/contact" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/contact/);
    }, { timeout: 15_000 });
  });

  it("NotFound shows 404", async () => {
    renderApp(<NotFound />, { route: "/missing" });
    expect(await screen.findByRole("heading", { name: /Page Not Found/i })).toBeInTheDocument();
  });
});
