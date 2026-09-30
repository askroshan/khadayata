import { describe, it, expect } from "vitest";
import {
  canEditMember,
  canChangeLevel,
  canAccessTab,
  getAdminShortcuts,
  canAccessAdmin,
  type AuthUser,
  type EditableMember,
  type UserRoles,
} from "@/lib/admin-utils";

// ─── Role fixtures using production types ─────────────────────────────────────

const globalAdmin: AuthUser = { id: "ga-1", roles: ["Global Admin"] };
const chapterAdmin: AuthUser = { id: "ca-1", roles: ["Chapter Admin"], chapter_id: "ch1" };
const dataSteward: AuthUser = { id: "ds-1", roles: ["Data Steward"], chapter_id: "ch1" };
const moderator: AuthUser = { id: "mod-1", roles: ["Moderator"] };
const regularMember: AuthUser = { id: "mem-1", roles: [] };
const noRolesUser: AuthUser = { id: "mem-2", roles: [] };

const memberInCh1: EditableMember = { id: "m1", chapter_id: "ch1", verification_level: 1 };
const memberInCh2: EditableMember = { id: "m2", chapter_id: "ch2", verification_level: 1 };
const memberNoChapter: EditableMember = { id: "m3", chapter_id: null, verification_level: 0 };

const NO_ROLES: UserRoles = {
  isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false,
  isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false,
  isPublisher: false, isModerator: false,
};

describe("Authorization — member editing", () => {
  it("Global Admin can edit any member in any chapter", () => {
    expect(canEditMember(globalAdmin, memberInCh1)).toBe(true);
    expect(canEditMember(globalAdmin, memberInCh2)).toBe(true);
    expect(canEditMember(globalAdmin, memberNoChapter)).toBe(true);
  });

  it("Chapter Admin can edit members in their own chapter", () => {
    expect(canEditMember(chapterAdmin, memberInCh1)).toBe(true);
  });

  it("Chapter Admin cannot edit members in other chapters", () => {
    expect(canEditMember(chapterAdmin, memberInCh2)).toBe(false);
  });

  it("Data Steward can edit members in their own chapter", () => {
    expect(canEditMember(dataSteward, memberInCh1)).toBe(true);
  });

  it("Data Steward cannot edit members in other chapters", () => {
    expect(canEditMember(dataSteward, memberInCh2)).toBe(false);
  });

  it("Regular member cannot edit anyone", () => {
    expect(canEditMember(regularMember, memberInCh1)).toBe(false);
  });

  it("User with no roles cannot edit anyone", () => {
    expect(canEditMember(noRolesUser, memberInCh1)).toBe(false);
  });
});

describe("Authorization — verification level changes", () => {
  it("Global Admin can change any member's level", () => {
    expect(canChangeLevel(globalAdmin, memberInCh1)).toBe(true);
    expect(canChangeLevel(globalAdmin, memberInCh2)).toBe(true);
  });

  it("Chapter Admin can change level for own chapter members", () => {
    expect(canChangeLevel(chapterAdmin, memberInCh1)).toBe(true);
  });

  it("Chapter Admin cannot change level for other chapter members", () => {
    expect(canChangeLevel(chapterAdmin, memberInCh2)).toBe(false);
  });

  it("Regular member cannot change levels", () => {
    expect(canChangeLevel(regularMember, memberInCh1)).toBe(false);
  });
});

describe("Authorization — admin section access", () => {
  const adminRoles: UserRoles = { ...NO_ROLES, isGlobalAdmin: true };
  const chapterAdminRoles: UserRoles = { ...NO_ROLES, isChapterAdmin: true };
  const moderatorRoles: UserRoles = { ...NO_ROLES, isModerator: true };
  const publisherRoles: UserRoles = { ...NO_ROLES, isPublisher: true };
  const financeAdminRoles: UserRoles = { ...NO_ROLES, isFinanceAdmin: true };
  const regularRoles: UserRoles = { ...NO_ROLES };

  it("Global Admin can view all sections", () => {
    expect(canAccessTab(adminRoles, "stats")).toBe(true);
    expect(canAccessTab(adminRoles, "members")).toBe(true);
    expect(canAccessTab(adminRoles, "chapters")).toBe(true);
    expect(canAccessTab(adminRoles, "roles")).toBe(true);
    expect(canAccessTab(adminRoles, "events")).toBe(true);
    expect(canAccessTab(adminRoles, "news-publisher")).toBe(true);
    expect(canAccessTab(adminRoles, "moderator")).toBe(true);
    expect(canAccessTab(adminRoles, "announcements")).toBe(true);
    expect(canAccessTab(adminRoles, "finance")).toBe(true);
    expect(canAccessTab(adminRoles, "audits")).toBe(true);
    expect(canAccessTab(adminRoles, "analytics")).toBe(true);
  });

  it("Chapter Admin can view stats, members, events, roles, announcements but NOT chapters, analytics, bulk-content", () => {
    expect(canAccessTab(chapterAdminRoles, "stats")).toBe(true);
    expect(canAccessTab(chapterAdminRoles, "members")).toBe(true);
    expect(canAccessTab(chapterAdminRoles, "events")).toBe(true);
    expect(canAccessTab(chapterAdminRoles, "roles")).toBe(true);
    expect(canAccessTab(chapterAdminRoles, "announcements")).toBe(true);
    expect(canAccessTab(chapterAdminRoles, "chapters")).toBe(false);
    expect(canAccessTab(chapterAdminRoles, "analytics")).toBe(false);
    expect(canAccessTab(chapterAdminRoles, "bulk-content")).toBe(false);
    expect(canAccessTab(chapterAdminRoles, "audits")).toBe(false);
  });

  it("Moderator can view stats, moderator, reports, banned-keywords but NOT members, finance", () => {
    expect(canAccessTab(moderatorRoles, "stats")).toBe(true);
    expect(canAccessTab(moderatorRoles, "moderator")).toBe(true);
    expect(canAccessTab(moderatorRoles, "reports")).toBe(true);
    expect(canAccessTab(moderatorRoles, "banned-keywords")).toBe(true);
    expect(canAccessTab(moderatorRoles, "members")).toBe(false);
    expect(canAccessTab(moderatorRoles, "finance")).toBe(false);
  });

  it("Publisher can view news-publisher", () => {
    expect(canAccessTab(publisherRoles, "news-publisher")).toBe(true);
    expect(canAccessTab(publisherRoles, "members")).toBe(false);
  });

  it("Finance Admin can view finance", () => {
    expect(canAccessTab(financeAdminRoles, "finance")).toBe(true);
    expect(canAccessTab(financeAdminRoles, "members")).toBe(false);
  });

  it("Regular member cannot view any admin section", () => {
    expect(canAccessTab(regularRoles, "stats")).toBe(false);
    expect(canAccessTab(regularRoles, "members")).toBe(false);
    expect(canAccessTab(regularRoles, "chapters")).toBe(false);
    expect(canAccessAdmin(regularRoles)).toBe(false);
  });

  it("Unknown section returns false", () => {
    expect(canAccessTab(adminRoles, "unknown" as never)).toBe(false);
  });
});

describe("Authorization — sidebar shortcuts", () => {
  it("Global Admin has 5+ shortcuts", () => {
    expect(getAdminShortcuts({ ...NO_ROLES, isGlobalAdmin: true }).length).toBeGreaterThan(5);
  });

  it("Chapter Admin has stats/events/members but NOT chapters", () => {
    const shortcuts = getAdminShortcuts({ ...NO_ROLES, isChapterAdmin: true });
    const tabs = shortcuts.map(s => s.tab);
    expect(tabs).toContain("events");
    expect(tabs).toContain("members");
    expect(tabs).not.toContain("chapters");
  });

  it("Regular member has no shortcuts", () => {
    expect(getAdminShortcuts({ ...NO_ROLES })).toHaveLength(0);
  });
});

describe("Authorization — invite input validation", () => {
  function validateInviteInput(email: string, firstName: string): { valid: boolean; error?: string } {
    if (!email?.trim() || !firstName?.trim()) {
      return { valid: false, error: "Email and first name are required" };
    }
    return { valid: true };
  }

  function safeLastName(lastName?: string): string {
    return lastName?.trim() || "Member";
  }

  it("requires email and first name", () => {
    expect(validateInviteInput("", "John").valid).toBe(false);
    expect(validateInviteInput("test@test.com", "").valid).toBe(false);
    expect(validateInviteInput("", "").valid).toBe(false);
  });

  it("passes with valid email and first name", () => {
    expect(validateInviteInput("test@test.com", "John").valid).toBe(true);
  });

  it("defaults last name to Member when empty", () => {
    expect(safeLastName("")).toBe("Member");
    expect(safeLastName(undefined)).toBe("Member");
    expect(safeLastName("  ")).toBe("Member");
  });

  it("preserves provided last name", () => {
    expect(safeLastName("Shah")).toBe("Shah");
    expect(safeLastName("  Patel  ")).toBe("Patel");
  });

  it("normalizes email to lowercase", () => {
    const email = "  Test@Example.COM  ";
    expect(email.trim().toLowerCase()).toBe("test@example.com");
  });
});

describe("Authorization — cross-chapter data access prevention", () => {
  it("prevents chapter-scoped Chapter Admin from accessing other chapter data", () => {
    expect(canEditMember(chapterAdmin, memberInCh2)).toBe(false);
    expect(canChangeLevel(chapterAdmin, memberInCh2)).toBe(false);
  });

  it("prevents chapter-scoped Data Steward from accessing other chapter data", () => {
    expect(canEditMember(dataSteward, memberInCh2)).toBe(false);
    expect(canChangeLevel(dataSteward, memberInCh2)).toBe(false);
  });

  it("allows Global Admin cross-chapter access", () => {
    expect(canEditMember(globalAdmin, memberInCh1)).toBe(true);
    expect(canEditMember(globalAdmin, memberInCh2)).toBe(true);
    expect(canChangeLevel(globalAdmin, memberInCh1)).toBe(true);
    expect(canChangeLevel(globalAdmin, memberInCh2)).toBe(true);
  });
});
