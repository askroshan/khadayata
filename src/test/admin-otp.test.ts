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
