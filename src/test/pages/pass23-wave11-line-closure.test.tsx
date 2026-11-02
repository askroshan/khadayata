/**
 * Pass 23 — Close Rem5's last 28 uncovered lines:
 *   VerificationCenter pending banner + Request History document_files
 *   BulkContentTab toggleItem (row checkbox)
 *   Onboarding "Loading chapters..."
 * EMAILIT blank / DISABLE_OUTBOUND_EMAIL=1. Real Kong :54331.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup as rtlCleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import { VerificationCenter } from "@/components/verification/VerificationCenter";
import BulkContentTab from "@/components/admin/BulkContentTab";
import Onboarding from "@/pages/Onboarding";

const PREFIX = `covw11c_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const DOC_NAME = `${PREFIX}-kyc.pdf`;

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

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
      /* next */
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

let lastSignInAt = 0;
async function signIn(email: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 6; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit|fetch failed|network|ECONNREFUSED/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    throw error;
  }
  throw new Error(`signIn failed for ${email}`);
}

const seeded: {
  userIds: string[];
  memberIds: string[];
  verReqIds: string[];
  eventId?: string;
  l1Email?: string;
  onbEmail?: string;
} = { userIds: [], memberIds: [], verReqIds: [] };

async function createAuthMember(
  admin: SupabaseClient,
  opts: {
    email: string;
    first: string;
    last: string;
    level: number;
    chapterId: string | null;
    onboarding?: boolean;
  },
) {
  const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
    email: opts.email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (cuErr || !cu.user) throw cuErr ?? new Error(`createUser ${opts.email}`);
  seeded.userIds.push(cu.user.id);
  const { data: mem, error: memErr } = await admin
    .from("members")
    .insert({
      user_id: cu.user.id,
      first_name: opts.first,
      last_name: opts.last,
      chapter_id: opts.chapterId,
      verification_level: opts.level,
      onboarding_completed: opts.onboarding ?? true,
      overseas_verified: false,
      suspended: false,
      blocked: false,
      gender: "Male",
      dob: "1990-01-15",
      birth_place: "Coverage City",
      privacy: { dob: "members", birth_place: "chapter", employment: "members", phone: "private", email: "members" },
    })
    .select("id")
    .single();
  if (memErr || !mem) throw memErr ?? new Error(`seed member ${opts.email}`);
  seeded.memberIds.push(mem.id);
  setVerificationLevelSql(mem.id, opts.level);
  return { userId: cu.user.id, memberId: mem.id };
}

async function cleanupSeeds() {
  const admin = adminClient();
  if (seeded.verReqIds.length) await admin.from("verification_requests").delete().in("id", seeded.verReqIds);
  await admin.from("verification_requests").delete().like("notes", `${PREFIX}%`);
  if (seeded.eventId) await admin.from("events").delete().eq("id", seeded.eventId);
  await admin.from("events").delete().ilike("name", `${PREFIX}%`);
  if (seeded.memberIds.length) {
    await admin.from("members").delete().in("id", seeded.memberIds);
  }
  for (const uid of seeded.userIds) {
    await admin.auth.admin.deleteUser(uid).catch(() => undefined);
  }
}

describe("Pass 23 — Wave 11 Rem5 line closure (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    seeded.l1Email = `${PREFIX}-l1@example.invalid`;
    const l1 = await createAuthMember(admin, {
      email: seeded.l1Email,
      first: "CovW11C",
      last: "L1Pending",
      level: 1,
      chapterId: AHMEDABAD,
      onboarding: true,
    });

    const { data: pending, error: pErr } = await admin
      .from("verification_requests")
      .insert({
        member_id: l1.memberId,
        requested_level: 2,
        status: "pending",
        notes: `${PREFIX} pending-banner`,
        document_type: "passport",
        document_files: [
          {
            name: DOC_NAME,
            type: "application/pdf",
            size: 4096,
            path: `seed/${PREFIX}.pdf`,
            uploaded_at: new Date().toISOString(),
          },
        ],
      })
      .select("id")
      .single();
    if (pErr || !pending) throw pErr ?? new Error("seed pending vr");
    seeded.verReqIds.push(pending.id);

    const { data: rejected } = await admin
      .from("verification_requests")
      .insert({
        member_id: l1.memberId,
        requested_level: 2,
        status: "rejected",
        notes: `${PREFIX} hist-rejected`,
        document_files: [
          {
            name: `${PREFIX}-old.png`,
            type: "image/png",
            size: 1024,
            path: `seed/${PREFIX}-old.png`,
            uploaded_at: new Date().toISOString(),
          },
        ],
      })
      .select("id")
      .single();
    if (rejected) seeded.verReqIds.push(rejected.id);

    const starts = new Date(Date.now() + 86400000).toISOString();
    const ends = new Date(Date.now() + 90000000).toISOString();
    const { data: ev, error: evErr } = await admin
      .from("events")
      .insert({
        name: `${PREFIX} Toggle Event`,
        status: "published",
        chapter_id: AHMEDABAD,
        starts_at: starts,
        ends_at: ends,
        venue: "Hall",
        category: "Cultural",
        event_type: "in_person",
      })
      .select("id")
      .single();
    if (evErr || !ev) throw evErr ?? new Error("seed event");
    seeded.eventId = ev.id;

    seeded.onbEmail = `${PREFIX}-onb@example.invalid`;
    await createAuthMember(admin, {
      email: seeded.onbEmail,
      first: "CovW11C",
      last: "Onboard",
      level: 0,
      chapterId: null,
      onboarding: false,
    });
  }, 120_000);

  afterAll(async () => {
    rtlCleanup();
    try {
      await cleanupSeeds();
    } catch {
      /* best-effort */
    }
  }, 120_000);

  it("VerificationCenter: pending banner + Request History document_files", async () => {
    await signIn(seeded.l1Email!);
    const { unmount } = renderApp(withToaster(<VerificationCenter />), {
      route: "/settings?tab=verification",
    });

    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/You have a pending verification request/i);
      },
      { timeout: 45_000 },
    );
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Request History/i);
        expect(document.body.textContent).toMatch(new RegExp(DOC_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        expect(document.body.textContent).toMatch(/pending|rejected|approved/i);
      },
      { timeout: 30_000 },
    );
    // formatFileSize(4096) → "4 KB" (or similar)
    expect(document.body.textContent).toMatch(/4\s*KB|4\.0\s*KB|4096/i);

    unmount();
  }, 120_000);

  it("BulkContentTab: row checkbox toggleItem on/off", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<BulkContentTab />), { route: "/admin?tab=bulk" });

    await waitFor(() => expect(document.body.textContent).toMatch(/Bulk Content Management/i), {
      timeout: 30_000,
    });

    const eventsTab = screen.getByRole("tab", { name: /^Events$/i });
    await user.click(eventsTab);

    const search = await screen.findByPlaceholderText(/Search events/i, {}, { timeout: 15_000 });
    fireEvent.change(search, { target: { value: PREFIX } });

    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Toggle Event`));
      },
      { timeout: 25_000 },
    );

    const rowCb = await waitFor(
      () => {
        const cbs = Array.from(document.querySelectorAll('tbody input[type="checkbox"]')) as HTMLInputElement[];
        expect(cbs.length).toBeGreaterThan(0);
        return cbs[0];
      },
      { timeout: 15_000 },
    );

    // toggleItem add
    await user.click(rowCb);
    await waitFor(() => expect(document.body.textContent).toMatch(/Delete 1 Selected|1 selected/i), {
      timeout: 8_000,
    });

    // toggleItem remove
    await user.click(rowCb);
    await waitFor(() => expect(document.body.textContent).not.toMatch(/Delete \d+ Selected/i), {
      timeout: 8_000,
    });

    unmount();
  }, 120_000);

  it("Onboarding: Loading chapters… while useChapters isLoading", async () => {
    await signIn(seeded.onbEmail!);

    // Spying supabase.from is flaky (Postgrest thenables / Auth race). Mock the hook.
    const memberMod = await import("@/hooks/useMember");
    const chaptersSpy = vi.spyOn(memberMod, "useChapters").mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isPending: true,
      isFetching: true,
      isSuccess: false,
      status: "pending",
      fetchStatus: "fetching",
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof memberMod.useChapters>);

    const { unmount } = renderApp(<Onboarding />, { route: "/onboarding" });

    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Loading chapters/i);
      },
      { timeout: 30_000 },
    );

    chaptersSpy.mockRestore();
    unmount();
  }, 90_000);
});
