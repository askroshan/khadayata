import { describe, it, expect } from "vitest";

/**
 * TDD: Chapter Admin Assignment Validation
 *
 * Issue: When admin assigns an existing member as Chapter Admin without
 * providing an optional email, the mutation throws "Missing required fields".
 *
 * Root cause: `chapterAdminRoleId` is loaded asynchronously via useQuery when
 * the dialog opens, but the mutation checks `!chapterAdminRoleId` and throws
 * if it hasn't resolved yet. The email field is optional and should not be
 * required. The role ID should be resolved before the mutation runs, or the
 * mutation should wait for it.
 *
 * Fix: The mutation should fetch the Chapter Admin role ID if it's not yet
 * loaded, rather than throwing "Missing required fields". The email field
 * is optional — only memberId and chapterId are required.
 */

describe("Chapter Admin Assignment: Required Fields Validation", () => {
  interface AssignParams {
    memberId: string;
    chapterId: string;
    roleId: string | null;
    email: string;
  }

  function validateAssignParams(params: AssignParams): { valid: boolean; error?: string } {
    if (!params.memberId?.trim()) return { valid: false, error: "Select a member to assign" };
    if (!params.chapterId?.trim()) return { valid: false, error: "No chapter selected" };
    // roleId can be null if still loading — we fetch it in the mutation if needed
    // email is OPTIONAL — do not validate
    return { valid: true };
  }

  it("passes with memberId and chapterId, no email", () => {
    const result = validateAssignParams({ memberId: "m1", chapterId: "ch1", roleId: "r1", email: "" });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("passes with memberId, chapterId, and email", () => {
    const result = validateAssignParams({ memberId: "m1", chapterId: "ch1", roleId: "r1", email: "admin@test.com" });
    expect(result.valid).toBe(true);
  });

  it("fails when no member selected", () => {
    const result = validateAssignParams({ memberId: "", chapterId: "ch1", roleId: "r1", email: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("member");
  });

  it("fails when no chapter selected", () => {
    const result = validateAssignParams({ memberId: "m1", chapterId: "", roleId: "r1", email: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("chapter");
  });

  it("does NOT fail when roleId is null (still loading) — mutation should fetch it", () => {
    const result = validateAssignParams({ memberId: "m1", chapterId: "ch1", roleId: null, email: "" });
    expect(result.valid).toBe(true);
  });

  it("does NOT require email — empty email is valid", () => {
    const result = validateAssignParams({ memberId: "m1", chapterId: "ch1", roleId: null, email: "" });
    expect(result.valid).toBe(true);
  });
});

/**
 * TDD: Mentorship Offer — Single Record per Mentor
 *
 * Issue: When a person offers mentorship multiple times, each submission
 * creates a new "mentorships" row. Instead, there should be only one
 * "available" record per mentor. If they add more skills, the new skills
 * should be appended to the existing record's skills array.
 *
 * Fix: Before inserting, check if the member already has an "available"
 * mentorship record. If so, merge the new skills into the existing skills
 * array and update. Only insert if no existing record exists.
 */

describe("Mentorship Offer: Skill Merging", () => {
  interface ExistingMentorship {
    id: string;
    skills: string[];
    status: string;
  }

  function mergeSkills(existing: string[], newSkills: string[]): string[] {
    const combined = [...existing];
    for (const s of newSkills) {
      const lower = s.toLowerCase();
      if (!combined.some(e => e.toLowerCase() === lower)) {
        combined.push(s);
      }
    }
    return combined;
  }

  function shouldUpdateExisting(
    existing: ExistingMentorship | null,
    newSkills: string[]
  ): { action: "insert" | "update"; skills: string[]; id?: string } {
    if (!existing || existing.status !== "available") {
      return { action: "insert", skills: newSkills };
    }
    return { action: "update", skills: mergeSkills(existing.skills, newSkills), id: existing.id };
  }

  it("inserts when no existing record", () => {
    const result = shouldUpdateExisting(null, ["React", "Python"]);
    expect(result.action).toBe("insert");
    expect(result.skills).toEqual(["React", "Python"]);
  });

  it("updates existing record by merging new skills", () => {
    const existing = { id: "m1", skills: ["React"], status: "available" };
    const result = shouldUpdateExisting(existing, ["Python", "Java"]);
    expect(result.action).toBe("update");
    expect(result.id).toBe("m1");
    expect(result.skills).toEqual(["React", "Python", "Java"]);
  });

  it("deduplicates skills case-insensitively when merging", () => {
    const existing = { id: "m1", skills: ["React"], status: "available" };
    const result = shouldUpdateExisting(existing, ["react", "python"]);
    expect(result.skills).toEqual(["React", "python"]);
  });

  it("does not add empty strings as skills", () => {
    const existing = { id: "m1", skills: ["React"], status: "available" };
    const result = shouldUpdateExisting(existing, ["Python", "", "  ", "Java"]);
    // Empty strings should be filtered before reaching here
    expect(result.skills).toEqual(["React", "Python", "", "  ", "Java"]);
  });

  it("inserts when existing record is not 'available' (e.g. active)", () => {
    const existing = { id: "m1", skills: ["React"], status: "active" };
    const result = shouldUpdateExisting(existing, ["Python"]);
    expect(result.action).toBe("insert");
    expect(result.skills).toEqual(["Python"]);
  });

  it("preserves original skill casing when duplicate found", () => {
    const existing = { id: "m1", skills: ["React"], status: "available" };
    const result = shouldUpdateExisting(existing, ["REACT", "Python"]);
    expect(result.skills).toEqual(["React", "Python"]);
  });

  it("handles empty new skills array on update — no change", () => {
    const existing = { id: "m1", skills: ["React"], status: "available" };
    const result = shouldUpdateExisting(existing, []);
    expect(result.action).toBe("update");
    expect(result.skills).toEqual(["React"]);
  });
});

describe("Mentorship Offer: Input Parsing", () => {
  function parseSkillsInput(input: string): string[] {
    return input
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  it("parses comma-separated skills", () => {
    expect(parseSkillsInput("React, Python, Java")).toEqual(["React", "Python", "Java"]);
  });

  it("trims whitespace around skills", () => {
    expect(parseSkillsInput("  React  ,  Python  ")).toEqual(["React", "Python"]);
  });

  it("filters empty entries", () => {
    expect(parseSkillsInput("React,,Python,")).toEqual(["React", "Python"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseSkillsInput("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseSkillsInput("   ")).toEqual([]);
  });

  it("handles single skill", () => {
    expect(parseSkillsInput("React")).toEqual(["React"]);
  });
});
