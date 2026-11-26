import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyEmailDeliverability } from "../send-email/provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
      return new Response(
        JSON.stringify({ allowed: false, error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const minScoreEnv = Number(Deno.env.get("EMAIL_MIN_CONFIDENCE_SCORE") ?? "80");
    const minConfidenceScore = Number.isFinite(minScoreEnv) ? minScoreEnv : 80;
    const verificationMode = Deno.env.get("EMAIL_VERIFICATION_MODE") === "full" ? "full" : "fast";

    const verification = await verifyEmailDeliverability(email, {
      acumbamailAuthToken: Deno.env.get("ACUMBAMAIL_AUTH_TOKEN") ?? "",
      emailitApiKey: Deno.env.get("EMAILIT_API_KEY") ?? "",
      minConfidenceScore,
      verificationMode,
      timeoutMs: 15000,
    });

    return new Response(
      JSON.stringify({
        allowed: verification.allowed,
        score: verification.score,
        risk: verification.risk,
        result: verification.result,
        is_disposable: verification.isDisposable ?? false,
        reason: verification.reason,
      }),
      {
        status: verification.allowed ? 200 : 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ allowed: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
