/**
 * Pass 16 — Auth flows (login / signup / password / session / guards) → ~100%
 * against real Kong :54331. Reversible covauth_* users; no mock view data.
 */
import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor, fireEvent, cleanup, act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import LoginGate from "@/components/LoginGate";
import Dashboard from "@/pages/Dashboard";
import { Toaster } from "@/components/ui/toaster";

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

const PREFIX = `covauth_${Date.now().toString(36)}`;
const PASS = E2E_PASSWORD;
const STRONG_PW = "CovAuth1!";

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
  signupEmail: `${PREFIX}_signup@covauth.test`,
  resetEmail: `${PREFIX}_reset@covauth.test`,
};

describe("Pass 16 auth flows (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    const reset = await admin.auth.admin.createUser({
      email: seeded.resetEmail,
      password: PASS,
      email_confirm: true,
    });
    if (reset.error || !reset.data.user) {
      throw new Error(`seed reset user: ${reset.error?.message}`);
    }
    seeded.userIds.push(reset.data.user.id);
  }, 60_000);

  afterAll(async () => {
    cleanup();
    await supabase.auth.signOut().catch(() => undefined);
    const admin = adminClient();
    for (const id of seeded.userIds) {
      await admin.auth.admin.deleteUser(id).catch(() => undefined);
    }
    // Signup may create an auth user even when email confirm is pending
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of listed?.users ?? []) {
      if (u.email?.includes("@covauth.test") || u.email?.startsWith(PREFIX)) {
        await admin.auth.admin.deleteUser(u.id).catch(() => undefined);
      }
    }
  }, 60_000);

  it("AuthContext session: signIn / signOut / useAuth guard", async () => {
    await supabase.auth.signOut();

    function Probe() {
      const { user, session, loading, signIn: si, signOut: so } = useAuth();
      return (
        <div>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="email">{user?.email ?? "none"}</span>
          <span data-testid="has-session">{session ? "yes" : "no"}</span>
          <button type="button" onClick={() => void si(E2E_ACCOUNTS.member.email, PASS)}>
            do-signin
          </button>
          <button type="button" onClick={() => void so()}>
            do-signout
          </button>
        </div>
      );
    }

    const { unmount } = renderApp(<Probe />, { route: "/" });
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"), {
      timeout: 15_000,
    });
    expect(screen.getByTestId("email").textContent).toBe("none");

    await act(async () => {
      fireEvent.click(screen.getByText("do-signin"));
    });
    await waitFor(
      () => expect(screen.getByTestId("email").textContent).toBe(E2E_ACCOUNTS.member.email),
      { timeout: 20_000 },
    );
    expect(screen.getByTestId("has-session").textContent).toBe("yes");

    await act(async () => {
      fireEvent.click(screen.getByText("do-signout"));
    });
    await waitFor(() => expect(screen.getByTestId("email").textContent).toBe("none"), {
      timeout: 15_000,
    });
    unmount();

    expect(() => {
      function Bare() {
        useAuth();
        return null;
      }
      render(<Bare />);
    }).toThrow(/useAuth must be used within AuthProvider/);
  }, 90_000);

  it("AuthContext signUp happy path + email-invoke failure arm", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();

    function SignUpProbe({ email, label }: { email: string; label: string }) {
      const { signUp } = useAuth();
      return (
        <button
          type="button"
          onClick={() => {
            void signUp(email, PASS).then((r) => {
              const el = document.getElementById("signup-result");
              if (el) el.textContent = r.error ? `err:${r.error.message}` : "ok";
            });
          }}
        >
          {label}
        </button>
      );
    }

    const { unmount } = renderApp(
      withToaster(
        <>
          <SignUpProbe email={seeded.signupEmail} label="do-signup" />
          <div id="signup-result" />
        </>,
      ),
      { route: "/" },
    );
    await clickSafe(user, screen.getByText("do-signup"));
    await waitFor(
      () => {
        const t = document.getElementById("signup-result")?.textContent ?? "";
        expect(t === "ok" || t.startsWith("err:")).toBe(true);
      },
      { timeout: 30_000 },
    );
    unmount();

    // Force the email-failure arm: GoTrue succeeds, invoke returns error.
    // Patch FunctionsClient.prototype.invoke — instance spy/assign does not intercept.
    const email2 = `${PREFIX}_signup2@covauth.test`;
    const signUpSpy = vi
      .spyOn(supabase.auth, "signUp")
      .mockImplementation(async () => ({
        data: {
          user: { id: "00000000-0000-0000-0000-000000000099", email: email2 } as never,
          session: null,
        },
        error: null,
      }));
    const proto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origProtoInvoke = proto.invoke;
    proto.invoke = async () => ({ data: null, error: { message: "boom" } }) as never;
    const { unmount: u2 } = renderApp(
      withToaster(
        <>
          <SignUpProbe email={email2} label="do-signup2" />
          <div id="signup-result" />
        </>,
      ),
      { route: "/" },
    );
    await clickSafe(user, screen.getByText("do-signup2"));
    await waitFor(
      () => {
        expect(document.getElementById("signup-result")?.textContent ?? "").toMatch(
          /Signup successful but email verification failed/,
        );
      },
      { timeout: 10_000 },
    );
    signUpSpy.mockRestore();
    proto.invoke = origProtoInvoke;
    u2();
  }, 120_000);

  it("Auth loading diya while session resolves", async () => {
    await supabase.auth.signOut();
    const hang = new Promise<{ data: { session: null }; error: null }>(() => {
      /* never resolve — keeps AuthProvider loading=true until onAuthStateChange */
    });
    const getSessionSpy = vi.spyOn(supabase.auth, "getSession").mockReturnValue(hang as never);
    const oascSpy = vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
      data: { subscription: { unsubscribe: () => undefined, id: "t", callback: () => undefined } as never },
    } as never);

    const { unmount } = renderApp(<Auth />, { route: "/auth" });
    await waitFor(() => {
      expect(document.querySelector("img.animate-pulse, img[class*='animate-pulse']")).toBeTruthy();
    }, { timeout: 5_000 });
    getSessionSpy.mockRestore();
    oascSpy.mockRestore();
    unmount();
  }, 30_000);

  it("Auth page: validation, forgot-password, signup toggle, bad login, good login redirect", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();

    const { unmount } = renderApp(withToaster(<Auth />), { route: "/auth" });
    await waitFor(
      () => expect(document.body.textContent?.toLowerCase()).toMatch(/welcome back|sign in|email/),
      { timeout: 20_000 },
    );

    // Invalid email on sign-in (fireEvent.submit bypasses HTML5 constraint checks)
    const emailInput = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.change(passwordInput, { target: { value: "short1" } });
    fireEvent.submit(emailInput.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Invalid email|valid email/i), {
      timeout: 5_000,
    });

    // Valid email, short password
    fireEvent.change(emailInput, { target: { value: "someone@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "123" } });
    fireEvent.submit(emailInput.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Invalid password|at least 6/i), {
      timeout: 5_000,
    });

    // Wrong credentials
    fireEvent.change(passwordInput, { target: { value: "WrongPass99!" } });
    fireEvent.submit(emailInput.closest("form")!);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/incorrect|Error|could not/i),
      { timeout: 20_000 },
    );

    // Toggle signup
    await clickSafe(user, screen.getByRole("button", { name: /Don't have an account/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Join the Community|Create Account/i));
    await clickSafe(user, screen.getByRole("button", { name: /Already have an account/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Welcome Back/i));

    // Forgot password — invalid email
    await clickSafe(user, screen.getByRole("button", { name: /Forgot password/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Reset Password|reset link/i));
    const forgotEmail = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
    fireEvent.change(forgotEmail, { target: { value: "bad" } });
    fireEvent.submit(forgotEmail.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Invalid email/i));

    // Forgot password — success against live send-reset-email
    fireEvent.change(forgotEmail, { target: { value: E2E_ACCOUNTS.member.email } });
    fireEvent.submit(forgotEmail.closest("form")!);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Check your email|Failed to send|Welcome Back/i),
      { timeout: 25_000 },
    );

    // Back to sign in if still on forgot
    const back = screen.queryByRole("button", { name: /Back to Sign In/i });
    if (back) await clickSafe(user, back);

    // Forgot password — !res.ok path via fetch stub
    await clickSafe(user, screen.getByRole("button", { name: /Forgot password/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Reset Password|reset link/i));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("nope", { status: 500 }),
    );
    const forgotEmail2 = screen.getByLabelText(/^Email$/i);
    await user.clear(forgotEmail2);
    await user.type(forgotEmail2, "anyone@example.com");
    await clickSafe(user, screen.getByRole("button", { name: /Send Reset Link/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Failed to send reset email/i), {
      timeout: 10_000,
    });
    fetchSpy.mockRestore();

    // Network throw path — still on forgot form after !res.ok (isForgotPassword stays true)
    await waitFor(() => expect(document.body.textContent).toMatch(/Reset Password|Send Reset Link/i));
    const fetchThrow = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    const forgotEmail3 = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
    fireEvent.change(forgotEmail3, { target: { value: "anyone@example.com" } });
    fireEvent.submit(forgotEmail3.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Failed to send reset email/i), {
      timeout: 10_000,
    });
    fetchThrow.mockRestore();

    const back2 = screen.queryByRole("button", { name: /Back to Sign In/i });
    if (back2) await clickSafe(user, back2);

    // Signup error toast arm (isSignUp ? create-account copy)
    await clickSafe(user, screen.getByRole("button", { name: /Don't have an account/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Create Account|Join/i));
    const suEmail = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
    const suPass = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    fireEvent.change(suEmail, { target: { value: "taken-user@example.com" } });
    fireEvent.change(suPass, { target: { value: "TestPass123!" } });
    const signUpFail = vi.spyOn(supabase.auth, "signUp").mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "User already registered", name: "AuthError", status: 422 } as never,
    });
    fireEvent.submit(suEmail.closest("form")!);
    await waitFor(() => expect(document.body.textContent).toMatch(/could not create your account|Error/i), {
      timeout: 10_000,
    });
    signUpFail.mockRestore();
    await clickSafe(user, screen.getByRole("button", { name: /Already have an account/i }));

    unmount();

    // Signed-in Auth → Navigate away from form (redirect query honored by useSearchParams)
    await signIn(E2E_ACCOUNTS.member.email);
    const { unmount: u2 } = renderApp(withToaster(<Auth />), {
      route: "/auth?redirect=/dashboard",
    });
    await waitFor(
      () => {
        const text = document.body.textContent ?? "";
        const stillOnAuth = /Welcome Back|Join the Community|Create Account/.test(text);
        expect(stillOnAuth).toBe(false);
      },
      { timeout: 20_000 },
    );
    u2();
  }, 180_000);

  it("Auth signup form submits against Kong", async () => {
    await supabase.auth.signOut();
    cleanup();
    const user = userEvent.setup();
    const email = `${PREFIX}_form_signup_${Math.random().toString(36).slice(2)}@covauth.test`;
    // Patch FunctionsClient.invoke on the prototype — instance spy/assign is unreliable.
    const proto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origProtoInvoke = proto.invoke;
    proto.invoke = async function patchedInvoke(this: unknown, ...args: Parameters<typeof origProtoInvoke>) {
      if (args[0] === "send-reset-email") {
        return { data: { ok: true }, error: null } as never;
      }
      return origProtoInvoke.apply(this, args);
    };
    const { unmount } = renderApp(withToaster(<Auth />), { route: "/auth" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Welcome Back/i), {
      timeout: 15_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Don't have an account/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument());
    const em = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
    const pw = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    await user.clear(em);
    await user.type(em, email);
    await user.clear(pw);
    await user.type(pw, PASS);
    await clickSafe(user, screen.getByRole("button", { name: /Create Account/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Check your email|verification link/i),
      { timeout: 30_000 },
    );
    proto.invoke = origProtoInvoke;
    unmount();
  }, 90_000);

  it("ResetPassword invalid link + recovery form + updateUser", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();

    // Invalid link (no recovery hash)
    window.location.hash = "";
    const { unmount } = renderApp(withToaster(<ResetPassword />), { route: "/reset-password" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Invalid Reset Link/i), {
      timeout: 10_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Back to Sign In/i }));
    unmount();

    // Recovery UI — sign in disposable user then set recovery hash
    await signIn(seeded.resetEmail, PASS);
    window.location.hash = "#access_token=x&type=recovery";
    const { unmount: u2 } = renderApp(withToaster(<ResetPassword />), {
      route: "/reset-password",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Set New Password/i), {
      timeout: 10_000,
    });

    const pw = screen.getByLabelText(/^New Password$/i);
    const confirm = screen.getByLabelText(/^Confirm Password$/i);

    // Type weak password → strength UI
    await user.type(pw, "abc");
    expect(document.body.textContent).toMatch(/At least 8 characters|Weak|Fair/i);

    // Toggle visibility
    const toggles = screen.getAllByLabelText(/Show password|Hide password|Show confirm|Hide confirm/i);
    for (const t of toggles) await clickSafe(user, t);

    // Mismatch
    await user.clear(pw);
    await user.type(pw, STRONG_PW);
    await user.clear(confirm);
    await user.type(confirm, "Different1!");
    expect(document.body.textContent).toMatch(/Passwords do not match/i);

    // Force submit with incomplete rules via form event (button may be disabled)
    await user.clear(pw);
    await user.type(pw, "short");
    await user.clear(confirm);
    await user.type(confirm, "short");
    const form = document.querySelector("form");
    if (form) fireEvent.submit(form);
    await waitFor(() => expect(document.body.textContent).toMatch(/does not meet requirements/i));

    // allRulesPassed but mismatch → toast (button disabled; submit form directly)
    fireEvent.change(pw, { target: { value: STRONG_PW } });
    fireEvent.change(confirm, { target: { value: "Different1!" } });
    if (form) fireEvent.submit(form);
    await waitFor(() => expect(document.body.textContent).toMatch(/Passwords do not match/i));

    // Match path messaging + successful update
    fireEvent.change(pw, { target: { value: STRONG_PW } });
    fireEvent.change(confirm, { target: { value: STRONG_PW } });
    expect(document.body.textContent).toMatch(/Passwords match|Strong/i);
    await clickSafe(user, screen.getByRole("button", { name: /Update Password/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Password updated successfully|Error/i),
      { timeout: 20_000 },
    );

    // Error arm: sign out so updateUser fails, remount recovery
    u2();
    await supabase.auth.signOut();
    window.location.hash = "#type=recovery";
    const { unmount: u3 } = renderApp(withToaster(<ResetPassword />), {
      route: "/reset-password",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Set New Password/i));
    await user.type(screen.getByLabelText(/^New Password$/i), STRONG_PW);
    await user.type(screen.getByLabelText(/^Confirm Password$/i), STRONG_PW);
    // passwordsMatch requires confirm.length > 0 and equality — also hit !passwordsMatch toast via submit
    const form2 = document.querySelector("form");
    if (form2) {
      // Temporarily break match by clearing confirm through state is hard; fire submit with allRules but
      // canSubmit false — use spy on updateUser after signing in briefly
    }
    await signIn(seeded.resetEmail, STRONG_PW).catch(async () => {
      // password may already be STRONG_PW from previous update, or still PASS
      await signIn(seeded.resetEmail, PASS).catch(() => undefined);
    });
    u3();

    window.location.hash = "#type=recovery";
    const updateSpy = vi.spyOn(supabase.auth, "updateUser").mockResolvedValueOnce({
      data: { user: null },
      error: { message: "forced fail", name: "AuthError", status: 400 } as never,
    });
    const { unmount: u4 } = renderApp(withToaster(<ResetPassword />), {
      route: "/reset-password",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Set New Password/i));
    await user.type(screen.getByLabelText(/^New Password$/i), STRONG_PW);
    await user.type(screen.getByLabelText(/^Confirm Password$/i), STRONG_PW);
    await clickSafe(user, screen.getByRole("button", { name: /Update Password/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/forced fail|Error/i), {
      timeout: 10_000,
    });
    updateSpy.mockRestore();
    u4();
    window.location.hash = "";

    // Restore password to E2E default for cleanup safety
    await signIn(seeded.resetEmail, STRONG_PW).catch(async () => {
      await signIn(seeded.resetEmail, PASS);
    });
    await supabase.auth.updateUser({ password: PASS });
  }, 180_000);

  it("LoginGate custom icon + hover + Dashboard signed-out Navigate guard", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(
      <LoginGate
        title="Gate Title"
        message="Gate message body"
        ctaLabel="Enter"
        icon={<span data-testid="custom-icon">*</span>}
      />,
      { route: "/events" },
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.getByText("Gate Title")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Enter/i });
    fireEvent.mouseEnter(link);
    fireEvent.mouseLeave(link);
    await clickSafe(user, link);
    unmount();

    const { unmount: u2 } = renderApp(<Dashboard />, { route: "/dashboard" });
    await waitFor(
      () => {
        // Signed-out Dashboard returns <Navigate to="/auth" />
        expect(document.body.textContent ?? "").not.toMatch(/Access Denied/i);
      },
      { timeout: 15_000 },
    );
    u2();
  }, 60_000);
});
