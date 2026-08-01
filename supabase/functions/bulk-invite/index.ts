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
const MAX_BATCH = 500;

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
      .select("id, first_name, last_name, chapter_id")
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
      return new Response(JSON.stringify({ error: "You do not have permission to bulk invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isGlobalAdmin = callerRoleNames.includes("Global Admin");
    const callerChapterId = callerMember.chapter_id as string | null;

    // Parse request body
    const body = await req.json();
    const { emails, chapter_id, first_name } = body as {
      emails: string[];
      chapter_id?: string | null;
      first_name?: string;
    };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No emails provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (emails.length > MAX_BATCH) {
      return new Response(JSON.stringify({ error: `Too many emails. Maximum ${MAX_BATCH} per batch.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine the chapter to assign
    let targetChapterId: string | null = chapter_id ?? null;

    // Chapter Admin scope check
    if (!isGlobalAdmin && callerChapterId) {
      targetChapterId = callerChapterId;
    }

    const inviterName = [callerMember.first_name, callerMember.last_name].filter(Boolean).join(" ") || "The Admin";
    const inviteFirstName = first_name?.trim() || "Member";

    // Resolve chapter name for email
    let chapterName = "";
    if (targetChapterId) {
      const { data: ch } = await adminClient
        .from("chapters")
        .select("name")
        .eq("id", targetChapterId)
        .maybeSingle();
      chapterName = ch?.name ?? "";
    }

    // Fetch existing users in one call for dedup
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingEmailSet = new Set(
      (existingUsers?.users ?? []).map((u: { email?: string }) => (u.email ?? "").toLowerCase())
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();

      if (!email) {
        continue;
      }

      try {
        // Skip if already registered and fully onboarded
        if (existingEmailSet.has(email)) {
          // Check if member is fully onboarded
          const { data: existingUser } = await adminClient.auth.admin.listUsers({ perPage: 1 });
          const user = (existingUsers?.users ?? []).find(
            (u: { email?: string }) => (u.email ?? "").toLowerCase() === email
          );

          if (user) {
            const { data: memberRow } = await adminClient
              .from("members")
              .select("onboarding_completed, first_name, last_name")
              .eq("user_id", user.id)
              .maybeSingle();

            const isStub = memberRow?.first_name === "Pending" && memberRow?.last_name === "Verification";

            if (memberRow && !isStub && memberRow.onboarding_completed === true) {
              skipped++;
              continue;
            }
          }
        }

        // Generate invite link
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "invite",
          email,
          options: {
            data: { first_name: inviteFirstName, last_name: "Member" },
          },
        });

        if (linkErr || !linkData?.properties?.action_link || !linkData?.user) {
          // If user already exists, try magiclink
          const { data: mlData, error: mlErr } = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email,
          });
          if (mlErr || !mlData?.properties?.action_link) {
            errors.push(`${email}: ${linkErr?.message ?? mlErr?.message ?? "failed to generate link"}`);
            failed++;
            continue;
          }
          // Update member row if needed
          await ensureMemberRow(adminClient, linkData?.user?.id ?? mlData.user?.id ?? "", inviteFirstName, "Member", targetChapterId);
          // Send email
          const emailOk = await sendInviteEmail(email, inviteFirstName, inviterName, chapterName, mlData.properties.action_link);
          if (!emailOk) { failed++; errors.push(`${email}: email send failed`); continue; }
          sent++;
          continue;
        }

        // Ensure member row exists
        await ensureMemberRow(adminClient, linkData.user.id, inviteFirstName, "Member", targetChapterId);

        // Send invitation email
        const emailOk = await sendInviteEmail(email, inviteFirstName, inviterName, chapterName, linkData.properties.action_link);
        if (!emailOk) {
          failed++;
          errors.push(`${email}: email send failed`);
          continue;
        }

        sent++;
      } catch (err) {
        console.error("[bulk-invite] Error for", email, (err as Error).message);
        errors.push(`${email}: ${(err as Error).message}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, skipped, errors: errors.slice(0, 20), total: emails.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[bulk-invite] Unhandled exception:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function ensureMemberRow(
  client: ReturnType<typeof createClient>,
  userId: string,
  firstName: string,
  lastName: string,
  chapterId: string | null
): Promise<void> {
  if (!userId) return;
  const { data: existing } = await client
    .from("members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await client
      .from("members")
      .update({ first_name: firstName, last_name: lastName, chapter_id: chapterId || null })
      .eq("id", existing.id);
  } else {
    await client
      .from("members")
      .insert({ user_id: userId, first_name: firstName, last_name: lastName, chapter_id: chapterId || null });
  }
}

async function sendInviteEmail(
  email: string,
  firstName: string,
  inviterName: string,
  chapterName: string,
  actionLink: string
): Promise<boolean> {
  const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      to: email,
      template: "member_invitation",
      vars: {
        name: firstName,
        inviter_name: inviterName,
        chapter_name: chapterName,
        accept_url: actionLink,
      },
    }),
  });
  return emailRes.ok;
}
