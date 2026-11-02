/**
 * Pass 20 / Wave 9 — ChapterDetail + ChapterTransfersTab → 100% lines
 * against real Kong :54331 / khadayata_local :5438. Disposable covcdt_* rows only.
 * No MSW / fixture JSON for view domain data.
 *
 * Gaps closed:
 * - ChapterDetail History pastCommittee.map (16 lines) via seeded expired role_assignment
 * - ChapterTransfersTab decide mutationFn + onSuccess (15 lines) via Global Admin Approve/Reject
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ReactNode } from "react";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import ChapterDetail from "@/pages/ChapterDetail";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import { Toaster } from "@/components/ui/toaster";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const MUMBAI = "f1000003-0000-0000-0000-000000000003";
/** Ahmedabad Committee Member role (chapter-scoped). */
const AHM_COMMITTEE_MEMBER = "45748f70-3395-47d2-a5b3-ad863818a085";
/** Viral Shah — non-E2E Ahmedabad member used for disposable past-committee + transfer. */
const VIRAL = "f0fc9048-5e9d-44f8-832d-b22e2a8a24ca";
const PREFIX = `covcdt_${Date.now().toString(36)}`;
const DB_URL = process.env.DATABASE_URL ?? "postgresql://roshanshah@127.0.0.1:5438/khadayata_local";

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
        const m = line.match(/^([A-Z0_9_]+)=(.*)$/);
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

function psql(sql: string) {
  const path = `/tmp/covcdt-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`;
  writeFileSync(path, sql);
  try {
    execSync(`psql "${DB_URL}" -v ON_ERROR_STOP=1 -f ${JSON.stringify(path)}`, {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
}

/** Product policy from 20260915 — local dumps sometimes omit UPDATE on chapter_transfers. */
function ensureTransferDecidePolicy() {
  psql(`
DROP POLICY IF EXISTS "Global admins decide chapter transfers" ON public.chapter_transfers;
CREATE POLICY "Global admins decide chapter transfers"
  ON public.chapter_transfers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') AND status = 'pending')
  WITH CHECK (has_role(auth.uid(), 'Global Admin') AND status IN ('pending', 'approved', 'rejected'));
NOTIFY pgrst, 'reload schema';
`);
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

async function signOut() {
  await supabase.auth.signOut();
  lastSignInAt = Date.now();
}

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
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

const seeded = {
  assignmentIds: [] as string[],
  transferIds: [] as string[],
  originalChapterId: AHMEDABAD as string | null,
  photoUrlSet: false,
};

async function cleanupSeeds(admin: SupabaseClient) {
  if (seeded.transferIds.length) {
    await admin.from("chapter_transfers").delete().in("id", seeded.transferIds);
    seeded.transferIds = [];
  }
  await admin.from("chapter_transfers").delete().like("reason", `${PREFIX}%`);
  if (seeded.assignmentIds.length) {
    await admin.from("role_assignments").delete().in("id", seeded.assignmentIds);
    seeded.assignmentIds = [];
  }
  await admin.from("role_assignments").delete().eq("member_id", VIRAL).eq("role_id", AHM_COMMITTEE_MEMBER)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
  if (seeded.originalChapterId) {
    await admin.from("members").update({ chapter_id: seeded.originalChapterId }).eq("id", VIRAL);
  }
  if (seeded.photoUrlSet) {
    await admin.from("members").update({ photo_url: null }).eq("id", VIRAL);
    seeded.photoUrlSet = false;
  }
}

describe("Pass 20 — ChapterDetail / ChapterTransfersTab (real Kong)", () => {
  let admin: SupabaseClient;

  beforeAll(async () => {
    admin = adminClient();
    ensureTransferDecidePolicy();
    await cleanupSeeds(admin);

    const { data: viral } = await admin
      .from("members")
      .select("id, chapter_id, first_name, photo_url")
      .eq("id", VIRAL)
      .single();
    expect(viral?.id).toBe(VIRAL);
    seeded.originalChapterId = viral!.chapter_id ?? AHMEDABAD;

    // Past committee row: expired Ahmedabad Committee Member assignment + photo for AvatarImage
    await admin.from("members").update({ photo_url: "https://placehold.co/96x96/png?text=covcdt" }).eq("id", VIRAL);
    seeded.photoUrlSet = true;

    const { data: asg, error: asgErr } = await admin
      .from("role_assignments")
      .insert({
        member_id: VIRAL,
        role_id: AHM_COMMITTEE_MEMBER,
        chapter_id: AHMEDABAD,
        start_date: "2022-01-01",
        end_date: "2023-12-31",
      })
      .select("id")
      .single();
    if (asgErr) throw asgErr;
    seeded.assignmentIds.push(asg.id);
  }, 60_000);

  afterAll(async () => {
    cleanup();
    await signOut();
    await cleanupSeeds(admin);
  }, 60_000);

  it("ChapterDetail History tab renders seeded past committee", async () => {
    await signOut();
    const user = makeUser();
    const { unmount } = renderApp(<ChapterDetail />, {
      route: "/chapters/ahmedabad",
      pathPattern: "/chapters/:slug",
    });

    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/ahmedabad/);
    }, { timeout: 30_000 });

    const historyTab = await screen.findByRole("tab", { name: /History/i }, { timeout: 15_000 });
    await clickSafe(user, historyTab);

    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Past Committee Members/i);
      expect(text).toMatch(/Viral/i);
      expect(text).toMatch(/Committee Member/i);
      expect(text).toMatch(/2022[\u2013\-]2023|2022–2023/);
    }, { timeout: 25_000 });

    unmount();
  }, 120_000);

  it("ChapterTransfersTab: Global Admin Approve + Reject cover decide mutation", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const uid = (await supabase.auth.getUser()).data.user!.id;
    expect(uid).toBeTruthy();

    // Restore Viral to Ahmedabad before seeding transfers
    await admin.from("members").update({ chapter_id: AHMEDABAD }).eq("id", VIRAL);

    const { data: approveRow, error: aErr } = await admin
      .from("chapter_transfers")
      .insert({
        member_id: VIRAL,
        from_chapter_id: AHMEDABAD,
        to_chapter_id: MUMBAI,
        status: "pending",
        reason: `${PREFIX} approve`,
      })
      .select("id")
      .single();
    if (aErr) throw aErr;
    seeded.transferIds.push(approveRow.id);

    const { data: rejectRow, error: rErr } = await admin
      .from("chapter_transfers")
      .insert({
        member_id: VIRAL,
        from_chapter_id: AHMEDABAD,
        to_chapter_id: MUMBAI,
        status: "pending",
        reason: `${PREFIX} reject`,
      })
      .select("id")
      .single();
    if (rErr) throw rErr;
    seeded.transferIds.push(rejectRow.id);

    const user = makeUser();
    const { unmount } = renderApp(withToaster(<ChapterTransfersTab />), {
      route: "/admin?tab=transfers",
    });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Pending Transfers/i);
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} approve`));
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} reject`));
    }, { timeout: 30_000 });

    function rowForReason(reason: string): HTMLElement {
      const reasonEl = screen.getByText(reason);
      const row =
        reasonEl.closest("div.flex.items-center.justify-between") ??
        reasonEl.parentElement?.parentElement;
      if (!row) throw new Error(`row not found for ${reason}`);
      return row as HTMLElement;
    }

    // Approve ONLY our approve-reason row (other pending transfers may exist)
    const approveRowEl = rowForReason(`${PREFIX} approve`);
    const approveBtn = Array.from(approveRowEl.querySelectorAll("button")).find((b) =>
      /Approve/i.test(b.textContent ?? ""),
    );
    expect(approveBtn).toBeTruthy();
    await clickSafe(user, approveBtn as HTMLElement);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Transfer approved/i);
    }, { timeout: 25_000 });

    await waitFor(async () => {
      const { data: afterApprove } = await admin
        .from("chapter_transfers")
        .select("id, status, approved_by")
        .eq("id", approveRow.id)
        .single();
      expect(afterApprove?.status).toBe("approved");
      expect(afterApprove?.approved_by).toBe(uid);
    }, { timeout: 15_000 });

    await waitFor(async () => {
      const { data: viralAfter } = await admin.from("members").select("chapter_id").eq("id", VIRAL).single();
      expect(viralAfter?.chapter_id).toBe(MUMBAI);
    }, { timeout: 15_000 });

    // Reject ONLY our reject-reason row
    const rejectRowEl = rowForReason(`${PREFIX} reject`);
    const rejectBtn = Array.from(rejectRowEl.querySelectorAll("button")).find((b) =>
      /Reject/i.test(b.textContent ?? ""),
    );
    expect(rejectBtn).toBeTruthy();
    await clickSafe(user, rejectBtn as HTMLElement);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Transfer rejected/i);
    }, { timeout: 25_000 });

    await waitFor(async () => {
      const { data: afterReject } = await admin
        .from("chapter_transfers")
        .select("id, status")
        .eq("id", rejectRow.id)
        .single();
      expect(afterReject?.status).toBe("rejected");
    }, { timeout: 15_000 });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Resolved/i);
    }, { timeout: 10_000 });

    // Restore chapter for cleanup
    await admin.from("members").update({ chapter_id: AHMEDABAD }).eq("id", VIRAL);

    unmount();
  }, 180_000);
});
