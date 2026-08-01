import { describe, it, expect } from "vitest";

/**
 * TDD: A chapter can have at most ONE Chapter Admin.
 *
 * Business rules:
 * 1. If a chapter already has an active Chapter Admin, assigning a new one
 *    must be blocked with a clear error message.
 * 2. The existing admin must be revoked first before a new one can be assigned.
 * 3. This is enforced at the database level (in the assign_role function) so
 *    it cannot be bypassed by any client.
 */

interface ExistingAdmin {
  assignment_id: string;
  member_id: string;
  member_name: string;
}

/**
 * Checks whether a chapter already has an active Chapter Admin.
 * Mirrors the logic in the assign_role SECURITY DEFINER function.
 */
function hasExistingChapterAdmin(existingAdmins: ExistingAdmin[]): boolean {
  return existingAdmins.length > 0;
}

/**
 * Returns a user-friendly error message when a chapter already has an admin.
 */
function getExistingAdminError(existingAdmins: ExistingAdmin[]): string {
  if (existingAdmins.length === 0) return "";
  const admin = existingAdmins[0];
  return `${admin.member_name} is already the Chapter Admin. Revoke their role first before assigning a new one.`;
}

describe("Single Chapter Admin Rule", () => {
  describe("hasExistingChapterAdmin", () => {
    it("returns false when no admins exist", () => {
      expect(hasExistingChapterAdmin([])).toBe(false);
    });

    it("returns true when one admin exists", () => {
      const admins: ExistingAdmin[] = [
        { assignment_id: "a1", member_id: "m1", member_name: "John Shah" },
      ];
      expect(hasExistingChapterAdmin(admins)).toBe(true);
    });

    it("returns true when multiple admins exist (should not happen but defensive)", () => {
      const admins: ExistingAdmin[] = [
        { assignment_id: "a1", member_id: "m1", member_name: "John Shah" },
        { assignment_id: "a2", member_id: "m2", member_name: "Priya Patel" },
      ];
      expect(hasExistingChapterAdmin(admins)).toBe(true);
    });
  });

  describe("getExistingAdminError", () => {
    it("returns empty string when no admins exist", () => {
      expect(getExistingAdminError([])).toBe("");
    });

    it("returns a descriptive error with the existing admin's name", () => {
      const admins: ExistingAdmin[] = [
        { assignment_id: "a1", member_id: "m1", member_name: "John Shah" },
      ];
      const msg = getExistingAdminError(admins);
      expect(msg).toContain("John Shah");
      expect(msg).toContain("Revoke");
    });

    it("instructs the admin to revoke first", () => {
      const admins: ExistingAdmin[] = [
        { assignment_id: "a1", member_id: "m1", member_name: "Priya Patel" },
      ];
      const msg = getExistingAdminError(admins);
      expect(msg).toContain("Revoke their role first");
    });
  });

  describe("UI state: assign button should be disabled", () => {
    function shouldDisableAssignButton(
      hasExistingAdmin: boolean,
      selectedMemberId: string,
      isPending: boolean
    ): boolean {
      if (hasExistingAdmin) return true;
      if (!selectedMemberId) return true;
      if (isPending) return true;
      return false;
    }

    it("disables when there is an existing admin", () => {
      expect(shouldDisableAssignButton(true, "m1", false)).toBe(true);
    });

    it("disables when no member is selected", () => {
      expect(shouldDisableAssignButton(false, "", false)).toBe(true);
    });

    it("disables when mutation is pending", () => {
      expect(shouldDisableAssignButton(false, "m1", true)).toBe(true);
    });

    it("enables when no existing admin, member selected, and not pending", () => {
      expect(shouldDisableAssignButton(false, "m1", false)).toBe(false);
    });
  });
});
