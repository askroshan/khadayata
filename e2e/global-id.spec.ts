import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { E2E_ACCOUNTS } from "../src/test/helpers/e2e-accounts";

const GLOBAL_ID_PATTERN = /KHD-[A-Z]{2}[A-Z0-9]{2}[A-Z]{3}-\d{2}-\d{6}-[0-9A-Z]/;

test.describe("Global ID E2E", () => {
  test("Member profile displays or generates a valid Global ID and persists across reload", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.member.email);
    await page.goto("/profile");
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i, { timeout: 20_000 });

    await expect(page.getByText("Global ID").first()).toBeVisible({ timeout: 20_000 });

    const generateBtn = page.getByRole("button", { name: /Generate Global ID/i });
    if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await generateBtn.click();
    }

    await expect(page.locator("body")).toContainText(GLOBAL_ID_PATTERN, { timeout: 20_000 });
    const bodyText = await page.locator("body").textContent();
    const matchedId = bodyText?.match(GLOBAL_ID_PATTERN)?.[0];
    expect(matchedId).toBeTruthy();

    // Reload and verify Global ID persists from DB
    await page.reload();
    await expect(page.locator("body")).toContainText(matchedId!, { timeout: 20_000 });
  });

  test("Global Admin profile displays a valid Global ID", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.globalAdmin.email);
    await page.goto("/profile");
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i, { timeout: 20_000 });

    await expect(page.getByText("Global ID").first()).toBeVisible({ timeout: 20_000 });

    const generateBtn = page.getByRole("button", { name: /Generate Global ID/i });
    if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await generateBtn.click();
    }

    await expect(page.locator("body")).toContainText(GLOBAL_ID_PATTERN, { timeout: 20_000 });
  });
});
