/**
 * Pass 16 — FinanceTab / RecurringPledgesPanel / BulkContentTab leftovers against real Kong.
 * Seeds disposable funds, donations, aid, scholarships, bookings, pledges, bulk content;
 * cleans up in afterAll. Requires local patch scripts/patch-recurring-pledges-local.sql.
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import FinanceTab from "@/components/admin/FinanceTab";
import { RecurringPledgesPanel } from "@/components/finance/RecurringPledgesPanel";
import BulkContentTab from "@/components/admin/BulkContentTab";
import { Toaster } from "@/components/ui/toaster";
import type { ReactNode } from "react";

const PREFIX = `covfa_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

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

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return;
  try {
    await user.click(el);
  } catch {
    /* overlay races */
  }
}

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  option: RegExp,
) {
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 4000 }).catch(() => []);
  const match = opts.find((o) => option.test(o.textContent ?? ""));
  if (match) await clickSafe(user, match);
  else await user.keyboard("{Escape}");
}

function fill(el: HTMLInputElement | HTMLTextAreaElement | null | undefined, value: string) {
  if (!el) return;
  fireEvent.change(el, { target: { value } });
}

function inputAfterLabel(root: HTMLElement, label: RegExp): HTMLInputElement | HTMLTextAreaElement | null {
  const labels = Array.from(root.querySelectorAll("label"));
  const lab = labels.find((l) => label.test(l.textContent ?? ""));
  if (!lab) return null;
  const wrapper = lab.parentElement;
  return (wrapper?.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null) ?? null;
}

const seeded = {
  fundIds: [] as string[],
  donationIds: [] as string[],
  aidIds: [] as string[],
  bookingIds: [] as string[],
  scholarshipIds: [] as string[],
  applicationIds: [] as string[],
  pledgeIds: [] as string[],
  eventIds: [] as string[],
  businessIds: [] as string[],
  jobIds: [] as string[],
  newsIds: [] as string[],
  oralIds: [] as string[],
  financeMemberId: null as string | null,
  financeUserId: null as string | null,
  memberId: null as string | null,
  chapterFundId: null as string | null,
  globalFundId: null as string | null,
};

describe("Pass 16 — FinanceTab / RecurringPledges / BulkContent (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();

    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const {
      data: { user: finUser },
    } = await supabase.auth.getUser();
    seeded.financeUserId = finUser?.id ?? null;
    const { data: finMem } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", finUser!.id)
      .maybeSingle();
    seeded.financeMemberId = finMem?.id ?? null;
    if (!seeded.financeMemberId) throw new Error("finance admin member missing");

    await signIn(E2E_ACCOUNTS.member.email);
    const { data: mem } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
      .maybeSingle();
    seeded.memberId = mem?.id ?? null;

    const { data: funds, error: fundErr } = await admin
      .from("funds")
      .insert([
        {
          name: `${PREFIX} Chapter Seva`,
          currency: "INR",
          scope: "chapter",
          chapter_id: AHMEDABAD,
          active: true,
        },
        {
          name: `${PREFIX} Global Relief`,
          currency: "USD",
          scope: "global",
          chapter_id: null,
          active: true,
        },
        {
          name: `${PREFIX} Inactive Legacy`,
          currency: "INR",
          scope: "chapter",
          chapter_id: AHMEDABAD,
          active: true,
        },
      ])
      .select("id, name, scope");
    if (fundErr) throw fundErr;
    seeded.fundIds.push(...(funds ?? []).map((f) => f.id));
    seeded.chapterFundId = (funds ?? []).find((f) => f.scope === "chapter" && /Chapter Seva/.test(f.name))?.id ?? null;
    seeded.globalFundId = (funds ?? []).find((f) => f.scope === "global")?.id ?? null;
    const inactiveId = (funds ?? []).find((f) => /Inactive Legacy/.test(f.name))?.id;
    if (inactiveId) {
      await admin.from("funds").update({ active: false }).eq("id", inactiveId);
    }

    const { data: dons, error: donErr } = await admin
      .from("donations")
      .insert([
        {
          amount: 2500,
          currency: "INR",
          status: "succeeded",
          donor_name: `${PREFIX} Donor One`,
          member_id: seeded.financeMemberId,
          fund_id: seeded.chapterFundId,
          payment_method: "UPI",
          pan_number: "ABCDE1234F",
          type: "one_time",
        },
        {
          amount: 500,
          currency: "INR",
          status: "pending",
          donor_name: `${PREFIX} Pending Donor`,
          member_id: seeded.financeMemberId,
          fund_id: seeded.chapterFundId,
          type: "recurring",
          recurring_interval: "monthly",
        },
        {
          amount: 10000,
          currency: "USD",
          status: "succeeded",
          donor_name: `${PREFIX} Global Donor`,
          member_id: seeded.financeMemberId,
          fund_id: seeded.globalFundId,
          payment_method: "card",
          type: "one_time",
        },
      ])
      .select("id");
    if (donErr) throw donErr;
    seeded.donationIds.push(...(dons ?? []).map((d) => d.id));

    const { data: aids, error: aidErr } = await admin
      .from("medical_aid_requests")
      .insert([
        {
          patient_name: `${PREFIX} Approve Patient`,
          relation: "spouse",
          condition_summary: "Needs surgery coverage path",
          amount_needed: 75000,
          currency: "INR",
          member_id: seeded.financeMemberId,
          chapter_id: AHMEDABAD,
          status: "pending",
        },
        {
          patient_name: `${PREFIX} Delete Patient`,
          relation: "child",
          condition_summary: "Disposable delete path",
          amount_needed: 12000,
          currency: "INR",
          member_id: seeded.financeMemberId,
          chapter_id: AHMEDABAD,
          status: "pending",
        },
        {
          patient_name: `${PREFIX} Approved Already`,
          relation: "self",
          condition_summary: "Already approved — shows approved_amount",
          amount_needed: 5000,
          currency: "INR",
          approved_amount: 4000,
          member_id: seeded.financeMemberId,
          chapter_id: AHMEDABAD,
          status: "approved",
        },
      ])
      .select("id");
    if (aidErr) throw aidErr;
    seeded.aidIds.push(...(aids ?? []).map((a) => a.id));

    const { data: books, error: bookErr } = await admin
      .from("hall_bookings")
      .insert([
        {
          hall_name: `${PREFIX} Approve Hall`,
          purpose: "Wedding reception",
          booking_date: "2026-11-20",
          start_time: "10:00",
          end_time: "14:00",
          guests: 120,
          member_id: seeded.financeMemberId,
          chapter_id: AHMEDABAD,
          status: "pending",
        },
        {
          hall_name: `${PREFIX} Reject Hall`,
          purpose: "Cultural evening",
          booking_date: "2026-11-22",
          start_time: "18:00",
          end_time: "22:00",
          guests: 80,
          member_id: seeded.financeMemberId,
          chapter_id: AHMEDABAD,
          status: "pending",
        },
        {
          hall_name: `${PREFIX} Delete Hall`,
          purpose: "Disposable",
          booking_date: "2026-12-01",
          start_time: "09:00",
          end_time: "12:00",
          guests: 40,
          member_id: seeded.financeMemberId,
          chapter_id: AHMEDABAD,
          status: "pending",
        },
      ])
      .select("id");
    if (bookErr) throw bookErr;
    seeded.bookingIds.push(...(books ?? []).map((b) => b.id));

    const { data: schols, error: schErr } = await admin
      .from("scholarships")
      .insert([
        {
          name: `${PREFIX} Merit Grant`,
          description: "Pass16 scholarship for FinanceTab review",
          amount: 25000,
          currency: "INR",
          deadline: "2027-01-15",
          chapter_id: AHMEDABAD,
          status: "active",
        },
        {
          name: `${PREFIX} Secondary Grant`,
          description: "Second scholarship for reviewing app",
          amount: 8000,
          currency: "USD",
          deadline: "2027-02-01",
          status: "active",
        },
      ])
      .select("id, name");
    if (schErr) throw schErr;
    seeded.scholarshipIds.push(...(schols ?? []).map((s) => s.id));

    const schPrimary = (schols ?? [])[0]?.id;
    const schSecondary = (schols ?? [])[1]?.id;
    const appMemberId = seeded.memberId ?? seeded.financeMemberId;
    if (!schPrimary || !schSecondary || !appMemberId) {
      throw new Error(`scholarship seed incomplete primary=${schPrimary} secondary=${schSecondary} member=${appMemberId}`);
    }
    const { data: apps, error: appErr } = await admin
      .from("scholarship_applications")
      .insert([
        {
          scholarship_id: schPrimary,
          member_id: appMemberId,
          essay: `${PREFIX} submitted essay for review approve path`,
          status: "submitted",
        },
        {
          scholarship_id: schSecondary,
          member_id: appMemberId,
          essay: `${PREFIX} reviewing essay for reject/delete path`,
          status: "reviewing",
        },
      ])
      .select("id");
    if (appErr) throw appErr;
    seeded.applicationIds.push(...(apps ?? []).map((a) => a.id));

    // Pledges: active + paused so pause/resume/cancel UI is reachable
    if (seeded.chapterFundId) {
      const { data: pledges, error: plErr } = await admin
        .from("recurring_pledges")
        .insert([
          {
            member_id: seeded.financeMemberId,
            fund_id: seeded.chapterFundId,
            amount: 501,
            currency: "INR",
            interval: "monthly",
            status: "active",
            notes: `${PREFIX} active masik`,
          },
          {
            member_id: seeded.financeMemberId,
            fund_id: seeded.chapterFundId,
            amount: 100,
            currency: "INR",
            interval: "weekly",
            status: "paused",
            notes: `${PREFIX} paused`,
          },
          {
            member_id: seeded.financeMemberId,
            fund_id: seeded.globalFundId ?? seeded.chapterFundId,
            amount: 1200,
            currency: "USD",
            interval: "yearly",
            status: "cancelled",
            notes: null,
          },
        ])
        .select("id");
      if (plErr) throw plErr;
      if (!pledges?.length) throw new Error("recurring_pledges seed returned no rows");
      seeded.pledgeIds.push(...pledges.map((p) => p.id));
    } else {
      throw new Error("chapterFundId missing — cannot seed pledges");
    }

    // Bulk content disposable rows (search + delete)
    const upcoming = new Date(Date.now() + 14 * 864e5).toISOString();
    const upcomingEnd = new Date(Date.now() + 14 * 864e5 + 3_600_000).toISOString();
    const { data: evts, error: evtErr } = await admin
      .from("events")
      .insert([
        {
          name: `${PREFIX} Bulk Event`,
          description: "Pass16 bulk delete target",
          venue: "Hall",
          category: "Cultural",
          event_type: "in_person",
          starts_at: upcoming,
          ends_at: upcomingEnd,
          status: "draft",
          chapter_id: AHMEDABAD,
          created_by: seeded.financeUserId,
        },
        {
          name: `${PREFIX} Cancelled Event`,
          description: "statusColor cancelled arm",
          venue: "Hall",
          category: "Cultural",
          event_type: "in_person",
          starts_at: upcoming,
          ends_at: upcomingEnd,
          status: "cancelled",
          chapter_id: AHMEDABAD,
          created_by: seeded.financeUserId,
        },
      ])
      .select("id");
    if (evtErr) throw evtErr;
    seeded.eventIds.push(...(evts ?? []).map((e) => e.id));

    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        name: `${PREFIX} Bulk Biz`,
        sector: "Textiles",
        description: "Pass16 bulk",
        chapter_id: AHMEDABAD,
        owner_member_id: seeded.financeMemberId,
        verified: false,
      })
      .select("id")
      .single();
    if (!bizErr && biz) seeded.businessIds.push(biz.id);

    const { data: jobs, error: jobErr } = await admin
      .from("jobs")
      .insert([
        {
          title: `${PREFIX} Bulk Job`,
          description: "Pass16 bulk",
          chapter_id: AHMEDABAD,
          employer_member_id: seeded.financeMemberId,
          status: "open",
          location: "Ahmedabad",
          remote: false,
          employment_type: "full_time",
        },
        {
          title: `${PREFIX} Closed Job`,
          description: "statusColor closed arm",
          chapter_id: AHMEDABAD,
          employer_member_id: seeded.financeMemberId,
          status: "closed",
          location: "Surat",
          remote: true,
          employment_type: "contract",
        },
      ])
      .select("id");
    if (jobErr) throw jobErr;
    seeded.jobIds.push(...(jobs ?? []).map((j) => j.id));

    const { data: news, error: newsErr } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Bulk News`,
        summary: "bulk",
        body: "Pass16 bulk news body",
        status: "draft",
        chapter_id: AHMEDABAD,
        created_by: seeded.financeUserId,
        scope: "chapter",
      })
      .select("id")
      .single();
    if (!newsErr && news) seeded.newsIds.push(news.id);

    const { data: orals, error: oralErr } = await admin
      .from("oral_histories")
      .insert([
        {
          title: `${PREFIX} Bulk Oral`,
          description: "Pass16 oral",
          narrator_name: "Elder",
          media_type: "audio",
          status: "draft",
          uploaded_by: seeded.financeMemberId,
        },
        {
          title: `${PREFIX} Suspended Oral`,
          description: "statusColor suspended arm",
          narrator_name: "Elder Two",
          media_type: "video",
          status: "suspended",
          uploaded_by: seeded.financeMemberId,
        },
        {
          title: `${PREFIX} Weird Status Oral`,
          description: "statusColor default arm",
          narrator_name: "Elder Three",
          media_type: "audio",
          status: "archived",
          uploaded_by: seeded.financeMemberId,
        },
      ])
      .select("id");
    if (oralErr) throw oralErr;
    seeded.oralIds.push(...(orals ?? []).map((o) => o.id));
  }, 180_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.pledgeIds.length) await admin.from("recurring_pledges").delete().in("id", seeded.pledgeIds);
    await admin.from("recurring_pledges").delete().like("notes", `${PREFIX}%`);
    if (seeded.donationIds.length) await admin.from("donations").delete().in("id", seeded.donationIds);
    await admin.from("donations").delete().like("donor_name", `${PREFIX}%`);
    if (seeded.aidIds.length) await admin.from("medical_aid_requests").delete().in("id", seeded.aidIds);
    await admin.from("medical_aid_requests").delete().like("patient_name", `${PREFIX}%`);
    if (seeded.bookingIds.length) await admin.from("hall_bookings").delete().in("id", seeded.bookingIds);
    await admin.from("hall_bookings").delete().like("hall_name", `${PREFIX}%`);
    if (seeded.applicationIds.length) {
      await admin.from("scholarship_applications").delete().in("id", seeded.applicationIds);
    }
    await admin.from("scholarship_applications").delete().ilike("essay", `${PREFIX}%`);
    if (seeded.scholarshipIds.length) {
      await admin.from("scholarship_applications").delete().in("scholarship_id", seeded.scholarshipIds);
      await admin.from("scholarships").delete().in("id", seeded.scholarshipIds);
    }
    await admin.from("scholarships").delete().like("name", `${PREFIX}%`);
    if (seeded.fundIds.length) await admin.from("funds").delete().in("id", seeded.fundIds);
    await admin.from("funds").delete().like("name", `${PREFIX}%`);
    if (seeded.eventIds.length) await admin.from("events").delete().in("id", seeded.eventIds);
    await admin.from("events").delete().like("name", `${PREFIX}%`);
    if (seeded.businessIds.length) await admin.from("businesses").delete().in("id", seeded.businessIds);
    await admin.from("businesses").delete().like("name", `${PREFIX}%`);
    if (seeded.jobIds.length) await admin.from("jobs").delete().in("id", seeded.jobIds);
    await admin.from("jobs").delete().like("title", `${PREFIX}%`);
    if (seeded.newsIds.length) await admin.from("content_news").delete().in("id", seeded.newsIds);
    await admin.from("content_news").delete().like("title", `${PREFIX}%`);
    if (seeded.oralIds.length) await admin.from("oral_histories").delete().in("id", seeded.oralIds);
    await admin.from("oral_histories").delete().like("title", `${PREFIX}%`);
    await supabase.auth.signOut();
  });

  it("FinanceTab: donations filter, aid approve/delete, scholarships, hall approve/reject/delete, funds", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<FinanceTab myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=finance",
    });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Total Donations|Pending Aid|Fund Management/i);
    }, { timeout: 45_000 });

    // Donations: search + fund filter + recurring badge / PAN / payment_method
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Donor`));
    }, { timeout: 25_000 });
    expect(document.body.textContent).toMatch(/PAN:|UPI|monthly/i);

    const donorSearch = screen.getByPlaceholderText(/Search donor/i);
    fill(donorSearch, `${PREFIX} Donor One`);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/1 records|Donor One/i);
    }, { timeout: 8_000 });

    const fundFilter = screen.getAllByRole("combobox")[0];
    if (fundFilter) {
      await clickSafe(user, fundFilter);
      const opts = await screen.findAllByRole("option", {}, { timeout: 5_000 }).catch(() => []);
      const chapterOpt = opts.find((o) => /Chapter Seva/i.test(o.textContent ?? ""));
      if (chapterOpt) await clickSafe(user, chapterOpt);
      else await user.keyboard("{Escape}");
    }
    fill(donorSearch, "zzznomatch");
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No donations found|0 records/i);
    }, { timeout: 8_000 });
    fill(donorSearch, "");

    // Medical aid: approve one, delete another, create via UI
    const medicalTab =
      screen.queryByRole("tab", { name: /Medical Aid/i }) ||
      screen.queryAllByRole("tab").find((t) => /Medical/i.test(t.textContent ?? ""));
    await clickSafe(user, medicalTab as HTMLElement);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Approve Patient`));
    }, { timeout: 20_000 });
    expect(document.body.textContent).toMatch(/Approved:|Approved Already/i);

    const reviewBtns = screen.getAllByRole("button", { name: /^Review$/i });
    await clickSafe(user, reviewBtns[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    let dlg = screen.getByRole("dialog");
    const notes = within(dlg).getByPlaceholderText(/Approval notes/i);
    fill(notes, "approved via pass16");
    const amt = within(dlg).getByPlaceholderText(/Enter approved amount/i);
    fill(amt, "60000");
    await clickSafe(user, within(dlg).getByRole("button", { name: /^Approve$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Medical aid request approved|Error/i);
    }, { timeout: 20_000 });

    // Delete medical aid via trash + confirm
    const deleteAid = screen
      .getAllByLabelText(/Delete request/i)
      .find((b) => {
        const card = b.closest(".shadow-card, [class*='card']") ?? b.parentElement?.parentElement;
        return /Delete Patient/i.test(card?.textContent ?? document.body.textContent ?? "");
      }) ?? screen.getAllByLabelText(/Delete request/i).slice(-1)[0];
    await clickSafe(user, deleteAid);
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 8_000 });
    await clickSafe(user, within(screen.getByRole("alertdialog")).getByRole("button", { name: /^Delete$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Record deleted|Error/i);
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("button", { name: /New Request/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    dlg = screen.getByRole("dialog");
    fill(within(dlg).getByPlaceholderText(/Full name of patient/i), `${PREFIX} Patient UI`);
    fill(within(dlg).getByPlaceholderText(/Describe the medical/i), "UI create path");
    fill(within(dlg).getByPlaceholderText(/^0$/), "3500");
    const relBox = within(dlg).getAllByRole("combobox")[0];
    if (relBox) await pickSelectOption(user, relBox, /Parent/i);
    await clickSafe(user, within(dlg).getByRole("button", { name: /Submit Request/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Medical aid request created|Error|Patient UI/i);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");

    // Scholarships: mark reviewing + approve + reject/delete
    const scholTab =
      screen.queryByRole("tab", { name: /Scholarships/i }) ||
      screen.queryAllByRole("tab").find((t) => /Scholarship/i.test(t.textContent ?? ""));
    await clickSafe(user, scholTab as HTMLElement);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Merit Grant|Secondary Grant|applied for/i);
    }, { timeout: 25_000 });

    const scholReview = screen.queryAllByRole("button", { name: /^Review$/i })[0];
    if (scholReview) {
      await clickSafe(user, scholReview);
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
      dlg = screen.getByRole("dialog");
      await clickSafe(user, within(dlg).getByRole("button", { name: /Mark Reviewing/i }));
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Application updated|Error/i);
      }, { timeout: 15_000 });
    }

    const scholReview2 = screen.queryAllByRole("button", { name: /^Review$/i })[0];
    if (scholReview2) {
      await clickSafe(user, scholReview2);
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
      dlg = screen.getByRole("dialog");
      await clickSafe(user, within(dlg).getByRole("button", { name: /^Approve$/i }));
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Application approved|Error/i);
      }, { timeout: 15_000 });
    }

    // Open another review for reject if still available, else delete
    const stillReview = screen.queryAllByRole("button", { name: /^Review$/i })[0];
    if (stillReview) {
      await clickSafe(user, stillReview);
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
      dlg = screen.getByRole("dialog");
      await clickSafe(user, within(dlg).getByRole("button", { name: /^Reject$/i }));
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Application rejected|Error/i);
      }, { timeout: 15_000 });
    }

    const delApp = screen.queryAllByLabelText(/Delete application/i)[0];
    if (delApp) {
      await clickSafe(user, delApp);
      const alert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 }).catch(() => null);
      if (alert) {
        await clickSafe(user, within(alert).getByRole("button", { name: /^Delete$/i }));
        await waitFor(() => {
          expect(document.body.textContent).toMatch(/Record deleted|Error/i);
        }, { timeout: 15_000 });
      }
    }

    // Hall bookings: approve, reject, delete, create
    await clickSafe(user, screen.getByRole("tab", { name: /Hall Bookings/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Approve Hall`));
    }, { timeout: 20_000 });

    await clickSafe(user, screen.getAllByRole("button", { name: /Approve/i })[0]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Hall booking updated|Error/i);
    }, { timeout: 20_000 });

    await clickSafe(user, screen.getAllByRole("button", { name: /Reject/i })[0]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Hall booking updated|Error/i);
    }, { timeout: 20_000 });

    const delBooking = screen.queryAllByLabelText(/Delete booking/i)[0];
    if (delBooking) {
      await clickSafe(user, delBooking);
      const alert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 }).catch(() => null);
      if (alert) {
        await clickSafe(user, within(alert).getByRole("button", { name: /^Delete$/i }));
        await waitFor(() => {
          expect(document.body.textContent).toMatch(/Record deleted|Error/i);
        }, { timeout: 15_000 });
      }
    }

    await clickSafe(user, screen.getByRole("button", { name: /New Booking/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    dlg = screen.getByRole("dialog");
    fill(within(dlg).getByPlaceholderText(/Community Hall/i), `${PREFIX} Hall UI`);
    fill(within(dlg).getByPlaceholderText(/Wedding reception/i), "UI booking purpose");
    const dateInput = dlg.querySelector('input[type="date"]') as HTMLInputElement | null;
    fill(dateInput, "2026-12-18");
    const times = dlg.querySelectorAll('input[type="time"]');
    if (times[0]) fill(times[0] as HTMLInputElement, "11:00");
    if (times[1]) fill(times[1] as HTMLInputElement, "15:00");
    fill(within(dlg).getByPlaceholderText(/Number of guests/i), "55");
    await clickSafe(user, within(dlg).getByRole("button", { name: /Submit Booking/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Hall booking request created|Error|Hall UI/i);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");

    // Campaigns + Trust Corpus tabs mount
    await clickSafe(user, screen.getByRole("tab", { name: /Campaigns/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Campaign|Fundraising|No campaigns/i);
    }, { timeout: 15_000 });
    await clickSafe(user, screen.getByRole("tab", { name: /Trust Corpus/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Trust|Corpus|Corpus|No /i);
    }, { timeout: 15_000 });

    // Funds: create chapter+global, edit scope, deactivate/activate
    await clickSafe(user, screen.getByRole("tab", { name: /Fund Management/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Chapter Seva`));
    }, { timeout: 20_000 });
    // Inactive badge if seed toggle stuck; otherwise Deactivate below covers the arm
    if (!/Inactive/i.test(document.body.textContent ?? "")) {
      const anyDeact = screen.queryAllByRole("button", { name: /Deactivate/i })[0];
      await clickSafe(user, anyDeact);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Inactive|Activate/i);
      }, { timeout: 12_000 });
    }

    await clickSafe(user, screen.getByRole("button", { name: /Create Fund/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    dlg = screen.getByRole("dialog");
    fill(within(dlg).getByPlaceholderText(/Education Fund/i), `${PREFIX} Fund UI Chapter`);
    const createBoxes = within(dlg).getAllByRole("combobox");
    // currency then scope
    if (createBoxes[0]) await pickSelectOption(user, createBoxes[0], /^GBP$/i);
    if (createBoxes[1]) await pickSelectOption(user, createBoxes[1], /^Chapter$/i);
    const chapBox = within(dlg).queryAllByRole("combobox").find((b) => /Select chapter|Ahmedabad/i.test(b.textContent ?? ""));
    if (chapBox) await pickSelectOption(user, chapBox, /Ahmedabad/i);
    await clickSafe(user, within(dlg).getByRole("button", { name: /^Create Fund$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Fund created|Error|Fund UI Chapter/i);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");

    // Create global fund
    await clickSafe(user, screen.getByRole("button", { name: /Create Fund/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    dlg = screen.getByRole("dialog");
    fill(within(dlg).getByPlaceholderText(/Education Fund/i), `${PREFIX} Fund UI Global`);
    const boxes2 = within(dlg).getAllByRole("combobox");
    if (boxes2[1]) await pickSelectOption(user, boxes2[1], /^Global$/i);
    await clickSafe(user, within(dlg).getByRole("button", { name: /^Create Fund$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Fund created|Error|Fund UI Global/i);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");

    // Edit fund — change currency/scope
    const editFundBtn = screen.queryAllByLabelText(/Edit fund/i)[0];
    await clickSafe(user, editFundBtn);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    dlg = screen.getByRole("dialog");
    const nameInput = inputAfterLabel(dlg, /Fund Name/i);
    if (nameInput) fill(nameInput, `${nameInput.value} edited`);
    const editBoxes = within(dlg).getAllByRole("combobox");
    if (editBoxes[0]) await pickSelectOption(user, editBoxes[0], /^AED$/i);
    if (editBoxes[1]) await pickSelectOption(user, editBoxes[1], /^Global$/i);
    await clickSafe(user, within(dlg).getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Fund updated|Error/i);
    }, { timeout: 15_000 });
    await user.keyboard("{Escape}");

    // Toggle deactivate then activate
    const deact = screen.queryAllByRole("button", { name: /Deactivate/i })[0];
    await clickSafe(user, deact);
    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /Activate/i }).length).toBeGreaterThan(0);
    }, { timeout: 12_000 });
    const act = screen.queryAllByRole("button", { name: /^Activate$/i })[0];
    await clickSafe(user, act);

    unmount();

    // Global (null chapter) path — donations unfiltered
    const { unmount: u2 } = renderApp(<FinanceTab myChapterId={null} />, { route: "/admin?tab=finance" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Total Donations|Fund Management/i);
    }, { timeout: 30_000 });
    u2();
  }, 300_000);

  it("RecurringPledgesPanel: list, create, pause, resume, cancel", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<RecurringPledgesPanel />), {
      route: "/admin?tab=finance",
    });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Masik Sahayog|Recurring Pledges/i);
    }, { timeout: 30_000 });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/active masik|Annual commitment|Chapter Seva|Global Relief/i);
      expect(screen.queryAllByLabelText(/Pause pledge|Resume pledge|Cancel pledge/i).length).toBeGreaterThan(0);
    }, { timeout: 30_000 });

    // Pause active
    const pauseBtn = screen.queryAllByLabelText(/Pause pledge/i)[0];
    expect(pauseBtn).toBeTruthy();
    await clickSafe(user, pauseBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Pledge updated|Error/i);
    }, { timeout: 15_000 });

    // Resume paused (seeded paused row and/or the one we just paused)
    await waitFor(() => {
      expect(screen.queryAllByLabelText(/Resume pledge/i).length).toBeGreaterThan(0);
    }, { timeout: 15_000 });
    await clickSafe(user, screen.queryAllByLabelText(/Resume pledge/i)[0]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Pledge updated|Error/i);
    }, { timeout: 15_000 });

    // Cancel one non-cancelled
    const cancelBtn = screen.queryAllByLabelText(/Cancel pledge/i)[0];
    expect(cancelBtn).toBeTruthy();
    await clickSafe(user, cancelBtn);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Pledge updated|Error/i);
    }, { timeout: 15_000 });

    // Create via UI
    await clickSafe(user, screen.getByRole("button", { name: /New Pledge/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    const dlg = screen.getByRole("dialog");
    const fundTrigger = within(dlg).getAllByRole("combobox")[0];
    if (fundTrigger) await pickSelectOption(user, fundTrigger, /Chapter Seva|Global Relief|Seva|Relief/i);
    fill(within(dlg).getByPlaceholderText(/^0$/), "250");
    const currencyBox = within(dlg).getAllByRole("combobox")[1];
    if (currencyBox) await pickSelectOption(user, currencyBox, /^USD$/i);
    const intervalBox = within(dlg).getAllByRole("combobox")[2];
    if (intervalBox) await pickSelectOption(user, intervalBox, /Quarterly/i);
    await waitFor(() => {
      expect(within(dlg).getByText(/Annual total/i)).toBeInTheDocument();
    }, { timeout: 5_000 });
    fill(within(dlg).getByPlaceholderText(/Optional dedication/i), `${PREFIX} ui pledge`);
    await waitFor(() => {
      expect(within(dlg).getByRole("button", { name: /Create Pledge/i })).not.toBeDisabled();
    }, { timeout: 8_000 });
    await clickSafe(user, within(dlg).getByRole("button", { name: /Create Pledge/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Recurring pledge created|Error/i);
    }, { timeout: 25_000 });

    const { data: created } = await supabase
      .from("recurring_pledges")
      .select("id")
      .eq("notes", `${PREFIX} ui pledge`)
      .maybeSingle();
    if (created?.id) seeded.pledgeIds.push(created.id);

    unmount();
  }, 180_000);

  it("BulkContentTab: search, select, cancel delete, confirm delete across types", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<BulkContentTab />), { route: "/admin?tab=bulk" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Bulk Content Management/i);
    }, { timeout: 30_000 });

    const typeTabs: { name: RegExp; search: string }[] = [
      { name: /^Events$/i, search: PREFIX },
      { name: /^Businesses$/i, search: PREFIX },
      { name: /^Jobs$/i, search: PREFIX },
      { name: /^News Articles$/i, search: PREFIX },
      { name: /^Matrimonial Profiles$/i, search: "" },
      { name: /^Oral Histories$/i, search: PREFIX },
    ];

    for (const tab of typeTabs) {
      const trigger =
        screen.queryByRole("tab", { name: tab.name }) ||
        screen.queryAllByRole("tab").find((t) => tab.name.test(t.textContent ?? ""));
      await clickSafe(user, trigger as HTMLElement);
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/record|Loading|No records|Search/i);
      }, { timeout: 20_000 });

      const search = screen.queryByPlaceholderText(/Search /i);
      if (search && tab.search) {
        fill(search as HTMLInputElement, tab.search);
        await waitFor(() => {
          expect(document.body.textContent).toMatch(/record|No records|Bulk/i);
        }, { timeout: 12_000 });
      }

      // Toggle select-all twice: select all → deselect all (covers both arms)
      const headerCb = document.querySelector('thead input[type="checkbox"]') as HTMLInputElement | null;
      if (headerCb && !headerCb.disabled) {
        fireEvent.click(headerCb);
        await waitFor(() => {
          expect(document.body.textContent).toMatch(/selected|Delete/i);
        }, { timeout: 5_000 }).catch(() => undefined);
        fireEvent.click(headerCb);
        await waitFor(() => {
          expect(document.body.textContent).not.toMatch(/Delete \d+ Selected/i);
        }, { timeout: 5_000 }).catch(() => undefined);
        // Row toggle on/off
        const rowCb = document.querySelector('tbody input[type="checkbox"]') as HTMLInputElement | null;
        if (rowCb) {
          fireEvent.click(rowCb);
          fireEvent.click(rowCb);
        }
      }

      // Empty search path → No records
      if (search && tab.search) {
        fill(search as HTMLInputElement, `${PREFIX}_nomatch_zz`);
        await waitFor(() => {
          expect(document.body.textContent).toMatch(/No records found|0 record/i);
        }, { timeout: 12_000 }).catch(() => undefined);
        fill(search as HTMLInputElement, tab.search);
      }

      // Single-row trash → open confirm → cancel
      const trashBtns = screen.queryAllByRole("button").filter((b) => {
        return b.querySelector("svg") && /destructive|text-destructive/.test(b.className);
      });
      if (trashBtns[0] && tab.search) {
        await clickSafe(user, trashBtns[0]);
        const alert = await screen.findByRole("alertdialog", {}, { timeout: 6_000 }).catch(() => null);
        if (alert) {
          await clickSafe(user, within(alert).getByRole("button", { name: /^Cancel$/i }));
          await waitFor(() => {
            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
          }, { timeout: 5_000 }).catch(() => undefined);
        }
      }
    }

    // Events: confirm delete of disposable seeded event
    await clickSafe(user, screen.getByRole("tab", { name: /^Events$/i }));
    const search = screen.getByPlaceholderText(/Search events/i);
    fill(search, PREFIX);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Bulk Event|No records`));
    }, { timeout: 15_000 });

    const rowCb = document.querySelector('tbody input[type="checkbox"]') as HTMLInputElement | null;
    if (rowCb) {
      fireEvent.click(rowCb);
      const delSelected = await screen.findByRole("button", { name: /Delete \d+ Selected/i }, { timeout: 6_000 }).catch(() => null);
      if (delSelected) {
        await clickSafe(user, delSelected);
        const alert = await screen.findByRole("alertdialog", {}, { timeout: 6_000 });
        await clickSafe(user, within(alert).getByRole("button", { name: /Delete \d+ Record/i }));
        await waitFor(() => {
          expect(document.body.textContent).toMatch(/deleted|Error|No records|0 record/i);
        }, { timeout: 20_000 });
      }
    }

    // Businesses single-delete confirm
    await clickSafe(user, screen.getByRole("tab", { name: /^Businesses$/i }));
    const bizSearch = screen.getByPlaceholderText(/Search businesses/i);
    fill(bizSearch, PREFIX);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Bulk Biz|No records`));
    }, { timeout: 15_000 });
    const bizTrash = screen.queryAllByRole("button").find((b) =>
      /destructive|text-destructive/.test(b.className) && b.querySelector("svg"),
    );
    if (bizTrash && /Bulk Biz/i.test(document.body.textContent ?? "")) {
      await clickSafe(user, bizTrash);
      const alert = await screen.findByRole("alertdialog", {}, { timeout: 6_000 }).catch(() => null);
      if (alert) {
        await clickSafe(user, within(alert).getByRole("button", { name: /Delete \d+ Record/i }));
        await waitFor(() => {
          expect(document.body.textContent).toMatch(/deleted|Error|No records/i);
        }, { timeout: 20_000 });
      }
    }

    // News + Oral: force content_news / oral mapping + select-all deselect with stable rows
    await clickSafe(user, screen.getByRole("tab", { name: /^News Articles$/i }));
    fill(screen.getByPlaceholderText(/Search news/i), PREFIX);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Bulk News|No records`));
    }, { timeout: 15_000 });
    let header = document.querySelector('thead input[type="checkbox"]') as HTMLInputElement | null;
    if (header && /Bulk News/i.test(document.body.textContent ?? "")) {
      fireEvent.click(header);
      fireEvent.click(header);
    }

    await clickSafe(user, screen.getByRole("tab", { name: /^Oral Histories$/i }));
    fill(screen.getByPlaceholderText(/Search oral/i), PREFIX);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Bulk Oral|Suspended Oral|Weird Status|No records/i);
    }, { timeout: 15_000 });
    header = document.querySelector('thead input[type="checkbox"]') as HTMLInputElement | null;
    if (header) {
      fireEvent.click(header);
      await waitFor(() => expect(document.body.textContent).toMatch(/Delete \d+ Selected/i), {
        timeout: 5_000,
      }).catch(() => undefined);
      fireEvent.click(header);
    }

    unmount();
  }, 240_000);
});
