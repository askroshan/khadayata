import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { E2E_ACCOUNTS, type E2ERoleKey } from "../src/test/helpers/e2e-accounts";

const ROLE_KEYS = Object.keys(E2E_ACCOUNTS) as E2ERoleKey[];

test.describe("Role-authenticated admin access (real seed users)", () => {
  for (const key of ROLE_KEYS) {
    const account = E2E_ACCOUNTS[key];

    test(`${account.email} signs in and hits expected admin surface`, async ({ page }) => {
      await signInAs(page, account.email);

      if (account.adminTabs.length === 0) {
        await page.goto("/admin");
        await expect(page.getByRole("heading", { name: /Access Denied/i })).toBeVisible({
          timeout: 15_000,
        });
        return;
      }

      const primaryTab = account.adminTabs[0];
      await page.goto(`/admin?tab=${primaryTab}`);
      await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(/Access Denied/i)).toHaveCount(0);

      // Role badge should mention the assigned role when present
      if (account.roleLabel) {
        await expect(page.locator("body")).toContainText(account.roleLabel);
      }

      // Forbidden privileged tab for non–global-admin
      if (key !== "globalAdmin") {
        await page.goto("/admin?tab=chapters");
        // Either redirected away from chapters or chapters content not shown
        const onChapters = await page.getByRole("tab", { name: /^Chapters$/i }).count();
        expect(onChapters).toBe(0);
      }
    });
  }
});

test.describe("Role-authenticated feature routes", () => {
  test("moderator can open /moderation", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.moderator.email);
    await page.goto("/moderation");
    await expect(page).toHaveURL(/\/moderation/);
    await expect(page.locator("body")).not.toContainText(/Access Denied/i);
  });

  test("finance admin can open finance manage surfaces", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.financeAdmin.email);
    await page.goto("/admin?tab=finance");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Finance|Fund|Scholarship|Medical|Hall/i);
  });

  test("publisher can open news publisher tab", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.publisher.email);
    await page.goto("/admin?tab=news-publisher");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /My Content|News/i }).first()).toBeVisible();
  });

  test("regular member can open directory when signed in", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.member.email);
    await page.goto("/directory");
    await expect(page).toHaveURL(/\/directory/);
    await expect(page.locator("body")).not.toContainText(/Access Denied/i);
    // Public directory assertions must not rely on E2E dummy first_name rows
    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder(/Search by name/i).fill("Shah");
    await expect(page.locator("body")).toContainText(/Shah/i, { timeout: 20_000 });
    const body = await page.locator("body").innerText();
    // Filtered "Shah" results should not be E2E-prefixed seed members
    expect(body.split("\n").filter((l) => /\bE2E\b/.test(l) && /Shah/i.test(l)).length).toBe(0);
  });

  test("member feature routes: events/news/obituaries/matrimonial/chapters/profile", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.member.email);
    for (const [path, smoke] of [
      ["/events", /event/i],
      ["/news", /news|article/i],
      ["/obituaries", /obituar|memoriam|remembrance/i],
      ["/matrimonial", /matrimonial|match|rishta/i],
      ["/chapters", /chapter/i],
      ["/profile", /profile|completeness|member/i],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("body")).toContainText(smoke, { timeout: 20_000 });
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    }
  });
});
