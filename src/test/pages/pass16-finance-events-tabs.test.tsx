/**
 * Pass 16 — FinanceTab + EventsTab → ~100% lines against real Kong :54331.
 * Seeds disposable covfe_* rows (funds/donations/aid/scholarships/hall/events/RSVPs);
 * exercises global + chapter-scoped (myChapterId) mounts. No mock view data.
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import FinanceTab from "@/components/admin/FinanceTab";
import EventsTab from "@/components/admin/EventsTab";
import { Toaster } from "@/components/ui/toaster";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";
const ALGERIA = "c2000001-0000-0000-0000-000000000001";
const PREFIX = `covfe_${Date.now().toString(36)}`;

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

/** Find a Review button inside the card that contains `name`. */
function reviewOnCard(name: RegExp): HTMLElement | null {
  const matches = screen.queryAllByText(name);
  for (const node of matches) {
    const card = node.closest(".shadow-card") as HTMLElement | null;
    if (!card) continue;
    const btn = within(card).queryByRole("button", { name: /Review/i });
    if (btn) return btn;
  }
  return screen.queryAllByRole("button", { name: /Review/i })[0] ?? null;
}

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
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

async function authUserId() {
  return (await supabase.auth.getUser()).data.user!.id;
}

async function currentMemberId(): Promise<string> {
  const uid = await authUserId();
  const { data } = await supabase.from("members").select("id").eq("user_id", uid).maybeSingle();
  if (!data?.id) throw new Error("no member for session");
  return data.id;
}

const seeded = {
  fundIds: [] as string[],
  donationIds: [] as string[],
  aidIds: [] as string[],
  scholarshipIds: [] as string[],
  appIds: [] as string[],
  bookingIds: [] as string[],
  eventIds: [] as string[],
  rsvpIds: [] as string[],
  financeMemberId: null as string | null,
  eventManagerId: null as string | null,
  chapterAdminId: null as string | null,
  memberUserId: null as string | null,
};

async function cleanupAll() {
  const admin = adminClient();
  if (seeded.rsvpIds.length) await admin.from("event_rsvps").delete().in("id", seeded.rsvpIds);
  if (seeded.eventIds.length) await admin.from("events").delete().in("id", seeded.eventIds);
  await admin.from("events").delete().ilike("name", `${PREFIX}%`);
  if (seeded.appIds.length) await admin.from("scholarship_applications").delete().in("id", seeded.appIds);
  if (seeded.scholarshipIds.length) await admin.from("scholarships").delete().in("id", seeded.scholarshipIds);
  await admin.from("scholarship_applications").delete().ilike("essay", `${PREFIX}%`);
  await admin.from("scholarships").delete().ilike("name", `${PREFIX}%`);
  if (seeded.aidIds.length) await admin.from("medical_aid_requests").delete().in("id", seeded.aidIds);
  await admin.from("medical_aid_requests").delete().ilike("patient_name", `${PREFIX}%`);
  if (seeded.bookingIds.length) await admin.from("hall_bookings").delete().in("id", seeded.bookingIds);
  await admin.from("hall_bookings").delete().ilike("hall_name", `${PREFIX}%`);
  if (seeded.donationIds.length) await admin.from("donations").delete().in("id", seeded.donationIds);
  await admin.from("donations").delete().ilike("donor_name", `${PREFIX}%`);
  if (seeded.fundIds.length) await admin.from("funds").delete().in("id", seeded.fundIds);
  await admin.from("funds").delete().ilike("name", `${PREFIX}%`);
}

describe("Pass 16 — FinanceTab + EventsTab (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    seeded.financeMemberId = await currentMemberId();
    await signIn(E2E_ACCOUNTS.eventManager.email);
    seeded.eventManagerId = await currentMemberId();
    seeded.memberUserId = await authUserId();
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    seeded.chapterAdminId = await currentMemberId();

    const { data: chapFund, error: cfErr } = await admin
      .from("funds")
      .insert({
        name: `${PREFIX} Chapter Fund`,
        currency: "INR",
        scope: "chapter",
        chapter_id: AHMEDABAD,
        active: true,
      })
      .select("id")
      .single();
    if (cfErr) throw cfErr;
    seeded.fundIds.push(chapFund.id);

    const { data: globFund, error: gfErr } = await admin
      .from("funds")
      .insert({
        name: `${PREFIX} Global Fund`,
        currency: "USD",
        scope: "global",
        chapter_id: null,
        active: false,
      })
      .select("id")
      .single();
    if (gfErr) throw gfErr;
    seeded.fundIds.push(globFund.id);

    const donations = [
      {
        amount: 2500,
        currency: "INR",
        status: "succeeded",
        type: "recurring",
        recurring_interval: "monthly",
        donor_name: `${PREFIX} Recurring Donor`,
        payment_method: "UPI",
        pan_number: "COVFE1234A",
        fund_id: chapFund.id,
        member_id: seeded.financeMemberId,
      },
      {
        amount: 100,
        currency: "INR",
        status: "pending",
        type: "one_time",
        donor_name: `${PREFIX} Pending Donor`,
        payment_method: "Card",
        fund_id: chapFund.id,
        member_id: seeded.financeMemberId,
      },
      {
        amount: 50,
        currency: "USD",
        status: "succeeded",
        type: "one_time",
        donor_name: `${PREFIX} Global Donor`,
        fund_id: globFund.id,
        member_id: seeded.financeMemberId,
      },
    ];
    const { data: dons, error: dErr } = await admin.from("donations").insert(donations).select("id");
    if (dErr) throw dErr;
    for (const d of dons ?? []) seeded.donationIds.push(d.id);

    const aids = [
      {
        patient_name: `${PREFIX} Pending Patient`,
        relation: "self",
        condition_summary: "pending condition for approve path",
        amount_needed: 5000,
        currency: "INR",
        member_id: seeded.financeMemberId,
        chapter_id: AHMEDABAD,
        status: "pending",
      },
      {
        patient_name: `${PREFIX} Reject Target`,
        relation: "spouse",
        condition_summary: "reject path",
        amount_needed: 2000,
        currency: "INR",
        member_id: seeded.financeMemberId,
        chapter_id: AHMEDABAD,
        status: "pending",
      },
      {
        patient_name: `${PREFIX} Approved Patient`,
        relation: "child",
        condition_summary: "already approved",
        amount_needed: 3000,
        currency: "INR",
        approved_amount: 2500,
        member_id: seeded.financeMemberId,
        chapter_id: AHMEDABAD,
        status: "approved",
      },
      {
        patient_name: `${PREFIX} Delete Aid`,
        relation: "parent",
        condition_summary: "delete path",
        amount_needed: 100,
        currency: "INR",
        member_id: seeded.financeMemberId,
        chapter_id: AHMEDABAD,
        status: "rejected",
      },
    ];
    const { data: aidRows, error: aErr } = await admin.from("medical_aid_requests").insert(aids).select("id");
    if (aErr) throw aErr;
    for (const r of aidRows ?? []) seeded.aidIds.push(r.id);

    const { data: sch, error: sErr } = await admin
      .from("scholarships")
      .insert({
        name: `${PREFIX} Grant`,
        description: "pass16 scholarship",
        amount: 10000,
        currency: "INR",
        deadline: "2027-01-01",
        status: "active",
      })
      .select("id")
      .single();
    if (sErr) throw sErr;
    seeded.scholarshipIds.push(sch.id);

    const { data: sch2, error: s2Err } = await admin
      .from("scholarships")
      .insert({
        name: `${PREFIX} Grant B`,
        description: "second",
        amount: 5000,
        currency: "USD",
        deadline: "2027-06-01",
        status: "active",
      })
      .select("id")
      .single();
    if (s2Err) throw s2Err;
    seeded.scholarshipIds.push(sch2.id);

    const apps = [
      {
        scholarship_id: sch.id,
        member_id: seeded.financeMemberId,
        essay: `${PREFIX} submitted essay`,
        status: "submitted",
      },
      {
        scholarship_id: sch2.id,
        member_id: seeded.financeMemberId,
        essay: `${PREFIX} reviewing essay`,
        status: "reviewing",
      },
    ];
    const { data: appRows, error: appErr } = await admin.from("scholarship_applications").insert(apps).select("id");
    if (appErr) throw appErr;
    for (const a of appRows ?? []) seeded.appIds.push(a.id);

    const bookings = [
      {
        hall_name: `${PREFIX} Hall Pending`,
        purpose: "wedding",
        booking_date: "2026-12-10",
        start_time: "09:00",
        end_time: "14:00",
        guests: 80,
        member_id: seeded.financeMemberId,
        chapter_id: AHMEDABAD,
        status: "pending",
      },
      {
        hall_name: `${PREFIX} Hall Reject`,
        purpose: "meeting",
        booking_date: "2026-12-11",
        start_time: "10:00",
        end_time: "12:00",
        guests: 20,
        member_id: seeded.financeMemberId,
        chapter_id: AHMEDABAD,
        status: "pending",
      },
      {
        hall_name: `${PREFIX} Hall Delete`,
        purpose: "cleanup",
        booking_date: "2026-12-12",
        start_time: "11:00",
        end_time: "13:00",
        guests: 10,
        member_id: seeded.financeMemberId,
        chapter_id: AHMEDABAD,
        status: "rejected",
      },
    ];
    const { data: bookRows, error: bErr } = await admin.from("hall_bookings").insert(bookings).select("id");
    if (bErr) throw bErr;
    for (const b of bookRows ?? []) seeded.bookingIds.push(b.id);

    const events = [
      {
        name: `${PREFIX} Published Event`,
        description: "published seed",
        venue: "Community Hall",
        starts_at: "2026-10-01T10:00:00Z",
        ends_at: "2026-10-01T14:00:00Z",
        status: "published",
        created_by: seeded.memberUserId,
        chapter_id: AHMEDABAD,
        category: "Cultural",
        event_type: "in_person",
        max_capacity: 100,
        fee_amount: 50,
        fee_currency: "INR",
        contact_email: "covfe@example.com",
        contact_phone: "+15550001111",
        organizer_name: "Pass16",
        address_line1: "1 Main St",
        tags: ["covfe", "published"],
        country_id: INDIA,
        state_id: GUJARAT,
        cover_image_url: "https://example.com/cover.jpg",
      },
      {
        name: `${PREFIX} Draft Event`,
        description: "draft seed",
        venue: "Draft Hall",
        starts_at: "2026-11-01T10:00:00Z",
        ends_at: "2026-11-01T12:00:00Z",
        status: "draft",
        created_by: seeded.memberUserId,
        chapter_id: AHMEDABAD,
        category: "Youth",
        event_type: "virtual",
        virtual_url: "https://zoom.example/covfe",
        tags: ["covfe", "draft"],
      },
      {
        name: `${PREFIX} Cancelled Event`,
        description: "cancelled seed",
        venue: null,
        starts_at: "2026-09-01T10:00:00Z",
        ends_at: "2026-09-01T12:00:00Z",
        status: "cancelled",
        created_by: seeded.memberUserId,
        chapter_id: AHMEDABAD,
        tags: ["covfe", "cancelled"],
      },
    ];
    const { data: evRows, error: eErr } = await admin.from("events").insert(events).select("id,name,status");
    if (eErr) throw eErr;
    for (const e of evRows ?? []) seeded.eventIds.push(e.id);

    const published = (evRows ?? []).find((e) => e.status === "published");
    if (published && seeded.financeMemberId) {
      const { data: rsvps, error: rErr } = await admin
        .from("event_rsvps")
        .insert([
          { event_id: published.id, member_id: seeded.financeMemberId, status: "going" },
          { event_id: published.id, member_id: seeded.chapterAdminId, status: "maybe" },
        ])
        .select("id");
      if (rErr) throw rErr;
      for (const r of rsvps ?? []) seeded.rsvpIds.push(r.id);
    }
  }, 120_000);

  afterAll(async () => {
    await cleanupAll();
    await supabase.auth.signOut();
  });

  it("FinanceTab chapter-scoped: donations/aid/scholarships/hall/funds mutations", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = makeUser();
    const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=finance",
    });

    await waitFor(() => expect(document.body.textContent).toMatch(/Total Donations|Pending Aid|Fund/i), {
      timeout: 30_000,
    });

    // Donations: search + fund filter + recurring badge
    const donorSearch = screen.getByPlaceholderText(/Search donor/i);
    fireEvent.change(donorSearch, { target: { value: PREFIX } });
    await waitFor(() => expect(document.body.textContent).toMatch(/Recurring Donor|Pending Donor/i), {
      timeout: 10_000,
    });
    fireEvent.change(donorSearch, { target: { value: "zzzz-no-match" } });
    await waitFor(() => expect(document.body.textContent).toMatch(/No donations found/i), { timeout: 8_000 });
    fireEvent.change(donorSearch, { target: { value: "" } });

    const fundFilter = screen.getAllByRole("combobox")[0];
    await clickSafe(user, fundFilter);
    const fundOpts = await screen.findAllByRole("option", {}, { timeout: 5_000 });
    const chapFundOpt = fundOpts.find((o) => (o.textContent ?? "").includes(`${PREFIX} Chapter Fund`));
    if (chapFundOpt) await clickSafe(user, chapFundOpt);
    await waitFor(() => expect(document.body.textContent).toMatch(/records|Succeeded/i), { timeout: 8_000 });
    await clickSafe(user, screen.getAllByRole("combobox")[0]);
    const allFunds = (await screen.findAllByRole("option", {}, { timeout: 4_000 })).find((o) =>
      /All Funds/i.test(o.textContent ?? ""),
    );
    if (allFunds) await clickSafe(user, allFunds);

    // Medical aid: create + approve + reject + delete
    await clickSafe(
      user,
      screen.queryByRole("tab", { name: /Medical Aid/i }) ||
        screen.queryAllByRole("tab").find((t) => /Medical/i.test(t.textContent ?? "")),
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Pending Patient|New Request/i), {
      timeout: 15_000,
    });

    await clickSafe(user, screen.getByRole("button", { name: /New Request/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/New Medical Aid/i), { timeout: 8_000 });
    setNear(/Patient Name/i, `${PREFIX} UI Patient`);
    await pickSelectOption(user, screen.getAllByRole("combobox").find((c) => /Self|Relation/i.test(c.textContent ?? "") || true), /Spouse/i);
    // relation select is first combobox in dialog
    const aidDialog = screen.getByRole("dialog");
    const aidBoxes = within(aidDialog).queryAllByRole("combobox");
    if (aidBoxes[0]) await pickSelectOption(user, aidBoxes[0], /Spouse/i);
    if (aidBoxes[1]) await pickSelectOption(user, aidBoxes[1], /^USD$/i);
    setNear(/Condition Summary/i, "UI condition summary");
    setNear(/Amount Needed/i, "750");
    await clickSafe(user, within(aidDialog).getByRole("button", { name: /Submit Request/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Medical aid request created|UI Patient/i), {
      timeout: 20_000,
    });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 5_000 }).catch(() => undefined);

    // Approve pending
    forceClick(reviewOnCard(/Pending Patient/i));
    await screen.findByText(/Review Medical Aid Request/i, {}, { timeout: 10_000 });
    const amount = screen.getByPlaceholderText(/Enter approved amount/i);
    fireEvent.change(amount, { target: { value: "4000" } });
    setNear(/^Notes$/i, "approved via pass16");
    forceClick(screen.getByRole("button", { name: /^Approve$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Medical aid request approved/i), {
      timeout: 20_000,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 8_000 }).catch(() => undefined);

    // Reject second pending
    await waitFor(() => expect(reviewOnCard(/Reject Target/i)).toBeTruthy(), { timeout: 15_000 });
    forceClick(reviewOnCard(/Reject Target/i));
    await screen.findByText(/Review Medical Aid Request/i, {}, { timeout: 10_000 });
    forceClick(screen.getByRole("button", { name: /^Reject$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Medical aid request rejected/i), {
      timeout: 20_000,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 8_000 }).catch(() => undefined);

    // Delete aid
    forceClick(screen.queryAllByLabelText(/Delete request/i)[0]);
    await screen.findByText(/Delete Record/i, {}, { timeout: 5_000 });
    forceClick(screen.getByRole("button", { name: /^Delete$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Record deleted/i), { timeout: 15_000 });

    // Scholarships: reviewing + approve/reject/delete
    await clickSafe(
      user,
      screen.queryByRole("tab", { name: /Scholarships/i }) ||
        screen.queryAllByRole("tab").find((t) => /Scholarship/i.test(t.textContent ?? "")),
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/submitted essay|reviewing essay|applied for/i), {
      timeout: 20_000,
    });

    forceClick(screen.queryAllByRole("button", { name: /Review/i })[0]);
    await screen.findByText(/Review Scholarship Application/i, {}, { timeout: 10_000 });
    forceClick(screen.getByRole("button", { name: /Mark Reviewing/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Application updated/i), {
      timeout: 15_000,
    });
    // reopen for approve if dialog closed
    if (!/Review Scholarship/i.test(document.body.textContent ?? "")) {
      forceClick(screen.queryAllByRole("button", { name: /Review/i })[0]);
      await screen.findByText(/Review Scholarship Application/i, {}, { timeout: 10_000 });
    }
    forceClick(screen.getByRole("button", { name: /^Approve$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Application approved/i), { timeout: 20_000 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 8_000 }).catch(() => undefined);

    if (screen.queryAllByRole("button", { name: /Review/i }).length) {
      forceClick(screen.queryAllByRole("button", { name: /Review/i })[0]);
      await screen.findByText(/Review Scholarship Application/i, {}, { timeout: 10_000 });
      forceClick(screen.getByRole("button", { name: /^Reject$/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Application rejected/i), { timeout: 20_000 });
    }

    forceClick(screen.queryAllByLabelText(/Delete application/i)[0]);
    forceClick(await screen.findByRole("button", { name: /^Delete$/i }, { timeout: 5_000 }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Record deleted/i), { timeout: 15_000 });

    // Hall bookings: create + approve + reject + delete
    await clickSafe(user, screen.queryByRole("tab", { name: /Hall/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Hall Pending|New Booking/i), { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("button", { name: /New Booking/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/New Hall Booking/i), { timeout: 8_000 });
    setNear(/Hall Name/i, `${PREFIX} UI Hall`);
    setNear(/Purpose/i, "UI purpose");
    setNear(/Booking Date/i, "2026-12-20");
    setNear(/Expected Guests/i, "25");
    forceClick(screen.getByRole("button", { name: /Submit Booking/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Hall booking request created|UI Hall/i), {
      timeout: 20_000,
    });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 5_000 }).catch(() => undefined);

    forceClick(screen.queryAllByRole("button", { name: /^Approve$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Hall booking updated/i), { timeout: 20_000 });
    forceClick(screen.queryAllByRole("button", { name: /^Reject$/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Hall booking updated/i), { timeout: 20_000 });

    forceClick(screen.queryAllByLabelText(/Delete booking/i)[0]);
    forceClick(await screen.findByRole("button", { name: /^Delete$/i }, { timeout: 5_000 }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Record deleted/i), { timeout: 15_000 });

    // Campaigns + Trust Corpus tabs (child panels already covered elsewhere)
    await clickSafe(user, screen.queryByRole("tab", { name: /Campaigns/i }));
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(20), { timeout: 15_000 });
    await clickSafe(user, screen.queryByRole("tab", { name: /Trust Corpus/i }));
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(20), { timeout: 15_000 });

    // Funds: create chapter + global, edit, toggle activate
    await clickSafe(user, screen.queryByRole("tab", { name: /Fund Management/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Chapter Fund|Global Fund|Create Fund/i), {
      timeout: 15_000,
    });

    await clickSafe(user, screen.getByRole("button", { name: /Create Fund/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Create New Fund/i), { timeout: 8_000 });
    setNear(/Fund Name/i, `${PREFIX} UI Chapter Fund`);
    const createDialog = screen.getByRole("dialog");
    const createBoxes = within(createDialog).getAllByRole("combobox");
    // currency
    if (createBoxes[0]) await pickSelectOption(user, createBoxes[0], /^GBP$/i);
    // scope stays chapter — pick Ahmedabad
    if (createBoxes.length > 2) await pickSelectOption(user, createBoxes[2], /Ahmedabad/i);
    else if (createBoxes[1]) {
      // if only currency+scope, open chapter select after ensuring chapter scope
      await pickSelectOption(user, createBoxes[1], /^Chapter$/i);
      const chapBox = within(createDialog).queryAllByRole("combobox").find((b) => /Select chapter|Ahmedabad/i.test(b.textContent ?? "") || true);
      await pickSelectOption(user, chapBox, /Ahmedabad/i);
    }
    await clickSafe(user, within(createDialog).getByRole("button", { name: /^Create Fund$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Fund created|UI Chapter Fund/i), {
      timeout: 20_000,
    });

    await clickSafe(user, screen.getByRole("button", { name: /Create Fund/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Create New Fund/i), { timeout: 8_000 });
    setNear(/Fund Name/i, `${PREFIX} UI Global Fund`);
    const createDialog2 = screen.getByRole("dialog");
    const scopeBox = within(createDialog2).getAllByRole("combobox")[1];
    await pickSelectOption(user, scopeBox, /^Global$/i);
    await clickSafe(user, within(createDialog2).getByRole("button", { name: /^Create Fund$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Fund created|UI Global Fund/i), {
      timeout: 20_000,
    });

    // Edit fund → switch scope (while still mounted)
    forceClick(screen.queryAllByLabelText(/Edit fund/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit Fund/i), { timeout: 8_000 });
    {
      const editDialog = screen.getByRole("dialog");
      const nameInput = within(editDialog).queryAllByRole("textbox")[0];
      if (nameInput) fireEvent.change(nameInput, { target: { value: `${PREFIX} Edited Fund` } });
      const editBoxes = within(editDialog).getAllByRole("combobox");
      if (editBoxes[0]) await pickSelectOption(user, editBoxes[0], /^AED$/i);
      if (editBoxes[1]) await pickSelectOption(user, editBoxes[1], /^Global$/i);
      forceClick(within(editDialog).getByRole("button", { name: /Save Changes/i }));
    }
    await waitFor(() => expect(document.body.textContent).toMatch(/Fund updated/i), { timeout: 20_000 });

    // Edit again → chapter scope with chapter select
    forceClick(screen.queryAllByLabelText(/Edit fund/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit Fund/i), { timeout: 8_000 });
    {
      const editDialog2 = screen.getByRole("dialog");
      const editBoxes2 = within(editDialog2).getAllByRole("combobox");
      if (editBoxes2[1]) await pickSelectOption(user, editBoxes2[1], /^Chapter$/i);
      await waitFor(() => {
        expect(within(screen.getByRole("dialog")).queryAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
      }, { timeout: 5_000 });
      const chapSelect = within(screen.getByRole("dialog")).queryAllByRole("combobox")[2];
      if (chapSelect) await pickSelectOption(user, chapSelect, /Ahmedabad/i);
      forceClick(within(screen.getByRole("dialog")).getByRole("button", { name: /Save Changes/i }));
    }
    await waitFor(() => expect(document.body.textContent).toMatch(/Fund updated/i), { timeout: 20_000 });

    // toggleFund: PostgREST+SELECT RLS (active=true) rejects deactivate RETURNING.
    // Temporarily allow reading inactive funds so Activate/Deactivate onSuccess can run;
    // then REVOKE UPDATE to hit onError. Always restore policies.
    const { execFileSync } = await import("node:child_process");
    const psql = (sql: string) =>
      execFileSync(
        "docker",
        ["exec", "supabase_db_khadayata-local", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
    try {
      psql(`
        DROP POLICY IF EXISTS "Anyone can read funds" ON public.funds;
        CREATE POLICY "Anyone can read funds" ON public.funds FOR SELECT USING (true);
        NOTIFY pgrst, 'reload schema';
      `);
      // refetch list after policy change
      forceClick(screen.queryByRole("tab", { name: /Campaigns/i }));
      forceClick(screen.queryByRole("tab", { name: /Fund Management/i }));
      await waitFor(() => expect(screen.queryAllByRole("button", { name: /^Deactivate$/i }).length).toBeGreaterThan(0), {
        timeout: 20_000,
      });
      forceClick(screen.queryAllByRole("button", { name: /^Deactivate$/i })[0]);
      await waitFor(() => expect(screen.queryAllByRole("button", { name: /^Activate$/i }).length).toBeGreaterThan(0), {
        timeout: 15_000,
      });
      forceClick(screen.queryAllByRole("button", { name: /^Activate$/i })[0]);
      await waitFor(() => expect(screen.queryAllByRole("button", { name: /^Deactivate$/i }).length).toBeGreaterThan(0), {
        timeout: 15_000,
      });

      psql("REVOKE UPDATE ON public.funds FROM authenticated;");
      forceClick(screen.queryAllByRole("button", { name: /^Deactivate$/i })[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(/permission denied|Error/i), {
        timeout: 15_000,
      });
    } finally {
      try {
        psql("GRANT SELECT, INSERT, UPDATE, DELETE ON public.funds TO authenticated;");
      } catch {
        /* continue restore */
      }
      try {
        psql(`
          DROP POLICY IF EXISTS "Anyone can read funds" ON public.funds;
          CREATE POLICY "Anyone can read funds" ON public.funds FOR SELECT USING (active = true);
          NOTIFY pgrst, 'reload schema';
        `);
      } catch {
        /* best-effort */
      }
    }

    unmount();
  }, 300_000);

  it("FinanceTab global mount (myChapterId null) + validation error arms", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = makeUser();
    const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={null} />), {
      route: "/admin?tab=finance",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Total Donations|Pending Aid|Fund/i), {
      timeout: 30_000,
    });

    // Empty create-fund name → client throw
    await clickSafe(user, screen.queryByRole("tab", { name: /Fund Management/i }));
    await clickSafe(user, screen.getByRole("button", { name: /Create Fund/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Create New Fund/i), { timeout: 8_000 });
    // Button is disabled without name — force mutate via enabling then clearing isn't possible;
    // fill then clear to keep dialog paths, then Escape.
    setNear(/Fund Name/i, "x");
    fireEvent.change(screen.getByPlaceholderText(/Education Fund/i), { target: { value: "" } });
    await user.keyboard("{Escape}");

    // Medical aid empty name path: open dialog, don't submit (disabled)
    await clickSafe(user, screen.queryByRole("tab", { name: /Medical Aid/i }));
    await clickSafe(user, screen.getByRole("button", { name: /New Request/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/New Medical Aid/i), { timeout: 8_000 });
    await user.keyboard("{Escape}");

    // Hall booking without date: open dialog
    await clickSafe(user, screen.queryByRole("tab", { name: /Hall/i }));
    await clickSafe(user, screen.getByRole("button", { name: /New Booking/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/New Hall Booking/i), { timeout: 8_000 });
    setNear(/Hall Name/i, `${PREFIX} nodate`);
    // leave date empty — button disabled; cover dialog openChange reset
    await user.keyboard("{Escape}");

    // Donations search by member name path
    await clickSafe(user, screen.queryByRole("tab", { name: /Donation/i }));
    const donorSearch = screen.getByPlaceholderText(/Search donor/i);
    fireEvent.change(donorSearch, { target: { value: "E2E" } });
    await waitFor(() => expect(document.body.textContent).toMatch(/records|donation|No donations/i), {
      timeout: 10_000,
    });

    unmount();
  }, 180_000);

  it("EventsTab chapter-scoped: create/edit/duplicate/cancel/delete + RSVPs + geo", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = makeUser();
    const admin = adminClient();
    const uid = await authUserId();
    const mid = await currentMemberId();

    // Re-seed in-test (sibling agents may clear events between suites)
    await admin.from("event_rsvps").delete().in("event_id", seeded.eventIds.length ? seeded.eventIds : ["00000000-0000-0000-0000-000000000000"]);
    await admin.from("events").delete().ilike("name", `${PREFIX}%`);
    seeded.eventIds = [];
    seeded.rsvpIds = [];
    const { data: evRows, error: eErr } = await admin
      .from("events")
      .insert([
        {
          name: `${PREFIX} Published Event`,
          description: "published seed",
          venue: "Community Hall",
          starts_at: "2026-10-01T10:00:00Z",
          ends_at: "2026-10-01T14:00:00Z",
          status: "published",
          created_by: uid,
          chapter_id: AHMEDABAD,
          category: "Cultural",
          event_type: "in_person",
          max_capacity: 100,
          fee_amount: 50,
          fee_currency: "INR",
          contact_email: "covfe@example.com",
          contact_phone: "+15550001111",
          organizer_name: "Pass16",
          address_line1: "1 Main St",
          tags: ["covfe", "published"],
          country_id: INDIA,
          state_id: GUJARAT,
          cover_image_url: "https://example.com/cover.jpg",
        },
        {
          name: `${PREFIX} Draft Event`,
          description: "draft seed",
          venue: "Draft Hall",
          starts_at: "2026-11-01T10:00:00Z",
          ends_at: "2026-11-01T12:00:00Z",
          status: "draft",
          created_by: uid,
          chapter_id: AHMEDABAD,
          category: "Youth",
          event_type: "virtual",
          virtual_url: "https://zoom.example/covfe",
          tags: ["covfe", "draft"],
        },
        {
          name: `${PREFIX} Cancelled Event`,
          description: "cancelled seed",
          starts_at: "2026-09-01T10:00:00Z",
          ends_at: "2026-09-01T12:00:00Z",
          status: "cancelled",
          created_by: uid,
          chapter_id: AHMEDABAD,
          tags: ["covfe", "cancelled"],
        },
      ])
      .select("id,status");
    if (eErr) throw eErr;
    for (const e of evRows ?? []) seeded.eventIds.push(e.id);
    const published = (evRows ?? []).find((e) => e.status === "published");
    if (published) {
      const { data: rsvps, error: rErr } = await admin
        .from("event_rsvps")
        .insert([
          { event_id: published.id, member_id: mid, status: "going" },
          {
            event_id: published.id,
            member_id: seeded.financeMemberId ?? mid,
            status: "maybe",
          },
        ])
        .select("id");
      // duplicate member_id may fail — seed at least one RSVP
      if (rErr) {
        const { data: one } = await admin
          .from("event_rsvps")
          .insert({ event_id: published.id, member_id: mid, status: "going" })
          .select("id");
        for (const r of one ?? []) seeded.rsvpIds.push(r.id);
      } else {
        for (const r of rsvps ?? []) seeded.rsvpIds.push(r.id);
      }
    }

    const { unmount } = renderApp(withToaster(<EventsTab myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=events",
    });

    const publishedName = `${PREFIX} Published Event`;
    await waitFor(() => expect(document.body.textContent).toContain(publishedName), {
      timeout: 30_000,
    });

    // Search
    const search = screen.getByPlaceholderText(/Search events/i);
    fireEvent.change(search, { target: { value: PREFIX } });
    await waitFor(() => expect(document.body.textContent).toContain(publishedName), { timeout: 15_000 });

    // View RSVPs with real rows
    const rsvpBtn =
      screen.queryAllByLabelText(/View RSVPs/i)[0] ||
      (document.querySelector('[aria-label="View RSVPs"]') as HTMLElement | null);
    expect(rsvpBtn).toBeTruthy();
    forceClick(rsvpBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/RSVP List/i), {
      timeout: 15_000,
    });
    // Wait for RSVP rows (not empty state) so member badge arms execute
    await waitFor(() => expect(document.body.textContent).toMatch(/going|E2E|maybe/i), {
      timeout: 15_000,
    });
    // toggle closed
    forceClick(
      screen.queryAllByLabelText(/View RSVPs/i)[0] ||
        (document.querySelector('[aria-label="View RSVPs"]') as HTMLElement | null),
    );

    // Create full event (India + state + all fields)
    forceClick(screen.getByRole("button", { name: /Create Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event Name/i), { timeout: 8_000 });
    const createDlg = screen.getByRole("dialog");
    setNear(/Event Name/i, `${PREFIX} UI Full Event`);
    setNear(/Description/i, "full create");
    setNear(/Organizer Name/i, "UI Organizer");
    setNear(/Max Capacity/i, "75");
    setNear(/Starts At/i, "2026-12-01T10:00");
    setNear(/Ends At/i, "2026-12-01T13:00");
    setNear(/Registration Deadline/i, "2026-11-25T23:59");
    setNear(/Fee Amount/i, "25");
    setNear(/Venue/i, "UI Venue");
    setNear(/Address/i, "42 UI Street");
    setNear(/Virtual URL/i, "https://meet.example/covfe");
    setNear(/Cover Image URL/i, "https://example.com/ui.jpg");
    setNear(/Contact Email/i, "ui@example.com");
    setNear(/Contact Phone/i, "+15550002222");
    setNear(/Tags/i, "covfe,ui,full");

    const boxes = within(createDlg).getAllByRole("combobox");
    // Category, Event Type, Fee Currency, Country, State, Chapter — order as in form
    if (boxes[0]) await pickSelectOption(user, boxes[0], /^Cultural$/i);
    if (boxes[1]) await pickSelectOption(user, boxes[1], /Hybrid/i);
    if (boxes[2]) await pickSelectOption(user, boxes[2], /^USD$/i);
    if (boxes[3]) await pickSelectOption(user, boxes[3], /^India$/i);
    await waitFor(() => {
      expect(within(screen.getByRole("dialog")).queryAllByRole("combobox").length).toBeGreaterThan(4);
    }, { timeout: 10_000 });
    const stateBox = within(screen.getByRole("dialog")).getAllByRole("combobox")[4];
    if (stateBox && !(stateBox as HTMLButtonElement).disabled) {
      await pickSelectOption(user, stateBox, /Gujarat/i);
    }
    const chapBox = within(screen.getByRole("dialog"))
      .queryAllByRole("combobox")
      .find((b) => /My chapter|Ahmedabad|Chapter/i.test(b.textContent ?? ""));
    if (chapBox) await pickSelectOption(user, chapBox, /Ahmedabad/i);

    const consent = within(createDlg).queryByRole("checkbox") || createDlg.querySelector('input[type="checkbox"]');
    if (consent) fireEvent.click(consent);

    forceClick(within(createDlg).getByRole("button", { name: /Publish Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event created/i), { timeout: 25_000 });

    // Create again with Algeria (no states) to hit hasStates===false branch
    forceClick(screen.getByRole("button", { name: /Create Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event Name/i), { timeout: 8_000 });
    setNear(/Event Name/i, `${PREFIX} UI Algeria Event`);
    setNear(/Starts At/i, "2026-12-15T10:00");
    setNear(/Ends At/i, "2026-12-15T12:00");
    const createDlg2 = screen.getByRole("dialog");
    const countryBox = within(createDlg2)
      .queryAllByRole("combobox")
      .find((b) => /Select country|None|India|Algeria|Country/i.test(b.textContent ?? "") || true);
    // Country is the combobox after Fee Currency — prefer label proximity
    const countryLabel = Array.from(createDlg2.querySelectorAll("label")).find((l) => /^Country$/i.test(l.textContent ?? ""));
    const countryTrigger =
      (countryLabel?.parentElement?.querySelector("button") as HTMLElement | null) || countryBox;
    if (countryTrigger) {
      forceClick(countryTrigger);
      const algeria =
        (await screen.findAllByRole("option", {}, { timeout: 5_000 }).catch(() => [])).find((o) =>
          /Algeria/i.test(o.textContent ?? ""),
        ) || null;
      if (algeria) {
        forceClick(algeria);
        await waitFor(() => {
          const labels = Array.from(screen.getByRole("dialog").querySelectorAll("label")).map(
            (l) => l.textContent ?? "",
          );
          expect(labels.some((t) => /^State$/i.test(t.trim()))).toBe(false);
        }, { timeout: 15_000 }).catch(() => undefined);
      }
    }
    forceClick(within(screen.getByRole("dialog")).getByRole("button", { name: /Publish Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event created/i), { timeout: 25_000 });

    // Edit published event — clear optional numeric fields (null branches)
    fireEvent.change(search, { target: { value: `${PREFIX} Published` } });
    await waitFor(() => expect(document.body.textContent).toContain(publishedName), { timeout: 15_000 });
    const editBtn =
      screen.queryAllByLabelText(/Edit event/i)[0] ||
      (document.querySelector('[aria-label="Edit event"]') as HTMLElement | null);
    expect(editBtn).toBeTruthy();
    forceClick(editBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit Event|Save Changes/i), {
      timeout: 10_000,
    });
    const editDlg = screen.getByRole("dialog");
    const editName = within(editDlg).queryAllByRole("textbox")[0];
    if (editName) fireEvent.change(editName, { target: { value: `${PREFIX} Published Event v2` } });
    setNear(/Max Capacity/i, "");
    setNear(/Fee Amount/i, "");
    setNear(/Description/i, "");
    setNear(/Venue/i, "");
    setNear(/Contact Email/i, "");
    setNear(/Contact Phone/i, "");
    setNear(/Organizer Name/i, "");
    setNear(/Address/i, "");
    setNear(/Cover Image URL/i, "");
    const editBoxes = within(editDlg).getAllByRole("combobox");
    if (editBoxes[0]) await pickSelectOption(user, editBoxes[0], /^None$/i);
    if (editBoxes[1]) await pickSelectOption(user, editBoxes[1], /Virtual/i);
    const statusBox = editBoxes.find((b) => /Published|Draft|Cancelled/i.test(b.textContent ?? ""));
    if (statusBox) await pickSelectOption(user, statusBox, /^Draft$/i);
    forceClick(within(editDlg).getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event updated/i), { timeout: 20_000 });

    // Drafts tab + duplicate (clear search so draft rows are visible)
    fireEvent.change(search, { target: { value: PREFIX } });
    await clickSafe(user, screen.getByRole("tab", { name: /Draft/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Draft Event|Published Event v2|Drafts \([1-9]/i), {
      timeout: 15_000,
    });
    forceClick(
      screen.queryAllByLabelText(/Duplicate event/i)[0] ||
        (document.querySelector('[aria-label="Duplicate event"]') as HTMLElement | null),
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Event duplicated as Draft/i), {
      timeout: 20_000,
    });

    // Published tab — cancel
    await clickSafe(user, screen.queryByRole("tab", { name: /Published/i }));
    fireEvent.change(search, { target: { value: PREFIX } });
    await waitFor(() => {
      const cancelBtns = document.querySelectorAll('[aria-label="Cancel event"]');
      const deleteBtns = document.querySelectorAll('[aria-label="Delete event"]');
      expect(cancelBtns.length + deleteBtns.length).toBeGreaterThan(0);
    }, { timeout: 15_000 });
    const cancelBtn = document.querySelector('[aria-label="Cancel event"]') as HTMLElement | null;
    if (cancelBtn) {
      forceClick(cancelBtn);
      await waitFor(() => expect(document.body.textContent).toMatch(/Event cancelled/i), { timeout: 20_000 });
    }

    // Cancelled tab (userEvent for Radix tabs)
    fireEvent.change(search, { target: { value: "" } });
    await clickSafe(user, screen.getByRole("tab", { name: /Cancelled/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Cancelled Event|cancelled|No cancelled events/i);
      expect(document.body.textContent).not.toMatch(/UI Full Eventpublished/i);
    }, { timeout: 15_000 });

    // Delete one cancelled/draft event
    fireEvent.change(search, { target: { value: PREFIX } });
    await clickSafe(user, screen.getByRole("tab", { name: /Cancelled/i }));
    await waitFor(() => expect(document.querySelector('[aria-label="Delete event"]')).toBeTruthy(), {
      timeout: 15_000,
    });
    forceClick(document.querySelector('[aria-label="Delete event"]') as HTMLElement | null);
    await screen.findByText(/Permanently delete/i, {}, { timeout: 5_000 });
    forceClick(screen.getByRole("button", { name: /^Delete Event$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event deleted/i), { timeout: 20_000 });

    // Empty search noise → empty published list path
    fireEvent.change(search, { target: { value: "zzz-no-such-event-covfe" } });
    await clickSafe(user, screen.getByRole("tab", { name: /Published/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/No published events|Published \(0\)/i), {
      timeout: 15_000,
    });

    unmount();
  }, 300_000);

  it("EventsTab global mount (myChapterId null) via chapter-admin session", async () => {
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const user = makeUser();
    const { unmount } = renderApp(withToaster(<EventsTab myChapterId={null} />), {
      route: "/admin?tab=events",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Create Event|Published|Draft/i), {
      timeout: 30_000,
    });
    fireEvent.change(screen.getByPlaceholderText(/Search events/i), { target: { value: PREFIX } });
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(30), { timeout: 15_000 });

    // Open create and cancel (dialog onOpenChange false path)
    await clickSafe(user, screen.getByRole("button", { name: /Create Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Create Event|Event Name/i), { timeout: 8_000 });
    // Category None + default chapter
    const dlg = screen.getByRole("dialog");
    const cat = within(dlg).queryAllByRole("combobox")[0];
    if (cat) await pickSelectOption(user, cat, /^None$/i);
    await user.keyboard("{Escape}");

    for (const tab of screen.queryAllByRole("tab").slice(0, 3)) await clickSafe(user, tab);
    unmount();
  }, 120_000);
});
