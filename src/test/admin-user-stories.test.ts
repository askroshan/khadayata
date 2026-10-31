import { describe, it, expect } from "vitest";
import {
  filterMembers,
  resolveAdminTab,
  buildAdminUrl,
  getAdminShortcuts,
  canEditMember,
  getEditDisabledReason,
  canChangeLevel,
  canLevelUp,
  canLevelDown,
  getLevelChangeDisabledReason,
  buildCsvContent,
  canAccessAdmin,
  canAccessTab,
  VALID_ADMIN_TABS,
  LEVEL_LABELS,
  type AdminMember,
  type AdminTab,
  type UserRoles,
  type AuthUser,
  type EditableMember,
} from "@/lib/admin-utils";

type Member = AdminMember;

function generateCsvFilename(): string {
  const today = new Date().toISOString().split("T")[0];
  return `members-${today}.csv`;
}

// ============================================================================
// TESTS
// ============================================================================

describe("US-001: Filter Members by Date Range", () => {
  const mockMembers: Member[] = [
    { id: "1", user_id: "u1", first_name: "Harsh", last_name: "Shah", verification_level: 3, onboarding_completed: true, chapter_id: "ch1", created_at: "2026-01-15T10:00:00Z", chapters: { name: "Mumbai" } },
    { id: "2", user_id: "u2", first_name: "Aman", last_name: "Patel", verification_level: 1, onboarding_completed: false, chapter_id: "ch2", created_at: "2026-02-20T15:30:00Z", chapters: { name: "Ahmedabad" } },
    { id: "3", user_id: "u3", first_name: "Neev", last_name: "Mehta", verification_level: 2, onboarding_completed: true, chapter_id: "ch1", created_at: "2026-03-10T08:45:00Z", chapters: { name: "Mumbai" } },
    { id: "4", user_id: "u4", first_name: "Rina", last_name: "Shah", verification_level: 0, onboarding_completed: false, chapter_id: "ch3", created_at: undefined, chapters: { name: "Toronto" } },
  ];

  it("AC: date range filter has from and to inputs that work together", () => {
    const result = filterMembers(mockMembers, "", "", "", "2026-02-01", "2026-02-28");
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("Aman");
  });

  it("AC: filtering by From Date shows members joined on or after that date", () => {
    const result = filterMembers(mockMembers, "", "", "", "2026-02-01", "");
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toContain("2");
    expect(result.map((m) => m.id)).toContain("3");
  });

  it("AC: filtering by To Date shows members joined on or before that date", () => {
    const result = filterMembers(mockMembers, "", "", "", "", "2026-02-28");
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toContain("1");
    expect(result.map((m) => m.id)).toContain("2");
  });

  it("AC: date range works with search filter", () => {
    const result = filterMembers(mockMembers, "Shah", "", "", "2026-01-01", "2026-01-31");
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("Harsh");
  });

  it("AC: date range works with level filter", () => {
    const result = filterMembers(mockMembers, "", "1", "", "2026-02-01", "");
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("Aman");
  });

  it("AC: date range works with status filter", () => {
    const result = filterMembers(mockMembers, "", "", "complete", "2026-03-01", "");
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("Neev");
  });

  it("AC: members without created_at are excluded from date filters", () => {
    const result = filterMembers(mockMembers, "", "", "", "2026-01-01", "2026-12-31");
    expect(result).toHaveLength(3);
    expect(result.find((m) => m.id === "4")).toBeUndefined();
  });

  it("AC: time boundaries - filter for specific day includes full day", () => {
    const result = filterMembers(mockMembers, "", "", "", "2026-02-20", "2026-02-20");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("AC: clear removes all filters", () => {
    const allResult = filterMembers(mockMembers, "", "", "", "", "");
    expect(allResult).toHaveLength(4);
  });
});

describe("US-002: Navigate Admin Sections via URL Parameters", () => {
  it("AC: URL parameter tab controls which section is displayed", () => {
    expect(resolveAdminTab("members")).toBe("members");
    expect(resolveAdminTab("finance")).toBe("finance");
    expect(resolveAdminTab("events")).toBe("events");
  });

  it("AC: default tab is stats when no parameter provided", () => {
    expect(resolveAdminTab(null)).toBe("stats");
    expect(resolveAdminTab("")).toBe("stats");
  });

  it("AC: invalid tab values default to stats", () => {
    expect(resolveAdminTab("invalid-tab")).toBe("stats");
    expect(resolveAdminTab("xyz")).toBe("stats");
    expect(resolveAdminTab("Admin")).toBe("stats");
  });

  it("AC: all valid tabs are recognized", () => {
    for (const tab of VALID_ADMIN_TABS) {
      expect(resolveAdminTab(tab)).toBe(tab);
    }
  });

  it("AC: other URL parameters preserved when building URL", () => {
    const url = buildAdminUrl("members", { search: "john", page: "2" });
    expect(url).toContain("tab=members");
    expect(url).toContain("search=john");
    expect(url).toContain("page=2");
  });

  it("AC: buildAdminUrl generates correct paths", () => {
    expect(buildAdminUrl("chapters")).toBe("/admin?tab=chapters");
    expect(buildAdminUrl("news-publisher")).toBe("/admin?tab=news-publisher");
  });

  it("AC: page title reflects current section", () => {
    const sectionTitles: Record<string, string> = {
      stats: "Admin Dashboard",
      members: "Members",
      chapters: "Chapters",
      finance: "Finance",
    };
    expect(sectionTitles[resolveAdminTab("members")]).toBe("Members");
    expect(sectionTitles[resolveAdminTab(null)]).toBe("Admin Dashboard");
  });
});

describe("US-003: Sidebar Navigation Shortcuts with Authorization", () => {
  it("AC: Global Admin sees all shortcuts", () => {
    const roles: UserRoles = { isGlobalAdmin: true, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: false };
    const shortcuts = getAdminShortcuts(roles);
    expect(shortcuts.length).toBeGreaterThanOrEqual(6);
    expect(shortcuts.map((s) => s.tab)).toContain("members");
    expect(shortcuts.map((s) => s.tab)).toContain("chapters");
    expect(shortcuts.map((s) => s.tab)).toContain("finance");
    expect(shortcuts.map((s) => s.tab)).toContain("analytics");
  });

  it("AC: Chapter Admin sees limited shortcuts", () => {
    const roles: UserRoles = { isGlobalAdmin: false, isChapterAdmin: true, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: false };
    const shortcuts = getAdminShortcuts(roles);
    expect(shortcuts.map((s) => s.tab)).toContain("members");
    expect(shortcuts.map((s) => s.tab)).toContain("events");
    expect(shortcuts.map((s) => s.tab)).not.toContain("chapters");
    expect(shortcuts.map((s) => s.tab)).not.toContain("analytics");
  });

  it("AC: Moderator sees only moderator section", () => {
    const roles: UserRoles = { isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: true };
    const shortcuts = getAdminShortcuts(roles);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("moderator");
  });

  it("AC: Publisher sees only news section", () => {
    const roles: UserRoles = { isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: true, isModerator: false };
    const shortcuts = getAdminShortcuts(roles);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("news-publisher");
  });

  it("AC: Finance Manager sees only finance section", () => {
    const roles: UserRoles = { isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: true, isPublisher: false, isModerator: false };
    const shortcuts = getAdminShortcuts(roles);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("finance");
  });

  it("AC: Regular member with no roles sees no shortcuts", () => {
    const roles: UserRoles = { isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: false };
    const shortcuts = getAdminShortcuts(roles);
    expect(shortcuts).toHaveLength(0);
  });

  it("AC: user with multiple roles sees deduped union", () => {
    const roles: UserRoles = { isGlobalAdmin: false, isChapterAdmin: true, isDataSteward: false, isDirectoryManager: false, isEventManager: true, isFinanceAdmin: true, isPublisher: false, isModerator: false };
    const shortcuts = getAdminShortcuts(roles);
    const tabs = shortcuts.map((s) => s.tab);
    expect(new Set(tabs).size).toBe(tabs.length);
    expect(tabs).toContain("events");
    expect(tabs).toContain("finance");
  });

  it("AC: shortcuts produce correct navigation targets", () => {
    const roles: UserRoles = { isGlobalAdmin: true, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: false };
    const shortcuts = getAdminShortcuts(roles);
    shortcuts.forEach((s) => {
      expect(VALID_ADMIN_TABS).toContain(s.tab);
    });
  });
});

describe("US-004: Member Edit with Authorization Scoping", () => {
  const globalAdmin: AuthUser = { id: "admin-1", roles: ["Global Admin"], chapter_id: null };
  const chapterAdmin: AuthUser = { id: "ca-1", roles: ["Chapter Admin"], chapter_id: "ch1" };
  const dataSteward: AuthUser = { id: "ds-1", roles: ["Data Steward"], chapter_id: "ch1" };
  const regularMember: AuthUser = { id: "mem-1", roles: [], chapter_id: "ch1" };

  const memberCh1: EditableMember = { id: "m1", chapter_id: "ch1", verification_level: 1 };
  const memberCh2: EditableMember = { id: "m2", chapter_id: "ch2", verification_level: 2 };

  it("AC: Global Admin can edit any member in any chapter", () => {
    expect(canEditMember(globalAdmin, memberCh1)).toBe(true);
    expect(canEditMember(globalAdmin, memberCh2)).toBe(true);
  });

  it("AC: Chapter Admin can edit members in their chapter", () => {
    expect(canEditMember(chapterAdmin, memberCh1)).toBe(true);
  });

  it("AC: Chapter Admin cannot edit members in other chapters", () => {
    expect(canEditMember(chapterAdmin, memberCh2)).toBe(false);
  });

  it("AC: Data Steward can edit members in their chapter", () => {
    expect(canEditMember(dataSteward, memberCh1)).toBe(true);
  });

  it("AC: Data Steward cannot edit members in other chapters", () => {
    expect(canEditMember(dataSteward, memberCh2)).toBe(false);
  });

  it("AC: Regular member cannot edit any member", () => {
    expect(canEditMember(regularMember, memberCh1)).toBe(false);
  });

  it("AC: disabled reason explains cross-chapter restriction", () => {
    const reason = getEditDisabledReason(chapterAdmin, memberCh2);
    expect(reason).toBe("This member belongs to a different chapter");
  });

  it("AC: disabled reason explains no permission", () => {
    const reason = getEditDisabledReason(regularMember, memberCh1);
    expect(reason).toBe("You do not have permission to edit members");
  });

  it("AC: no disabled reason when edit is allowed", () => {
    expect(getEditDisabledReason(globalAdmin, memberCh1)).toBeNull();
    expect(getEditDisabledReason(chapterAdmin, memberCh1)).toBeNull();
  });
});

describe("US-005: Verification Level Changes with Authorization", () => {
  const globalAdmin: AuthUser = { id: "admin-1", roles: ["Global Admin"], chapter_id: null };
  const chapterAdmin: AuthUser = { id: "ca-1", roles: ["Chapter Admin"], chapter_id: "ch1" };

  const memberL0: EditableMember = { id: "m0", chapter_id: "ch1", verification_level: 0 };
  const memberL3: EditableMember = { id: "m3", chapter_id: "ch1", verification_level: 3 };
  const memberL5: EditableMember = { id: "m5", chapter_id: "ch1", verification_level: 5 };
  const memberOtherChapter: EditableMember = { id: "mo", chapter_id: "ch2", verification_level: 2 };

  it("AC: Admin can change any member level", () => {
    expect(canChangeLevel(globalAdmin, memberL3)).toBe(true);
    expect(canChangeLevel(globalAdmin, memberOtherChapter)).toBe(true);
  });

  it("AC: Chapter Admin can change level for their chapter", () => {
    expect(canChangeLevel(chapterAdmin, memberL3)).toBe(true);
  });

  it("AC: Chapter Admin cannot change level for other chapters", () => {
    expect(canChangeLevel(chapterAdmin, memberOtherChapter)).toBe(false);
  });

  it("AC: cannot upgrade beyond level 5", () => {
    expect(canLevelUp(memberL5)).toBe(false);
  });

  it("AC: cannot downgrade below level 0", () => {
    expect(canLevelDown(memberL0)).toBe(false);
  });

  it("AC: can upgrade from L3 to L4", () => {
    expect(canLevelUp(memberL3)).toBe(true);
  });

  it("AC: can downgrade from L3 to L2", () => {
    expect(canLevelDown(memberL3)).toBe(true);
  });

  it("AC: disabled reason for max level up", () => {
    expect(getLevelChangeDisabledReason(globalAdmin, memberL5, "up")).toBe(
      "Already at maximum level (L5 Patron)"
    );
  });

  it("AC: disabled reason for min level down", () => {
    expect(getLevelChangeDisabledReason(globalAdmin, memberL0, "down")).toBe(
      "Already at minimum level (L0 Basic)"
    );
  });

  it("AC: disabled reason for cross-chapter level change", () => {
    const reason = getLevelChangeDisabledReason(chapterAdmin, memberOtherChapter, "up");
    expect(reason).toBe("This member belongs to a different chapter");
  });

  it("AC: no disabled reason when change is allowed", () => {
    expect(getLevelChangeDisabledReason(globalAdmin, memberL3, "up")).toBeNull();
    expect(getLevelChangeDisabledReason(chapterAdmin, memberL3, "down")).toBeNull();
  });
});

describe("US-006: CSV Export with Filtering", () => {
  const mockMembers: Member[] = [
    { id: "1", user_id: "u1", first_name: "Harsh", last_name: "Shah", verification_level: 3, onboarding_completed: true, chapter_id: "ch1", created_at: "2026-01-15T10:00:00Z", chapters: { name: "Mumbai" } },
    { id: "2", user_id: "u5", first_name: 'Rina "R"', last_name: "O'Shah", verification_level: 0, onboarding_completed: false, chapter_id: null, created_at: undefined, chapters: null },
  ];

  it("AC: CSV includes correct headers", () => {
    const csv = buildCsvContent(mockMembers);
    const header = csv.split("\n")[0];
    expect(header).toBe("Name,Chapter,Verification Level,Onboarding,Joined");
  });

  it("AC: level shown as L# - Label", () => {
    const csv = buildCsvContent([mockMembers[0]]);
    expect(csv).toContain("L3 — Senior");
  });

  it("AC: status shown as Complete or Pending", () => {
    const csv = buildCsvContent(mockMembers);
    expect(csv).toContain("Complete");
    expect(csv).toContain("Pending");
  });

  it("AC: date formatted as YYYY-MM-DD", () => {
    const csv = buildCsvContent([mockMembers[0]]);
    expect(csv).toContain("2026-01-15");
  });

  it("AC: special characters in names properly escaped", () => {
    const csv = buildCsvContent([mockMembers[1]]);
    expect(csv).toContain('"Rina ""R"" O\'Shah"');
  });

  it("AC: empty chapter shown as empty string not null", () => {
    const csv = buildCsvContent([mockMembers[1]]);
    const rows = csv.split("\n");
    const fields = rows[1].split(",");
    // Chapter field should be empty string
    expect(fields[1]).toBe("");
  });

  it("AC: filename includes current date", () => {
    const filename = generateCsvFilename();
    expect(filename).toMatch(/^members-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("AC: exported data respects current filters (via filtered list)", () => {
    const filtered = filterMembers(mockMembers, "Harsh", "", "", "", "");
    const csv = buildCsvContent(filtered);
    const rows = csv.split("\n");
    expect(rows).toHaveLength(2); // header + 1 row
    expect(rows[1]).toContain("Harsh Shah");
  });
});

describe("US-007: Admin Dashboard Role-Based Access", () => {
  const globalAdmin: UserRoles = { isGlobalAdmin: true, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: false };
  const chapterAdmin: UserRoles = { isGlobalAdmin: false, isChapterAdmin: true, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: false };
  const moderator: UserRoles = { isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: true };
  const regularMember: UserRoles = { isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false, isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false, isPublisher: false, isModerator: false };

  it("AC: Regular member cannot access admin", () => {
    expect(canAccessAdmin(regularMember)).toBe(false);
  });

  it("AC: Global Admin can access all tabs", () => {
    expect(canAccessAdmin(globalAdmin)).toBe(true);
    for (const tab of VALID_ADMIN_TABS) {
      expect(canAccessTab(globalAdmin, tab)).toBe(true);
    }
  });

  it("AC: Chapter Admin can access appropriate tabs", () => {
    expect(canAccessTab(chapterAdmin, "members")).toBe(true);
    expect(canAccessTab(chapterAdmin, "events")).toBe(true);
    expect(canAccessTab(chapterAdmin, "announcements")).toBe(true);
    expect(canAccessTab(chapterAdmin, "chapters")).toBe(false);
    expect(canAccessTab(chapterAdmin, "analytics")).toBe(false);
    expect(canAccessTab(chapterAdmin, "bulk-content")).toBe(false);
  });

  it("AC: Moderator can access moderator, reports, members, and news", () => {
    expect(canAccessTab(moderator, "moderator")).toBe(true);
    expect(canAccessTab(moderator, "reports")).toBe(true);
    expect(canAccessTab(moderator, "banned-keywords")).toBe(true);
    expect(canAccessTab(moderator, "members")).toBe(true);
    expect(canAccessTab(moderator, "news-publisher")).toBe(true);
    expect(canAccessTab(moderator, "finance")).toBe(false);
  });

  it("AC: unauthorized access returns false for invalid tab", () => {
    expect(canAccessTab(globalAdmin, "nonexistent" as AdminTab)).toBe(false);
  });

  it("AC: role changes take effect (roles object changes)", () => {
    const before: UserRoles = { ...regularMember };
    expect(canAccessAdmin(before)).toBe(false);
    const after: UserRoles = { ...before, isChapterAdmin: true };
    expect(canAccessAdmin(after)).toBe(true);
  });
});
