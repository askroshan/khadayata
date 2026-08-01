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
      .select("id, chapter_id")
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

    const isGlobalAdmin = callerRoles.includes("Global Admin");
    const callerChapterId = callerMember.chapter_id as string | null;

    // Parse request body
    const body = await req.json();
    const { member_ids, send_to_all, chapter_id } = body as {
      member_ids?: string[];
      send_to_all?: boolean;
      chapter_id?: string | null;
    };

    // Determine the mode: "all" or "selected"
    let targetMemberIds: string[];

    if (send_to_all === true) {
      // Mass mode: query all pending (non-onboarded) members
      let q = adminClient
        .from("members")
        .select("id")
        .eq("onboarding_completed", false)
        .order("created_at", { ascending: false });

      // Chapter Admin can only target their own chapter; Global Admin can
      // optionally scope by chapter_id or target all
      if (!isGlobalAdmin) {
        if (!callerChapterId) {
          return new Response(JSON.stringify({ error: "Chapter Admin must belong to a chapter" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        q = q.eq("chapter_id", callerChapterId);
      } else if (chapter_id) {
        q = q.eq("chapter_id", chapter_id);
      }

      const { data: pendingRows, error: pendingErr } = await q.limit(500);
      if (pendingErr) {
        return new Response(JSON.stringify({ error: pendingErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetMemberIds = (pendingRows ?? []).map((r: { id: string }) => r.id);
    } else {
      // Selected mode: use provided member_ids
      targetMemberIds = member_ids ?? [];
    }

    if (!targetMemberIds.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, failed: 0, errors: [], total_attempted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-reminder] Processing", targetMemberIds.length, "members");

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of targetMemberIds) {
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

        // Chapter Admin scope check for selected mode
        if (!isGlobalAdmin && callerChapterId && member.chapter_id !== callerChapterId) {
          errors.push(`${memberId}: outside your chapter scope`);
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
          acceptUrl = LOGIN_URL;
        } else {
          const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
            type: "invite",
            email: authUser.email,
          });

          if (linkErr || !linkData?.properties?.action_link) {
            console.warn("[send-reminder] invite link failed, trying magiclink for", authUser.email, linkErr?.message);
            const { data: mlData, error: mlErr } = await adminClient.auth.admin.generateLink({
              type: "magiclink",
              email: authUser.email,
            });

            if (mlErr || !mlData?.properties?.action_link) {
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

        // Send reminder email via send-email function — both headers use the
        // SAME key (SERVICE_ROLE_KEY) to avoid "Conflicting API Key" 401.
        console.log("[send-reminder] Sending email to:", authUser.email, "acceptUrl:", acceptUrl.slice(0, 50));
        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "Apikey": SERVICE_ROLE_KEY,
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
      JSON.stringify({ success: true, sent, failed, errors: errors.slice(0, 10), total_attempted: targetMemberIds.length }),
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
