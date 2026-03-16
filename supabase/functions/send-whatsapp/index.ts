import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!whatsappToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "WhatsApp API not configured. Please add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
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
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { template_id, recipient_phone, recipient_member_id, parameters } = await req.json();

    if (!template_id || !recipient_phone) {
      return new Response(JSON.stringify({ error: "template_id and recipient_phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get template
    const { data: template, error: tplError } = await adminClient
      .from("whatsapp_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (tplError || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Meta API payload
    const components: Record<string, unknown>[] = [];
    const params = parameters ?? {};

    if (template.header_text && Object.keys(params).length > 0) {
      components.push({
        type: "header",
        parameters: Object.values(params).slice(0, 1).map((v) => ({ type: "text", text: v })),
      });
    }

    if (Object.keys(params).length > 0) {
      components.push({
        type: "body",
        parameters: Object.values(params).map((v) => ({ type: "text", text: v })),
      });
    }

    const metaPayload = {
      messaging_product: "whatsapp",
      to: recipient_phone.replace(/[^0-9]/g, ""),
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    // Send via Meta Cloud API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaResult = await metaResponse.json();

    // Log the message
    const metaMessageId = metaResult.messages?.[0]?.id ?? null;
    await adminClient.from("whatsapp_messages").insert({
      template_id,
      recipient_phone,
      recipient_member_id: recipient_member_id || null,
      parameters: params,
      meta_message_id: metaMessageId,
      status: metaResponse.ok ? "sent" : "failed",
      sent_at: metaResponse.ok ? new Date().toISOString() : null,
      error: metaResponse.ok ? null : JSON.stringify(metaResult.error ?? metaResult),
    });

    if (!metaResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Meta API error", details: metaResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: metaMessageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
