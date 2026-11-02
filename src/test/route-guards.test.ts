import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Route guard classification test.
 * 
 * Verifies that every route in App.tsx falls into one of three categories:
 * 1. Public — no auth check, accessible to anyone
 * 2. Signed-in — redirects to /auth if not logged in
 * 3. Admin — redirects to /auth if not logged in, shows Access Denied if not admin
 *
 * This is a static source-code assertion test (no browser) that verifies
 * the guard pattern exists in the page component source.
 */

const PAGES_DIR = resolve(__dirname, "../pages");

function readPage(name: string): string {
  return readFileSync(resolve(PAGES_DIR, `${name}.tsx`), "utf-8");
}

// Routes from App.tsx with their page component and category
const ROUTES: Array<{
  path: string;
  component: string;
  category: "public" | "signed-in" | "admin";
}> = [
  { path: "/", component: "Index", category: "public" },
  { path: "/auth", component: "Auth", category: "public" },
  { path: "/onboarding", component: "Onboarding", category: "signed-in" },
  { path: "/dashboard", component: "Dashboard", category: "signed-in" },
  { path: "/reset-password", component: "ResetPassword", category: "public" },
  { path: "/directory", component: "Directory", category: "signed-in" },
  { path: "/member/:id", component: "MemberProfile", category: "signed-in" },
  { path: "/events", component: "PublicEvents", category: "public" },
  { path: "/events/manage", component: "Events", category: "signed-in" },
  { path: "/business", component: "PublicBusiness", category: "public" },
  { path: "/business/manage", component: "Business", category: "signed-in" },
  { path: "/matrimonial", component: "PublicMatrimonial", category: "public" },
  { path: "/matrimonial/manage", component: "Matrimonial", category: "signed-in" },
  { path: "/temple", component: "Temple", category: "signed-in" },
  { path: "/search", component: "Search", category: "signed-in" },
  { path: "/admin", component: "Admin", category: "admin" },
  { path: "/moderation", component: "ModeratorDashboard", category: "signed-in" },
  { path: "/settings", component: "Settings", category: "signed-in" },
  { path: "/news", component: "PublicNews", category: "public" },
  { path: "/news/manage", component: "News", category: "signed-in" },
  { path: "/news/:id", component: "NewsDetail", category: "signed-in" },
  { path: "/profile", component: "Profile", category: "signed-in" },
  { path: "/mentorship", component: "PublicMentorship", category: "public" },
  { path: "/mentorship/manage", component: "Mentorship", category: "signed-in" },
  { path: "/scholarships", component: "PublicScholarships", category: "public" },
  { path: "/scholarships/manage", component: "Scholarships", category: "signed-in" },
  { path: "/services", component: "Services", category: "signed-in" },
  { path: "/oral-history", component: "PublicOralHistory", category: "public" },
  { path: "/oral-history/full", component: "OralHistory", category: "signed-in" },
  { path: "/emergency", component: "EmergencyContacts", category: "signed-in" },
  { path: "/chapters", component: "Chapters", category: "public" },
  { path: "/chapters/:slug", component: "ChapterDetail", category: "public" },
  { path: "/elders-council", component: "PublicEldersCouncil", category: "public" },
  { path: "/elders-council/full", component: "EldersCouncil", category: "signed-in" },
  { path: "/archives", component: "PublicArchives", category: "public" },
  { path: "/archives/full", component: "Archives", category: "signed-in" },
  { path: "/accept-family-invite/:token", component: "AcceptFamilyInvite", category: "public" },
  { path: "/obituaries", component: "Obituaries", category: "public" },
  { path: "/contact", component: "Contact", category: "public" },
  { path: "/terms", component: "Terms", category: "public" },
  { path: "/privacy", component: "PrivacyPolicy", category: "public" },
  { path: "/accessibility", component: "Accessibility", category: "public" },
  { path: "*", component: "NotFound", category: "public" },
];

describe("Route guard classification — every route has correct auth guard", () => {
  for (const route of ROUTES) {
    describe(`${route.path} (${route.component})`, () => {
      const source = readPage(route.component);

      if (route.category === "signed-in") {
        it("redirects to /auth when user is not logged in", () => {
          expect(source).toMatch(/Navigate\s+to=["']\/auth["']/);
        });
        it("uses useAuth() to check authentication", () => {
          expect(source).toMatch(/useAuth\(\)/);
        });
      }

      if (route.category === "admin") {
        it("redirects to /auth when user is not logged in", () => {
          expect(source).toMatch(/Navigate\s+to=["']\/auth["']/);
        });
        it("uses useAuth() to check authentication", () => {
          expect(source).toMatch(/useAuth\(\)/);
        });
        it("checks isAnyAdmin or canAccessAdmin for admin access", () => {
          expect(
            source.includes("isAnyAdmin") ||
            source.includes("canAccessAdmin")
          ).toBe(true);
        });
      }

      if (route.category === "public") {
        it("does NOT redirect to /auth (publicly accessible)", () => {
          // Public pages may use useAuth for optional features, but should not
          // hard-redirect to /auth with Navigate
          const hasAuthRedirect = /Navigate\s+to=["']\/auth["']\s+replace/.test(source);
          expect(hasAuthRedirect).toBe(false);
        });
      }
    });
  }
});

describe("Route completeness — every App.tsx route is classified", () => {
  const appSource = readFileSync(resolve(__dirname, "../App.tsx"), "utf-8");

  for (const route of ROUTES) {
    it(`${route.path} is declared in App.tsx`, () => {
      if (route.path === "*") {
        expect(appSource).toMatch(/path=["']\*["']/);
        return;
      }
      // Check the path appears in a Route element
      expect(appSource).toContain(`path="${route.path}"`);
    });
  }
});

describe("Public vs signed-in route separation", () => {
  it("Public listing routes do NOT require auth (/events, /business, /news, etc.)", () => {
    const publicListings = ["PublicEvents", "PublicBusiness", "PublicNews", "PublicMatrimonial", "PublicMentorship", "PublicScholarships"];
    for (const comp of publicListings) {
      const src = readPage(comp);
      expect(src).not.toMatch(/Navigate\s+to=["']\/auth["']\s+replace/);
    }
  });

  it("Management routes DO require auth (/events/manage, /business/manage, etc.)", () => {
    const mgmtPages = ["Events", "Business", "News", "Matrimonial", "Mentorship", "Scholarships"];
    for (const comp of mgmtPages) {
      const src = readPage(comp);
      expect(src).toMatch(/useAuth\(\)/);
    }
  });
});
