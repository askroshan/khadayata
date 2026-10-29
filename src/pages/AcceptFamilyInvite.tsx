import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CircleCheck as CheckCircle, Circle as XCircle, LogIn, Loader as Loader2 } from "lucide-react";
import { safeErrorMessage } from "@/lib/error-utils";

interface InvitationPreview {
  invitee_name: string;
  relation: string;
  inviter: { first_name: string; last_name: string } | null;
}

type PageState = "loading" | "preview" | "accepting" | "success" | "error" | "already_used";

export default function AcceptFamilyInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>("loading");
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMsg("Invalid invitation link.");
      return;
    }
    if (authLoading) return;

    async function loadInvitation() {
      const { data, error } = await supabase.rpc("get_family_invitation_preview", {
        p_token: token!,
      });

      const preview = data as {
        found?: boolean;
        status?: string;
        invitee_name?: string;
        relation?: string;
        inviter_first_name?: string;
        inviter_last_name?: string;
      } | null;

      if (error || !preview?.found) {
        setState("error");
        setErrorMsg("This invitation link is invalid or has expired.");
        return;
      }

      if (preview.status !== "pending") {
        setState("already_used");
        return;
      }

      setInvitation({
        invitee_name: preview.invitee_name ?? "",
        relation: preview.relation ?? "",
        inviter: {
          first_name: preview.inviter_first_name ?? "",
          last_name: preview.inviter_last_name ?? "",
        },
      });
      setState("preview");
    }

    loadInvitation();
  }, [token, authLoading]);

  async function handleAccept() {
    if (!user || !token) return;
    setState("accepting");

    const { data: memberData } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!memberData) {
      setState("error");
      setErrorMsg("No member profile found for your account. Please complete onboarding first.");
      return;
    }

    const { data, error } = await supabase.rpc("accept_family_invitation", {
      p_token: token,
      p_acceptee_member_id: memberData.id,
    });

    if (error || (data as { error?: string })?.error) {
      setState("error");
      setErrorMsg(
        (data as { error?: string })?.error ??
          safeErrorMessage(error, "We could not accept this invitation. Please try again."),
      );
      return;
    }

    setState("success");
  }

  const inviterName = invitation?.inviter
    ? `${invitation.inviter.first_name} ${invitation.inviter.last_name}`.trim()
    : "A community member";

  if (state === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="font-display text-xl">Parivar Connection</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">KhadayataOnline Family Tree</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {state === "preview" && invitation && (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{inviterName}</strong> has invited you to connect as their
                </p>
                <Badge className="text-base px-4 py-1 capitalize gradient-warm text-primary-foreground border-0">
                  {invitation.relation}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">on KhadayataOnline</p>
              </div>

              {!user ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Sign in or create an account to accept this invitation and connect your family tree.
                  </p>
                  <Button asChild className="w-full gradient-warm text-primary-foreground">
                    <Link to={`/auth?redirect=/accept-family-invite/${token}`}>
                      <LogIn className="w-4 h-4 mr-2" />Sign In to Accept
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button onClick={handleAccept} className="w-full gradient-warm text-primary-foreground">
                  <CheckCircle className="w-4 h-4 mr-2" />Accept &amp; Connect
                </Button>
              )}
            </>
          )}

          {state === "accepting" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Creating your family connection…</p>
            </div>
          )}

          {state === "success" && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <div>
                <p className="font-semibold text-foreground">Connection established!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are now connected with <strong>{inviterName}</strong> in your Parivar tree.
                </p>
              </div>
              <Button onClick={() => navigate("/profile")} className="w-full gradient-warm text-primary-foreground">
                View My Profile
              </Button>
            </div>
          )}

          {state === "already_used" && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-semibold text-foreground">This invitation has already been accepted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The family connection was created earlier.
                </p>
              </div>
              <Button onClick={() => navigate("/profile")} variant="outline" className="w-full">
                Go to My Profile
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="text-center space-y-4">
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <p className="font-semibold text-foreground">Something went wrong</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
              </div>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                Go Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
