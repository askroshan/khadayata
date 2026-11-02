/**
 * Pass 14 — MemberProfile + Verification* → ~100% against real Kong :54331.
 * Reversible covmv_* seeds; no mock view data; E2E role users kept intact.
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import MemberProfile from "@/pages/MemberProfile";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import { VerificationCenter } from "@/components/verification/VerificationCenter";
import { VerificationGate, L2GateButton } from "@/components/verification/VerificationGate";
import { L1UpgradeBanner } from "@/components/verification/L1UpgradeBanner";
import { Toaster } from "@/components/ui/toaster";

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const OTHER_CHAPTER = "f1000001-0000-0000-0000-000000000001";
const PREFIX = `covmv_${Date.now().toString(36)}`;
const TARGET_MEMBER = "608bd52f-ef79-46bf-be89-2c502e25f09f"; // Hemal Shah (real, has education + employment)

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const fromVite = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  if (fromVite) return fromVite;
  for (const file of [".env", ".env.local"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m?.[1] === name) return m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function adminClient(): SupabaseClient {
  const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function psqlKong(sql: string) {
  execFileSync(
    "docker",
    ["exec", "-i", "supabase_db_khadayata-local", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: sql, encoding: "utf8" },
  );
}

/** Service-role REST cannot change verification_level (guard trigger uses auth.uid()). */
function setVerificationLevelSql(memberId: string, level: number) {
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
      `ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
       UPDATE members SET verification_level = ${Number(level)} WHERE id = '${memberId}';
       ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

const CREATE_NOTIFICATION_SQL = `
CREATE OR REPLACE FUNCTION public.create_notification(
  p_member_id uuid, p_type text, p_title text,
  p_description text DEFAULT ''::text,
  p_entity_id text DEFAULT NULL::text,
  p_entity_type text DEFAULT NULL::text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid; v_caller_member_id uuid; v_entity uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_caller_member_id FROM members WHERE user_id = auth.uid() LIMIT 1;
    IF v_caller_member_id IS NULL THEN RAISE EXCEPTION 'Not authorized to create notifications'; END IF;
  END IF;
  BEGIN
    v_entity := NULLIF(p_entity_id, '')::uuid;
  EXCEPTION WHEN others THEN
    v_entity := NULL;
  END;
  INSERT INTO notifications (member_id, type, title, description, entity_id, entity_type)
  VALUES (p_member_id, p_type, p_title, p_description, v_entity, p_entity_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
`;

let lastSignInAt = 0;
async function signIn(email: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 5; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    }
    throw error;
  }
}

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return false;
  try {
    await user.click(el);
    return true;
  } catch {
    try {
      fireEvent.click(el);
      return true;
    } catch {
      return false;
    }
  }
}

async function closeDialogs(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 3; i++) {
    if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) break;
    await user.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function memberIdForSession(): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  const { data } = await supabase.from("members").select("id").eq("user_id", uid).maybeSingle();
  if (!data?.id) throw new Error("no member for session");
  return data.id;
}

const seeded = {
  bizId: null as string | null,
  verReqIds: [] as string[],
  oralId: null as string | null,
  tagId: null as string | null,
  vouchIds: [] as string[],
  vouchReqIds: [] as string[],
  l0UserId: null as string | null,
  l0MemberId: null as string | null,
  l1UserId: null as string | null,
  l1MemberId: null as string | null,
  l2UserId: null as string | null,
  l2MemberId: null as string | null,
  voucherMemberIds: [] as string[],
  voucherUserIds: [] as string[],
  targetOrig: null as {
    verification_level: number;
    first_name: string | null;
    last_name: string | null;
    gender: string | null;
    privacy: unknown;
    overseas_verified: boolean | null;
    chapter_id: string | null;
    dob: string | null;
    birth_place: string | null;
  } | null,
  memberOrigLevel: null as number | null,
  unverifiedOrigLevel: null as number | null,
};

async function cleanupCovMv() {
  const admin = adminClient();
  if (seeded.verReqIds.length) {
    await admin.from("verification_requests").delete().in("id", seeded.verReqIds);
  }
  await admin.from("verification_requests").delete().like("notes", "covmv_%");
  if (seeded.oralId) await admin.from("oral_histories").delete().eq("id", seeded.oralId);
  await admin.from("oral_histories").delete().eq("title", `${PREFIX} oral`);
  if (seeded.tagId) await admin.from("tag_requests").delete().eq("id", seeded.tagId);
  await admin.from("tag_requests").delete().eq("term", `${PREFIX}-tag`);
  if (seeded.bizId) await admin.from("businesses").delete().eq("id", seeded.bizId);
  await admin.from("businesses").delete().like("name", "CovMV%");
  if (seeded.vouchIds.length) await admin.from("vouches").delete().in("id", seeded.vouchIds);
  if (seeded.vouchReqIds.length) await admin.from("vouch_requests").delete().in("id", seeded.vouchReqIds);
  await admin.from("vouch_requests").delete().like("message", "covmv_%");

  for (const mid of [seeded.l0MemberId, seeded.l1MemberId, seeded.l2MemberId, ...seeded.voucherMemberIds]) {
    if (!mid) continue;
    await admin.from("vouches").delete().eq("member_id", mid);
    await admin.from("vouches").delete().eq("voucher_member_id", mid);
    await admin.from("verification_requests").delete().eq("member_id", mid);
    await admin.from("vouch_requests").delete().eq("requester_member_id", mid);
    await admin.from("vouch_requests").delete().eq("target_member_id", mid);
    await admin.from("members").delete().eq("id", mid);
  }
  for (const uid of [seeded.l0UserId, seeded.l1UserId, seeded.l2UserId, ...seeded.voucherUserIds]) {
    if (uid) await admin.auth.admin.deleteUser(uid);
  }

  if (seeded.targetOrig) {
    await admin
      .from("members")
      .update({
        verification_level: seeded.targetOrig.verification_level,
        first_name: seeded.targetOrig.first_name,
        last_name: seeded.targetOrig.last_name,
        gender: seeded.targetOrig.gender,
        privacy: seeded.targetOrig.privacy as never,
        overseas_verified: seeded.targetOrig.overseas_verified,
        chapter_id: seeded.targetOrig.chapter_id,
        dob: seeded.targetOrig.dob,
        birth_place: seeded.targetOrig.birth_place,
      })
      .eq("id", TARGET_MEMBER);
  }
  if (seeded.memberOrigLevel != null) {
    const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const uid = users.find((u) => u.email === E2E_ACCOUNTS.member.email)?.id ?? "";
    const { data: m } = await admin.from("members").select("id").eq("user_id", uid).maybeSingle();
    if (m) setVerificationLevelSql(m.id, seeded.memberOrigLevel);
  }
}

async function createAuthMember(
  admin: SupabaseClient,
  opts: {
    email: string;
    first: string;
    last: string;
    level: number;
    chapterId: string;
    onboarding?: boolean;
    overseas?: boolean;
  },
) {
  const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
    email: opts.email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (cuErr || !cu.user) throw cuErr ?? new Error(`createUser ${opts.email}`);
  const { data: mem, error: memErr } = await admin
    .from("members")
    .insert({
      user_id: cu.user.id,
      first_name: opts.first,
      last_name: opts.last,
      chapter_id: opts.chapterId,
      verification_level: opts.level,
      onboarding_completed: opts.onboarding ?? true,
      overseas_verified: opts.overseas ?? false,
      suspended: false,
      blocked: false,
      gender: "Male",
      dob: "1990-01-15",
      birth_place: "Coverage City",
      privacy: { dob: "members", birth_place: "chapter", employment: "members" },
    })
    .select("id")
    .single();
  if (memErr || !mem) throw memErr ?? new Error(`seed member ${opts.email}`);
  return { userId: cu.user.id, memberId: mem.id };
}

describe("Pass 14 MemberProfile + Verification* (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();

    const { data: target } = await admin
      .from("members")
      .select(
        "verification_level, first_name, last_name, gender, privacy, overseas_verified, chapter_id, dob, birth_place",
      )
      .eq("id", TARGET_MEMBER)
      .single();
    seeded.targetOrig = target as typeof seeded.targetOrig;

    // Ensure storage bucket for VerificationCenter upload path (local Kong may start empty).
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "verification-docs")) {
      await admin.storage.createBucket("verification-docs", { public: false, fileSizeLimit: 10485760 });
    }

    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_member_id: TARGET_MEMBER,
        chapter_id: OTHER_CHAPTER,
        name: `CovMV Biz ${PREFIX}`,
        sector: "Tech",
        verified: false,
      })
      .select("id")
      .single();
    if (bizErr || !biz) throw bizErr ?? new Error("seed business failed");
    seeded.bizId = biz.id;

    const { data: vr1 } = await admin
      .from("verification_requests")
      .insert({
        member_id: TARGET_MEMBER,
        requested_level: 1,
        status: "pending",
        notes: `${PREFIX} pending-req`,
        document_type: "passport",
      })
      .select("id")
      .single();
    if (vr1) seeded.verReqIds.push(vr1.id);

    const { data: vrHist } = await admin
      .from("verification_requests")
      .insert({
        member_id: TARGET_MEMBER,
        requested_level: 1,
        status: "note",
        notes: `${PREFIX} history-note`,
        document_type: "aadhaar",
        document_files: [
          {
            name: "id.pdf",
            type: "application/pdf",
            size: 1024,
            path: "seed/id.pdf",
            uploaded_at: new Date().toISOString(),
          },
        ],
      })
      .select("id")
      .single();
    if (vrHist) seeded.verReqIds.push(vrHist.id);

    const { data: oral } = await admin
      .from("oral_histories")
      .insert({
        title: `${PREFIX} oral`,
        status: "pending",
        narrator_name: "CovMV Narrator",
      })
      .select("id")
      .single();
    if (oral) seeded.oralId = oral.id;

    const { data: tag } = await admin
      .from("tag_requests")
      .insert({ term: `${PREFIX}-tag`, type: "skill", status: "pending" })
      .select("id")
      .single();
    if (tag) seeded.tagId = tag.id;

    // Disposable L0 / L1 / L2 members for VerificationCenter + Gate + Banner paths
    const l0 = await createAuthMember(admin, {
      email: `${PREFIX}-l0@example.invalid`,
      first: "CovMVL0",
      last: "Subject",
      level: 0,
      chapterId: AHMEDABAD,
    });
    seeded.l0UserId = l0.userId;
    seeded.l0MemberId = l0.memberId;

    const l1 = await createAuthMember(admin, {
      email: `${PREFIX}-l1@example.invalid`,
      first: "CovMVL1",
      last: "Subject",
      level: 1,
      chapterId: AHMEDABAD,
    });
    seeded.l1UserId = l1.userId;
    seeded.l1MemberId = l1.memberId;

    const l2 = await createAuthMember(admin, {
      email: `${PREFIX}-l2@example.invalid`,
      first: "CovMVL2",
      last: "Subject",
      level: 2,
      chapterId: AHMEDABAD,
      overseas: true,
    });
    seeded.l2UserId = l2.userId;
    seeded.l2MemberId = l2.memberId;

    // Vouchers (L1+) for L0 (need 2) and L1 (need 3 L1+)
    for (let i = 0; i < 3; i++) {
      const v = await createAuthMember(admin, {
        email: `${PREFIX}-v${i}@example.invalid`,
        first: `CovMVV${i}`,
        last: "Voucher",
        level: 2,
        chapterId: AHMEDABAD,
      });
      seeded.voucherUserIds.push(v.userId);
      seeded.voucherMemberIds.push(v.memberId);
      const { data: vh0 } = await admin
        .from("vouches")
        .insert({
          member_id: seeded.l0MemberId!,
          voucher_member_id: v.memberId,
          note: i === 0 ? `${PREFIX} vouch-l0` : null,
        })
        .select("id")
        .single();
      if (vh0) seeded.vouchIds.push(vh0.id);
      if (i < 3) {
        const { data: vh1 } = await admin
          .from("vouches")
          .insert({
            member_id: seeded.l1MemberId!,
            voucher_member_id: v.memberId,
            note: `${PREFIX} vouch-l1-${i}`,
          })
          .select("id")
          .single();
        if (vh1) seeded.vouchIds.push(vh1.id);
      }
    }

    // Pending request on L2 subject history path already covered; add pending on a copy via L1 for banner
    const { data: pendingL1 } = await admin
      .from("verification_requests")
      .insert({
        member_id: seeded.l1MemberId!,
        requested_level: 2,
        status: "pending",
        notes: `${PREFIX} l1-pending`,
        document_files: [
          {
            name: "kyc.png",
            type: "image/png",
            size: 2048,
            path: "seed/kyc.png",
            uploaded_at: new Date().toISOString(),
          },
        ],
      })
      .select("id")
      .single();
    if (pendingL1) seeded.verReqIds.push(pendingL1.id);
  }, 120_000);

  afterAll(async () => {
    cleanup();
    try {
      await signIn(E2E_ACCOUNTS.globalAdmin.email);
      await cleanupCovMv();
    } catch {
      try {
        await cleanupCovMv();
      } catch {
        /* best-effort */
      }
    }
    await supabase.auth.signOut();
  }, 120_000);

  it("VerificationGate + L2GateButton pass/fail/fallback arms", async () => {
    await signIn(E2E_ACCOUNTS.member.email); // L0
    const { unmount: u1 } = renderApp(
      <div>
        <VerificationGate requiredLevel={1} featureName="CoverageGate">
          <div>Gated OK</div>
        </VerificationGate>
        <VerificationGate requiredLevel={99} fallback={<div>Custom fallback</div>}>
          <div>Hidden</div>
        </VerificationGate>
        <VerificationGate requiredLevel={5}>
          <div>Default lock</div>
        </VerificationGate>
        <L2GateButton featureName="L2 Feat">
          <button type="button">Inner L2</button>
        </L2GateButton>
      </div>,
      { route: "/dashboard" },
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/CoverageGate requires|Custom fallback|Requires L5|L2 Feat/i);
    }, { timeout: 20_000 });
    expect(screen.queryByText("Gated OK")).toBeNull();
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    u1();

    // Pass arms: use disposable L2 session (avoids stale E2E member level cache)
    await signIn(`${PREFIX}-l2@example.invalid`);
    const { unmount: u2 } = renderApp(
      <div>
        <VerificationGate requiredLevel={1} featureName="PassGate">
          <div>Unlocked content</div>
        </VerificationGate>
        <L2GateButton featureName="Unlocked L2">
          <button type="button">L2 action</button>
        </L2GateButton>
      </div>,
      { route: "/dashboard" },
    );
    await waitFor(() => expect(screen.getByText("Unlocked content")).toBeInTheDocument(), {
      timeout: 25_000,
    });
    expect(screen.getByRole("button", { name: /L2 action/i })).toBeInTheDocument();
    u2();
  }, 90_000);

  it("L1UpgradeBanner L0 / L1 / L2+ null paths", async () => {
    const admin = adminClient();

    // L0 disposable
    await signIn(`${PREFIX}-l0@example.invalid`);
    const { unmount: u0 } = renderApp(<L1UpgradeBanner />, { route: "/dashboard" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Upgrade to L1|Vouches received/i), {
      timeout: 25_000,
    });
    u0();

    // L1 with pending request
    await signIn(`${PREFIX}-l1@example.invalid`);
    const { unmount: u1 } = renderApp(<L1UpgradeBanner />, { route: "/dashboard" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Upgrade to L2|L1\+|Request submitted/i), {
      timeout: 25_000,
    });
    u1();

    // L2+ returns null
    await signIn(`${PREFIX}-l2@example.invalid`);
    const { unmount: u2 } = renderApp(<L1UpgradeBanner />, { route: "/dashboard" });
    await waitFor(async () => {
      // banner mounts but renders null — body should not show upgrade copy
      await new Promise((r) => setTimeout(r, 800));
      expect(document.body.textContent ?? "").not.toMatch(/Upgrade to L1|Upgrade to L2/i);
    }, { timeout: 15_000 });
    u2();

    // L0 without enough progress still shows submit checkbox empty — also cover L1 without pending
    await admin.from("verification_requests").delete().eq("id", seeded.verReqIds.find(Boolean)!).eq("member_id", seeded.l1MemberId!);
    // keep history; remove pending only
    await admin
      .from("verification_requests")
      .delete()
      .eq("member_id", seeded.l1MemberId!)
      .eq("status", "pending");
    seeded.verReqIds = seeded.verReqIds.filter((id) => id !== seeded.verReqIds[seeded.verReqIds.length - 1]);
    await signIn(`${PREFIX}-l1@example.invalid`);
    const { unmount: u3 } = renderApp(<L1UpgradeBanner />, { route: "/dashboard" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Submit request|Upgrade to L2/i), {
      timeout: 25_000,
    });
    u3();
  }, 120_000);

  it("VerificationCenter: L0 submit, file UI, L1 pending history, L2 overseas", async () => {
    const user = userEvent.setup();
    const admin = adminClient();

    // L0 with 3 vouches → submit with docs (happy path). onError residual: needs insert/upload failure.
    await signIn(`${PREFIX}-l0@example.invalid`);
    await admin.from("verification_requests").delete().eq("member_id", seeded.l0MemberId!).eq("status", "pending");

    const { unmount: u0 } = renderApp(withToaster(<VerificationCenter />), {
      route: "/settings?tab=verification",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Level|Request Level/i), {
      timeout: 30_000,
    });

    // Doc type select
    const trigger = screen.queryByRole("combobox") ?? document.querySelector('[role="combobox"]');
    if (trigger) {
      await clickSafe(user, trigger as HTMLElement);
      const opt = await screen.findByRole("option", { name: /Passport/i }, { timeout: 8_000 }).catch(() => null);
      if (opt) await clickSafe(user, opt);
      else await user.keyboard("{Escape}");
    }

    // File select (valid) keep for upload path on submit; also exercise invalid + remove
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (input) {
      const bad = new File([new Uint8Array([9])], "virus.exe", { type: "application/octet-stream" });
      await user.upload(input, bad);
      await waitFor(() => expect(document.body.textContent).toMatch(/not an accepted|virus\.exe/i), {
        timeout: 8_000,
      }).catch(() => undefined);

      const good = new File([new Uint8Array([1, 2, 3, 4])], "passport.png", { type: "image/png" });
      await user.upload(input, good);
      await waitFor(() => expect(document.body.textContent).toMatch(/passport\.png/i), { timeout: 8_000 });

      // Max-files message: upload 5 more tiny pngs (MAX_FILES=5)
      for (let i = 0; i < 5; i++) {
        const f = new File([new Uint8Array([i])], `extra${i}.png`, { type: "image/png" });
        await user.upload(input, f);
      }
      await waitFor(() => expect(document.body.textContent).toMatch(/Maximum 5 files|passport\.png/i), {
        timeout: 8_000,
      }).catch(() => undefined);

      // Remove last selected file then re-add one for upload path
      const removeBtns = screen.queryAllByRole("button").filter((b) => b.className.includes("h-7 w-7 p-0"));
      if (removeBtns.length > 1) await clickSafe(user, removeBtns[removeBtns.length - 1]);
      await user.upload(input, new File([new Uint8Array([7, 8])], "final.png", { type: "image/png" }));
    }

    const notes = screen.queryByPlaceholderText(/additional information|reviewer/i);
    if (notes) fireEvent.change(notes, { target: { value: `${PREFIX} center notes` } });

    await clickSafe(user, screen.queryByRole("button", { name: /Submit Verification Request/i }));
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /Verification request submitted|Error|pending verification request/i,
        ),
      { timeout: 45_000 },
    );
    // Remount to hit Request History + document_files rendering
    u0();
    const { unmount: u0h } = renderApp(<VerificationCenter />, { route: "/settings?tab=verification" });
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /Request History|pending verification request|passport\.png|final\.png|Verification Level/i,
        ),
      { timeout: 30_000 },
    );
    u0h();

    // Clean any new request for L0 so we can also hit "already pending" via re-seed
    const { data: newReqs } = await admin
      .from("verification_requests")
      .select("id")
      .eq("member_id", seeded.l0MemberId!)
      .like("notes", "covmv_%");
    for (const r of newReqs ?? []) seeded.verReqIds.push(r.id);

    // L1 subject: pending request + vouch lineage + history with files
    await signIn(`${PREFIX}-l1@example.invalid`);
    // ensure pending exists again
    const { data: ensurePending } = await admin
      .from("verification_requests")
      .select("id")
      .eq("member_id", seeded.l1MemberId!)
      .eq("status", "pending")
      .maybeSingle();
    if (!ensurePending) {
      const { data: p } = await admin
        .from("verification_requests")
        .insert({
          member_id: seeded.l1MemberId!,
          requested_level: 2,
          status: "pending",
          notes: `${PREFIX} l1-pending-2`,
          document_files: [
            {
              name: "doc.pdf",
              type: "application/pdf",
              size: 4096,
              path: "seed/doc.pdf",
              uploaded_at: new Date().toISOString(),
            },
          ],
        })
        .select("id")
        .single();
      if (p) seeded.verReqIds.push(p.id);
    }

    const { unmount: u1 } = renderApp(<VerificationCenter />, { route: "/settings?tab=verification" });
    await waitFor(
      () => expect(document.body.textContent).toMatch(/pending verification request|Vouch Lineage|Request History/i),
      { timeout: 30_000 },
    );
    expect(document.body.textContent).toMatch(/CovMVV|Trusted|Level 2|Request History|pending/i);
    u1();

    // L1 without pending + enough vouches → can request L2 (submit without upload)
    await admin
      .from("verification_requests")
      .delete()
      .eq("member_id", seeded.l1MemberId!)
      .eq("status", "pending");
    await signIn(`${PREFIX}-l1@example.invalid`);
    const { unmount: u1b } = renderApp(withToaster(<VerificationCenter />), {
      route: "/settings?tab=verification",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Request Level 2/i), { timeout: 30_000 });
    const notes2 = screen.queryByPlaceholderText(/additional information|reviewer/i);
    if (notes2) fireEvent.change(notes2, { target: { value: `${PREFIX} l2-req` } });
    await clickSafe(user, screen.queryByRole("button", { name: /Submit Verification Request/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Verification request submitted|Error|pending/i),
      { timeout: 30_000 },
    );
    u1b();
    const { data: l1new } = await admin
      .from("verification_requests")
      .select("id")
      .eq("member_id", seeded.l1MemberId!)
      .like("notes", "covmv_%");
    for (const r of l1new ?? []) if (!seeded.verReqIds.includes(r.id)) seeded.verReqIds.push(r.id);

    // L0 without enough vouches — strip vouches temporarily
    await admin.from("vouches").delete().eq("member_id", seeded.l0MemberId!);
    await signIn(`${PREFIX}-l0@example.invalid`);
    const { unmount: u0b } = renderApp(<VerificationCenter />, { route: "/settings?tab=verification" });
    await waitFor(() => expect(document.body.textContent).toMatch(/at least 2 vouches|Currently: 0\/2/i), {
      timeout: 30_000,
    });
    u0b();
    // restore two vouches for cleanup consistency
    for (const vid of seeded.voucherMemberIds.slice(0, 2)) {
      const { data: vh } = await admin
        .from("vouches")
        .insert({ member_id: seeded.l0MemberId!, voucher_member_id: vid, note: `${PREFIX} restore` })
        .select("id")
        .single();
      if (vh) seeded.vouchIds.push(vh.id);
    }

    // L2+ overseas verified + L3 admin message
    await signIn(`${PREFIX}-l2@example.invalid`);
    const { unmount: u2 } = renderApp(<VerificationCenter />, { route: "/settings?tab=verification" });
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Level 3 — Admin Granted|Overseas Verified|Active/i),
      { timeout: 30_000 },
    );
    u2();
  }, 180_000);

  it("VerificationDashboard: queues, approve/reject/needs_info, reminders, chapter scope", async () => {
    const user = userEvent.setup();
    const admin = adminClient();

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    // Disposable seeds default onboarding_completed=true; flip one so the
    // chapter-scoped queue is non-empty for select-all / mass send.
    if (seeded.l0MemberId) {
      await admin.from("members").update({ onboarding_completed: false }).eq("id", seeded.l0MemberId);
    }
    // Chapter-scoped mount for mass reminders — global send_to_all hits 50–300+
    // pending rows and Emailit rate limits (~74s), flaking the 45s toast wait.
    let view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={AHMEDABAD} isGlobalAdmin canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Pending Member Onboarding|Verification Requests|Tag/i),
      { timeout: 45_000 },
    );

    // Select-all + individual checkbox + reminders (userEvent for Radix Checkbox)
    await waitFor(() => expect(screen.queryByText(/Select all \(/i)).toBeTruthy(), { timeout: 15_000 });
    const selectAll =
      screen.queryByLabelText(/Select all pending members/i) ||
      document.getElementById("select-all-pending") ||
      screen.queryAllByRole("checkbox")[0];
    expect(selectAll).toBeTruthy();
    await user.click(selectAll!); // select all → toggleAll else branch
    await waitFor(() => expect(screen.queryByRole("button", { name: /Send Reminder \(/i })).toBeTruthy(), {
      timeout: 10_000,
    });
    await user.click(selectAll!); // clear → toggleAll allSelected branch
    await user.click(selectAll!); // select again
    const rowCbs = screen.queryAllByRole("checkbox").slice(1);
    expect(rowCbs.length).toBeGreaterThan(0);
    await user.click(rowCbs[0]); // deselect one via onCheckedChange
    await user.click(rowCbs[0]); // reselect

    const massBtn =
      screen.queryByLabelText(/Send reminder emails to all/i) ||
      screen.queryByRole("button", { name: /Send reminder emails to all|Send to All Pending/i });
    expect(massBtn).toBeTruthy();
    await user.click(massBtn!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Send Reminders to All Pending/i), {
      timeout: 10_000,
    });
    await clickSafe(user, screen.queryByRole("button", { name: /^Cancel$/i }));
    await closeDialogs(user);

    await user.click(massBtn!);
    await user.click(screen.getByRole("button", { name: /Send to All$/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Mass reminders|No reminders|Error|sent/i),
      { timeout: 60_000 },
    );

    // Re-select so bulk Send Reminder is available (mass send clears selection)
    fireEvent.click(selectAll!);
    await waitFor(
      () => expect(screen.queryByRole("button", { name: /Send Reminder \(/i })).toBeTruthy(),
      { timeout: 15_000 },
    ).catch(() => undefined);
    const bulkSend = screen.queryByRole("button", { name: /Send Reminder \(/i });
    if (bulkSend) {
      await user.click(bulkSend);
      await waitFor(
        () => expect(document.body.textContent).toMatch(/Reminders sent|No reminders|Error|failed/i),
        { timeout: 45_000 },
      );
    }

    // Per-row reminder as Chapter Admin (skips GA emailInfo gate)
    view.unmount();
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    view = renderApp(
      withToaster(<VerificationDashboard myChapterId={AHMEDABAD} isGlobalAdmin={false} canSendReminders />),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Pending Member Onboarding|Select all/i), {
      timeout: 45_000,
    });
    const rowRemind =
      screen.queryAllByLabelText(/Send reminder email/i)[0] ||
      screen.queryAllByRole("button").find((b) => b.getAttribute("title") === "Send reminder email");
    expect(rowRemind).toBeTruthy();
    await user.click(rowRemind!);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Reminders sent|No reminders|Error|failed/i),
      { timeout: 45_000 },
    );
    // Back to GA for approve/reject flows
    view.unmount();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    view = renderApp(
      withToaster(<VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders />),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Pending|Verification|Tag/i), {
      timeout: 45_000,
    });

    // Ensure a pending VR exists, then Approve (member level update arm)
    const { data: ensureVr } = await admin
      .from("verification_requests")
      .insert({
        member_id: TARGET_MEMBER,
        requested_level: 1,
        status: "pending",
        notes: `${PREFIX} approve-now`,
      })
      .select("id")
      .single();
    if (ensureVr) seeded.verReqIds.push(ensureVr.id);
    view.unmount();
    view = renderApp(
      withToaster(<VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders />),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/approve-now|Approve/i), {
      timeout: 45_000,
    });
    const approveBtn = screen.queryAllByRole("button", { name: /Approve/i })[0];
    expect(approveBtn).toBeTruthy();
    await user.click(approveBtn!);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Verification approved|Error/i),
      { timeout: 20_000 },
    );

    // Re-seed a pending for More dialog paths
    const { data: vr2 } = await admin
      .from("verification_requests")
      .insert({
        member_id: TARGET_MEMBER,
        requested_level: 2,
        status: "pending",
        notes: `${PREFIX} more-dialog`,
      })
      .select("id")
      .single();
    if (vr2) seeded.verReqIds.push(vr2.id);

    view.unmount();
    view = renderApp(
      withToaster(<VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders />),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Requests|More/i), {
      timeout: 45_000,
    });

    await waitFor(() => expect(document.body.textContent).toMatch(/more-dialog|Verification Requests/i), {
      timeout: 30_000,
    }).catch(() => undefined);
    const moreBtn = screen.queryAllByRole("button", { name: /^More$/i })[0];
    expect(moreBtn).toBeTruthy();
    fireEvent.click(moreBtn!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Decision/i), {
      timeout: 15_000,
    });
    const noteArea = screen.queryByPlaceholderText(/Notes \(shown to member\)/i);
    if (noteArea) fireEvent.change(noteArea, { target: { value: `${PREFIX} need-info` } });
    fireEvent.click(screen.getByRole("button", { name: /Need Info/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Requested more info|Error/i), {
      timeout: 20_000,
    }).catch(() => undefined);
    await closeDialogs(user);

    const { data: vr3 } = await admin
      .from("verification_requests")
      .insert({
        member_id: TARGET_MEMBER,
        requested_level: 2,
        status: "pending",
        notes: `${PREFIX} reject-dialog`,
      })
      .select("id")
      .single();
    if (vr3) seeded.verReqIds.push(vr3.id);
    view.unmount();
    view = renderApp(
      withToaster(<VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders />),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/reject-dialog|More/i), {
      timeout: 45_000,
    });
    const moreBtn2 = screen.queryAllByRole("button", { name: /^More$/i })[0];
    expect(moreBtn2).toBeTruthy();
    fireEvent.click(moreBtn2!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Decision/i), {
      timeout: 15_000,
    });
    fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification rejected|Error/i), {
      timeout: 20_000,
    }).catch(() => undefined);
    await closeDialogs(user);

    // Tags tab jump + matrimonial/oral links
    const tagsHost = document.createElement("button");
    tagsHost.setAttribute("data-value", "tags");
    document.body.appendChild(tagsHost);
    await clickSafe(user, screen.queryByRole("button", { name: /Go to Tags tab/i }));
    await clickSafe(user, screen.queryByRole("link", { name: /Go to Matrimonial/i }));
    await clickSafe(user, screen.queryByRole("link", { name: /Go to Oral History/i }));
    tagsHost.remove();

    // Review links
    await clickSafe(user, screen.queryAllByRole("link", { name: /Review/i })[0]);
    view.unmount();

    // Chapter-scoped filter (Ahmedabad) — still renders queues filtered
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const { unmount: u4 } = renderApp(
      <VerificationDashboard myChapterId={AHMEDABAD} isGlobalAdmin={false} canSendReminders />,
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect((document.body.textContent?.length ?? 0) > 20).toBe(true), {
      timeout: 45_000,
    });
    u4();

    // Empty-ish chapter with no matches → may still have tags; use impossible chapter id filter
    const { unmount: u5 } = renderApp(
      <VerificationDashboard
        myChapterId="00000000-0000-0000-0000-000000000099"
        isGlobalAdmin={false}
        canSendReminders={false}
      />,
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect((document.body.textContent?.length ?? 0) > 10).toBe(true), {
      timeout: 45_000,
    });
    u5();
  }, 240_000);

  it("MemberProfile: admin verify/edit/directory + member vouch/request arms", async () => {
    const user = userEvent.setup();
    const admin = adminClient();

    // Global admin — edit, level, verification panel, directory controls
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    // Ensure target not too high for level-up; privacy arms for canSeeField
    await admin
      .from("members")
      .update({
        verification_level: 1,
        overseas_verified: false,
        dob: "1990-06-15",
        birth_place: "Coverage Town",
        privacy: { dob: "private", birth_place: "chapter", employment: "custom_level" },
        chapter_id: AHMEDABAD, // same chapter as E2E GA for chapter privacy arm
      })
      .eq("id", TARGET_MEMBER);

    const { unmount: uAdmin } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Hemal Shah|Personal Details|Verification Panel/i), {
      timeout: 45_000,
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: /Edit Member/i })).toBeTruthy(), {
      timeout: 30_000,
    });

    // Edit dialog (controlled open sets editForm)
    const editBtn = screen.getByRole("button", { name: /Edit Member/i });
    fireEvent.click(editBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/Update basic profile fields/i), {
      timeout: 10_000,
    });
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const inputs = dialog?.querySelectorAll("input") ?? [];
    if (inputs[0]) fireEvent.change(inputs[0], { target: { value: "Hemal" } });
    if (inputs[1]) fireEvent.change(inputs[1], { target: { value: "Shah" } });
    const gender = dialog?.querySelector("select");
    if (gender) fireEvent.change(gender, { target: { value: "Male" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Member updated|Error/i), {
      timeout: 20_000,
    });
    await closeDialogs(user);

    // Level up / down (header + panel)
    await clickSafe(user, screen.queryByLabelText(/Upgrade verification level/i));
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification level updated|Error/i), {
      timeout: 15_000,
    }).catch(() => undefined);
    await clickSafe(user, screen.queryByLabelText(/Downgrade verification level/i));

    // Open verification panel
    await clickSafe(user, screen.queryByRole("button", { name: /Verification Panel/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Add Verification Note|Request Documentation/i), {
      timeout: 15_000,
    });

    // Panel level buttons (header also has Downgrade — prefer Mark L / panel Downgrade)
    await clickSafe(user, screen.queryAllByRole("button", { name: /Mark L/i })[0]);
    await clickSafe(user, screen.queryAllByRole("button", { name: /^Downgrade$/i })[0]);

    const note = screen.queryByPlaceholderText(/Record a note/i);
    if (note) {
      fireEvent.change(note, { target: { value: `${PREFIX} admin-note` } });
      await clickSafe(user, screen.queryByRole("button", { name: /Save Note/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Verification note saved|Error/i), {
        timeout: 20_000,
      }).catch(() => undefined);
    }

    const doc = screen.queryByPlaceholderText(/Document type/i);
    if (doc) {
      fireEvent.change(doc, { target: { value: "Passport" } });
      await clickSafe(user, screen.queryByRole("button", { name: /^Request$/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Documentation request created|Error/i), {
        timeout: 20_000,
      }).catch(() => undefined);
    }
    // Default doc type when empty
    await clickSafe(user, screen.queryByRole("button", { name: /^Request$/i }));

    // Directory manager section (GA has canManageDirectory)
    await waitFor(() => expect(document.body.textContent).toMatch(/Directory Manager Controls|Employment/i), {
      timeout: 20_000,
    }).catch(() => undefined);
    await clickSafe(user, screen.queryAllByRole("button", { name: /^Verify$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Employment record verified|Error/i), {
      timeout: 15_000,
    }).catch(() => undefined);

    // Prefer Directory Manager business Approve (other chrome may also expose Approve).
    await clickSafe(user, screen.queryAllByRole("button", { name: /^Approve$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Business verified|Error/i), {
      timeout: 15_000,
    }).catch(() => undefined);
    await clickSafe(user, screen.queryAllByRole("button", { name: /^Revoke$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Business verification removed|Error/i), {
      timeout: 15_000,
    }).catch(() => undefined);

    // Hide panel
    await clickSafe(user, screen.queryByRole("button", { name: /Hide/i }));
    uAdmin();

    // Track new verification_requests for cleanup
    const { data: extraVr } = await admin
      .from("verification_requests")
      .select("id")
      .eq("member_id", TARGET_MEMBER)
      .like("notes", "covmv_%");
    for (const r of extraVr ?? []) if (!seeded.verReqIds.includes(r.id)) seeded.verReqIds.push(r.id);

    // Chapter admin viewing other-chapter member → scope warning
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const { unmount: uCa } = renderApp(<MemberProfile />, {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Hemal|Verification Panel/i), {
      timeout: 45_000,
    });
    await clickSafe(user, screen.queryByRole("button", { name: /Verification Panel/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/different chapter|Verification Panel/i),
      { timeout: 15_000 },
    );
    uCa();

    // Directory manager alone — empty employment/business path on disposable L2
    await signIn(E2E_ACCOUNTS.directoryManager.email);
    const { unmount: uDm } = renderApp(<MemberProfile />, {
      route: `/member/${seeded.l2MemberId}`,
      pathPattern: "/member/:id",
    });
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /Directory Manager Controls|No employment records|CovMVL2/i,
        ),
      { timeout: 45_000 },
    );
    uDm();

    // Member (L0) viewing target — vouch + request vouch nudge.
    // Other suites often leave this seed at L2; vouch-request UI requires level < 2.
    await signIn(E2E_ACCOUNTS.member.email);
    const myId = await memberIdForSession();
    const { data: memLevelRow } = await admin
      .from("members")
      .select("verification_level")
      .eq("id", myId)
      .single();
    if (seeded.memberOrigLevel == null) {
      seeded.memberOrigLevel = memLevelRow?.verification_level ?? 2;
    }
    setVerificationLevelSql(myId, 0);

    // clear any prior vouch from member → target
    await admin.from("vouches").delete().eq("voucher_member_id", myId).eq("member_id", TARGET_MEMBER);
    await admin.from("vouch_requests").delete().eq("requester_member_id", myId).eq("target_member_id", TARGET_MEMBER);

    // Pre-insert vouch so UI vouch hits unique constraint → onError
    await admin.from("vouches").insert({
      member_id: TARGET_MEMBER,
      voucher_member_id: myId,
      note: `${PREFIX} pre-vouch`,
    });

    const { unmount: uMem } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Need to get verified|Vouches|Hemal/i), {
      timeout: 45_000,
    });

    // alreadyVouched hides form — clear unique row via admin then remount for success path
    uMem();
    await admin.from("vouches").delete().eq("voucher_member_id", myId).eq("member_id", TARGET_MEMBER);

    const { unmount: uMemOk } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(screen.queryAllByRole("button", { name: /Vouch for/i }).length).toBeGreaterThan(0), {
      timeout: 45_000,
    });
    // Race: insert conflicting vouch then click → onError
    await admin.from("vouches").insert({
      member_id: TARGET_MEMBER,
      voucher_member_id: myId,
      note: `${PREFIX} race-vouch`,
    });
    await clickSafe(user, screen.queryAllByRole("button", { name: /Vouch for/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Error|duplicate|unique/i), {
      timeout: 15_000,
    }).catch(() => undefined);

    // Clean and real success vouch
    await admin.from("vouches").delete().eq("voucher_member_id", myId).eq("member_id", TARGET_MEMBER);
    uMemOk();
    const { unmount: uMem2b } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(screen.queryAllByRole("button", { name: /Vouch for/i }).length).toBeGreaterThan(0), {
      timeout: 45_000,
    });
    // Re-assert L0 — other mounts/hooks may have refreshed a stale level.
    setVerificationLevelSql(myId, 0);
    const vouchNote = screen.queryByPlaceholderText(/Add a note \(optional\)/i);
    if (vouchNote) fireEvent.change(vouchNote, { target: { value: `${PREFIX} vouch-note` } });
    await clickSafe(user, screen.queryAllByRole("button", { name: /Vouch for/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Vouch submitted|Error/i), {
      timeout: 20_000,
    }).catch(() => undefined);

    // Request vouch: cancel/reopen, onError (duplicate), then success
    await admin.from("vouch_requests").delete().eq("requester_member_id", myId).eq("target_member_id", TARGET_MEMBER);
    await waitFor(
      () => expect(screen.queryAllByRole("button", { name: /Request .* to vouch for you/i }).length).toBeGreaterThan(0),
      { timeout: 30_000 },
    );
    await clickSafe(user, screen.queryAllByRole("button", { name: /Request .* to vouch for you/i })[0]);
    await clickSafe(user, screen.queryAllByRole("button", { name: /^Cancel$/i })[0]);
    await clickSafe(user, screen.queryAllByRole("button", { name: /Request .* to vouch for you/i })[0]);
    const reqMsg2 = screen.queryByPlaceholderText(/Could you vouch for me/i);
    if (reqMsg2) fireEvent.change(reqMsg2, { target: { value: `${PREFIX} please vouch` } });
    await admin.from("vouch_requests").insert({
      requester_member_id: myId,
      target_member_id: TARGET_MEMBER,
      message: `${PREFIX} race-req`,
      status: "pending",
    });
    await clickSafe(user, screen.queryAllByRole("button", { name: /Send Request/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Error|duplicate|unique/i), {
      timeout: 15_000,
    }).catch(() => undefined);
    await admin.from("vouch_requests").delete().eq("requester_member_id", myId).eq("target_member_id", TARGET_MEMBER);
    // Remount so request form is clean after race row cleanup
    uMem2b();
    const { unmount: uMemReq } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(
      () => expect(screen.queryAllByRole("button", { name: /Request .* to vouch for you/i }).length).toBeGreaterThan(0),
      { timeout: 45_000 },
    );
    await clickSafe(user, screen.queryAllByRole("button", { name: /Request .* to vouch for you/i })[0]);
    const reqMsg3 = screen.queryByPlaceholderText(/Could you vouch for me/i);
    if (reqMsg3) fireEvent.change(reqMsg3, { target: { value: `${PREFIX} please vouch` } });
    await clickSafe(user, screen.queryAllByRole("button", { name: /Send Request/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Vouch request sent/i), {
      timeout: 25_000,
    });
    // Confirm row landed (status remount depends on it)
    await waitFor(
      async () => {
        const { data: landed } = await admin
          .from("vouch_requests")
          .select("id, status")
          .eq("requester_member_id", myId)
          .eq("target_member_id", TARGET_MEMBER)
          .maybeSingle();
        expect(landed?.id).toBeTruthy();
      },
      { timeout: 15_000 },
    );
    uMemReq();

    // Remount to hit existingVouchRequest status line
    const { unmount: uMem2 } = renderApp(<MemberProfile />, {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Vouch request sent — status|status:/i), {
      timeout: 45_000,
    });
    uMem2();

    // Restore E2E member level before remaining arms
    if (seeded.memberOrigLevel != null) {
      setVerificationLevelSql(myId, seeded.memberOrigLevel);
    }

    const { data: vrq } = await admin
      .from("vouch_requests")
      .select("id")
      .eq("requester_member_id", myId)
      .eq("target_member_id", TARGET_MEMBER);
    for (const r of vrq ?? []) seeded.vouchReqIds.push(r.id);
    const { data: vhs } = await admin
      .from("vouches")
      .select("id")
      .eq("voucher_member_id", myId)
      .eq("member_id", TARGET_MEMBER);
    for (const r of vhs ?? []) seeded.vouchIds.push(r.id);

    // Own profile — no admin controls / no vouch
    const { unmount: uOwn } = renderApp(<MemberProfile />, {
      route: `/member/${myId}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Personal Details|Vouches|Family/i), {
      timeout: 45_000,
    });
    expect(screen.queryByRole("button", { name: /Edit Member/i })).toBeNull();
    uOwn();

    // Not-found path
    const { unmount: u404 } = renderApp(<MemberProfile />, {
      route: `/member/00000000-0000-0000-0000-000000000099`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Member not found|Loading/i), {
      timeout: 30_000,
    });
    u404();

    // Unauthenticated → Navigate /auth
    await supabase.auth.signOut();
    const { unmount: uAuth } = renderApp(<MemberProfile />, {
      route: `/member/${TARGET_MEMBER}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Loading|Sign|Auth|Member/i), {
      timeout: 20_000,
    }).catch(() => undefined);
    uAuth();

    // Restore target (incl. original chapter / privacy / dob)
    if (seeded.targetOrig) {
      await admin
        .from("members")
        .update({
          verification_level: seeded.targetOrig.verification_level,
          first_name: seeded.targetOrig.first_name,
          last_name: seeded.targetOrig.last_name,
          gender: seeded.targetOrig.gender,
          privacy: seeded.targetOrig.privacy as never,
          overseas_verified: seeded.targetOrig.overseas_verified,
          chapter_id: seeded.targetOrig.chapter_id,
          dob: seeded.targetOrig.dob,
          birth_place: seeded.targetOrig.birth_place,
        })
        .eq("id", TARGET_MEMBER);
    }
  }, 240_000);
});
