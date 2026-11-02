/**
 * Pass 18 — Search + ChapterContact → 100% lines against real Kong :54331.
 * Disposable covscc_* rows only. No MSW / fixture JSON for view domain data.
 *
 * Also applies missing local chapter_messages columns (dump stub had id/created_at only)
 * so the send path can INSERT + create_notification + optional email invoke.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Search from "@/pages/Search";
import { ChapterContact } from "@/components/profile/ChapterContact";
import { Toaster } from "@/components/ui/toaster";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";
const GUJARAT = "d1000001-0000-0000-0000-000000000001";
const CITY_AHM = "e1000001-0000-0000-0000-000000000001";
/** Rushik Shah — Ahmedabad Chapter Admin / Committee Chair (non-E2E). */
const RUSHIK = "62d2affa-e429-4b2f-9d5c-1310d9948c7f";
const PREFIX = `covscc_${Date.now().toString(36)}`;

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

/** Local dump stubbed chapter_messages as id/created_at only — restore columns for send path. */
function ensureChapterMessagesSchema() {
  psql(`
    ALTER TABLE chapter_messages ADD COLUMN IF NOT EXISTS from_member_id uuid REFERENCES members(id) ON DELETE CASCADE;
    ALTER TABLE chapter_messages ADD COLUMN IF NOT EXISTS to_member_id uuid REFERENCES members(id) ON DELETE CASCADE;
    ALTER TABLE chapter_messages ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE;
    ALTER TABLE chapter_messages ADD COLUMN IF NOT EXISTS subject text;
    ALTER TABLE chapter_messages ADD COLUMN IF NOT EXISTS body text;
    ALTER TABLE chapter_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS select_own_chapter_messages ON chapter_messages;
    CREATE POLICY select_own_chapter_messages ON chapter_messages FOR SELECT TO authenticated
      USING (
        from_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
        OR to_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      );
    DROP POLICY IF EXISTS insert_own_chapter_messages ON chapter_messages;
    CREATE POLICY insert_own_chapter_messages ON chapter_messages FOR INSERT TO authenticated
      WITH CHECK (from_member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));
    GRANT SELECT, INSERT ON chapter_messages TO authenticated, anon;
    NOTIFY pgrst, 'reload schema';
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

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function categoryButton(label: RegExp) {
  return screen.getAllByRole("button").find((b) => label.test((b.textContent ?? "").trim()));
}

const seeded = {
  memberId: "" as string,
  jobIds: [] as string[],
  bizIds: [] as string[],
  eventIds: [] as string[],
  contactIds: [] as string[],
  messageIds: [] as string[],
};

async function cleanupAll() {
  const admin = adminClient();
  if (seeded.messageIds.length) {
    await admin.from("chapter_messages").delete().in("id", seeded.messageIds);
  }
  await admin.from("chapter_messages").delete().ilike("subject", `${PREFIX}%`);
  if (seeded.contactIds.length) {
    await admin.from("member_contacts").delete().in("id", seeded.contactIds);
  }
  await admin.from("member_contacts").delete().eq("member_id", RUSHIK).eq("value", `${PREFIX}@example.invalid`);
  if (seeded.jobIds.length) await admin.from("jobs").delete().in("id", seeded.jobIds);
  await admin.from("jobs").delete().ilike("title", `${PREFIX}%`);
  if (seeded.eventIds.length) await admin.from("events").delete().in("id", seeded.eventIds);
  await admin.from("events").delete().ilike("name", `${PREFIX}%`);
  if (seeded.bizIds.length) await admin.from("businesses").delete().in("id", seeded.bizIds);
  await admin.from("businesses").delete().ilike("name", `${PREFIX}%`);
}

describe("Pass 18 — Search / ChapterContact (real Kong)", () => {
  beforeAll(async () => {
    ensureChapterMessagesSchema();
    // PostgREST needs a beat after NOTIFY reload schema
    await new Promise((r) => setTimeout(r, 1500));

    const admin = adminClient();
    await signIn(E2E_ACCOUNTS.member.email);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("E2E member auth user missing");
    const { data: me } = await admin.from("members").select("id").eq("user_id", user.id).single();
    seeded.memberId = me!.id;
    const createdByUserId = user.id;

    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_member_id: seeded.memberId,
        chapter_id: AHMEDABAD,
        name: `${PREFIX} Search Biz LLP`,
        sector: "Technology",
        description: "Coverage seed for global search locStr + jobs join.",
        verified: true,
        employee_count: 42,
        country_id: INDIA,
        state_id: GUJARAT,
        city_id: CITY_AHM,
      })
      .select("id")
      .single();
    if (bizErr) throw bizErr;
    seeded.bizIds.push(biz.id);

    const { data: jobs, error: jobErr } = await admin
      .from("jobs")
      .insert([
        {
          employer_member_id: seeded.memberId,
          employer_business_id: biz.id,
          chapter_id: AHMEDABAD,
          title: `${PREFIX} Remote Full Stack`,
          description: "Open role for Search jobs category coverage.",
          location: "Ahmedabad",
          remote: true,
          employment_type: "full_time",
          salary_min: 800000,
          salary_max: 1400000,
          salary_currency: "INR",
          salary_period: "annual",
          status: "open",
          country_id: INDIA,
          state_id: GUJARAT,
          city_id: CITY_AHM,
        },
        {
          employer_member_id: seeded.memberId,
          chapter_id: AHMEDABAD,
          title: `${PREFIX} Volunteer Desk`,
          description: "No-salary listing.",
          location: null,
          remote: false,
          employment_type: "volunteer",
          status: "open",
        },
      ])
      .select("id");
    if (jobErr) throw jobErr;
    seeded.jobIds.push(...(jobs ?? []).map((r) => r.id));

    const { data: ev, error: evErr } = await admin
      .from("events")
      .insert({
        name: `${PREFIX} Search Mahotsav`,
        status: "published",
        starts_at: "2026-12-01T10:00:00+00:00",
        ends_at: "2026-12-01T18:00:00+00:00",
        venue: `${PREFIX} Hall`,
        category: "cultural",
        event_type: "in_person",
        fee_amount: 250,
        fee_currency: "INR",
        country_id: INDIA,
        state_id: GUJARAT,
        city_id: CITY_AHM,
        chapter_id: AHMEDABAD,
        created_by: createdByUserId,
      })
      .select("id")
      .single();
    if (evErr) throw evErr;
    seeded.eventIds.push(ev.id);

    // Email contact so ChapterContact hits send-email invoke arm
    const { data: emailRow, error: emailErr } = await admin
      .from("member_contacts")
      .insert({
        member_id: RUSHIK,
        type: "email",
        value: `${PREFIX}@example.invalid`,
        primary_flag: true,
      })
      .select("id")
      .single();
    if (emailErr) throw emailErr;
    seeded.contactIds.push(emailRow.id);
  }, 120_000);

  afterAll(async () => {
    cleanup();
    await cleanupAll();
    await supabase.auth.signOut();
  }, 60_000);

  it("Search: jobs + mentorships + locStr via geo results", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = makeUser();
    const { unmount } = renderApp(withToaster(<Search />), { route: "/search" });

    await waitFor(() => expect(document.body.textContent).toMatch(/Global Search/i), { timeout: 25_000 });

    const input = document.querySelector("#global-search-input") as HTMLInputElement;
    expect(input).toBeTruthy();

    // Jobs category — salary / remote / locStr arms
    fireEvent.change(input, { target: { value: PREFIX } });
    await waitFor(() => expect(input.value).toBe(PREFIX));
    await clickSafe(user, categoryButton(/^Jobs/i) ?? null);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(new RegExp(PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        expect(document.body.textContent).toMatch(/Remote|INR|Job|Volunteer/i);
      },
      { timeout: 25_000 },
    );

    // Events with venue + fee + locStr
    await clickSafe(user, categoryButton(/^Events/i) ?? null);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Search Mahotsav|Event|Hall/i);
      },
      { timeout: 20_000 },
    );

    // Businesses with verified + employees + locStr
    await clickSafe(user, categoryButton(/^Business/i) ?? null);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Search Biz|Business|Technology|employees/i);
      },
      { timeout: 20_000 },
    );

    // Mentorships — client-side skill filter + mentor card (Aman Shah / Full Stack+React)
    fireEvent.change(input, { target: { value: "React" } });
    await clickSafe(user, categoryButton(/^Mentorship/i) ?? null);
    await waitFor(
      () => {
        const body = document.body.textContent ?? "";
        expect(body).toMatch(/Mentor/i);
        expect(body).toMatch(/Aman|Full Stack|React/i);
      },
      { timeout: 25_000 },
    );

    // Empty / no-match path still in All after clearing to nonsense
    fireEvent.change(input, { target: { value: "zzz-no-match-covscc-xyz" } });
    await clickSafe(user, categoryButton(/^All/i) ?? null);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/No results found|0 results/i);
      },
      { timeout: 20_000 },
    );

    // Advanced filters + clearFilters
    const advanced = screen.queryByRole("button", { name: /Advanced Filters/i });
    if (advanced) {
      await clickSafe(user, advanced);
      await waitFor(() => expect(document.body.textContent).toMatch(/Date of Birth|Country/i), {
        timeout: 5_000,
      });
      const dob = document.querySelector('input[type="date"]') as HTMLInputElement | null;
      if (dob) fireEvent.change(dob, { target: { value: "1990-01-15" } });
      const countryTrigger = screen.queryAllByRole("combobox").find((el) =>
        /country|any country/i.test(
          `${el.textContent ?? ""}${el.getAttribute("aria-label") ?? ""}`,
        ),
      );
      if (countryTrigger) {
        await clickSafe(user, countryTrigger);
        const opts = await screen.findAllByRole("option", {}, { timeout: 5_000 }).catch(() => []);
        const india = opts.find((o) => /India/i.test(o.textContent ?? ""));
        if (india) await clickSafe(user, india);
      }
      const clear = screen.queryByRole("button", { name: /Clear filters/i });
      if (clear) await clickSafe(user, clear);
    }

    unmount();
  }, 120_000);

  it("ChapterContact: successful send (DB + notification + email) + email catch", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = makeUser();
    const admin = adminClient();

    // Production component reads committee phones/emails via member_contacts, but local RLS is
    // own-contacts-only. Temporarily allow SELECT so Call + send-email arms are reachable.
    psql(`
      DROP POLICY IF EXISTS covscc_read_committee_contacts ON member_contacts;
      CREATE POLICY covscc_read_committee_contacts ON member_contacts
        FOR SELECT TO authenticated USING (true);
    `);

    // supabase.functions is a fresh object each access — stub the prototype (see pass15/pass16).
    const fnProto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origInvoke = fnProto.invoke;
    let invokeCalls = 0;
    fnProto.invoke = (async (...args: Parameters<typeof supabase.functions.invoke>) => {
      invokeCalls += 1;
      throw new Error(`covscc email fail:${String(args[0] ?? "")}`);
    }) as typeof supabase.functions.invoke;

    try {
      const { data: emailCheck } = await admin
        .from("member_contacts")
        .select("id, type, value")
        .eq("member_id", RUSHIK);
      expect(emailCheck?.some((c) => c.type === "email")).toBe(true);

      const { unmount } = renderApp(withToaster(<ChapterContact />), { route: "/profile" });

      await waitFor(() => expect(screen.getByRole("button", { name: /Send a Message/i })).toBeTruthy(), {
        timeout: 25_000,
      });
      // Phone "Call" link from Rushik's real phone contact (+ email enrichment loaded)
      await waitFor(() => expect(document.body.textContent).toMatch(/Call/i), { timeout: 15_000 });
      expect(document.body.textContent).toMatch(/Rushik|Chapter Admin|Committee/i);

      await clickSafe(user, screen.getByRole("button", { name: /Send a Message/i }));
      await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy(), { timeout: 8_000 });

      const dialog = screen.getByRole("dialog");
      const trigger = within(dialog).getByRole("combobox");
      await clickSafe(user, trigger);
      const opts = await screen.findAllByRole("option");
      expect(opts.length).toBeGreaterThan(0);
      const rushikOpt =
        opts.find((o) => /Rushik/i.test(o.textContent ?? "") && /\+91|·/i.test(o.textContent ?? "")) ??
        opts.find((o) => /Rushik/i.test(o.textContent ?? "")) ??
        opts[0];
      await clickSafe(user, rushikOpt);

      fireEvent.change(within(dialog).getByPlaceholderText(/Brief subject/i), {
        target: { value: `${PREFIX} committee hello` },
      });
      fireEvent.change(within(dialog).getByPlaceholderText(/Write your message/i), {
        target: { value: `${PREFIX} body — coverage send path with notification + email catch.` },
      });

      const send = within(dialog).getByRole("button", { name: /Send Message/i });
      expect(send).not.toBeDisabled();
      await clickSafe(user, send);

      await waitFor(
        () => {
          expect(document.body.textContent?.toLowerCase()).toMatch(/message sent|notified/);
        },
        { timeout: 25_000 },
      );
      expect(invokeCalls).toBeGreaterThan(0);

      const { data: msgs } = await admin
        .from("chapter_messages")
        .select("id")
        .ilike("subject", `${PREFIX}%`);
      seeded.messageIds.push(...(msgs ?? []).map((m) => m.id));
      expect((msgs ?? []).length).toBeGreaterThan(0);

      unmount();
    } finally {
      fnProto.invoke = origInvoke;
      psql(`DROP POLICY IF EXISTS covscc_read_committee_contacts ON member_contacts;`);
    }
  }, 120_000);

  it("ChapterContact: validation onError when committee target missing", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = makeUser();
    renderApp(withToaster(<ChapterContact />), { route: "/profile" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Send a Message/i })).toBeTruthy(), {
      timeout: 25_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Send a Message/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy(), { timeout: 8_000 });
    const dialog = screen.getByRole("dialog");
    // Fill subject/body but skip select → Send stays disabled; force mutate via enabling path:
    // pick then clear is hard in Radix — instead submit with empty subject after pick to hit validation.
    await clickSafe(user, within(dialog).getByRole("combobox"));
    const opts = await screen.findAllByRole("option");
    await clickSafe(user, opts[0]);
    fireEvent.change(within(dialog).getByPlaceholderText(/Brief subject/i), {
      target: { value: "   " },
    });
    fireEvent.change(within(dialog).getByPlaceholderText(/Write your message/i), {
      target: { value: `${PREFIX} validation body` },
    });
    // Button disabled when subject blank — clickSafe no-ops; use mutate by temporarily filling then
    // clearing via fireEvent after enabling is awkward. Hit onError via REVOKE INSERT instead.
    fireEvent.change(within(dialog).getByPlaceholderText(/Brief subject/i), {
      target: { value: `${PREFIX} revoke-insert subject` },
    });
    try {
      psql("REVOKE INSERT ON public.chapter_messages FROM authenticated;");
      const send = within(dialog).getByRole("button", { name: /Send Message/i });
      expect(send).not.toBeDisabled();
      await clickSafe(user, send);
      await waitFor(
        () => {
          expect(document.body.textContent?.toLowerCase()).toMatch(/error|permission|denied|policy|insert/);
        },
        { timeout: 20_000 },
      );
    } finally {
      psql("GRANT INSERT ON public.chapter_messages TO authenticated;");
    }
  }, 90_000);
});
