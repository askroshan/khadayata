import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, ArrowRight } from "lucide-react";

export default function ChapterTransfersTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transfers } = useQuery({
    queryKey: ["admin-chapter-transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_transfers")
        .select("*, members(first_name, last_name), from_ch:chapters!chapter_transfers_from_chapter_id_fkey(name), to_ch:chapters!chapter_transfers_to_chapter_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, memberId, toChapterId }: { id: string; status: string; memberId?: string; toChapterId?: string | null }) => {
      const { error } = await supabase
        .from("chapter_transfers")
        .update({ status, approved_by: user!.id })
        .eq("id", id);
      if (error) throw error;
      // If approved, update the member's chapter
      if (status === "approved" && memberId && toChapterId) {
        const { error: memberErr } = await supabase.from("members").update({ chapter_id: toChapterId }).eq("id", memberId);
        if (memberErr) throw memberErr;
      }
    },
    onSuccess: (_, { status }) => {
      toast({ title: `Transfer ${status}` });
      queryClient.invalidateQueries({ queryKey: ["admin-chapter-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pending = transfers?.filter((t) => t.status === "pending") ?? [];
  const resolved = transfers?.filter((t) => t.status !== "pending") ?? [];

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm">Pending Transfers ({pending.length})</h3>
          {pending.length === 0 && <p className="text-muted-foreground text-center py-4 text-sm">No pending transfer requests</p>}
          {pending.map((t) => {
            const member = t.members as unknown as { first_name: string; last_name: string } | null;
            const from = t.from_ch as unknown as { name: string } | null;
            const to = t.to_ch as unknown as { name: string } | null;
            return (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">
                  <span className="font-medium">{member?.first_name} {member?.last_name}</span>
                  <span className="flex items-center gap-1 text-muted-foreground mt-0.5">
                    {from?.name ?? "None"} <ArrowRight className="w-3 h-3" /> {to?.name ?? "None"}
                  </span>
                  {t.reason && <p className="text-xs text-muted-foreground mt-0.5">{t.reason}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-success" disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: t.id, status: "approved", memberId: t.member_id, toChapterId: t.to_chapter_id })}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive" disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: t.id, status: "rejected" })}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      {resolved.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-display font-semibold text-sm">Resolved</h3>
            {resolved.map((t) => {
              const member = t.members as unknown as { first_name: string; last_name: string } | null;
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <span>{member?.first_name} {member?.last_name}</span>
                  <Badge variant={t.status === "approved" ? "default" : "destructive"} className="capitalize">{t.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
