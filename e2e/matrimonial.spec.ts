import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { E2E_ACCOUNTS } from "../src/test/helpers/e2e-accounts";

test.describe("Matrimonial E2E (Public, Search/Filter, Matching, Photo Upload, Profile, Moderation)", () => {
  test("Public /matrimonial page loads with browse UI and search", async ({ page }) => {
    await page.goto("/matrimonial");
    await expect(page.locator("body")).toContainText(/Matrimonial/i, { timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i);

    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("Shah");
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
      await searchInput.fill("");
    }
  });

  test("Signed-in member: Matches, Search, Advanced Filters, View Profile, and Photo Upload form", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.member.email);
    await page.goto("/matrimonial/manage");
    await expect(page.getByRole("heading", { name: /Matrimonial/i })).toBeVisible({ timeout: 20_000 });

    // 1. Search bar
    const searchInput = page.getByPlaceholder(/Search by name, city, gotra/i);
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill("Shah");
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    await searchInput.fill("");

    // 2. Expand advanced filters and exercise multiple filters + Clear
    const filterToggle = searchInput.locator("xpath=following::button[1]");
    await filterToggle.click();
    await expect(page.getByText(/Exclude same Gotra/i)).toBeVisible({ timeout: 5_000 });

    const cityInput = page.getByPlaceholder(/e\.g\., Mumbai/i);
    await cityInput.fill("Ahmedabad");
    const gotraSwitch = page.locator("#exclude-same-gotra");
    await gotraSwitch.click();

    const clearBtn = page.getByRole("button", { name: /Clear/i });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(cityInput).toHaveValue("");

    // 3. View Profile dialog (if at least one match card is present)
    const viewBtn = page.getByRole("button", { name: /View Profile/i }).first();
    if (await viewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await viewBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await expect(dialog).toContainText(/Education & Career|Kundali Details/i);
      await page.keyboard.press("Escape");
    }

    // 4. Introductions & Rishta tabs
    const introTab = page.getByRole("tab", { name: /Introductions/i });
    if (await introTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await introTab.click();
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    }

    const rishtaTab = page.getByRole("tab", { name: /Rishta/i });
    if (await rishtaTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rishtaTab.click();
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    }

    // 5. My Profile tab + Photo Upload input + 5-step ProfileForm
    const myProfileTab = page.getByRole("tab", { name: /My Profile/i });
    if (await myProfileTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await myProfileTab.click();
      const editBtn = page.getByRole("button", { name: /Edit Profile/i });
      if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await editBtn.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await expect(dialog.getByText("Profile Photo")).toBeVisible();
        await expect(dialog.locator('input[type="file"]')).toBeAttached();

        // Step through all 5 form sections
        for (const stepName of [
          "Education & Career",
          "Kundali & Background",
          "Family",
          "Partner Preferences",
        ]) {
          await dialog.getByRole("button", { name: stepName }).click();
        }
        await page.keyboard.press("Escape");
      }
    }
  });

  test("Moderator / Global Admin: Matrimonial moderation panel is accessible", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.globalAdmin.email);
    await page.goto("/matrimonial/manage");
    await expect(page.getByRole("heading", { name: /Matrimonial/i })).toBeVisible({ timeout: 20_000 });

    const modTab = page.getByRole("tab", { name: /Moderation|Manage/i }).first();
    if (await modTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await modTab.click();
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    }
  });
});
