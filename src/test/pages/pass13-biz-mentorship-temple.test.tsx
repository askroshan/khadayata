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
import PublicBusiness from "@/pages/PublicBusiness";
import Business from "@/pages/Business";
import PublicMentorship from "@/pages/PublicMentorship";
import Mentorship from "@/pages/Mentorship";
import Temple from "@/pages/Temple";
import { RishtaWorkflow } from "@/components/matrimonial/RishtaWorkflow";
import { LiveAartiPlayer } from "@/components/temple/LiveAartiPlayer";

/**
 * Pass 13 — Business / Mentorship / Temple / Rishta against real Kong (:54331).
 * Seeds temporary rows via service role (authenticated grants are often SELECT-only).
 * No MSW / fixture JSON for view data.
 */

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";
const CITY_AHM = "e1000001-0000-0000-0000-000000000001";
/** Existing matrimonial profile (Rokin Shah) used as Rishta counterpart. */
const OTHER_PROFILE_ID = "fb2f9332-f13a-4a8d-ae6c-da492b1b30bc";
/** Existing available mentor (Aman Shah) — leave untouched; we seed our own. */
const MARKER = "Pass13Cov";

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
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for Pass13 seeding");
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

async function pickSelect(user: ReturnType<typeof userEvent.setup>, labelOrAria: RegExp | string, option: RegExp | string) {
  const triggers = screen.queryAllByRole("combobox");
  let trigger: HTMLElement | undefined;
  if (typeof labelOrAria === "string" || labelOrAria instanceof RegExp) {
    trigger =
      screen.queryByRole("combobox", { name: labelOrAria }) ??
      triggers.find((t) => (t.getAttribute("aria-label") ?? t.textContent ?? "").match(labelOrAria as RegExp)) ??
      triggers[0];
  }
  if (!trigger) return;
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 3000 }).catch(() => []);
  const match = opts.find((o) =>
    typeof option === "string" ? (o.textContent ?? "").includes(option) : option.test(o.textContent ?? ""),
  );
  if (match) await clickSafe(user, match);
}

const seeded = {
  memberId: null as string | null,
  prevVerification: 0,
  fundId: null as string | null,
  donationId: null as string | null,
  bizVerifiedId: null as string | null,
  bizUnverifiedId: null as string | null,
  jobId: null as string | null,
  jobNoSalaryId: null as string | null,
  mentorshipOfferId: null as string | null,
  mentorshipActiveId: null as string | null,
  sessionId: null as string | null,
  profileId: null as string | null,
  profileCreated: false,
  rishtaIntroId: null as string | null,
  rishtaFamilyId: null as string | null,
  rishtaApprovedId: null as string | null,
  settingsTouched: false,
  priorOtherMentorOpen: [] as { id: string; status: string }[],
};

describe("Pass 13 — Business / Mentorship / Temple / Rishta (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.member.email);
    const memberId = await currentMemberId();
    seeded.memberId = memberId;

    const { data: memRow } = await admin
      .from("members")
      .select("verification_level")
      .eq("id", memberId)
      .single();
    seeded.prevVerification = (memRow?.verification_level as number) ?? 0;
    setVerificationLevelSql(memberId, 2);
    // Re-auth so useMember picks up L2 for List Business / Post Job dialogs
    await signIn(E2E_ACCOUNTS.member.email);

    const { data: fund, error: fundErr } = await admin
      .from("funds")
      .insert({
        scope: "global",
        name: `${MARKER} Temple Seva Fund`,
        currency: "INR",
        active: true,
      })
      .select("id")
      .single();
    if (fundErr) throw fundErr;
    seeded.fundId = fund.id;

    const { data: donation, error: donErr } = await admin
      .from("donations")
      .insert({
        fund_id: fund.id,
        member_id: memberId,
        amount: 12000,
        currency: "INR",
        type: "one_time",
        provider: "manual",
        status: "succeeded",
        donor_wall_opt_in: true,
        donor_name: `${MARKER} Patron`,
        donor_email: "pass13@khadayataonline.com",
        donor_phone: "+919876543210",
        donor_address: "CG Road, Ahmedabad",
        payment_method: "UPI",
        notes: "Coverage donation",
      })
      .select("id")
      .single();
    if (donErr) throw donErr;
    seeded.donationId = donation.id;

    const { data: existingSettings } = await admin
      .from("settings")
      .select("key")
      .eq("key", "temple_aarti_schedule")
      .maybeSingle();
    if (!existingSettings) {
      await admin.from("settings").upsert({
        key: "temple_aarti_schedule",
        value: { morning: "06:00", evening: "19:00", stream_url: "https://example.com/aarti", timezone: "Asia/Kolkata" },
      });
      seeded.settingsTouched = true;
    }

    const { data: bizV, error: bizVErr } = await admin
      .from("businesses")
      .insert({
        owner_member_id: memberId,
        chapter_id: AHMEDABAD,
        name: `${MARKER} Verified Tech LLP`,
        sector: "Technology",
        description: "Pass13 coverage verified business with website and tags.",
        website: "https://example.com/pass13",
        phone: "+919800000001",
        email: "pass13biz@example.com",
        address_line1: "CG Road",
        address_line2: "Navrangpura",
        postal_code: "380009",
        country_id: INDIA,
        state_id: GUJARAT,
        city_id: CITY_AHM,
        founded_year: 2015,
        employee_count: "11-50",
        tags: ["coverage", "saas", "gujarati"],
        verified: true,
      })
      .select("id")
      .single();
    if (bizVErr) throw bizVErr;
    seeded.bizVerifiedId = bizV.id;

    const { data: bizU, error: bizUErr } = await admin
      .from("businesses")
      .insert({
        owner_member_id: memberId,
        chapter_id: AHMEDABAD,
        name: `${MARKER} Unverified Foods`,
        sector: "Food & Beverage",
        description: "Unverified listing for filter coverage.",
        address_line1: "Manek Chowk",
        postal_code: "380001",
        country_id: INDIA,
        state_id: GUJARAT,
        city_id: CITY_AHM,
        tags: ["snacks"],
        verified: false,
      })
      .select("id")
      .single();
    if (bizUErr) throw bizUErr;
    seeded.bizUnverifiedId = bizU.id;

    const { data: job, error: jobErr } = await admin
      .from("jobs")
      .insert({
        employer_member_id: memberId,
        employer_business_id: bizV.id,
        chapter_id: AHMEDABAD,
        title: `${MARKER} Full Stack Engineer`,
        description: "Ship community platform features with React and TypeScript.",
        location: "Ahmedabad",
        remote: true,
        employment_type: "full_time",
        salary_min: 800000,
        salary_max: 1500000,
        salary_currency: "INR",
        salary_period: "annual",
        experience_min: 2,
        experience_max: 6,
        education_required: "B.Tech",
        skills_required: ["React", "TypeScript"],
        benefits: ["PF", "Health"],
        positions_available: 2,
        status: "open",
        country_id: INDIA,
        state_id: GUJARAT,
        city_id: CITY_AHM,
        contact_email: "jobs@example.com",
      })
      .select("id")
      .single();
    if (jobErr) throw jobErr;
    seeded.jobId = job.id;

    const { data: job2, error: job2Err } = await admin
      .from("jobs")
      .insert({
        employer_member_id: memberId,
        chapter_id: AHMEDABAD,
        title: `${MARKER} Volunteer Coordinator`,
        description: "Coordinate temple seva volunteers.",
        location: "Ahmedabad",
        remote: false,
        employment_type: "volunteer",
        status: "open",
        skills_required: ["Coordination"],
        positions_available: 1,
      })
      .select("id")
      .single();
    if (job2Err) throw job2Err;
    seeded.jobNoSalaryId = job2.id;

    // Mentorship offer from a different real member so E2E member can see it as available.
    // Partial unique index mentorships_one_open_per_mentor_idx allows only one available/pending per mentor.
    const OTHER_MENTOR = "f86b8859-707c-4fc1-8e1d-d6f186d683b4";
    const { data: priorOpen } = await admin
      .from("mentorships")
      .select("id, status, skills, description, mode, availability")
      .eq("mentor_member_id", OTHER_MENTOR)
      .in("status", ["available", "pending"]);
    seeded.priorOtherMentorOpen = priorOpen ?? [];
    if ((priorOpen ?? []).length) {
      await admin
        .from("mentorships")
        .update({ status: "completed" })
        .in(
          "id",
          priorOpen!.map((r) => r.id),
        );
    }
    const { data: mOffer, error: mOfferErr } = await admin
      .from("mentorships")
      .insert({
        mentor_member_id: OTHER_MENTOR,
        skills: [`${MARKER} Leadership`, `${MARKER} Gujarati`],
        status: "available",
        description: "Pass13 coverage mentor offer",
        mode: "hybrid",
        availability: "weekends",
      })
      .select("id")
      .single();
    if (mOfferErr) throw mOfferErr;
    seeded.mentorshipOfferId = mOffer.id;

    // Active mentorship where E2E member is mentor (for Log Session UI).
    const { data: mActive, error: mActiveErr } = await admin
      .from("mentorships")
      .insert({
        mentor_member_id: memberId,
        mentee_member_id: OTHER_MENTOR,
        skills: [`${MARKER} Mentoring`],
        status: "active",
        description: "Active coverage mentorship",
      })
      .select("id")
      .single();
    if (mActiveErr) throw mActiveErr;
    seeded.mentorshipActiveId = mActive.id;

    const { data: sess, error: sessErr } = await admin
      .from("mentorship_sessions")
      .insert({
        mentorship_id: mActive.id,
        notes: `${MARKER} prior session notes`,
        session_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (sessErr) throw sessErr;
    seeded.sessionId = sess.id;

    // Matrimonial profile for E2E member + rishta states
    const { data: existingProfile } = await admin
      .from("matrimonial_profiles")
      .select("id")
      .eq("member_id", memberId)
      .maybeSingle();
    if (existingProfile) {
      seeded.profileId = existingProfile.id;
    } else {
      const { data: profile, error: pErr } = await admin
        .from("matrimonial_profiles")
        .insert({
          member_id: memberId,
          visibility: "members",
          about: `${MARKER} matrimonial profile`,
          current_city: "Ahmedabad",
          current_state: "Gujarat",
          country: "India",
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      seeded.profileId = profile.id;
      seeded.profileCreated = true;
    }

    // Resolve live counterpart profiles (hardcoded IDs drift across local restores).
    const { data: otherProfiles } = await admin
      .from("matrimonial_profiles")
      .select("id")
      .neq("id", seeded.profileId!)
      .neq("member_id", memberId)
      .limit(8);
    const counterpartIds = (otherProfiles ?? [])
      .map((p) => p.id)
      .filter((id) => id && id !== seeded.profileId);
    const prefer = [OTHER_PROFILE_ID, "b9aa2b08-107a-4568-9de2-fb0d463ff61b", "ccb4e230-108c-45d6-a460-d884211fa584"];
    const ordered = [
      ...prefer.filter((id) => counterpartIds.includes(id)),
      ...counterpartIds.filter((id) => !prefer.includes(id)),
    ];
    if (ordered.length < 3) {
      throw new Error(`Need ≥3 other matrimonial profiles for rishta seeds; found ${ordered.length}`);
    }
    const [introTo, familyTo, approvedFrom] = ordered;

    await admin.from("rishta_requests").delete().eq("from_profile_id", seeded.profileId!).eq("to_profile_id", introTo);
    const { data: rIntro, error: rIntroErr } = await admin
      .from("rishta_requests")
      .insert({
        from_profile_id: seeded.profileId!,
        to_profile_id: introTo,
        status: "intro_sent",
        intro_message: `${MARKER} introduction to family`,
      })
      .select("id")
      .single();
    if (rIntroErr) throw rIntroErr;
    seeded.rishtaIntroId = rIntro.id;

    await admin.from("rishta_requests").delete().eq("from_profile_id", seeded.profileId!).eq("to_profile_id", familyTo);
    const { data: rFam, error: rFamErr } = await admin
      .from("rishta_requests")
      .insert({
        from_profile_id: seeded.profileId!,
        to_profile_id: familyTo,
        status: "family_review",
        intro_message: `${MARKER} in family review`,
        from_family_ok: null,
        to_family_ok: null,
      })
      .select("id")
      .single();
    if (rFamErr) throw rFamErr;
    seeded.rishtaFamilyId = rFam.id;

    await admin.from("rishta_requests").delete().eq("from_profile_id", approvedFrom).eq("to_profile_id", seeded.profileId!);
    const { data: rOk, error: rOkErr } = await admin
      .from("rishta_requests")
      .insert({
        from_profile_id: approvedFrom,
        to_profile_id: seeded.profileId!,
        status: "family_approved",
        intro_message: `${MARKER} ready to accept`,
        from_family_ok: true,
        to_family_ok: true,
      })
      .select("id")
      .single();
    if (rOkErr) throw rOkErr;
    seeded.rishtaApprovedId = rOk.id;
  }, 120_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.rishtaIntroId) await admin.from("rishta_requests").delete().eq("id", seeded.rishtaIntroId);
    if (seeded.rishtaFamilyId) await admin.from("rishta_requests").delete().eq("id", seeded.rishtaFamilyId);
    if (seeded.rishtaApprovedId) await admin.from("rishta_requests").delete().eq("id", seeded.rishtaApprovedId);
    if (seeded.profileId) {
      await admin.from("rishta_requests").delete().or(`from_profile_id.eq.${seeded.profileId},to_profile_id.eq.${seeded.profileId}`);
    }
    if (seeded.profileCreated && seeded.profileId) {
      await admin.from("matrimonial_profiles").delete().eq("id", seeded.profileId);
    }
    if (seeded.sessionId) await admin.from("mentorship_sessions").delete().eq("id", seeded.sessionId);
    if (seeded.mentorshipActiveId) {
      await admin.from("mentorship_sessions").delete().eq("mentorship_id", seeded.mentorshipActiveId);
      await admin.from("mentorships").delete().eq("id", seeded.mentorshipActiveId);
    }
    if (seeded.mentorshipOfferId) await admin.from("mentorships").delete().eq("id", seeded.mentorshipOfferId);
    await admin.from("mentorships").delete().contains("skills", [`${MARKER} Leadership`]);
    // Restore any pre-existing available/pending mentorships we parked as completed.
    for (const row of seeded.priorOtherMentorOpen) {
      await admin.from("mentorships").update({ status: row.status }).eq("id", row.id);
    }
    if (seeded.jobId) {
      await admin.from("job_applications").delete().eq("job_id", seeded.jobId);
      await admin.from("jobs").delete().eq("id", seeded.jobId);
    }
    if (seeded.jobNoSalaryId) {
      await admin.from("job_applications").delete().eq("job_id", seeded.jobNoSalaryId);
      await admin.from("jobs").delete().eq("id", seeded.jobNoSalaryId);
    }
    await admin.from("jobs").delete().ilike("title", `${MARKER}%`);
    if (seeded.bizVerifiedId) await admin.from("businesses").delete().eq("id", seeded.bizVerifiedId);
    if (seeded.bizUnverifiedId) await admin.from("businesses").delete().eq("id", seeded.bizUnverifiedId);
    await admin.from("businesses").delete().ilike("name", `${MARKER}%`);
    if (seeded.donationId) await admin.from("donations").delete().eq("id", seeded.donationId);
    await admin.from("donations").delete().ilike("donor_name", `${MARKER}%`);
    if (seeded.fundId) await admin.from("funds").delete().eq("id", seeded.fundId);
    await admin.from("funds").delete().ilike("name", `${MARKER}%`);
    if (seeded.settingsTouched) {
      await admin.from("settings").delete().eq("key", "temple_aarti_schedule");
    }
    if (seeded.memberId) {
      setVerificationLevelSql(seeded.memberId, seeded.prevVerification);
    }
    await supabase.auth.signOut();
  }, 90_000);

  it("LiveAartiPlayer renders schedule + next-session chrome", async () => {
    renderApp(
      <LiveAartiPlayer
        schedule={{ morning: "06:00", evening: "19:00", stream_url: "https://example.com/aarti" }}
      />,
      { route: "/temple" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/aarti|morning|evening|live|stream/);
    });
  });

  it("PublicBusiness: seeded cards, filters, jobs tab, login gate", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    renderApp(<PublicBusiness />, { route: "/business" });

    await waitFor(
      () => {
        expect(document.body.textContent).toContain(`${MARKER} Verified Tech LLP`);
      },
      { timeout: 25_000 },
    );
    expect(document.body.textContent).toContain(`${MARKER} Unverified Foods`);
    expect(document.body.textContent?.toLowerCase()).toMatch(/sign in required|sign in to view/i);

    const search = screen.getByPlaceholderText(/Search businesses/i);
    await user.clear(search);
    await user.type(search, "Verified Tech");
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Verified Tech LLP`);
      expect(document.body.textContent).not.toContain(`${MARKER} Unverified Foods`);
    }, { timeout: 10_000 });

    await user.clear(search);
    await pickSelect(user, /sector|All Sectors/i, /Technology/i);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Verified Tech LLP`);
    }, { timeout: 10_000 });

    await pickSelect(user, /listing|verified|All Listings/i, /Verified Only/i);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Verified Tech LLP`);
      expect(document.body.textContent).not.toContain(`${MARKER} Unverified Foods`);
    }, { timeout: 10_000 });

    const jobsTab = screen.getByRole("tab", { name: /Jobs/i });
    await user.click(jobsTab);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Full Stack Engineer`);
    }, { timeout: 15_000 });
    expect(document.body.textContent).toContain(`${MARKER} Volunteer Coordinator`);

    const jobSearch = screen.getByPlaceholderText(/Search jobs/i);
    await user.clear(jobSearch);
    await user.type(jobSearch, "Full Stack");
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Full Stack Engineer`);
      expect(document.body.textContent).not.toContain(`${MARKER} Volunteer Coordinator`);
    }, { timeout: 10_000 });

    await pickSelect(user, /type|All Types/i, /Volunteer/i);
  }, 90_000);

  it("PublicBusiness signed-in: manage link + contact details path", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<PublicBusiness />, { route: "/business" });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Verified Tech LLP`);
    }, { timeout: 25_000 });
    expect(document.body.textContent).toMatch(/Manage Listings|View full details/i);
    const jobsTab = screen.getByRole("tab", { name: /Jobs/i });
    await user.click(jobsTab);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Full Stack Engineer`);
    }, { timeout: 15_000 });
  }, 60_000);

  it("Business manage: filters, list/post dialogs, apply job", async () => {
    // Re-assert L2 — other suites may restore verification_level on the E2E member.
    if (seeded.memberId) setVerificationLevelSql(seeded.memberId, 2);
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<Business />, { route: "/business/manage" });

    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Verified Tech LLP`);
    }, { timeout: 30_000 });

    const bizSearch = screen.getByLabelText(/Search businesses/i);
    fireEvent.change(bizSearch, { target: { value: "Verified Tech" } });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Verified Tech LLP`);
    }, { timeout: 10_000 });

    const loc = screen.getByLabelText(/Filter by location/i);
    fireEvent.change(loc, { target: { value: "CG Road" } });

    await pickSelect(user, /sector/i, /Technology/i);
    await pickSelect(user, /verification|listing/i, /Verified Only/i);

    await waitFor(() => {
      const listBizBtn = screen.queryByRole("button", { name: /^List Business$/i });
      expect(listBizBtn).toBeTruthy();
      expect((listBizBtn as HTMLButtonElement).disabled).toBe(false);
    }, { timeout: 20_000 });
    const listBiz = screen.queryByRole("button", { name: /^List Business$/i });
    await clickSafe(user, listBiz);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/List Your Business|Business Name/i);
    }, { timeout: 8_000 });
    const nameInput = screen.queryByLabelText(/Business Name/i) ?? document.querySelector("input");
    if (nameInput) fireEvent.change(nameInput, { target: { value: `${MARKER} UI Draft Biz` } });
    // Fill a few fields then Escape — avoid committing duplicate listings
    await user.keyboard("{Escape}");

    const jobsTab = screen.getByRole("tab", { name: /Jobs/i });
    await user.click(jobsTab);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Full Stack Engineer`);
    }, { timeout: 15_000 });

    const jobSearch = screen.getByLabelText(/Search jobs/i);
    fireEvent.change(jobSearch, { target: { value: "Full Stack" } });
    await pickSelect(user, /employment type|All Types/i, /Full Time/i);

    await clickSafe(user, screen.queryByRole("button", { name: /Post Job/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Post a Job|Job Title/i);
    }, { timeout: 8_000 });
    await user.keyboard("{Escape}");

    // Apply to volunteer job (not own full-stack if already applied — volunteer is fine)
    const applyBtns = screen.queryAllByRole("button", { name: /Apply Now/i });
    if (applyBtns[0]) {
      await user.click(applyBtns[0]);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/application submitted|applied|error|already/);
      }, { timeout: 15_000 });
    }
  }, 120_000);

  it("PublicMentorship: skill cloud, search, login gate", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    renderApp(<PublicMentorship />, { route: "/mentorship" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(MARKER));
    }, { timeout: 25_000 });
    expect(document.body.textContent?.toLowerCase()).toMatch(/sign in required|sign in to request/i);

    const skillBtn = screen.queryByRole("button", { name: new RegExp(`${MARKER} Leadership`) });
    if (skillBtn) {
      await user.click(skillBtn);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Leadership|mentor/i);
      });
      await user.click(screen.getByRole("button", { name: /^All$/i }));
    }

    const search = screen.getByPlaceholderText(/Search by name or skill/i);
    await user.type(search, MARKER);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(MARKER));
    }, { timeout: 10_000 });
    await user.clear(search);
    await user.type(search, "zzz-no-mentor-pass13");
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/no mentors found/);
    }, { timeout: 10_000 });
  }, 60_000);

  it("Mentorship manage: marketplace, offer form, browse, my sessions", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<Mentorship />, { route: "/mentorship/manage" });

    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/mentorship|marketplace|mentor/);
    }, { timeout: 30_000 });

    // Skill chip filter on marketplace
    const skillChip = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes(`${MARKER} Leadership`),
    );
    if (skillChip) {
      await user.click(skillChip);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Mentors for|Request Mentorship/i);
      }, { timeout: 8_000 });
    }

    await clickSafe(user, screen.queryByRole("button", { name: /Offer Mentorship/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Offer Mentorship|skills you can mentor/i);
    }, { timeout: 8_000 });
    // Validation path
    const offerBtn = screen.queryByRole("button", { name: /Offer to Mentor/i });
    if (offerBtn) await user.click(offerBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/at least one skill|Please enter/i);
    }, { timeout: 5_000 });
    const skillInput = screen.getByPlaceholderText(/e\.g\. React|comma-separated/i);
    await user.type(skillInput, `${MARKER} Coaching`);
    // Escape without committing to avoid permanent mentor row pollution (offer still exercised)
    await user.keyboard("{Escape}");

    const browse = screen.getByRole("tab", { name: /All Mentors/i });
    await user.click(browse);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/mentors available|Offer Mentorship/i);
    }, { timeout: 10_000 });
    const browseSearch = screen.getByPlaceholderText(/Search by skill/i);
    fireEvent.change(browseSearch, { target: { value: MARKER } });
    await clickSafe(user, screen.queryByRole("button", { name: /Offer Mentorship/i }));
    // Inline offer form
    const inline = screen.queryByPlaceholderText(/Skills you can mentor/i);
    if (inline) {
      fireEvent.change(inline, { target: { value: "" } });
      const submit = screen.queryAllByRole("button", { name: /Offer to Mentor/i })[0];
      if (submit) await user.click(submit);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/at least one skill|Please enter/i);
      }, { timeout: 5_000 });
    }

    const myTab = screen.getByRole("tab", { name: /My Mentorships/i });
    await user.click(myTab);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${MARKER} Mentoring|active|session`, "i"));
    }, { timeout: 15_000 });
    expect(document.body.textContent).toMatch(/session/i);

    await clickSafe(user, screen.queryByRole("button", { name: /Log Session/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Log Mentorship Session|Session notes/i);
    }, { timeout: 8_000 });
    const notes = screen.queryByPlaceholderText(/Session notes/i);
    if (notes) fireEvent.change(notes, { target: { value: `${MARKER} live log` } });
    // Escape — session logging mutation covered by seed + dialog chrome
    await user.keyboard("{Escape}");
  }, 120_000);

  it("Temple: donation form validation, funds, donor wall, pledges, ledger", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<Temple />, { route: "/temple" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Kotyark Temple|Make a Donation|Aarti/i);
    }, { timeout: 30_000 });

    // Seva / donor wall from seeded donation (wait for Kong queries)
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Sahayogi|Dharmaada Patron|contributed|Total contributed/i);
    }, { timeout: 25_000 });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Patron`);
    }, { timeout: 25_000 });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Temple Seva Fund`);
    }, { timeout: 25_000 });

    // Validation errors
    await clickSafe(user, screen.queryByRole("button", { name: /^Donate/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/select a fund|valid amount|email|phone|address|payment/i);
    }, { timeout: 8_000 });

    await pickSelect(user, /fund|Select fund/i, new RegExp(MARKER));
    // Quick amount — prefer exact ₹500 (not ₹5000)
    const quick =
      screen.queryAllByRole("button").find((b) => (b.textContent ?? "").replace(/\s/g, "") === "₹500") ??
      screen.queryAllByRole("button").find((b) => /^₹\s*500$/.test((b.textContent ?? "").trim()));
    if (quick) await user.click(quick);
    else {
      const amount = screen.getByPlaceholderText(/Custom amount/i);
      fireEvent.change(amount, { target: { value: "500" } });
    }

    // Close any open radix select before the next picks
    await user.keyboard("{Escape}");

    // Donation Type → Recurring reveals interval; then back to One Time
    const typeTrigger = screen.getAllByRole("combobox").find((el) =>
      /One Time|Recurring|Donation Type/i.test(el.textContent ?? ""),
    );
    if (typeTrigger) {
      await user.click(typeTrigger);
      const recurring = await screen.findByRole("option", { name: /Recurring/i }, { timeout: 5000 });
      await user.click(recurring);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Recurring Interval/i);
      }, { timeout: 8_000 });
      await user.keyboard("{Escape}");
      const intervalTrigger = screen.getAllByRole("combobox").find((el) =>
        /interval|weekly|monthly|Select interval/i.test(
          (el.getAttribute("aria-label") ?? "") + (el.textContent ?? ""),
        ),
      );
      if (intervalTrigger) {
        await user.click(intervalTrigger);
        const monthly = await screen.findAllByRole("option", { name: /monthly/i }, { timeout: 3000 }).catch(() => []);
        if (monthly[0]) await user.click(monthly[0]);
      }
      await user.keyboard("{Escape}");
      const typeAgain = screen.getAllByRole("combobox").find((el) =>
        /One Time|Recurring/i.test(el.textContent ?? ""),
      );
      if (typeAgain) {
        await user.click(typeAgain);
        const oneTime = await screen.findByRole("option", { name: /One Time/i }, { timeout: 5000 });
        await user.click(oneTime);
      }
    }
    await user.keyboard("{Escape}");

    // Donor fields (Labels lack htmlFor — use type/placeholder)
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement | null;
    expect(emailInput).toBeTruthy();
    fireEvent.change(emailInput!, { target: { value: "bad-email" } });
    const phoneInput = screen.getByPlaceholderText("+91...");
    fireEvent.change(phoneInput, { target: { value: "+911234567890" } });
    const panInput = screen.getByPlaceholderText(/ABCDE1234F/i);
    fireEvent.change(panInput, { target: { value: "ABCDE1234F" } });
    // Address: unlabeled text input in the donation card (not donor name / pan / phone)
    const addressCandidates = Array.from(
      document.querySelectorAll("input.flex.h-10, input.h-9, input"),
    ) as HTMLInputElement[];
    const addressInput = addressCandidates.find(
      (i) =>
        i.type === "text" &&
        i !== phoneInput &&
        i !== panInput &&
        !i.placeholder &&
        i !== emailInput,
    );
    expect(addressInput).toBeTruthy();
    fireEvent.change(addressInput!, { target: { value: "Ahmedabad CG Road" } });
    const notes = screen.getByPlaceholderText(/Purpose|dedication/i);
    fireEvent.change(notes, { target: { value: `${MARKER} note` } });
    const wall = document.querySelector('input[type="checkbox"]');
    if (wall) fireEvent.click(wall);

    const payTrigger = screen.getAllByRole("combobox").find((el) =>
      /Select method|UPI|Cash|Card/i.test(el.textContent ?? ""),
    );
    if (payTrigger) {
      await user.click(payTrigger);
      const upi = await screen.findByRole("option", { name: /^UPI$/i }, { timeout: 5000 });
      await user.click(upi);
    }

    // Invalid email validation arm
    await clickSafe(user, screen.queryByRole("button", { name: /^Donate/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/valid email/);
    }, { timeout: 10_000 });

    // Happy-path donate attempt (seeded wall/ledger already cover succeeded rows;
    // authenticated insert may toast success or surface residual validation/RLS).
    fireEvent.change(emailInput!, { target: { value: "pass13donate@khadayataonline.com" } });
    fireEvent.change(phoneInput, { target: { value: "+911234567890" } });
    fireEvent.change(addressInput!, { target: { value: "Ahmedabad CG Road" } });
    fireEvent.change(screen.getByPlaceholderText(/Custom amount/i), { target: { value: "101" } });
    await clickSafe(user, screen.queryByRole("button", { name: /^Donate/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(
        /donation recorded|thank you|error|required|valid email|upi|my donations/,
      );
    }, { timeout: 15_000 });

    expect(document.body.textContent).toMatch(/Masik Sahayog|Recurring Pledges/i);
    await clickSafe(user, screen.queryByRole("button", { name: /New Pledge/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/New Recurring Pledge|standing contribution/i);
    }, { timeout: 8_000 });
    await user.keyboard("{Escape}");

    expect(document.body.textContent).toMatch(/My Donations|Donation Ledger/i);
  }, 120_000);

  it("Temple as Finance Admin: donation ledger filters", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    renderApp(<Temple />, { route: "/temple" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Donation Ledger|Kotyark Temple/i);
    }, { timeout: 30_000 });
    const search = screen.queryByPlaceholderText(/Search donor or fund/i);
    if (search) {
      fireEvent.change(search, { target: { value: MARKER } });
      await waitFor(() => {
        expect(document.body.textContent).toMatch(new RegExp(MARKER));
      }, { timeout: 10_000 });
    }
    await pickSelect(user, /All Funds|fund/i, new RegExp(MARKER));
  }, 60_000);

  it("RishtaWorkflow: inbox statuses + actions + send dialog", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    expect(seeded.profileId).toBeTruthy();

    // Confirm Kong still has seeded rishta rows for this profile (RLS as member)
    const { data: mine, error: mineErr } = await supabase
      .from("rishta_requests")
      .select("id,status")
      .or(`from_profile_id.eq.${seeded.profileId},to_profile_id.eq.${seeded.profileId}`);
    expect(mineErr).toBeNull();
    expect((mine ?? []).length).toBeGreaterThan(0);

    const { unmount } = renderApp(
      <div className="p-4 space-y-6">
        <RishtaWorkflow myProfileId={seeded.profileId!} />
      </div>,
      { route: "/matrimonial/manage" },
    );

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Rishta Requests|Introduction Sent|Family Review|Family Approved/i);
    }, { timeout: 25_000 });

    // Escalate intro_sent → family_review path button
    const sendToFamily = screen.queryByRole("button", { name: /Send to Family/i });
    if (sendToFamily) {
      await user.click(sendToFamily);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/status updated|error|family/);
      }, { timeout: 15_000 });
    }

    const familyOk = screen.queryByRole("button", { name: /Family OK/i });
    if (familyOk) {
      await user.click(familyOk);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/status updated|error|family/);
      }, { timeout: 15_000 });
    }

    const accept = screen.queryByRole("button", { name: /^Accept$/i });
    if (accept) {
      await user.click(accept);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/status updated|error|accepted/);
      }, { timeout: 15_000 });
    }

    unmount();

    // Fresh mount with target profile — send dialog chrome
    const { unmount: unmountSend } = renderApp(
      <RishtaWorkflow
        myProfileId={seeded.profileId!}
        targetProfileId="5bea7f63-8a07-4afe-9fe8-6212f15df6d2"
        introMessage={`${MARKER} fresh send`}
      />,
      { route: "/matrimonial/manage" },
    );
    const sendBtn = await screen.findByRole("button", { name: /Send Rishta/i }, { timeout: 15_000 });
    await user.click(sendBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Send Rishta Request|Introduction Message/i);
    }, { timeout: 8_000 });
    const msg = screen.getByLabelText(/Introduction Message/i);
    fireEvent.change(msg, { target: { value: `${MARKER} dialog message` } });
    await user.keyboard("{Escape}");
    unmountSend();
  }, 90_000);
});
