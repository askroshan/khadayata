import { describe, it, expect, vi } from "vitest";
import {
  ACUMBAMAIL_SEARCH_SUBSCRIBER_API,
  ACUMBAMAIL_SEND_ONE_API,
  EMAILIT_API,
  EMAILIT_VERIFY_API,
  isDisposableEmailDomain,
  sendTransactionalEmail,
  verifyEmailDeliverability,
} from "../../supabase/functions/send-email/provider";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SAFE_VERIFY = {
  id: "ev_1",
  result: "safe",
  risk: "low",
  score: 95,
  is_disposable: false,
  reason: "deliverable",
};

describe("isDisposableEmailDomain", () => {
  it("blocks known temporary/disposable domains and subdomains", () => {
    expect(isDisposableEmailDomain("test@mailinator.com")).toBe(true);
    expect(isDisposableEmailDomain("user@sub.yopmail.com")).toBe(true);
    expect(isDisposableEmailDomain("abc@10minutemail.com")).toBe(true);
    expect(isDisposableEmailDomain("member@gmail.com")).toBe(false);
    expect(isDisposableEmailDomain("admin@khadayataonline.com")).toBe(false);
  });
});

describe("verifyEmailDeliverability (combined score & bounce-risk gate)", () => {
  it("rejects malformed email syntax and disposable domains without calling external APIs", async () => {
    const fetchMock = vi.fn();

    const badSyntax = await verifyEmailDeliverability("not-an-email", {
      emailitApiKey: "emailit-key",
      fetchImpl: fetchMock,
    });
    expect(badSyntax.allowed).toBe(false);
    expect(badSyntax.provider).toBe("syntax");

    const disposable = await verifyEmailDeliverability("temp@mailinator.com", {
      emailitApiKey: "emailit-key",
      acumbamailAuthToken: "acumba-token",
      fetchImpl: fetchMock,
    });
    expect(disposable.allowed).toBe(false);
    expect(disposable.isDisposable).toBe(true);
    expect(disposable.provider).toBe("disposable_list");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("combines EmailIT score with Acumbamail clean reputation (+5 boost, capped at 100)", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === EMAILIT_VERIFY_API) return jsonResponse({ ...SAFE_VERIFY, score: 82 });
      if (url === ACUMBAMAIL_SEARCH_SUBSCRIBER_API) {
        return jsonResponse([{ email: "member@example.com", status: "active" }]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const res = await verifyEmailDeliverability("member@example.com", {
      emailitApiKey: "emailit-key",
      acumbamailAuthToken: "acumba-token",
      fetchImpl: fetchMock,
    });

    expect(res.allowed).toBe(true);
    expect(res.emailitScore).toBe(82);
    expect(res.acumbamailStatus).toBe("clean");
    expect(res.acumbamailAdjustment).toBe(5);
    expect(res.score).toBe(87);
  });

  it("blocks when Acumbamail history shows hard bounce even if EmailIT score is high", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === EMAILIT_VERIFY_API) return jsonResponse(SAFE_VERIFY);
      if (url === ACUMBAMAIL_SEARCH_SUBSCRIBER_API) {
        return jsonResponse([{ email: "bounced@example.com", status: "hard_bounce" }]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const res = await verifyEmailDeliverability("bounced@example.com", {
      emailitApiKey: "emailit-key",
      acumbamailAuthToken: "acumba-token",
      fetchImpl: fetchMock,
    });

    expect(res.allowed).toBe(false);
    expect(res.score).toBe(0);
    expect(res.acumbamailStatus).toBe("hard_bounce");
    expect(res.risk).toBe("high");
  });

  it("penalizes Acumbamail soft_bounce (-30) so borderline addresses fail the >=80 gate", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === EMAILIT_VERIFY_API) return jsonResponse({ ...SAFE_VERIFY, score: 90 });
      if (url === ACUMBAMAIL_SEARCH_SUBSCRIBER_API) {
        return jsonResponse([{ email: "soft@example.com", status: "soft_bounce" }]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const res = await verifyEmailDeliverability("soft@example.com", {
      emailitApiKey: "emailit-key",
      acumbamailAuthToken: "acumba-token",
      fetchImpl: fetchMock,
    });

    expect(res.allowed).toBe(false);
    expect(res.score).toBe(60);
    expect(res.acumbamailStatus).toBe("soft_bounce");
  });

  it("rejects low-score, risky, or disposable addresses from EmailIT", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...SAFE_VERIFY, score: 65 }))
      .mockResolvedValueOnce(jsonResponse({ ...SAFE_VERIFY, risk: "medium" }))
      .mockResolvedValueOnce(jsonResponse({ ...SAFE_VERIFY, is_disposable: true }))
      .mockResolvedValueOnce(jsonResponse({ ...SAFE_VERIFY, result: "catch_all" }));

    for (const email of ["low@a.com", "med@a.com", "disp@a.com", "catch@a.com"]) {
      const res = await verifyEmailDeliverability(email, {
        emailitApiKey: "emailit-key",
        fetchImpl: fetchMock,
      });
      expect(res.allowed, `${email} should be rejected`).toBe(false);
    }
  });

  it("fails closed when EMAILIT_API_KEY is missing or verification API errors", async () => {
    const missing = await verifyEmailDeliverability("a@example.com", {});
    expect(missing.allowed).toBe(false);

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ error: "down" }, 503));
    const errRes = await verifyEmailDeliverability("a@example.com", {
      emailitApiKey: "emailit-key",
      fetchImpl: fetchMock,
    });
    expect(errRes.allowed).toBe(false);
  });
});

describe("sendTransactionalEmail (verified Acumbamail primary, EmailIT fallback)", () => {
  const baseMessage = {
    fromName: "KhadayataOnline",
    fromEmail: "noreply@khadayataonline.com",
    replyTo: "support@khadayataonline.com",
    to: ["member@example.com"],
    subject: "Welcome to KhadayataOnline",
    html: "<!DOCTYPE html><html><body><h1>Hi</h1></body></html>",
    category: "welcome",
  };

  it("verifies combined bounce-risk score first, then sends via Acumbamail sendOne", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === EMAILIT_VERIFY_API) return jsonResponse(SAFE_VERIFY);
      if (url === ACUMBAMAIL_SEARCH_SUBSCRIBER_API) return jsonResponse([]);
      if (url === ACUMBAMAIL_SEND_ONE_API) {
        return jsonResponse({ status: "success", result: { sent: true, id: "acumba-1" } });
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const res = await sendTransactionalEmail(baseMessage, {
      acumbamailAuthToken: "acumba-token-123",
      emailitApiKey: "emailit-key-456",
      fetchImpl: fetchMock,
    });

    expect(res.ok).toBe(true);
    expect(res.provider).toBe("acumbamail");
    expect(res.fallbackUsed).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(ACUMBAMAIL_SEND_ONE_API, expect.anything());
  });

  it("blocks sending (422) and never calls Acumbamail when recipient fails bounce-risk check", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === EMAILIT_VERIFY_API) {
        return jsonResponse({ result: "invalid", risk: "high", score: 10, is_disposable: false });
      }
      if (url === ACUMBAMAIL_SEARCH_SUBSCRIBER_API) return jsonResponse([]);
      throw new Error(`Unexpected URL ${url}`);
    });

    const res = await sendTransactionalEmail(baseMessage, {
      acumbamailAuthToken: "acumba-token-123",
      emailitApiKey: "emailit-key-456",
      fetchImpl: fetchMock,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
    expect(res.rejectedRecipients).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalledWith(ACUMBAMAIL_SEND_ONE_API, expect.anything());
  });

  it("falls back to EmailIT when Acumbamail sendOne returns HTTP 500", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === EMAILIT_VERIFY_API) return jsonResponse(SAFE_VERIFY);
      if (url === ACUMBAMAIL_SEARCH_SUBSCRIBER_API) return jsonResponse([]);
      if (url === ACUMBAMAIL_SEND_ONE_API) return jsonResponse({ error: "Acumbamail unavailable" }, 500);
      if (url === EMAILIT_API) return jsonResponse({ id: "emailit-1" }, 200);
      throw new Error(`Unexpected URL ${url}`);
    });

    const res = await sendTransactionalEmail(baseMessage, {
      acumbamailAuthToken: "acumba-token-123",
      emailitApiKey: "emailit-key-456",
      fetchImpl: fetchMock,
    });

    expect(res.ok).toBe(true);
    expect(res.provider).toBe("emailit");
    expect(res.fallbackUsed).toBe(true);
  });

  it("returns 500 when neither Acumbamail nor EmailIT credentials are configured", async () => {
    const fetchMock = vi.fn();

    const res = await sendTransactionalEmail(baseMessage, { fetchImpl: fetchMock });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
