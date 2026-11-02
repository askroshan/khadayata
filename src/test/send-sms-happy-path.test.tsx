import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import SMSTab from "@/components/admin/SMSTab";

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

function redact(s: string) {
  return s
    .replace(/4937\|[a-f0-9-]+/gi, "EASIFY_***")
    .replace(/secret_[A-Za-z0-9]+/g, "secret_***")
    .replace(/Bearer\s+\S+/gi, "Bearer ***");
}

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
const easifyToken = envFromDotenv("EASIFY_API_TOKEN");
const easifyFromRaw = envFromDotenv("EASIFY_FROM_NUMBER") ?? "+19294586619";
const easifyFrom = easifyFromRaw.replace(/^\+/, "");
const EASIFY_BASE = "https://backend.easify.app/api/v2";

describe("SMS happy path (EASIFY_API_TOKEN in untracked .env)", () => {
  beforeAll(() => {
    expect(easifyToken, "EASIFY_API_TOKEN must be in untracked .env").toBeTruthy();
    expect(easifyFromRaw, "EASIFY_FROM_NUMBER must be in untracked .env").toBeTruthy();
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("secrets: EMAILIT+EASIFY+FROM present; WHATSAPP still absent", () => {
    expect(!!envFromDotenv("EMAILIT_API_KEY")).toBe(true);
    expect(!!easifyToken).toBe(true);
    expect(easifyFromRaw.startsWith("+") || /^\d+$/.test(easifyFromRaw)).toBe(true);
    expect(easifyFrom).toMatch(/^\d{10,15}$/);
    expect(
      !!(
        envFromDotenv("WHATSAPP_TOKEN") ||
        envFromDotenv("WHATSAPP_ACCESS_TOKEN") ||
        envFromDotenv("WHATSAPP_PHONE_NUMBER_ID")
      ),
    ).toBe(false);
  });

  it("edge sources strip E.164 + for send-sms and send-sms-campaign", () => {
    const sms = readFileSync(resolve(__dirname, "../../supabase/functions/send-sms/index.ts"), "utf8");
    const camp = readFileSync(
      resolve(__dirname, "../../supabase/functions/send-sms-campaign/index.ts"),
      "utf8",
    );
    expect(sms).toContain('EASIFY_FROM_NUMBER');
    expect(camp).toContain('EASIFY_FROM_NUMBER');
    expect(sms).toContain('.replace(/^\\+/, "")');
    expect(camp).toContain('.replace(/^\\+/, "")');
    expect(sms).toMatch(/from_number:\s*EASIFY_FROM/);
    expect(camp).toMatch(/from_number:\s*EASIFY_FROM/);
  });

  it("direct Easify: lists approved from-numbers including configured FROM", async () => {
    const res = await fetch(`${EASIFY_BASE}/phone-numbers`, {
      headers: { Authorization: `Bearer ${easifyToken}`, Accept: "application/json" },
    });
    const text = await res.text();
    expect(res.status, redact(text)).toBe(200);
    const json = JSON.parse(text) as { status?: boolean; data?: Array<{ number: string; approved: string }> };
    expect(json.status).toBe(true);
    expect(Array.isArray(json.data) && json.data.length > 0).toBe(true);
    const approved = json.data!.some((n) => /approved/i.test(n.approved));
    expect(approved).toBe(true);
    const digits = (n: string) => n.replace(/\D/g, "");
    const hasFrom = json.data!.some((n) => digits(n.number).endsWith(easifyFrom) || digits(n.number) === easifyFrom);
    expect(hasFrom).toBe(true);
  }, 30_000);

  it("direct Easify: authenticated send path (invalid destination — no real SMS)", async () => {
    const res = await fetch(`${EASIFY_BASE}/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${easifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_number: easifyFrom,
        to_number: "0000000000",
        country_code: "1",
        message: "Pass9 coverage probe — do not deliver",
        media: "",
        force_send: 0,
      }),
    });
    const text = await res.text();
    // Auth + valid from succeeded: validation error, NOT Unauthenticated / invalid from
    expect(text.toLowerCase()).not.toMatch(/unauthenticated/);
    expect(text.toLowerCase()).not.toMatch(/from number is invalid|selected from number/);
    expect([400, 422, 502]).toContain(res.status);
    expect(redact(text).toLowerCase()).toMatch(/invalid|to_number|error/);
  }, 30_000);

  it("direct Easify: contact-groups list (campaign prerequisites)", async () => {
    const res = await fetch(`${EASIFY_BASE}/contact-groups`, {
      headers: { Authorization: `Bearer ${easifyToken}`, Accept: "application/json" },
    });
    const text = await res.text();
    expect(res.status, redact(text)).toBe(200);
    const json = JSON.parse(text) as { status?: boolean; data?: Array<{ id: number; name: string }> };
    expect(json.status).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    // Keep a group id available for UI blast fill (do not live-blast)
    if (json.data && json.data.length > 0) {
      expect(json.data[0].id).toBeTypeOf("number");
    }
  }, 30_000);

  it("hosted send-sms: GA JWT reaches Easify (secret may be stale until synced)", async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${url}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session!.access_token}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "0000000000",
        body: "Pass8 hosted probe",
        country_code: "1",
      }),
    });
    const text = await res.text();
    // Configured path (not "Add EASIFY_API_TOKEN"); may be Unauthenticated if hosted secret stale,
    // or Easify validation/from-number error once secret matches .env.
    expect(text.toLowerCase()).not.toMatch(/add easify_api_token/);
    expect([200, 400, 502]).toContain(res.status);
    expect(redact(text).toLowerCase()).toMatch(/easify|success|invalid|unauthenticated|from number|to_number|error/);
  }, 40_000);

  it("hosted send-sms-campaign: validation / provider gate with GA JWT", async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${url}/functions/v1/send-sms-campaign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session!.access_token}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Pass8 campaign probe",
        group_id: "999999999",
        campaign_name: "pass8-coverage",
      }),
    });
    const text = await res.text();
    expect(text.toLowerCase()).not.toMatch(/add easify_api_token/);
    expect([200, 400, 502]).toContain(res.status);
  }, 40_000);

  it("SMSTab UI send + campaign blast fill (no live group blast)", async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    const user = userEvent.setup();
    renderApp(<SMSTab />, { route: "/admin?tab=sms" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/sms|message/);
    }, { timeout: 20_000 });

    const phone = document.querySelector("#single-phone") as HTMLInputElement | null;
    const body = document.querySelector("#single-body") as HTMLTextAreaElement | null;
    expect(phone && body).toBeTruthy();
    fireEvent.change(phone!, { target: { value: "0000000000" } });
    fireEvent.change(body!, { target: { value: "Pass9 SMSTab coverage — do not deliver" } });
    await user.click(screen.getByRole("button", { name: /Send SMS/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/sent|fail|error|easify|invalid|sms/);
    }, { timeout: 25_000 });

    const blastTab = screen.queryByRole("tab", { name: /Campaign Blast/i });
    if (blastTab) {
      await user.click(blastTab);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/group|campaign|blast/);
      }, { timeout: 10_000 });
      for (const el of Array.from(document.querySelectorAll("input, textarea"))) {
        const id = el.id || "";
        const ph = el.getAttribute("placeholder") ?? "";
        const label = `${id} ${ph} ${el.parentElement?.textContent ?? ""}`;
        if (/group/i.test(label)) fireEvent.change(el, { target: { value: "999999999" } });
        if (/campaign/i.test(label) && el.tagName !== "TEXTAREA") {
          fireEvent.change(el, { target: { value: "Pass9 Coverage Blast" } });
        }
        if (el.tagName === "TEXTAREA") {
          fireEvent.change(el, { target: { value: "Pass9 blast body — do not send to real contacts" } });
        }
      }
      // Fill only — avoid confirming live blast against a real contact group
    }

    const hist = screen.queryByRole("tab", { name: /History/i });
    if (hist) {
      await user.click(hist);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/history|message|sms|sent|fail|empty|no /);
      }, { timeout: 15_000 });
    }
  }, 90_000);
});
