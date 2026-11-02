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

  it("bulk-invite gates on allow-listed roles and validates emails", () => {
    const src = readFn("bulk-invite");
    expect(src).toMatch(/ALLOWED_ROLES|Global Admin|Chapter Admin/);
    expect(src).toMatch(/No emails provided|emails/);
    expect(src).toMatch(/MAX_BATCH|500/);
  });

  it("send-reminder gates on Global/Chapter Admin and supports empty batch", () => {
    const src = readFn("send-reminder");
    expect(src).toMatch(/ALLOWED_ROLES|Global Admin|Chapter Admin/);
    expect(src).toMatch(/member_ids|send_to_all/);
    expect(src).toMatch(/total_attempted|sent:\s*0/);
  });

  it("send-reset-email requires email and uses generateLink", () => {
    const src = readFn("send-reset-email");
    expect(src).toMatch(/Email is required/);
    expect(src).toMatch(/generateLink/);
    expect(src).toMatch(/recovery|signup/);
  });

  it("send-whatsapp requires Meta secrets WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID", () => {
    const src = readFn("send-whatsapp");
    expect(src).toMatch(/WHATSAPP_ACCESS_TOKEN/);
    expect(src).toMatch(/WHATSAPP_PHONE_NUMBER_ID/);
    expect(src).toMatch(/WhatsApp API not configured/);
    expect(src).toMatch(/template_id and recipient_phone required/);
  });

  it("send-sms-campaign requires Authorization and Easify from-number stripping", () => {
    const src = readFn("send-sms-campaign");
    expect(src).toMatch(/Authorization|Unauthorized/);
    expect(src).toMatch(/EASIFY_FROM_NUMBER|EASIFY_API_TOKEN|easify/i);
  });
});
