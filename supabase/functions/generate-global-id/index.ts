import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type CityRow = { code: string; name?: string | null };

/** Resolve a 3-letter city code from city_codes, never inventing XX/XXX placeholders. */
async function resolveCityCode(
  adminClient: ReturnType<typeof createClient>,
  countryCode: string,
  stateCode2: string,
  city: CityRow,
): Promise<string | null> {
  const country = countryCode.toUpperCase();
  const state = stateCode2.toUpperCase();
  const code = (city.code || "").trim();
  const name = (city.name || "").trim();

  // 1. Direct match on city_code (e.g. cities.code = "AHM")
  if (code) {
    const { data } = await adminClient
      .from("city_codes")
      .select("city_code")
      .eq("country_code", country)
      .eq("state_code", state)
      .eq("city_code", code.toUpperCase())
      .maybeSingle();
    if (data?.city_code) return data.city_code;
  }

  // 2. Match city_codes.city_name to cities.name
  if (name) {
    const { data } = await adminClient
      .from("city_codes")
      .select("city_code")
      .eq("country_code", country)
      .eq("state_code", state)
      .ilike("city_name", name)
      .maybeSingle();
    if (data?.city_code) return data.city_code;
  }

  // 3. When cities.code was stored as a name (e.g. "NADIAD")
  if (code && code.length > 3) {
    const { data } = await adminClient
      .from("city_codes")
      .select("city_code")
      .eq("country_code", country)
      .eq("state_code", state)
      .ilike("city_name", code)
      .maybeSingle();
    if (data?.city_code) return data.city_code;
  }

  // 4. Fallback only when cities.code is already a 3-letter code
  if (/^[A-Za-z0-9]{3}$/.test(code)) {
    return code.toUpperCase();
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
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

    // Feature flag: settings.global_id_enabled
    const { data: flagRow } = await adminClient
      .from("settings")
      .select("value")
      .eq("key", "global_id_enabled")
      .maybeSingle();
    const flagVal = flagRow?.value as { enabled?: boolean } | null;
    if (flagVal && flagVal.enabled === false) {
      return new Response(
        JSON.stringify({ error: "Global ID generation is temporarily disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { member_id } = await req.json();
    if (!member_id) {
      return new Response(JSON.stringify({ error: "member_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, global_id, chapter_id, user_id, first_name, last_name")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (member.user_id !== user.id) {
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!member.chapter_id) {
      return new Response(
        JSON.stringify({ error: "You must join a chapter before generating a Global ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: chapter } = await adminClient
      .from("chapters")
      .select("name, countries(iso2), states(code), cities(code, name)")
      .eq("id", member.chapter_id)
      .single();

    if (!chapter) {
      return new Response(JSON.stringify({ error: "Member has no chapter assigned" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const countryCode = (chapter.countries as { iso2: string } | null)?.iso2;
    const stateCodeFull = (chapter.states as { code: string } | null)?.code;
    const city = chapter.cities as CityRow | null;

    if (!countryCode || !stateCodeFull || !city?.code) {
      return new Response(
        JSON.stringify({
          error:
            "CHGEO: This chapter's location data is incomplete, so a Global ID cannot be issued. Please contact a Global Admin to link the chapter's country, state, and city.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // DB function requires exactly 2-char state (see fix_reissued_global_id_format)
    const stateCode = stateCodeFull.substring(0, 2);
    const cityCode = await resolveCityCode(adminClient, countryCode, stateCode, city);
    if (!cityCode) {
      return new Response(
        JSON.stringify({
          error:
            "CHGEO: No city_codes entry matches this chapter's city. Please contact a Global Admin to add the city code.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: globalId, error: genError } = await adminClient.rpc("generate_global_id", {
      p_country_code: countryCode.substring(0, 2),
      p_state_code: stateCode,
      p_city_code: cityCode.substring(0, 3),
    });

    if (genError) {
      return new Response(JSON.stringify({ error: genError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = globalId as string;
    const formatted = `${raw.substring(0, 3)}-${raw.substring(3, 10)}-${raw.substring(10, 12)}-${raw.substring(12, 18)}-${raw.substring(18)}`;

    const { error: updateError } = await adminClient
      .from("members")
      .update({ global_id: formatted })
      .eq("id", member_id)
      .is("global_id", null);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify member (best-effort — ID is already assigned)
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(member.user_id);
      const to = authUser?.user?.email;
      if (to) {
        const memberName =
          [member.first_name, member.last_name].filter(Boolean).join(" ").trim() || "Member";
        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            Apikey: serviceKey,
          },
          body: JSON.stringify({
            to,
            template: "global_id_assigned",
            vars: {
              name: memberName,
              global_id: formatted,
              chapter_name: (chapter as { name?: string }).name ?? "",
              issued_date: new Date().toDateString(),
            },
          }),
        });
        if (!emailRes.ok) {
          console.error("[generate-global-id] send-email failed", emailRes.status, await emailRes.text());
        }
      }
    } catch (emailErr) {
      console.error("[generate-global-id] send-email exception", emailErr);
    }

    return new Response(
      JSON.stringify({ global_id: formatted, raw: globalId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
