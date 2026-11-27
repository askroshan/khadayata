import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canAccessTab, VALID_ADMIN_TABS, type UserRoles } from "@/lib/admin-utils";

const BASE_ROLES: UserRoles = {
  isGlobalAdmin: false,
  isChapterAdmin: false,
  isDataSteward: false,
  isDirectoryManager: false,
  isEventManager: false,
  isFinanceAdmin: false,
  isPublisher: false,
  isModerator: false,
};

describe("Matrimonial Shortlists, Messages & Monthly PDF Ad Pages", () => {
  it("registers matrimonial-ads tab and restricts it to Global Admin and Moderator", () => {
    expect(VALID_ADMIN_TABS).toContain("matrimonial-ads");
    expect(canAccessTab({ ...BASE_ROLES, isGlobalAdmin: true }, "matrimonial-ads")).toBe(true);
    expect(canAccessTab({ ...BASE_ROLES, isModerator: true }, "matrimonial-ads")).toBe(true);
    expect(canAccessTab({ ...BASE_ROLES, isChapterAdmin: true }, "matrimonial-ads")).toBe(false);
    expect(canAccessTab(BASE_ROLES, "matrimonial-ads")).toBe(false);
  });

  it("monthly PDF generator defines all 4 required filename patterns, recipients, and omits candidate emails", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts/generate_monthly_matrimonial_pdfs.py");
    const src = fs.readFileSync(scriptPath, "utf8");

    expect(src).toContain("nri-boys-{date_str}.pdf");
    expect(src).toContain("nri-girls-{date_str}.pdf");
    expect(src).toContain("india-boys-{date_str}.pdf");
    expect(src).toContain("india-girls-{date_str}.pdf");
    expect(src).toContain("roshan@khadayataonline.com");
    expect(src).toContain("rinashah075@gmail.com");
    expect(src).toContain("matrimonial_ad_pdfs");
    expect(src).not.toContain("contact_email");
    expect(src).not.toContain('format_field("Email"');
  });

  it("GitHub Actions workflow schedules monthly PDFs on the 1st of every month", () => {
    const wfPath = path.resolve(process.cwd(), ".github/workflows/monthly-matrimonial-pdfs.yml");
    const src = fs.readFileSync(wfPath, "utf8");

    expect(src).toContain('cron: "0 6 1 * *"');
    expect(src).toContain("scripts/generate_monthly_matrimonial_pdfs.py");
  });
});
