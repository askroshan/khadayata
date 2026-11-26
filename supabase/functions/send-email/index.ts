import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildEmailHtml, type EmailTemplate } from "./templates.ts";
import { sendTransactionalEmail } from "./provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_RECIPIENTS_FOR_USER_CALLERS = 1;
const FROM_NAME = "KhadayataOnline";
const FROM_EMAIL = "noreply@khadayataonline.com";
const REPLY_TO = "support@khadayataonline.com";

/** True when DISABLE_OUTBOUND_EMAIL is 1/true/yes/on. */
function outboundEmailDisabled(): boolean {
  const raw = (Deno.env.get("DISABLE_OUTBOUND_EMAIL") ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/**
 * EMAIL_ALLOWLIST: comma-separated exact emails, @domains, or substrings (e.g. cov).
 * When outbound is disabled OR an allowlist is set, every recipient must match.
 */
function emailAllowlist(): string[] {
  return (Deno.env.get("EMAIL_ALLOWLIST") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function recipientAllowed(email: string, allow: string[]): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  if (allow.length === 0) return !outboundEmailDisabled();
  return allow.some((rule) => {
    if (rule.startsWith("@")) return e.endsWith(rule) || e.endsWith(rule.slice(1));
    if (rule.includes("@")) return e === rule;
    return e.includes(rule);
  });
}

function assertRecipientsAllowed(recipients: string[]): Response | null {
  const disabled = outboundEmailDisabled();
  const allow = emailAllowlist();
  // Hard stop: disabled with no allowlist → block all. Disabled/allowlist set → require match.
  if (!disabled && allow.length === 0) return null;
  const blocked = recipients.filter((r) => !recipientAllowed(r, allow));
  if (blocked.length === 0) return null;
  const errMsg = disabled
    ? "Outbound email disabled (DISABLE_OUTBOUND_EMAIL). Recipient not on EMAIL_ALLOWLIST."
    : "Recipient not on EMAIL_ALLOWLIST.";
  console.error("[send-email] blocked outbound", {
    disabled,
    blocked_count: blocked.length,
    sample: blocked.slice(0, 3),
  });
  return new Response(
    JSON.stringify({ error: errMsg, blocked_count: blocked.length }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const acumbamailAuthToken = Deno.env.get("ACUMBAMAIL_AUTH_TOKEN") ?? "";
    const emailitKey = Deno.env.get("EMAILIT_API_KEY") ?? "";
    if (!acumbamailAuthToken && !emailitKey) {
      const errMsg = "Email not configured. Add ACUMBAMAIL_AUTH_TOKEN or EMAILIT_API_KEY secret.";
      console.error(errMsg);
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authorization: the caller is either another edge function presenting the
    // service-role key (trusted, internal), or a signed-in user. Anything else
    // is rejected. verify_jwt alone only proves *a* JWT was supplied.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isInternalCaller = serviceRoleKey.length > 0 && bearer === serviceRoleKey;

    if (!isInternalCaller) {
      if (!bearer) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${bearer}`, Apikey: serviceRoleKey },
      });
      if (!userRes.ok) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const body = await req.json();
    const { template, to, vars = {}, override_subject, override_html, name: topLevelName } = body as {
      template: EmailTemplate;
      to: string | string[];
      vars?: Record<string, string>;
      override_subject?: string;
      override_html?: string;
      name?: string;
    };
    console.log("send-email request", { template, to, vars_keys: Object.keys(vars) });

    if (topLevelName && !vars.name) {
      vars.name = topLevelName;
    }

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: "to and template are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const recipients = Array.isArray(to) ? to : [to];

    const allowResp = assertRecipientsAllowed(recipients);
    if (allowResp) return allowResp;

    // Non-internal callers may not fan out, and may not supply raw subject/HTML:
    // that would bypass the escaping model enforced by templates.ts.
    if (!isInternalCaller && recipients.length > MAX_RECIPIENTS_FOR_USER_CALLERS) {
      return new Response(
        JSON.stringify({ error: "Only one recipient is allowed per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { subject, html } = buildEmailHtml(template, vars);

    console.log("Sending transactional email for template:", template, {
      primary: acumbamailAuthToken ? "acumbamail" : "emailit",
      fallbackAvailable: Boolean(acumbamailAuthToken && emailitKey),
    });

    const minScoreEnv = Number(Deno.env.get("EMAIL_MIN_CONFIDENCE_SCORE") ?? "80");
    const minConfidenceScore = Number.isFinite(minScoreEnv) ? minScoreEnv : 80;
    const verificationMode = Deno.env.get("EMAIL_VERIFICATION_MODE") === "full" ? "full" : "fast";

    const delivery = await sendTransactionalEmail(
      {
        fromName: FROM_NAME,
        fromEmail: Deno.env.get("EMAIL_FROM") ?? FROM_EMAIL,
        replyTo: REPLY_TO,
        to: recipients,
        subject: (isInternalCaller ? override_subject : undefined) ?? subject,
        html: (isInternalCaller ? override_html : undefined) ?? html,
        category: template,
      },
      {
        acumbamailAuthToken,
        emailitApiKey: emailitKey,
        timeoutMs: 30000,
        requireVerification: true,
        minConfidenceScore,
        verificationMode,
      },
    );

    if (!delivery.ok) {
      console.error("Email delivery failed", {
        provider: delivery.provider,
        fallbackUsed: delivery.fallbackUsed,
        status: delivery.status,
        details: delivery.details,
        rejectedRecipients: delivery.rejectedRecipients,
      });
      return new Response(
        JSON.stringify({
          error: delivery.error ?? "Email delivery failed",
          provider: delivery.provider,
          fallback_used: delivery.fallbackUsed,
          details: delivery.details,
          rejected_recipients: delivery.rejectedRecipients,
        }),
        { status: delivery.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Email sent successfully via", delivery.provider, {
      fallback_used: delivery.fallbackUsed,
      rejected_count: delivery.rejectedRecipients?.length ?? 0,
    });
    return new Response(
      JSON.stringify({
        success: true,
        provider: delivery.provider,
        fallback_used: delivery.fallbackUsed,
        rejected_recipients: delivery.rejectedRecipients,
        result: delivery.result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-email exception:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
