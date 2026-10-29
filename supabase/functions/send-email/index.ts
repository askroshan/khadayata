import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildEmailHtml, type EmailTemplate } from "./templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAILIT_API = "https://api.emailit.com/v2/emails";
const MAX_RECIPIENTS_FOR_USER_CALLERS = 1;
const FROM_NAME = "KhadayataOnline";
const FROM_EMAIL = "noreply@khadayataonline.com";
const REPLY_TO = "support@khadayataonline.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const emailitKey = Deno.env.get("EMAILIT_API_KEY");
    if (!emailitKey) {
      const errMsg = "Email not configured. Add EMAILIT_API_KEY secret.";
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

    // Non-internal callers may not fan out, and may not supply raw subject/HTML:
    // that would bypass the escaping model enforced by templates.ts.
    if (!isInternalCaller && recipients.length > MAX_RECIPIENTS_FOR_USER_CALLERS) {
      return new Response(
        JSON.stringify({ error: "Only one recipient is allowed per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { subject, html } = buildEmailHtml(template, vars);

    const payload = {
      from: FROM_NAME + " <" + FROM_EMAIL + ">",
      to: recipients,
      subject: (isInternalCaller ? override_subject : undefined) ?? subject,
      html: (isInternalCaller ? override_html : undefined) ?? html,
      reply_to: REPLY_TO,
    };

    console.log("Calling Emailit API for template:", template);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const emailRes = await fetch(EMAILIT_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + emailitKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const emailResult = await emailRes.json().catch(() => ({}));
    console.log("Emailit response status:", emailRes.status, "result:", emailResult);

    if (!emailRes.ok) {
      console.error("Emailit API error", { status: emailRes.status, details: emailResult });
      return new Response(
        JSON.stringify({ error: "Emailit error", details: emailResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Email sent successfully:", emailResult.id);
    return new Response(
      JSON.stringify({ success: true, result: emailResult }),
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
