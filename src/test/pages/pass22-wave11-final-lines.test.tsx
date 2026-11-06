/**
 * Pass 22 — Wave 11: close the last full-suite uncovered lines (14).
 * EMAILIT stays blank / DISABLE_OUTBOUND_EMAIL=1 — reminder success arms use invoke spies.
 * Real Kong :54331. Disposable covw11_* fixtures only.
 *
 * Schema notes: `members` has no `email` column (look up via auth.users → user_id).
 * `matrimonial_profiles` has no `gender` / `looking_for` columns.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import { MatrimonialModerationPanel } from "@/components/matrimonial/MatrimonialModerationPanel";
import ObituaryForm from "@/components/obituaries/ObituaryForm";

const PREFIX = `covw11_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

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

async function memberIdForEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  const { data: mem } = await admin.from("members").select("id").eq("user_id", user.id).maybeSingle();
  return mem?.id ?? null;
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
  if (!el) return;
  await user.click(el);
}

const seeded: {
  memberId?: string;
  userId?: string;
  pendingMemberId?: string;
  pendingUserId?: string;
  matrimonialIds: string[];
  vrId?: string;
} = { matrimonialIds: [] };

describe("Pass 22 — Wave 11 final uncovered lines (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    // Homepage latest-members card with photo_url (Index.tsx:441)
    const email = `${PREFIX}-photo@example.invalid`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    seeded.userId = created.user!.id;
    const { data: mem, error: memErr } = await admin
      .from("members")
      .insert({
        user_id: seeded.userId,
        first_name: `${PREFIX}Photo`,
        last_name: "Member",
        chapter_id: AHMEDABAD,
        onboarding_completed: true,
        verification_level: 2,
        photo_url: "https://placehold.co/128x128/png",
        global_id: `KHD-W11${Date.now().toString(36).slice(-4).toUpperCase()}`,
        overseas_verified: false,
        suspended: false,
        blocked: false,
        gender: "Male",
        dob: "1990-01-15",
        birth_place: "Wave11 City",
        privacy: { dob: "members", birth_place: "chapter", employment: "members" },
      })
      .select("id")
      .single();
    if (memErr) throw memErr;
    seeded.memberId = mem!.id;

    // Pending-onboarding member for VerificationDashboard reminder UI
    const pendEmail = `${PREFIX}-pend@example.invalid`;
    const { data: pendAuth, error: pendAuthErr } = await admin.auth.admin.createUser({
      email: pendEmail,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (pendAuthErr) throw pendAuthErr;
    seeded.pendingUserId = pendAuth.user!.id;
    const { data: pendMem, error: pendMemErr } = await admin
      .from("members")
      .insert({
        user_id: seeded.pendingUserId,
        first_name: `${PREFIX}Pend`,
        last_name: "Onboard",
        chapter_id: AHMEDABAD,
        onboarding_completed: false,
        verification_level: 0,
        overseas_verified: false,
        suspended: false,
        blocked: false,
        gender: "Male",
        dob: "1992-02-02",
        birth_place: "Wave11 Pend",
        privacy: { dob: "members", birth_place: "chapter", employment: "members" },
      })
      .select("id")
      .single();
    if (pendMemErr) throw pendMemErr;
    seeded.pendingMemberId = pendMem!.id;

    // Suspended matrimonial on seeded member (Suspended badge line 76)
    // Schema: no gender/looking_for on matrimonial_profiles
    const { data: susp, error: suspErr } = await admin
      .from("matrimonial_profiles")
      .upsert(
        {
          member_id: seeded.memberId,
          verified: false,
          suspended: true,
          about: `${PREFIX} suspended profile`,
          visibility: "members",
        },
        { onConflict: "member_id" },
      )
      .select("id, suspended")
      .single();
    if (suspErr) throw suspErr;
    if (!susp?.suspended) throw new Error("expected suspended matrimonial seed");
    seeded.matrimonialIds.push(susp.id);

    // Pending matrimonial on E2E member for delete arm (lines 43-44)
    const e2eId = await memberIdForEmail(admin, E2E_ACCOUNTS.unverified.email);
    if (e2eId) {
      const { data: p2, error: p2Err } = await admin
        .from("matrimonial_profiles")
        .upsert(
          {
            member_id: e2eId,
            verified: false,
            suspended: false,
            about: `${PREFIX} pending delete`,
            visibility: "members",
          },
          { onConflict: "member_id" },
        )
        .select("id")
        .single();
      if (p2Err) throw p2Err;
      if (p2) seeded.matrimonialIds.push(p2.id);
    }
  }, 120_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.matrimonialIds.length) {
      await admin.from("matrimonial_profiles").delete().in("id", seeded.matrimonialIds);
    }
    if (seeded.vrId) await admin.from("verification_requests").delete().eq("id", seeded.vrId);
    if (seeded.pendingMemberId) await admin.from("members").delete().eq("id", seeded.pendingMemberId);
    if (seeded.memberId) await admin.from("members").delete().eq("id", seeded.memberId);
    if (seeded.pendingUserId) await admin.auth.admin.deleteUser(seeded.pendingUserId);
    if (seeded.userId) await admin.auth.admin.deleteUser(seeded.userId);
    await supabase.auth.signOut();
  }, 60_000);

  it("Auth forgot-password success path (lines 72–75) via mocked send-reset-email 200", async () => {
    await supabase.auth.signOut();
    const realFetch = globalThis.fetch.bind(globalThis);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("send-reset-email")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return realFetch(input, init);
    });

    renderApp(withToaster(<Auth />), { route: "/auth" });
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText(/Forgot password/i)).toBeTruthy(), { timeout: 10_000 });
    await clickSafe(user, screen.getByText(/Forgot password/i));
    const email = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
    fireEvent.change(email, { target: { value: E2E_ACCOUNTS.member.email } });
    fireEvent.submit(email.closest("form")!);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Check your email|password reset link/i),
      { timeout: 15_000 },
    );
    fetchSpy.mockRestore();
  }, 60_000);

  it("Index homepage latest member renders photo_url img (line 441)", async () => {
    await supabase.auth.signOut();
    renderApp(<Index />, { route: "/" });
    await waitFor(
      () => {
        const img = document.querySelector(`img[alt="${PREFIX}Photo Member"]`);
        expect(img).toBeTruthy();
      },
      { timeout: 30_000 },
    );
  }, 60_000);

  it("ObituaryForm catch uses non-Error throw (line 75)", async () => {
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const realFrom = supabase.from.bind(supabase);
    const fromSpy = vi.spyOn(supabase, "from").mockImplementation(((table: string) => {
      if (table === "obituaries") {
        return {
          insert: async () => ({ data: null, error: "string-failure-not-Error" }),
        } as never;
      }
      return realFrom(table);
    }) as typeof supabase.from);

    let success = false;
    renderApp(
      withToaster(
        <ObituaryForm
          onSuccess={() => {
            success = true;
          }}
          onClose={() => {}}
        />,
      ),
      { route: "/obituaries" },
    );

    const user = userEvent.setup();
    const nameInput = screen.getByPlaceholderText(/e\.g\. Ramesh Patel/i);
    await user.clear(nameInput);
    await user.type(nameInput, `${PREFIX} Elder`);

    const dates = document.querySelectorAll('input[type="date"]');
    expect(dates.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(dates[1] as HTMLInputElement, { target: { value: "2020-01-01" } });

    const form = nameInput.closest("form");
    expect(form).toBeTruthy();
    await act(async () => {
      fireEvent.submit(form!);
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Failed to post obituary/i);
    }, { timeout: 15_000 });
    expect(success).toBe(false);
    fromSpy.mockRestore();
  }, 60_000);

  it("VerificationDashboard selected + mass reminder sent>0 toasts (lines 166, 188–191)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);

    // supabase.functions is a fresh object each access — stub the prototype (pass15/16/18/19).
    const fnProto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origInvoke = fnProto.invoke;
    const invokeCalls: Array<{ name: string; body?: Record<string, unknown> }> = [];
    fnProto.invoke = (async (name: string, opts?: { body?: Record<string, unknown> }) => {
      const body = opts?.body ?? {};
      invokeCalls.push({ name, body });
      if (name === "send-reminder") {
        if (body.send_to_all) {
          return {
            data: { sent: 3, failed: 1, errors: [], total_attempted: 4 },
            error: null,
          } as never;
        }
        return {
          data: { sent: 2, failed: 0, errors: [] },
          error: null,
        } as never;
      }
      return origInvoke.call(supabase.functions, name, opts as never);
    }) as typeof supabase.functions.invoke;

    try {
      const user = userEvent.setup();
      // Chapter Admin path: row remind does not require get_member_emails map
      renderApp(
        withToaster(
          <VerificationDashboard myChapterId={AHMEDABAD} isGlobalAdmin={false} canSendReminders />,
        ),
        { route: "/admin?tab=verification" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}Pend`)), {
        timeout: 45_000,
      });

      // Per-row reminder (sent>0 → line 166) — exact aria-label, not the mass button
      const rowRemind = await screen.findAllByRole(
        "button",
        { name: /^Send reminder email$/i },
        { timeout: 30_000 },
      );
      const beforeRow = invokeCalls.length;
      fireEvent.click(rowRemind[0]);
      await waitFor(() => {
        expect(invokeCalls.length).toBeGreaterThan(beforeRow);
        expect(screen.getByText("Reminders sent")).toBeTruthy();
      }, { timeout: 15_000 });

      // Mass reminders dialog (sent>0 → lines 188–191)
      // pass17 pattern: fireEvent.click on "Send to All"
      const beforeMass = invokeCalls.length;
      const massOpen = screen.getByRole("button", {
        name: /Send reminder emails to all \d+ pending/i,
      });
      await user.click(massOpen);
      await screen.findByRole("alertdialog", {}, { timeout: 10_000 });
      const confirm = screen.getByRole("button", { name: /Send to All$/i });
      await act(async () => {
        fireEvent.click(confirm);
      });
      await waitFor(() => {
        expect(invokeCalls.length).toBeGreaterThan(beforeMass);
      }, { timeout: 20_000 });
      expect(invokeCalls.some((c) => c.name === "send-reminder" && c.body?.send_to_all)).toBe(true);
      await waitFor(() => expect(screen.getByText("Mass reminders sent")).toBeTruthy(), {
        timeout: 10_000,
      });
    } finally {
      fnProto.invoke = origInvoke;
      cleanup();
    }
  }, 120_000);

  it("MatrimonialModerationPanel delete + Suspended badge (lines 43–44, 76)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const admin = adminClient();
    // Fresh pending profile for delete (prior runs may have removed it)
    const e2eId =
      (await memberIdForEmail(admin, E2E_ACCOUNTS.member.email)) ??
      (await memberIdForEmail(admin, E2E_ACCOUNTS.unverified.email));
    if (!e2eId) throw new Error("E2E member row missing for matrimonial delete seed");
    const { data: p, error: pErr } = await admin
      .from("matrimonial_profiles")
      .upsert(
        {
          member_id: e2eId,
          verified: false,
          suspended: false,
          about: `${PREFIX} pending delete refresh`,
          visibility: "members",
        },
        { onConflict: "member_id" },
      )
      .select("id")
      .single();
    if (pErr) throw pErr;
    if (p) seeded.matrimonialIds.push(p.id);

    // Re-affirm suspended seed still present (cleanup races)
    const { data: suspRefresh, error: suspRefreshErr } = await admin
      .from("matrimonial_profiles")
      .upsert(
        {
          member_id: seeded.memberId!,
          verified: false,
          suspended: true,
          about: `${PREFIX} suspended refresh`,
          visibility: "members",
        },
        { onConflict: "member_id" },
      )
      .select("id, suspended")
      .single();
    if (suspRefreshErr) throw suspRefreshErr;
    if (suspRefresh) seeded.matrimonialIds.push(suspRefresh.id);

    const user = userEvent.setup();
    renderApp(withToaster(<MatrimonialModerationPanel />), { route: "/admin?tab=matrimonial" });

    await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial Moderation/i), {
      timeout: 30_000,
    });

    // Suspended tab → Suspended badge (line 76)
    const suspTab = screen.getByRole("tab", { name: /Suspended/i });
    await clickSafe(user, suspTab);
    await waitFor(() => {
      const panel = screen.getByRole("tabpanel");
      expect(panel.textContent).toMatch(/Suspended/i);
      expect(panel.textContent).not.toMatch(/No profiles/i);
    }, { timeout: 20_000 });

    // Pending tab → delete
    const pendTab = screen.getByRole("tab", { name: /Pending/i });
    await clickSafe(user, pendTab);
    const delBtns = await screen.findAllByRole("button", { name: /Delete profile/i }, { timeout: 20_000 });
    await clickSafe(user, delBtns[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile deleted/i), {
      timeout: 20_000,
    });
  }, 90_000);
});
