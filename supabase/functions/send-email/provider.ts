// Transactional email delivery with combined pre-send bounce-risk verification
// (local disposable-domain filter + EmailIT score + Acumbamail bounce history),
// Acumbamail (primary), and EmailIT (fallback).
// Kept Deno-free so Vitest can unit-test it directly.

export const ACUMBAMAIL_SEND_ONE_API = "https://acumbamail.com/api/1/sendOne/";
export const ACUMBAMAIL_SEARCH_SUBSCRIBER_API = "https://acumbamail.com/api/1/searchSubscriber/";
export const EMAILIT_API = "https://api.emailit.com/v2/emails";
export const EMAILIT_VERIFY_API = "https://api.emailit.com/v2/email-verifications";
export const DEFAULT_MIN_CONFIDENCE_SCORE = 80;

// Common temporary / disposable email domains blocked immediately before
// spending external verification credits or allowing account creation.
export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "10minutemail.com",
  "10minutemail.net",
  "burnermail.io",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "harakirimail.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export interface EmailMessage {
  fromName?: string;
  fromEmail: string;
  replyTo?: string;
  to: string[];
  subject: string;
  html: string;
  category?: string;
}

export interface EmailProviderOptions {
  acumbamailAuthToken?: string;
  emailitApiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Require high-confidence bounce-risk verification before sending (default: true). */
  requireVerification?: boolean;
  /** Minimum combined score (0-100) required to send (default: 80). */
  minConfidenceScore?: number;
  /** EmailIT verification mode: "fast" (default) or "full". */
  verificationMode?: "fast" | "full";
}

export interface EmailVerificationResult {
  email: string;
  allowed: boolean;
  score: number;
  emailitScore?: number;
  acumbamailAdjustment?: number;
  acumbamailStatus?: "clean" | "hard_bounce" | "soft_bounce" | "complaint" | "unsubscribed" | "unknown";
  risk: string;
  result: string;
  reason: string;
  isDisposable?: boolean;
  provider: "syntax" | "disposable_list" | "combined";
}

export interface EmailDeliveryResult {
  ok: boolean;
  provider?: "acumbamail" | "emailit";
  fallbackUsed: boolean;
  status: number;
  result?: unknown;
  error?: string;
  details?: unknown;
  verifications?: EmailVerificationResult[];
  rejectedRecipients?: EmailVerificationResult[];
}

const BASIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isDisposableEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Also catch subdomains of known disposable providers (e.g. sub.mailinator.com)
  for (const d of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${d}`)) return true;
  }
  return false;
}

function extractBareEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function formatFromHeader(fromName: string | undefined, fromEmail: string): string {
  if (fromEmail.includes("<") && fromEmail.includes(">")) return fromEmail;
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function isAcumbamailErrorPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  if (typeof record.status === "string" && record.status.toLowerCase() === "error") return true;
  if (typeof record.error === "string" && record.error.length > 0) return true;
  return false;
}

/**
 * Checks Acumbamail's subscriber history for known hard bounces, spam complaints,
 * soft bounces, or unsubscribes. Acumbamail does not expose a standalone SMTP
 * verifier, so this provides historical reputation to combine with EmailIT's score.
 */
async function checkAcumbamailReputation(
  email: string,
  authToken: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ status: NonNullable<EmailVerificationResult["acumbamailStatus"]>; adjustment: number }> {
  try {
    const params = new URLSearchParams();
    params.set("auth_token", authToken);
    params.set("response_type", "json");
    params.set("subscriber", email);

    const res = await fetchWithTimeout(
      fetchImpl,
      ACUMBAMAIL_SEARCH_SUBSCRIBER_API,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
      timeoutMs,
    );

    if (!res.ok) return { status: "unknown", adjustment: 0 };
    const data = await parseResponseBody(res);
    const serialized = JSON.stringify(data).toLowerCase();

    if (/hard[_\s-]?bounce|"bounced"|status["']?\s*:\s*["']?hard/.test(serialized)) {
      return { status: "hard_bounce", adjustment: -100 };
    }
    if (/spam|complaint|abuse/.test(serialized)) {
      return { status: "complaint", adjustment: -100 };
    }
    if (/soft[_\s-]?bounce/.test(serialized)) {
      return { status: "soft_bounce", adjustment: -30 };
    }
    if (/unsubscribed/.test(serialized)) {
      return { status: "unsubscribed", adjustment: -30 };
    }
    if (Array.isArray(data) && data.length > 0) {
      return { status: "clean", adjustment: 5 };
    }
    return { status: "unknown", adjustment: 0 };
  } catch {
    return { status: "unknown", adjustment: 0 };
  }
}

/**
 * Computes a combined deliverability confidence score (0-100) from:
 * 1. Local syntax + disposable-domain filter (instant, 0 credits)
 * 2. EmailIT `/v2/email-verifications` real-time score, risk, and disposable check
 * 3. Acumbamail `searchSubscriber` bounce/complaint reputation adjustment
 *
 * Fails closed unless high deliverability confidence is confirmed:
 * - valid syntax & not a disposable domain
 * - EmailIT `result === "safe"`, `risk === "low"`, `is_disposable !== true`
 * - Acumbamail not hard-bounced or spam-complained
 * - combined score >= `minConfidenceScore` (default 80)
 */
export async function verifyEmailDeliverability(
  email: string,
  options: Pick<
    EmailProviderOptions,
    "acumbamailAuthToken" | "emailitApiKey" | "fetchImpl" | "timeoutMs" | "minConfidenceScore" | "verificationMode"
  >,
): Promise<EmailVerificationResult> {
  const normalized = email.trim().toLowerCase();
  const minScore = options.minConfidenceScore ?? DEFAULT_MIN_CONFIDENCE_SCORE;

  if (!BASIC_EMAIL_RE.test(normalized)) {
    return {
      email: normalized,
      allowed: false,
      score: 0,
      risk: "high",
      result: "invalid",
      reason: "Invalid email syntax",
      provider: "syntax",
    };
  }

  if (isDisposableEmailDomain(normalized)) {
    return {
      email: normalized,
      allowed: false,
      score: 0,
      risk: "high",
      result: "disposable",
      reason: "Temporary or disposable email addresses are not allowed",
      isDisposable: true,
      provider: "disposable_list",
    };
  }

  const emailitKey = (options.emailitApiKey ?? "").trim();
  const acumbamailToken = (options.acumbamailAuthToken ?? "").trim();
  if (!emailitKey) {
    return {
      email: normalized,
      allowed: false,
      score: 0,
      risk: "high",
      result: "unverified",
      reason: "Email verification unavailable (missing EMAILIT_API_KEY)",
      provider: "combined",
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15000;
  const mode = options.verificationMode ?? "fast";

  try {
    const [emailitRes, acumbaRep] = await Promise.all([
      fetchWithTimeout(
        fetchImpl,
        EMAILIT_VERIFY_API,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${emailitKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: normalized, mode }),
        },
        timeoutMs,
      ),
      acumbamailToken
        ? checkAcumbamailReputation(normalized, acumbamailToken, fetchImpl, Math.min(timeoutMs, 8000))
        : Promise.resolve({ status: "unknown" as const, adjustment: 0 }),
    ]);

    const data = (await parseResponseBody(emailitRes)) as Record<string, unknown>;
    if (!emailitRes.ok) {
      return {
        email: normalized,
        allowed: false,
        score: 0,
        risk: "high",
        result: "verification_error",
        reason: `EmailIT verification failed (HTTP ${emailitRes.status})`,
        acumbamailStatus: acumbaRep.status,
        acumbamailAdjustment: acumbaRep.adjustment,
        provider: "combined",
      };
    }

    const emailitScore = typeof data.score === "number" ? data.score : 0;
    const risk = typeof data.risk === "string" ? data.risk.toLowerCase() : "high";
    const result = typeof data.result === "string" ? data.result.toLowerCase() : "unknown";
    const isDisposable = data.is_disposable === true;
    const reason = typeof data.reason === "string" ? data.reason : result;

    const hardBlockedByAcumba =
      acumbaRep.status === "hard_bounce" || acumbaRep.status === "complaint";

    const combinedScore = hardBlockedByAcumba || isDisposable
      ? 0
      : Math.max(0, Math.min(100, emailitScore + acumbaRep.adjustment));

    const allowed =
      result === "safe" &&
      risk === "low" &&
      !isDisposable &&
      !hardBlockedByAcumba &&
      combinedScore >= minScore;

    return {
      email: normalized,
      allowed,
      score: combinedScore,
      emailitScore,
      acumbamailStatus: acumbaRep.status,
      acumbamailAdjustment: acumbaRep.adjustment,
      risk: hardBlockedByAcumba ? "high" : risk,
      result: hardBlockedByAcumba ? acumbaRep.status : result,
      reason: allowed
        ? reason
        : isDisposable
          ? "Temporary or disposable email addresses are not allowed"
          : hardBlockedByAcumba
            ? `Blocked by Acumbamail reputation (${acumbaRep.status})`
            : `Rejected by combined bounce-risk gate (result=${result}, risk=${risk}, combined_score=${combinedScore}, emailit_score=${emailitScore}, acumba=${acumbaRep.status}, min=${minScore})`,
      isDisposable,
      provider: "combined",
    };
  } catch (err) {
    return {
      email: normalized,
      allowed: false,
      score: 0,
      risk: "high",
      result: "verification_error",
      reason: `Email verification error: ${(err as Error).message}`,
      provider: "combined",
    };
  }
}

async function sendViaAcumbamail(
  message: EmailMessage,
  authToken: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const bareFrom = extractBareEmail(message.fromEmail);
  const results: unknown[] = [];

  for (const recipient of message.to) {
    const params = new URLSearchParams();
    params.set("auth_token", authToken);
    params.set("response_type", "json");
    params.set("from_email", bareFrom);
    params.set("to_email", recipient);
    params.set("subject", message.subject);
    params.set("body", message.html);
    if (message.category) {
      params.set("category", message.category);
    }

    const res = await fetchWithTimeout(
      fetchImpl,
      ACUMBAMAIL_SEND_ONE_API,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
      timeoutMs,
    );

    const data = await parseResponseBody(res);
    if (!res.ok || isAcumbamailErrorPayload(data)) {
      return { ok: false, status: res.ok ? 502 : res.status, data };
    }
    results.push({ to: recipient, response: data });
  }

  return {
    ok: true,
    status: 200,
    data: results.length === 1 ? results[0] : { deliveries: results },
  };
}

async function sendViaEmailit(
  message: EmailMessage,
  apiKey: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const payload: Record<string, unknown> = {
    from: formatFromHeader(message.fromName, message.fromEmail),
    to: message.to,
    subject: message.subject,
    html: message.html,
  };
  if (message.replyTo) {
    payload.reply_to = message.replyTo;
  }

  const res = await fetchWithTimeout(
    fetchImpl,
    EMAILIT_API,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    timeoutMs,
  );

  const data = await parseResponseBody(res);
  return { ok: res.ok, status: res.status, data };
}

export async function sendTransactionalEmail(
  message: EmailMessage,
  options: EmailProviderOptions,
): Promise<EmailDeliveryResult> {
  const acumbamailToken = (options.acumbamailAuthToken ?? "").trim();
  const emailitKey = (options.emailitApiKey ?? "").trim();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30000;
  const requireVerification = options.requireVerification ?? true;

  if (!acumbamailToken && !emailitKey) {
    return {
      ok: false,
      fallbackUsed: false,
      status: 500,
      error: "Email not configured. Add ACUMBAMAIL_AUTH_TOKEN or EMAILIT_API_KEY secret.",
    };
  }

  let verifiedRecipients = message.to;
  let verifications: EmailVerificationResult[] | undefined;
  let rejectedRecipients: EmailVerificationResult[] | undefined;

  if (requireVerification) {
    verifications = await Promise.all(
      message.to.map((recipient) =>
        verifyEmailDeliverability(recipient, {
          acumbamailAuthToken: acumbamailToken,
          emailitApiKey: emailitKey,
          fetchImpl,
          timeoutMs: Math.min(timeoutMs, 15000),
          minConfidenceScore: options.minConfidenceScore,
          verificationMode: options.verificationMode,
        }),
      ),
    );

    rejectedRecipients = verifications.filter((v) => !v.allowed);
    verifiedRecipients = verifications.filter((v) => v.allowed).map((v) => v.email);

    if (verifiedRecipients.length === 0) {
      return {
        ok: false,
        fallbackUsed: false,
        status: 422,
        error: "Email blocked: recipient failed high-confidence bounce-risk verification",
        verifications,
        rejectedRecipients,
      };
    }
  }

  const safeMessage: EmailMessage = { ...message, to: verifiedRecipients };
  let acumbaFailure: unknown;

  if (acumbamailToken) {
    try {
      const acumbaRes = await sendViaAcumbamail(safeMessage, acumbamailToken, fetchImpl, timeoutMs);
      if (acumbaRes.ok) {
        return {
          ok: true,
          provider: "acumbamail",
          fallbackUsed: false,
          status: 200,
          result: acumbaRes.data,
          verifications,
          rejectedRecipients: rejectedRecipients?.length ? rejectedRecipients : undefined,
        };
      }
      acumbaFailure = { status: acumbaRes.status, details: acumbaRes.data };
    } catch (err) {
      acumbaFailure = { error: (err as Error).message };
    }

    if (!emailitKey) {
      return {
        ok: false,
        provider: "acumbamail",
        fallbackUsed: false,
        status: 502,
        error: "Acumbamail error",
        details: acumbaFailure,
        verifications,
        rejectedRecipients: rejectedRecipients?.length ? rejectedRecipients : undefined,
      };
    }
  }

  const fallbackUsed = Boolean(acumbamailToken);
  try {
    const emailitRes = await sendViaEmailit(safeMessage, emailitKey, fetchImpl, timeoutMs);
    if (emailitRes.ok) {
      return {
        ok: true,
        provider: "emailit",
        fallbackUsed,
        status: 200,
        result: emailitRes.data,
        verifications,
        rejectedRecipients: rejectedRecipients?.length ? rejectedRecipients : undefined,
      };
    }
    return {
      ok: false,
      provider: "emailit",
      fallbackUsed,
      status: 502,
      error: fallbackUsed ? "Acumbamail and EmailIT both failed" : "Emailit error",
      details: fallbackUsed
        ? { acumbamail: acumbaFailure, emailit: { status: emailitRes.status, details: emailitRes.data } }
        : emailitRes.data,
      verifications,
      rejectedRecipients: rejectedRecipients?.length ? rejectedRecipients : undefined,
    };
  } catch (err) {
    const emailitFailure = { error: (err as Error).message };
    return {
      ok: false,
      provider: "emailit",
      fallbackUsed,
      status: 502,
      error: fallbackUsed ? "Acumbamail and EmailIT both failed" : "Emailit error",
      details: fallbackUsed ? { acumbamail: acumbaFailure, emailit: emailitFailure } : emailitFailure,
      verifications,
      rejectedRecipients: rejectedRecipients?.length ? rejectedRecipients : undefined,
    };
  }
}
