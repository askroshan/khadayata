import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, type } = await req.json() as {
      email: string;
      type?: "recovery" | "signup";
    };
    console.log("send-reset-email request", { email, type });

    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const linkType = type === "signup" ? "signup" : "recovery";
    console.log("Generating link for", normalizedEmail, "type:", linkType);

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: linkType,
      email: normalizedEmail,
    });
    console.log("generateLink result", { hasError: !!linkErr, error: linkErr?.message });

    if (linkErr) {
      const msg = (linkErr.message ?? "").toLowerCase();
      if (msg.includes("not found") || msg.includes("no user")) {
        console.log("User not found for email:", normalizedEmail, "returning success (security)");
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("generateLink error:", linkErr.message);
      return new Response(JSON.stringify({ error: linkErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: "Failed to generate link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = linkData.user?.id;
    let firstName = "Member";
    if (userId) {
      const { data: member } = await adminClient
        .from("members")
        .select("first_name")
        .eq("user_id", userId)
        .maybeSingle();
      firstName = member?.first_name ?? linkData.user?.user_metadata?.first_name ?? "Member";
    }

    const template = linkType === "signup" ? "email_verification" : "password_reset";
    const varKey = linkType === "signup" ? "verification_url" : "reset_url";

    console.log("Calling send-email with template:", template, "for:", normalizedEmail);
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Apikey": ANON_KEY,
      },
      body: JSON.stringify({
        to: normalizedEmail,
        template,
        vars: {
          name: firstName,
          [varKey]: linkData.properties.action_link,
        },
      }),
    });

    console.log("send-email response status:", emailRes.status);
    if (!emailRes.ok) {
      const errBody = await emailRes.text().catch(() => "Unknown error");
      console.error("send-email failed:", { status: emailRes.status, error: errBody });
      return new Response(JSON.stringify({ error: "Email send failed", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully for:", normalizedEmail);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
