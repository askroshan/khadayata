import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml, pickInviteeName } from "../send-email/templates.ts";
import { sendTransactionalEmail } from "../send-email/provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSixDigitOtp(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonResponse({ error: "Missing authorization token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userRes, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }
    const user = userRes.user;

    // Check if caller holds Global Admin role
    const { data: isGlobalAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "Global Admin",
    });
    if (roleErr) {
      return jsonResponse({ error: "Failed to check admin role" }, 500);
    }

    if (!isGlobalAdmin) {
      return jsonResponse({ required: false, verified: true });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "send") {
      if (!user.email) {
        return jsonResponse({ error: "Admin account has no email address" }, 400);
      }

      const code = generateSixDigitOtp();
      const codeHash = await sha256Hex(`${user.id}:${code}`);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

      // Invalidate any previous unverified OTPs for this user
      await adminClient
        .from("admin_login_otps")
        .delete()
        .eq("user_id", user.id)
        .is("verified_at", null);

      const { error: insertErr } = await adminClient.from("admin_login_otps").insert({
        user_id: user.id,
        code_hash: codeHash,
        expires_at: expiresAt,
      });
      if (insertErr) {
        return jsonResponse({ error: "Failed to create OTP challenge" }, 500);
      }

      const { data: member } = await adminClient
        .from("members")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const greetingName = pickInviteeName(member, user.user_metadata as { first_name?: string; last_name?: string });
      const { subject, html } = buildEmailHtml("admin_login_otp", {
        name: greetingName,
        otp_code: code,
        expires_minutes: "10",
      });

      const acumbamailAuthToken = Deno.env.get("ACUMBAMAIL_AUTH_TOKEN") ?? "";
      const emailitKey = Deno.env.get("EMAILIT_API_KEY") ?? "";
      const fromEmail = Deno.env.get("EMAIL_FROM") ?? "KhadayataOnline <noreply@khadayataonline.com>";
      const isLocalSupabase =
        supabaseUrl.includes("127.0.0.1") ||
        supabaseUrl.includes("localhost") ||
        supabaseUrl.includes("http://kong:");

      if (!acumbamailAuthToken && !emailitKey) {
        if (isLocalSupabase) {
          console.log(`[admin-login-otp] Local dev without email provider keys; bypassing OTP for ${user.email} (code=${code})`);
          return jsonResponse({ required: false, verified: true, local_dev_bypass: true });
        }
        return jsonResponse({ error: "Email delivery is not configured (missing ACUMBAMAIL_AUTH_TOKEN and EMAILIT_API_KEY)" }, 500);
      }

      const delivery = await sendTransactionalEmail(
        {
          fromName: "KhadayataOnline",
          fromEmail,
          to: [user.email],
          subject,
          html,
          category: "admin_login_otp",
        },
        {
          acumbamailAuthToken,
          emailitApiKey: emailitKey,
          timeoutMs: 30000,
        },
      );

      if (!delivery.ok) {
        return jsonResponse(
          { error: `Failed to send OTP email (${delivery.status}): ${JSON.stringify(delivery.details ?? delivery.error)}` },
          502,
        );
      }

      return jsonResponse({
        required: true,
        sent: true,
        email: user.email,
        provider: delivery.provider,
        fallback_used: delivery.fallbackUsed,
      });
    }

    if (action === "verify") {
      const code = String(body?.code ?? "").replace(/\D/g, "").slice(0, 6);
      if (!/^\d{6}$/.test(code)) {
        return jsonResponse({ error: "Please enter a valid 6-digit verification code" }, 400);
      }

      const { data: challenge, error: fetchErr } = await adminClient
        .from("admin_login_otps")
        .select("id, code_hash, expires_at, attempts")
        .eq("user_id", user.id)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr || !challenge) {
        return jsonResponse({ error: "No active verification code found. Please request a new code." }, 400);
      }

      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        return jsonResponse({ error: "Too many failed attempts. Please request a new code." }, 429);
      }

      if (Date.now() >= Date.parse(challenge.expires_at)) {
        return jsonResponse({ error: "Verification code has expired. Please request a new code." }, 400);
      }

      const expectedHash = await sha256Hex(`${user.id}:${code}`);
      if (expectedHash !== challenge.code_hash) {
        await adminClient
          .from("admin_login_otps")
          .update({ attempts: challenge.attempts + 1 })
          .eq("id", challenge.id);
        return jsonResponse({ error: "Invalid verification code. Please try again." }, 400);
      }

      await adminClient
        .from("admin_login_otps")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", challenge.id);

      return jsonResponse({ required: true, verified: true });
    }

    return jsonResponse({ error: "Unsupported action" }, 400);
  } catch (err) {
    console.error("admin-login-otp error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
