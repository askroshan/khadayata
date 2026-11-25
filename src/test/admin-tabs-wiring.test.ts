import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { VALID_ADMIN_TABS } from "@/lib/admin-utils";

describe("Admin.tsx tab wiring integrity", () => {
  const adminSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/pages/Admin.tsx"),
    "utf-8"
  );

  it("renders a TabsContent panel for every VALID_ADMIN_TABS entry except stats", () => {
    const missing: string[] = [];
    for (const tab of VALID_ADMIN_TABS) {
      if (tab === "stats") continue;
      if (!adminSrc.includes(`<TabsContent value="${tab}"`)) {
        missing.push(tab);
      }
    }
    expect(missing).toEqual([]);
  });

  it("redirects requestedTab === 'stats' to firstAccessibleAdminTab so /admin?tab=stats is never blank", () => {
    expect(adminSrc).toMatch(/requestedTab\s*===\s*"stats"/);
  });
});
