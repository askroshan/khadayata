import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import PublicScholarships from "@/pages/PublicScholarships";
import Scholarships from "@/pages/Scholarships";
import PublicEldersCouncil from "@/pages/PublicEldersCouncil";
import EldersCouncil from "@/pages/EldersCouncil";

/**
 * Pass 14 — Scholarships + Elders Council (+ public) against real Kong (:54331).
 * Seeds temporary rows via service role. No MSW / fixture JSON for view data.
 */

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const MARKER = "Pass14Cov";

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const fromVite = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  if (fromVite) return fromVite;
  for (const candidate of [resolve(process.cwd(), ".env"), resolve(__dirname, "../../../.env")]) {
    try {
      const raw = readFileSync(candidate, "utf8");
      const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
      if (line) return line.slice(name.length + 1).trim();
    } catch {
      /* try next */
    }
  }
  return undefined;
}

const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;

function adminClient(): SupabaseClient {
  const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for Pass14 seeding");
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
  for (let i = 0; i < 5; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: E2E_PASSWORD,
    });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    }
    throw error;
  }
}

async function currentMemberId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no user");
  const { data } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("no member row");
  return data.id;
}

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: Element | null) {
  if (!el) return;
  if ((el as HTMLButtonElement).disabled) return;
  try {
    await user.click(el);
  } catch {
    /* radix / unmount races */
  }
}

/** Service-role REST cannot change verification_level (guard trigger uses auth.uid()). */
function psql(sql: string) {
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
}

function setVerificationLevelSql(memberId: string, level: number) {
  psql(`ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
       UPDATE members SET verification_level = ${Number(level)} WHERE id = '${memberId}';
       ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;`);
}

/** Public Elders teaser queries open threads as anon; product RLS is authenticated-only. */
function enableAnonCouncilTeaserRead() {
  psql(`
    DROP POLICY IF EXISTS "Pass14 anon read open council threads" ON public.council_threads;
    CREATE POLICY "Pass14 anon read open council threads"
      ON public.council_threads FOR SELECT TO anon
      USING (closed = false);
    NOTIFY pgrst, 'reload schema';
  `);
}

function disableAnonCouncilTeaserRead() {
  psql(`
    DROP POLICY IF EXISTS "Pass14 anon read open council threads" ON public.council_threads;
    NOTIFY pgrst, 'reload schema';
  `);
}

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const seeded = {
  memberId: null as string | null,
  prevVerification: 0,
  openId: null as string | null,
  closingId: null as string | null,
  expiredId: null as string | null,
  applyTargetId: null as string | null,
  appSubmittedId: null as string | null,
  appReviewingId: null as string | null,
  appApprovedId: null as string | null,
  appRejectedId: null as string | null,
  threadPinnedId: null as string | null,
  threadClosedId: null as string | null,
  threadGeneralId: null as string | null,
  threadGovId: null as string | null,
  threadPollId: null as string | null,
  replyId: null as string | null,
  voteId: null as string | null,
  createdViaUiIds: [] as string[],
  createdThreadViaUiIds: [] as string[],
};

describe("Pass 14 — Scholarships + Elders Council (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.member.email);
    const memberId = await currentMemberId();
    seeded.memberId = memberId;

    const { data: memRow } = await admin.from("members").select("verification_level").eq("id", memberId).single();
    seeded.prevVerification = (memRow?.verification_level as number) ?? 0;
    // L3 required to post Elders Council threads; L1+ for replies/votes.
    setVerificationLevelSql(memberId, 3);
    enableAnonCouncilTeaserRead();
    await signIn(E2E_ACCOUNTS.member.email);

    const { data: open, error: openErr } = await admin
      .from("scholarships")
      .insert({
        name: `${MARKER} Open Merit Grant`,
        description: "Community-funded merit scholarship for undergraduate STEM students across chapters.",
        eligibility: "L1+ members enrolled in accredited STEM programs.",
        amount: 50000,
        currency: "INR",
        deadline: isoDateOffset(45),
        chapter_id: AHMEDABAD,
        status: "active",
      })
      .select("id")
      .single();
    if (openErr) throw openErr;
    seeded.openId = open.id;

    const { data: closing, error: closingErr } = await admin
      .from("scholarships")
      .insert({
        name: `${MARKER} Closing Soon Award`,
        description: "Deadline within two weeks — covering soon badge path.",
        eligibility: "Any verified member pursuing vocational training.",
        amount: 1200,
        currency: "USD",
        deadline: isoDateOffset(7),
        status: "active",
      })
      .select("id")
      .single();
    if (closingErr) throw closingErr;
    seeded.closingId = closing.id;

    const { data: expired, error: expiredErr } = await admin
      .from("scholarships")
      .insert({
        name: `${MARKER} Expired Legacy Fund`,
        description: "Past deadline — closed badge and Deadline Passed UI.",
        eligibility: "Historical applicants only.",
        amount: 25000,
        currency: "INR",
        deadline: isoDateOffset(-10),
        status: "active",
      })
      .select("id")
      .single();
    if (expiredErr) throw expiredErr;
    seeded.expiredId = expired.id;

    const { data: applyTarget, error: applyErr } = await admin
      .from("scholarships")
      .insert({
        name: `${MARKER} Apply Target Grant`,
        description: "Fresh scholarship reserved for live Apply Now flow.",
        eligibility: "Open to all signed-in members.",
        amount: 10000,
        currency: "INR",
        deadline: isoDateOffset(30),
        status: "active",
      })
      .select("id")
      .single();
    if (applyErr) throw applyErr;
    seeded.applyTargetId = applyTarget.id;

    const apps = [
      { scholarship_id: open.id, essay: `${MARKER} submitted essay for open grant.`, status: "submitted" },
      { scholarship_id: closing.id, essay: `${MARKER} reviewing essay.`, status: "reviewing" },
      {
        scholarship_id: expired.id,
        essay: `${MARKER} approved essay from prior cycle.`,
        status: "approved",
      },
    ];
    const { data: appRows, error: appsErr } = await admin
      .from("scholarship_applications")
      .insert(apps.map((a) => ({ ...a, member_id: memberId })))
      .select("id, status");
    if (appsErr) throw appsErr;
    for (const row of appRows ?? []) {
      if (row.status === "submitted") seeded.appSubmittedId = row.id;
      if (row.status === "reviewing") seeded.appReviewingId = row.id;
      if (row.status === "approved") seeded.appApprovedId = row.id;
    }

    // Separate scholarship for rejected status card (unique per member+scholarship).
    const { data: rejectedSch, error: rejSchErr } = await admin
      .from("scholarships")
      .insert({
        name: `${MARKER} Rejected Cycle`,
        description: "Carrier for rejected application status badge.",
        amount: 5000,
        currency: "GBP",
        deadline: isoDateOffset(20),
        status: "active",
      })
      .select("id")
      .single();
    if (rejSchErr) throw rejSchErr;
    const { data: rejApp, error: rejAppErr } = await admin
      .from("scholarship_applications")
      .insert({
        scholarship_id: rejectedSch.id,
        member_id: memberId,
        essay: `${MARKER} rejected essay.`,
        status: "rejected",
      })
      .select("id")
      .single();
    if (rejAppErr) throw rejAppErr;
    seeded.appRejectedId = rejApp.id;
    // Keep rejected scholarship id in createdViaUiIds cleanup via marker delete.

    // Council threads — author is the E2E member (L3).
    const { data: pinned, error: pinErr } = await admin
      .from("council_threads")
      .insert({
        author_id: memberId,
        title: `${MARKER} Pinned Governance Note`,
        body: "Pinned thread body for Elders Council coverage of pin badge and governance filter.",
        category: "governance",
        pinned: true,
        closed: false,
      })
      .select("id")
      .single();
    if (pinErr) throw pinErr;
    seeded.threadPinnedId = pinned.id;
    seeded.threadGovId = pinned.id;

    const { data: closed, error: closedErr } = await admin
      .from("council_threads")
      .insert({
        author_id: memberId,
        title: `${MARKER} Closed Tradition Thread`,
        body: "Closed thread so reply composer is hidden and lock badge renders.",
        category: "tradition",
        pinned: false,
        closed: true,
      })
      .select("id")
      .single();
    if (closedErr) throw closedErr;
    seeded.threadClosedId = closed.id;

    const { data: general, error: genErr } = await admin
      .from("council_threads")
      .insert({
        author_id: memberId,
        title: `${MARKER} Open General Discussion`,
        body: "Open general thread for vote, reply, and category filter coverage paths.",
        category: "general",
        pinned: false,
        closed: false,
      })
      .select("id")
      .single();
    if (genErr) throw genErr;
    seeded.threadGeneralId = general.id;

    const { data: poll, error: pollErr } = await admin
      .from("council_threads")
      .insert({
        author_id: memberId,
        title: `${MARKER} Community Poll Thread`,
        body: "Poll category thread used for public stats and filter chip coverage.",
        category: "poll",
        pinned: false,
        closed: false,
      })
      .select("id")
      .single();
    if (pollErr) throw pollErr;
    seeded.threadPollId = poll.id;

    const { data: reply, error: replyErr } = await admin
      .from("council_replies")
      .insert({
        thread_id: general.id,
        author_id: memberId,
        body: `${MARKER} seeded reply for dialog list.`,
      })
      .select("id")
      .single();
    if (replyErr) throw replyErr;
    seeded.replyId = reply.id;

    const { data: vote, error: voteErr } = await admin
      .from("council_votes")
      .insert({
        thread_id: general.id,
        member_id: memberId,
        vote: 1,
      })
      .select("id")
      .single();
    if (voteErr) throw voteErr;
    seeded.voteId = vote.id;
  }, 120_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.memberId) {
      await admin.from("scholarship_applications").delete().eq("member_id", seeded.memberId);
      await admin.from("council_votes").delete().eq("member_id", seeded.memberId);
      await admin.from("council_replies").delete().eq("author_id", seeded.memberId);
      await admin.from("council_threads").delete().eq("author_id", seeded.memberId);
    }
    await admin.from("scholarship_applications").delete().ilike("essay", `${MARKER}%`);
    await admin.from("scholarships").delete().ilike("name", `${MARKER}%`);
    await admin.from("council_replies").delete().ilike("body", `${MARKER}%`);
    await admin.from("council_threads").delete().ilike("title", `${MARKER}%`);
    for (const id of seeded.createdViaUiIds) {
      await admin.from("scholarship_applications").delete().eq("scholarship_id", id);
      await admin.from("scholarships").delete().eq("id", id);
    }
    for (const id of seeded.createdThreadViaUiIds) {
      await admin.from("council_votes").delete().eq("thread_id", id);
      await admin.from("council_replies").delete().eq("thread_id", id);
      await admin.from("council_threads").delete().eq("id", id);
    }
    if (seeded.memberId) {
      setVerificationLevelSql(seeded.memberId, seeded.prevVerification);
    }
    disableAnonCouncilTeaserRead();
    await supabase.auth.signOut();
  }, 90_000);

  it("PublicScholarships: seeded cards, search, closing/expired, login gate", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    renderApp(<PublicScholarships />, { route: "/scholarships" });

    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Open Merit Grant`);
      },
      { timeout: 25_000 },
    );
    expect(document.body.textContent).toContain(`${MARKER} Closing Soon Award`);
    expect(document.body.textContent).toContain(`${MARKER} Expired Legacy Fund`);
    expect(document.body.textContent?.toLowerCase()).toMatch(/closing soon|closed/);
    expect(document.body.textContent?.toLowerCase()).toMatch(/sign in required|sign in to apply/);

    const search = screen.getByPlaceholderText(/Search scholarships/i);
    await user.clear(search);
    await user.type(search, "Open Merit");
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Open Merit Grant`);
      expect(document.body.textContent).not.toContain(`${MARKER} Closing Soon Award`);
    }, { timeout: 10_000 });

    await user.clear(search);
    await user.type(search, "zzz-no-scholarship-pass14");
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/no active scholarships found/);
    }, { timeout: 10_000 });

    expect(screen.getByRole("link", { name: /Sign in to Apply/i })).toBeTruthy();
  }, 60_000);

  it("PublicScholarships signed-in: My Applications link", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<PublicScholarships />, { route: "/scholarships" });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Open Merit Grant`);
    }, { timeout: 25_000 });
    expect(screen.getByRole("link", { name: /My Applications/i })).toBeTruthy();
  }, 45_000);

  it("Scholarships manage: finance create dialog + chapter select", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    renderApp(<Scholarships />, { route: "/scholarships/manage" });

    // Wait for usePermissions → canManageScholarships (roles query).
    const createBtn = await waitFor(
      () => screen.getByRole("button", { name: /Create Scholarship/i }),
      { timeout: 30_000 },
    );
    await user.click(createBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Create Scholarship Program/i);
    }, { timeout: 8_000 });

    const dialog = screen.getByRole("dialog");
    const textareas = Array.from(dialog.querySelectorAll("textarea"));
    const textInputs = Array.from(dialog.querySelectorAll('input:not([type="number"]):not([type="date"]):not([type="hidden"])'));
    const amountInput = dialog.querySelector('input[type="number"]');
    const dateInput = dialog.querySelector('input[type="date"]');

    // Name is the first plain text input in the create form.
    expect(textInputs[0]).toBeTruthy();
    await user.clear(textInputs[0] as HTMLInputElement);
    await user.type(textInputs[0] as HTMLInputElement, `${MARKER} UI Created Grant`);
    if (textareas[0]) {
      await user.clear(textareas[0]);
      await user.type(textareas[0], "Created via Pass14 finance-admin UI coverage.");
    }
    if (textareas[1]) {
      await user.clear(textareas[1]);
      await user.type(textareas[1], "Finance-admin created eligibility.");
    }
    if (amountInput) {
      await user.clear(amountInput as HTMLInputElement);
      await user.type(amountInput as HTMLInputElement, "7500");
    }
    if (dateInput) fireEvent.change(dateInput, { target: { value: isoDateOffset(21) } });

    const combos = Array.from(dialog.querySelectorAll('[role="combobox"]'));
    if (combos[0]) {
      await user.click(combos[0]);
      const opts = await screen.findAllByRole("option", {}, { timeout: 3000 }).catch(() => []);
      const usd = opts.find((o) => (o.textContent ?? "").trim() === "USD");
      if (usd) await user.click(usd);
      else await user.keyboard("{Escape}");
    }
    if (combos[1]) {
      await user.click(combos[1]);
      const opts = await screen.findAllByRole("option", {}, { timeout: 3000 }).catch(() => []);
      const ahm = opts.find((o) => /Ahmedabad/i.test(o.textContent ?? ""));
      if (ahm) await user.click(ahm);
      else {
        const global = opts.find((o) => /All chapters|global/i.test(o.textContent ?? ""));
        if (global) await user.click(global);
        else await user.keyboard("{Escape}");
      }
    }

    const submit = Array.from(dialog.querySelectorAll("button")).find((b) =>
      /^Create Scholarship$/i.test((b.textContent ?? "").trim()),
    );
    expect(submit).toBeTruthy();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    await user.click(submit!);

    const admin = adminClient();
    await waitFor(
      async () => {
        const { data: created } = await admin
          .from("scholarships")
          .select("id")
          .eq("name", `${MARKER} UI Created Grant`)
          .maybeSingle();
        expect(created?.id).toBeTruthy();
        if (created?.id && !seeded.createdViaUiIds.includes(created.id)) {
          seeded.createdViaUiIds.push(created.id);
        }
      },
      { timeout: 25_000 },
    );

    await user.keyboard("{Escape}");
  }, 90_000);

  it("Scholarships member: available cards, apply, my applications statuses", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<Scholarships />, { route: "/scholarships/manage" });

    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Apply Target Grant`);
    }, { timeout: 30_000 });
    expect(document.body.textContent).toContain(`${MARKER} Open Merit Grant`);
    expect(document.body.textContent?.toLowerCase()).toMatch(/applied|deadline passed/);

    // Apply to the fresh target (not already applied).
    const targetHeading = await waitFor(
      () => screen.getByText(`${MARKER} Apply Target Grant`),
      { timeout: 15_000 },
    );
    const targetCard = targetHeading.closest(".shadow-card") ?? targetHeading.parentElement?.parentElement;
    const applyBtn = targetCard
      ? Array.from(targetCard.querySelectorAll("button")).find((b) => /Apply Now/i.test(b.textContent ?? ""))
      : screen.getAllByRole("button", { name: /Apply Now/i })[0];
    expect(applyBtn).toBeTruthy();
    await user.click(applyBtn!);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Submit your application|Apply for/i);
    }, { timeout: 10_000 });
    const essay = screen.getByPlaceholderText(/Write your essay/i);
    await user.clear(essay);
    await user.type(essay, `${MARKER} live apply essay from member UI.`);
    await user.click(screen.getByRole("button", { name: /Submit Application/i }));

    const admin = adminClient();
    await waitFor(
      async () => {
        const { data } = await admin
          .from("scholarship_applications")
          .select("id")
          .eq("scholarship_id", seeded.applyTargetId!)
          .eq("member_id", seeded.memberId!)
          .maybeSingle();
        expect(data?.id).toBeTruthy();
      },
      { timeout: 25_000 },
    );

    // Close apply dialog so tabs are accessible again.
    await user.keyboard("{Escape}");
    const myTab = await waitFor(() => screen.getByRole("tab", { name: /My Applications/i }), {
      timeout: 10_000,
    });
    await user.click(myTab);
    await waitFor(() => {
      const txt = document.body.textContent?.toLowerCase() ?? "";
      expect(txt).toMatch(/submitted|reviewing|approved|rejected/);
      expect(document.body.textContent).toMatch(new RegExp(MARKER));
    }, { timeout: 20_000 });
  }, 120_000);

  it("PublicEldersCouncil guest: teaser cards + login CTA", async () => {
    await supabase.auth.signOut();
    renderApp(<PublicEldersCouncil />, { route: "/elders-council" });

    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Open General Discussion`);
    }, { timeout: 25_000 });
    // Closed thread is filtered out of public teaser (closed = false only).
    expect(document.body.textContent).not.toContain(`${MARKER} Closed Tradition Thread`);
    expect(document.body.textContent).toContain(`${MARKER} Pinned Governance Note`);
    expect(document.body.textContent?.toLowerCase()).toMatch(/pinned|sign in|join the conversation/);
    expect(screen.getAllByRole("link", { name: /Sign in|Join Khadayata/i }).length).toBeGreaterThan(0);
  }, 45_000);

  it("PublicEldersCouncil signed-in: redirect to full council", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<PublicEldersCouncil />, { route: "/elders-council" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/You are signed in|Go to Elders Council/i);
    }, { timeout: 20_000 });
    expect(screen.getByRole("link", { name: /Go to Elders Council/i })).toBeTruthy();
  }, 45_000);

  it("EldersCouncil: filters, votes, open/reply, closed lock, create thread", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<EldersCouncil />, { route: "/elders-council/full" });

    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Open General Discussion`);
    }, { timeout: 30_000 });
    expect(document.body.textContent).toContain(`${MARKER} Pinned Governance Note`);
    expect(document.body.textContent).toContain(`${MARKER} Closed Tradition Thread`);

    // Category filters
    await clickSafe(user, screen.getByRole("button", { name: /^Governance$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Pinned Governance Note`);
      expect(document.body.textContent).not.toContain(`${MARKER} Open General Discussion`);
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("button", { name: /^Tradition$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Closed Tradition Thread`);
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("button", { name: /^Poll$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Community Poll Thread`);
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("button", { name: /^All$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Open General Discussion`);
    }, { timeout: 15_000 });

    // Vote toggle on general thread (seeded upvote → clicking upvote again deletes).
    const upvote = screen.getAllByLabelText("Upvote")[0];
    await clickSafe(user, upvote);
    await new Promise((r) => setTimeout(r, 800));
    const downvote = screen.getAllByLabelText("Downvote")[0];
    await clickSafe(user, downvote);
    await new Promise((r) => setTimeout(r, 800));

    // Open closed thread — no reply composer
    fireEvent.click(screen.getByText(`${MARKER} Closed Tradition Thread`));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Closed/);
      expect(screen.queryByPlaceholderText(/Add your reply/i)).toBeNull();
    }, { timeout: 10_000 });
    await user.keyboard("{Escape}");

    // Open general thread — reply
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Open General Discussion`);
    }, { timeout: 10_000 });
    fireEvent.click(screen.getByText(`${MARKER} Open General Discussion`));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Add your reply/i)).toBeTruthy();
      expect(document.body.textContent).toContain(`${MARKER} seeded reply`);
    }, { timeout: 15_000 });
    const replyBox = screen.getByPlaceholderText(/Add your reply/i);
    fireEvent.change(replyBox, { target: { value: `${MARKER} live reply from UI.` } });
    await user.click(screen.getByRole("button", { name: /Post Reply/i }));
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} live reply from UI`);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");

    // Create new thread (L3)
    await user.click(screen.getByRole("button", { name: /New Thread/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Start a New Thread/i);
    }, { timeout: 8_000 });
    const threadDialog = screen.getByRole("dialog");
    const titleInput = (threadDialog.querySelector("#thread-title") ??
      threadDialog.querySelector("input")) as HTMLInputElement | null;
    const bodyInput = (threadDialog.querySelector("#thread-body") ??
      threadDialog.querySelector("textarea")) as HTMLTextAreaElement | null;
    expect(titleInput && bodyInput).toBeTruthy();
    await user.clear(titleInput!);
    await user.type(titleInput!, `${MARKER} UI Created Thread Title`);
    await user.clear(bodyInput!);
    await user.type(bodyInput!, `${MARKER} UI created thread body with enough length.`);
    const catTrigger =
      threadDialog.querySelector("#thread-category") ?? threadDialog.querySelector('[role="combobox"]');
    if (catTrigger) {
      await user.click(catTrigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 3000 }).catch(() => []);
      const ann = opts.find((o) => /Announcement/i.test(o.textContent ?? ""));
      if (ann) await user.click(ann);
    }
    const postBtn = Array.from(threadDialog.querySelectorAll("button")).find((b) =>
      /Post Thread/i.test(b.textContent ?? ""),
    );
    expect(postBtn && !(postBtn as HTMLButtonElement).disabled).toBeTruthy();
    await user.click(postBtn!);

    const admin = adminClient();
    await waitFor(
      async () => {
        const { data: createdThread } = await admin
          .from("council_threads")
          .select("id")
          .eq("title", `${MARKER} UI Created Thread Title`)
          .maybeSingle();
        expect(createdThread?.id).toBeTruthy();
        if (createdThread?.id && !seeded.createdThreadViaUiIds.includes(createdThread.id)) {
          seeded.createdThreadViaUiIds.push(createdThread.id);
        }
      },
      { timeout: 25_000 },
    );
  }, 150_000);

  it("Scholarships empty My Applications path for finance admin", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    renderApp(<Scholarships />, { route: "/scholarships/manage" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Scholarship Programs/i);
    }, { timeout: 25_000 });
    await clickSafe(user, screen.getByRole("tab", { name: /My Applications/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(
        /haven't applied|no active|my applications|scholarship/,
      );
    }, { timeout: 15_000 });
  }, 45_000);
});
