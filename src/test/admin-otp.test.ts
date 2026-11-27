import { describe, it, expect, beforeEach } from "vitest";
import {
  OTP_LENGTH,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  normalizeOtpCode,
  isValidOtpCode,
  isOtpExpired,
  hasExceededOtpAttempts,
  getAdminOtpVerifiedKey,
  isAdminOtpVerifiedInSession,
  markAdminOtpVerifiedInSession,
  clearAdminOtpVerifiedInSession,
} from "@/lib/admin-otp";
import { buildEmailHtml } from "../../supabase/functions/send-email/templates";

describe("admin-otp helpers (100% coverage)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("exports expected security constants", () => {
    expect(OTP_LENGTH).toBe(6);
    expect(OTP_TTL_MS).toBe(10 * 60 * 1000);
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });

  it("normalizes OTP input by stripping non-digits and capping at 6 chars", () => {
    expect(normalizeOtpCode(" 12-34 56 ")).toBe("123456");
    expect(normalizeOtpCode("abc123456789")).toBe("123456");
    expect(normalizeOtpCode("")).toBe("");
  });

  it("validates 6-digit numeric OTP codes", () => {
    expect(isValidOtpCode("012345")).toBe(true);
    expect(isValidOtpCode("12345")).toBe(false);
    expect(isValidOtpCode("1234567")).toBe(false);
    expect(isValidOtpCode("12345a")).toBe(false);
    expect(isValidOtpCode("")).toBe(false);
  });

  it("detects expired and invalid expiry timestamps", () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    expect(isOtpExpired("2026-11-25T12:05:00Z", now)).toBe(false);
    expect(isOtpExpired("2026-11-25T12:00:00Z", now)).toBe(true);
    expect(isOtpExpired("2026-11-25T11:59:59Z", now)).toBe(true);
    expect(isOtpExpired("not-a-date", now)).toBe(true);
    // Default nowMs branch
    expect(isOtpExpired("2099-01-01T00:00:00Z")).toBe(false);
  });

  it("enforces maximum OTP verification attempts", () => {
    expect(hasExceededOtpAttempts(0)).toBe(false);
    expect(hasExceededOtpAttempts(4)).toBe(false);
    expect(hasExceededOtpAttempts(5)).toBe(true);
    expect(hasExceededOtpAttempts(6, 3)).toBe(true);
    expect(hasExceededOtpAttempts(2, 3)).toBe(false);
  });

  it("tracks per-user OTP verification state in sessionStorage", () => {
    const uid = "user-123";
    expect(getAdminOtpVerifiedKey(uid)).toBe("khadayata_admin_otp_verified:user-123");
    expect(isAdminOtpVerifiedInSession(uid)).toBe(false);

    markAdminOtpVerifiedInSession(uid);
    expect(isAdminOtpVerifiedInSession(uid)).toBe(true);

    clearAdminOtpVerifiedInSession(uid);
    expect(isAdminOtpVerifiedInSession(uid)).toBe(false);
  });

  it("handles missing or throwing storage gracefully", () => {
    const brokenStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    } as unknown as Storage;

    expect(isAdminOtpVerifiedInSession("u1", brokenStorage)).toBe(false);
    expect(() => markAdminOtpVerifiedInSession("u1", brokenStorage)).not.toThrow();
    expect(() => clearAdminOtpVerifiedInSession("u1", brokenStorage)).not.toThrow();
  });

  it("renders admin_login_otp email template with greeting and escaped OTP", () => {
    const { subject, html } = buildEmailHtml("admin_login_otp", {
      name: "Roshan",
      otp_code: "482910",
      expires_minutes: "10",
    });
    expect(subject).toContain("Verification Code");
    expect(html).toContain("Hi Roshan");
    expect(html).toContain("482910");
    expect(html).toContain("10 minutes");
  });
});

describe("AuthContext admin OTP gating (regression)", () => {
  it("does not expose signed-in user before admin OTP is verified", async () => {
    const { render, act } = await import("@testing-library/react");
    const React = await import("react");
    const { vi } = await import("vitest");

    const adminUser = { id: "admin-1", email: "admin@khadayataonline.com" };
    const adminSession = { user: adminUser, access_token: "tok" };
    let authListener: ((event: string, session: unknown) => void) | null = null;

    const supabaseMod = await import("@/integrations/supabase/client");
    const onAuthSpy = vi.spyOn(supabaseMod.supabase.auth, "onAuthStateChange").mockImplementation((cb) => {
      authListener = cb as (event: string, session: unknown) => void;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
    const getSessionSpy = vi.spyOn(supabaseMod.supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    const signInSpy = vi.spyOn(supabaseMod.supabase.auth, "signInWithPassword").mockImplementation(async () => {
      // Simulate real Supabase firing onAuthStateChange synchronously during signInWithPassword
      authListener?.("SIGNED_IN", adminSession);
      return { data: { user: adminUser, session: adminSession }, error: null } as never;
    });
    const invokeMock = vi.fn().mockImplementation(async (_fn, opts) => {
      const action = (opts?.body as { action?: string } | undefined)?.action;
      if (action === "send") {
        return { data: { required: true, sent: true }, error: null };
      }
      if (action === "verify") {
        return { data: { required: true, verified: true }, error: null };
      }
      return { data: null, error: null };
    });
    const invokeSpy = vi.spyOn(supabaseMod.supabase, "functions", "get").mockReturnValue({
      invoke: invokeMock,
    } as never);

    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    let latestAuth: ReturnType<typeof useAuth> | null = null;
    const seenSignedInWithoutOtp: boolean[] = [];

    function Harness() {
      const auth = useAuth();
      latestAuth = auth;
      if (auth.user && !auth.pendingAdminOtp) {
        seenSignedInWithoutOtp.push(true);
      }
      return null;
    }

    await act(async () => {
      render(React.createElement(AuthProvider, null, React.createElement(Harness)));
    });

    await act(async () => {
      const res = await latestAuth!.signIn("admin@khadayataonline.com", "secret123");
      expect(res.otpRequired).toBe(true);
    });

    // Must NEVER have exposed a signed-in user before OTP verification
    expect(seenSignedInWithoutOtp).toEqual([]);
    expect(latestAuth!.pendingAdminOtp).toBe(true);
    expect(latestAuth!.user).toBeNull();

    await act(async () => {
      const res = await latestAuth!.verifyAdminOtp("123456");
      expect(res.error).toBeNull();
    });

    expect(latestAuth!.pendingAdminOtp).toBe(false);
    expect(latestAuth!.user?.id).toBe("admin-1");

    onAuthSpy.mockRestore();
    getSessionSpy.mockRestore();
    signInSpy.mockRestore();
    invokeSpy.mockRestore();
  });
});
