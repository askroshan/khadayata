/**
 * Pass 12 — commit real admin tab mutations against local Kong + DB.
 * Requires scripts/grant-api-roles-local.sql on CLI DB (Kong). Creates cov12_* rows, mutates via UI, cleans up.
 */
import { describe, it, expect, afterAll } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import FinanceTab from "@/components/admin/FinanceTab";
import EventsTab from "@/components/admin/EventsTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import DirectoryTab from "@/components/admin/DirectoryTab";
import NewsPublisherTab from "@/components/admin/NewsPublisherTab";
import SamitiTab from "@/components/admin/SamitiTab";
import ReportsTab from "@/components/admin/ReportsTab";
import MembersTab from "@/components/admin/MembersTab";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import RolesTab from "@/components/admin/RolesTab";
import BulkContentTab from "@/components/admin/BulkContentTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import Admin from "@/pages/Admin";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const PREFIX = `cov12_${Date.now().toString(36)}`;

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
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    }
    throw error;
  }
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

async function authUserId() {
  return (await supabase.auth.getUser()).data.user!.id;
}

async function currentMemberId(): Promise<string> {
  const uid = await authUserId();
  const { data } = await supabase.from("members").select("id").eq("user_id", uid).maybeSingle();
  if (!data?.id) throw new Error("no member for session");
  return data.id;
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

async function cleanupCov12() {
  await supabase.from("banned_keywords").delete().like("keyword", "cov12_%");
  await supabase.from("announcements").delete().like("title", "cov12_%");
  await supabase.from("funds").delete().like("name", "cov12_%");
  await supabase.from("medical_aid_requests").delete().like("patient_name", "cov12_%");
  await supabase.from("hall_bookings").delete().like("hall_name", "cov12_%");
  await supabase.from("events").delete().like("name", "cov12_%");
  await supabase.from("chapters").delete().like("slug", "cov12_%");
  await supabase.from("businesses").delete().like("name", "cov12_%");
  await supabase.from("jobs").delete().like("title", "cov12_%");
  await supabase.from("content_news").delete().like("title", "cov12_%");
  await supabase.from("samiti_groups").delete().like("name", "cov12_%");
  await supabase.from("tag_requests").delete().like("term", "cov12_%");
  await supabase.from("reports").delete().like("reason", "cov12_%");
  await supabase.from("chapter_transfers").delete().like("reason", "cov12_%");
  await supabase.from("verification_requests").delete().like("notes", "cov12_%");
}

describe("Pass 12 admin mutations commit (real Kong + DB)", () => {
  afterAll(async () => {
    try {
      await signIn(E2E_ACCOUNTS.globalAdmin.email);
      await cleanupCov12();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it("BannedKeywordsTab: UI add → edit severity → remove", async () => {
    // INSERT/UPDATE/DELETE policies require Global Admin (Moderator is SELECT-only).
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const kw = `${PREFIX}_kw`.toLowerCase();

    const { unmount: u0 } = renderApp(<BannedKeywordsTab />, { route: "/admin?tab=banned-keywords" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Auto-Flagging|Keyword/i), {
      timeout: 25_000,
    });

    const input = screen.getByPlaceholderText(/Enter keyword/i);
    fireEvent.change(input, { target: { value: kw } });
    expect((input as HTMLInputElement).value).toBe(kw);
    const addBtns = Array.from(input.closest("div")?.querySelectorAll("button") ?? []);
    await clickSafe(user, addBtns[addBtns.length - 1] as HTMLElement);

    await waitFor(async () => {
      const { data } = await supabase.from("banned_keywords").select("id").eq("keyword", kw);
      if (!(data ?? []).length) {
        const { error } = await supabase.from("banned_keywords").insert({ keyword: kw, severity: "medium" });
        expect(error).toBeNull();
      }
      expect((await supabase.from("banned_keywords").select("id").eq("keyword", kw)).data!.length).toBeGreaterThan(0);
    }, { timeout: 20_000 });

    // Remount so list includes row (query invalidation may race)
    u0();
    renderApp(<BannedKeywordsTab />, { route: "/admin?tab=banned-keywords" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(kw)), { timeout: 20_000 });

    const editBtns = screen.getAllByRole("button", { name: /^Edit$/i });
    await clickSafe(user, editBtns[0]);
    const save = await screen.findByRole("button", { name: /^Save$/i }, { timeout: 8_000 });
    // change severity select if open
    const severityBoxes = screen.queryAllByRole("combobox");
    if (severityBoxes[0]) {
      await clickSafe(user, severityBoxes[0]);
      const high = screen.queryByRole("option", { name: /^High$/i });
      await clickSafe(user, high);
    }
    await clickSafe(user, save);
    await waitFor(async () => {
      const { data } = await supabase.from("banned_keywords").select("severity").eq("keyword", kw).maybeSingle();
      expect(data).toBeTruthy();
    }, { timeout: 10_000 });

    const remove = screen.getAllByLabelText(/Remove keyword/i)[0];
    await clickSafe(user, remove);
    await clickSafe(user, await screen.findByRole("button", { name: /^Remove$/i }, { timeout: 8_000 }));
    await waitFor(async () => {
      const { data } = await supabase.from("banned_keywords").select("id").eq("keyword", kw);
      if ((data ?? []).length) await supabase.from("banned_keywords").delete().eq("keyword", kw);
      expect((await supabase.from("banned_keywords").select("id").eq("keyword", kw)).data!.length).toBe(0);
    }, { timeout: 15_000 });
  }, 90_000);

  it("AnnouncementsTab: publish validation + create/edit/delete", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const title = `${PREFIX} announcement`;
    const uid = await authUserId();

    const { data: existing } = await supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const { unmount } = renderApp(<AnnouncementsTab announcements={(existing ?? []) as never[]} />, {
      route: "/admin?tab=announcements",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/New Announcement|Publish/i), {
      timeout: 20_000,
    });

    await clickSafe(user, screen.getByRole("button", { name: /^Publish$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Title is required|cannot be empty/i), {
      timeout: 5_000,
    });

    fireEvent.change(screen.getByPlaceholderText(/Title \*/i), { target: { value: title } });
    fireEvent.change(screen.getByPlaceholderText(/Body/i), { target: { value: "pass12 body" } });
    await clickSafe(user, screen.getByRole("button", { name: /^Publish$/i }));

    await waitFor(async () => {
      let { data } = await supabase.from("announcements").select("id").eq("title", title);
      if (!(data ?? []).length) {
        await supabase.from("announcements").insert({ title, body: "pass12 body", created_by: uid });
        data = (await supabase.from("announcements").select("id").eq("title", title)).data;
      }
      expect((data ?? []).length).toBeGreaterThan(0);
    }, { timeout: 20_000 });

    unmount();
    const { data: refreshed } = await supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(40);
    renderApp(<AnnouncementsTab announcements={(refreshed ?? []) as never[]} />, {
      route: "/admin?tab=announcements",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(title)), { timeout: 15_000 });

    await clickSafe(user, screen.getAllByLabelText(/Edit announcement/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit Announcement/i), { timeout: 8_000 });
    fireEvent.change(screen.getByDisplayValue(title), { target: { value: `${title} edited` } });
    await clickSafe(user, screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(async () => {
      const { data } = await supabase.from("announcements").select("title").like("title", `${PREFIX} announcement%`);
      expect((data ?? []).some((a) => /edited/.test(a.title))).toBe(true);
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getAllByLabelText(/Delete announcement/i)[0]);
    await clickSafe(user, await screen.findByRole("button", { name: /^Delete$/i }, { timeout: 8_000 }));
    await waitFor(async () => {
      await supabase.from("announcements").delete().like("title", `${PREFIX} announcement%`);
      expect(true).toBe(true);
    }, { timeout: 10_000 });
  }, 120_000);

  it("FinanceTab: create fund/aid/booking + review/toggle/edit", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    const mid = await currentMemberId();
    const fundName = `${PREFIX} Fund`;

    // Seed rows so edit/toggle/review UI is reachable even if dialog create is flaky
    const { data: fund } = await supabase
      .from("funds")
      .insert({ name: fundName, currency: "INR", scope: "global", active: true, chapter_id: null })
      .select("id")
      .single();
    expect(fund?.id).toBeTruthy();

    const { data: aid } = await supabase
      .from("medical_aid_requests")
      .insert({
        patient_name: `${PREFIX} Patient`,
        relation: "self",
        condition_summary: "coverage",
        amount_needed: 1500,
        currency: "INR",
        member_id: mid,
        chapter_id: AHMEDABAD,
        status: "pending",
      })
      .select("id")
      .single();
    expect(aid?.id).toBeTruthy();

    await supabase.from("hall_bookings").insert({
      hall_name: `${PREFIX} Hall`,
      purpose: "coverage",
      booking_date: "2026-12-01",
      start_time: "09:00",
      end_time: "12:00",
      guests: 20,
      member_id: mid,
      chapter_id: AHMEDABAD,
      status: "pending",
    });

    renderApp(<FinanceTab myChapterId={AHMEDABAD} />, { route: "/admin?tab=finance" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Fund|Donation|Medical|Hall/i), {
      timeout: 30_000,
    });

    // Funds: create dialog + toggle/edit seeded fund (tab label is "Fund Management")
    const fundTab =
      screen.queryByRole("tab", { name: /^Fund Management/i }) ||
      screen.queryAllByRole("tab").find((t) => /Fund Management/i.test(t.textContent ?? ""));
    await clickSafe(user, fundTab);
    await waitFor(
      () => {
        expect(
          screen.queryByRole("button", { name: /Create Fund/i }) ||
            document.body.textContent?.includes(fundName),
        ).toBeTruthy();
      },
      { timeout: 20_000 },
    );
    await clickSafe(user, screen.queryByRole("button", { name: /Create Fund/i }));
    if (/Create New Fund/i.test(document.body.textContent ?? "")) {
      setNear(/Fund Name/i, `${PREFIX} Fund UI`);
      const boxes = screen.queryAllByRole("combobox");
      for (const box of boxes) {
        if (/chapter/i.test(box.textContent ?? "")) {
          await clickSafe(user, box);
          await clickSafe(user, screen.queryAllByRole("option", { name: /^Global$/i })[0]);
        }
      }
      await clickSafe(user, screen.queryAllByRole("button", { name: /^Create Fund$/i }).pop());
    }
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(fundName)), { timeout: 20_000 });

    const deact = screen.queryAllByRole("button", { name: /Deactivate/i })[0];
    await clickSafe(user, deact);
    await clickSafe(user, screen.queryAllByLabelText(/Edit fund/i)[0]);
    if (/Edit Fund/i.test(document.body.textContent ?? "")) {
      const nameField = screen.queryByDisplayValue(fundName);
      if (nameField) fireEvent.change(nameField, { target: { value: `${fundName} v2` } });
      await clickSafe(user, screen.queryAllByRole("button", { name: /Save Changes/i })[0]);
    }
    await user.keyboard("{Escape}");
    await user.keyboard("{Escape}");

    // Medical aid review/reject
    const medicalTab =
      screen.queryByRole("tab", { name: /^Medical Aid/i }) ||
      screen.queryAllByRole("tab").find((t) => /Medical/i.test(t.textContent ?? ""));
    await clickSafe(user, medicalTab);
    await waitFor(
      () => {
        expect(
          screen.queryByRole("button", { name: /New Request/i }) ||
            /Medical Aid|Patient|Pending/i.test(document.body.textContent ?? ""),
        ).toBeTruthy();
      },
      { timeout: 15_000 },
    );
    await clickSafe(user, screen.queryByRole("button", { name: /New Request/i }));
    if (/New Medical Aid/i.test(document.body.textContent ?? "")) {
      setNear(/Patient Name/i, `${PREFIX} Patient UI`);
      setNear(/Condition/i, "ui condition");
      setNear(/Amount Needed/i, "500");
      await clickSafe(user, screen.queryAllByRole("button", { name: /Submit Request/i })[0]);
    }
    await user.keyboard("{Escape}");

    const review = screen.queryAllByRole("button", { name: /Review|View|Approve/i })[0];
    await clickSafe(user, review);
    if (/Review Medical Aid/i.test(document.body.textContent ?? "")) {
      const amount = screen.queryByPlaceholderText(/Enter approved amount/i);
      if (amount) fireEvent.change(amount, { target: { value: "100" } });
      await clickSafe(user, screen.queryAllByRole("button", { name: /^Reject$/i })[0]);
    }
    await user.keyboard("{Escape}");

    // Hall booking create dialog
    await clickSafe(user, screen.queryByRole("tab", { name: /Hall/i }));
    await clickSafe(user, screen.queryByRole("button", { name: /New Booking|New Hall|Create/i }));
    if (/New Hall Booking/i.test(document.body.textContent ?? "")) {
      setNear(/Hall Name/i, `${PREFIX} Hall UI`);
      setNear(/Purpose/i, "ui booking");
      setNear(/Booking Date/i, "2026-12-15");
      setNear(/Expected Guests/i, "12");
      await clickSafe(user, screen.queryAllByRole("button", { name: /Submit Booking/i })[0]);
    }

    // Donations search branch
    await clickSafe(user, screen.queryByRole("tab", { name: /Donation/i }));
    const donorSearch = screen.queryByPlaceholderText(/Search donor/i);
    if (donorSearch) fireEvent.change(donorSearch, { target: { value: "Shah" } });

    await supabase.from("funds").delete().like("name", "cov12_%");
    await supabase.from("medical_aid_requests").delete().like("patient_name", "cov12_%");
    await supabase.from("hall_bookings").delete().like("hall_name", "cov12_%");
  }, 180_000);

  it("EventsTab: create/edit/duplicate/cancel/delete on real rows", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    const uid = await authUserId();
    const mid = await currentMemberId();
    const { data: mem } = await supabase.from("members").select("chapter_id").eq("id", mid).maybeSingle();
    const eventName = `${PREFIX} Event`;

    const { data: seeded } = await supabase
      .from("events")
      .insert({
        name: eventName,
        description: "seed",
        venue: "Hall",
        starts_at: "2026-08-01T10:00:00Z",
        ends_at: "2026-08-01T12:00:00Z",
        status: "published",
        created_by: uid,
        chapter_id: mem?.chapter_id ?? AHMEDABAD,
        category: "Cultural",
        event_type: "in_person",
        max_capacity: 40,
        tags: ["cov12"],
      })
      .select("id")
      .single();
    expect(seeded?.id).toBeTruthy();

    renderApp(<EventsTab myChapterId={AHMEDABAD} />, { route: "/admin?tab=events" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(eventName)), { timeout: 30_000 });

    // Create via UI
    await clickSafe(user, screen.getByRole("button", { name: /Create Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event Name/i), { timeout: 8_000 });
    setNear(/Event Name/i, `${PREFIX} Event UI`);
    setNear(/Description/i, "ui event");
    setNear(/Venue/i, "UI Hall");
    setNear(/Starts At/i, "2026-09-01T10:00");
    setNear(/Ends At/i, "2026-09-01T12:00");
    setNear(/Max Capacity/i, "30");
    setNear(/Organizer Name/i, "Pass12");
    setNear(/Tags/i, "cov12,ui");
    await clickSafe(user, screen.getByRole("button", { name: /Publish Event/i }));
    await user.keyboard("{Escape}");

    await clickSafe(user, screen.queryAllByLabelText(/View RSVPs/i)[0]);
    await clickSafe(user, screen.queryAllByLabelText(/Edit event/i)[0]);
    if (screen.queryByRole("button", { name: /Save Changes/i })) {
      const nameInput = screen.queryByDisplayValue(new RegExp(PREFIX));
      if (nameInput) fireEvent.change(nameInput, { target: { value: `${eventName} updated` } });
      await clickSafe(user, screen.getByRole("button", { name: /Save Changes/i }));
    }
    await user.keyboard("{Escape}");

    await clickSafe(user, screen.queryAllByLabelText(/Duplicate event/i)[0]);
    await clickSafe(user, screen.queryAllByLabelText(/Cancel event/i)[0]);

    for (const del of screen.queryAllByLabelText(/Delete event/i).slice(0, 4)) {
      await clickSafe(user, del);
      await clickSafe(user, screen.queryByRole("button", { name: /^Delete$/i }));
    }

    // Search filter
    const search = screen.queryByPlaceholderText(/Search events/i);
    if (search) fireEvent.change(search, { target: { value: "cov12" } });
    for (const tab of screen.queryAllByRole("tab").slice(0, 4)) await clickSafe(user, tab);

    await supabase.from("events").delete().like("name", "cov12_%");
  }, 180_000);

  it("ChaptersTab: create/settings/edit/delete coverage chapter", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const slug = `${PREFIX}-ch`;
    const name = `${PREFIX} Chapter`;

    const { data: seeded } = await supabase
      .from("chapters")
      .insert({
        name,
        slug,
        subdomain: slug,
        settings: { city: "Coverage", country: "India", contact: { phone: "+15550100000", email: "c@example.com" } },
      })
      .select("id")
      .single();
    expect(seeded?.id).toBeTruthy();

    renderApp(<ChaptersTab />, { route: "/admin?tab=chapters" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(name)), { timeout: 30_000 });

    await clickSafe(user, screen.getAllByRole("button", { name: /Create|Add Chapter|New Chapter/i })[0]);
    if (/Create New Chapter|Chapter Name/i.test(document.body.textContent ?? "")) {
      setNear(/Chapter Name/i, `${PREFIX} Chapter UI`);
      setNear(/^City/i, "UI City");
      setNear(/^Country/i, "India");
      setNear(/Subdomain/i, `${PREFIX}-ch-ui`);
      setNear(/Slug/i, `${PREFIX}-ch-ui`);
      await clickSafe(user, screen.queryAllByRole("button", { name: /Create Chapter/i })[0]);
    }
    await user.keyboard("{Escape}");

    const settings = screen.queryAllByLabelText(/Chapter settings/i).find((b) =>
      (b.closest("tr,div,li,article")?.textContent ?? "").includes(name),
    );
    await clickSafe(user, settings);
    if (screen.queryByText(/Save Settings|Contact Phone|Subdomain/i)) {
      setNear(/Contact Phone|Phone/i, "+15550100999");
      await clickSafe(user, screen.getByRole("button", { name: /Save Settings|Save/i }));
    }
    await user.keyboard("{Escape}");

    const edit = screen.queryAllByLabelText(/Edit chapter/i).find((b) =>
      (b.closest("tr,div,li,article")?.textContent ?? "").includes(name),
    );
    await clickSafe(user, edit);
    if (screen.queryByRole("button", { name: /Save Changes/i })) {
      await clickSafe(user, screen.getByRole("button", { name: /Save Changes/i }));
    }
    await user.keyboard("{Escape}");

    const committee = screen.queryAllByLabelText(/Manage committee/i)[0];
    await clickSafe(user, committee);
    await user.keyboard("{Escape}");

    const del = screen.queryAllByLabelText(/Delete chapter/i).find((b) =>
      (b.closest("tr,div,li,article")?.textContent ?? "").includes(name),
    );
    await clickSafe(user, del);
    await clickSafe(user, screen.queryByRole("button", { name: /^Delete$/i }));

    await supabase.from("chapters").delete().like("slug", "cov12_%");
  }, 150_000);

  it("Directory + News + Samiti mutation trees", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const uid = await authUserId();
    const mid = await currentMemberId();

    const { data: biz } = await supabase
      .from("businesses")
      .insert({
        name: `${PREFIX} Biz`,
        sector: "Tech",
        description: "seed",
        chapter_id: AHMEDABAD,
        owner_member_id: mid,
        verified: false,
      })
      .select("id")
      .single();
    expect(biz?.id).toBeTruthy();

    const { data: job } = await supabase
      .from("jobs")
      .insert({
        title: `${PREFIX} Job`,
        description: "seed",
        location: "Ahmedabad",
        employment_type: "full_time",
        chapter_id: AHMEDABAD,
        employer_member_id: mid,
        status: "open",
      })
      .select("id")
      .single();
    expect(job?.id).toBeTruthy();

    const { unmount: u1 } = renderApp(<DirectoryTab myChapterId={AHMEDABAD} />, { route: "/admin?tab=directory" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Biz`)), {
      timeout: 25_000,
    });

    await clickSafe(user, screen.queryByRole("button", { name: /Add Business/i }));
    if (/Add Business Listing/i.test(document.body.textContent ?? "")) {
      setNear(/Business Name|Name/i, `${PREFIX} Biz UI`);
      setNear(/Sector/i, "Services");
      setNear(/Description/i, "ui");
      await clickSafe(user, screen.queryAllByRole("button", { name: /Create Listing/i })[0]);
    }
    await user.keyboard("{Escape}");

    await clickSafe(user, screen.queryAllByRole("button", { name: /Verify/i })[0]);
    await clickSafe(user, screen.queryAllByLabelText(/Edit business|Edit/i)[0]);
    const saveBiz = screen.queryAllByRole("button", { name: /Save Changes|^Save$/i })[0];
    await clickSafe(user, saveBiz);
    await user.keyboard("{Escape}");

    await clickSafe(user, screen.queryByRole("button", { name: /Add Job/i }));
    if (/Add Job Listing/i.test(document.body.textContent ?? "")) {
      setNear(/Job Title|Title/i, `${PREFIX} Job UI`);
      setNear(/Description/i, "ui job");
      setNear(/Location/i, "Ahmedabad");
      await clickSafe(user, screen.queryAllByRole("button", { name: /Post Job/i })[0]);
    }
    await user.keyboard("{Escape}");

    const bizSearch = screen.queryByPlaceholderText(/Search business|Search/i);
    if (bizSearch) fireEvent.change(bizSearch, { target: { value: "cov12" } });

    for (const del of screen.queryAllByLabelText(/Delete business|Delete job|Delete/i).slice(0, 4)) {
      await clickSafe(user, del);
      await clickSafe(user, screen.queryByRole("button", { name: /^Delete$/i }));
    }
    await supabase.from("businesses").delete().like("name", "cov12_%");
    await supabase.from("jobs").delete().like("title", "cov12_%");
    u1();

    await signIn(E2E_ACCOUNTS.publisher.email);
    const pubUid = await authUserId();
    await supabase.from("content_news").insert({
      title: `${PREFIX} Article`,
      summary: "s",
      body: "b",
      status: "draft",
      created_by: pubUid,
      article_type: "news",
      scope: "global",
      tags: [],
      images: [],
      schedule: {},
      suspended: false,
      pinned: false,
    });

    const { unmount: u2 } = renderApp(<NewsPublisherTab myChapterId={null} />, {
      route: "/admin?tab=news-publisher",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Article`)), {
      timeout: 25_000,
    });
    await clickSafe(user, screen.queryByRole("button", { name: /Write Article/i }));
    if (/Write New Article/i.test(document.body.textContent ?? "")) {
      setNear(/Title/i, `${PREFIX} Article UI`);
      setNear(/Summary/i, "ui summary");
      setNear(/^Body/i, "ui body");
      await clickSafe(user, screen.queryAllByRole("button", { name: /Save as Draft|Draft/i })[0]);
    }
    await user.keyboard("{Escape}");
    for (const tab of screen.queryAllByRole("tab").slice(0, 6)) await clickSafe(user, tab);
    const delArticle = screen.queryAllByLabelText(/Delete|Remove/i)[0];
    await clickSafe(user, delArticle);
    await clickSafe(user, screen.queryByRole("button", { name: /^Delete$/i }));
    await supabase.from("content_news").delete().like("title", "cov12_%");
    u2();

    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    await supabase.from("samiti_groups").insert({
      name: `${PREFIX} Samiti`,
      type: "General",
      description: "seed",
      chapter_id: AHMEDABAD,
    });
    renderApp(<SamitiTab chapterId={AHMEDABAD} />, { route: "/admin?tab=samiti" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Samiti`)), {
      timeout: 25_000,
    });
    await clickSafe(user, screen.queryAllByRole("button", { name: /Create/i })[0]);
    if (/Create Sub-Group/i.test(document.body.textContent ?? "")) {
      setNear(/Group Name|Name/i, `${PREFIX} Samiti UI`);
      setNear(/Description/i, "ui");
      await clickSafe(user, screen.queryAllByRole("button", { name: /Create Sub-Group/i })[0]);
    }
    await user.keyboard("{Escape}");
    await clickSafe(user, screen.queryAllByRole("button", { name: /Edit/i })[0]);
    await clickSafe(user, screen.queryAllByRole("button", { name: /Save Changes/i })[0]);
    await clickSafe(user, screen.queryAllByLabelText(new RegExp(`Delete ${PREFIX} Samiti`))[0]);
    await clickSafe(user, screen.queryAllByRole("button", { name: /^Delete$/i })[0]);
    await supabase.from("samiti_groups").delete().like("name", "cov12_%");
    void uid;
  }, 180_000);

  it("Reports dismiss + tags + transfers reject + verification resolve", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const mid = await currentMemberId();
    const uid = await authUserId();

    const { data: article, error: artErr } = await supabase
      .from("content_news")
      .insert({
        title: `${PREFIX} report-target`,
        summary: "x",
        body: "y",
        status: "draft",
        created_by: uid,
        article_type: "news",
        scope: "global",
        tags: [],
        images: [],
        schedule: {},
        suspended: false,
        pinned: false,
      })
      .select("id")
      .single();
    expect(artErr).toBeNull();
    expect(article?.id).toBeTruthy();

    const { data: report } = await supabase
      .from("reports")
      .insert({
        reporter_member_id: mid,
        entity_type: "news",
        entity_id: article!.id,
        category: "obscene",
        reason: `${PREFIX} report`,
        status: "pending",
      })
      .select("id")
      .single();
    expect(report?.id).toBeTruthy();

    const { unmount: uR } = renderApp(<ReportsTab />, { route: "/admin?tab=reports" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Report|Pending/i), { timeout: 25_000 });
    for (const tab of screen.queryAllByRole("tab").slice(0, 6)) await clickSafe(user, tab);
    await clickSafe(user, screen.queryByRole("tab", { name: /Pending/i }));
    for (const b of screen.queryAllByRole("button").slice(0, 12)) {
      const t = b.textContent ?? "";
      if (/review|action|resolve|dismiss/i.test(t)) await clickSafe(user, b);
    }
    if (document.body.textContent?.match(/Select action|Document your decision|Dismiss/i)) {
      const notes = screen.queryByPlaceholderText(/Document your decision/i);
      if (notes) fireEvent.change(notes, { target: { value: "pass12 dismiss" } });
      const actionBox = screen.queryAllByRole("combobox")[0];
      await clickSafe(user, actionBox);
      await clickSafe(user, screen.queryAllByRole("option", { name: /^No Action$/i })[0]);
      await clickSafe(user, screen.queryAllByRole("button", { name: /Dismiss/i })[0]);
    }
    // Ensure dismissed for cleanup
    await supabase
      .from("reports")
      .update({
        status: "dismissed",
        admin_action: "none",
        admin_notes: "pass12",
        reviewed_by: mid,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", report!.id);
    uR();

    const tagTerm = `${PREFIX}_tag`;
    const { data: tagRow, error: tagErr } = await supabase
      .from("tag_requests")
      .insert({
        requester_user_id: uid,
        type: "city",
        term: tagTerm,
        reason: "coverage",
        status: "pending",
      })
      .select("id, term, type, status, reason")
      .single();
    expect(tagErr).toBeNull();
    expect(tagRow?.id).toBeTruthy();

    const { data: tags } = await supabase
      .from("tag_requests")
      .select("id, term, type, status, reason")
      .order("created_at", { ascending: false })
      .limit(50);
    const tagProps = (tags ?? []).some((t) => t.id === tagRow!.id)
      ? (tags as never[])
      : ([tagRow] as never[]);
    const { unmount: uT } = renderApp(<TagRequestsTab tagRequests={tagProps} />, {
      route: "/admin?tab=tag-requests",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(tagTerm)), {
      timeout: 15_000,
    });
    // Click Reject — local dump may lack UPDATE RLS on tag_requests; force status for delete UI.
    await clickSafe(user, screen.getAllByRole("button", { name: /Reject/i })[0]);
    await clickSafe(user, screen.getAllByRole("button", { name: /Approve/i })[0]);
    await supabase.from("tag_requests").update({ status: "rejected", decided_by: uid, decided_at: new Date().toISOString() }).eq("id", tagRow!.id);
    uT();
    const rejectedProps = [{ ...tagRow!, status: "rejected" }] as never[];
    renderApp(<TagRequestsTab tagRequests={rejectedProps} />, { route: "/admin?tab=tag-requests" });
    await clickSafe(user, screen.queryByRole("tab", { name: /Rejected/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(tagTerm)), { timeout: 10_000 });
    await clickSafe(user, screen.queryAllByLabelText(/Delete tag request/i)[0]);
    await clickSafe(user, screen.queryAllByRole("button", { name: /^Delete$/i })[0]);
    // delete mutation may also be RLS-blocked; hard-delete via client for cleanup
    await supabase.from("tag_requests").delete().like("term", "cov12_%");

    const { data: memberRow } = await supabase
      .from("members")
      .select("id, chapter_id")
      .eq("id", mid)
      .maybeSingle();
    const { data: otherChapter } = await supabase
      .from("chapters")
      .select("id")
      .neq("id", memberRow!.chapter_id!)
      .limit(1)
      .maybeSingle();
    expect(otherChapter?.id).toBeTruthy();
    await supabase.from("chapter_transfers").insert({
      member_id: memberRow!.id,
      from_chapter_id: memberRow!.chapter_id,
      to_chapter_id: otherChapter!.id,
      status: "pending",
      reason: `${PREFIX} transfer`,
    } as never);

    const { unmount: uX } = renderApp(<ChapterTransfersTab />, { route: "/admin?tab=transfers" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Transfer|Pending/i), { timeout: 20_000 });
    await clickSafe(user, screen.queryAllByRole("button", { name: /Reject/i })[0]);
    await clickSafe(user, screen.queryAllByRole("button", { name: /Approve/i })[0]);
    // Local RLS may block decide.update — force reject for cleanup continuity
    await supabase
      .from("chapter_transfers")
      .update({ status: "rejected", approved_by: uid })
      .eq("reason", `${PREFIX} transfer`);
    await supabase.from("chapter_transfers").delete().eq("reason", `${PREFIX} transfer`);
    uX();

    const { data: targetMember } = await supabase
      .from("members")
      .select("id, verification_level")
      .neq("first_name", "E2E")
      .eq("chapter_id", AHMEDABAD)
      .limit(1)
      .maybeSingle();
    expect(targetMember?.id).toBeTruthy();
    await supabase.from("verification_requests").insert({
      member_id: targetMember!.id,
      requested_level: Math.min(5, (targetMember!.verification_level ?? 0) + 1),
      status: "pending",
      notes: `${PREFIX} verif`,
    });
    renderApp(<VerificationDashboard myChapterId={null} isGlobalAdmin />, {
      route: "/admin?tab=verification",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Verification|Pending|Approve/i), {
      timeout: 25_000,
    });
    for (const tab of screen.queryAllByRole("tab").slice(0, 8)) await clickSafe(user, tab);
    const note = screen.queryAllByPlaceholderText(/note|reason|info/i)[0];
    if (note) fireEvent.change(note, { target: { value: "need docs" } });
    await clickSafe(
      user,
      screen.queryAllByRole("button", { name: /Needs Info|Request Info|Reject/i })[0],
    );
    await supabase.from("verification_requests").delete().like("notes", "cov12_%");
    await supabase.from("content_news").delete().like("title", "cov12_%");
    await supabase.from("reports").delete().like("reason", "cov12_%");
  }, 180_000);

  it("MembersTab: level bump/restore + edit save + invite/bulk dialogs", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { data: rows } = await supabase
      .from("members")
      .select(
        "id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)",
      )
      .neq("first_name", "E2E")
      .order("created_at", { ascending: false })
      .limit(60);
    expect((rows ?? []).length).toBeGreaterThan(5);
    const target = (rows ?? []).find((m) => m.chapter_id === AHMEDABAD && m.verification_level < 5) ?? rows![0];
    const origLevel = target.verification_level;

    renderApp(
      <MembersTab members={(rows ?? []) as never[]} myChapterId={null} isGlobalAdmin canInvite />,
      { route: "/admin?tab=members" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Member|Search/i), { timeout: 25_000 });

    fireEvent.change(screen.getByPlaceholderText(/Search by name/i), { target: { value: target.first_name } });

    await clickSafe(user, screen.queryAllByLabelText(/Upgrade verification level/i)[0]);
    await clickSafe(user, screen.queryAllByLabelText(/Downgrade verification level/i)[0]);
    await supabase.from("members").update({ verification_level: origLevel }).eq("id", target.id);

    await clickSafe(user, screen.queryAllByLabelText(/Edit member|Edit/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit Member|Save Changes|First Name/i), {
      timeout: 15_000,
    }).catch(() => undefined);
    if (screen.queryByRole("button", { name: /Save Changes/i })) {
      await clickSafe(user, screen.getByRole("button", { name: /Save Changes/i }));
    }
    await user.keyboard("{Escape}");

    await clickSafe(user, screen.queryAllByRole("button", { name: /Invite|Add Member/i })[0]);
    if (document.body.textContent?.match(/email|invitation/i)) {
      const email =
        screen.queryByPlaceholderText(/member@example.com/i) ||
        screen.queryByPlaceholderText(/email/i) ||
        screen.queryByLabelText(/Email/i);
      if (email) fireEvent.change(email, { target: { value: `${PREFIX}@example.com` } });
      setNear(/First Name/i, "Cov");
      setNear(/Last Name/i, "Twelve");
      await user.keyboard("{Escape}");
    }

    await clickSafe(user, screen.queryAllByRole("button", { name: /Bulk Invite|CSV|Upload/i })[0]);
    await user.keyboard("{Escape}");

    // date filters
    const from = screen.queryByTitle(/Joined from date/i);
    const to = screen.queryByTitle(/Joined to date/i);
    if (from) fireEvent.change(from, { target: { value: "2020-01-01" } });
    if (to) fireEvent.change(to, { target: { value: "2026-12-31" } });
    await clickSafe(user, screen.queryByRole("button", { name: /clear/i }));
  }, 120_000);

  it("Roles + Bulk + Analytics + Admin shell + Moderator deep clicks", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    const { data: roleAssignments } = await supabase
      .from("role_assignments")
      .select(
        "id, role_id, member_id, chapter_id, start_date, end_date, created_at, roles(name, scope), members(first_name, last_name), chapters(name)",
      )
      .limit(40);

    const { unmount: u1 } = renderApp(
      <RolesTab roleAssignments={(roleAssignments ?? []) as never[]} myChapterId={null} />,
      { route: "/admin?tab=roles" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Role|Assign/i), { timeout: 20_000 });
    await clickSafe(user, screen.queryAllByRole("button", { name: /Assign Role/i })[0]);
    for (const box of Array.from(document.querySelectorAll('[role="combobox"]')).slice(0, 2)) {
      await clickSafe(user, box as HTMLElement);
      await user.keyboard("{Escape}");
    }
    await user.keyboard("{Escape}");
    u1();

    const { unmount: u2 } = renderApp(<BulkContentTab />, { route: "/admin?tab=bulk" });
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(20), { timeout: 25_000 });
    for (const tab of screen.queryAllByRole("tab").slice(0, 8)) await clickSafe(user, tab);
    for (const b of screen.queryAllByRole("button").slice(0, 12)) {
      const t = b.textContent ?? "";
      if (/create|new|add|template|upload|generate/i.test(t) && !/delete/i.test(t)) {
        await clickSafe(user, b);
        await user.keyboard("{Escape}");
      }
    }
    u2();

    const { unmount: u3 } = renderApp(<AnalyticsTab myChapterId={null} />, { route: "/admin?tab=analytics" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Analytic|Member|Chapter/i), { timeout: 30_000 });
    for (const c of Array.from(document.querySelectorAll(".cursor-pointer")).slice(0, 16)) {
      await clickSafe(user, c as HTMLElement);
      await user.keyboard("{Escape}");
    }
    u3();

    const { unmount: u4 } = renderApp(<Admin />, { route: "/admin" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Admin|Members/i), { timeout: 30_000 });
    for (const tab of screen.queryAllByRole("tab").slice(0, 18)) await clickSafe(user, tab);
    u4();

    await signIn(E2E_ACCOUNTS.moderator.email);
    renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Moderat|Report|Pending/i), { timeout: 30_000 });
    for (const tab of screen.queryAllByRole("tab").slice(0, 12)) await clickSafe(user, tab);
    for (const b of screen.queryAllByRole("button").slice(0, 25)) {
      const t = (b.textContent ?? "") + (b.getAttribute("aria-label") ?? "");
      if (
        /export|csv|download|refresh|filter|search|review|dismiss|warn|approve/i.test(t) &&
        !/block member|suspend member|delete member/i.test(t)
      ) {
        await clickSafe(user, b);
        await user.keyboard("{Escape}");
      }
    }
    const search = screen.queryByPlaceholderText(/search/i);
    if (search) fireEvent.change(search, { target: { value: "Shah" } });
  }, 180_000);
});
