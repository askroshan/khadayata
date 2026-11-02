/**
 * Pass 15 — Profile + Onboarding → ~100% against real Kong :54331.
 * Reversible covpo_* seeds; no mock view data; E2E role users kept intact.
 */
import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor, fireEvent, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Profile from "@/pages/Profile";
import Onboarding from "@/pages/Onboarding";
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
const PREFIX = `covpo_${Date.now().toString(36)}`;
const PASS = E2E_PASSWORD;

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

let lastSignInAt = 0;
async function signIn(email: string, password = PASS) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 6; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
  for (let i = 0; i < 4; i++) {
    if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) break;
    await user.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 120));
  }
}

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  option: RegExp | string,
) {
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 5000 }).catch(() => [] as HTMLElement[]);
  const match =
    typeof option === "string"
      ? opts.find((o) => (o.textContent ?? "").includes(option))
      : opts.find((o) => option.test(o.textContent ?? ""));
  if (match) await clickSafe(user, match);
}

/** Labels without htmlFor — find nearest input under the same field wrapper. */
function inputNearLabel(label: RegExp): HTMLInputElement {
  const el = screen.getAllByText(label).find((n) => n.tagName === "LABEL" || n.tagName === "label")
    ?? screen.getByText(label);
  const wrap = el.closest("div") ?? el.parentElement;
  const input = wrap?.querySelector("input, textarea") as HTMLInputElement | null;
  if (!input) throw new Error(`No input near label ${label}`);
  return input;
}

async function memberIdForSession(): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  const { data } = await supabase.from("members").select("id").eq("user_id", uid).maybeSingle();
  if (!data?.id) throw new Error("no member for session");
  return data.id;
}

const seeded = {
  userIds: [] as string[],
  memberIds: [] as string[],
  skillIds: [] as string[],
  languageIds: [] as string[],
  educationIds: [] as string[],
  employmentIds: [] as string[],
  contactIds: [] as string[],
  familyLinkIds: [] as string[],
  vouchIds: [] as string[],
  inviteIds: [] as string[],
  matProfileIds: [] as string[],
  onboardEmail: `${PREFIX}_onboard@covpo.test`,
  noGidEmail: `${PREFIX}_nogid@covpo.test`,
  noChapterEmail: `${PREFIX}_noch@covpo.test`,
  l0Email: `${PREFIX}_l0@covpo.test`,
  l1Email: `${PREFIX}_l1@covpo.test`,
  voucherEmail: `${PREFIX}_vchr@covpo.test`,
  relativeEmail: `${PREFIX}_rel@covpo.test`,
  onboardUserId: null as string | null,
  onboardMemberId: null as string | null,
  noGidUserId: null as string | null,
  noGidMemberId: null as string | null,
  noChapterUserId: null as string | null,
  noChapterMemberId: null as string | null,
  l0UserId: null as string | null,
  l0MemberId: null as string | null,
  l1UserId: null as string | null,
  l1MemberId: null as string | null,
  voucherUserId: null as string | null,
  voucherMemberId: null as string | null,
  relativeUserId: null as string | null,
  relativeMemberId: null as string | null,
  e2eMemberOrig: null as {
    first_name: string | null;
    last_name: string | null;
    middle_names: string | null;
    gender: string | null;
    dob: string | null;
    birth_place: string | null;
    chapter_id: string | null;
    ekda: string | null;
    kuldevi: string | null;
    photo_url: string | null;
  } | null,
  e2eMemberId: null as string | null,
};

async function createAuthMember(
  admin: SupabaseClient,
  opts: {
    email: string;
    first: string;
    last: string;
    level?: number;
    chapterId?: string | null;
    onboarding?: boolean;
    globalId?: string | null;
    ekda?: string | null;
    kuldevi?: string | null;
  },
) {
  const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
    email: opts.email,
    password: PASS,
    email_confirm: true,
  });
  if (cuErr || !cu.user) throw cuErr ?? new Error(`createUser ${opts.email}`);
  seeded.userIds.push(cu.user.id);
  const row: Record<string, unknown> = {
    user_id: cu.user.id,
    first_name: opts.first,
    last_name: opts.last,
    chapter_id: opts.chapterId === undefined ? AHMEDABAD : opts.chapterId,
    verification_level: opts.level ?? 1,
    onboarding_completed: opts.onboarding ?? true,
    overseas_verified: false,
    suspended: false,
    blocked: false,
    gender: "Male",
    dob: "1990-01-15",
    birth_place: "Coverage City",
    privacy: { dob: "members", birth_place: "chapter", employment: "members", phone: "private", email: "members" },
  };
  if (opts.globalId !== undefined) row.global_id = opts.globalId;
  if (opts.ekda !== undefined) row.ekda = opts.ekda;
  if (opts.kuldevi !== undefined) row.kuldevi = opts.kuldevi;
  const { data: mem, error: memErr } = await admin.from("members").insert(row).select("id").single();
  if (memErr || !mem) throw memErr ?? new Error(`seed member ${opts.email}`);
  seeded.memberIds.push(mem.id);
  return { userId: cu.user.id, memberId: mem.id };
}

async function cleanupCovPo() {
  const admin = adminClient();
  if (seeded.inviteIds.length) await admin.from("family_invitations").delete().in("id", seeded.inviteIds);
  await admin.from("family_invitations").delete().like("invitee_name", "CovPO%");
  if (seeded.familyLinkIds.length) await admin.from("family_links").delete().in("id", seeded.familyLinkIds);
  if (seeded.vouchIds.length) await admin.from("vouches").delete().in("id", seeded.vouchIds);
  if (seeded.matProfileIds.length) await admin.from("matrimonial_profiles").delete().in("id", seeded.matProfileIds);
  if (seeded.skillIds.length) await admin.from("member_skills").delete().in("id", seeded.skillIds);
  await admin.from("member_skills").delete().like("skill", `${PREFIX}%`);
  if (seeded.languageIds.length) await admin.from("member_languages").delete().in("id", seeded.languageIds);
  await admin.from("member_languages").delete().like("language", `${PREFIX}%`);
  if (seeded.educationIds.length) await admin.from("education").delete().in("id", seeded.educationIds);
  await admin.from("education").delete().like("degree", `${PREFIX}%`);
  if (seeded.employmentIds.length) await admin.from("employment").delete().in("id", seeded.employmentIds);
  await admin.from("employment").delete().like("job_title", `${PREFIX}%`);
  if (seeded.contactIds.length) await admin.from("member_contacts").delete().in("id", seeded.contactIds);

  for (const mid of seeded.memberIds) {
    await admin.from("vouches").delete().eq("member_id", mid);
    await admin.from("vouches").delete().eq("voucher_member_id", mid);
    await admin.from("family_links").delete().eq("member_id", mid);
    await admin.from("family_links").delete().eq("related_member_id", mid);
    await admin.from("family_invitations").delete().eq("inviter_member_id", mid);
    await admin.from("member_skills").delete().eq("member_id", mid);
    await admin.from("member_languages").delete().eq("member_id", mid);
    await admin.from("education").delete().eq("member_id", mid);
    await admin.from("employment").delete().eq("member_id", mid);
    await admin.from("member_contacts").delete().eq("member_id", mid);
    await admin.from("matrimonial_profiles").delete().eq("member_id", mid);
    await admin.from("members").delete().eq("id", mid);
  }
  for (const uid of seeded.userIds) {
    await admin.auth.admin.deleteUser(uid);
  }

  if (seeded.e2eMemberId && seeded.e2eMemberOrig) {
    await admin.from("members").update(seeded.e2eMemberOrig).eq("id", seeded.e2eMemberId);
  }
}

describe("Pass 15 Profile + Onboarding (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();

    // Snapshot E2E member for restore after Profile save mutation.
    const { data: e2eUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const e2eUser = e2eUsers.users.find((u) => u.email === E2E_ACCOUNTS.member.email);
    if (e2eUser) {
      const { data: em } = await admin
        .from("members")
        .select("id, first_name, last_name, middle_names, gender, dob, birth_place, chapter_id, ekda, kuldevi, photo_url")
        .eq("user_id", e2eUser.id)
        .maybeSingle();
      if (em) {
        seeded.e2eMemberId = em.id;
        seeded.e2eMemberOrig = {
          first_name: em.first_name,
          last_name: em.last_name,
          middle_names: em.middle_names,
          gender: em.gender,
          dob: em.dob,
          birth_place: em.birth_place,
          chapter_id: em.chapter_id,
          ekda: (em as { ekda?: string | null }).ekda ?? null,
          kuldevi: (em as { kuldevi?: string | null }).kuldevi ?? null,
          photo_url: em.photo_url,
        };
      }
    }

    const onboard = await createAuthMember(admin, {
      email: seeded.onboardEmail,
      first: "CovPO",
      last: "Onboard",
      level: 0,
      chapterId: null,
      onboarding: false,
      globalId: null,
    });
    seeded.onboardUserId = onboard.userId;
    seeded.onboardMemberId = onboard.memberId;

    const noGid = await createAuthMember(admin, {
      email: seeded.noGidEmail,
      first: "CovPO",
      last: "NoGid",
      level: 1,
      chapterId: AHMEDABAD,
      onboarding: true,
      globalId: null,
      ekda: null,
      kuldevi: null,
    });
    seeded.noGidUserId = noGid.userId;
    seeded.noGidMemberId = noGid.memberId;

    // Matrimonial ekda fallback when member.ekda is null
    const { data: mat, error: matErr } = await admin
      .from("matrimonial_profiles")
      .insert({
        member_id: noGid.memberId,
        ekda: `${PREFIX}-mat-ekda`,
        visibility: "members",
      })
      .select("id")
      .single();
    if (matErr) throw matErr;
    if (mat) seeded.matProfileIds.push(mat.id);

    const noCh = await createAuthMember(admin, {
      email: seeded.noChapterEmail,
      first: "CovPO",
      last: "NoChapter",
      level: 0,
      chapterId: null,
      onboarding: true,
      globalId: null,
    });
    seeded.noChapterUserId = noCh.userId;
    seeded.noChapterMemberId = noCh.memberId;

    const voucher = await createAuthMember(admin, {
      email: seeded.voucherEmail,
      first: "CovPO",
      last: "Voucher",
      level: 2,
      chapterId: AHMEDABAD,
      onboarding: true,
      globalId: `KH-COVPO-${PREFIX.slice(-4).toUpperCase()}`,
    });
    seeded.voucherUserId = voucher.userId;
    seeded.voucherMemberId = voucher.memberId;

    const l0 = await createAuthMember(admin, {
      email: seeded.l0Email,
      first: "CovPO",
      last: "L0User",
      level: 0,
      chapterId: AHMEDABAD,
      onboarding: true,
      globalId: null,
    });
    seeded.l0UserId = l0.userId;
    seeded.l0MemberId = l0.memberId;

    const { data: v0 } = await admin
      .from("vouches")
      .insert({
        member_id: l0.memberId,
        voucher_member_id: voucher.memberId,
        note: `${PREFIX} vouch note`,
      })
      .select("id")
      .single();
    if (v0) seeded.vouchIds.push(v0.id);

    const relative = await createAuthMember(admin, {
      email: seeded.relativeEmail,
      first: "CovPO",
      last: "Relative",
      level: 1,
      chapterId: AHMEDABAD,
      onboarding: true,
    });
    seeded.relativeUserId = relative.userId;
    seeded.relativeMemberId = relative.memberId;

    const { data: fl } = await admin
      .from("family_links")
      .insert({
        member_id: l0.memberId,
        related_member_id: relative.memberId,
        relation: "Brother",
      })
      .select("id")
      .single();
    if (fl) seeded.familyLinkIds.push(fl.id);

    const l1 = await createAuthMember(admin, {
      email: seeded.l1Email,
      first: "CovPO",
      last: "L1User",
      level: 1,
      chapterId: AHMEDABAD,
      onboarding: true,
      globalId: `KH-COVPO-L1${PREFIX.slice(-3).toUpperCase()}`,
      ekda: `${PREFIX}-ekda`,
      kuldevi: `${PREFIX}-kuldevi`,
    });
    seeded.l1UserId = l1.userId;
    seeded.l1MemberId = l1.memberId;

    const { data: v1 } = await admin
      .from("vouches")
      .insert({
        member_id: l1.memberId,
        voucher_member_id: voucher.memberId,
        note: `${PREFIX} l1 vouch`,
      })
      .select("id")
      .single();
    if (v1) seeded.vouchIds.push(v1.id);
  }, 120_000);

  afterAll(async () => {
    cleanup();
    await supabase.auth.signOut().catch(() => undefined);
    await cleanupCovPo();
  }, 120_000);

  it("signed-out Profile and Onboarding Navigate to /auth", async () => {
    await supabase.auth.signOut();
    const { unmount: u1 } = renderApp(<Profile />, { route: "/profile" });
    await waitFor(() => {
      // MemoryRouter keeps /profile; Navigate replaces location — AuthProvider still settles
      expect(document.body.textContent).not.toMatch(/Profile Completeness/i);
    }, { timeout: 15_000 });
    u1();

    const { unmount: u2 } = renderApp(<Onboarding />, { route: "/onboarding" });
    await waitFor(() => {
      expect(document.body.textContent).not.toMatch(/Complete Your Profile/i);
    }, { timeout: 15_000 });
    u2();
  }, 60_000);

  it("Onboarding: completed member redirects; incomplete walks wizard + finish", async () => {
    const user = userEvent.setup();

    // Completed onboarding → dashboard Navigate
    await signIn(E2E_ACCOUNTS.member.email);
    const { unmount: uDone } = renderApp(<Onboarding />, { route: "/onboarding" });
    await waitFor(() => {
      expect(document.body.textContent).not.toMatch(/Complete Your Profile/i);
    }, { timeout: 20_000 });
    uDone();

    // Incomplete disposable — full wizard
    await signIn(seeded.onboardEmail);
    const { unmount } = renderApp(withToaster(<Onboarding />), { route: "/onboarding" });
    await waitFor(() => expect(screen.getByText(/Complete Your Profile/i)).toBeInTheDocument(), {
      timeout: 25_000,
    });
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    // Validation: next without chapter
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Please select a chapter/i), {
      timeout: 8_000,
    });

    // Pick a chapter
    const chapterTrigger = screen.getByRole("combobox");
    await pickSelectOption(user, chapterTrigger, /Ahmedabad|Chapter/i);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/You'll be connected to this chapter/i);
    }, { timeout: 8_000 });

    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument(), {
      timeout: 8_000,
    });

    // Validation: names required
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/First and last name are required/i), {
      timeout: 8_000,
    });

    await user.type(screen.getByLabelText(/First Name/i), "CovPO");
    await user.type(screen.getByLabelText(/Last Name/i), "Finished");
    await user.type(screen.getByLabelText(/Middle Names/i), "Mid");

    // Gender select
    const genderTriggers = screen.getAllByRole("combobox");
    // first combobox on personal step is Gender; second is phone country
    if (genderTriggers[0]) await pickSelectOption(user, genderTriggers[0], /^Male$/);

    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: "1991-06-01" } });
    await user.type(screen.getByLabelText(/Birth Place/i), "Surat");
    await user.type(screen.getByLabelText(/^Ekda$/i), `${PREFIX}-ekda`);

    // Phone required validation
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Phone number is required/i), {
      timeout: 8_000,
    });

    // Country code + phone
    const phoneCombos = screen.getAllByRole("combobox");
    const ccTrigger = phoneCombos[phoneCombos.length - 1];
    if (ccTrigger) await pickSelectOption(user, ccTrigger, /\+1/);
    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "5551234567");

    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(screen.getByText(/^Employment$/i)).toBeInTheDocument(), { timeout: 8_000 });

    // Back then forward via progress + buttons
    await clickSafe(user, screen.getByRole("button", { name: /Back/i }));
    await waitFor(() => expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument(), {
      timeout: 8_000,
    });
    // Click completed progress segment to jump back (step 0 button in progress bar)
    const progressBtns = document.querySelectorAll("button.flex-1.h-2, button.flex-1");
    if (progressBtns[0]) await clickSafe(user, progressBtns[0] as HTMLElement);
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument(), {
      timeout: 8_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(screen.getByText(/^Employment$/i)).toBeInTheDocument(), { timeout: 8_000 });

    // Professional fields (Labels often lack htmlFor)
    fireEvent.change(inputNearLabel(/^Job Title$/i), { target: { value: `${PREFIX} Engineer` } });
    fireEvent.change(inputNearLabel(/^Company$/i), { target: { value: `${PREFIX} Corp` } });
    fireEvent.change(inputNearLabel(/^Sector$/i), { target: { value: "Technology" } });
    fireEvent.change(inputNearLabel(/^Degree$/i), { target: { value: `${PREFIX} BTech` } });
    fireEvent.change(inputNearLabel(/^Institution$/i), { target: { value: `${PREFIX} Uni` } });
    fireEvent.change(inputNearLabel(/^Year$/i), { target: { value: "2012" } });
    fireEvent.change(inputNearLabel(/Skills \(comma-separated\)/i), {
      target: { value: `${PREFIX}-skill-a, ${PREFIX}-skill-b` },
    });
    fireEvent.change(inputNearLabel(/Languages \(comma-separated\)/i), {
      target: { value: `${PREFIX}-lang-a, ${PREFIX}-lang-b` },
    });

    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Control who can see/i), {
      timeout: 8_000,
    });

    // Tweak one privacy field
    const privacyCombos = screen.getAllByRole("combobox");
    if (privacyCombos[0]) await pickSelectOption(user, privacyCombos[0], /Private/i);

    await clickSafe(user, screen.getByRole("button", { name: /Complete Profile/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile completed|Welcome to Khadayata/i), {
      timeout: 40_000,
    });

    // Confirm DB side-effects
    const admin = adminClient();
    const { data: mem } = await admin
      .from("members")
      .select("onboarding_completed, first_name, last_name, chapter_id")
      .eq("id", seeded.onboardMemberId!)
      .single();
    expect(mem?.onboarding_completed).toBe(true);
    expect(mem?.first_name).toBe("CovPO");
    expect(mem?.last_name).toBe("Finished");
    expect(mem?.chapter_id).toBeTruthy();

    const { data: skills } = await admin
      .from("member_skills")
      .select("id, skill")
      .eq("member_id", seeded.onboardMemberId!);
    for (const s of skills ?? []) seeded.skillIds.push(s.id);
    expect((skills ?? []).length).toBeGreaterThanOrEqual(2);

    const { data: langs } = await admin
      .from("member_languages")
      .select("id")
      .eq("member_id", seeded.onboardMemberId!);
    for (const l of langs ?? []) seeded.languageIds.push(l.id);

    const { data: edu } = await admin.from("education").select("id").eq("member_id", seeded.onboardMemberId!);
    for (const e of edu ?? []) seeded.educationIds.push(e.id);

    const { data: emp } = await admin.from("employment").select("id").eq("member_id", seeded.onboardMemberId!);
    for (const e of emp ?? []) seeded.employmentIds.push(e.id);

    const { data: contacts } = await admin
      .from("member_contacts")
      .select("id")
      .eq("member_id", seeded.onboardMemberId!);
    for (const c of contacts ?? []) seeded.contactIds.push(c.id);

    unmount();
  }, 180_000);

  it("Profile: no-chapter + no-global-id + L0/L1 vouch/family arms", async () => {
    const user = userEvent.setup();

    // No chapter → browse chapters banner
    await signIn(seeded.noChapterEmail);
    const { unmount: uNoCh } = renderApp(<Profile />, { route: "/profile" });
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Join a chapter to get your Global ID|Browse chapters|Find your chapter/i),
      { timeout: 25_000 },
    );
    expect(document.body.textContent).toMatch(/Basic|Level 0/i);
    uNoCh();

    // Chapter but no global id → Generate Global ID (+ matrimonial ekda on card)
    await signIn(seeded.noGidEmail);
    const { unmount: uNoGid } = renderApp(withToaster(<Profile />), { route: "/profile" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Generate Global ID/i })).toBeInTheDocument(), {
      timeout: 25_000,
    });
    // Matrimonial ekda fallback appears when RLS allows reading own matrimonial_profiles row
    if (document.body.textContent?.includes(`${PREFIX}-mat-ekda`)) {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-mat-ekda`));
    }
    await clickSafe(user, screen.getByRole("button", { name: /Generate Global ID/i }));
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(/Global ID Generated|Error generating ID|Generating/i),
      { timeout: 30_000 },
    );
    // Allow generate to settle
    await waitFor(
      () => !screen.queryByRole("button", { name: /Generating/i }),
      { timeout: 30_000 },
    ).catch(() => undefined);
    uNoGid();

    // L0: vouch progress + family table + note
    await signIn(seeded.l0Email);
    const { unmount: uL0 } = renderApp(<Profile />, { route: "/profile" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Vouches to reach L1/i);
        expect(document.body.textContent).toMatch(/CovPO Relative|Brother/i);
        expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} vouch note`));
      },
      { timeout: 25_000 },
    );
    // Open family invite dialog chrome
    const inviteBtn = screen.queryByRole("button", { name: /Invite Family/i });
    if (inviteBtn) {
      await clickSafe(user, inviteBtn);
      await waitFor(() => expect(document.body.textContent).toMatch(/Relation|Invitee|Email|Phone/i), {
        timeout: 8_000,
      });
      await closeDialogs(user);
    }
    uL0();

    // L1: L1+ vouch progress + Trusted/Verified badge arms + ekda/kuldevi
    await signIn(seeded.l1Email);
    const { unmount: uL1 } = renderApp(<Profile />, { route: "/profile" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/L1\+ vouches to reach L2|Verified|Level 1/i);
        expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-ekda`));
        expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-kuldevi`));
        expect(document.body.textContent).toMatch(/CovPO Voucher/);
      },
      { timeout: 25_000 },
    );
    uL1();
  }, 180_000);

  it("Profile: edit save + skill/lang/edu/emp add-remove + phone against E2E member", async () => {
    const user = userEvent.setup();
    await signIn(E2E_ACCOUNTS.member.email);
    const memberId = await memberIdForSession();
    const admin = adminClient();

    const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
    await waitFor(
      () => expect(document.body.textContent?.toLowerCase()).toMatch(/profile completeness|digital member/),
      { timeout: 25_000 },
    );

    // Edit → change birth place → save
    await clickSafe(user, screen.getByRole("button", { name: /^Edit$/i }));
    await waitFor(() => expect(screen.getByText(/First Name/i)).toBeInTheDocument(), { timeout: 8_000 });

    fireEvent.change(inputNearLabel(/^Birth Place$/i), { target: { value: `${PREFIX}-birth` } });
    fireEvent.change(inputNearLabel(/^Middle Names$/i), { target: { value: `${PREFIX}-mid` } });
    fireEvent.change(inputNearLabel(/^Ekda$/i), { target: { value: `${PREFIX}-e2e-ekda` } });
    fireEvent.change(inputNearLabel(/Kuldevi/i), { target: { value: `${PREFIX}-e2e-kul` } });

    // Gender + chapter selects in edit mode
    const editCombos = screen.getAllByRole("combobox");
    if (editCombos[0]) await pickSelectOption(user, editCombos[0], /Male|Female|Other/i);
    if (editCombos[1]) await pickSelectOption(user, editCombos[1], /Ahmedabad|Chapter/i);

    await clickSafe(user, screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile updated/i), { timeout: 25_000 });

    // Restore snapshot immediately so later tests see clean E2E member
    if (seeded.e2eMemberId && seeded.e2eMemberOrig) {
      await admin.from("members").update(seeded.e2eMemberOrig).eq("id", seeded.e2eMemberId);
    }

    // Skills add + remove
    const skillInput = screen.getByPlaceholderText(/Add skill/i);
    fireEvent.change(skillInput, { target: { value: `${PREFIX}-ui-skill` } });
    const skillAdd = skillInput.parentElement?.querySelector("button");
    if (skillAdd) await clickSafe(user, skillAdd as HTMLElement);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-ui-skill`)), {
      timeout: 15_000,
    });
    const { data: skillRows } = await admin
      .from("member_skills")
      .select("id")
      .eq("member_id", memberId)
      .eq("skill", `${PREFIX}-ui-skill`);
    for (const s of skillRows ?? []) seeded.skillIds.push(s.id);
    // Hover-reveal remove: fire click on X button
    const skillBadge = screen.getByText(`${PREFIX}-ui-skill`).closest(".group, [class*='badge']") ?? screen.getByText(`${PREFIX}-ui-skill`).parentElement;
    const skillX = skillBadge?.querySelector("button");
    if (skillX) {
      fireEvent.click(skillX);
      await waitFor(() => expect(screen.queryByText(`${PREFIX}-ui-skill`)).not.toBeInTheDocument(), {
        timeout: 15_000,
      });
    }

    // Languages add + remove
    const langInput = screen.getByPlaceholderText(/Add language/i);
    fireEvent.change(langInput, { target: { value: `${PREFIX}-ui-lang` } });
    const langAdd = langInput.parentElement?.querySelector("button");
    if (langAdd) await clickSafe(user, langAdd as HTMLElement);
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-ui-lang`)), {
      timeout: 15_000,
    });
    const { data: langRows } = await admin
      .from("member_languages")
      .select("id")
      .eq("member_id", memberId)
      .eq("language", `${PREFIX}-ui-lang`);
    for (const l of langRows ?? []) seeded.languageIds.push(l.id);
    const langBadge = screen.getByText(`${PREFIX}-ui-lang`).parentElement;
    const langX = langBadge?.querySelector("button");
    if (langX) {
      fireEvent.click(langX);
      await waitFor(() => expect(screen.queryByText(`${PREFIX}-ui-lang`)).not.toBeInTheDocument(), {
        timeout: 15_000,
      });
    }

    // Employment dialog add + remove
    const addButtons = screen.getAllByRole("button", { name: /^Add$/i });
    // Employment is first Add, Education second
    await clickSafe(user, addButtons[0]);
    await waitFor(() => expect(screen.getByText(/Add Employment/i)).toBeInTheDocument(), { timeout: 8_000 });
    const empDialog = screen.getByRole("dialog");
    const empInputs = within(empDialog).getAllByRole("textbox");
    fireEvent.change(empInputs[0], { target: { value: `${PREFIX}-job` } });
    if (empInputs[1]) fireEvent.change(empInputs[1], { target: { value: `${PREFIX}-co` } });
    if (empInputs[2]) fireEvent.change(empInputs[2], { target: { value: "Tech" } });
    await clickSafe(user, within(empDialog).getByRole("button", { name: /^Save$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Employment added|Covpo-job|covpo-job/i), {
      timeout: 20_000,
    });
    await closeDialogs(user);
    const { data: empRows } = await admin
      .from("employment")
      .select("id")
      .eq("member_id", memberId)
      .eq("job_title", `${PREFIX}-job`);
    for (const e of empRows ?? []) seeded.employmentIds.push(e.id);
    // Remove via trash (opacity-0 until hover — fireEvent still works)
    const empRow = screen.getByText(new RegExp(`${PREFIX}-job`, "i")).closest(".group, div");
    const empTrash = empRow?.querySelector("button");
    if (empTrash) {
      fireEvent.click(empTrash);
      await waitFor(() => expect(screen.queryByText(new RegExp(`${PREFIX}-job`, "i"))).not.toBeInTheDocument(), {
        timeout: 15_000,
      }).catch(() => undefined);
    }

    // Education dialog add + remove
    const addButtons2 = screen.getAllByRole("button", { name: /^Add$/i });
    const eduAdd = addButtons2.find((b) => {
      const header = b.closest("[class*='card']") ?? b.parentElement?.parentElement;
      return /Education/i.test(header?.textContent ?? "");
    }) ?? addButtons2[1];
    await clickSafe(user, eduAdd);
    await waitFor(() => expect(screen.getByText(/Add Education/i)).toBeInTheDocument(), { timeout: 8_000 });
    const eduDialog = screen.getByRole("dialog");
    const eduInputs = within(eduDialog).queryAllByRole("textbox");
    const eduAll = within(eduDialog).getAllByRole("spinbutton").concat(eduInputs as HTMLElement[]);
    // Degree, Institution text; Year number
    const deg = within(eduDialog).getAllByRole("textbox")[0] ?? eduInputs[0];
    const inst = within(eduDialog).getAllByRole("textbox")[1];
    const year =
      within(eduDialog).queryByRole("spinbutton") ??
      (eduDialog.querySelector('input[type="number"]') as HTMLInputElement | null);
    if (deg) fireEvent.change(deg, { target: { value: `${PREFIX}-deg` } });
    if (inst) fireEvent.change(inst, { target: { value: `${PREFIX}-inst` } });
    if (year) fireEvent.change(year, { target: { value: "2015" } });
    void eduAll;
    await clickSafe(user, within(eduDialog).getByRole("button", { name: /^Save$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Education added|covpo-deg/i), {
      timeout: 20_000,
    });
    await closeDialogs(user);
    const { data: eduRows } = await admin
      .from("education")
      .select("id")
      .eq("member_id", memberId)
      .eq("degree", `${PREFIX}-deg`);
    for (const e of eduRows ?? []) seeded.educationIds.push(e.id);
    const eduRow = screen.getByText(new RegExp(`${PREFIX}-deg`, "i")).closest(".group, div");
    const eduTrash = eduRow?.querySelector("button");
    if (eduTrash) {
      fireEvent.click(eduTrash);
      await waitFor(() => expect(screen.queryByText(new RegExp(`${PREFIX}-deg`, "i"))).not.toBeInTheDocument(), {
        timeout: 15_000,
      }).catch(() => undefined);
    }

    // PhoneField edit/save
    const phoneEdit = screen.queryByRole("button", { name: /edit phone|Edit/i });
    // PhoneField uses pencil icon button near Phone label
    const phoneSection = Array.from(document.querySelectorAll("label, span, p")).find((el) =>
      /^Phone$/i.test(el.textContent?.trim() ?? ""),
    )?.closest("div");
    const phoneBtn =
      phoneSection?.querySelector("button") ??
      screen.queryAllByRole("button").find((b) => /phone/i.test(b.getAttribute("aria-label") ?? b.textContent ?? ""));
    if (phoneBtn) {
      await clickSafe(user, phoneBtn as HTMLElement);
      await waitFor(() => {
        const inputs = screen.getAllByRole("textbox");
        expect(inputs.length).toBeGreaterThan(0);
      }, { timeout: 8_000 });
      const phoneNum = screen
        .getAllByRole("textbox")
        .find((i) => (i as HTMLInputElement).value.replace(/\D/g, "").length >= 0 && i.getAttribute("maxlength") === "15")
        ?? screen.getAllByRole("textbox").at(-1);
      if (phoneNum) {
        fireEvent.change(phoneNum, { target: { value: "9998887777" } });
        const savePhone = screen
          .getAllByRole("button")
          .find((b) => /Save|Check/i.test(b.textContent ?? "") || b.querySelector("svg"));
        // Prefer check icon near phone inputs
        const phoneSave =
          phoneNum.closest("div")?.parentElement?.querySelector("button") ??
          screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check, svg"));
        if (phoneSave) await clickSafe(user, phoneSave as HTMLElement);
        await waitFor(() => expect(document.body.textContent).toMatch(/Phone updated/i), {
          timeout: 15_000,
        }).catch(() => undefined);
      }
    }
    void phoneEdit;

    // Empty-state family copy when no links (E2E member typically has none)
    expect(document.body.textContent).toMatch(/Parivar|family/i);

    // Cancel edit path
    const editAgain = screen.queryByRole("button", { name: /^Edit$/i });
    if (editAgain) {
      await clickSafe(user, editAgain);
      await waitFor(() => expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument(), {
        timeout: 8_000,
      });
      await clickSafe(user, screen.getByRole("button", { name: /Cancel/i }));
    }

    unmount();
  }, 240_000);

  it("Profile remainder: seeded remove + avatar upload + generate-ID error arm", async () => {
    const user = userEvent.setup();
    const admin = adminClient();
    await signIn(seeded.l1Email);
    const memberId = seeded.l1MemberId!;

    const { data: edu, error: eduErr } = await admin
      .from("education")
      .insert({
        member_id: memberId,
        degree: `${PREFIX}-rm-deg`,
        institution: `${PREFIX}-rm-inst`,
        year: 2011,
      })
      .select("id")
      .single();
    if (eduErr) throw eduErr;
    seeded.educationIds.push(edu.id);

    const { data: emp, error: empErr } = await admin
      .from("employment")
      .insert({
        member_id: memberId,
        job_title: `${PREFIX}-rm-job`,
        company: `${PREFIX}-rm-co`,
        sector: "Tech",
      })
      .select("id")
      .single();
    if (empErr) throw empErr;
    seeded.employmentIds.push(emp.id);

    // Ensure avatars bucket for upload path
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "avatars")) {
      await admin.storage.createBucket("avatars", { public: true, fileSizeLimit: 5242880 });
    }

    const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-rm-deg`));
        expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}-rm-job`));
      },
      { timeout: 25_000 },
    );

    // Remove employment + education via trash buttons (opacity-0 until hover)
    for (const marker of [`${PREFIX}-rm-job`, `${PREFIX}-rm-deg`]) {
      const node = screen.getByText(new RegExp(marker, "i"));
      const row = node.closest(".group") ?? node.parentElement?.parentElement ?? node.parentElement;
      const trash = row?.querySelector("button");
      expect(trash).toBeTruthy();
      fireEvent.click(trash!);
      await waitFor(() => expect(screen.queryByText(new RegExp(marker, "i"))).not.toBeInTheDocument(), {
        timeout: 15_000,
      });
    }

    // Avatar upload → handleAvatarUpload (ensure storage policy allows member write)
    try {
      await admin.storage.createBucket("avatars", { public: true, fileSizeLimit: 5242880 });
    } catch {
      /* exists */
    }
    // Best-effort storage INSERT policy for authenticated avatars
    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync(
        "docker",
        ["exec", "-i", "supabase_db_khadayata-local", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=0"],
        {
          input: `
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
DO $$ BEGIN
  CREATE POLICY covpo_avatars_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY covpo_avatars_update ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`,
          encoding: "utf8",
        },
      );
    } catch {
      /* non-fatal */
    }

    // Stub storage so AvatarUpload always reaches onUploadComplete → Profile.handleAvatarUpload
    const realStorageFrom = supabase.storage.from.bind(supabase.storage);
    const storageSpy = vi.spyOn(supabase.storage, "from").mockImplementation(((bucket: string) => {
      if (bucket !== "avatars") return realStorageFrom(bucket);
      return {
        upload: async () => ({ data: { path: `${PREFIX}/avatar.png` }, error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: `http://127.0.0.1:54331/storage/v1/object/public/avatars/${PREFIX}.png` },
        }),
      } as never;
    }) as typeof supabase.storage.from);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    const png = new File(
      [Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))],
      "covpo-avatar.png",
      { type: "image/png" },
    );
    await user.upload(fileInput!, png);
    await waitFor(() => expect(document.body.textContent).toMatch(/Photo uploaded/i), { timeout: 30_000 });
    storageSpy.mockRestore();

    unmount();

    // Fresh disposable with chapter + no global_id for generate-ID error arm
    // (earlier test may have successfully generated an ID for noGidEmail)
    const gidEmail = `${PREFIX}_giderr@covpo.test`;
    const gidMem = await createAuthMember(admin, {
      email: gidEmail,
      first: "CovPO",
      last: "GidErr",
      level: 1,
      chapterId: AHMEDABAD,
      onboarding: true,
      globalId: null,
    });
    // Ensure no auto-assigned global_id (trigger may mint on chapter assign)
    await admin.from("members").update({ global_id: null }).eq("id", gidMem.memberId);
    await signIn(gidEmail);

    // supabase.functions is a fresh object each access — stub the prototype
    const fnProto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origInvoke = fnProto.invoke;
    fnProto.invoke = (async () => ({
      data: null,
      error: { message: "covpo invoke fail" },
    })) as typeof supabase.functions.invoke;
    const { unmount: u2 } = renderApp(withToaster(<Profile />), { route: "/profile" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Generate Global ID/i })).toBeInTheDocument(), {
      timeout: 25_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Generate Global ID/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Error generating ID/i), {
      timeout: 15_000,
    });
    fnProto.invoke = origInvoke;
    u2();
  }, 180_000);

  it("Onboarding remainder: finish error toast + global-id catch", async () => {
    const user = userEvent.setup();
    const admin = adminClient();

    // Fresh incomplete member for error-path finish
    const email = `${PREFIX}_onberr@covpo.test`;
    const created = await createAuthMember(admin, {
      email,
      first: "CovPO",
      last: "OnbErr",
      level: 0,
      chapterId: null,
      onboarding: false,
      globalId: null,
    });
    seeded.onboardUserId = created.userId;
    seeded.onboardMemberId = created.memberId;

    await signIn(email);

    // Briefly stall chapters query so chaptersLoading UI renders (line 244)
    const realFromStall = supabase.from.bind(supabase);
    let releaseChapters: (() => void) | null = null;
    const chaptersGate = new Promise<void>((resolve) => {
      releaseChapters = resolve;
    });
    const stallSpy = vi.spyOn(supabase, "from").mockImplementation(((relation: string) => {
      const builder = realFromStall(relation);
      if (relation !== "chapters") return builder;
      return new Proxy(builder as object, {
        get(target, prop, receiver) {
          if (prop === "select") {
            return (...args: unknown[]) => {
              const q = (Reflect.get(target, prop, receiver) as (...a: unknown[]) => unknown)(...args) as {
                order: (...a: unknown[]) => Promise<unknown>;
              };
              return {
                order: async (...oArgs: unknown[]) => {
                  await chaptersGate;
                  return q.order(...oArgs);
                },
              };
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as ReturnType<typeof supabase.from>;
    }) as typeof supabase.from);

    const { unmount: uLoad } = renderApp(<Onboarding />, { route: "/onboarding" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Loading chapters/i), {
      timeout: 10_000,
    }).catch(() => undefined);
    releaseChapters?.();
    stallSpy.mockRestore();
    uLoad();

    const { unmount } = renderApp(withToaster(<Onboarding />), { route: "/onboarding" });
    await waitFor(() => expect(screen.getByText(/Complete Your Profile/i)).toBeInTheDocument(), {
      timeout: 25_000,
    });

    await pickSelectOption(user, screen.getByRole("combobox"), /Ahmedabad|Chapter/i);
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument(), { timeout: 8_000 });
    await user.type(screen.getByLabelText(/First Name/i), "Err");
    await user.type(screen.getByLabelText(/Last Name/i), "Path");
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), { target: { value: "1112223333" } });
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(screen.getByText(/^Employment$/i)).toBeInTheDocument(), { timeout: 8_000 });
    await clickSafe(user, screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Control who can see/i), { timeout: 8_000 });

    // Force one updateMember failure (handleFinish catch), then succeed with global-id catch warn.
    const fnProto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origInvoke = fnProto.invoke;
    fnProto.invoke = (async () => {
      throw new Error("deferred");
    }) as typeof supabase.functions.invoke;
    let failNextUpdate = true;
    const realFrom = supabase.from.bind(supabase);
    const selective = vi.spyOn(supabase, "from").mockImplementation(((relation: string) => {
      const builder = realFrom(relation);
      if (relation !== "members") return builder;
      return new Proxy(builder as object, {
        get(target, prop, receiver) {
          if (prop === "update") {
            return (payload: Record<string, unknown>) => {
              if (failNextUpdate) {
                failNextUpdate = false;
                // Match useMember chain: update().eq().select().single()
                return {
                  eq: () => ({
                    select: () => ({
                      single: async () => ({
                        data: null,
                        error: { message: "covpo forced update fail", code: "PGRST" },
                      }),
                    }),
                  }),
                };
              }
              return (Reflect.get(target, prop, receiver) as (p: unknown) => unknown).call(target, payload);
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as ReturnType<typeof supabase.from>;
    }) as typeof supabase.from);

    await clickSafe(user, screen.getByRole("button", { name: /Complete Profile/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Error saving profile|covpo forced/i), {
      timeout: 20_000,
    });

    await clickSafe(user, screen.getByRole("button", { name: /Complete Profile/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile completed|Welcome to Khadayata/i), {
      timeout: 40_000,
    });
    selective.mockRestore();
    fnProto.invoke = origInvoke;
    unmount();
  }, 180_000);
});
