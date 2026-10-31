import { expect, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "../../src/test/helpers/e2e-accounts";

/** Sign in through the real /auth UI (no API route mocks). */
export async function signInAs(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/auth");
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Successful sign-in leaves /auth for dashboard, onboarding, or home
  await expect(page).not.toHaveURL(/\/auth$/, { timeout: 20_000 });
}

export async function signOutIfPossible(page: Page) {
  // Prefer explicit logout control when present in AppLayout
  const logout = page.getByRole("button", { name: /log out|sign out/i });
  if (await logout.count()) {
    await logout.first().click();
  }
}
