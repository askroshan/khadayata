import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Star, UserCheck, Clock, CircleCheck as CheckCircle2, Circle as XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SakhaEndorsementProps {
  targetMemberId: string;
  currentMemberId: string | null;
  currentMemberLevel: number;
  targetMemberLevel: number;
  isOwnProfile: boolean;
}

const SAKHA_LEVEL = 3;

export function SakhaEndorsement({
  targetMemberId,
  currentMemberId,
  currentMemberLevel,
  targetMemberLevel,
  isOwnProfile,
}: SakhaEndorsementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const canEndorse = currentMemberLevel >= SAKHA_LEVEL && !isOwnProfile && targetMemberLevel < SAKHA_LEVEL;

  const { data: endorsements } = useQuery({
    queryKey: ["sakha-endorsements", targetMemberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*, reviewer:members!verification_requests_reviewer_user_id_fkey(first_name, last_name, verification_level)")
        .eq("member_id", targetMemberId)
        .eq("requested_level", SAKHA_LEVEL)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!targetMemberId,
  });

  const { data: alreadyEndorsed } = useQuery({
    queryKey: ["sakha-my-endorsement", targetMemberId, currentMemberId],
    queryFn: async () => {
      if (!currentMemberId) return false;
      const { data } = await supabase
        .from("verification_requests")
        .select("id")
        .eq("member_id", targetMemberId)
        .eq("requested_level", SAKHA_LEVEL)
        .eq("status", "endorsed")
        .maybeSingle();
      return !!data;
    },
    enabled: !!currentMemberId && !isOwnProfile,
  });

  const endorse = useMutation({
    mutationFn: async () => {
      if (!currentMemberId) throw new Error("Not logged in as a member");
      const { data: currentUser } = await supabase.auth.getUser();
      const { error } = await supabase.from("verification_requests").insert({
        member_id: targetMemberId,
        requested_level: SAKHA_LEVEL,
        status: "endorsed",
        notes: `Sakha endorsement by L${currentMemberLevel} member. ${note.trim()}`,
        reviewer_user_id: currentUser.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sakha endorsement submitted!" });
      setNote("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sakha-endorsements", targetMemberId] });
      queryClient.invalidateQueries({ queryKey: ["sakha-my-endorsement", targetMemberId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const endorsedCount = endorsements?.filter((e) => e.status === "endorsed").length ?? 0;
  const pendingCount = endorsements?.filter((e) => e.status === "pending").length ?? 0;
  const hasSakha = targetMemberLevel >= SAKHA_LEVEL;

  if (!endorsements?.length && !canEndorse && !hasSakha) return null;

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Star className="w-4 h-4 text-gold" /> Sakha Verification
          {hasSakha && (
            <Badge className="bg-primary/20 text-primary border-0 text-xs ml-auto">
              <Shield className="w-3 h-3 mr-1" /> Sakha Verified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Sakha (L3) status verifies confirmed Khandelwal lineage through elder endorsement.
          Requires endorsement from existing L3+ community members.
        </p>

        {/* Endorsement count */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="font-semibold">{endorsedCount}</span>
            <span className="text-muted-foreground">endorsement{endorsedCount !== 1 ? "s" : ""}</span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">{pendingCount}</span>
              <span className="text-muted-foreground">pending</span>
            </div>
          )}
        </div>

        {/* Endorsement history */}
        {endorsements && endorsements.length > 0 && (
          <div className="space-y-1.5">
            {endorsements.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-border last:border-0">
                {e.status === "endorsed"
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  : e.status === "rejected"
                  ? <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  : <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <span className="font-medium capitalize">{e.status}</span>
                  {e.notes && <span className="text-muted-foreground ml-1.5">{e.notes}</span>}
                </div>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Endorse button */}
        {canEndorse && !alreadyEndorsed && (
          <>
            {!open ? (
              <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Endorse for Sakha Verification
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about your endorsement (optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => endorse.mutate()}
                    disabled={endorse.isPending}
                    className="flex-1 gradient-hero text-primary-foreground"
                  >
                    Submit Endorsement
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {alreadyEndorsed && (
          <p className="text-xs text-success flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> You have already endorsed this member
          </p>
        )}
      </CardContent>
    </Card>
  );
}
