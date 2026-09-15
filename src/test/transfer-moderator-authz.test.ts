import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * TDD: Authorization gaps found 2026-09-15 (user-reported broken features).
 *
 * 1. Chapter transfer approvals silently failed: chapter_transfers had SELECT
 *    and INSERT policies but no UPDATE policy, so the Transfers tab's
 *    Approve/Reject buttons returned an RLS error every time.
 *    Decision (user-approved): Global Admin approves; only pending transfers
 *    are decidable.
 *
 * 2. Moderator verification failed: the members UPDATE policy omitted the
 *    Moderator role, so moderator verify buttons returned an RLS error despite
 *    todo-moderator.md US-002 granting moderators verification duties.
 *    Decision (user-approved): moderators may change verification_level only;
 *    blocked/suspended stay Global Admin / Data Steward.
 *
 * 3. Placeholder Global IDs: 36 members hold KHD-XXXXXXX-* IDs minted while
 *    their chapter had no geography linked. After the re-issue repair, the
 *    count must be zero.
 *
 * These tests exercise the LIVE database with the seeded role accounts
 * (docs/test-data.md). Test artifacts: two chapter_transfers rows created by
 * the member account, clearly marked in `reason`. They cannot be deleted
 * (no DELETE policy by design) and end resolved, so they only appear in the
 * Transfers tab's Resolved list.
 */

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

const ADMIN_EMAIL = "global-admin@khadayataonline.com";
const MODERATOR_EMAIL = "moderator@khadayataonline.com";
const MEMBER_EMAIL = "member@khadayataonline.com";
const SEED1_EMAIL = "seed1@test.local";
const PASSWORDS: Record<string, string> = {
  [ADMIN_EMAIL]: "TestPass123!",
  [MODERATOR_EMAIL]: "TestPass123!",
  [MEMBER_EMAIL]: "TestPass123!",
  [SEED1_EMAIL]: "SeedPass123!",
};

async function signInAs(email: string): Promise<{ client: SupabaseClient; userId: string }> {
  // Each client gets its own in-memory storage: multiple supabase-js clients
  // in one jsdom share window.localStorage under the same key, and the most
  // recent sign-in's storage event would otherwise replace earlier clients'
  // sessions (an admin client would silently act as whichever account signed
  // in last).
  const memStore: Record<string, string> = {};
  const client = createClient(url, anonKey, {
    auth: {
      storage: {
        getItem: (k: string) => memStore[k] ?? null,
        setItem: (k: string, v: string) => { memStore[k] = v; },
        removeItem: (k: string) => { delete memStore[k]; },
      },
      autoRefreshToken: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORDS[email],
  });
  if (error || !data.user) {
    throw new Error(`Test setup: sign-in failed for ${email}: ${error?.message}`);
  }
  return { client, userId: data.user.id };
}

async function getOwnMemberId(client: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await client
    .from("members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error(`Test setup: no member row for user ${userId}: ${error?.message}`);
  }
  return data.id;
}

describe("chapter transfer approvals (live DB, behavioral)", () => {
  let admin: SupabaseClient;
  let adminUserId = "";
  let moderator: SupabaseClient;
  let member: SupabaseClient;
  let memberUserId = "";
  let memberMemberId = "";
  let transferA = "";
  let transferB = "";

  beforeAll(async () => {
    const a = await signInAs(ADMIN_EMAIL);
    admin = a.client;
    adminUserId = a.userId;
    moderator = (await signInAs(MODERATOR_EMAIL)).client;
    const m = await signInAs(MEMBER_EMAIL);
    member = m.client;
    memberUserId = m.userId;
    memberMemberId = await getOwnMemberId(member, memberUserId);

    const marker = "authz regression test 20260915 - safe to archive";
    const { data: inserted, error } = await member
      .from("chapter_transfers")
      .insert([
        { member_id: memberMemberId, reason: `${marker} A` },
        { member_id: memberMemberId, reason: `${marker} B` },
      ])
      .select("id");
    if (error || !inserted || inserted.length !== 2) {
      throw new Error(`Test setup: could not create test transfers: ${error?.message}`);
    }
    transferA = inserted[0].id;
    transferB = inserted[1].id;
  });

  afterAll(async () => {
    // Resolve the second transfer so it does not linger in the pending list.
    if (admin && transferB) {
      await admin
        .from("chapter_transfers")
        .update({ status: "rejected", approved_by: adminUserId })
        .eq("id", transferB);
    }
  });

  it("Global Admin can approve a pending transfer (the fix)", async () => {
    // Read back the row first so failure output names the transfer state.
    const { data: before } = await admin
      .from("chapter_transfers")
      .select("id, status")
      .eq("id", transferA)
      .maybeSingle();
    const { data, error } = await admin
      .from("chapter_transfers")
      .update({ status: "approved", approved_by: adminUserId })
      .eq("id", transferA)
      .select("id");
    if (error) {
      throw new Error(
        `Approve failed: ${error.message} (code ${error.code}); row before: ${JSON.stringify(before)}`
      );
    }
    const { data: after } = await admin
      .from("chapter_transfers")
      .select("id, status, approved_by")
      .eq("id", transferA)
      .maybeSingle();
    if (data?.length !== 1) {
      throw new Error(
        `Approve matched 0 rows; before: ${JSON.stringify(before)}, after: ${JSON.stringify(after)}, admin uid: ${adminUserId}`
      );
    }
    expect(data?.length).toBe(1);
  });

  it("resolved transfers cannot be re-decided (pending-only guard)", async () => {
    const { data, error } = await admin
      .from("chapter_transfers")
      .update({ status: "rejected" })
      .eq("id", transferA)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  it("Moderator cannot decide transfers", async () => {
    const { data, error } = await moderator
      .from("chapter_transfers")
      .update({ status: "approved" })
      .eq("id", transferB)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  it("requesting member cannot approve their own transfer", async () => {
    const { data, error } = await member
      .from("chapter_transfers")
      .update({ status: "approved" })
      .eq("id", transferB)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });
});

describe("moderator verification rights (live DB, behavioral)", () => {
  let moderator: SupabaseClient;
  let member: SupabaseClient;
  let seed1MemberId = "";
  let seed1Level = 0;

  beforeAll(async () => {
    moderator = (await signInAs(MODERATOR_EMAIL)).client;
    member = (await signInAs(MEMBER_EMAIL)).client;
    const seed1 = await signInAs(SEED1_EMAIL);
    seed1MemberId = await getOwnMemberId(seed1.client, seed1.userId);
    const { data, error } = await moderator
      .from("members")
      .select("id, verification_level")
      .eq("id", seed1MemberId)
      .maybeSingle();
    if (error || !data) {
      throw new Error(`Test setup: cannot read seed1 member: ${error?.message}`);
    }
    seed1Level = data.verification_level;
  });

  it("Moderator can update another member's verification_level (the fix)", async () => {
    // Same-value write proves the UPDATE policy grants Moderator without
    // changing any real data.
    const { data, error } = await moderator
      .from("members")
      .update({ verification_level: seed1Level })
      .eq("id", seed1MemberId)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("Moderator cannot block or suspend members (column guard)", async () => {
    const { error } = await moderator
      .from("members")
      .update({ blocked: true })
      .eq("id", seed1MemberId);
    expect(error).not.toBeNull();
  });

  it("regular member cannot change their own verification_level (column guard)", async () => {
    const { data } = await member
      .from("members")
      .select("id, verification_level")
      .eq("user_id", (await member.auth.getUser()).data.user?.id ?? "")
      .limit(1)
      .maybeSingle();
    if (!data) {
      throw new Error("Test setup: member account has no member row");
    }
    const { error } = await member
      .from("members")
      .update({ verification_level: data.verification_level + 1 })
      .eq("id", data.id);
    expect(error).not.toBeNull();
  });
});

describe("placeholder Global IDs (live DB)", () => {
  it("no resolvable member holds a KHD-XXXXXXX-* placeholder after re-issue", async () => {
    // The Global pseudo-chapter has no country/state/city, so its members
    // legitimately stay without a location-based ID (user-approved design).
    const admin = createClient(url, anonKey);
    await admin.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASSWORDS[ADMIN_EMAIL] });
    const { data, error } = await admin
      .from("members")
      .select("id, global_id, chapter:chapters(slug)")
      .like("global_id", "KHD-XXXXXXX-%");
    expect(error).toBeNull();
    const unresolvable = (data ?? []).filter(
      (m) => (m as { chapter?: { slug?: string } | null }).chapter?.slug !== "global"
    );
    expect(unresolvable).toEqual([]);
  });
});
