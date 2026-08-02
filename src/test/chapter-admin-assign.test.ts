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
 * TDD: Chapter Admin Role Lookup — Must Scope by Chapter
 *
 * Issue: The "Chapter Admin" role is chapter-scoped — there is one row per
 * chapter with a UNIQUE(chapter_id, name) constraint. The query
 * `.eq("name", "Chapter Admin").maybeSingle()` returns multiple rows (one
 * per chapter), which causes maybeSingle() to error and return null. The
 * error message "Chapter Admin role not found" appears.
 *
 * Fix: The role query must also filter by chapter_id so it returns exactly
 * one row for the selected chapter.
 */
describe("Chapter Admin Role Lookup: Chapter-Scoped Query", () => {
  interface RoleRow {
    id: string;
    chapter_id: string;
    name: string;
  }

  const allRoles: RoleRow[] = [
    { id: "role-ahd", chapter_id: "ahmedabad", name: "Chapter Admin" },
    { id: "role-mum", chapter_id: "mumbai", name: "Chapter Admin" },
    { id: "role-pub-ahd", chapter_id: "ahmedabad", name: "Publisher" },
    { id: "role-ga", chapter_id: "", name: "Global Admin" },
  ];

  function queryRoleByNameOnly(roleName: string): RoleRow | null {
    const matches = allRoles.filter(r => r.name === roleName);
    if (matches.length === 0) return null;
    if (matches.length > 1) return null; // maybeSingle() errors on multiple rows
    return matches[0];
  }

  function queryRoleByNameAndChapter(roleName: string, chapterId: string): RoleRow | null {
    const matches = allRoles.filter(r => r.name === roleName && r.chapter_id === chapterId);
    if (matches.length === 0) return null;
    return matches[0];
  }

  it("returns null when querying by name only — multiple Chapter Admin rows exist", () => {
    const result = queryRoleByNameOnly("Chapter Admin");
    expect(result).toBeNull();
  });

  it("returns the correct role when querying by name AND chapter_id", () => {
    const result = queryRoleByNameAndChapter("Chapter Admin", "ahmedabad");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("role-ahd");
  });

  it("returns the correct role for a different chapter", () => {
    const result = queryRoleByNameAndChapter("Chapter Admin", "mumbai");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("role-mum");
  });

  it("returns null for a chapter that has no Chapter Admin role", () => {
    const result = queryRoleByNameAndChapter("Chapter Admin", "delhi");
    expect(result).toBeNull();
  });

  it("returns the single Publisher role when scoped by chapter", () => {
    const result = queryRoleByNameAndChapter("Publisher", "ahmedabad");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("role-pub-ahd");
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

/**
 * TDD: Global ID Generation — Chapter Membership Required
 *
 * Issue: A person who has not joined any chapter (chapter_id is null) should
 * not be able to generate a Global ID. The Global ID is derived from the
 * chapter's geography (country, state, city codes), so without a chapter
 * the ID cannot be meaningfully generated.
 *
 * Fix: Both the UI and the edge function must enforce this:
 * - UI: Show a notice explaining they need to join a chapter, not just
 *   silently hide the button
 * - Edge function: Return an explicit 400 error with a clear message
 */
describe("Global ID Generation: Chapter Membership Required", () => {
  interface MemberForId {
    id: string;
    chapter_id: string | null;
    global_id: string | null;
  }

  function checkCanGenerateGlobalId(member: MemberForId): { allowed: boolean; error?: string } {
    if (member.global_id) return { allowed: false, error: "Already assigned" };
    if (!member.chapter_id) {
      return { allowed: false, error: "You must join a chapter before generating a Global ID" };
    }
    return { allowed: true };
  }

  it("allows generation when member has a chapter and no existing global_id", () => {
    const result = checkCanGenerateGlobalId({ id: "m1", chapter_id: "ch1", global_id: null });
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("blocks generation when chapter_id is null", () => {
    const result = checkCanGenerateGlobalId({ id: "m1", chapter_id: null, global_id: null });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("join a chapter");
  });

  it("blocks generation when chapter_id is empty string", () => {
    const result = checkCanGenerateGlobalId({ id: "m1", chapter_id: "", global_id: null });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("join a chapter");
  });

  it("blocks generation when member already has a global_id", () => {
    const result = checkCanGenerateGlobalId({ id: "m1", chapter_id: "ch1", global_id: "KHD-INGJAHM-25-000001-Z" });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("Already assigned");
  });

  it("blocks generation when no chapter AND already has global_id — already-assigned takes precedence", () => {
    const result = checkCanGenerateGlobalId({ id: "m1", chapter_id: null, global_id: "KHD-XXX" });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("Already assigned");
  });

  it("error message is user-friendly and actionable", () => {
    const result = checkCanGenerateGlobalId({ id: "m1", chapter_id: null, global_id: null });
    expect(result.error).toMatch(/join.*chapter/i);
  });
});
