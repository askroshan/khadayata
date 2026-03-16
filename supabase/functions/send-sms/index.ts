import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EASIFY_BASE = "https://backend.easify.app/api/v2";
const EASIFY_FROM = "6824329400";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const easifyToken = Deno.env.get("EASIFY_API_TOKEN");

    if (!easifyToken) {
      return new Response(
        JSON.stringify({ error: "SMS not configured. Add EASIFY_API_TOKEN secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "Global Admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Global Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, body, recipient_member_id, country_code } = await req.json();
    if (!to || !body) {
      return new Response(JSON.stringify({ error: "to and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: senderMember } = await adminClient
      .from("members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const cleanNumber = String(to).replace(/^\+/, "").replace(/^1/, "");
    const resolvedCountryCode = country_code ?? "1";

    const easifyPayload = {
      from_number: EASIFY_FROM,
      to_number: cleanNumber,
      country_code: resolvedCountryCode,
      message: body,
      media: "",
      force_send: 0,
    };

    const easifyResponse = await fetch(`${EASIFY_BASE}/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${easifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(easifyPayload),
    });

    const easifyResult = await easifyResponse.json();
    const success = easifyResponse.ok;

    await adminClient.from("sms_messages").insert({
      recipient_phone: to,
      recipient_member_id: recipient_member_id || null,
      body,
      status: success ? "sent" : "failed",
      provider: "easify",
      provider_sid: easifyResult?.id ?? easifyResult?.message_id ?? null,
      error: success ? null : JSON.stringify(easifyResult),
      sent_by: senderMember?.id ?? null,
      sent_at: success ? new Date().toISOString() : null,
    });

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Easify error", details: easifyResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result: easifyResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
