import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, CircleCheck as CheckCircle, Circle as XCircle, Lock } from "lucide-react";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

function getStrength(password: string): number {
  return RULES.filter((r) => r.test(password)).length;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "bg-destructive", "bg-amber-400", "bg-yellow-500", "bg-success"];

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const strength = getStrength(password);
  const allRulesPassed = strength === RULES.length;
  const passwordsMatch = password === confirm && confirm.length > 0;
  const canSubmit = allRulesPassed && passwordsMatch && !loading;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPassed) {
      toast({ title: "Password does not meet requirements", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully!" });
      navigate("/dashboard");
    }
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-elevated">
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-display font-semibold text-lg">Invalid Reset Link</p>
            <p className="text-sm text-muted-foreground mt-1">This link may have expired or already been used.</p>
            <Button className="mt-6 gradient-hero text-primary-foreground" onClick={() => navigate("/auth")}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display">Set New Password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? STRENGTH_COLORS[strength] : "bg-muted"}`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground w-12 text-right">{STRENGTH_LABELS[strength]}</span>
                  </div>
                  <div className="space-y-1">
                    {RULES.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${passed ? "text-success" : "text-muted-foreground"}`}>
                          {passed ? <CheckCircle className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  maxLength={128}
                  required
                  className={`pr-10 ${confirm.length > 0 ? (passwordsMatch ? "border-success focus-visible:ring-success/30" : "border-destructive focus-visible:ring-destructive/30") : ""}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" />Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" />Passwords match</p>
              )}
            </div>

            <Button type="submit" className="w-full gradient-hero text-primary-foreground" disabled={!canSubmit}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
