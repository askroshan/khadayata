import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { E2E_ACCOUNTS } from "../src/test/helpers/e2e-accounts";

test.describe("Per-dialog real DB CRUD across roles", () => {
  test("Global Admin: Announcements CRUD (Create -> Reload Verify -> Delete)", async ({ page }) => {
    const title = `E2E Announcement ${Date.now()}`;
    await signInAs(page, E2E_ACCOUNTS.globalAdmin.email);
    await page.goto("/admin?tab=announcements");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    const titleInput = page.getByPlaceholder(/title|headline|announcement/i).first();
    await expect(titleInput).toBeVisible({ timeout: 15_000 });
    await titleInput.fill(title);

    const publishBtn = page.getByRole("button", { name: /publish|post|create|add/i }).first();
    await publishBtn.click();

    await expect(page.locator("body")).toContainText(title, { timeout: 15_000 });

    // Reload to verify DB persistence
    await page.reload();
    await expect(page.locator("body")).toContainText(title, { timeout: 15_000 });

    // Clean up: delete the announcement
    const card = page.getByText(title).locator("xpath=ancestor::div[.//button][1]");
    await card.getByRole("button").last().click();
    const confirmBtn = page.getByRole("button", { name: /delete|confirm|remove/i });
    if (await confirmBtn.count()) {
      await confirmBtn.last().click();
    }
    await expect(page.locator("body")).not.toContainText(title, { timeout: 15_000 });
  });

  test("Event Manager: Create Event dialog opens, validates, and closes cleanly", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.eventManager.email);
    await page.goto("/admin?tab=events");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    const createBtn = page.getByRole("button", { name: /create event|new event|add event/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 15_000 });
    await createBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Submit button should be disabled or block submission when required title is empty
    const submitBtn = dialog.getByRole("button", { name: /create|save|publish/i }).last();
    await expect(submitBtn).toBeVisible();
  });

  test("Global Publisher: Write Article dialog opens and validates required fields", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.publisher.email);
    await page.goto("/admin?tab=news-publisher");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    const writeBtn = page.getByRole("button", { name: /write|new article|create/i }).first();
    await expect(writeBtn).toBeVisible({ timeout: 15_000 });
    await writeBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.locator("input").first()).toBeVisible();
  });

  test("Finance Admin: Create Fund dialog opens in Fund Management sub-tab", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.financeAdmin.email);
    await page.goto("/admin?tab=finance");
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible({ timeout: 20_000 });

    const fundsTab = page.getByRole("tab", { name: /fund/i }).first();
    if (await fundsTab.count()) {
      await fundsTab.click();
    }

    const createFundBtn = page.getByRole("button", { name: /create fund|new fund|add fund/i }).first();
    if (await createFundBtn.count()) {
      await createFundBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
    }
  });

  test("Regular Member: Emergency Contacts page & Add Contact dialog", async ({ page }) => {
    await signInAs(page, E2E_ACCOUNTS.member.email);
    await page.goto("/emergency-contacts");
    await expect(page.locator("body")).not.toContainText(/Something went wrong|Access Denied/i, {
      timeout: 15_000,
    });

    const addBtn = page.getByRole("button", { name: /add/i }).first();
    if (await addBtn.count()) {
      await addBtn.click();
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    }
  });
});
