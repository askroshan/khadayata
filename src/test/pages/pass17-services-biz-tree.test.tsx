/**
 * Pass 17 — Services + Business create mutations + FamilyTree → 100% lines
 * against real Kong :54331 / khadayata_local. Disposable covsbt_* rows only.
 * No MSW / fixture JSON for view domain data.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Services from "@/pages/Services";
import Business from "@/pages/Business";
import { FamilyTree } from "@/components/profile/FamilyTree";
import { Toaster } from "@/components/ui/toaster";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";
const CITY_AHM = "e1000001-0000-0000-0000-000000000001";
const PREFIX = `covsbt_${Date.now().toString(36)}`;
/** SUNITA Shah — stable relative for family_links seeds. */
const RELATIVE_A = "84344db8-9f78-40ac-899c-80b833452812";
/** Invite Cov — second relative / unclassified relation. */
const RELATIVE_B = "8c165b24-6308-4a5e-ab07-49a4b2475fd9";

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
  psql(`
    ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
    UPDATE members SET verification_level = ${Number(level)} WHERE id = '${memberId}';
    ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;
  `);
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

async function currentMemberId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no user");
  const { data } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
  if (!data?.id) throw new Error("no member row");
  return data.id;
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

function forceClick(el: HTMLElement | null | undefined) {
  if (!el) return;
  fireEvent.click(el);
}

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function setNear(label: RegExp, value: string) {
  const labels = Array.from(document.querySelectorAll("label")).filter((n) => label.test(n.textContent ?? ""));
  for (const lab of labels) {
    const root = lab.parentElement;
    const input = root?.querySelector("input, textarea") as HTMLInputElement | null;
    if (input && !["checkbox", "radio", "file", "hidden"].includes(input.type) && !input.disabled) {
      fireEvent.change(input, { target: { value } });
      return true;
    }
  }
  const ph = screen.queryByPlaceholderText(label);
  if (ph) {
    fireEvent.change(ph, { target: { value } });
    return true;
  }
  return false;
}

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement | null | undefined,
  option: RegExp,
) {
  if (!trigger) return;
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 4000 }).catch(() => []);
  const match = opts.find((o) => option.test(o.textContent ?? ""));
  if (match) await clickSafe(user, match);
}

async function pickNearLabel(user: ReturnType<typeof userEvent.setup>, label: RegExp, option: RegExp) {
  const labels = Array.from(document.querySelectorAll("label")).filter((n) => label.test(n.textContent ?? ""));
  for (const lab of labels) {
    const root = lab.parentElement;
    const trigger = root?.querySelector('[role="combobox"]') as HTMLElement | null;
    if (trigger) {
      await pickSelectOption(user, trigger, option);
      return true;
    }
  }
  return false;
}

function closeDialogs() {
  for (let i = 0; i < 3; i++) fireEvent.keyDown(document, { key: "Escape" });
}

const seeded = {
  memberId: null as string | null,
  prevVerification: 0,
  bookingIds: [] as string[],
  aidIds: [] as string[],
  familyLinkIds: [] as string[],
  bizIds: [] as string[],
  jobIds: [] as string[],
};

async function cleanupAll() {
  const admin = adminClient();
  if (seeded.jobIds.length) await admin.from("jobs").delete().in("id", seeded.jobIds);
  await admin.from("jobs").delete().ilike("title", `${PREFIX}%`);
  if (seeded.bizIds.length) await admin.from("businesses").delete().in("id", seeded.bizIds);
  await admin.from("businesses").delete().ilike("name", `${PREFIX}%`);
  if (seeded.familyLinkIds.length) await admin.from("family_links").delete().in("id", seeded.familyLinkIds);
  if (seeded.memberId) {
    await admin.from("family_links").delete().eq("member_id", seeded.memberId).in("related_member_id", [
      RELATIVE_A,
      RELATIVE_B,
    ]);
  }
  if (seeded.aidIds.length) await admin.from("medical_aid_requests").delete().in("id", seeded.aidIds);
  await admin.from("medical_aid_requests").delete().ilike("patient_name", `${PREFIX}%`);
  if (seeded.bookingIds.length) await admin.from("hall_bookings").delete().in("id", seeded.bookingIds);
  await admin.from("hall_bookings").delete().ilike("hall_name", `${PREFIX}%`);
  try {
    psql(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.hall_bookings TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_aid_requests TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
      GRANT SELECT ON public.family_links TO authenticated;
    `);
  } catch {
    /* best-effort */
  }
  if (seeded.memberId) {
    try {
      setVerificationLevelSql(seeded.memberId, seeded.prevVerification);
    } catch {
      /* best-effort */
    }
  }
}

async function refreshCreatedIds() {
  const admin = adminClient();
  const { data: extraBookings } = await admin.from("hall_bookings").select("id").ilike("hall_name", `${PREFIX}%`);
  seeded.bookingIds = [...new Set([...(extraBookings ?? []).map((r) => r.id)])];
  const { data: extraAids } = await admin
    .from("medical_aid_requests")
    .select("id")
    .ilike("patient_name", `${PREFIX}%`);
  seeded.aidIds = [...new Set([...(extraAids ?? []).map((r) => r.id)])];
  const { data: bizRows } = await admin.from("businesses").select("id").ilike("name", `${PREFIX}%`);
  seeded.bizIds = (bizRows ?? []).map((r) => r.id);
  const { data: jobRows } = await admin.from("jobs").select("id").ilike("title", `${PREFIX}%`);
  seeded.jobIds = (jobRows ?? []).map((r) => r.id);
}

describe("Pass 17 — Services / Business / FamilyTree (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.member.email);
    const memberId = await currentMemberId();
    seeded.memberId = memberId;

    const { data: memRow } = await admin.from("members").select("verification_level").eq("id", memberId).single();
    seeded.prevVerification = (memRow?.verification_level as number) ?? 0;
    setVerificationLevelSql(memberId, 2);
    await signIn(E2E_ACCOUNTS.member.email);

    const { data: bookings, error: bErr } = await admin
      .from("hall_bookings")
      .insert([
        {
          member_id: memberId,
          chapter_id: AHMEDABAD,
          hall_name: `${PREFIX} Community Hall`,
          purpose: "Wedding reception",
          booking_date: "2026-12-15",
          start_time: "10:00",
          end_time: "18:00",
          guests: 120,
          notes: "Coverage seed",
          status: "pending",
        },
        {
          member_id: memberId,
          chapter_id: AHMEDABAD,
          hall_name: `${PREFIX} Meeting Room`,
          purpose: null,
          booking_date: "2026-11-20",
          start_time: "09:00",
          end_time: "12:00",
          guests: 0,
          status: "approved",
        },
      ])
      .select("id");
    if (bErr) throw bErr;
    seeded.bookingIds = (bookings ?? []).map((r) => r.id);

    const { data: aids, error: aErr } = await admin
      .from("medical_aid_requests")
      .insert([
        {
          member_id: memberId,
          chapter_id: AHMEDABAD,
          patient_name: `${PREFIX} Patient One`,
          relation: "spouse",
          condition_summary: "Coverage surgery assist",
          amount_needed: 50000,
          approved_amount: 25000,
          currency: "INR",
          status: "approved",
        },
        {
          member_id: memberId,
          chapter_id: AHMEDABAD,
          patient_name: `${PREFIX} Patient Two`,
          relation: "self",
          condition_summary: null,
          amount_needed: null,
          currency: "USD",
          status: "pending",
        },
      ])
      .select("id");
    if (aErr) throw aErr;
    seeded.aidIds = (aids ?? []).map((r) => r.id);

    const { data: links, error: lErr } = await admin
      .from("family_links")
      .insert([
        { member_id: memberId, relation: "spouse", related_member_id: RELATIVE_A },
        { member_id: memberId, relation: "father", related_member_id: RELATIVE_B },
        { member_id: memberId, relation: "godfather", related_member_id: RELATIVE_A },
      ])
      .select("id");
    if (lErr) throw lErr;
    seeded.familyLinkIds = (links ?? []).map((r) => r.id);

    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_member_id: memberId,
        chapter_id: AHMEDABAD,
        name: `${PREFIX} Seeded Biz LLP`,
        sector: "Technology",
        description: "Seed listing for jobs employer join.",
        website: "https://example.com/covsbt",
        phone: "+919800000010",
        address_line1: "CG Road",
        country_id: INDIA,
        state_id: GUJARAT,
        city_id: CITY_AHM,
        founded_year: 2016,
        employee_count: "11-50",
        tags: ["coverage", "seed"],
        verified: true,
      })
      .select("id")
      .single();
    if (bizErr) throw bizErr;
    seeded.bizIds.push(biz.id);

    const { data: jobs, error: jobErr } = await admin
      .from("jobs")
      .insert([
        {
          employer_member_id: memberId,
          employer_business_id: biz.id,
          chapter_id: AHMEDABAD,
          title: `${PREFIX} Seeded Full Stack`,
          description: "Seeded open role with salary, remote, skills, benefits.",
          location: "Ahmedabad",
          remote: true,
          employment_type: "full_time",
          salary_min: 700000,
          salary_max: 1200000,
          salary_currency: "INR",
          salary_period: "annual",
          experience_min: 2,
          experience_max: 5,
          education_required: "B.Tech",
          skills_required: ["React", "TypeScript"],
          benefits: ["PF", "Health"],
          positions_available: 3,
          status: "open",
          country_id: INDIA,
          state_id: GUJARAT,
          city_id: CITY_AHM,
        },
        {
          employer_member_id: memberId,
          chapter_id: AHMEDABAD,
          title: `${PREFIX} Seeded Volunteer`,
          description: "No salary volunteer listing.",
          location: "Remote",
          remote: true,
          employment_type: "volunteer",
          status: "open",
          positions_available: 1,
        },
      ])
      .select("id");
    if (jobErr) throw jobErr;
    seeded.jobIds.push(...(jobs ?? []).map((r) => r.id));
  }, 120_000);

  afterAll(async () => {
    cleanup();
    await cleanupAll();
  }, 60_000);

  it("Services: lists + hall validation/create + hall onError", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = makeUser();
    cleanup();

    renderApp(withToaster(<Services />), { route: "/services#medical" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Patient`));
    }, { timeout: 30_000 });
    expect(document.body.textContent).toMatch(/Approved:|Coverage surgery|Patient Two/i);

    cleanup();
    renderApp(withToaster(<Services />), { route: "/services#hall" });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} Community Hall`);
    }, { timeout: 30_000 });
    expect(document.body.textContent).toMatch(/Wedding reception|120 guests|Meeting Room/i);

    forceClick(screen.queryByRole("button", { name: /Book Hall/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Request Hall Booking/i);
    }, { timeout: 8_000 });
    forceClick(screen.queryByRole("button", { name: /Submit Request/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Hall \/ Venue Name is required|Booking Date is required/i);
    }, { timeout: 5_000 });

    setNear(/Hall \/ Venue Name/i, `${PREFIX} Live Hall`);
    forceClick(screen.queryByRole("button", { name: /Submit Request/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Booking Date is required/i);
    }, { timeout: 5_000 });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    setNear(/^Date/i, dateStr);
    setNear(/Purpose/i, "Coverage seminar");
    setNear(/Guests/i, "25");
    setNear(/Notes/i, "Pass17 hall notes");
    const timeInputs = Array.from(document.querySelectorAll('input[type="time"]')) as HTMLInputElement[];
    if (timeInputs[0]) fireEvent.change(timeInputs[0], { target: { value: "11:00" } });
    if (timeInputs[1]) fireEvent.change(timeInputs[1], { target: { value: "15:00" } });
    forceClick(screen.queryByRole("button", { name: /Submit Request/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Booking request submitted/i);
    }, { timeout: 20_000 });
    closeDialogs();

    // hall onError
    try {
      psql("REVOKE INSERT ON public.hall_bookings FROM authenticated;");
      forceClick(screen.queryByRole("button", { name: /Book Hall/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Request Hall Booking/i), { timeout: 8_000 });
      setNear(/Hall \/ Venue Name/i, `${PREFIX} Err Hall`);
      setNear(/^Date/i, dateStr);
      forceClick(screen.queryByRole("button", { name: /Submit Request/i }));
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/permission denied|Error|denied/i);
      }, { timeout: 15_000 });
    } finally {
      try {
        psql("GRANT INSERT ON public.hall_bookings TO authenticated;");
      } catch {
        /* restore */
      }
    }
    closeDialogs();
    await refreshCreatedIds();
    void user;
  }, 120_000);

  it("Services: medical create + onError", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    cleanup();
    renderApp(withToaster(<Services />), { route: "/services#medical" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Patient`));
    }, { timeout: 30_000 });

    forceClick(screen.queryByRole("button", { name: /Request Aid/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Request Medical Aid/i);
    }, { timeout: 8_000 });
    setNear(/Patient Name/i, `${PREFIX} Live Patient`);
    await pickNearLabel(makeUser(), /Relation/i, /child/i);
    setNear(/Condition Summary/i, "Fever coverage case");
    setNear(/Amount Needed/i, "15000");
    await pickNearLabel(makeUser(), /Currency/i, /^USD$/);
    forceClick(screen.queryByRole("button", { name: /Submit Request/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Medical aid request submitted/i);
    }, { timeout: 20_000 });
    closeDialogs();

    try {
      psql("REVOKE INSERT ON public.medical_aid_requests FROM authenticated;");
      forceClick(screen.queryByRole("button", { name: /Request Aid/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Request Medical Aid/i), { timeout: 8_000 });
      setNear(/Patient Name/i, `${PREFIX} Err Patient`);
      forceClick(screen.queryByRole("button", { name: /Submit Request/i }));
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/permission denied|Error|denied/i);
      }, { timeout: 15_000 });
    } finally {
      try {
        psql("GRANT INSERT ON public.medical_aid_requests TO authenticated;");
      } catch {
        /* restore */
      }
    }
    closeDialogs();
    await refreshCreatedIds();
  }, 90_000);

  it("Business: createBiz success + onError", async () => {
    if (seeded.memberId) setVerificationLevelSql(seeded.memberId, 2);
    await signIn(E2E_ACCOUNTS.member.email);
    cleanup();
    renderApp(withToaster(<Business />), { route: "/business/manage" });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^List Business$/i })).toBeTruthy();
    }, { timeout: 30_000 });

    forceClick(screen.queryByRole("button", { name: /^List Business$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/List Your Business|Business Name/i);
    }, { timeout: 8_000 });

    setNear(/Business Name/i, `${PREFIX} Live Biz LLP`);
    await pickNearLabel(makeUser(), /^Sector$/i, /Technology/i);
    setNear(/Founded Year/i, "2018");
    setNear(/^Description$/i, "Pass17 business listing with full profile fields.");
    setNear(/^Phone$/i, "+919811122233");
    setNear(/^Email$/i, "pass17biz@example.com");
    setNear(/^Website$/i, "https://example.com/pass17");
    await pickNearLabel(makeUser(), /Employees/i, /11-50/);
    setNear(/Address Line 1/i, "CG Road");
    setNear(/Address Line 2/i, "Navrangpura");
    setNear(/Postal Code/i, "380009");
    setNear(/GST Number/i, "22AAAAA0000A1Z5");
    setNear(/License Number/i, "LIC-17");
    setNear(/Tags/i, "coverage, saas");
    forceClick(screen.queryByRole("button", { name: /Submit Business/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Business listed/i);
    }, { timeout: 20_000 });
    closeDialogs();

    forceClick(screen.queryByRole("button", { name: /^List Business$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/List Your Business/i), { timeout: 8_000 });
    setNear(/Business Name/i, `${PREFIX} Err Biz`);
    try {
      psql("REVOKE INSERT ON public.businesses FROM authenticated;");
      forceClick(screen.queryByRole("button", { name: /Submit Business/i }));
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/permission denied|Error|denied/i);
      }, { timeout: 15_000 });
    } finally {
      try {
        psql("GRANT INSERT ON public.businesses TO authenticated;");
      } catch {
        /* restore */
      }
    }
    closeDialogs();
    await refreshCreatedIds();
  }, 90_000);

  it("Business: jobs list + createJob success + onError + Applied badge", async () => {
    if (seeded.memberId) setVerificationLevelSql(seeded.memberId, 2);
    await signIn(E2E_ACCOUNTS.member.email);
    const user = makeUser();
    const admin = adminClient();
    const { count } = await admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .ilike("title", `${PREFIX}%`);
    expect(count ?? 0).toBeGreaterThan(0);

    // Pre-seed application so Applied badge is deterministic after remount
    const volunteerId = seeded.jobIds.find(Boolean);
    const { data: vol } = await admin
      .from("jobs")
      .select("id")
      .ilike("title", `${PREFIX} Seeded Volunteer`)
      .maybeSingle();
    const applyJobId = vol?.id ?? volunteerId;
    if (applyJobId && seeded.memberId) {
      await admin.from("job_applications").delete().eq("job_id", applyJobId).eq("member_id", seeded.memberId);
      await admin.from("job_applications").insert({ job_id: applyJobId, member_id: seeded.memberId });
    }

    cleanup();
    renderApp(withToaster(<Business />), { route: "/business/manage" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Business & Jobs/i);
    }, { timeout: 30_000 });

    // Switch to Jobs tab via userEvent (forceClick alone can miss Radix tabs)
    const jobsTab =
      screen.queryByRole("tab", { name: /Jobs/i }) ??
      Array.from(document.querySelectorAll('[role="tab"]')).find((t) => /Jobs/i.test(t.textContent ?? ""));
    expect(jobsTab).toBeTruthy();
    await clickSafe(user, jobsTab as HTMLElement);
    // Fallback: set tab via clicking text if still on businesses
    if (!screen.queryByLabelText(/Search jobs/i)) {
      forceClick(jobsTab as HTMLElement);
    }

    await waitFor(() => {
      expect(
        screen.queryByLabelText(/Search jobs/i) ||
          screen.queryByRole("button", { name: /Post Job/i }) ||
          document.body.textContent?.match(/No open jobs/i),
      ).toBeTruthy();
    }, { timeout: 20_000 });

    await waitFor(() => {
      const body = document.body.textContent ?? "";
      expect(
        body.includes(`${PREFIX} Seeded Full Stack`) ||
          body.includes(`${PREFIX} Seeded Volunteer`) ||
          /Apply Now|Applied|No open jobs/i.test(body),
      ).toBe(true);
    }, { timeout: 30_000 });

    const jobSearch = screen.getByLabelText(/Search jobs/i);
    fireEvent.change(jobSearch, { target: { value: PREFIX } });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(PREFIX));
    }, { timeout: 15_000 });

    // Open Post Job (L2)
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Post Job/i })).toBeTruthy();
    }, { timeout: 15_000 });
    await clickSafe(user, screen.queryByRole("button", { name: /Post Job/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Post a Job|Job Title/i);
    }, { timeout: 8_000 });

    setNear(/Job Title/i, `${PREFIX} Coverage Engineer`);
    setNear(/^Description$/i, "Build coverage suites against Kong.");
    await pickNearLabel(user, /Employment Type/i, /Contract/i);
    setNear(/Positions Available/i, "2");
    setNear(/Salary Min/i, "600000");
    setNear(/Salary Max/i, "900000");
    await pickNearLabel(user, /^Currency$/i, /^USD$/);
    await pickNearLabel(user, /^Period$/i, /monthly/i);
    setNear(/Experience Min/i, "1");
    setNear(/Experience Max/i, "4");
    setNear(/Education Required/i, "B.Tech");
    setNear(/^Location$/i, "Ahmedabad");
    const remote = screen.queryByText(/Remote allowed/i)?.closest("label")?.querySelector("input");
    if (remote) fireEvent.click(remote);
    setNear(/Required Skills/i, "React, Vitest");
    setNear(/^Benefits/i, "PF, Health");
    setNear(/Contact Email/i, "jobs@example.com");
    setNear(/Contact Phone/i, "+919800000099");
    setNear(/Application URL/i, "https://example.com/apply");

    // Dialog footer submit — last Post Job button
    const submitBtns = screen.queryAllByRole("button", { name: /^Post Job$/i });
    forceClick(submitBtns[submitBtns.length - 1] ?? submitBtns[0]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Job posted/i);
    }, { timeout: 20_000 });
    closeDialogs();

    // Remount on jobs-oriented view; Applied badge for pre-seeded application
    cleanup();
    renderApp(withToaster(<Business />), { route: "/business/manage" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Business & Jobs/i), { timeout: 25_000 });
    const jobsTab2 =
      screen.queryByRole("tab", { name: /Jobs/i }) ??
      Array.from(document.querySelectorAll('[role="tab"]')).find((t) => /Jobs/i.test(t.textContent ?? ""));
    await clickSafe(user, jobsTab2 as HTMLElement);
    await waitFor(() => expect(screen.queryByLabelText(/Search jobs/i)).toBeTruthy(), { timeout: 15_000 });
    fireEvent.change(screen.getByLabelText(/Search jobs/i), {
      target: { value: `${PREFIX} Seeded Volunteer` },
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Applied/i);
    }, { timeout: 25_000 });

    await clickSafe(user, screen.queryByRole("button", { name: /Post Job/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Post a Job|Job Title/i), { timeout: 8_000 });
    setNear(/Job Title/i, `${PREFIX} Err Job`);
    try {
      psql("REVOKE INSERT ON public.jobs FROM authenticated;");
      const errSubmit = screen.queryAllByRole("button", { name: /^Post Job$/i });
      forceClick(errSubmit[errSubmit.length - 1] ?? errSubmit[0]);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/permission denied|Error|denied/i);
      }, { timeout: 15_000 });
    } finally {
      try {
        psql("GRANT INSERT ON public.jobs TO authenticated;");
      } catch {
        /* restore */
      }
    }
    closeDialogs();
    if (applyJobId && seeded.memberId) {
      await admin.from("job_applications").delete().eq("job_id", applyJobId).eq("member_id", seeded.memberId);
    }
    await refreshCreatedIds();
  }, 180_000);

  it("FamilyTree: grouped relations, other bucket, empty, error+retry", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const memberId = seeded.memberId ?? (await currentMemberId());
    cleanup();

    renderApp(<FamilyTree memberId={memberId} />, { route: "/profile" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Family Connections|Spouse|Father|Other Relations/i);
    }, { timeout: 25_000 });
    expect(document.body.textContent).toMatch(/SUNITA|Invite|Spouse|Father|Other/i);

    cleanup();
    renderApp(<FamilyTree memberId={RELATIVE_A} />, { route: "/profile" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No family connections linked yet/i);
    }, { timeout: 20_000 });

    cleanup();
    try {
      psql("REVOKE SELECT ON public.family_links FROM authenticated;");
      renderApp(<FamilyTree memberId={memberId} />, { route: "/profile" });
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Unable to load family data/i);
      }, { timeout: 20_000 });
      const retry = screen.getByRole("button", { name: /Retry/i });
      psql("GRANT SELECT ON public.family_links TO authenticated;");
      fireEvent.click(retry);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Family Connections|Spouse|Father/i);
      }, { timeout: 25_000 });
    } finally {
      try {
        psql("GRANT SELECT ON public.family_links TO authenticated;");
      } catch {
        /* restore */
      }
    }
  }, 120_000);
});
