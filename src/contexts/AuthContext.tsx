import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import {
  clearAdminOtpVerifiedInSession,
  isValidOtpCode,
  markAdminOtpVerifiedInSession,
} from "@/lib/admin-otp";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  pendingAdminOtp: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; otpRequired?: boolean }>;
  verifyAdminOtp: (code: string) => Promise<{ error: Error | null }>;
  resendAdminOtp: () => Promise<{ error: Error | null }>;
  cancelAdminOtp: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAdminOtp, setPendingAdminOtp] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setPendingAdminOtp(false);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/reset-password` },
    });
    if (!error) {
      try {
        const { error: emailErr } = await supabase.functions.invoke("send-reset-email", {
          body: { email, type: "signup" },
        });
        if (emailErr) throw emailErr;
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
        return { error: new Error("Signup successful but email verification failed. Please contact support.") };
      }
    }
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error as Error };
    }

    const signedInUser = data.user;
    if (signedInUser) {
      clearAdminOtpVerifiedInSession(signedInUser.id);
      const { data: otpData, error: otpErr } = await supabase.functions.invoke("admin-login-otp", {
        body: { action: "send" },
      });
      if (otpErr) {
        const isLocalDev =
          import.meta.env.DEV &&
          /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i.test(
            import.meta.env.VITE_SUPABASE_URL ?? ""
          );
        if (isLocalDev) {
          markAdminOtpVerifiedInSession(signedInUser.id);
          return { error: null, otpRequired: false };
        }
        await supabase.auth.signOut();
        return { error: new Error("Could not send admin verification code. Please try again.") };
      }
      if (otpData?.required) {
        setPendingAdminOtp(true);
        return { error: null, otpRequired: true };
      }
      markAdminOtpVerifiedInSession(signedInUser.id);
    }

    return { error: null, otpRequired: false };
  };

  const verifyAdminOtp = async (code: string) => {
    if (!isValidOtpCode(code)) {
      return { error: new Error("Please enter a valid 6-digit verification code.") };
    }
    const { data, error } = await supabase.functions.invoke("admin-login-otp", {
      body: { action: "verify", code },
    });
    if (error || !data?.verified) {
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "Invalid verification code.";
      return { error: new Error(msg) };
    }
    if (user) {
      markAdminOtpVerifiedInSession(user.id);
    }
    setPendingAdminOtp(false);
    return { error: null };
  };

  const resendAdminOtp = async () => {
    const { error } = await supabase.functions.invoke("admin-login-otp", {
      body: { action: "send" },
    });
    if (error) {
      return { error: new Error("Failed to resend verification code. Please try again.") };
    }
    return { error: null };
  };

  const cancelAdminOtp = async () => {
    if (user) clearAdminOtpVerifiedInSession(user.id);
    setPendingAdminOtp(false);
    await supabase.auth.signOut();
  };

  const signOut = async () => {
    if (user) clearAdminOtpVerifiedInSession(user.id);
    setPendingAdminOtp(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        pendingAdminOtp,
        signUp,
        signIn,
        verifyAdminOtp,
        resendAdminOtp,
        cancelAdminOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
