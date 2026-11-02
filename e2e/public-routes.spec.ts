import { test, expect } from "@playwright/test";

/**
 * Exhaustive public-route E2E against the real running app + real Supabase data.
 * No route intercepts / no mock APIs.
 */

const PUBLIC_ROUTES: Array<{ path: string; smoke: RegExp | string }> = [
  { path: "/", smoke: /Khadayata|Welcome|Newest Members/i },
  { path: "/auth", smoke: /sign in|log in|email|password/i },
  { path: "/events", smoke: /event/i },
  { path: "/business", smoke: /business|job/i },
  { path: "/matrimonial", smoke: /matrimonial|rishta|journey/i },
  { path: "/news", smoke: /news|article/i },
  { path: "/mentorship", smoke: /mentor/i },
  { path: "/scholarships", smoke: /scholarship/i },
  { path: "/oral-history", smoke: /oral|history|heritage/i },
  { path: "/chapters", smoke: /chapter/i },
  { path: "/elders-council", smoke: /elder|council/i },
  { path: "/archives", smoke: /archive|jyoti|magazine/i },
  { path: "/obituaries", smoke: /obituar|memoriam|remembrance/i },
  { path: "/contact", smoke: /contact/i },
  { path: "/terms", smoke: /term/i },
  { path: "/privacy", smoke: /privacy/i },
  { path: "/accessibility", smoke: /accessib/i },
];

test.describe("Public routes load with real data", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} renders without app crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.ok() || response?.status() === 304).toBeTruthy();
      await expect(page.locator("body")).toContainText(route.smoke, { timeout: 20_000 });
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});

test.describe("Real data directory surfaces", () => {
  test("chapters list shows at least one chapter from DB", async ({ page }) => {
    await page.goto("/chapters");
    // Real dump has 42 chapters — UI should list names or cards
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    const links = page.locator('a[href^="/chapters/"]');
    await expect(links.first()).toBeVisible({ timeout: 20_000 });
    expect(await links.count()).toBeGreaterThan(0);
  });

  test("unknown path shows NotFound", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-coverage");
    await expect(page.locator("body")).toContainText(/not found|404|page/i);
  });
});
