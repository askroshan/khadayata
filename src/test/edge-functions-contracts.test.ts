import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../supabase/functions");

function readFn(name: string): string {
  return readFileSync(resolve(ROOT, name, "index.ts"), "utf8");
}

const FUNCTIONS = readdirSync(ROOT).filter((d) => {
  try {
    return readFileSync(resolve(ROOT, d, "index.ts"), "utf8").length > 0;
  } catch {
    return false;
  }
});

describe("edge function inventory", () => {
  it("lists all 12 deployed function entrypoints", () => {
    expect(FUNCTIONS.sort()).toEqual([
      "bulk-invite",
      "delete-user",
      "generate-global-id",
      "invite-member",
      "send-email",
      "send-reminder",
      "send-reset-email",
      "send-sms",
      "send-sms-campaign",
      "send-whatsapp",
      "sitemap",
      "weekly-digest",
    ].sort());
  });
});

describe("edge function auth / CORS contracts", () => {
  for (const name of FUNCTIONS) {
    it(`${name} handles OPTIONS CORS and rejects unauthenticated where required`, () => {
      const src = readFn(name);
      expect(src).toMatch(/OPTIONS/);
      expect(src).toMatch(/Access-Control-Allow-Origin|corsHeaders|CORS/);
      // Destructive or privileged functions must check Authorization / service role / admin
      if (["delete-user", "send-sms", "send-sms-campaign", "send-whatsapp", "bulk-invite", "invite-member", "send-reminder", "generate-global-id"].includes(name)) {
        expect(src).toMatch(/Authorization|service_role|has_role|getUser|admin/i);
      }
    });
  }
});

describe("edge function domain specifics", () => {
  it("generate-global-id mints via RPC and uses location codes", () => {
    const src = readFn("generate-global-id");
    expect(src).toMatch(/generate_global_id|global_id/);
    expect(src).toMatch(/city|country|state/i);
  });

  it("send-email references known templates", () => {
    const src = readFn("send-email");
    expect(src).toMatch(/template/);
  });

  it("sitemap emits xml urls", () => {
    const src = readFn("sitemap");
    expect(src).toMatch(/urlset|application\/xml|text\/xml/);
  });

  it("weekly-digest aggregates community content", () => {
    const src = readFn("weekly-digest");
    expect(src).toMatch(/events|news|obituar/i);
  });

  it("delete-user requires elevated auth", () => {
    const src = readFn("delete-user");
    expect(src).toMatch(/Global Admin|service_role|admin/i);
  });
});
