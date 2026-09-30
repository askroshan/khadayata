import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(__dirname, "../..");
const INDEX_TSX = join(PROJECT_ROOT, "src/pages/Index.tsx");

/**
 * Verifies the "Latest Members" block on the homepage:
 * - Queries members with verification_level >= 1 (email-verified)
 * - Filters to onboarding_completed = true
 * - Limits to 5 results
 * - Links each card to /member/:id
 * - Shows chapter name, global_id, and avatar (photo_url)
 */
describe("Homepage Latest Members block", () => {
  const source = readFileSync(INDEX_TSX, "utf8");

  it("queries members with verification_level >= 1 (email verified)", () => {
    expect(source).toContain(".gte(\"verification_level\", 1)");
  });

  it("filters to onboarding_completed members only", () => {
    expect(source).toContain(".eq(\"onboarding_completed\", true)");
  });

  it("limits results to 5 members", () => {
    expect(source).toContain(".limit(5)");
  });

  it("selects the required columns including chapter join", () => {
    expect(source).toContain("first_name");
    expect(source).toContain("last_name");
    expect(source).toContain("global_id");
    expect(source).toContain("photo_url");
    expect(source).toContain("chapters(name)");
  });

  it("orders by created_at descending (newest first)", () => {
    expect(source).toMatch(/order\("created_at".*ascending:\s*false/s);
  });

  it("links each member card to /member/:id", () => {
    expect(source).toContain("`/member/${m.id}`");
  });

  it("renders avatar image when photo_url exists, initials otherwise", () => {
    expect(source).toContain("m.photo_url");
    expect(source).toMatch(/first_name.*\[0\].*last_name.*\[0\]/s);
  });

  it("displays the chapter name from the join", () => {
    expect(source).toContain("chapter?.name");
  });

  it("displays global_id in monospace font", () => {
    expect(source).toContain("m.global_id");
    expect(source).toContain("monospace");
  });

  it("shows a loading skeleton state while fetching", () => {
    expect(source).toContain("latestLoading");
  });

  it("shows an empty state with a join CTA when no members", () => {
    expect(source).toMatch(/latestMembers\.length === 0/);
    expect(source).toContain("Join Now");
  });

  it("handles query errors by throwing (not swallowing)", () => {
    expect(source).toContain("if (error) throw error");
  });

  it("has a section heading and view-all link to /directory", () => {
    expect(source).toContain("Newest Members");
    expect(source).toContain('to="/directory"');
  });
});
