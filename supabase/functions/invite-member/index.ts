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

    // Check if auth user already exists
    const { data: existingUsers, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) {
      console.error("[invite-member] listUsers error:", listErr.message);
      return new Response(JSON.stringify({ error: "Failed to check existing users: " + listErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const existingAuthUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
    );

    let targetUserId: string;
    let actionLink: string;

    if (existingAuthUser) {
      console.log("[invite-member] Auth user already exists:", existingAuthUser.id);

      // Check if there's a fully-onboarded member (not a trigger stub)
      const { data: existingMember } = await adminClient
        .from("members")
        .select("id, first_name, last_name, onboarding_completed")
        .eq("user_id", existingAuthUser.id)
        .maybeSingle();

      const isStubMember = existingMember &&
        existingMember.first_name === "Pending" &&
        existingMember.last_name === "Verification";

      // Only reject if the member has fully completed onboarding.
      // A real-named member with onboarding_completed = false is a pending
      // invite and must be re-invitable (fixes "Edge Function returned a
      // non-2xx status code" on the Send Reminder flow).
      if (existingMember && !isStubMember && existingMember.onboarding_completed === true) {
        return new Response(JSON.stringify({ error: "A member with this email already exists" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // User exists but is either a stub or has no member row — re-invite
      targetUserId = existingAuthUser.id;

      // Generate a magiclink since user already exists
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });
      if (linkErr || !linkData?.properties?.action_link) {
        console.error("[invite-member] generateLink(magiclink) error:", linkErr?.message);
        return new Response(JSON.stringify({ error: "Failed to generate invite link: " + (linkErr?.message ?? "unknown") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actionLink = linkData.properties.action_link;
      console.log("[invite-member] Generated magiclink for existing user");
    } else {
      // New user: generateLink with type "invite" atomically creates user + link
      console.log("[invite-member] Creating new user via generateLink(invite)");
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
        console.error("[invite-member] generateLink(invite) error:", linkErr?.message);
        return new Response(JSON.stringify({ error: "Failed to generate invite link: " + (linkErr?.message ?? "unknown") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = linkData.user.id;
      actionLink = linkData.properties.action_link;
      console.log("[invite-member] Created user:", targetUserId);
    }

    // The on_auth_user_created trigger may have auto-created a member row.
    // Check for it and update with proper details, or create one if missing.
    const { data: memberRow } = await adminClient
      .from("members")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    let memberId: string;

    if (memberRow) {
      console.log("[invite-member] Updating existing member row:", memberRow.id);
      const { error: updErr } = await adminClient
        .from("members")
        .update({
          first_name: first_name.trim(),
          last_name: safeLastName,
          chapter_id: chapter_id || null,
        })
        .eq("id", memberRow.id);
      if (updErr) {
        console.error("[invite-member] update member error:", updErr.message);
        return new Response(JSON.stringify({ error: "Failed to update member profile: " + updErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      memberId = memberRow.id;
    } else {
      console.log("[invite-member] Creating member row for user:", targetUserId);
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
        console.error("[invite-member] insert member error:", insErr?.message);
        return new Response(JSON.stringify({ error: "Failed to create member profile: " + (insErr?.message ?? "unknown") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      memberId = inserted.id;
    }

    // Resolve chapter name for email
    let chapterName = "";
    if (chapter_id) {
      const { data: ch } = await adminClient
        .from("chapters")
        .select("name")
        .eq("id", chapter_id)
        .maybeSingle();
      chapterName = ch?.name ?? "";
    }

    const inviterName = [callerMember.first_name, callerMember.last_name].filter(Boolean).join(" ") || "The Admin";

    // Send invitation email
    console.log("[invite-member] Sending email via send-email function");
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Apikey": SERVICE_ROLE_KEY,
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
      console.error("[invite-member] send-email failed:", emailRes.status, emailErr);
      return new Response(JSON.stringify({ error: "Failed to send invitation email: " + emailErr }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[invite-member] Success for", normalizedEmail);
    return new Response(
      JSON.stringify({ success: true, user_id: targetUserId, member_id: memberId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[invite-member] Unhandled exception:", (err as Error).message, (err as Error).stack);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
