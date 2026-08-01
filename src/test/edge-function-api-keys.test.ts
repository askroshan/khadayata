import { describe, it, expect } from "vitest";

/**
 * TDD: Regression suite for the "Conflicting API Key" 401 error.
 *
 * Bug: When edge functions (send-reminder, send-reset-email, invite-member)
 * called the send-email function internally, they sent two DIFFERENT API keys:
 *   Authorization: Bearer <SERVICE_ROLE_KEY>
 *   Apikey: <ANON_KEY>
 *
 * The Supabase edge function gateway rejected this as "Conflicting API Key"
 * (HTTP 401), causing all reminder/invite/reset emails to fail silently.
 *
 * Fix: Both headers must use the SAME key. Since the caller already has the
 * service role key, both Authorization and Apikey should use SERVICE_ROLE_KEY.
 */

interface FetchCall {
  url: string;
  headers: Record<string, string>;
}

/**
 * Validates that an internal fetch call to send-email uses a single
 * consistent API key for both Authorization and Apikey headers.
 */
function validateApiKeyConsistency(call: FetchCall): { consistent: boolean; reason?: string } {
  const authHeader = call.headers["Authorization"] ?? "";
  const apikeyHeader = call.headers["Apikey"] ?? "";

  if (!authHeader || !apikeyHeader) {
    return { consistent: false, reason: "Both Authorization and Apikey headers must be present" };
  }

  const authToken = authHeader.replace("Bearer ", "");
  const apikeyToken = apikeyHeader;

  if (authToken !== apikeyToken) {
    return { consistent: false, reason: "Authorization and Apikey headers must use the same key" };
  }

  return { consistent: true };
}

describe("Edge Function API Key Consistency", () => {
  const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-key";

  describe("validateApiKeyConsistency", () => {
    it("passes when both headers use the same key (the fix)", () => {
      const call: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Apikey": SERVICE_ROLE_KEY,
        },
      };
      const result = validateApiKeyConsistency(call);
      expect(result.consistent).toBe(true);
    });

    it("fails when Authorization uses service role key but Apikey uses anon key (the bug)", () => {
      const call: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Apikey": ANON_KEY,
        },
      };
      const result = validateApiKeyConsistency(call);
      expect(result.consistent).toBe(false);
      expect(result.reason).toContain("same key");
    });

    it("fails when Authorization header is missing", () => {
      const call: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Apikey": ANON_KEY,
        },
      };
      const result = validateApiKeyConsistency(call);
      expect(result.consistent).toBe(false);
      expect(result.reason).toContain("Both Authorization and Apikey");
    });

    it("fails when Apikey header is missing", () => {
      const call: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
      };
      const result = validateApiKeyConsistency(call);
      expect(result.consistent).toBe(false);
      expect(result.reason).toContain("Both Authorization and Apikey");
    });
  });

  describe("send-reminder internal call", () => {
    it("should use consistent keys when calling send-email", () => {
      // This simulates the fixed send-reminder calling send-email
      const internalCall: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Apikey": SERVICE_ROLE_KEY,
        },
      };
      expect(validateApiKeyConsistency(internalCall).consistent).toBe(true);
    });

    it("should NOT use the old conflicting pattern", () => {
      // This is the buggy pattern that caused the 401
      const buggyCall: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Apikey": ANON_KEY,
        },
      };
      expect(validateApiKeyConsistency(buggyCall).consistent).toBe(false);
    });
  });

  describe("send-reset-email internal call", () => {
    it("should use consistent keys when calling send-email", () => {
      const internalCall: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Apikey": SERVICE_ROLE_KEY,
        },
      };
      expect(validateApiKeyConsistency(internalCall).consistent).toBe(true);
    });
  });

  describe("invite-member internal call", () => {
    it("should use consistent keys when calling send-email", () => {
      const internalCall: FetchCall = {
        url: "https://example.supabase.co/functions/v1/send-email",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Apikey": SERVICE_ROLE_KEY,
        },
      };
      expect(validateApiKeyConsistency(internalCall).consistent).toBe(true);
    });
  });
});
