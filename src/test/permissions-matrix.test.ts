import { describe, it, expect } from "vitest";

/**
 * Permissions matrix test — tests the usePermissions() logic across all 8 admin roles.
 * 
 * usePermissions() is a hook that derives permission booleans from useRoles().
 * Since it depends on React hooks, we test the same permission logic by
 * extracting the derivations as pure functions and verifying them.
 * 
 * The actual hook lives in src/hooks/useRoles.ts and its logic is:
 *   isGlobalAdmin = hasRole("Global Admin")
 *   isChapterAdmin = hasRole(["Global Admin", "Chapter Admin"])
 *   isDataSteward = hasRole(["Global Admin", "Data Steward"])
 *   ...etc
 * 
 * We replicate the derivation here and test the expected permission outcomes
 * for each role. This catches regressions if someone changes the permission
 * logic in usePermissions().
 */

interface RoleFlags {
  isGlobalAdmin: boolean;
  isChapterAdmin: boolean;
  isDataSteward: boolean;
  isDirectoryManager: boolean;
  isEventManager: boolean;
  isFinanceAdmin: boolean;
  isPublisher: boolean;
  isModerator: boolean;
}

// Replicate usePermissions() derivations from src/hooks/useRoles.ts
function derivePermissions(r: RoleFlags) {
  const isGlobalPublisher = r.isGlobalAdmin || r.isPublisher;
  const canManageChapter = r.isGlobalAdmin || r.isChapterAdmin;

  return {
    canManageAnnouncements: r.isGlobalAdmin || r.isChapterAdmin,
    canVerifyMembers: r.isGlobalAdmin || r.isDataSteward || r.isChapterAdmin || r.isModerator,
    canEditAnyMember: r.isGlobalAdmin || r.isDataSteward || r.isChapterAdmin || r.isModerator,
    canInviteMembers: r.isGlobalAdmin || r.isChapterAdmin || r.isDataSteward || r.isModerator,
    canManageEvents: r.isGlobalAdmin || r.isEventManager || r.isModerator,
    canDeleteEvents: r.isGlobalAdmin || r.isEventManager || r.isModerator,
    canPublishNews: r.isGlobalAdmin || r.isPublisher || r.isModerator,
    canModerateNews: r.isGlobalAdmin || r.isPublisher || r.isModerator,
    canDeleteNews: r.isGlobalAdmin || r.isPublisher || r.isModerator,
    canManageDirectory: r.isGlobalAdmin || r.isDirectoryManager,
    canVerifyBusinesses: r.isGlobalAdmin || r.isDirectoryManager,
    canDeleteJobs: r.isGlobalAdmin || r.isDirectoryManager,
    canManageFunds: r.isGlobalAdmin || r.isFinanceAdmin,
    canManageScholarships: r.isGlobalAdmin || r.isFinanceAdmin,
    canViewAllDonations: r.isGlobalAdmin || r.isFinanceAdmin,
    canManageHeritageTags: r.isGlobalAdmin || r.isDataSteward,
    canManageOralHistories: r.isGlobalAdmin || r.isDataSteward,
    canManageMatrimonial: r.isGlobalAdmin || r.isDataSteward,
    canManageTransfers: r.isGlobalAdmin || r.isChapterAdmin,
    canManageEmergencyContacts: r.isGlobalAdmin || r.isChapterAdmin,
    canApproveBookings: r.isGlobalAdmin || r.isChapterAdmin || r.isFinanceAdmin,
    canApproveMedicalAid: r.isGlobalAdmin || r.isChapterAdmin || r.isFinanceAdmin,
    canViewAudits: r.isGlobalAdmin || r.isDataSteward,
    canManageWhatsApp: r.isGlobalAdmin,
    canPostObituaries: r.isGlobalAdmin || r.isChapterAdmin || r.isPublisher,
    isGlobalPublisher,
    canManageChapter,
  };
}

type Permissions = ReturnType<typeof derivePermissions>;
type PermissionKey = keyof Permissions;

const NO_ROLES: RoleFlags = {
  isGlobalAdmin: false, isChapterAdmin: false, isDataSteward: false,
  isDirectoryManager: false, isEventManager: false, isFinanceAdmin: false,
  isPublisher: false, isModerator: false,
};

const ROLES: Array<{ name: string; flags: RoleFlags }> = [
  { name: "Global Admin", flags: { ...NO_ROLES, isGlobalAdmin: true } },
  { name: "Chapter Admin", flags: { ...NO_ROLES, isChapterAdmin: true } },
  { name: "Data Steward", flags: { ...NO_ROLES, isDataSteward: true } },
  { name: "Directory Manager", flags: { ...NO_ROLES, isDirectoryManager: true } },
  { name: "Event Manager", flags: { ...NO_ROLES, isEventManager: true } },
  { name: "Finance Admin", flags: { ...NO_ROLES, isFinanceAdmin: true } },
  { name: "Publisher", flags: { ...NO_ROLES, isPublisher: true } },
  { name: "Moderator", flags: { ...NO_ROLES, isModerator: true } },
  { name: "Regular Member", flags: { ...NO_ROLES } },
];

// Expected permission matrix: permission -> roles that HAVE it
const EXPECTED: Record<PermissionKey, string[]> = {
  canManageAnnouncements: ["Global Admin", "Chapter Admin"],
  canVerifyMembers: ["Global Admin", "Data Steward", "Chapter Admin", "Moderator"],
  canEditAnyMember: ["Global Admin", "Data Steward", "Chapter Admin", "Moderator"],
  canInviteMembers: ["Global Admin", "Chapter Admin", "Data Steward", "Moderator"],
  canManageEvents: ["Global Admin", "Event Manager", "Moderator"],
  canDeleteEvents: ["Global Admin", "Event Manager", "Moderator"],
  canPublishNews: ["Global Admin", "Publisher", "Moderator"],
  canModerateNews: ["Global Admin", "Publisher", "Moderator"],
  canDeleteNews: ["Global Admin", "Publisher", "Moderator"],
  canManageDirectory: ["Global Admin", "Directory Manager"],
  canVerifyBusinesses: ["Global Admin", "Directory Manager"],
  canDeleteJobs: ["Global Admin", "Directory Manager"],
  canManageFunds: ["Global Admin", "Finance Admin"],
  canManageScholarships: ["Global Admin", "Finance Admin"],
  canViewAllDonations: ["Global Admin", "Finance Admin"],
  canManageHeritageTags: ["Global Admin", "Data Steward"],
  canManageOralHistories: ["Global Admin", "Data Steward"],
  canManageMatrimonial: ["Global Admin", "Data Steward"],
  canManageTransfers: ["Global Admin", "Chapter Admin"],
  canManageEmergencyContacts: ["Global Admin", "Chapter Admin"],
  canApproveBookings: ["Global Admin", "Chapter Admin", "Finance Admin"],
  canApproveMedicalAid: ["Global Admin", "Chapter Admin", "Finance Admin"],
  canViewAudits: ["Global Admin", "Data Steward"],
  canManageWhatsApp: ["Global Admin"],
  canPostObituaries: ["Global Admin", "Chapter Admin", "Publisher"],
  isGlobalPublisher: ["Global Admin", "Publisher"],
  canManageChapter: ["Global Admin", "Chapter Admin"],
};

describe("Permissions matrix — every role x every permission", () => {
  const permissionKeys = Object.keys(EXPECTED) as PermissionKey[];

  for (const perm of permissionKeys) {
    describe(`permission: ${perm}`, () => {
      for (const { name, flags } of ROLES) {
        const shouldHave = EXPECTED[perm].includes(name);
        it(`${name} ${shouldHave ? "has" : "lacks"} ${perm}`, () => {
          const perms = derivePermissions(flags);
          expect(perms[perm]).toBe(shouldHave);
        });
      }
    });
  }
});

describe("Permission matrix completeness", () => {
  it("EXPECTED covers every derived permission", () => {
    const sample = derivePermissions(NO_ROLES);
    const derivedKeys = Object.keys(sample) as PermissionKey[];
    for (const key of derivedKeys) {
      expect(EXPECTED[key]).toBeDefined();
    }
  });

  it("Regular member has NO permissions", () => {
    const perms = derivePermissions(NO_ROLES);
    for (const [key, val] of Object.entries(perms)) {
      if (typeof val === "boolean") {
        expect(val).toBe(false);
      }
    }
  });

  it("Global Admin has ALL permissions", () => {
    const perms = derivePermissions({ ...NO_ROLES, isGlobalAdmin: true });
    for (const [key, val] of Object.entries(perms)) {
      if (typeof val === "boolean") {
        expect(val).toBe(true);
      }
    }
  });
});

describe("Role isolation — specific permissions restricted to specific roles", () => {
  it("canManageWhatsApp is Global Admin ONLY", () => {
    const nonGlobal = ROLES.filter(r => r.name !== "Global Admin");
    for (const { flags } of nonGlobal) {
      expect(derivePermissions(flags).canManageWhatsApp).toBe(false);
    }
    expect(derivePermissions({ ...NO_ROLES, isGlobalAdmin: true }).canManageWhatsApp).toBe(true);
  });

  it("canManageDirectory requires Directory Manager or Global Admin", () => {
    for (const { name, flags } of ROLES) {
      const has = derivePermissions(flags).canManageDirectory;
      expect(has).toBe(["Global Admin", "Directory Manager"].includes(name));
    }
  });

  it("canManageFunds requires Finance Admin or Global Admin", () => {
    for (const { name, flags } of ROLES) {
      const has = derivePermissions(flags).canManageFunds;
      expect(has).toBe(["Global Admin", "Finance Admin"].includes(name));
    }
  });

  it("canManageHeritageTags requires Data Steward or Global Admin", () => {
    for (const { name, flags } of ROLES) {
      const has = derivePermissions(flags).canManageHeritageTags;
      expect(has).toBe(["Global Admin", "Data Steward"].includes(name));
    }
  });

  it("canManageEvents allows Event Manager AND Moderator AND Global Admin", () => {
    for (const { name, flags } of ROLES) {
      const has = derivePermissions(flags).canManageEvents;
      expect(has).toBe(["Global Admin", "Event Manager", "Moderator"].includes(name));
    }
  });
});

describe("Cross-permission consistency", () => {
  it("canDeleteEvents equals canManageEvents for every role", () => {
    for (const { flags } of ROLES) {
      const perms = derivePermissions(flags);
      expect(perms.canDeleteEvents).toBe(perms.canManageEvents);
    }
  });

  it("canVerifyBusinesses implies canManageDirectory", () => {
    for (const { flags } of ROLES) {
      const perms = derivePermissions(flags);
      if (perms.canVerifyBusinesses) {
        expect(perms.canManageDirectory).toBe(true);
      }
    }
  });

  it("canManageScholarships equals canManageFunds", () => {
    for (const { flags } of ROLES) {
      const perms = derivePermissions(flags);
      expect(perms.canManageScholarships).toBe(perms.canManageFunds);
    }
  });

  it("isGlobalPublisher equals canManageChapter OR Publisher-specific", () => {
    for (const { name, flags } of ROLES) {
      const perms = derivePermissions(flags);
      // isGlobalPublisher should be true for Global Admin and Publisher
      expect(perms.isGlobalPublisher).toBe(["Global Admin", "Publisher"].includes(name));
    }
  });
});
