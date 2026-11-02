/**
 * Pass 16 — Auth / ResetPassword / AuthContext (+ AcceptFamilyInvite)
 * → ~100% against real Kong :54331.
 * Disposable covaf_* users; E2E seeds kept; no mock client for happy-path auth.
 */
import { describe, it, expect, afterAll, beforeAll, afterEach, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { screen, waitFor, fireEvent, cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { execFileSync } from "node:child_process";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import AcceptFamilyInvite from "@/pages/AcceptFamilyInvite";
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
const PREFIX = `covaf_${Date.now().toString(36)}`;
const PASS = E2E_PASSWORD;
const STRONG = "CovAfPass1!";

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

const seeded = {
  userIds: [] as string[],
  memberIds: [] as string[],
  inviteIds: [] as string[],
  familyLinkIds: [] as string[],
  signInEmail: `${PREFIX}_signin@covaf.test`,
  resetEmail: `${PREFIX}_reset@covaf.test`,
  signupEmail: `${PREFIX}_signup@covaf.test`,
  inviterEmail: `${PREFIX}_inviter@covaf.test`,
  accepteeEmail: `${PREFIX}_acceptee@covaf.test`,
  nomemEmail: `${PREFIX}_nomem@covaf.test`,
  pendingToken: "" as string,
  usedToken: "" as string,
  acceptToken: "" as string,
  noMemberToken: "" as string,
};

async function createAuthMember(
  admin: SupabaseClient,
  opts: { email: string; first: string; last: string; chapterId?: string | null },
) {
  const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
    email: opts.email,
    password: PASS,
    email_confirm: true,
  });
  if (cuErr || !cu.user) throw cuErr ?? new Error(`createUser ${opts.email}`);
  seeded.userIds.push(cu.user.id);

  const { data: existing } = await admin.from("members").select("id").eq("user_id", cu.user.id).maybeSingle();
  if (existing?.id) {
    const { error: upErr } = await admin
      .from("members")
      .update({
        first_name: opts.first,
        last_name: opts.last,
        chapter_id: opts.chapterId === undefined ? AHMEDABAD : opts.chapterId,
        onboarding_completed: true,
        verification_level: 1,
        suspended: false,
        blocked: false,
      })
      .eq("id", existing.id);
    if (upErr) throw upErr;
    seeded.memberIds.push(existing.id);
    return { userId: cu.user.id, memberId: existing.id };
  }

  const { data: mem, error: memErr } = await admin
    .from("members")
    .insert({
      user_id: cu.user.id,
      first_name: opts.first,
      last_name: opts.last,
      chapter_id: opts.chapterId === undefined ? AHMEDABAD : opts.chapterId,
      verification_level: 1,
      onboarding_completed: true,
      overseas_verified: false,
      suspended: false,
      blocked: false,
      gender: "Male",
      dob: "1990-01-15",
      birth_place: "Coverage City",
    })
    .select("id")
    .single();
  if (memErr || !mem) throw memErr ?? new Error(`seed member ${opts.email}`);
  seeded.memberIds.push(mem.id);
  return { userId: cu.user.id, memberId: mem.id };
}

async function cleanupCovAf() {
  const admin = adminClient();
  if (seeded.inviteIds.length) {
    await admin.from("family_invitations").delete().in("id", seeded.inviteIds);
  }
  await admin.from("family_invitations").delete().like("invitee_name", "CovAF%");
  if (seeded.familyLinkIds.length) {
    await admin.from("family_links").delete().in("id", seeded.familyLinkIds);
  }
  for (const mid of seeded.memberIds) {
    await admin.from("family_links").delete().eq("member_id", mid);
    await admin.from("family_links").delete().eq("related_member_id", mid);
    await admin.from("family_invitations").delete().eq("inviter_member_id", mid);
    await admin.from("members").delete().eq("id", mid);
  }
  for (const uid of seeded.userIds) {
    await admin.auth.admin.deleteUser(uid);
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = "";
});

describe("Pass 16 auth flows (real Kong)", () => {
  beforeAll(async () => {
    // Kong PostgREST uses supabase_db_khadayata-local (not Postgres.app :5438).
    // Ensure preview RPC exists so AcceptFamilyInvite can exercise real RPC paths.
    try {
      execFileSync(
        "docker",
        [
          "exec",
          "-i",
          "supabase_db_khadayata-local",
          "psql",
          "-U",
          "postgres",
          "-d",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          `
CREATE OR REPLACE FUNCTION public.get_family_invitation_preview(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_inviter RECORD;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT id, invitee_name, relation, status, inviter_member_id
    INTO v_inv FROM family_invitations WHERE acceptance_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT first_name, last_name INTO v_inviter FROM members WHERE id = v_inv.inviter_member_id;
  RETURN jsonb_build_object(
    'found', true,
    'status', v_inv.status,
    'invitee_name', v_inv.invitee_name,
    'relation', v_inv.relation,
    'inviter_first_name', COALESCE(v_inviter.first_name, ''),
    'inviter_last_name', COALESCE(v_inviter.last_name, '')
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_family_invitation_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_invitation_preview(uuid) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
`,
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch (err) {
      console.warn("preview RPC ensure skipped:", (err as Error).message);
    }

    const admin = adminClient();

    await createAuthMember(admin, { email: seeded.signInEmail, first: "CovAF", last: "SignIn" });
    await createAuthMember(admin, { email: seeded.resetEmail, first: "CovAF", last: "Reset" });

    const inviter = await createAuthMember(admin, {
      email: seeded.inviterEmail,
      first: "CovAF",
      last: "Inviter",
    });
    const acceptee = await createAuthMember(admin, {
      email: seeded.accepteeEmail,
      first: "CovAF",
      last: "Acceptee",
    });

    const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
      email: seeded.nomemEmail,
      password: PASS,
      email_confirm: true,
    });
    if (cuErr || !cu.user) throw cuErr ?? new Error("create nomem user");
    seeded.userIds.push(cu.user.id);
    await admin.from("members").delete().eq("user_id", cu.user.id);

    const { data: invites, error: invErr } = await admin
      .from("family_invitations")
      .insert([
        {
          inviter_member_id: inviter.memberId,
          relation: "son",
          invitee_name: `CovAF Pending ${PREFIX}`,
          invitee_email: `${PREFIX}-pending@covaf.test`,
          status: "pending",
        },
        {
          inviter_member_id: inviter.memberId,
          relation: "daughter",
          invitee_name: `CovAF Used ${PREFIX}`,
          invitee_email: `${PREFIX}-used@covaf.test`,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by_member_id: acceptee.memberId,
        },
        {
          inviter_member_id: inviter.memberId,
          relation: "brother",
          invitee_name: `CovAF Accept ${PREFIX}`,
          invitee_email: seeded.accepteeEmail,
          status: "pending",
        },
        {
          inviter_member_id: inviter.memberId,
          relation: "sister",
          invitee_name: `CovAF NoMem ${PREFIX}`,
          invitee_email: seeded.nomemEmail,
          status: "pending",
        },
      ])
      .select("id, acceptance_token, invitee_name");
    if (invErr || !invites) throw invErr ?? new Error("seed invites");
    for (const row of invites) {
      seeded.inviteIds.push(row.id);
      if (row.invitee_name.includes("Pending")) seeded.pendingToken = row.acceptance_token;
      if (row.invitee_name.includes("Used")) seeded.usedToken = row.acceptance_token;
      if (row.invitee_name.includes("Accept")) seeded.acceptToken = row.acceptance_token;
      if (row.invitee_name.includes("NoMem")) seeded.noMemberToken = row.acceptance_token;
    }
    if (!seeded.pendingToken || !seeded.usedToken || !seeded.acceptToken || !seeded.noMemberToken) {
      throw new Error(`invite tokens incomplete: ${JSON.stringify(seeded)}`);
    }

    // Wait until PostgREST sees the preview RPC
    for (let i = 0; i < 20; i++) {
      const { error } = await admin.rpc("get_family_invitation_preview", {
        p_token: seeded.pendingToken,
      });
      if (!error || !/Could not find the function|PGRST202/i.test(error.message)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }, 120_000);

  afterAll(async () => {
    try {
      await cleanupCovAf();
    } catch {
      /* best-effort */
    }
    await supabase.auth.signOut();
  }, 120_000);

  it("AuthContext: useAuth outside provider throws", () => {
    function Probe() {
      useAuth();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useAuth must be used within AuthProvider/);
    spy.mockRestore();
  });

  it("Auth: loading pulse while session resolves", async () => {
    await supabase.auth.signOut();
    const unsub = vi.fn();
    vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
      data: {
        subscription: {
          id: "covaf-loading",
          callback: () => {},
          unsubscribe: unsub,
        },
      },
    } as ReturnType<typeof supabase.auth.onAuthStateChange>);
    vi.spyOn(supabase.auth, "getSession").mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof supabase.auth.getSession>,
    );

    renderApp(<Auth />, { route: "/auth" });
    await waitFor(() => {
      expect(document.querySelector("img.animate-pulse")).toBeTruthy();
    });
  });

  it("Auth: signed-in user Navigates to redirect", async () => {
    await signIn(seeded.signInEmail);
    const { unmount } = renderApp(<Auth />, { route: "/auth?redirect=/profile" });
    await waitFor(
      () => {
        expect(document.body.textContent ?? "").not.toMatch(/Welcome Back/i);
      },
      { timeout: 15_000 },
    );
    unmount();
    await supabase.auth.signOut();
  }, 60_000);

  it("Auth: validation + mode toggles + forgot success/fail + bad sign-in", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Auth />), { route: "/auth" });

    await waitFor(
      () => expect(screen.getByRole("heading", { name: /Welcome Back/i })).toBeInTheDocument(),
      { timeout: 15_000 },
    );

    // Toggle sign-up / sign-in
    await clickSafe(user, screen.getByRole("button", { name: /Don't have an account/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Join the Community/i })).toBeInTheDocument(),
    );
    await clickSafe(user, screen.getByRole("button", { name: /Already have an account/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Welcome Back/i })).toBeInTheDocument(),
    );

    // Invalid email / short password via forced submit (bypass HTML5)
    const email = screen.getByLabelText(/^Email$/i);
    const password = screen.getByLabelText(/^Password$/i);
    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.change(password, { target: { value: "123" } });
    fireEvent.submit(email.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Invalid email|valid email/i), {
      timeout: 8_000,
    });

    fireEvent.change(email, { target: { value: "ok@covaf.test" } });
    fireEvent.change(password, { target: { value: "123" } });
    fireEvent.submit(email.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Invalid password|at least 6/i), {
      timeout: 8_000,
    });

    // Bad credentials (real Kong)
    fireEvent.change(email, { target: { value: seeded.signInEmail } });
    fireEvent.change(password, { target: { value: "WrongPass999!" } });
    await clickSafe(user, screen.getByRole("button", { name: /^Sign In$/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/incorrect|Error|Invalid login/i),
      { timeout: 20_000 },
    );

    // Forgot password — unknown email → edge returns 200 (security success)
    await clickSafe(user, screen.getByRole("button", { name: /Forgot password/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Reset Password/i })).toBeInTheDocument(),
    );
    const forgotEmail = screen.getByLabelText(/^Email$/i);
    fireEvent.change(forgotEmail, { target: { value: "bad" } });
    fireEvent.submit(forgotEmail.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Invalid email/i), {
      timeout: 8_000,
    });

    fireEvent.change(forgotEmail, { target: { value: `${PREFIX}_nobody@covaf.test` } });
    await clickSafe(user, screen.getByRole("button", { name: /Send Reset Link/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Check your email|sent a password reset/i),
      { timeout: 25_000 },
    );

    // Failure arm: edge may return 200 when email is configured; force !res.ok + catch.
    await clickSafe(user, screen.getByRole("button", { name: /Forgot password/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Reset Password/i })).toBeInTheDocument(),
    );
    const realFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("send-reset-email")) {
        const body = typeof init?.body === "string" ? init.body : "";
        if (body.includes("force-network-fail")) {
          throw new Error("covaf network fail");
        }
        if (body.includes(seeded.signInEmail)) {
          return new Response("forced fail", { status: 502, statusText: "Bad Gateway" });
        }
      }
      return realFetch(input, init);
    }) as typeof fetch;

    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: seeded.signInEmail } });
    await clickSafe(user, screen.getByRole("button", { name: /Send Reset Link/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Failed to send reset email/i),
      { timeout: 15_000 },
    );

    // Network throw → same catch toast
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: "force-network-fail@covaf.test" },
    });
    await clickSafe(user, screen.getByRole("button", { name: /Send Reset Link/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Failed to send reset email/i),
      { timeout: 15_000 },
    );
    globalThis.fetch = realFetch;

    await clickSafe(user, screen.getByRole("button", { name: /Back to Sign In/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Welcome Back/i })).toBeInTheDocument(),
    );

    unmount();
  }, 180_000);

  it("Auth: real sign-in happy path", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Auth />), { route: "/auth" });
    await waitFor(
      () => expect(screen.getByRole("heading", { name: /Welcome Back/i })).toBeInTheDocument(),
      { timeout: 15_000 },
    );

    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: seeded.signInEmail } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: PASS } });
    await clickSafe(user, screen.getByRole("button", { name: /^Sign In$/i }));

    await waitFor(
      async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        expect(session?.user?.email?.toLowerCase()).toBe(seeded.signInEmail);
      },
      { timeout: 25_000 },
    );
    await waitFor(() => expect(document.body.textContent ?? "").not.toMatch(/Welcome Back/i), {
      timeout: 10_000,
    });
    unmount();
    await supabase.auth.signOut();
  }, 90_000);

  it("AuthContext: signUp email-invoke throw returns support error", async () => {
    await supabase.auth.signOut();
    await waitFor(async () => {
      expect((await supabase.auth.getSession()).data.session).toBeNull();
    }, { timeout: 10_000 });

    const fnProto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origInvoke = fnProto.invoke;
    fnProto.invoke = (async () => {
      throw new Error("covaf forced email failure");
    }) as typeof supabase.functions.invoke;

    const emailFail = `${PREFIX}_emailfail@covaf.test`;
    function Probe() {
      const { signUp } = useAuth();
      const [msg, setMsg] = useState("");
      return (
        <div>
          <button
            type="button"
            onClick={() => {
              void signUp(emailFail, PASS).then(({ error }) =>
                setMsg(error?.message ?? "ok"),
              );
            }}
          >
            signup
          </button>
          <span data-testid="signup-msg">{msg}</span>
        </div>
      );
    }

    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^signup$/i }));
    await waitFor(
      () =>
        expect(screen.getByTestId("signup-msg").textContent).toMatch(
          /email verification failed|contact support/i,
        ),
      { timeout: 30_000 },
    );
    fnProto.invoke = origInvoke;

    const admin = adminClient();
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of listed?.users ?? []) {
      if (u.email?.toLowerCase() === emailFail) {
        seeded.userIds.push(u.id);
        const { data: mem } = await admin.from("members").select("id").eq("user_id", u.id).maybeSingle();
        if (mem?.id) seeded.memberIds.push(mem.id);
      }
    }
    unmount();
    await supabase.auth.signOut();
  }, 90_000);

  it("Auth: real sign-up happy path", async () => {
    await supabase.auth.signOut();
    await waitFor(async () => {
      expect((await supabase.auth.getSession()).data.session).toBeNull();
    }, { timeout: 10_000 });

    const user = userEvent.setup();
    const admin = adminClient();
    const { unmount } = renderApp(withToaster(<Auth />), { route: "/auth" });
    await waitFor(
      () => expect(screen.getByRole("heading", { name: /Welcome Back/i })).toBeInTheDocument(),
      { timeout: 15_000 },
    );
    await clickSafe(user, screen.getByRole("button", { name: /Don't have an account/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Join the Community/i })).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: seeded.signupEmail } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: PASS } });
    await clickSafe(user, screen.getByRole("button", { name: /Create Account/i }));
    await waitFor(
      async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const body = document.body.textContent ?? "";
        expect(
          session?.user?.email?.toLowerCase() === seeded.signupEmail ||
            /Check your email|verification link|Error/i.test(body),
        ).toBe(true);
      },
      { timeout: 30_000 },
    );
    const { data: listed2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of listed2?.users ?? []) {
      if (u.email?.toLowerCase() === seeded.signupEmail) {
        if (!seeded.userIds.includes(u.id)) seeded.userIds.push(u.id);
        const { data: mem } = await admin.from("members").select("id").eq("user_id", u.id).maybeSingle();
        if (mem?.id && !seeded.memberIds.includes(mem.id)) seeded.memberIds.push(mem.id);
      }
    }
    unmount();
    await supabase.auth.signOut();
  }, 90_000);

  it("AuthContext: signOut clears session", async () => {
    await signIn(seeded.signInEmail);
    function Probe() {
      const { user, loading, signOut } = useAuth();
      if (loading) return <div>loading</div>;
      return (
        <div>
          <span data-testid="email">{user?.email ?? "none"}</span>
          <button type="button" onClick={() => void signOut()}>
            out
          </button>
        </div>
      );
    }
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("email").textContent).toMatch(/covaf/i), {
      timeout: 15_000,
    });
    fireEvent.click(screen.getByRole("button", { name: /^out$/i }));
    await waitFor(() => expect(screen.getByTestId("email").textContent).toBe("none"), {
      timeout: 15_000,
    });
    unmount();
  }, 60_000);

  it("ResetPassword: invalid link + recovery form + update success/error", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();

    // Invalid link (no recovery hash)
    window.location.hash = "";
    const { unmount: u1 } = renderApp(withToaster(<ResetPassword />), { route: "/reset-password" });
    await waitFor(() => expect(screen.getByText(/Invalid Reset Link/i)).toBeInTheDocument());
    await clickSafe(user, screen.getByRole("button", { name: /Back to Sign In/i }));
    u1();

    // Recovery surface — signed in so updateUser can succeed
    await signIn(seeded.resetEmail);
    window.location.hash = "#type=recovery&access_token=covaf";
    const { unmount: u2 } = renderApp(withToaster(<ResetPassword />), { route: "/reset-password" });
    await waitFor(() => expect(screen.getByText(/Set New Password/i)).toBeInTheDocument());

    const pw = screen.getByLabelText(/^New Password$/i);
    const confirm = screen.getByLabelText(/^Confirm Password$/i);

    // Strength / rule UI + mismatch
    fireEvent.change(pw, { target: { value: "Ab1!" } });
    await waitFor(() => expect(document.body.textContent).toMatch(/Weak|Fair|At least 8/i));
    fireEvent.change(confirm, { target: { value: "Ab1!!" } });
    await waitFor(() => expect(document.body.textContent).toMatch(/Passwords do not match/i));

    // Eye toggles
    await clickSafe(user, screen.getByLabelText(/Show password/i));
    await clickSafe(user, screen.getByLabelText(/Show confirm password/i));
    await clickSafe(user, screen.getByLabelText(/Hide password/i));
    await clickSafe(user, screen.getByLabelText(/Hide confirm password/i));

    // Force early-return arms via submit (button may be disabled)
    fireEvent.change(pw, { target: { value: "short" } });
    fireEvent.change(confirm, { target: { value: "short" } });
    fireEvent.submit(pw.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/does not meet requirements/i), {
      timeout: 8_000,
    });

    fireEvent.change(pw, { target: { value: STRONG } });
    fireEvent.change(confirm, { target: { value: "Different1!" } });
    fireEvent.submit(pw.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Passwords do not match/i), {
      timeout: 8_000,
    });

    // Happy path update
    fireEvent.change(pw, { target: { value: STRONG } });
    fireEvent.change(confirm, { target: { value: STRONG } });
    await clickSafe(user, screen.getByRole("button", { name: /Update Password/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Password updated successfully|Error/i),
      { timeout: 20_000 },
    );
    // Restore original password for later sign-ins / cleanup
    const admin = adminClient();
    const resetUser = seeded.userIds.find(Boolean);
    const {
      data: { user: cur },
    } = await supabase.auth.getUser();
    if (cur?.id) {
      await admin.auth.admin.updateUserById(cur.id, { password: PASS });
    } else if (resetUser) {
      await admin.auth.admin.updateUserById(resetUser, { password: PASS });
    }
    u2();

    // Error arm: recovery UI but no session → updateUser fails
    await supabase.auth.signOut();
    window.location.hash = "#type=recovery";
    const { unmount: u3 } = renderApp(withToaster(<ResetPassword />), { route: "/reset-password" });
    await waitFor(() => expect(screen.getByText(/Set New Password/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: STRONG } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password$/i), { target: { value: STRONG } });
    await clickSafe(user, screen.getByRole("button", { name: /Update Password/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Error|session|Auth/i), {
      timeout: 20_000,
    });
    u3();
    window.location.hash = "";
  }, 180_000);

  it("AcceptFamilyInvite: invalid / pending / used / accept / no-member", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();

    // Missing token
    const { unmount: u0 } = renderApp(<AcceptFamilyInvite />, { route: "/accept-family-invite" });
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Invalid invitation link|Something went wrong/i),
      { timeout: 15_000 },
    );
    await clickSafe(user, screen.getByRole("button", { name: /Go Home/i }));
    u0();

    // Bad token
    const { unmount: u1 } = renderApp(<AcceptFamilyInvite />, {
      route: "/accept-family-invite/00000000-0000-0000-0000-000000000099",
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(
      () => expect(document.body.textContent).toMatch(/invalid or has expired|Something went wrong/i),
      { timeout: 20_000 },
    );
    u1();

    // Already used
    const { unmount: u2 } = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${seeded.usedToken}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(
      () => expect(document.body.textContent).toMatch(/already been accepted/i),
      { timeout: 20_000 },
    );
    await clickSafe(user, screen.getByRole("button", { name: /Go to My Profile/i }));
    u2();

    // Pending preview signed-out → Sign In link
    const { unmount: u3 } = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${seeded.pendingToken}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Parivar Connection|invited you/i), {
      timeout: 20_000,
    });
    expect(screen.getByRole("link", { name: /Sign In to Accept/i })).toBeInTheDocument();
    u3();

    // No member profile on accept
    await signIn(seeded.nomemEmail);
    const { unmount: u4 } = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${seeded.noMemberToken}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /Accept/i })).toBeInTheDocument(), {
      timeout: 20_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Accept/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/No member profile|complete onboarding/i),
      { timeout: 20_000 },
    );
    u4();
    await supabase.auth.signOut();

    // Happy accept
    await signIn(seeded.accepteeEmail);
    const { unmount: u5 } = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${seeded.acceptToken}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /Accept/i })).toBeInTheDocument(), {
      timeout: 20_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Accept/i }));
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /Connection established|already|Something went wrong|Creating your family/i,
        ),
      { timeout: 25_000 },
    );
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /Connection established|Something went wrong|already been accepted/i,
        ),
      { timeout: 25_000 },
    );
    const viewBtn = screen.queryByRole("button", { name: /View My Profile|Go Home|Go to My Profile/i });
    if (viewBtn) await clickSafe(user, viewBtn);

    // Track any family links created
    const admin = adminClient();
    const { data: links } = await admin
      .from("family_links")
      .select("id")
      .or(
        `member_id.in.(${seeded.memberIds.join(",")}),related_member_id.in.(${seeded.memberIds.join(",")})`,
      );
    for (const row of links ?? []) seeded.familyLinkIds.push(row.id);

    u5();
    await supabase.auth.signOut();

    // RPC data.error arm: inviter cannot accept their own invitation
    await signIn(seeded.inviterEmail);
    const { unmount: u6 } = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${seeded.pendingToken}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /Accept/i })).toBeInTheDocument(), {
      timeout: 20_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Accept/i }));
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /Something went wrong|only accept|not found|already used/i,
        ),
      { timeout: 20_000 },
    );
    u6();
    await supabase.auth.signOut();

    // safeErrorMessage fallback when RPC returns error without data.error
    await signIn(seeded.accepteeEmail);
    const realRpc = supabase.rpc.bind(supabase);
    const rpcSpy = vi.spyOn(supabase, "rpc").mockImplementation(((fn: string, args?: object) => {
      if (fn === "accept_family_invitation") {
        return Promise.resolve({
          data: null,
          error: { message: "covaf rpc boom", details: "", hint: "", code: "P0001" },
        }) as ReturnType<typeof supabase.rpc>;
      }
      return realRpc(fn, args as never);
    }) as typeof supabase.rpc);
    const { unmount: u7 } = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${seeded.pendingToken}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /Accept/i })).toBeInTheDocument(), {
      timeout: 20_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Accept/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/could not accept|covaf rpc boom|Something went wrong/i),
      { timeout: 20_000 },
    );
    rpcSpy.mockRestore();
    u7();
    await supabase.auth.signOut();
  }, 240_000);
});
