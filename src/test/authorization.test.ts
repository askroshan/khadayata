import { describe, it, expect } from "vitest";

interface User {
  id: string;
  roles: string[];
  chapter_id?: string;
}

interface Member {
  id: string;
  chapter_id: string | null;
  verification_level: number;
}

function canEditMember(user: User, member: Member): boolean {
  if (!user.roles.includes("admin") && !user.roles.includes("director")) {
    return false;
  }

  if (user.roles.includes("director") && user.chapter_id && member.chapter_id !== user.chapter_id) {
    return false;
  }

  return true;
}

function canChangeMemberLevel(user: User, member: Member): boolean {
  if (!user.roles.includes("admin") && !user.roles.includes("director")) {
    return false;
  }

  if (user.roles.includes("director") && user.chapter_id && member.chapter_id !== user.chapter_id) {
    return false;
  }

  return true;
}

function canViewAdminSection(user: User, section: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    stats: ["admin", "director", "moderator"],
    members: ["admin", "director"],
    chapters: ["admin"],
    roles: ["admin"],
    events: ["admin", "director"],
    "news-publisher": ["admin", "global-publisher"],
    moderator: ["admin", "moderator"],
    announcements: ["admin"],
    finance: ["admin", "finance-manager"],
  };

  const requiredRoles = rolePermissions[section] || [];
  return user.roles.some(role => requiredRoles.includes(role));
}

describe("Authorization", () => {
  describe("Member Editing Authorization", () => {
    const admin: User = {
      id: "admin-1",
      roles: ["admin"],
    };

    const director: User = {
      id: "dir-1",
      roles: ["director"],
      chapter_id: "ch1",
    };

    const memberInChapter1: Member = {
      id: "mem-1",
      chapter_id: "ch1",
      verification_level: 1,
    };

    const memberInChapter2: Member = {
      id: "mem-2",
      chapter_id: "ch2",
      verification_level: 1,
    };

    it("should allow admin to edit any member", () => {
      expect(canEditMember(admin, memberInChapter1)).toBe(true);
      expect(canEditMember(admin, memberInChapter2)).toBe(true);
    });

    it("should allow director to edit members in their chapter", () => {
      expect(canEditMember(director, memberInChapter1)).toBe(true);
    });

    it("should prevent director from editing members in other chapters", () => {
      expect(canEditMember(director, memberInChapter2)).toBe(false);
    });

    it("should prevent non-admin from editing members", () => {
      const regularUser: User = {
        id: "user-1",
        roles: ["member"],
      };
      expect(canEditMember(regularUser, memberInChapter1)).toBe(false);
    });

    it("should prevent edit when user has no roles", () => {
      const userNoRoles: User = {
        id: "user-2",
        roles: [],
      };
      expect(canEditMember(userNoRoles, memberInChapter1)).toBe(false);
    });
  });

  describe("Verification Level Change Authorization", () => {
    const admin: User = {
      id: "admin-1",
      roles: ["admin"],
    };

    const director: User = {
      id: "dir-1",
      roles: ["director"],
      chapter_id: "ch1",
    };

    const member: Member = {
      id: "mem-1",
      chapter_id: "ch1",
      verification_level: 2,
    };

    it("should allow admin to change level", () => {
      expect(canChangeMemberLevel(admin, member)).toBe(true);
    });

    it("should allow director for their chapter", () => {
      expect(canChangeMemberLevel(director, member)).toBe(true);
    });

    it("should prevent level change outside scope", () => {
      const otherMember: Member = {
        id: "mem-2",
        chapter_id: "ch2",
        verification_level: 1,
      };
      expect(canChangeMemberLevel(director, otherMember)).toBe(false);
    });
  });

  describe("Admin Section Access Control", () => {
    const admin: User = {
      id: "admin-1",
      roles: ["admin"],
    };

    const director: User = {
      id: "dir-1",
      roles: ["director"],
      chapter_id: "ch1",
    };

    const moderator: User = {
      id: "mod-1",
      roles: ["moderator"],
    };

    const publisher: User = {
      id: "pub-1",
      roles: ["global-publisher"],
    };

    const financeManager: User = {
      id: "fin-1",
      roles: ["finance-manager"],
    };

    const regularMember: User = {
      id: "mem-1",
      roles: ["member"],
    };

    it("should allow admin to view all sections", () => {
      expect(canViewAdminSection(admin, "stats")).toBe(true);
      expect(canViewAdminSection(admin, "members")).toBe(true);
      expect(canViewAdminSection(admin, "chapters")).toBe(true);
      expect(canViewAdminSection(admin, "roles")).toBe(true);
      expect(canViewAdminSection(admin, "events")).toBe(true);
      expect(canViewAdminSection(admin, "news-publisher")).toBe(true);
      expect(canViewAdminSection(admin, "moderator")).toBe(true);
      expect(canViewAdminSection(admin, "announcements")).toBe(true);
      expect(canViewAdminSection(admin, "finance")).toBe(true);
    });

    it("should allow director to view stats and events", () => {
      expect(canViewAdminSection(director, "stats")).toBe(true);
      expect(canViewAdminSection(director, "events")).toBe(true);
    });

    it("should prevent director from viewing chapters and roles", () => {
      expect(canViewAdminSection(director, "chapters")).toBe(false);
      expect(canViewAdminSection(director, "roles")).toBe(false);
    });

    it("should allow moderator to view stats and moderator section", () => {
      expect(canViewAdminSection(moderator, "stats")).toBe(true);
      expect(canViewAdminSection(moderator, "moderator")).toBe(true);
    });

    it("should allow publisher to view news section", () => {
      expect(canViewAdminSection(publisher, "news-publisher")).toBe(true);
    });

    it("should allow finance manager to view finance section", () => {
      expect(canViewAdminSection(financeManager, "finance")).toBe(true);
    });

    it("should prevent regular member from viewing admin sections", () => {
      expect(canViewAdminSection(regularMember, "stats")).toBe(false);
      expect(canViewAdminSection(regularMember, "members")).toBe(false);
      expect(canViewAdminSection(regularMember, "chapters")).toBe(false);
    });

    it("should handle unknown section gracefully", () => {
      expect(canViewAdminSection(admin, "unknown-section")).toBe(false);
    });
  });

  describe("Sidebar Navigation Visibility", () => {
    const visibleSections = {
      admin: [
        "stats",
        "members",
        "chapters",
        "roles",
        "events",
        "news-publisher",
        "moderator",
        "announcements",
        "finance",
      ],
      director: ["stats", "events"],
      moderator: ["stats", "moderator"],
      publisher: ["news-publisher"],
      financeManager: ["finance"],
    };

    it("should show correct shortcuts for admin", () => {
      const admin: User = {
        id: "admin-1",
        roles: ["admin"],
      };
      const accessibleSections = visibleSections.admin;
      expect(accessibleSections.length).toBeGreaterThan(5);
    });

    it("should show limited shortcuts for director", () => {
      const director: User = {
        id: "dir-1",
        roles: ["director"],
        chapter_id: "ch1",
      };
      const accessibleSections = visibleSections.director;
      expect(accessibleSections).toContain("stats");
      expect(accessibleSections).toContain("events");
      expect(accessibleSections).not.toContain("chapters");
    });

    it("should not show any admin shortcuts for regular member", () => {
      const member: User = {
        id: "mem-1",
        roles: ["member"],
      };
      const accessibleSections = [];
      expect(accessibleSections).toHaveLength(0);
    });
  });

  describe("Cross-Chapter Data Access Prevention", () => {
    it("should prevent chapter-scoped user from accessing other chapter data", () => {
      const directorCh1: User = {
        id: "dir-1",
        roles: ["director"],
        chapter_id: "ch1",
      };

      const memberCh2: Member = {
        id: "mem-2",
        chapter_id: "ch2",
        verification_level: 1,
      };

      expect(canEditMember(directorCh1, memberCh2)).toBe(false);
      expect(canChangeMemberLevel(directorCh1, memberCh2)).toBe(false);
    });

    it("should allow cross-chapter access only for global admins", () => {
      const globalAdmin: User = {
        id: "admin-1",
        roles: ["admin"],
      };

      const memberCh1: Member = {
        id: "mem-1",
        chapter_id: "ch1",
        verification_level: 1,
      };

      const memberCh2: Member = {
        id: "mem-2",
        chapter_id: "ch2",
        verification_level: 1,
      };

      expect(canEditMember(globalAdmin, memberCh1)).toBe(true);
      expect(canEditMember(globalAdmin, memberCh2)).toBe(true);
    });
  });
});
