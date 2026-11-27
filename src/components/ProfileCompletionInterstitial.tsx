import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Globe, ShieldCheck, Share2, Copy, Check, MessageCircle, ArrowRight } from "lucide-react";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProfileCompletionInterstitial() {
  const { user } = useAuth();
  const { data: member } = useMember();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const storageKey = `kh_daily_interstitial_${user.id}`;
    const lastShown = localStorage.getItem(storageKey);
    if (lastShown !== todayKey()) {
      setOpen(true);
    }
  }, [user?.id]);

  const handleClose = () => {
    if (user?.id) {
      localStorage.setItem(`kh_daily_interstitial_${user.id}`, todayKey());
    }
    setOpen(false);
  };

  if (!user) return null;

  const needsProfile = !member?.onboarding_completed || !member?.chapter_id;
  const needsGlobalId = !member?.global_id || (member?.verification_level ?? 0) < 1;
  const referralUrl = `${window.location.origin}/auth${member?.global_id ? `?ref=${encodeURIComponent(member.global_id)}` : ""}`;
  const whatsappText = `Join me on KhadayataOnline — the global Khadayata community platform! Create your profile, join your local chapter, and get your Global ID: ${referralUrl}`;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({ title: "Referral link copied", description: "Share it with Khadayata family and friends." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: referralUrl });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-primary/15 text-primary border-primary/30">Daily Community Check-In</Badge>
          </div>
          <DialogTitle className="font-display text-xl">
            Strengthen Your Khadayata Identity
          </DialogTitle>
          <DialogDescription>
            Complete your profile, join your local chapter, earn vouches for your Global ID, and invite known Khadayatas to grow our trusted global network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* 1. Complete Profile & Join a Chapter */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Complete Profile &amp; Join a Local Chapter</p>
                {!needsProfile && <Badge variant="outline" className="text-[10px] text-success border-success/40">Done</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep your details up to date and connect with your city or regional chapter.
              </p>
              <Button asChild size="sm" variant="link" className="h-auto p-0 mt-1 text-xs" onClick={handleClose}>
                <Link to={member?.onboarding_completed ? "/profile" : "/onboarding"}>
                  {member?.onboarding_completed ? "Update Profile & Chapter" : "Complete Onboarding"} <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* 2. Vouches & Global ID */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Get Vouched &amp; Earn Your Khadayata One ID</p>
                {!needsGlobalId && <Badge variant="outline" className="text-[10px] text-success border-success/40">Verified</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Community vouches verify your Khadayata heritage and unlock your permanent Khadayata One ID (Global ID) — unique to you for life, even if you change chapters.
              </p>
              <Button asChild size="sm" variant="link" className="h-auto p-0 mt-1 text-xs" onClick={handleClose}>
                <Link to="/settings?tab=verification">
                  Request Vouches / View Verification <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* 3. Refer Known Khadayatas */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <UserCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Refer Other Known Khadayatas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invite family and friends in the Khadayata community to join the portal, create their profile, and get vouched.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleCopyReferral}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? "Copied Link" : "Copy Invite Link"}
                </Button>
                <Button asChild size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Share on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Share2 className="w-3 h-3" /> Shown at most once per day
          </span>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Close for Today
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
