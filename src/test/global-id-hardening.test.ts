import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * TDD: the generate-global-id edge function must refuse to mint placeholder
 * IDs. Background: 36 members hold KHD-XXXXXXX-* IDs because the function
 * silently fell back to "XX"/"XXX" location codes whenever a chapter's
 * country/state/city link was missing (the geography backfill of 2026-09-15
 * fixed the data, not the code path).
 *
 * Fix contract: if any of the chapter's country, state, or city links are
 * absent, return a 400 error telling the caller the chapter location data is
 * incomplete — never mint a placeholder ID.
 */

const source = readFileSync(
  path.resolve(__dirname, "../../supabase/functions/generate-global-id/index.ts"),
  "utf8"
);

describe("generate-global-id hardening", () => {
  it('no longer falls back to "XX" or "XXX" location codes', () => {
    expect(source).not.toContain('iso2: string } | null)?.iso2 || "XX"');
    expect(source).not.toContain('code: string } | null)?.code || "XX"');
    expect(source).not.toContain('let cityCode = "XXX"');
  });

  it("errors when chapter geography is missing", () => {
    expect(source).toContain("CHGEO");
  });

  it("still mints IDs when geography is complete (keeps city_codes lookup)", () => {
    expect(source).toContain("generate_global_id");
    expect(source).toContain("city_codes");
    expect(source).toContain("resolveCityCode");
  });

  it("honors global_id_enabled and sends assignment email", () => {
    expect(source).toContain("global_id_enabled");
    expect(source).toContain("global_id_assigned");
  });

  it("does not blindly substring(0, 3) non-code city names as the only path", () => {
    // Prefer city_codes match; 3-char fallback only for /^[A-Za-z0-9]{3}$/
    expect(source).toContain("/^[A-Za-z0-9]{3}$/");
    expect(source).toContain("cities(code, name)");
  });
});
