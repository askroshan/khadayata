import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import heroTemple from "@/assets/hero-temple.jpg";
import diyaLamp from "@/assets/diya-lamp.png";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { useTotalMemberCount, useTotalChapterCount, useTotalCountryCount } from "@/hooks/useChapter";
import { safeErrorMessage } from "@/lib/error-utils";
import { isDisposableEmailDomain } from "../../supabase/functions/send-email/provider";
import { normalizeOtpCode } from "@/lib/admin-otp";

const LOGO = "/Screenshot_2026-03-16_at_9.18.14_AM.png";

const emailSchema = z.string().trim().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const { user, loading, pendingAdminOtp, signUp, signIn, verifyAdminOtp, resendAdminOtp, cancelAdminOtp } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { data: totalMembers } = useTotalMemberCount();
  const { data: totalChapters } = useTotalChapterCount();
  const { data: totalCountries } = useTotalCountryCount();

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <img src={diyaLamp} alt="" className="w-16 h-16 animate-pulse" />
    </div>
  );
  if (user && !pendingAdminOtp) return <Navigate to={redirectTo} replace />;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) { toast({ title: "Invalid email", description: emailResult.error.errors[0].message, variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reset-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ email, type: "recovery" }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => "Unknown error");
        console.error("Password reset request failed:", { status: res.status, error: errBody });
        throw new Error("Failed to send reset email");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      toast({ title: "Error", description: "Failed to send reset email. Please try again.", variant: "destructive" });
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    toast({ title: "Check your email", description: "If an account exists, we've sent a password reset link." });
    setIsForgotPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) { toast({ title: "Invalid email", description: emailResult.error.errors[0].message, variant: "destructive" }); return; }
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) { toast({ title: "Invalid password", description: pwResult.error.errors[0].message, variant: "destructive" }); return; }
    setSubmitting(true);
    if (isSignUp) {
      if (isDisposableEmailDomain(email)) {
        setSubmitting(false);
        toast({
          title: "Temporary email not allowed",
          description: "Please use a permanent personal or work email address to create an account.",
          variant: "destructive",
        });
        return;
      }
      try {
        const verifyRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ email }),
          },
        );
        if (verifyRes.status === 422) {
          const vData = await verifyRes.json().catch(() => ({}));
          setSubmitting(false);
          toast({
            title: "Email address not accepted",
            description:
              vData?.is_disposable
                ? "Temporary or disposable email addresses cannot be used to create an account."
                : "This email address could not be verified as deliverable. Please use a valid permanent email.",
            variant: "destructive",
          });
          return;
        }
      } catch {
        // If the verification function is unreachable in local dev, local disposable check already ran above.
      }
    }
    const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);
    if (result.error) { toast({ title: "Error", description: safeErrorMessage(result.error, isSignUp ? "We could not create your account. Please try again." : "The email or password you entered is incorrect."), variant: "destructive" }); }
    else if (isSignUp) { toast({ title: "Check your email", description: "We've sent you a verification link." }); }
    else if ("otpRequired" in result && result.otpRequired) {
      setOtpCode("");
      toast({ title: "Verification code sent", description: "Check your email for your 6-digit admin login code." });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await verifyAdminOtp(otpCode);
    setSubmitting(false);
    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    }
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    const { error } = await resendAdminOtp();
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code resent", description: "A new 6-digit verification code was sent to your email." });
    }
  };

  return (
    <PublicLayout title={isSignUp ? "Join the Community" : "Sign In"}>
      <SEOMeta
        title={isSignUp ? "Join the Community" : "Sign In"}
        description="Sign in or create your Khadayata Online account to connect with 50,000+ community members worldwide."
        url="/auth"
        noIndex={true}
      />
      <div className="flex min-h-[calc(100vh-68px)]" key={isForgotPassword ? "forgot" : isSignUp ? "signup" : "signin"}>
        {/* Left side - immersive branding */}
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center">
          <img src={heroTemple} alt="Kotyark Temple — Khadayata Heritage" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E2E2E]/85 via-[#2E2E2E]/65 to-[rgba(243,156,18,0.2)]" />
          <div className="relative z-10 max-w-md text-center p-12">
            <img
              src={LOGO}
              alt="Khadayata"
              style={{ height: 80, width: "auto", mixBlendMode: "screen", margin: "0 auto 24px" }}
            />
            <p className="text-lg text-white/80 font-body leading-relaxed">
              Connecting the Khadayata community worldwide.<br />One identity, one platform, one family.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4 text-center">
              {[
                { val: totalMembers != null ? `${totalMembers.toLocaleString()}+` : "…", label: "Members" },
                { val: totalChapters != null ? totalChapters.toString() : "…", label: "Chapters" },
                { val: totalCountries != null ? totalCountries.toString() : "…", label: "Countries" },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                  <p className="text-xl font-display font-bold text-white">{s.val}</p>
                  <p className="text-xs text-white/55">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12 bg-background">
          <Card className="w-full max-w-md shadow-elevated border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="lg:hidden mb-4 flex justify-center">
                <img src={LOGO} alt="Khadayata" style={{ height: 52, mixBlendMode: "multiply" }} />
              </div>
              <CardTitle className="text-2xl font-display">
                {pendingAdminOtp ? "Admin Verification" : isForgotPassword ? "Reset Password" : isSignUp ? "Join the Community" : "Welcome Back"}
              </CardTitle>
              <CardDescription>
                {pendingAdminOtp
                  ? "Enter the 6-digit verification code sent to your email"
                  : isForgotPassword
                  ? "Enter your email and we'll send you a reset link"
                  : isSignUp
                  ? "Create your account to connect with the Khadayata family"
                  : "Sign in to your Khadayata Online account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingAdminOtp ? (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-otp">6-Digit Verification Code</Label>
                    <Input
                      id="admin-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(normalizeOtpCode(e.target.value))}
                      required
                      maxLength={6}
                      className="h-11 text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 gradient-hero text-primary-foreground shadow-glow text-base" disabled={submitting || otpCode.length !== 6}>
                    {submitting ? "Verifying..." : "Verify & Continue"}
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={handleResendOtp} disabled={submitting} className="text-primary hover:underline">
                      Resend code
                    </button>
                    <button type="button" onClick={() => { setOtpCode(""); void cancelAdminOtp(); }} disabled={submitting} className="text-muted-foreground hover:text-primary transition-colors">
                      Cancel sign in
                    </button>
                  </div>
                </form>
              ) : isForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="h-11" />
                  </div>
                  <Button type="submit" className="w-full h-12 gradient-hero text-primary-foreground shadow-glow text-base" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={() => { setIsForgotPassword(false); setEmail(""); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {!isSignUp && (
                          <button type="button" onClick={() => { setIsForgotPassword(true); setPassword(""); }} className="text-xs text-primary hover:underline">
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={128} className="h-11" />
                    </div>
                    <Button type="submit" className="w-full h-12 gradient-hero text-primary-foreground shadow-glow text-base" disabled={submitting}>
                      {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                    </Button>
                  </form>
                  <div className="mt-6 text-center">
                    <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up free"}
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
