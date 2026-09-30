import { describe, it, expect } from "vitest";
import {
  canAccessAdmin,
  canAccessTab,
  getAdminShortcuts,
  type UserRoles,
  VALID_ADMIN_TABS,
  type AdminTab,
} from "@/lib/admin-utils";

// ─── All 10 roles as pure UserRoles objects ──────────────────────────────────

const NO_ROLES: UserRoles = {
  isGlobalAdmin: false,
  isChapterAdmin: false,
  isDataSteward: false,
  isDirectoryManager: false,
  isEventManager: false,
  isFinanceAdmin: false,
  isPublisher: false,
  isModerator: false,
};

const GLOBAL_ADMIN: UserRoles = { ...NO_ROLES, isGlobalAdmin: true };
const CHAPTER_ADMIN: UserRoles = { ...NO_ROLES, isChapterAdmin: true };
const DATA_STEWARD: UserRoles = { ...NO_ROLES, isDataSteward: true };
const DIRECTORY_MANAGER: UserRoles = { ...NO_ROLES, isDirectoryManager: true };
const EVENT_MANAGER: UserRoles = { ...NO_ROLES, isEventManager: true };
const FINANCE_ADMIN: UserRoles = { ...NO_ROLES, isFinanceAdmin: true };
const PUBLISHER: UserRoles = { ...NO_ROLES, isPublisher: true };
const MODERATOR: UserRoles = { ...NO_ROLES, isModerator: true };
const REGULAR_MEMBER: UserRoles = { ...NO_ROLES };

// Multi-role: Chapter Admin + Event Manager (common real-world combo)
const CHAPTER_ADMIN_AND_EVENT_MANAGER: UserRoles = {
  ...NO_ROLES,
  isChapterAdmin: true,
  isEventManager: true,
};

const ALL_ROLES: Array<{ name: string; roles: UserRoles }> = [
  { name: "Global Admin", roles: GLOBAL_ADMIN },
  { name: "Chapter Admin", roles: CHAPTER_ADMIN },
  { name: "Data Steward", roles: DATA_STEWARD },
  { name: "Directory Manager", roles: DIRECTORY_MANAGER },
  { name: "Event Manager", roles: EVENT_MANAGER },
  { name: "Finance Admin", roles: FINANCE_ADMIN },
  { name: "Publisher", roles: PUBLISHER },
  { name: "Moderator", roles: MODERATOR },
  { name: "Regular Member", roles: REGULAR_MEMBER },
  { name: "Chapter Admin + Event Manager", roles: CHAPTER_ADMIN_AND_EVENT_MANAGER },
];

// ─── Expected access matrix (source of truth) ─────────────────────────────────
// Each entry: tab -> roles that CAN access it
const EXPECTED_ACCESS: Record<AdminTab, string[]> = {
  stats: ["Global Admin", "Chapter Admin", "Data Steward", "Directory Manager", "Event Manager", "Finance Admin", "Publisher", "Moderator", "Chapter Admin + Event Manager"],
  members: ["Global Admin", "Chapter Admin", "Data Steward", "Chapter Admin + Event Manager"],
  chapters: ["Global Admin"],
  roles: ["Global Admin", "Chapter Admin", "Data Steward", "Chapter Admin + Event Manager"],
  events: ["Global Admin", "Chapter Admin", "Event Manager", "Chapter Admin + Event Manager"],
  "news-publisher": ["Global Admin", "Publisher"],
  moderator: ["Global Admin", "Moderator"],
  announcements: ["Global Admin", "Chapter Admin", "Chapter Admin + Event Manager"],
  finance: ["Global Admin", "Finance Admin"],
  verification: ["Global Admin", "Chapter Admin", "Data Steward", "Chapter Admin + Event Manager"],
  reports: ["Global Admin", "Moderator"],
  transfers: ["Global Admin", "Chapter Admin", "Chapter Admin + Event Manager"],
  audits: ["Global Admin"],
  "tag-requests": ["Global Admin", "Chapter Admin", "Data Steward", "Chapter Admin + Event Manager"],
  directory: ["Global Admin", "Directory Manager"],
  samiti: ["Global Admin", "Chapter Admin", "Chapter Admin + Event Manager"],
  whatsapp: ["Global Admin", "Chapter Admin", "Chapter Admin + Event Manager"],
  sms: ["Global Admin", "Chapter Admin", "Chapter Admin + Event Manager"],
  "bulk-content": ["Global Admin"],
  "banned-keywords": ["Global Admin", "Moderator"],
  analytics: ["Global Admin"],
};

describe("Role-Tab Access Matrix — every role x every tab", () => {
  // Test each tab against every role
  for (const tab of VALID_ADMIN_TABS) {
    describe(`tab: ${tab}`, () => {
      for (const { name, roles } of ALL_ROLES) {
        const shouldAccess = EXPECTED_ACCESS[tab].includes(name);
        it(`${name} ${shouldAccess ? "can" : "cannot"} access ${tab}`, () => {
          expect(canAccessTab(roles, tab)).toBe(shouldAccess);
        });
      }
    });
  }

  // Verify the access matrix covers all tabs
  it("EXPECTED_ACCESS covers every valid admin tab", () => {
    for (const tab of VALID_ADMIN_TABS) {
      expect(EXPECTED_ACCESS[tab]).toBeDefined();
    }
  });
});

describe("canAccessAdmin — admin entry point", () => {
  it("Global Admin can access admin", () => {
    expect(canAccessAdmin(GLOBAL_ADMIN)).toBe(true);
  });
  it("Chapter Admin can access admin", () => {
    expect(canAccessAdmin(CHAPTER_ADMIN)).toBe(true);
  });
  it("Data Steward can access admin", () => {
    expect(canAccessAdmin(DATA_STEWARD)).toBe(true);
  });
  it("Directory Manager can access admin", () => {
    expect(canAccessAdmin(DIRECTORY_MANAGER)).toBe(true);
  });
  it("Event Manager can access admin", () => {
    expect(canAccessAdmin(EVENT_MANAGER)).toBe(true);
  });
  it("Finance Admin can access admin", () => {
    expect(canAccessAdmin(FINANCE_ADMIN)).toBe(true);
  });
  it("Publisher can access admin", () => {
    expect(canAccessAdmin(PUBLISHER)).toBe(true);
  });
  it("Moderator can access admin", () => {
    expect(canAccessAdmin(MODERATOR)).toBe(true);
  });
  it("Regular member cannot access admin", () => {
    expect(canAccessAdmin(REGULAR_MEMBER)).toBe(false);
  });
  it("User with no roles object (all false) cannot access admin", () => {
    expect(canAccessAdmin(NO_ROLES)).toBe(false);
  });
});

describe("getAdminShortcuts — sidebar per role", () => {
  it("Global Admin gets all 9 shortcuts", () => {
    const shortcuts = getAdminShortcuts(GLOBAL_ADMIN);
    expect(shortcuts).toHaveLength(9);
    const tabs = shortcuts.map(s => s.tab);
    expect(tabs).toContain("members");
    expect(tabs).toContain("chapters");
    expect(tabs).toContain("roles");
    expect(tabs).toContain("events");
    expect(tabs).toContain("news-publisher");
    expect(tabs).toContain("finance");
    expect(tabs).toContain("analytics");
    expect(tabs).toContain("audits");
    expect(tabs).toContain("announcements");
  });

  it("Chapter Admin gets members, events, roles, announcements", () => {
    const shortcuts = getAdminShortcuts(CHAPTER_ADMIN);
    const tabs = shortcuts.map(s => s.tab);
    expect(tabs).toContain("members");
    expect(tabs).toContain("events");
    expect(tabs).toContain("roles");
    expect(tabs).toContain("announcements");
    expect(tabs).not.toContain("chapters");
    expect(tabs).not.toContain("finance");
    expect(tabs).not.toContain("analytics");
  });

  it("Data Steward gets only members", () => {
    const shortcuts = getAdminShortcuts(DATA_STEWARD);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("members");
  });

  it("Directory Manager gets only directory", () => {
    const shortcuts = getAdminShortcuts(DIRECTORY_MANAGER);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("directory");
  });

  it("Event Manager gets only events", () => {
    const shortcuts = getAdminShortcuts(EVENT_MANAGER);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("events");
  });

  it("Finance Admin gets only finance", () => {
    const shortcuts = getAdminShortcuts(FINANCE_ADMIN);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("finance");
  });

  it("Publisher gets only news-publisher", () => {
    const shortcuts = getAdminShortcuts(PUBLISHER);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("news-publisher");
  });

  it("Moderator gets only moderator", () => {
    const shortcuts = getAdminShortcuts(MODERATOR);
    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].tab).toBe("moderator");
  });

  it("Regular member gets no shortcuts", () => {
    const shortcuts = getAdminShortcuts(REGULAR_MEMBER);
    expect(shortcuts).toHaveLength(0);
  });

  it("Multi-role (Chapter Admin + Event Manager) gets merged, deduplicated shortcuts", () => {
    const shortcuts = getAdminShortcuts(CHAPTER_ADMIN_AND_EVENT_MANAGER);
    const tabs = shortcuts.map(s => s.tab);
    // Chapter Admin adds members, events, roles, announcements
    // Event Manager adds events (deduped)
    expect(tabs).toContain("members");
    expect(tabs).toContain("events");
    expect(tabs).toContain("roles");
    expect(tabs).toContain("announcements");
    // events should appear only once (deduped)
    const eventCount = tabs.filter(t => t === "events").length;
    expect(eventCount).toBe(1);
  });

  it("Every shortcut tab is accessible by that role (shortcut↔canAccessTab consistency)", () => {
    for (const { name, roles } of ALL_ROLES) {
      const shortcuts = getAdminShortcuts(roles);
      for (const s of shortcuts) {
        expect(canAccessTab(roles, s.tab)).toBe(true);
      }
    }
  });
});

describe("Tab isolation — privileged tabs restricted to Global Admin only", () => {
  const globalOnlyTabs: AdminTab[] = ["chapters", "audits", "bulk-content", "analytics"];

  for (const tab of globalOnlyTabs) {
    it(`${tab} denied for all non-Global-Admin roles`, () => {
      const nonGlobal = ALL_ROLES.filter(r => r.name !== "Global Admin");
      for (const { roles } of nonGlobal) {
        expect(canAccessTab(roles, tab)).toBe(false);
      }
    });
  }
});

describe("Invalid tab handling", () => {
  it("Invalid string tab returns false for all roles", () => {
    for (const { roles } of ALL_ROLES) {
      expect(canAccessTab(roles, "nonexistent" as AdminTab)).toBe(false);
    }
  });
  it("Empty string tab returns false for all roles", () => {
    for (const { roles } of ALL_ROLES) {
      expect(canAccessTab(roles, "" as AdminTab)).toBe(false);
    }
  });
});
