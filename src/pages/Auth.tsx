import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import heroTemple from "@/assets/hero-temple.jpg";
import patternOrnament from "@/assets/pattern-ornament.png";
import diyaLamp from "@/assets/diya-lamp.png";

const emailSchema = z.string().trim().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { signUp, signIn } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><img src={diyaLamp} alt="" className="w-16 h-16 animate-pulse" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) { toast({ title: "Invalid email", description: emailResult.error.errors[0].message, variant: "destructive" }); return; }
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) { toast({ title: "Invalid password", description: pwResult.error.errors[0].message, variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else if (isSignUp) { toast({ title: "Check your email", description: "We've sent you a confirmation link." }); }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - immersive branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center">
        <img src={heroTemple} alt="Kotyark Temple" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/80 via-foreground/60 to-foreground/40" />
        <div className="relative z-10 max-w-md text-center p-12">
          <img src={patternOrnament} alt="" className="w-20 h-20 mx-auto mb-6 opacity-60" />
          <h1 className="text-5xl font-display font-bold text-primary-foreground mb-4">
            KhadayataOnline
          </h1>
          <p className="text-lg text-primary-foreground/80 font-body leading-relaxed">
            Connecting the Khadayata community worldwide. One identity, one platform, one family.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[{ val: "10K+", label: "Members" }, { val: "25+", label: "Chapters" }, { val: "500+", label: "Businesses" }].map((s) => (
              <div key={s.label} className="p-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                <p className="text-xl font-display font-bold text-primary-foreground">{s.val}</p>
                <p className="text-xs text-primary-foreground/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12 bg-background">
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden mb-4 flex items-center justify-center gap-2">
              <img src={patternOrnament} alt="" className="w-8 h-8 opacity-70" />
              <h2 className="text-2xl font-display font-bold text-gradient-hero">KhadayataOnline</h2>
            </div>
            <CardTitle className="text-2xl font-display">
              {isSignUp ? "Join the Community" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isSignUp ? "Create your account to connect with the Khadayata family" : "Sign in to your KhadayataOnline account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="h-11" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && <Link to="/reset-password" className="text-xs text-primary hover:underline">Forgot password?</Link>}
                </div>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={128} className="h-11" />
              </div>
              <Button type="submit" className="w-full h-12 gradient-hero text-primary-foreground shadow-glow text-base" disabled={submitting}>
                {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
