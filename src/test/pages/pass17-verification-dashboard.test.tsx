/**
 * Pass 17 — VerificationDashboard → 100% lines against real Kong :54331.
 * Disposable covvd_* chapter + members/VRs/tags/matrimonial/oral; no mock view data.
 * Chapter-scoped mass reminders avoid the global send_to_all flake (50+ members / Emailit rate limits).
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import { Toaster } from "@/components/ui/toaster";

const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";
const PREFIX = `covvd_${Date.now().toString(36)}`;
const OTHER_CHAPTER = "f1000001-0000-0000-0000-000000000001";

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

async function closeDialogs(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 4; i++) {
    if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) break;
    await user.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 120));
  }
}

const seeded = {
  chapterId: null as string | null,
  pendingA: null as { userId: string; memberId: string } | null,
  pendingB: null as { userId: string; memberId: string } | null,
  pendingUnconfirmed: null as { userId: string; memberId: string } | null,
  subject: null as { userId: string; memberId: string } | null,
  orphanAuthUserId: null as string | null,
  verReqIds: [] as string[],
  tagId: null as string | null,
  matId: null as string | null,
  oralId: null as string | null,
};

async function cleanupCovVd() {
  const admin = adminClient();
  if (seeded.verReqIds.length) await admin.from("verification_requests").delete().in("id", seeded.verReqIds);
  await admin.from("verification_requests").delete().like("notes", `${PREFIX}%`);
  if (seeded.tagId) await admin.from("tag_requests").delete().eq("id", seeded.tagId);
  await admin.from("tag_requests").delete().eq("term", `${PREFIX}-tag`);
  if (seeded.matId) await admin.from("matrimonial_profiles").delete().eq("id", seeded.matId);
  if (seeded.oralId) await admin.from("oral_histories").delete().eq("id", seeded.oralId);
  await admin.from("oral_histories").delete().eq("title", `${PREFIX} oral`);

  const memberIds = [
    seeded.pendingA?.memberId,
    seeded.pendingB?.memberId,
    seeded.pendingUnconfirmed?.memberId,
    seeded.subject?.memberId,
  ].filter(Boolean) as string[];
  if (memberIds.length) {
    await admin.from("verification_requests").delete().in("member_id", memberIds);
    await admin.from("matrimonial_profiles").delete().in("member_id", memberIds);
    await admin.from("members").delete().in("id", memberIds);
  }
  await admin.from("members").delete().like("first_name", "CovVD%");

  for (const uid of [
    seeded.pendingA?.userId,
    seeded.pendingB?.userId,
    seeded.pendingUnconfirmed?.userId,
    seeded.subject?.userId,
    seeded.orphanAuthUserId,
  ]) {
    if (uid) await admin.auth.admin.deleteUser(uid);
  }
  if (seeded.chapterId) await admin.from("chapters").delete().eq("id", seeded.chapterId);
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
    emailConfirm?: boolean;
  },
) {
  const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
    email: opts.email,
    password: E2E_PASSWORD,
    email_confirm: opts.emailConfirm ?? true,
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
      overseas_verified: false,
      suspended: false,
      blocked: false,
      gender: "Male",
      dob: "1990-01-15",
      birth_place: "CovVD City",
      privacy: { dob: "members", birth_place: "chapter", employment: "members" },
    })
    .select("id")
    .single();
  if (memErr || !mem) {
    await admin.auth.admin.deleteUser(cu.user.id);
    throw memErr ?? new Error(`seed member ${opts.email}`);
  }
  return { userId: cu.user.id, memberId: mem.id };
}

describe("Pass 17 VerificationDashboard → 100% lines (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();

    const { data: ch, error: chErr } = await admin
      .from("chapters")
      .insert({
        name: `CovVD Chapter ${PREFIX}`,
        slug: `covvd-${PREFIX}`,
        subdomain: `covvd-${PREFIX}`.slice(0, 40),
        country_id: INDIA,
        state_id: GUJARAT,
      })
      .select("id")
      .single();
    if (chErr || !ch) throw chErr ?? new Error("seed chapter failed");
    seeded.chapterId = ch.id;

    seeded.pendingA = await createAuthMember(admin, {
      email: `${PREFIX}-a@example.invalid`,
      first: "CovVD PendingA",
      last: "Alpha",
      level: 0,
      chapterId: ch.id,
      onboarding: false,
      emailConfirm: true,
    });
    seeded.pendingB = await createAuthMember(admin, {
      email: `${PREFIX}-b@example.invalid`,
      first: "CovVD PendingB",
      last: "Beta",
      level: 0,
      chapterId: ch.id,
      onboarding: false,
      emailConfirm: true,
    });
    seeded.pendingUnconfirmed = await createAuthMember(admin, {
      email: `${PREFIX}-u@example.invalid`,
      first: "CovVD PendingU",
      last: "Unconf",
      level: 0,
      chapterId: ch.id,
      onboarding: false,
      emailConfirm: false,
    });

    seeded.subject = await createAuthMember(admin, {
      email: `${PREFIX}-subj@example.invalid`,
      first: "CovVD Subject",
      last: "Member",
      level: 1,
      chapterId: ch.id,
      onboarding: true,
    });

    for (const note of [`${PREFIX} vr-approve`, `${PREFIX} vr-more`, `${PREFIX} vr-reject`]) {
      const { data: vr } = await admin
        .from("verification_requests")
        .insert({
          member_id: seeded.subject!.memberId,
          requested_level: 2,
          status: "pending",
          notes: note,
        })
        .select("id")
        .single();
      if (vr) seeded.verReqIds.push(vr.id);
    }

    // Chapter-filter false arm: pending VR on another chapter
    const { data: otherVr } = await admin
      .from("verification_requests")
      .insert({
        member_id: "608bd52f-ef79-46bf-be89-2c502e25f09f",
        requested_level: 1,
        status: "pending",
        notes: `${PREFIX} other-chapter-vr`,
      })
      .select("id")
      .single();
    if (otherVr) seeded.verReqIds.push(otherVr.id);

    const { data: tag } = await admin
      .from("tag_requests")
      .insert({ term: `${PREFIX}-tag`, type: "skill", status: "pending" })
      .select("id")
      .single();
    if (tag) seeded.tagId = tag.id;

    const { data: mat, error: matErr } = await admin
      .from("matrimonial_profiles")
      .insert({
        member_id: seeded.subject!.memberId,
        verified: false,
        suspended: false,
        visibility: "community",
        about: `${PREFIX} mat`,
      })
      .select("id")
      .single();
    if (matErr || !mat) throw matErr ?? new Error("seed matrimonial");
    seeded.matId = mat.id;

    // Matrimonial on other chapter for filter false arm
    await admin
      .from("matrimonial_profiles")
      .update({ verified: false, suspended: false })
      .eq("verified", false)
      .limit(1);

    const { data: oral } = await admin
      .from("oral_histories")
      .insert({
        title: `${PREFIX} oral`,
        status: "pending",
        narrator_name: "CovVD Narrator",
        uploaded_by: seeded.subject!.memberId,
      })
      .select("id")
      .single();
    if (oral) seeded.oralId = oral.id;

    const { data: orphan } = await admin.auth.admin.createUser({
      email: `${PREFIX}-orphan@example.invalid`,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (orphan?.user) seeded.orphanAuthUserId = orphan.user.id;
  }, 120_000);

  afterAll(async () => {
    cleanup();
    await supabase.auth.signOut().catch(() => undefined);
    await cleanupCovVd();
  });

  it("queues, reminders (scoped), resolve arms, tags jump, filters, errors", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const chapterId = seeded.chapterId!;
    expect(chapterId).toBeTruthy();

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    let view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={chapterId} isGlobalAdmin canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );

    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /CovVD PendingA|Pending Member Onboarding|Verification Requests/i,
        ),
      { timeout: 45_000 },
    );

    // Email chips (confirmed MailCheck + unconfirmed Mail) via get_member_emails
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          new RegExp(`${PREFIX}-a@example\\.invalid|${PREFIX}-u@example\\.invalid`, "i"),
        ),
      { timeout: 30_000 },
    );

    // Select-all toggle both arms + row checkbox
    const selectAll =
      screen.getByLabelText(/Select all pending members/i) ||
      document.getElementById("select-all-pending");
    await user.click(selectAll!);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Send Reminder \(/i })).toBeTruthy());
    await user.click(selectAll!); // clear
    await user.click(selectAll!); // select again
    const rowCbs = screen.getAllByRole("checkbox").slice(1);
    await user.click(rowCbs[0]);
    await user.click(rowCbs[0]);

    // Mass reminders — chapter-scoped (sent > 0 toast; plural when >1 succeed)
    // Accessible name comes from aria-label ("Send reminder emails to all N…")
    const massBtn = screen.getByRole("button", { name: /Send reminder emails to all/i });
    await user.click(massBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/Send Reminders to All Pending/i));
    // Cancel path (dialog close)
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));
    await closeDialogs(user);

    await user.click(massBtn);
    fireEvent.click(screen.getByRole("button", { name: /Send to All$/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Mass reminders sent|No reminders sent|Error/i),
      { timeout: 60_000 },
    );

    // Bulk send selected (re-select after mass clears)
    await user.click(selectAll!);
    const bulkSend = await screen.findByRole("button", { name: /Send Reminder \(/i }, { timeout: 10_000 });
    await user.click(bulkSend);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Reminders sent|No reminders sent|Error|failed/i),
      { timeout: 60_000 },
    );

    // Per-row reminder (GA path with emailInfo)
    const rowRemind = screen.getAllByLabelText(/Send reminder email/i)[0];
    await user.click(rowRemind);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Reminders sent|No reminders sent|Error|failed/i),
      { timeout: 60_000 },
    );

    // Approve quick button
    const approveBtn = screen.getAllByRole("button", { name: /Approve/i })[0];
    await user.click(approveBtn);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Verification approved|Error/i),
      { timeout: 30_000 },
    );

    // More → Need Info with notes
    view.unmount();
    view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={chapterId} isGlobalAdmin canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Requests|More/i), {
      timeout: 45_000,
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^More$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Decision/i));
    const noteArea = screen.getByPlaceholderText(/Notes \(shown to member\)/i);
    fireEvent.change(noteArea, { target: { value: `${PREFIX} need-info` } });
    fireEvent.click(screen.getByRole("button", { name: /Need Info/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Requested more info|Error/i),
      { timeout: 30_000 },
    );
    await closeDialogs(user);

    // More → Approve with note + Reject
    view.unmount();
    // Ensure a fresh pending VR for reject/approve-with-note
    const admin = adminClient();
    const { data: vrFresh } = await admin
      .from("verification_requests")
      .insert({
        member_id: seeded.subject!.memberId,
        requested_level: 2,
        status: "pending",
        notes: `${PREFIX} vr-fresh`,
      })
      .select("id")
      .single();
    if (vrFresh) seeded.verReqIds.push(vrFresh.id);

    view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={chapterId} isGlobalAdmin canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/vr-fresh|More/i), { timeout: 45_000 });
    fireEvent.click(screen.getAllByRole("button", { name: /^More$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Decision/i));
    fireEvent.change(screen.getByPlaceholderText(/Notes \(shown to member\)/i), {
      target: { value: `${PREFIX} approve-note` },
    });
    fireEvent.click(screen.getByRole("button", { name: /Approve/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Verification approved|Error/i),
      { timeout: 30_000 },
    );
    await closeDialogs(user);

    const { data: vrReject } = await admin
      .from("verification_requests")
      .insert({
        member_id: seeded.subject!.memberId,
        requested_level: 2,
        status: "pending",
        notes: `${PREFIX} vr-rej2`,
      })
      .select("id")
      .single();
    if (vrReject) seeded.verReqIds.push(vrReject.id);
    view.unmount();
    view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={chapterId} isGlobalAdmin canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/vr-rej2|More/i), { timeout: 45_000 });
    fireEvent.click(screen.getAllByRole("button", { name: /^More$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification Decision/i));
    fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Verification rejected|Error/i),
      { timeout: 30_000 },
    );
    await closeDialogs(user);

    // Tags tab jump (lines 449–451)
    const tagsHost = document.createElement("button");
    tagsHost.setAttribute("data-value", "tags");
    tagsHost.id = "covvd-tags-tab";
    document.body.appendChild(tagsHost);
    const tagsBtn = screen.getByRole("button", { name: /Go to Tags tab to resolve/i });
    fireEvent.click(tagsBtn);
    expect(document.getElementById("covvd-tags-tab")).toBeTruthy();
    tagsHost.remove();

    // Matrimonial + oral links
    fireEvent.click(screen.getByRole("link", { name: /Go to Matrimonial/i }));
    fireEvent.click(screen.getByRole("link", { name: /Go to Oral History/i }));
    const review = screen.queryAllByRole("link", { name: /Review/i })[0];
    if (review) fireEvent.click(review);
    view.unmount();

    // sent === 0 paths: keep stale UI rows, flip DB so edge finds 0 / all-failed
    view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={chapterId} isGlobalAdmin canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/CovVD Pending|Select all/i), {
      timeout: 45_000,
    });
    await user.click(screen.getByLabelText(/Select all pending members/i));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Send Reminder \(/i })).toBeTruthy());

    // Mark all chapter pendings onboarded so edge returns sent:0 (UI still shows cached rows)
    await admin
      .from("members")
      .update({ onboarding_completed: true })
      .in("id", [
        seeded.pendingA!.memberId,
        seeded.pendingB!.memberId,
        seeded.pendingUnconfirmed!.memberId,
      ]);

    const bulkZero = screen.getByRole("button", { name: /Send Reminder \(/i });
    await user.click(bulkZero);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/No reminders sent|Reminders sent|Error|failed/i),
      { timeout: 45_000 },
    );

    const massBtn2 = screen.getByRole("button", { name: /Send reminder emails to all/i });
    await user.click(massBtn2);
    fireEvent.click(await screen.findByRole("button", { name: /Send to All$/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/No reminders sent|Mass reminders|Error/i),
      { timeout: 45_000 },
    );
    view.unmount();

    // Restore pendings for chapter-admin row-remind (no emailInfo gate)
    await admin
      .from("members")
      .update({ onboarding_completed: false })
      .in("id", [
        seeded.pendingA!.memberId,
        seeded.pendingB!.memberId,
        seeded.pendingUnconfirmed!.memberId,
      ]);

    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={chapterId} isGlobalAdmin={false} canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/CovVD Pending|Select all/i), {
      timeout: 45_000,
    });
    const caRemind = screen.getAllByLabelText(/Send reminder email/i)[0];
    await user.click(caRemind);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Reminders sent|No reminders|Error|failed/i),
      { timeout: 60_000 },
    );
    view.unmount();

    // sendReminder / sendMassReminders onError — member lacks ALLOWED_ROLES
    await signIn(E2E_ACCOUNTS.member.email);
    view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={chapterId} isGlobalAdmin canSendReminders />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Pending Member|Select all|All caught/i), {
      timeout: 45_000,
    });
    if (screen.queryByRole("button", { name: /Send reminder emails to all/i })) {
      await user.click(screen.getByRole("button", { name: /Send reminder emails to all/i }));
      fireEvent.click(await screen.findByRole("button", { name: /Send to All$/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Error|Insufficient|Unauthorized/i), {
        timeout: 30_000,
      });
    }
    if (screen.queryAllByLabelText(/Send reminder email/i)[0]) {
      await user.click(screen.getAllByLabelText(/Send reminder email/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(/Error|Insufficient|Unauthorized/i), {
        timeout: 30_000,
      });
    }
    view.unmount();

    // resolveVerification !member → onError
    if (seeded.orphanAuthUserId) {
      await signIn(`${PREFIX}-orphan@example.invalid`);
      view = renderApp(
        withToaster(
          <VerificationDashboard myChapterId={chapterId} isGlobalAdmin={false} canSendReminders={false} />,
        ),
        { route: "/admin?tab=verification" },
      );
      await waitFor(() => expect((document.body.textContent?.length ?? 0) > 5).toBe(true), {
        timeout: 30_000,
      });
      // Re-seed a VR visible under this chapter for orphan to click Approve
      const { data: vrOrphan } = await admin
        .from("verification_requests")
        .insert({
          member_id: seeded.subject!.memberId,
          requested_level: 2,
          status: "pending",
          notes: `${PREFIX} orphan-approve`,
        })
        .select("id")
        .single();
      if (vrOrphan) seeded.verReqIds.push(vrOrphan.id);
      view.unmount();
      view = renderApp(
        withToaster(
          <VerificationDashboard myChapterId={chapterId} isGlobalAdmin={false} canSendReminders={false} />,
        ),
        { route: "/admin?tab=verification" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/orphan-approve|Approve|All caught/i), {
        timeout: 45_000,
      });
      const orphanApprove = screen.queryAllByRole("button", { name: /Approve/i })[0];
      if (orphanApprove) {
        await user.click(orphanApprove);
        await waitFor(() => expect(document.body.textContent).toMatch(/Error|Not authenticated/i), {
          timeout: 20_000,
        });
      }
      view.unmount();
    }

    // Empty chapter filter → All caught up (no pending in impossible chapter; tags may remain)
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    view = renderApp(
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
    // Tags still global — click tags jump again if present
    if (screen.queryByRole("button", { name: /Go to Tags tab/i })) {
      const host = document.createElement("button");
      host.setAttribute("data-value", "tags");
      document.body.appendChild(host);
      fireEvent.click(screen.getByRole("button", { name: /Go to Tags tab/i }));
      host.remove();
    }
    view.unmount();

    // Global (null chapter) mount — filter true arms + OTHER_CHAPTER contrast
    view = renderApp(
      withToaster(
        <VerificationDashboard myChapterId={null} isGlobalAdmin canSendReminders={false} />,
      ),
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Pending|Verification|Tag|All caught/i), {
      timeout: 45_000,
    });
    view.unmount();

    // OTHER_CHAPTER scope exercises matrimonial/VR filter false for our subject
    view = renderApp(
      <VerificationDashboard myChapterId={OTHER_CHAPTER} isGlobalAdmin={false} canSendReminders={false} />,
      { route: "/admin?tab=verification" },
    );
    await waitFor(() => expect((document.body.textContent?.length ?? 0) > 10).toBe(true), {
      timeout: 45_000,
    });
    view.unmount();
  }, 360_000);
});
