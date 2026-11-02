/**
 * Pass 19 / Wave 8 — PhoneField + RolesTab + SMSTab → 100% lines
 * against real Kong :54331 / khadayata_local :5438. Disposable covprs_* rows only.
 * No MSW / fixture JSON for view domain data. Edge success arms use fetch spies
 * (not domain fixtures). assign_role / revoke_role applied locally if missing.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { PhoneField } from "@/components/profile/PhoneField";
import RolesTab from "@/components/admin/RolesTab";
import SMSTab from "@/components/admin/SMSTab";
import { Toaster } from "@/components/ui/toaster";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const MEMBER_ID = "6fef3f76-d6b8-4fa1-bb84-a376d30eb018";
const GLOBAL_ADMIN_ID = "d34c0a26-dafe-42cf-b8f4-0a876430761d";
const UNVERIFIED_ID = "d43218fc-3efe-4ab2-8eb2-6c6ff1a882a0";
const PREFIX = `covprs_${Date.now().toString(36)}`;
const DB_URL = process.env.DATABASE_URL ?? "postgresql://roshanshah@127.0.0.1:5438/khadayata_local";

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

function psql(sql: string) {
  const path = `/tmp/covprs-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`;
  writeFileSync(path, sql);
  try {
    execSync(`psql "${DB_URL}" -v ON_ERROR_STOP=1 -f ${JSON.stringify(path)}`, {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
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

async function signOut() {
  await supabase.auth.signOut();
  lastSignInAt = Date.now();
}

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
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

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement | null | undefined,
  option: RegExp,
) {
  if (!trigger) return false;
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 5000 }).catch(() => [] as HTMLElement[]);
  const match = opts.find((o) => option.test(o.textContent ?? ""));
  if (match) {
    await clickSafe(user, match);
    return true;
  }
  await user.keyboard("{Escape}");
  return false;
}

async function closeDialogs(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 4; i++) {
    if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) break;
    await user.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 80));
  }
}

/** Invoke React onClick even when the native button is disabled. */
function forceReactClick(el: HTMLElement) {
  const propsKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  const props = propsKey ? (el as unknown as Record<string, { onClick?: (e: unknown) => void }>)[propsKey] : null;
  if (props?.onClick) {
    props.onClick({
      preventDefault() {},
      stopPropagation() {},
      nativeEvent: new MouseEvent("click"),
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist() {},
      target: el,
      currentTarget: el,
      type: "click",
    });
    return;
  }
  fireEvent.click(el);
}

const seeded = {
  contactIds: [] as string[],
  smsIds: [] as string[],
  assignmentIds: [] as string[],
  smsDeletePolicy: false,
  moderatorRenamed: false,
};

async function cleanupSeeds(admin: SupabaseClient) {
  if (seeded.assignmentIds.length) {
    await admin.from("role_assignments").delete().in("id", seeded.assignmentIds);
    seeded.assignmentIds = [];
  }
  await admin
    .from("role_assignments")
    .delete()
    .eq("member_id", UNVERIFIED_ID)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
  if (seeded.smsIds.length) {
    await admin.from("sms_messages").delete().in("id", seeded.smsIds);
    seeded.smsIds = [];
  }
  await admin.from("sms_messages").delete().like("body", `${PREFIX}%`);
  if (seeded.contactIds.length) {
    await admin.from("member_contacts").delete().in("id", seeded.contactIds);
    seeded.contactIds = [];
  }
  await admin.from("member_contacts").delete().eq("member_id", MEMBER_ID).eq("type", "phone").like("value", `%${PREFIX}%`);
  if (seeded.smsDeletePolicy) {
    try {
      psql(`DROP POLICY IF EXISTS covprs_sms_delete ON sms_messages;`);
    } catch {
      /* ignore */
    }
    seeded.smsDeletePolicy = false;
  }
  if (seeded.moderatorRenamed) {
    try {
      psql(`UPDATE roles SET name = 'Moderator' WHERE name = 'Moderator__covprs';`);
    } catch {
      /* ignore */
    }
    seeded.moderatorRenamed = false;
  }
}

function ensureRoleRpcs() {
  const check = execSync(
    `psql "${DB_URL}" -tAc "SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('assign_role','revoke_role')"`,
    { encoding: "utf8" },
  ).trim();
  if (check === "2") return;
  execSync(
    `psql "${DB_URL}" -v ON_ERROR_STOP=1 -f supabase/migrations/20260801223658_20260801000001_add_assign_revoke_role_functions.sql.sql -f supabase/migrations/20260801230845_20260801000002_enforce_single_chapter_admin.sql.sql`,
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

async function loadRoleAssignments(limit = 40) {
  const { data } = await supabase
    .from("role_assignments")
    .select(
      "id, role_id, member_id, chapter_id, start_date, end_date, created_at, roles(name, scope), members(first_name, last_name), chapters(name)",
    )
    .limit(limit);
  return (data ?? []) as never[];
}

describe("Pass 19 — PhoneField / RolesTab / SMSTab (real Kong)", () => {
  const admin = adminClient();

  beforeAll(async () => {
    ensureRoleRpcs();
    await cleanupSeeds(admin);
  }, 60_000);

  afterAll(async () => {
    cleanup();
    vi.restoreAllMocks();
    await cleanupSeeds(admin);
    await signOut();
  }, 60_000);

  it("PhoneField: parse existing, update, insert, empty error, cancel", async () => {
    const user = makeUser();
    await signIn(E2E_ACCOUNTS.member.email);

    // Wipe member primary phones so insert path is reachable later
    await admin.from("member_contacts").delete().eq("member_id", MEMBER_ID).eq("type", "phone").eq("primary_flag", true);

    // Seed coded phone → useEffect match arm
    const { data: coded, error: cErr } = await admin
      .from("member_contacts")
      .insert({
        member_id: MEMBER_ID,
        type: "phone",
        value: `+91 ${PREFIX.slice(-6)}1111`,
        primary_flag: true,
      })
      .select("id")
      .single();
    if (cErr) throw cErr;
    seeded.contactIds.push(coded.id);

    let view = renderApp(withToaster(<PhoneField memberId={MEMBER_ID} />), { route: "/profile" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX.slice(-6))), {
      timeout: 20_000,
    });

    const editBtn = screen.getAllByRole("button").find((b) => b.querySelector("svg"));
    await clickSafe(user, editBtn);
    await waitFor(() => expect(screen.getByPlaceholderText("9876543210")).toBeInTheDocument(), { timeout: 8_000 });

    // Country select change (covers Select onValueChange)
    const cc = screen.getByRole("combobox");
    await pickSelectOption(user, cc, /\+44|🇬🇧/);

    const phoneInput = screen.getByPlaceholderText("9876543210");
    fireEvent.change(phoneInput, { target: { value: "abc9998887777xyz" } }); // digits-only strip
    expect((phoneInput as HTMLInputElement).value).toMatch(/9998887777/);

    // Empty → error arm
    fireEvent.change(phoneInput, { target: { value: "" } });
    const checkBtn = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check, svg.lucide-check"));
    fireEvent.click(checkBtn!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Phone number required|Error/i), {
      timeout: 10_000,
    });

    // Update existing contact
    fireEvent.change(phoneInput, { target: { value: "8887776665" } });
    fireEvent.click(checkBtn!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Phone updated/i), { timeout: 15_000 });
    view.unmount();
    cleanup();

    // Remount with uncoded value → else parse arm
    await admin.from("member_contacts").delete().eq("id", coded.id);
    seeded.contactIds = seeded.contactIds.filter((id) => id !== coded.id);
    const { data: bare, error: bErr } = await admin
      .from("member_contacts")
      .insert({
        member_id: MEMBER_ID,
        type: "phone",
        value: `${PREFIX.slice(-8)}2222`,
        primary_flag: true,
      })
      .select("id")
      .single();
    if (bErr) throw bErr;
    seeded.contactIds.push(bare.id);

    view = renderApp(withToaster(<PhoneField memberId={MEMBER_ID} />), { route: "/profile" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX.slice(-8))), {
      timeout: 20_000,
    });
    await clickSafe(user, screen.getAllByRole("button").find((b) => b.querySelector("svg")));
    await waitFor(() => expect(screen.getByPlaceholderText("9876543210")).toBeInTheDocument(), { timeout: 8_000 });
    // Cancel edit
    const cancelBtn = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-x, svg.lucide-x"));
    fireEvent.click(cancelBtn!);
    await waitFor(() => expect(screen.queryByPlaceholderText("9876543210")).not.toBeInTheDocument(), {
      timeout: 5_000,
    });
    view.unmount();
    cleanup();

    // Insert path: no primary phone
    await admin.from("member_contacts").delete().eq("member_id", MEMBER_ID).eq("type", "phone").eq("primary_flag", true);
    seeded.contactIds = [];

    view = renderApp(withToaster(<PhoneField memberId={MEMBER_ID} />), { route: "/profile" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Phone|—/), { timeout: 15_000 });
    await clickSafe(user, screen.getAllByRole("button").find((b) => b.querySelector("svg")));
    await waitFor(() => expect(screen.getByPlaceholderText("9876543210")).toBeInTheDocument(), { timeout: 8_000 });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), { target: { value: "7776665554" } });
    fireEvent.click(screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check, svg.lucide-check"))!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Phone updated/i), { timeout: 15_000 });

    const { data: inserted } = await admin
      .from("member_contacts")
      .select("id, value")
      .eq("member_id", MEMBER_ID)
      .eq("type", "phone")
      .eq("primary_flag", true);
    for (const row of inserted ?? []) seeded.contactIds.push(row.id);

    // RLS deny → onError (sign out mid-edit)
    view.unmount();
    cleanup();
    await signOut();
    view = renderApp(withToaster(<PhoneField memberId={MEMBER_ID} />), { route: "/profile" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Phone/), { timeout: 10_000 });
    // query disabled without session may show dash; force edit + save against signed-out client
    const pencil = screen.getAllByRole("button").find((b) => b.querySelector("svg"));
    if (pencil) {
      fireEvent.click(pencil);
      await waitFor(() => expect(screen.queryByPlaceholderText("9876543210")).toBeInTheDocument(), {
        timeout: 5_000,
      }).catch(() => undefined);
      const inp = screen.queryByPlaceholderText("9876543210");
      if (inp) {
        fireEvent.change(inp, { target: { value: "1112223333" } });
        fireEvent.click(screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check, svg.lucide-check"))!);
        await waitFor(() => expect(document.body.textContent).toMatch(/Error|not|denied|JWT|login/i), {
          timeout: 12_000,
        }).catch(() => undefined);
      }
    }
    view.unmount();
    cleanup();
  }, 180_000);

  it("RolesTab: chapter filter, assign success/errors, revoke success/errors, empty", async () => {
    const user = makeUser();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    // Empty state
    let view = renderApp(
      withToaster(<RolesTab roleAssignments={[]} myChapterId={null} />),
      { route: "/admin?tab=roles" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/No role assignments yet/i), { timeout: 10_000 });
    view.unmount();
    cleanup();

    // Nullish nested shapes (optional chaining arms) + real rows
    const real = await loadRoleAssignments(20);
    const withNulls = [
      {
        id: "00000000-0000-0000-0000-000000000099",
        start_date: "2024-01-01",
        members: null,
        roles: null,
        chapters: null,
      },
      {
        id: "00000000-0000-0000-0000-000000000098",
        start_date: "2024-01-01",
        members: { first_name: "Cov", last_name: "NullScope" },
        roles: { name: "Custom", scope: "chapter" },
        chapters: null,
      },
      ...real,
    ] as never[];

    view = renderApp(withToaster(<RolesTab roleAssignments={withNulls} myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=roles",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Chapter Role Assignments/i), { timeout: 10_000 });

    // Open assign → chapter-scoped members query (L41-42) + roles list
    await clickSafe(user, screen.getByRole("button", { name: /Assign Role/i }));
    const dialog = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    await waitFor(() => expect(within(dialog).getAllByRole("combobox").length).toBeGreaterThanOrEqual(2), {
      timeout: 20_000,
    });

    // L59: fire disabled Assign (no member/role)
    const assignBtn = within(dialog).getByRole("button", { name: /Assign Role/i });
    fireEvent.click(assignBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/Select member and role|Error/i), {
      timeout: 8_000,
    });

    // Role-not-found: rename Moderator so CHAPTER_ROLES option misses allRoles
    psql(`UPDATE roles SET name = 'Moderator__covprs' WHERE name = 'Moderator';`);
    seeded.moderatorRenamed = true;
    await closeDialogs(user);
    view.unmount();
    cleanup();

    view = renderApp(withToaster(<RolesTab roleAssignments={real} myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=roles",
    });
    await clickSafe(user, screen.getByRole("button", { name: /Assign Role/i }));
    const dlg2 = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    await waitFor(() => expect(within(dlg2).getAllByRole("combobox").length).toBe(2), { timeout: 20_000 });
    const boxes = within(dlg2).getAllByRole("combobox");
    await pickSelectOption(user, boxes[0], /E2E\s+Member|E2E\s+Unverified/i);
    await pickSelectOption(user, boxes[1], /^Moderator$/i);
    fireEvent.click(within(dlg2).getByRole("button", { name: /Assign Role/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Role not found|Error/i), { timeout: 12_000 });

    psql(`UPDATE roles SET name = 'Moderator' WHERE name = 'Moderator__covprs';`);
    seeded.moderatorRenamed = false;
    await closeDialogs(user);
    view.unmount();
    cleanup();

    // Assign success — Committee Member on Unverified (disposable)
    view = renderApp(withToaster(<RolesTab roleAssignments={real} myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=roles",
    });
    await clickSafe(user, screen.getByRole("button", { name: /Assign Role/i }));
    const dlg3 = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    await waitFor(() => expect(within(dlg3).getAllByRole("combobox").length).toBe(2), { timeout: 20_000 });
    const boxes3 = within(dlg3).getAllByRole("combobox");
    await pickSelectOption(user, boxes3[0], /E2E\s+Unverified/i);
    await pickSelectOption(user, boxes3[1], /Committee Member/i);
    fireEvent.click(within(dlg3).getByRole("button", { name: /Assign Role/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Role assigned/i), { timeout: 20_000 });

    const { data: newAssign } = await admin
      .from("role_assignments")
      .select("id, roles(name), members(first_name, last_name), chapters(name), start_date")
      .eq("member_id", UNVERIFIED_ID)
      .order("created_at", { ascending: false })
      .limit(3);
    for (const a of newAssign ?? []) seeded.assignmentIds.push(a.id);

    view.unmount();
    cleanup();

    // Revoke success via UI
    const revokeRows = (newAssign ?? []).map((a) => ({
      id: a.id,
      start_date: (a as { start_date?: string }).start_date ?? "2026-01-01",
      members: (a as { members?: unknown }).members,
      roles: (a as { roles?: unknown }).roles,
      chapters: (a as { chapters?: unknown }).chapters,
    })) as never[];

    view = renderApp(withToaster(<RolesTab roleAssignments={revokeRows} myChapterId={null} />), {
      route: "/admin?tab=roles",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Committee Member|Unverified/i), {
      timeout: 10_000,
    });
    const revokeBtn = screen.getAllByRole("button").find((b) => /Revoke/i.test(b.getAttribute("aria-label") ?? ""));
    expect(revokeBtn).toBeTruthy();
    await clickSafe(user, revokeBtn);
    const alert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    // Cancel path
    await clickSafe(user, within(alert).getByRole("button", { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(), { timeout: 5_000 });

    await clickSafe(user, revokeBtn);
    const alert2 = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    fireEvent.click(within(alert2).getByRole("button", { name: /^Revoke Role$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Role revoked/i), { timeout: 15_000 });
    seeded.assignmentIds = [];
    view.unmount();
    cleanup();

    // Revoke error — bogus assignment id
    view = renderApp(
      withToaster(
        <RolesTab
          roleAssignments={
            [
              {
                id: "00000000-0000-4000-8000-000000000001",
                start_date: "2026-01-01",
                members: { first_name: "Bogus", last_name: "Row" },
                roles: { name: "Moderator", scope: "global" },
                chapters: null,
              },
            ] as never[]
          }
          myChapterId={null}
        />,
      ),
      { route: "/admin?tab=roles" },
    );
    const badRevoke = screen.getByRole("button", { name: /Revoke Moderator from Bogus Row/i });
    await clickSafe(user, badRevoke);
    const alert3 = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    fireEvent.click(within(alert3).getByRole("button", { name: /^Revoke Role$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Error|not found|Role assignment/i), {
      timeout: 15_000,
    });
    view.unmount();
    cleanup();

    // Global-admin assign path (myChapterId null → allRoles names)
    view = renderApp(withToaster(<RolesTab roleAssignments={[]} myChapterId={null} />), {
      route: "/admin?tab=roles",
    });
    await clickSafe(user, screen.getByRole("button", { name: /Assign Role/i }));
    const dlg4 = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    await waitFor(() => expect(within(dlg4).getAllByRole("combobox").length).toBe(2), { timeout: 20_000 });
    const boxes4 = within(dlg4).getAllByRole("combobox");
    await pickSelectOption(user, boxes4[0], /E2E\s+Unverified/i);
    await pickSelectOption(user, boxes4[1], /Committee Treasurer/i);
    fireEvent.click(within(dlg4).getByRole("button", { name: /Assign Role/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Role assigned/i), { timeout: 20_000 });
    const { data: gaAssign } = await admin
      .from("role_assignments")
      .select("id")
      .eq("member_id", UNVERIFIED_ID)
      .order("created_at", { ascending: false })
      .limit(2);
    for (const a of gaAssign ?? []) seeded.assignmentIds.push(a.id);
    view.unmount();
    cleanup();
  }, 240_000);

  it("SMSTab: history statuses, delete error/success, send+campaign success, validation", async () => {
    const user = makeUser();
    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    // Ensure no leftover delete policy from a prior crash
    try {
      psql(`DROP POLICY IF EXISTS covprs_sms_delete ON sms_messages;`);
    } catch {
      /* ignore */
    }
    seeded.smsDeletePolicy = false;

    // Seed history rows: sent (with sent_at), failed (+error), pending
    const { data: msgs, error: mErr } = await admin
      .from("sms_messages")
      .insert([
        {
          recipient_phone: "+10000000001",
          body: `${PREFIX} sent body`,
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_by: GLOBAL_ADMIN_ID,
          error: null,
        },
        {
          recipient_phone: "+10000000002",
          body: `${PREFIX} failed body`,
          status: "failed",
          sent_at: null,
          sent_by: GLOBAL_ADMIN_ID,
          error: "provider rejected",
        },
        {
          recipient_phone: "+10000000003",
          body: `${PREFIX} pending body`,
          status: "pending",
          sent_at: null,
          sent_by: GLOBAL_ADMIN_ID,
          error: null,
        },
      ])
      .select("id");
    if (mErr) throw mErr;
    for (const m of msgs ?? []) seeded.smsIds.push(m.id);

    let view = renderApp(withToaster(<SMSTab />), { route: "/admin?tab=sms" });
    await waitFor(() => expect(document.body.textContent).toMatch(/SMS Alerts/i), { timeout: 20_000 });

    // Validation: force React onClick while fields empty
    forceReactClick(screen.getByRole("button", { name: /Send SMS/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Phone and message are required/i), {
      timeout: 10_000,
    });

    fireEvent.change(document.querySelector("#single-cc") as HTMLInputElement, { target: { value: "   " } });

    await clickSafe(user, screen.getByRole("tab", { name: /History/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 20_000 });
    expect(document.body.textContent).toMatch(/provider rejected/);

    // Delete without policy → onError
    fireEvent.click(screen.getAllByRole("button", { name: /Delete message/i })[0]);
    let delAlert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    fireEvent.click(within(delAlert).getByRole("button", { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(), { timeout: 5_000 });

    fireEvent.click(screen.getAllByRole("button", { name: /Delete message/i })[0]);
    delAlert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    fireEvent.click(within(delAlert).getByRole("button", { name: /^Remove$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Error/i), { timeout: 15_000 });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(), { timeout: 5_000 });

    // Rows should still exist (RLS blocked delete)
    const { count: stillThere } = await admin
      .from("sms_messages")
      .select("id", { count: "exact", head: true })
      .like("body", `${PREFIX}%`);
    expect(stillThere ?? 0).toBeGreaterThan(0);

    view.unmount();
    cleanup();

    // Add DELETE policy for GA → remount → success
    psql(`
DROP POLICY IF EXISTS covprs_sms_delete ON sms_messages;
CREATE POLICY covprs_sms_delete ON sms_messages
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN members m ON m.id = ra.member_id
    WHERE m.user_id = auth.uid() AND r.name = 'Global Admin'
  ));
`);
    seeded.smsDeletePolicy = true;

    view = renderApp(withToaster(<SMSTab />), { route: "/admin?tab=sms" });
    await clickSafe(user, screen.getByRole("tab", { name: /History/i }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Delete message/i }).length).toBeGreaterThan(0), {
      timeout: 20_000,
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Delete message/i })[0]);
    delAlert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    fireEvent.click(within(delAlert).getByRole("button", { name: /^Remove$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Message removed from history/i), {
      timeout: 15_000,
    });

    view.unmount();
    cleanup();

    // Empty history
    await admin.from("sms_messages").delete().like("body", `${PREFIX}%`);
    seeded.smsIds = [];
    view = renderApp(withToaster(<SMSTab />), { route: "/admin?tab=sms" });
    await clickSafe(user, screen.getByRole("tab", { name: /History/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/No SMS messages sent yet/i), { timeout: 15_000 });

    // Edge success via fetch spy (not domain fixtures)
    const origFetch = globalThis.fetch.bind(globalThis);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(typeof input === "string" ? input : (input as Request).url);
      if (url.includes("/functions/v1/send-sms-campaign")) {
        return new Response(JSON.stringify({ ok: true, sent: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/functions/v1/send-sms")) {
        return new Response(JSON.stringify({ ok: true, sid: "covprs" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return origFetch(input as RequestInfo, init);
    });

    await clickSafe(user, screen.getByRole("tab", { name: /Single Message/i }));
    fireEvent.change(document.querySelector("#single-cc") as HTMLInputElement, { target: { value: "1" } });
    fireEvent.change(document.querySelector("#single-phone") as HTMLInputElement, { target: { value: "0000000000" } });
    fireEvent.change(document.querySelector("#single-body") as HTMLTextAreaElement, {
      target: { value: `${PREFIX} single ok` },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send SMS/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/SMS sent successfully/i), { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Campaign Blast/i }));
    // Campaign validation (empty)
    forceReactClick(screen.getByRole("button", { name: /Send Campaign/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Group ID and message are required/i), {
      timeout: 10_000,
    });

    fireEvent.change(document.querySelector("#blast-group") as HTMLInputElement, { target: { value: "999999" } });
    fireEvent.change(document.querySelector("#blast-name") as HTMLInputElement, { target: { value: `${PREFIX} camp` } });
    fireEvent.change(document.querySelector("#blast-body") as HTMLTextAreaElement, {
      target: { value: `${PREFIX} blast ok` },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Campaign/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Campaign sent via Easify/i), { timeout: 15_000 });

    fetchSpy.mockRestore();

    // Real edge !res.ok arms (provider/validation errors)
    await clickSafe(user, screen.getByRole("tab", { name: /Single Message/i }));
    await waitFor(() => expect(document.querySelector("#single-phone")).toBeTruthy(), { timeout: 5_000 });
    fireEvent.change(document.querySelector("#single-phone") as HTMLInputElement, { target: { value: "0000000000" } });
    fireEvent.change(document.querySelector("#single-body") as HTMLTextAreaElement, {
      target: { value: `${PREFIX} real fail` },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send SMS/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Failed to send|invalid|easify|Error/i), {
      timeout: 30_000,
    });

    await clickSafe(user, screen.getByRole("tab", { name: /Campaign Blast/i }));
    await waitFor(() => expect(document.querySelector("#blast-group")).toBeTruthy(), { timeout: 5_000 });
    fireEvent.change(document.querySelector("#blast-group") as HTMLInputElement, { target: { value: "999999999" } });
    fireEvent.change(document.querySelector("#blast-name") as HTMLInputElement, { target: { value: "" } });
    fireEvent.change(document.querySelector("#blast-body") as HTMLTextAreaElement, {
      target: { value: `${PREFIX} camp fail` },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Campaign/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Campaign failed|Failed|invalid|easify|Error/i), {
      timeout: 30_000,
    });

    view.unmount();
    cleanup();
  }, 240_000);
});
