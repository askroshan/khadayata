import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_ROLES = ["Global Admin", "Chapter Admin", "Data Steward", "Moderator"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const callerJwt = req.headers.get("Authorization") ?? "";

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user: callerUser }, error: callerErr } = await adminClient.auth.getUser(
      callerJwt.replace("Bearer ", "")
    );
    if (callerErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerMember } = await adminClient
      .from("members")
      .select("id")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    if (!callerMember) {
      return new Response(JSON.stringify({ error: "Caller has no member profile" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRows } = await adminClient
      .from("role_assignments")
      .select("roles(name, scope)")
      .eq("member_id", callerMember.id)
      .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0]);

    const callerRoleNames = (roleRows ?? []).map(
      (ra: { roles: { name: string; scope: string } | null }) => ra.roles?.name ?? ""
    );

    const hasPermission = callerRoleNames.some((name: string) => ALLOWED_ROLES.includes(name));

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "You do not have permission to invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, first_name, last_name, chapter_id } = body as {
      email: string;
      first_name: string;
      last_name?: string;
      chapter_id?: string | null;
    };

    if (!email?.trim() || !first_name?.trim()) {
      return new Response(JSON.stringify({ error: "Email and first name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingMember } = await adminClient
      .from("members")
      .select("id")
      .eq("user_id", (
        await adminClient.auth.admin.listUsers()
      ).data.users.find((u) => u.email === email.trim().toLowerCase())?.id ?? "none")
      .maybeSingle();

    if (existingMember) {
      return new Response(JSON.stringify({ error: "A member with this email already exists" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim(),
      {
        data: {
          first_name: first_name.trim(),
          last_name: last_name?.trim() ?? "",
        },
      }
    );

    if (inviteError) {
      if (inviteError.message?.toLowerCase().includes("already been registered") ||
          inviteError.message?.toLowerCase().includes("already exists") ||
          inviteError.message?.toLowerCase().includes("user already")) {
        return new Response(JSON.stringify({ error: "A user with this email is already registered" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (authData?.user) {
      const { data: existingMemberForUser } = await adminClient
        .from("members")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!existingMemberForUser) {
        const { error: memberError } = await adminClient.from("members").insert({
          user_id: authData.user.id,
          first_name: first_name.trim(),
          last_name: last_name?.trim() ?? "",
          chapter_id: chapter_id || null,
        });

        if (memberError) {
          return new Response(JSON.stringify({ error: memberError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: authData?.user?.id }), {
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
