import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54331";
const ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

const fnUrl = (name: string) => `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${name}`;

const GLOBAL_ID_REGEX = /^KHD-[A-Z]{2}[A-Z0-9]{2}[A-Z]{3}-\d{2}-\d{6}-[0-9A-Z]$/;

/** Replicates the ISO 7064 Mod 37,36 / Luhn mod-36 checksum from generate_global_id(). */
function verifyGlobalIdChecksum(formatted: string): boolean {
  const raw = formatted.replace(/-/g, "");
  if (raw.length !== 19) return false;
  const payload = raw.slice(0, 18);
  const actualCheck = raw[18];
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    let val = charset.indexOf(payload[i]);
    if (val < 0) val = 0;
    const factor = (payload.length - (i + 1)) % 2 === 0 ? 2 : 1;
    val *= factor;
    if (val >= 36) val = val - 36 + 1;
    sum += val;
  }
  const expectedCheck = charset[(36 - (sum % 36)) % 36];
  return actualCheck === expectedCheck;
}

describe("generate-global-id behavioral suite", () => {
  let memberJwt = "";
  let memberId = "";
  let otherMemberId = "";

  beforeAll(async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    if (signInErr || !signInData.session) {
      throw new Error(`Member sign-in failed: ${signInErr?.message}`);
    }
    memberJwt = signInData.session.access_token;

    const { data: myMember } = await client
      .from("members")
      .select("id")
      .eq("user_id", signInData.user.id)
      .single();
    memberId = myMember?.id ?? "";

    const { data: otherMembers } = await client
      .from("members")
      .select("id")
      .neq("id", memberId)
      .limit(1);
    otherMemberId = otherMembers?.[0]?.id ?? "";
  }, 30_000);

  it("rejects missing Authorization header with 401", async () => {
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects anon key without user JWT with 401", async () => {
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_id: memberId }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing member_id with 400", async () => {
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${memberJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/member_id required/i);
  });

  it("returns 404 for a non-existent member_id", async () => {
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${memberJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(res.status).toBe(404);
  });

  it("forbids a regular member from generating a Global ID for another member (403)", async () => {
    expect(otherMemberId).toBeTruthy();
    const res = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${memberJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_id: otherMemberId }),
    });
    expect(res.status).toBe(403);
  });

  it("mints or returns a valid, checksum-verified Global ID idempotently for own member", async () => {
    expect(memberId).toBeTruthy();
    const firstRes = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${memberJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_id: memberId }),
    });
    expect(firstRes.status).toBe(200);
    const firstBody = await firstRes.json();
    expect(firstBody.global_id).toMatch(GLOBAL_ID_REGEX);
    expect(verifyGlobalIdChecksum(firstBody.global_id)).toBe(true);

    // Second call must be idempotent and return the exact same Global ID
    const secondRes = await fetch(fnUrl("generate-global-id"), {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${memberJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ member_id: memberId }),
    });
    expect(secondRes.status).toBe(200);
    const secondBody = await secondRes.json();
    expect(secondBody.global_id).toBe(firstBody.global_id);
    expect(secondBody.message).toMatch(/Already assigned/i);
  });
});
