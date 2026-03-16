import { createClient } from "npm:@supabase/supabase-js@2";

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
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to verify identity
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

    // Service client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { member_id } = await req.json();
    if (!member_id) {
      return new Response(JSON.stringify({ error: "member_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if member already has a global_id
    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, global_id, chapter_id, user_id")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow generating for own member or admin
    if (member.user_id !== user.id) {
      // Check if admin
      const { data: isAdmin } = await adminClient.rpc("has_role", {
        _user_id: user.id,
        _role: "Global Admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (member.global_id) {
      return new Response(
        JSON.stringify({ global_id: member.global_id, message: "Already assigned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get chapter's city code info
    const { data: chapter } = await adminClient
      .from("chapters")
      .select("*, countries(iso2), states(code), cities(code)")
      .eq("id", member.chapter_id)
      .single();

    if (!chapter) {
      return new Response(JSON.stringify({ error: "Member has no chapter assigned" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const countryCode = (chapter.countries as { iso2: string } | null)?.iso2 || "XX";
    const stateCode = (chapter.states as { code: string } | null)?.code || "XX";

    // Look up city code from controlled list
    let cityCode = "XXX";
    if (chapter.cities) {
      const rawCityCode = (chapter.cities as { code: string }).code;
      const { data: cityCodeRecord } = await adminClient
        .from("city_codes")
        .select("city_code")
        .eq("country_code", countryCode.toUpperCase())
        .eq("state_code", stateCode.toUpperCase())
        .ilike("city_name", rawCityCode)
        .maybeSingle();

      if (cityCodeRecord) {
        cityCode = cityCodeRecord.city_code;
      } else {
        // Use first 3 chars of city name as fallback
        cityCode = rawCityCode.substring(0, 3).toUpperCase();
      }
    }

    // Generate using the database function (atomic)
    const { data: globalId, error: genError } = await adminClient.rpc("generate_global_id", {
      p_country_code: countryCode.substring(0, 2),
      p_state_code: stateCode.substring(0, 2),
      p_city_code: cityCode.substring(0, 3),
    });

    if (genError) {
      return new Response(JSON.stringify({ error: genError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format for storage: KHD-INGJAHM-25-000001-Z
    const raw = globalId as string;
    const formatted = `${raw.substring(0, 3)}-${raw.substring(3, 10)}-${raw.substring(10, 12)}-${raw.substring(12, 18)}-${raw.substring(18)}`;

    // Update member with the new global_id
    const { error: updateError } = await adminClient
      .from("members")
      .update({ global_id: formatted })
      .eq("id", member_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ global_id: formatted, raw: globalId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
