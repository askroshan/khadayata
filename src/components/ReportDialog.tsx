import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/hooks/useMember";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Flag, TriangleAlert as AlertTriangle } from "lucide-react";

const REPORT_CATEGORIES = [
  { value: "fake", label: "Fake / Fraudulent" },
  { value: "non_khadayata", label: "Non-Khadayata" },
  { value: "harassment", label: "Harassment" },
  { value: "obscene", label: "Obscene Content" },
];

type EntityType = "member" | "business" | "job" | "event" | "news" | "matrimonial_profile" | "oral_history" | "mentorship";

interface ReportDialogProps {
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  variant?: "icon" | "button" | "menu";
  className?: string;
}

export function ReportDialog({ entityType, entityId, entityName, variant = "icon", className }: ReportDialogProps) {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");

  const submitReport = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("You must be logged in to report");
      if (!category) throw new Error("Please select a category");

      const { error } = await supabase.from("reports").insert({
        reporter_member_id: member.id,
        entity_type: entityType,
        entity_id: entityId,
        category,
        reason: reason.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
      setOpen(false);
      setCategory("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const entityLabel = {
    member: "member",
    business: "business",
    job: "job listing",
    event: "event",
    news: "news article",
    matrimonial_profile: "matrimonial profile",
    oral_history: "oral history",
    mentorship: "mentor profile",
  }[entityType];

  const trigger = variant === "icon" ? (
    <Button variant="ghost" size="icon" className={className} aria-label={`Report ${entityLabel}`} title={`Report ${entityLabel}`}>
      <Flag className="w-4 h-4 text-muted-foreground hover:text-destructive" aria-hidden="true" />
    </Button>
  ) : variant === "menu" ? (
    <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded">
      <Flag className="w-4 h-4" /> Report
    </button>
  ) : (
    <Button variant="outline" size="sm" className={className}>
      <Flag className="w-3.5 h-3.5 mr-1.5" /> Report
    </Button>
  );

  if (!member) {
    return null; // Only show for logged-in users
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Report {entityLabel}
          </DialogTitle>
          <DialogDescription>
            {entityName ? `Reporting: ${entityName}` : `Report this ${entityLabel} to administrators`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Reason for reporting *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Additional details (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Please provide any additional context that might help us review this report..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{reason.length}/1000</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => submitReport.mutate()}
            disabled={!category || submitReport.isPending}
          >
            {submitReport.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
