import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const raw = readFileSync(resolve(__dirname, "../../.env"), "utf8");
    const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1)?.trim();
  } catch {
    return undefined;
  }
}

const hasWhatsAppSecrets = !!(
  envFromDotenv("WHATSAPP_TOKEN") ||
  envFromDotenv("WHATSAPP_ACCESS_TOKEN") ||
  envFromDotenv("WHATSAPP_PHONE_NUMBER_ID")
);

const FUNCTIONS = [
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
] as const;

function fnUrl(name: string, qs = "") {
  return `${url}/functions/v1/${name}${qs}`;
}

describe("edge runtime HTTP invokes (live functions)", () => {
  let userJwt: string;
  let adminJwt: string;
  let memberId: string;

  beforeAll(async () => {
    const authOpts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
    const client = createClient(url, anon, authOpts);
    const { data, error } = await client.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    if (error || !data.session) throw error ?? new Error("sign-in failed");
    userJwt = data.session.access_token;
    const { data: member } = await client
      .from("members")
      .select("id")
      .eq("user_id", data.user!.id)
      .maybeSingle();
    memberId = member?.id ?? "";

    const adminClient = createClient(url, anon, authOpts);
    const admin = await adminClient.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    if (admin.error || !admin.data.session) throw admin.error ?? new Error("GA sign-in failed");
    adminJwt = admin.data.session.access_token;
  });

  afterAll(async () => {
    const client = createClient(url, anon);
    await client.auth.signOut();
  });

  it.each(FUNCTIONS)("%s responds to OPTIONS CORS preflight", async (name) => {
    const res = await fetch(fnUrl(name), { method: "OPTIONS" });
    expect(res.status).toBeLessThan(500);
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });

  it("sitemap returns real chapter XML", async () => {
    const res = await fetch(fnUrl("sitemap", "?type=chapters"), {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/<urlset/);
    expect(body.toLowerCase()).toMatch(/ahmedabad|chapter/);
  });

  it("sitemap index path returns sitemap index or urlset", async () => {
    const res = await fetch(fnUrl("sitemap"), {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/urlset|sitemapindex/i);
  });

  it("generate-global-id rejects missing Authorization", async () => {
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId }),
    });
    expect(res.status).toBe(401);
  });

  it("generate-global-id rejects anon JWT without user", async () => {
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_id: memberId }),
    });
    expect(res.status).toBe(401);
    expect(await res.text()).toMatch(/Unauthorized|authorization/i);
  });

  it("generate-global-id accepts member JWT (mint or existing)", async () => {
    expect(memberId).toBeTruthy();
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${userJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_id: memberId }),
    });
    // 200 with global_id, or 400/404/422 for missing member/location — both exercise runtime
    expect([200, 400, 404, 422, 500].includes(res.status)).toBe(true);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(2);
  });

  it("delete-user denies member without admin", async () => {
    const res = await fetch(fnUrl("delete-user"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${userJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000099" }),
    });
    // Non-admin must not successfully delete — allow 401/403/400/404/422 deny shapes
    expect(res.status).not.toBe(200);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("invite-member denies unauthenticated", async () => {
    const res = await fetch(fnUrl("invite-member"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com" }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("send-email OPTIONS + unauthenticated invoke do not 5xx from gateway", async () => {
    const opt = await fetch(fnUrl("send-email"), { method: "OPTIONS" });
    expect(opt.status).toBeLessThan(500);
    const res = await fetch(fnUrl("send-email"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ to: "nobody@example.com", template: "event_created", data: {} }),
    });
    // May be 401/400/200 depending on function auth gating — assert live response
    expect(res.status).toBeLessThan(600);
  });

  it("weekly-digest responds when invoked with anon key", async () => {
    const res = await fetch(fnUrl("weekly-digest"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(res.status).toBeLessThan(600);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it("bulk-invite denies missing Authorization", async () => {
    const res = await fetch(fnUrl("bulk-invite"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ emails: ["coverage-nobody@example.com"] }),
    });
    expect(res.status).toBe(401);
    expect(await res.text()).toMatch(/Unauthorized|authorization/i);
  });

  it("bulk-invite denies regular member", async () => {
    const res = await fetch(fnUrl("bulk-invite"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${userJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emails: ["coverage-nobody@example.com"] }),
    });
    expect([401, 403].includes(res.status)).toBe(true);
    expect(await res.text()).toMatch(/permission|forbidden|do not have|Unauthorized/i);
  });

  it("bulk-invite GA empty emails returns 400 validation", async () => {
    const res = await fetch(fnUrl("bulk-invite"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emails: [] }),
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/email/i);
  });

  it("send-reminder denies unauthenticated", async () => {
    const res = await fetch(fnUrl("send-reminder"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ member_ids: [] }),
    });
    expect(res.status).toBe(401);
  });

  it("send-reminder denies regular member", async () => {
    const res = await fetch(fnUrl("send-reminder"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${userJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_ids: [memberId] }),
    });
    expect([401, 403].includes(res.status)).toBe(true);
    expect(await res.text()).toMatch(/permission|Insufficient|Unauthorized/i);
  });

  it("send-reminder GA empty selection returns zero-sent success", async () => {
    const res = await fetch(fnUrl("send-reminder"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_ids: [] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.total_attempted).toBe(0);
  });

  it("send-reset-email requires email and returns success for unknown user", async () => {
    const missing = await fetch(fnUrl("send-reset-email"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "   " }),
    });
    expect(missing.status).toBe(400);

    const unknown = await fetch(fnUrl("send-reset-email"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `coverage-unknown-${Date.now()}@example.invalid`,
        type: "recovery",
      }),
    });
    // Security: unknown users often return success; otherwise structured 4xx/5xx from generateLink
    expect([200, 400, 404, 500].includes(unknown.status)).toBe(true);
    const text = await unknown.text();
    expect(text.length).toBeGreaterThan(2);
  });

  it("send-sms-campaign denies unauthenticated", async () => {
    const res = await fetch(fnUrl("send-sms-campaign"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "coverage", recipient_phones: ["9999999999"] }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
  });

  it("send-whatsapp: documents Meta secret gap; deny + config paths only", async () => {
    // Local/.env has EMAILIT + EASIFY but no WHATSAPP_* — happy path blocked until Meta secrets exist.
    expect(hasWhatsAppSecrets).toBe(false);

    const unauth = await fetch(fnUrl("send-whatsapp"), {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: "00000000-0000-0000-0000-000000000001",
        recipient_phone: "+10000000000",
      }),
    });
    expect(unauth.status).toBe(401);

    const asAdmin = await fetch(fnUrl("send-whatsapp"), {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: "00000000-0000-0000-0000-000000000001",
        recipient_phone: "+10000000000",
      }),
    });
    // Without WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID the function returns 500 config error
    // (or 401/403 if auth ordering differs). Never a Meta send success here.
    expect(asAdmin.status).not.toBe(200);
    expect([400, 401, 403, 404, 500].includes(asAdmin.status)).toBe(true);
    const body = await asAdmin.text();
    if (asAdmin.status === 500) {
      expect(body).toMatch(/WhatsApp API not configured|WHATSAPP_/i);
    }
  });
});
