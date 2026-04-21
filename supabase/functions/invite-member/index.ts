import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_ROLES = ["Global Admin", "Chapter Admin", "Data Steward", "Moderator"];
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const callerJwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: callerUser }, error: callerErr } = await adminClient.auth.getUser(callerJwt);
    if (callerErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerMember } = await adminClient
      .from("members")
      .select("id, first_name, last_name")
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
      .select("roles(name)")
      .eq("member_id", callerMember.id)
      .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0]);

    const callerRoleNames = (roleRows ?? []).map(
      (ra: { roles: { name: string } | null }) => ra.roles?.name ?? ""
    );

    if (!callerRoleNames.some((n: string) => ALLOWED_ROLES.includes(n))) {
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

    const normalizedEmail = email.trim().toLowerCase();
    const safeLastName = last_name?.trim() || "Member";

    console.log("[invite-member] Starting invite for:", normalizedEmail);

    const { data: existingUsers, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) {
      console.error("[invite-member] listUsers error:", listErr);
    }
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    console.log("[invite-member] existingAuthUser:", existingAuthUser?.id ?? "none");

    let targetUserId: string;

    if (existingAuthUser) {
      const { data: existingMember } = await adminClient
        .from("members")
        .select("id")
        .eq("user_id", existingAuthUser.id)
        .maybeSingle();
      if (existingMember) {
        return new Response(JSON.stringify({ error: "A member with this email already exists" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = existingAuthUser.id;
    } else {
      targetUserId = "";
    }

    let chapterName = "";
    if (chapter_id) {
      const { data: ch } = await adminClient
        .from("chapters")
        .select("name")
        .eq("id", chapter_id)
        .maybeSingle();
      chapterName = ch?.name ?? "";
    }

    let actionLink: string | null = null;

    if (!existingAuthUser) {
      console.log("[invite-member] Generating invite link (will create user)");
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email: normalizedEmail,
        options: {
          data: {
            first_name: first_name.trim(),
            last_name: safeLastName,
          },
        },
      });
      if (linkErr || !linkData?.properties?.action_link || !linkData?.user) {
        console.error("[invite-member] generateLink(invite) error:", linkErr);
        return new Response(JSON.stringify({ error: "Failed to generate invite link: " + (linkErr?.message ?? "unknown") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = linkData.user.id;
      actionLink = linkData.properties.action_link;
      console.log("[invite-member] Created user via invite link:", targetUserId);
    } else {
      console.log("[invite-member] Reusing existing auth user, generating magiclink");
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });
      if (linkErr || !linkData?.properties?.action_link) {
        console.error("[invite-member] generateLink(magiclink) error:", linkErr);
        return new Response(JSON.stringify({ error: "Failed to generate invite link: " + (linkErr?.message ?? "unknown") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actionLink = linkData.properties.action_link;
    }

    const { data: existingMemberRow } = await adminClient
      .from("members")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    let memberId: string | null = existingMemberRow?.id ?? null;
    console.log("[invite-member] existingMemberRow:", memberId ?? "none");

    if (memberId) {
      const { error: updErr } = await adminClient
        .from("members")
        .update({
          first_name: first_name.trim(),
          last_name: safeLastName,
          chapter_id: chapter_id || null,
        })
        .eq("id", memberId);
      if (updErr) {
        console.error("[invite-member] update member error:", updErr);
        return new Response(JSON.stringify({ error: "Failed to update member profile: " + updErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: inserted, error: insErr } = await adminClient
        .from("members")
        .insert({
          user_id: targetUserId,
          first_name: first_name.trim(),
          last_name: safeLastName,
          chapter_id: chapter_id || null,
        })
        .select("id")
        .maybeSingle();
      if (insErr || !inserted) {
        console.error("[invite-member] insert member error:", insErr);
        return new Response(JSON.stringify({ error: "Failed to create member profile: " + (insErr?.message ?? "unknown") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      memberId = inserted.id;
    }

    const inviterName = [callerMember.first_name, callerMember.last_name].filter(Boolean).join(" ") || "The Admin";

    console.log("[invite-member] Sending email via send-email function");
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
      },
      body: JSON.stringify({
        to: normalizedEmail,
        template: "member_invitation",
        vars: {
          name: first_name.trim(),
          inviter_name: inviterName,
          chapter_name: chapterName,
          accept_url: actionLink,
        },
      }),
    });

    if (!emailRes.ok) {
      const emailErr = await emailRes.text();
      console.error("[invite-member] send-email error:", emailRes.status, emailErr);
      return new Response(JSON.stringify({ error: "Failed to send invitation email: " + emailErr }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[invite-member] Success for", normalizedEmail);
    return new Response(
      JSON.stringify({ success: true, user_id: targetUserId, member_id: memberId, reused_existing_user: !!existingAuthUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[invite-member] exception:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
