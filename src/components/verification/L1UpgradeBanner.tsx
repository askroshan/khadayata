import { Link } from "react-router-dom";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight, Heart, FileText, CircleCheck as CheckCircle } from "lucide-react";

const LEVEL_LABELS: Record<number, string> = {
  0: "L0 — Unverified",
  1: "L1 — Vouched",
  2: "L2 — Verified",
  3: "L3 — Trusted",
};

export function L1UpgradeBanner() {
  const { member } = useMember();
  const level = member?.verification_level ?? 0;

  const { data: vouchCount } = useQuery({
    queryKey: ["vouch-count", member?.id],
    queryFn: async () => {
      if (!member) return 0;
      const { count } = await supabase
        .from("vouches")
        .select("id", { count: "exact", head: true })
        .eq("member_id", member.id);
      return count ?? 0;
    },
    enabled: !!member && level < 2,
  });

  const { data: l1VouchCount } = useQuery({
    queryKey: ["l1-vouch-count", member?.id],
    queryFn: async () => {
      if (!member) return 0;
      const { data } = await supabase
        .from("vouches")
        .select("voucher:members!vouches_voucher_member_id_fkey(verification_level)")
        .eq("member_id", member.id);
      return (data ?? []).filter((v) => {
        const voucher = v.voucher as { verification_level: number } | null;
        return (voucher?.verification_level ?? 0) >= 1;
      }).length;
    },
    enabled: !!member && level === 1,
  });

  const { data: pendingRequest } = useQuery({
    queryKey: ["pending-ver-request", member?.id],
    queryFn: async () => {
      if (!member) return null;
      const { data } = await supabase
        .from("verification_requests")
        .select("id, status, requested_level")
        .eq("member_id", member.id)
        .eq("status", "pending")
        .maybeSingle();
      return data;
    },
    enabled: !!member && level < 2,
  });

  if (!member || level >= 2) return null;

  if (level === 0) {
    const vouchProgress = Math.min(vouchCount ?? 0, 2);
    const progressPct = (vouchProgress / 2) * 100;

    return (
      <Card className="shadow-card border-amber-200/60 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-700/30">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display font-semibold text-sm">Upgrade to L1 — Vouched</p>
                  <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 px-2">Currently {LEVEL_LABELS[level]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Get 2 vouches from existing members to reach L1 and unlock premium features.</p>
              </div>
            </div>
            <Link to="/settings?tab=verification">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 gap-1.5 shrink-0">
                View Progress <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Vouches received
                </span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">{vouchProgress}/2</span>
              </div>
              <Progress value={progressPct} className="h-2 bg-amber-100 dark:bg-amber-900/20 [&>div]:bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${(vouchCount ?? 0) >= 2 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-muted/50 text-muted-foreground"}`}>
                {(vouchCount ?? 0) >= 2 ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current shrink-0" />}
                2 vouches from members
              </div>
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${pendingRequest ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" : "bg-muted/50 text-muted-foreground"}`}>
                {pendingRequest ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current shrink-0" />}
                {pendingRequest ? "Request submitted" : "Submit upgrade request"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // level === 1 (level >= 2 already returned null above)
  const l1Progress = Math.min(l1VouchCount ?? 0, 3);
  const progressPct = (l1Progress / 3) * 100;

  return (
    <Card className="shadow-card border-blue-200/60 bg-blue-50/40 dark:bg-blue-900/10 dark:border-blue-700/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display font-semibold text-sm">Upgrade to L2 — Verified</p>
                <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 px-2">Currently L1 — Vouched</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Get 3 vouches from L1+ members and submit a KYC document to reach L2 and unlock job posting and event creation.</p>
            </div>
          </div>
          <Link to="/settings?tab=verification">
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 gap-1.5 shrink-0">
              Submit Documents <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> L1+ vouches received
              </span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">{l1Progress}/3</span>
            </div>
            <Progress value={progressPct} className="h-2 bg-blue-100 dark:bg-blue-900/20 [&>div]:bg-blue-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${l1Progress >= 3 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-muted/50 text-muted-foreground"}`}>
              {l1Progress >= 3 ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current shrink-0" />}
              3 L1+ vouches
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/50 text-muted-foreground">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              KYC document
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${pendingRequest ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" : "bg-muted/50 text-muted-foreground"}`}>
              {pendingRequest ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current shrink-0" />}
              {pendingRequest ? "Request submitted" : "Submit request"}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-700/30">
          <p className="text-[11px] text-muted-foreground font-medium mb-1.5">L2 unlocks:</p>
          <div className="flex flex-wrap gap-1.5">
            {["Post Jobs", "Create Events", "List Business (verified badge)"].map((f) => (
              <span key={f} className="inline-flex items-center gap-1 text-[10px] bg-blue-100/70 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full px-2 py-0.5">
                <Shield className="w-2.5 h-2.5" />{f}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
