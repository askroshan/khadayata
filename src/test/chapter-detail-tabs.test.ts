import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * TDD: Chapter detail page should lead with the Members tab.
 * User decision 2026-09-15: Members first (selected by default), Committee second.
 */

const source = readFileSync(
  path.resolve(__dirname, "../../src/pages/ChapterDetail.tsx"),
  "utf8"
);

describe("ChapterDetail tab order", () => {
  it("selects the Members tab by default", () => {
    expect(source).toContain('defaultValue="members"');
    expect(source).not.toContain('defaultValue="committee"');
  });

  it("lists Members before Committee", () => {
    const membersPos = source.indexOf('value="members"');
    const committeePos = source.indexOf('value="committee"');
    expect(membersPos).toBeGreaterThan(-1);
    expect(committeePos).toBeGreaterThan(-1);
    expect(membersPos).toBeLessThan(committeePos);
  });
});
