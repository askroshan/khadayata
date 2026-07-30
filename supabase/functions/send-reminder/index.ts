import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_ROLES = ["Global Admin", "Chapter Admin"];
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOGIN_URL = "https://khadayataonline.com/auth";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const callerJwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate caller identity and role
    const { data: { user: callerUser }, error: callerErr } = await adminClient.auth.getUser(callerJwt);
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
      .select("roles(name)")
      .eq("member_id", callerMember.id)
      .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0]);

    const callerRoles = (roleRows ?? []).map(
      (ra: { roles: { name: string } | null }) => ra.roles?.name ?? ""
    );

    if (!callerRoles.some((n: string) => ALLOWED_ROLES.includes(n))) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { member_ids } = body as { member_ids: string[] };

    if (!member_ids?.length) {
      return new Response(JSON.stringify({ error: "member_ids array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-reminder] Processing", member_ids.length, "members");

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of member_ids) {
      try {
        // Get member + auth user info
        const { data: member } = await adminClient
          .from("members")
          .select("id, first_name, last_name, user_id, onboarding_completed, chapter_id, chapters(name)")
          .eq("id", memberId)
          .maybeSingle();

        if (!member || !member.user_id) {
          errors.push(`${memberId}: no member or user_id`);
          failed++;
          continue;
        }

        if (member.onboarding_completed) {
          errors.push(`${memberId}: already onboarded`);
          failed++;
          continue;
        }

        // Get email from auth.users
        const { data: { user: authUser }, error: userErr } = await adminClient.auth.admin.getUserById(member.user_id);
        if (userErr || !authUser?.email) {
          console.error("[send-reminder] getUserById error for", member.user_id, userErr?.message);
          errors.push(`${memberId}: no auth user or email - ${userErr?.message ?? "missing"}`);
          failed++;
          continue;
        }

        console.log("[send-reminder] Processing", authUser.email, "confirmed:", !!authUser.email_confirmed_at);

        // Determine the accept URL based on user's email confirmation status
        let acceptUrl: string;

        if (authUser.email_confirmed_at) {
          // User already confirmed their email (self-registered) - just link to login
          acceptUrl = LOGIN_URL;
        } else {
          // User was invited but never confirmed - generate a fresh invite link
          // Try "invite" type first (re-sends the original invite flow)
          const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
            type: "invite",
            email: authUser.email,
          });

          if (linkErr || !linkData?.properties?.action_link) {
            // Fallback: try magiclink
            console.warn("[send-reminder] invite link failed, trying magiclink for", authUser.email, linkErr?.message);
            const { data: mlData, error: mlErr } = await adminClient.auth.admin.generateLink({
              type: "magiclink",
              email: authUser.email,
            });

            if (mlErr || !mlData?.properties?.action_link) {
              // Final fallback: just use login URL
              console.warn("[send-reminder] magiclink also failed for", authUser.email, mlErr?.message, "- using login URL");
              acceptUrl = LOGIN_URL;
            } else {
              acceptUrl = mlData.properties.action_link;
            }
          } else {
            acceptUrl = linkData.properties.action_link;
          }
        }

        const memberName = member.first_name === "Pending" && member.last_name === "Verification"
          ? "Member"
          : member.first_name;
        const chapterName = (member.chapters as { name: string } | null)?.name ?? "";

        // Send reminder email via send-email function
        console.log("[send-reminder] Sending email to:", authUser.email, "acceptUrl:", acceptUrl.slice(0, 50));
        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "Apikey": ANON_KEY,
          },
          body: JSON.stringify({
            to: authUser.email,
            template: "member_invitation",
            vars: {
              name: memberName,
              inviter_name: "KhadayataOnline Admin",
              chapter_name: chapterName,
              accept_url: acceptUrl,
            },
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("[send-reminder] send-email failed for", authUser.email, emailRes.status, errText);
          errors.push(`${authUser.email}: send-email ${emailRes.status} - ${errText.slice(0, 80)}`);
          failed++;
          continue;
        }

        const emailResult = await emailRes.json().catch(() => ({}));
        console.log("[send-reminder] Email sent to", authUser.email, "result:", JSON.stringify(emailResult).slice(0, 100));
        sent++;
      } catch (err) {
        console.error("[send-reminder] Exception for member", memberId, (err as Error).message);
        errors.push(`${memberId}: ${(err as Error).message}`);
        failed++;
      }
    }

    console.log("[send-reminder] Done. sent:", sent, "failed:", failed, "errors:", errors.slice(0, 3));
    return new Response(
      JSON.stringify({ success: true, sent, failed, errors: errors.slice(0, 10) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-reminder] Unhandled exception:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
