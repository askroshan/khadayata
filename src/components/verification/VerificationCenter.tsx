import { useState } from "react";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, CircleCheck as CheckCircle, Clock, TriangleAlert as AlertTriangle, ArrowUp } from "lucide-react";

const LEVELS = [
  { level: 0, label: "L0 — Basic", desc: "Email verified only", color: "bg-muted text-muted-foreground" },
  { level: 1, label: "L1 — Verified", desc: "Identity confirmed via document or 2+ vouches", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  { level: 2, label: "L2 — Trusted", desc: "KYC document verified + 3+ vouches from L1+ members", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { level: 3, label: "L3 — Senior", desc: "Admin-granted senior trust tier for community leaders", color: "bg-primary/20 text-primary" },
];

const DOCUMENT_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan_card", label: "PAN Card" },
];

export function VerificationCenter() {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState("");
  const [notes, setNotes] = useState("");

  const currentLevel = member?.verification_level ?? 0;

  const { data: vouches } = useQuery({
    queryKey: ["my-vouches-received", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("vouches")
        .select("*, voucher:members!vouches_voucher_member_id_fkey(first_name, last_name, verification_level)")
        .eq("member_id", member.id);
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: verificationRequests } = useQuery({
    queryKey: ["verification-requests", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const requestVerification = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const nextLevel = currentLevel + 1;
      if (nextLevel > 2) throw new Error("Level 3+ is granted by admins only");

      const { error } = await supabase.from("verification_requests").insert({
        member_id: member.id,
        requested_level: nextLevel,
        document_type: docType || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verification request submitted!" });
      setDocType("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["verification-requests"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const hasPendingRequest = verificationRequests?.some((r) => r.status === "pending");
  const l1PlusVouches = vouches?.filter((v) => {
    const voucher = v.voucher as { verification_level: number } | null;
    return (voucher?.verification_level ?? 0) >= 1;
  }) ?? [];

  const canRequestL1 = currentLevel === 0 && (vouches?.length ?? 0) >= 2;
  const canRequestL2 = currentLevel === 1 && l1PlusVouches.length >= 3;

  return (
    <div className="space-y-4">
      {/* Current level display */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Verification Level
          </CardTitle>
          <CardDescription>Your identity trust tier in the Khadayata community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {LEVELS.map((l) => (
              <div
                key={l.level}
                className={`flex-1 rounded-lg p-3 text-center transition-all ${
                  l.level === currentLevel
                    ? `${l.color} ring-2 ring-primary/30 shadow-md`
                    : l.level < currentLevel
                    ? "bg-muted/30 text-muted-foreground/50"
                    : "bg-muted/50 text-muted-foreground/60"
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  {l.level < currentLevel && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  {l.level === currentLevel && <Shield className="w-3.5 h-3.5" />}
                  <span className="text-xs font-bold">L{l.level}</span>
                </div>
                <p className="text-[10px] leading-tight">{l.desc}</p>
              </div>
            ))}
          </div>

          {/* Vouches count */}
          <div className="flex items-center justify-between text-sm border-t border-border pt-3">
            <span className="text-muted-foreground">Total vouches received</span>
            <Badge variant="outline">{vouches?.length ?? 0}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">L1+ vouches</span>
            <Badge variant="outline">{l1PlusVouches.length}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Request upgrade */}
      {currentLevel < 2 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-primary" /> Request Level {currentLevel + 1} Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPendingRequest ? (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">You have a pending verification request</span>
              </div>
            ) : (
              <>
                {currentLevel === 0 && !canRequestL1 && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                    <span>You need at least 2 vouches from other members to request L1. Currently: {vouches?.length ?? 0}/2</span>
                  </div>
                )}
                {currentLevel === 1 && !canRequestL2 && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                    <span>You need at least 3 vouches from L1+ members and a KYC document for L2. Currently: {l1PlusVouches.length}/3</span>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">ID Document Type</label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue placeholder="Select document type..." /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information for the reviewer..."
                    maxLength={500}
                  />
                </div>
                <Button
                  onClick={() => requestVerification.mutate()}
                  disabled={
                    requestVerification.isPending ||
                    (currentLevel === 0 && !canRequestL1) ||
                    (currentLevel === 1 && !canRequestL2)
                  }
                  className="gradient-warm text-primary-foreground"
                >
                  Submit Verification Request
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {currentLevel >= 2 && (
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Level 3 — Admin Granted</p>
              <p className="text-xs text-muted-foreground mt-0.5">L3 (Senior) is reserved for community leaders and is granted directly by a Global Admin. Contact your chapter admin to be nominated.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overseas Verified Tier */}
      <Card className="shadow-card">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              Overseas Verified (NRI Tier)
              {(member as Record<string, unknown>)?.overseas_verified && (
                <Badge className="text-xs bg-secondary/20 text-secondary border-0">Active</Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              For NRI/overseas members: the "Overseas Verified" designation is approved by your local chapter Samiti President and certifies diaspora community membership. Contact your chapter admin to apply.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vouch Lineage */}
      {vouches && vouches.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Vouch Lineage</CardTitle>
            <CardDescription>Members who have vouched for you and their trust level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vouches.map((v) => {
                const voucher = v.voucher as { first_name: string; last_name: string; verification_level: number } | null;
                const lvl = voucher?.verification_level ?? 0;
                return (
                  <div key={v.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {voucher?.first_name?.[0]}{voucher?.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{voucher?.first_name} {voucher?.last_name}</p>
                    </div>
                    <Badge aria-label={`Voucher trust level ${lvl}`} className={`text-xs border-0 ${lvl >= 2 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : lvl === 1 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                      L{lvl} {lvl >= 2 ? "Trusted" : lvl === 1 ? "Verified" : "Basic"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {verificationRequests && verificationRequests.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {verificationRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium">Level {r.requested_level}</span>
                    <span className="text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
