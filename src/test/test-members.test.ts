import { describe, expect, it } from "vitest";
import { E2E_MEMBER_FIRST_NAME, isE2ETestMember } from "@/lib/test-members";

describe("E2E test member helpers", () => {
  it("marks seeded E2E first names", () => {
    expect(E2E_MEMBER_FIRST_NAME).toBe("E2E");
    expect(isE2ETestMember({ first_name: "E2E" })).toBe(true);
    expect(isE2ETestMember({ first_name: " e2e " })).toBe(true);
    expect(isE2ETestMember({ first_name: "Rushik" })).toBe(false);
    expect(isE2ETestMember({ first_name: null })).toBe(false);
  });
});
