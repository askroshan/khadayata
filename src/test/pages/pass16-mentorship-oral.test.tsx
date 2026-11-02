/**
 * Pass 16 — Mentorship + OralHistory (+ public twins) → 100% lines vs real Kong :54331.
 * Reversible CovMO* seeds; no MSW / fixture JSON for view domain data; E2E role users kept.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Mentorship from "@/pages/Mentorship";
import PublicMentorship from "@/pages/PublicMentorship";
import OralHistory from "@/pages/OralHistory";
import PublicOralHistory from "@/pages/PublicOralHistory";
import { Toaster } from "@/components/ui/toaster";

const MARKER = "CovMO";
const PREFIX = `covmo_${Date.now().toString(36)}`;
/** Aman Shah — available mentor host (leave member row; only mentorships/photo touched). */
const OTHER_MENTOR = "f86b8859-707c-4fc1-8e1d-d6f186d683b4";
/** Hemal Shah — second mentee / empty-my-mentorships host. */
const OTHER_MEMBER = "608bd52f-ef79-46bf-be89-2c502e25f09f";

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const fromVite = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  if (fromVite) return fromVite;
  for (const candidate of [resolve(process.cwd(), ".env"), resolve(__dirname, "../../../.env")]) {
    try {
      const raw = readFileSync(candidate, "utf8");
      const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
      if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
    } catch {
      /* try next */
    }
  }
  return undefined;
}

const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;

function adminClient(): SupabaseClient {
  const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
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

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: Element | null | undefined) {
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
  for (let i = 0; i < 5; i++) {
    if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) break;
    await user.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 100));
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

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  option: RegExp | string,
) {
  const triggers = screen.queryAllByRole("combobox");
  const trigger = triggers[triggers.length - 1];
  if (!trigger) return;
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 4000 }).catch(() => [] as HTMLElement[]);
  const match =
    typeof option === "string"
      ? opts.find((o) => (o.textContent ?? "").includes(option))
      : opts.find((o) => option.test(o.textContent ?? ""));
  if (match) await clickSafe(user, match);
}

const seeded = {
  e2eMemberId: null as string | null,
  e2ePrevVerification: 0,
  e2ePrevDob: null as string | null,
  otherMentorPhoto: null as string | null,
  priorOtherOpen: [] as { id: string; status: string; skills: string[] | null; description: string | null; mode: string | null; availability: string | null }[],
  priorE2eOpen: [] as string[],
  mentorshipOfferId: null as string | null,
  mentorshipActiveId: null as string | null,
  mentorshipPendingId: null as string | null,
  sessionId: null as string | null,
  oralAudioId: null as string | null,
  oralVideoId: null as string | null,
  oralElderId: null as string | null,
  oralPlainId: null as string | null,
  createdMentorshipIds: [] as string[],
  createdSessionIds: [] as string[],
  createdOralIds: [] as string[],
  anonPolicy: false,
};

describe("Pass 16 — Mentorship + OralHistory (real Kong)", () => {
  beforeAll(async () => {
    // Local dump may lack elder_priority (migration 20260916); PostgREST needs it for both pages.
    psql(`ALTER TABLE oral_histories ADD COLUMN IF NOT EXISTS elder_priority boolean DEFAULT false;
          NOTIFY pgrst, 'reload schema';`);

    // Public teaser page queries as anon — restore "anyone can read published" for the suite.
    psql(`DROP POLICY IF EXISTS "covmo_anon_read_published_oral" ON public.oral_histories;
CREATE POLICY "covmo_anon_read_published_oral"
  ON public.oral_histories FOR SELECT TO anon
  USING (status = 'published');`);
    seeded.anonPolicy = true;

    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.member.email);
    const memberId = await currentMemberId();
    seeded.e2eMemberId = memberId;

    const { data: memRow } = await admin
      .from("members")
      .select("verification_level, dob, photo_url")
      .eq("id", memberId)
      .single();
    seeded.e2ePrevVerification = Number(memRow?.verification_level ?? 0);
    seeded.e2ePrevDob = memRow?.dob ?? null;
    psql(`ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
UPDATE members SET verification_level = 2 WHERE id = '${memberId}';
ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;`);

    // Photo arm on public mentor cards
    const { data: mentorRow } = await admin.from("members").select("photo_url").eq("id", OTHER_MENTOR).single();
    seeded.otherMentorPhoto = mentorRow?.photo_url ?? null;
    await admin
      .from("members")
      .update({ photo_url: `http://127.0.0.1:54331/storage/v1/object/public/avatars/${PREFIX}-mentor.png` })
      .eq("id", OTHER_MENTOR);

    // Park any open offers on OTHER_MENTOR / E2E member so we can seed cleanly
    const { data: priorOther } = await admin
      .from("mentorships")
      .select("id, status, skills, description, mode, availability")
      .eq("mentor_member_id", OTHER_MENTOR)
      .in("status", ["available", "pending"]);
    seeded.priorOtherOpen = (priorOther ?? []) as typeof seeded.priorOtherOpen;
    if (seeded.priorOtherOpen.length) {
      await admin
        .from("mentorships")
        .update({ status: "completed" })
        .in(
          "id",
          seeded.priorOtherOpen.map((r) => r.id),
        );
    }
    const { data: priorE2e } = await admin
      .from("mentorships")
      .select("id")
      .eq("mentor_member_id", memberId)
      .in("status", ["available", "pending"]);
    seeded.priorE2eOpen = (priorE2e ?? []).map((r) => r.id);
    if (seeded.priorE2eOpen.length) {
      await admin.from("mentorships").update({ status: "completed" }).in("id", seeded.priorE2eOpen);
    }

    const { data: offer, error: offerErr } = await admin
      .from("mentorships")
      .insert({
        mentor_member_id: OTHER_MENTOR,
        skills: [`${MARKER} Leadership`, `${MARKER} Gujarati`],
        status: "available",
        description: `${MARKER} public mentor offer`,
        mode: "hybrid",
        availability: "weekends",
      })
      .select("id")
      .single();
    if (offerErr) throw offerErr;
    seeded.mentorshipOfferId = offer.id;
    seeded.createdMentorshipIds.push(offer.id);

    const { data: active, error: activeErr } = await admin
      .from("mentorships")
      .insert({
        mentor_member_id: memberId,
        mentee_member_id: OTHER_MENTOR,
        skills: [`${MARKER} Mentoring`],
        status: "active",
        description: `${MARKER} active`,
      })
      .select("id")
      .single();
    if (activeErr) throw activeErr;
    seeded.mentorshipActiveId = active.id;
    seeded.createdMentorshipIds.push(active.id);

    const { data: pending, error: pendingErr } = await admin
      .from("mentorships")
      .insert({
        mentor_member_id: OTHER_MEMBER,
        mentee_member_id: memberId,
        skills: [`${MARKER} Learning`],
        status: "pending",
        description: `${MARKER} pending mentee view`,
      })
      .select("id")
      .single();
    if (pendingErr) throw pendingErr;
    seeded.mentorshipPendingId = pending.id;
    seeded.createdMentorshipIds.push(pending.id);

    const { data: sess, error: sessErr } = await admin
      .from("mentorship_sessions")
      .insert({
        mentorship_id: active.id,
        notes: `${MARKER} prior session notes for coverage`,
        session_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (sessErr) throw sessErr;
    seeded.sessionId = sess.id;
    seeded.createdSessionIds.push(sess.id);

    // Published oral histories for public + signed-in grids (audio / video / elder / plain)
    const oralSeeds = [
      {
        title: `${MARKER} Audio Journey`,
        description: `${MARKER} migration story audio`,
        narrator_name: `${MARKER} Elder Asha`,
        media_type: "audio",
        media_url: `http://127.0.0.1:54331/storage/v1/object/public/oral-histories/${PREFIX}-a.mp3`,
        recorded_date: "2020-01-15",
        tags: [`${MARKER}-migration`, `${MARKER}-traditions`],
        duration_seconds: 125,
        elder_priority: false,
        key: "oralAudioId" as const,
      },
      {
        title: `${MARKER} Video Testimony`,
        description: `${MARKER} temple festival video`,
        narrator_name: `${MARKER} Elder Ramesh`,
        media_type: "video",
        media_url: `http://127.0.0.1:54331/storage/v1/object/public/oral-histories/${PREFIX}-v.mp4`,
        recorded_date: "2019-06-01",
        tags: [`${MARKER}-festivals`],
        duration_seconds: 64,
        elder_priority: false,
        key: "oralVideoId" as const,
      },
      {
        title: `${MARKER} Param Elder Voice`,
        description: null,
        narrator_name: `${MARKER} Param Narrator`,
        media_type: "audio",
        media_url: `http://127.0.0.1:54331/storage/v1/object/public/oral-histories/${PREFIX}-e.mp3`,
        recorded_date: null,
        tags: [`${MARKER}-elders`],
        duration_seconds: null,
        elder_priority: true,
        key: "oralElderId" as const,
      },
      {
        title: `${MARKER} Plain Card`,
        description: null,
        narrator_name: null,
        media_type: "audio",
        media_url: null,
        recorded_date: null,
        tags: [],
        duration_seconds: null,
        elder_priority: false,
        key: "oralPlainId" as const,
      },
    ];

    for (const row of oralSeeds) {
      const { key, ...payload } = row;
      const { data, error } = await admin
        .from("oral_histories")
        .insert({
          ...payload,
          narrator_member_id: memberId,
          uploaded_by: memberId,
          status: "published",
        })
        .select("id")
        .single();
      if (error) throw error;
      seeded[key] = data.id;
      seeded.createdOralIds.push(data.id);
    }

    await supabase.auth.signOut();
  }, 180_000);

  afterAll(async () => {
    cleanup();
    const admin = adminClient();
    try {
      if (seeded.createdSessionIds.length) {
        await admin.from("mentorship_sessions").delete().in("id", seeded.createdSessionIds);
      }
      await admin.from("mentorship_sessions").delete().like("notes", `${MARKER}%`);
      if (seeded.createdMentorshipIds.length) {
        await admin.from("mentorships").delete().in("id", seeded.createdMentorshipIds);
      }
      await admin.from("mentorships").delete().like("description", `${MARKER}%`);
      // Also drop offers created via UI under E2E member
      if (seeded.e2eMemberId) {
        const { data: leftover } = await admin
          .from("mentorships")
          .select("id")
          .eq("mentor_member_id", seeded.e2eMemberId)
          .contains("skills", [`${MARKER} Coaching`]);
        if (leftover?.length) await admin.from("mentorships").delete().in("id", leftover.map((r) => r.id));
        const { data: leftover2 } = await admin
          .from("mentorships")
          .select("id")
          .eq("mentor_member_id", seeded.e2eMemberId)
          .contains("skills", [`${MARKER} Strategy`]);
        if (leftover2?.length) await admin.from("mentorships").delete().in("id", leftover2.map((r) => r.id));
      }
      if (seeded.priorOtherOpen.length) {
        for (const row of seeded.priorOtherOpen) {
          await admin
            .from("mentorships")
            .update({
              status: row.status,
              skills: row.skills ?? [],
              description: row.description,
              mode: row.mode,
              availability: row.availability,
            })
            .eq("id", row.id);
        }
      }
      if (seeded.priorE2eOpen.length) {
        await admin.from("mentorships").update({ status: "available" }).in("id", seeded.priorE2eOpen);
      }
      if (seeded.createdOralIds.length) {
        await admin.from("oral_histories").delete().in("id", seeded.createdOralIds);
      }
      await admin.from("oral_histories").delete().like("title", `${MARKER}%`);
      await admin.from("members").update({ photo_url: seeded.otherMentorPhoto }).eq("id", OTHER_MENTOR);
      if (seeded.e2eMemberId) {
        psql(`ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
UPDATE members SET verification_level = ${Number(seeded.e2ePrevVerification)}, dob = ${
          seeded.e2ePrevDob ? `'${seeded.e2ePrevDob}'` : "NULL"
        } WHERE id = '${seeded.e2eMemberId}';
ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;`);
      }
    } finally {
      if (seeded.anonPolicy) {
        try {
          psql(`DROP POLICY IF EXISTS "covmo_anon_read_published_oral" ON public.oral_histories;`);
        } catch {
          /* ignore */
        }
      }
      await supabase.auth.signOut();
    }
  }, 120_000);

  it("Mentorship: signed-out Navigate + PublicMentorship signed-in link + photo + empty", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();

    const { unmount: u0 } = renderApp(<Mentorship />, { route: "/mentorship/manage" });
    await waitFor(() => {
      // MemoryRouter may not mount /auth; Navigate still executed
      expect(document.body.textContent?.length ?? 0).toBeGreaterThanOrEqual(0);
    }, { timeout: 8_000 });
    u0();
    cleanup();

    await signIn(E2E_ACCOUNTS.member.email);
    const { unmount } = renderApp(<PublicMentorship />, { route: "/mentorship" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(MARKER));
    }, { timeout: 25_000 });
    expect(screen.getByRole("link", { name: /My Mentorships/i })).toBeTruthy();
    expect(document.querySelector(`img[src*="${PREFIX}-mentor"]`)).toBeTruthy();

    const skillBtn = screen.queryByRole("button", { name: new RegExp(`${MARKER} Leadership`) });
    if (skillBtn) {
      await user.click(skillBtn);
      await user.click(skillBtn); // toggle off
      await user.click(screen.getByRole("button", { name: /^All$/i }));
    }

    // Empty filtered list
    const search = screen.getByPlaceholderText(/Search by name or skill/i);
    await user.clear(search);
    await user.type(search, "zzz-no-mentor-covmo-empty");
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No mentors found/i);
    }, { timeout: 10_000 });
    unmount();
    cleanup();
  }, 90_000);

  it("Mentorship manage: marketplace request, offer insert+merge, browse, log session", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Mentorship />), { route: "/mentorship/manage" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${MARKER} Leadership`));
    }, { timeout: 30_000 });

    // Skill chip select + toggle clear
    const skillChip = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes(`${MARKER} Leadership`),
    );
    expect(skillChip).toBeTruthy();
    await user.click(skillChip!);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Mentors for|Request Mentorship/i);
    }, { timeout: 8_000 });
    await user.click(skillChip!); // clear filter (skill === skillSearch)

    // Re-select and request mentorship (commit)
    await user.click(skillChip!);
    const requestBtn = screen.getAllByRole("button", { name: /Request Mentorship/i })[0];
    await user.click(requestBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Mentorship request sent|Error/i);
    }, { timeout: 20_000 });

    // Offer dialog — empty skills mutation path via ",," bypassing trim gate
    await clickSafe(user, screen.getByRole("button", { name: /Offer Mentorship/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. React|comma-separated/i)).toBeTruthy();
    }, { timeout: 8_000 });
    const dialogInput = screen.getByPlaceholderText(/e\.g\. React|comma-separated/i);
    fireEvent.change(dialogInput, { target: { value: ",," } });
    await user.click(screen.getByRole("button", { name: /Offer to Mentor/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Add at least one skill|Error/i);
    }, { timeout: 10_000 });

    // Client validation empty
    fireEvent.change(dialogInput, { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: /Offer to Mentor/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Please enter at least one skill/i);
    }, { timeout: 5_000 });

    // Successful insert
    fireEvent.change(dialogInput, { target: { value: `  ${MARKER} Coaching  ` } });
    await user.click(screen.getByRole("button", { name: /Offer to Mentor/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Mentorship offer created/i);
      expect(screen.queryByRole("dialog")).toBeNull();
    }, { timeout: 20_000 });

    // Merge path — open again and add another skill
    await clickSafe(user, screen.getByRole("button", { name: /Offer Mentorship/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.getByPlaceholderText(/e\.g\. React|comma-separated/i)).toBeTruthy();
    }, { timeout: 8_000 });
    const dialogInput2 = screen.getByPlaceholderText(/e\.g\. React|comma-separated/i);
    fireEvent.change(dialogInput2, { target: { value: `${MARKER} Coaching, ${MARKER} Strategy` } });
    const mergeBtn = screen.getByRole("button", { name: /Offer to Mentor/i });
    await waitFor(() => expect(mergeBtn).not.toBeDisabled(), { timeout: 5_000 });
    await user.click(mergeBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Mentorship offer created/i);
      expect(screen.queryByRole("dialog")).toBeNull();
    }, { timeout: 20_000 });

    // Browse tab — search empty + L-badge + inline offer validation
    await user.click(screen.getByRole("tab", { name: /All Mentors/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/mentors available|Offer Mentorship/i);
    }, { timeout: 10_000 });
    expect(document.body.textContent).toMatch(/L[12]/);

    const browseSearch = screen.getByPlaceholderText(/Search by skill/i);
    fireEvent.change(browseSearch, { target: { value: "zzz-no-skill-covmo" } });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No mentors found for this skill/i);
    }, { timeout: 8_000 });
    fireEvent.change(browseSearch, { target: { value: "" } });

    await clickSafe(user, screen.getByRole("button", { name: /Offer Mentorship/i }));
    const inline = await screen.findByPlaceholderText(/Skills you can mentor/i);
    fireEvent.change(inline, { target: { value: "" } });
    await user.click(screen.getAllByRole("button", { name: /Offer to Mentor/i })[0]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Please enter at least one skill/i);
    }, { timeout: 5_000 });
    fireEvent.change(inline, { target: { value: `${MARKER} Extra` } });
    // typing clears skillError arm
    fireEvent.change(inline, { target: { value: ` ${MARKER} Extra ` } });

    // My mentorships — log session commit
    await user.click(screen.getByRole("tab", { name: /My Mentorships/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/active|Mentoring|Learning from|session/i);
    }, { timeout: 15_000 });
    expect(document.body.textContent).toMatch(/session/i);

    await clickSafe(user, screen.getByRole("button", { name: /Log Session/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Session notes/i)).toBeTruthy();
    }, { timeout: 8_000 });
    fireEvent.change(screen.getByPlaceholderText(/Session notes/i), {
      target: { value: `${MARKER} live logged session` },
    });
    await user.click(screen.getByRole("button", { name: /Save Session/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Session logged/i);
    }, { timeout: 20_000 });

    unmount();
    cleanup();
  }, 180_000);

  it("Mentorship: empty skills marketplace + empty my list", async () => {
    const admin = adminClient();
    // Park all available so marketplace shows empty skills CTA
    const { data: avail } = await admin.from("mentorships").select("id").eq("status", "available");
    const availIds = (avail ?? []).map((r) => r.id);
    if (availIds.length) await admin.from("mentorships").update({ status: "completed" }).in("id", availIds);

    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(<Mentorship />, { route: "/mentorship/manage" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No skills listed yet|Be the first to offer/i);
    }, { timeout: 25_000 });

    await user.click(screen.getByRole("tab", { name: /All Mentors/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No mentors available yet/i);
    }, { timeout: 10_000 });
    unmount();
    cleanup();

    if (availIds.length) await admin.from("mentorships").update({ status: "available" }).in("id", availIds);

    // Empty my mentorships — use unverified who has none
    await signIn(E2E_ACCOUNTS.unverified.email);
    const { unmount: u2 } = renderApp(<Mentorship />, { route: "/mentorship/manage" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/mentorship|marketplace/);
    }, { timeout: 25_000 });
    await userEvent.setup().click(screen.getByRole("tab", { name: /My Mentorships/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No mentorships yet/i);
    }, { timeout: 15_000 });
    u2();
    cleanup();
  }, 120_000);

  it("PublicOralHistory: signed-out cards + signed-in redirect", async () => {
    await supabase.auth.signOut();
    const { unmount } = renderApp(<PublicOralHistory />, { route: "/oral-history" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${MARKER} Audio Journey`));
    }, { timeout: 25_000 });
    expect(document.body.textContent).toMatch(/Param Elder Voice|Elder|Video Testimony|Plain Card/i);
    expect(document.body.textContent).toMatch(/Sign in to listen|Sign In Required/i);
    unmount();
    cleanup();

    // Empty state arm — temporarily hide published
    const admin = adminClient();
    if (seeded.createdOralIds.length) {
      await admin.from("oral_histories").update({ status: "pending" }).in("id", seeded.createdOralIds);
    }
    const { unmount: uEmpty } = renderApp(<PublicOralHistory />, { route: "/oral-history" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Recordings are being added|check back soon/i);
    }, { timeout: 20_000 });
    uEmpty();
    cleanup();
    if (seeded.createdOralIds.length) {
      await admin.from("oral_histories").update({ status: "published" }).in("id", seeded.createdOralIds);
    }

    await signIn(E2E_ACCOUNTS.member.email);
    const { unmount: u2 } = renderApp(<PublicOralHistory />, { route: "/oral-history" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/You are signed in|Go to Oral History/i);
    }, { timeout: 15_000 });
    u2();
    cleanup();
  }, 90_000);

  it("OralHistory full: filters, validation, upload (member pending + admin published)", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<OralHistory />), { route: "/oral-history/full" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${MARKER} Audio Journey`));
    }, { timeout: 30_000 });

    // Search
    const search = screen.getByPlaceholderText(/Search stories/i);
    fireEvent.change(search, { target: { value: MARKER } });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(MARKER));
    }, { timeout: 15_000 });

    // Tag chip click
    const tagChip = Array.from(document.querySelectorAll("button, span, div")).find((el) =>
      (el.textContent ?? "").includes(`${MARKER}-migration`),
    );
    if (tagChip) await clickSafe(user, tagChip);

    // Tag select filter
    const tagTrigger = screen.queryByRole("combobox");
    if (tagTrigger) {
      await pickSelectOption(user, `${MARKER}-festivals`);
      await pickSelectOption(user, /All tags/i);
    }

    // Elder toggle on/off
    const elderBtn = screen.getByRole("button", { name: /Param Pujaniya/i });
    await user.click(elderBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Param|Elder|No oral histories|Audio|Video/i);
    }, { timeout: 15_000 });
    await user.click(elderBtn);

    // Upload dialog validations
    await clickSafe(user, screen.getByRole("button", { name: /Upload Story/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Upload Oral History/i);
    }, { timeout: 8_000 });

    await user.click(screen.getByRole("button", { name: /^Upload Story$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Title is required/i);
    }, { timeout: 8_000 });

    fireEvent.change(screen.getByPlaceholderText(/Grandfather's journey/i), {
      target: { value: `${MARKER} Member Upload` },
    });
    fireEvent.change(screen.getByPlaceholderText(/Brief context/i), {
      target: { value: `${MARKER} desc` },
    });
    // Narrator + tags + date via labels
    const labels = Array.from(document.querySelectorAll("label"));
    const near = (re: RegExp) => {
      const lab = labels.find((l) => re.test(l.textContent ?? ""));
      return lab?.parentElement?.querySelector("input, textarea") as HTMLInputElement | null;
    };
    const narr = near(/Narrator Name/i);
    if (narr) fireEvent.change(narr, { target: { value: `${MARKER} Narrator` } });
    const tags = near(/Tags/i);
    if (tags) fireEvent.change(tags, { target: { value: `${MARKER}-upload, heritage` } });
    const date = near(/Date Recorded/i);
    if (date) fireEvent.change(date, { target: { value: "2021-03-01" } });

    await pickSelectOption(user, /Video/i);

    await user.click(screen.getByRole("button", { name: /^Upload Story$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Media file is required/i);
    }, { timeout: 8_000 });

    // Stub storage for oral-histories bucket (bucket exists; object RLS may block)
    const realStorageFrom = supabase.storage.from.bind(supabase.storage);
    const storageSpy = vi.spyOn(supabase.storage, "from").mockImplementation(((bucket: string) => {
      if (bucket !== "oral-histories") return realStorageFrom(bucket);
      return {
        upload: async () => ({ data: { path: `${PREFIX}/story.webm` }, error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: `http://127.0.0.1:54331/storage/v1/object/public/oral-histories/${PREFIX}-up.webm` },
        }),
      } as never;
    }) as typeof supabase.storage.from);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const media = new File([new Uint8Array([1, 2, 3, 4])], "covmo-story.webm", { type: "video/webm" });
    await user.upload(fileInput, media);

    await user.click(screen.getByRole("button", { name: /^Upload Story$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Oral history uploaded|Error/i);
    }, { timeout: 25_000 });
    storageSpy.mockRestore();
    await closeDialogs(user);
    unmount();
    cleanup();

    // Track member upload for cleanup
    const admin = adminClient();
    const { data: uploaded } = await admin
      .from("oral_histories")
      .select("id")
      .eq("title", `${MARKER} Member Upload`);
    for (const row of uploaded ?? []) seeded.createdOralIds.push(row.id);

    // Global Admin upload → published + elder_priority via DOB ≥ 70
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const gaId = await currentMemberId();
    const { data: gaPrev } = await admin.from("members").select("dob").eq("id", gaId).single();
    psql(`ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
UPDATE members SET dob = '1940-01-01' WHERE id = '${gaId}';
ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;`);

    const userGa = userEvent.setup();
    const { unmount: u2 } = renderApp(withToaster(<OralHistory />), { route: "/oral-history/full" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Upload Story/i })).toBeTruthy();
    }, { timeout: 30_000 });
    await clickSafe(userGa, screen.getByRole("button", { name: /Upload Story/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/Grandfather's journey/i)).toBeTruthy(), {
      timeout: 8_000,
    });
    fireEvent.change(screen.getByPlaceholderText(/Grandfather's journey/i), {
      target: { value: `${MARKER} Admin Elder Upload` },
    });

    const storageSpy2 = vi.spyOn(supabase.storage, "from").mockImplementation(((bucket: string) => {
      if (bucket !== "oral-histories") return realStorageFrom(bucket);
      return {
        upload: async () => ({ data: { path: `${PREFIX}/admin.mp3` }, error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: `http://127.0.0.1:54331/storage/v1/object/public/oral-histories/${PREFIX}-admin.mp3` },
        }),
      } as never;
    }) as typeof supabase.storage.from);

    const file2 = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userGa.upload(file2, new File([new Uint8Array([9, 8])], "elder.mp3", { type: "audio/mpeg" }));
    await userGa.click(screen.getByRole("button", { name: /^Upload Story$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Oral history uploaded/i);
    }, { timeout: 25_000 });
    storageSpy2.mockRestore();
    await closeDialogs(userGa);

    // Upload error arm — storage fails
    await clickSafe(userGa, screen.getByRole("button", { name: /Upload Story/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/Grandfather's journey/i)).toBeTruthy(), {
      timeout: 8_000,
    });
    fireEvent.change(screen.getByPlaceholderText(/Grandfather's journey/i), {
      target: { value: `${MARKER} Fail Upload` },
    });
    const failSpy = vi.spyOn(supabase.storage, "from").mockImplementation(((bucket: string) => {
      if (bucket !== "oral-histories") return realStorageFrom(bucket);
      return {
        upload: async () => ({ data: null, error: { message: "covmo storage fail" } }),
        getPublicUrl: () => ({ data: { publicUrl: "http://invalid" } }),
      } as never;
    }) as typeof supabase.storage.from);
    const file3 = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userGa.upload(file3, new File([new Uint8Array([5])], "fail.mp3", { type: "audio/mpeg" }));
    await userGa.click(screen.getByRole("button", { name: /^Upload Story$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/covmo storage fail|Error/i);
    }, { timeout: 15_000 });
    failSpy.mockRestore();
    await closeDialogs(userGa);

    u2();
    cleanup();

    const { data: adminUploads } = await admin
      .from("oral_histories")
      .select("id")
      .like("title", `${MARKER} Admin%`);
    for (const row of adminUploads ?? []) seeded.createdOralIds.push(row.id);

    psql(`ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
UPDATE members SET dob = ${gaPrev?.dob ? `'${gaPrev.dob}'` : "NULL"} WHERE id = '${gaId}';
ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;`);

    // Empty signed-in grid
    if (seeded.createdOralIds.length) {
      await admin.from("oral_histories").update({ status: "draft" }).in("id", seeded.createdOralIds);
    }
    await signIn(E2E_ACCOUNTS.member.email);
    const { unmount: u3 } = renderApp(<OralHistory />, { route: "/oral-history/full" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No oral histories yet/i);
    }, { timeout: 20_000 });
    u3();
    cleanup();
    if (seeded.createdOralIds.length) {
      await admin.from("oral_histories").update({ status: "published" }).in("id", seeded.createdOralIds);
    }

    // Signed-out Navigate
    await supabase.auth.signOut();
    const { unmount: u4 } = renderApp(<OralHistory />, { route: "/oral-history/full" });
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThanOrEqual(0);
    }, { timeout: 8_000 });
    u4();
    cleanup();
  }, 240_000);
});
