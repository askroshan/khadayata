import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Heart, ChevronRight, CircleCheck as CheckCircle2, Circle as XCircle, Clock, Users, MessageCircle, Undo2, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type RishtaStatus = "intro_sent" | "family_review" | "family_approved" | "accepted" | "declined" | "withdrawn";

interface RishtaRequest {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  status: RishtaStatus;
  intro_message: string | null;
  from_family_ok: boolean | null;
  to_family_ok: boolean | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  from_profile: {
    id: string;
    member: { first_name: string; last_name: string } | null;
  } | null;
  to_profile: {
    id: string;
    member: { first_name: string; last_name: string } | null;
  } | null;
}

const STATUS_CONFIG: Record<RishtaStatus, { label: string; color: string; icon: typeof Clock }> = {
  intro_sent:      { label: "Introduction Sent",  color: "bg-blue-100 text-blue-700",    icon: MessageCircle },
  family_review:   { label: "Family Review",      color: "bg-amber-100 text-amber-700",  icon: Users },
  family_approved: { label: "Family Approved",    color: "bg-primary/20 text-primary",   icon: CheckCircle2 },
  accepted:        { label: "Accepted",           color: "bg-success/20 text-success",   icon: Heart },
  declined:        { label: "Declined",           color: "bg-destructive/20 text-destructive", icon: XCircle },
  withdrawn:       { label: "Withdrawn",          color: "bg-muted text-muted-foreground", icon: Undo2 },
};

function StatusBadge({ status }: { status: RishtaStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.intro_sent;
  const Icon = cfg.icon;
  return (
    <Badge className={`text-xs ${cfg.color} border-0 flex items-center gap-1`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </Badge>
  );
}

function RishtaCard({
  req,
  myProfileId,
  onUpdate,
}: {
  req: RishtaRequest;
  myProfileId: string;
  onUpdate: (id: string, status: RishtaStatus, familyField?: "from_family_ok" | "to_family_ok") => void;
}) {
  const isSender = req.from_profile_id === myProfileId;
  const otherProfile = isSender ? req.to_profile : req.from_profile;
  const otherName = `${otherProfile?.member?.first_name ?? ""} ${otherProfile?.member?.last_name ?? ""}`.trim();

  const canFamilyApprove =
    req.status === "family_review" &&
    ((isSender && req.from_family_ok === null) || (!isSender && req.to_family_ok === null));

  const canAcceptDecline = req.status === "family_approved" && !isSender;
  const canEscalate = isSender && req.status === "intro_sent";
  const canWithdraw = isSender && (req.status === "intro_sent" || req.status === "family_review");

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={req.status} />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(req.updated_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm font-medium">
              {isSender ? "You → " : ""}
              <span className="text-primary">{otherName || "Unknown"}</span>
              {!isSender ? " → You" : ""}
            </p>
            {req.intro_message && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{req.intro_message}"</p>
            )}

            {/* Family approval status */}
            {(req.status === "family_review" || req.status === "family_approved") && (
              <div className="mt-2 flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  {req.from_family_ok === true ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    : req.from_family_ok === false ? <XCircle className="w-3.5 h-3.5 text-destructive" />
                    : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                  <span className="text-muted-foreground">Sender's family</span>
                </div>
                <div className="flex items-center gap-1">
                  {req.to_family_ok === true ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    : req.to_family_ok === false ? <XCircle className="w-3.5 h-3.5 text-destructive" />
                    : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                  <span className="text-muted-foreground">Recipient's family</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {canEscalate && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onUpdate(req.id, "family_review")}
              >
                <Users className="w-3 h-3 mr-1" /> Send to Family
              </Button>
            )}
            {canFamilyApprove && (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-success/20 text-success hover:bg-success/30 border-0"
                  onClick={() => onUpdate(req.id, req.status, isSender ? "from_family_ok" : "to_family_ok")}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Family OK
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive border-destructive/30"
                  onClick={() => onUpdate(req.id, "declined")}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Decline
                </Button>
              </>
            )}
            {canAcceptDecline && (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs gradient-warm text-primary-foreground"
                  onClick={() => onUpdate(req.id, "accepted")}
                >
                  <Heart className="w-3 h-3 mr-1" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive border-destructive/30"
                  onClick={() => onUpdate(req.id, "declined")}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Decline
                </Button>
              </>
            )}
            {canWithdraw && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => onUpdate(req.id, "withdrawn")}
              >
                <Undo2 className="w-3 h-3 mr-1" /> Withdraw
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RishtaWorkflowProps {
  myProfileId: string | null;
  targetProfileId?: string;
  introMessage?: string;
  onRequestSent?: () => void;
}

export function RishtaWorkflow({ myProfileId, targetProfileId, introMessage, onRequestSent }: RishtaWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);
  const [message, setMessage] = useState(introMessage ?? "");

  const { data: requests } = useQuery({
    queryKey: ["rishta-requests", myProfileId],
    queryFn: async () => {
      if (!myProfileId) return [];
      const { data } = await supabase
        .from("rishta_requests")
        .select(`
          id, from_profile_id, to_profile_id, status, intro_message,
          from_family_ok, to_family_ok, admin_notes, created_at, updated_at,
          from_profile:matrimonial_profiles!rishta_requests_from_profile_id_fkey(
            id, member:members(first_name, last_name)
          ),
          to_profile:matrimonial_profiles!rishta_requests_to_profile_id_fkey(
            id, member:members(first_name, last_name)
          )
        `)
        .or(`from_profile_id.eq.${myProfileId},to_profile_id.eq.${myProfileId}`)
        .order("updated_at", { ascending: false });
      return (data ?? []) as unknown as RishtaRequest[];
    },
    enabled: !!myProfileId,
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      if (!myProfileId || !targetProfileId) throw new Error("Profile not ready");
      const { error } = await supabase.from("rishta_requests").insert({
        from_profile_id: myProfileId,
        to_profile_id: targetProfileId,
        intro_message: message.trim() || null,
        status: "intro_sent",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rishta request sent!" });
      setSendOpen(false);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["rishta-requests", myProfileId] });
      onRequestSent?.();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateRequest = useMutation({
    mutationFn: async ({
      id,
      status,
      familyField,
    }: {
      id: string;
      status: RishtaStatus;
      familyField?: "from_family_ok" | "to_family_ok";
    }) => {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (familyField) {
        update[familyField] = true;
        const req = requests?.find((r) => r.id === id);
        if (req) {
          const fromOk = familyField === "from_family_ok" ? true : req.from_family_ok;
          const toOk = familyField === "to_family_ok" ? true : req.to_family_ok;
          if (fromOk && toOk) update.status = "family_approved";
        }
      } else {
        update.status = status;
      }

      const { error } = await supabase.from("rishta_requests").update(update as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["rishta-requests", myProfileId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const alreadySent = targetProfileId
    ? requests?.some(
        (r) =>
          (r.from_profile_id === myProfileId && r.to_profile_id === targetProfileId) ||
          (r.to_profile_id === myProfileId && r.from_profile_id === targetProfileId)
      )
    : false;

  if (!myProfileId) return null;

  return (
    <>
      {/* Send button (when viewing someone else's profile) */}
      {targetProfileId && !alreadySent && (
        <Button
          size="sm"
          className="gradient-warm text-primary-foreground"
          onClick={() => setSendOpen(true)}
        >
          <Star className="w-3.5 h-3.5 mr-1" /> Send Rishta
        </Button>
      )}
      {targetProfileId && alreadySent && (
        <Badge variant="outline" className="text-xs">
          <Heart className="w-3 h-3 mr-1 text-secondary" /> Rishta Sent
        </Badge>
      )}

      {/* My rishta requests (inbox/outbox) */}
      {!targetProfileId && requests && requests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-secondary" /> Rishta Requests ({requests.length})
          </p>
          {requests.map((req) => (
            <RishtaCard
              key={req.id}
              req={req}
              myProfileId={myProfileId}
              onUpdate={(id, status, familyField) =>
                updateRequest.mutate({ id, status, familyField })
              }
            />
          ))}
        </div>
      )}

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Send Rishta Request</DialogTitle>
            <DialogDescription>
              Your introduction will be shared with the recipient's family for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-3 text-sm space-y-1">
              <p className="font-semibold text-secondary flex items-center gap-1"><ChevronRight className="w-4 h-4" /> Rishta Workflow</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside ml-1">
                <li>Introduction sent to recipient</li>
                <li>Both families review and approve</li>
                <li>Recipient accepts or declines</li>
              </ol>
            </div>
            <div>
              <Label htmlFor="rishta-message">Introduction Message (optional)</Label>
              <Textarea
                id="rishta-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself and your family..."
                maxLength={1000}
                rows={4}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => sendRequest.mutate()}
              disabled={sendRequest.isPending}
              className="w-full gradient-warm text-primary-foreground"
            >
              <Heart className="w-4 h-4 mr-1" /> Send Rishta Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
