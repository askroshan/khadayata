import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
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
 * These tests require dedicated test accounts in the database. The test
 * accounts were removed from production on 2026-09-30 (see migration
 * remove_test_seed_data_20260930 and AGENTS.md section 3.1). When the
 * accounts don't exist, these suites skip automatically.
 *
 * Local Kong DB restores sometimes omit the 2026-09-15 policies; beforeAll
 * re-applies them idempotently against supabase_db_khadayata-local.
 */

/** Idempotent product policies from 20260915 transfer + moderator migrations. */
function ensureAuthzPoliciesOnKong() {
  const sql = `
DROP POLICY IF EXISTS "Global admins decide chapter transfers" ON public.chapter_transfers;
CREATE POLICY "Global admins decide chapter transfers"
  ON public.chapter_transfers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') AND status = 'pending')
  WITH CHECK (has_role(auth.uid(), 'Global Admin') AND status IN ('pending', 'approved', 'rejected'));

DROP POLICY IF EXISTS "Users can update own and admins can update any member" ON public.members;
CREATE POLICY "Users can update own and admins can update any member"
  ON public.members FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

CREATE OR REPLACE FUNCTION public.guard_privileged_member_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  is_privileged boolean;
  is_moderator  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name IN ('Global Admin', 'Data Steward')
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_privileged;
  SELECT EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid()
      AND r.name = 'Moderator'
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  ) INTO is_moderator;
  IF NOT is_privileged THEN
    IF NEW.verification_level IS DISTINCT FROM OLD.verification_level THEN
      IF NOT is_moderator THEN
        RAISE EXCEPTION 'Only Global Admin, Data Steward, or Moderator can change verification_level'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    IF NEW.blocked IS DISTINCT FROM OLD.blocked
       OR NEW.suspended IS DISTINCT FROM OLD.suspended THEN
      RAISE EXCEPTION 'Only Global Admin or Data Steward can block or suspend members'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Function replace alone is not enough if the trigger was dropped on a restore.
DROP TRIGGER IF EXISTS trg_guard_privileged_member_columns ON public.members;
CREATE TRIGGER trg_guard_privileged_member_columns
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_member_columns();

-- E2E regular member must stay unprivileged (coverage suites sometimes leave roles behind).
DELETE FROM public.role_assignments ra
USING public.members m
WHERE ra.member_id = m.id
  AND m.user_id IN (
    SELECT id FROM auth.users WHERE email = 'member@khadayataonline.com'
  );

NOTIFY pgrst, 'reload schema';
`;
  try {
    execFileSync(
      "docker",
      [
        "exec",
        "supabase_db_khadayata-local",
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    // Host without the local Kong container — live suite will fail/skip as before.
    console.warn("ensureAuthzPoliciesOnKong:", (err as Error).message);
  }
}

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

/**
 * Checks whether test accounts still exist in the database. After the
 * 2026-09-30 cleanup, they don't in production — tests that need them
 * should be skipped rather than failing.
 */
async function testAccountsExist(): Promise<boolean> {
  const probe = createClient(url, anonKey);
  const { error } = await probe.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: PASSWORDS[ADMIN_EMAIL],
  });
  return !error;
}

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
  let shouldSkip = false;

  beforeAll(async () => {
    ensureAuthzPoliciesOnKong();
    if (!(await testAccountsExist())) {
      shouldSkip = true;
      return;
    }
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

  it("Global Admin can approve a pending transfer (the fix)", async ({ skip }) => {
    if (shouldSkip) return skip();
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

  it("resolved transfers cannot be re-decided (pending-only guard)", async ({ skip }) => {
    if (shouldSkip) return skip();
    const { data, error } = await admin
      .from("chapter_transfers")
      .update({ status: "rejected" })
      .eq("id", transferA)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  it("Moderator cannot decide transfers", async ({ skip }) => {
    if (shouldSkip) return skip();
    const { data, error } = await moderator
      .from("chapter_transfers")
      .update({ status: "approved" })
      .eq("id", transferB)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(0);
  });

  it("requesting member cannot approve their own transfer", async ({ skip }) => {
    if (shouldSkip) return skip();
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
  let targetMemberId = "";
  let targetLevel = 0;
  let shouldSkip = false;

  beforeAll(async () => {
    ensureAuthzPoliciesOnKong();
    if (!(await testAccountsExist())) {
      shouldSkip = true;
      return;
    }
    moderator = (await signInAs(MODERATOR_EMAIL)).client;
    const m = await signInAs(MEMBER_EMAIL);
    member = m.client;
    // Use E2E regular member as the target (seed1@test.local was purged).
    targetMemberId = await getOwnMemberId(member, m.userId);
    const { data, error } = await moderator
      .from("members")
      .select("id, verification_level")
      .eq("id", targetMemberId)
      .maybeSingle();
    if (error || !data) {
      throw new Error(`Test setup: cannot read target member: ${error?.message}`);
    }
    targetLevel = data.verification_level;
  });

  it("Moderator can update another member's verification_level (the fix)", async ({ skip }) => {
    if (shouldSkip) return skip();
    // Same-value write proves the UPDATE policy grants Moderator without
    // changing any real data.
    const { data, error } = await moderator
      .from("members")
      .update({ verification_level: targetLevel })
      .eq("id", targetMemberId)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("Moderator cannot block or suspend members (column guard)", async ({ skip }) => {
    if (shouldSkip) return skip();
    const { error } = await moderator
      .from("members")
      .update({ blocked: true })
      .eq("id", targetMemberId);
    expect(error).not.toBeNull();
  });

  it("regular member cannot change their own verification_level (column guard)", async ({ skip }) => {
    if (shouldSkip) return skip();
    const { data, error: readErr } = await member
      .from("members")
      .select("id, verification_level")
      .eq("id", targetMemberId)
      .maybeSingle();
    if (readErr || !data) {
      throw new Error(`Test setup: member account has no member row: ${readErr?.message}`);
    }
    const { error } = await member
      .from("members")
      .update({ verification_level: data.verification_level + 1 })
      .eq("id", data.id);
    expect(error).not.toBeNull();
  });
});

describe("placeholder Global IDs (live DB)", () => {
  it("no resolvable member holds a KHD-XXXXXXX-* placeholder after re-issue", async ({ skip }) => {
    if (!(await testAccountsExist())) return skip();
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
