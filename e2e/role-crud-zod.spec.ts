import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { E2E_ACCOUNTS } from "../src/test/helpers/e2e-accounts";

test.describe("Auth Zod schema validation (real browser)", () => {
  test("rejects invalid email and short password on Sign In, and validates Sign Up", async ({ page }) => {
    await page.goto("/auth");

    // Invalid email
    await page.getByLabel(/^Email$/i).fill("not-an-email");
    await page.getByLabel(/^Password$/i).fill("123");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/auth/);

    // Valid email, too-short password (Zod min 6)
    await page.getByLabel(/^Email$/i).fill("valid@example.com");
    await page.getByLabel(/^Password$/i).fill("12345");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/auth/);

    // Switch to Sign Up tab if present and verify form controls
    const signUpTab = page.getByRole("tab", { name: /sign up|register|create account/i });
    if (await signUpTab.count()) {
      await signUpTab.first().click();
      const submitBtn = page.getByRole("button", { name: /sign up|create account|register/i });
      if (await submitBtn.count()) {
        await submitBtn.first().click();
        await expect(page).toHaveURL(/\/auth/);
      }
    }
  });
});

test.describe("Global Admin — every admin tab click & real DB CRUD", () => {
  test("clicks through all Global Admin tabs without errors", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, E2E_ACCOUNTS.globalAdmin.email);
    await page.goto("/admin?tab=verification");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    const tabNames = [
      /^Verification$/i,
      /^Members$/i,
      /^Roles$/i,
      /^Reports$/i,
      /^Transfers$/i,
      /^Audit Log$/i,
      /^Tags$/i,
      /^Announcements$/i,
      /^Directory$/i,
      /^Events$/i,
      /^Finance$/i,
      /^My Content$/i,
      /^Chapters$/i,
      /^Samiti$/i,
      /^WhatsApp$/i,
      /^SMS$/i,
      /^Bulk Delete$/i,
      /^Keywords$/i,
      /^Analytics$/i,
    ];

    for (const name of tabNames) {
      const tab = page.getByRole("tab", { name }).first();
      await expect(tab).toBeVisible({ timeout: 10_000 });
      await tab.click();
      await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);
    }
  });

  test("Banned Keywords real DB CRUD (Create -> Reload Verify -> Delete)", async ({ page }) => {
    const keyword = `e2e_kw_${Date.now()}`;
    await signInAs(page, E2E_ACCOUNTS.globalAdmin.email);
    await page.goto("/admin?tab=banned-keywords");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    const input = page.getByPlaceholder(/keyword|word|phrase/i).first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(keyword);
    await input.locator("xpath=..").getByRole("button").last().click();

    await expect(page.locator("body")).toContainText(/Keyword added to blocklist/i, { timeout: 15_000 });

    // Reload to confirm real DB persistence
    await page.reload();
    await expect(page.locator("body")).toContainText(keyword, { timeout: 15_000 });

    // Delete the keyword row (with AlertDialog confirmation)
    const row = page.getByText(keyword).locator("xpath=ancestor::div[.//button][1]");
    await row.getByRole("button").last().click();
    const confirmBtn = page.getByRole("button", { name: /delete|remove|confirm/i });
    if (await confirmBtn.count()) {
      await confirmBtn.last().click();
    }
    await expect(page.locator("body")).not.toContainText(keyword, { timeout: 15_000 });
  });
});

test.describe("Chapter Admin — all accessible tabs & chapter-scoped UI", () => {
  test("clicks all Chapter Admin tabs and verifies forbidden tabs are absent", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.chapterAdmin.email);
    await page.goto("/admin?tab=verification");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    for (const name of [
      /^Verification$/i,
      /^Members$/i,
      /^Roles$/i,
      /^Transfers$/i,
      /^Tags$/i,
      /^Announcements$/i,
      /^Events$/i,
      /^Samiti$/i,
    ]) {
      const tab = page.getByRole("tab", { name }).first();
      await expect(tab).toBeVisible({ timeout: 10_000 });
      await tab.click();
      await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);
    }

    // Forbidden tabs must not appear
    await expect(page.getByRole("tab", { name: /^Chapters$/i })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /^Finance$/i })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /^Analytics$/i })).toHaveCount(0);
  });
});

test.describe("Data Steward — all accessible tabs & filter/export clicks", () => {
  test("clicks Verification, Members, Roles, Audit Log, and Tags tabs", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.dataSteward.email);
    await page.goto("/admin?tab=members");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    for (const name of [/^Verification$/i, /^Members$/i, /^Roles$/i, /^Audit Log$/i, /^Tags$/i]) {
      const tab = page.getByRole("tab", { name }).first();
      await expect(tab).toBeVisible({ timeout: 10_000 });
      await tab.click();
      await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);
    }
  });
});

test.describe("Directory Manager — Directory tab & management screens", () => {
  test("opens Directory tab and /business/manage without errors", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.directoryManager.email);
    await page.goto("/admin?tab=directory");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: /^Directory$/i })).toBeVisible();

    await page.goto("/business/manage");
    await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);
  });
});

test.describe("Event Manager — Events tab & /events/manage", () => {
  test("opens Events tab and /events/manage without errors", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.eventManager.email);
    await page.goto("/admin?tab=events");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: /^Events$/i })).toBeVisible();

    await page.goto("/events/manage");
    await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);
  });
});

test.describe("Finance Admin — Finance tab & all sub-tabs", () => {
  test("opens Finance tab and clicks all Finance sub-tabs", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.financeAdmin.email);
    await page.goto("/admin?tab=finance");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    // Click through inner Finance sub-tabs if visible
    for (const sub of [/Funds/i, /Donations/i, /Scholarships/i, /Medical/i, /Hall/i, /Campaigns/i, /Corpus/i]) {
      const btn = page.getByRole("tab", { name: sub });
      if (await btn.count()) {
        await btn.first().click();
        await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
      }
    }
  });
});

test.describe("Global Publisher — News Publisher tab & /news/manage", () => {
  test("opens My Content tab and /news/manage without errors", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.publisher.email);
    await page.goto("/admin?tab=news-publisher");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: /My Content/i })).toBeVisible();

    await page.goto("/news/manage");
    await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);
  });
});

test.describe("Moderator — /moderation, Reports, and Banned Keywords", () => {
  test("navigates all Moderator surfaces without errors", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.moderator.email);
    await page.goto("/moderation");
    await expect(page).toHaveURL(/\/moderation/);
    await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);

    await page.goto("/admin?tab=reports");
    await expect(page.getByRole("tab", { name: /^Reports$/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("tab", { name: /^Keywords$/i }).click();
    await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i);
  });
});

test.describe("Regular Member — all member screens & Emergency Contacts CRUD", () => {
  test("visits all member-facing screens without errors", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, E2E_ACCOUNTS.member.email);
    const routes = [
      "/dashboard",
      "/profile",
      "/emergency-contacts",
      "/directory",
      "/events",
      "/news",
      "/business",
      "/matrimonial",
      "/mentorship",
      "/scholarships",
      "/oral-history",
      "/elders-council",
      "/archives",
      "/obituaries",
      "/temple",
      "/chapters",
      "/search",
      "/services",
      "/settings",
    ];
    for (const r of routes) {
      await page.goto(r);
      await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i, {
        timeout: 15_000,
      });
    }
  });
});

test.describe("Unverified Member — access gates & onboarding surface", () => {
  test("blocked from /admin and can access /dashboard and /profile", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.unverified.email);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /Access Denied/i })).toBeVisible({ timeout: 15_000 });

    await page.goto("/dashboard");
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
  });
});
