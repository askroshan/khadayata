import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Tag, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TagRequest {
  id: string;
  term: string;
  type: string;
  status: string;
  reason: string | null;
}

interface TagRequestsTabProps {
  tagRequests: TagRequest[] | undefined;
}

export default function TagRequestsTab({ tagRequests }: TagRequestsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tag_requests")
        .update({ status, decided_by: user!.id, decided_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: `Tag request ${status}` });
      queryClient.invalidateQueries({ queryKey: ["admin-tag-requests"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pending = tagRequests?.filter((t) => t.status === "pending") ?? [];
  const approved = tagRequests?.filter((t) => t.status === "approved") ?? [];
  const rejected = tagRequests?.filter((t) => t.status === "rejected") ?? [];

  const renderRow = (tr: TagRequest, showActions: boolean) => (
    <div key={tr.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-sm">{tr.term}</span>
        <Badge variant="outline" className="text-xs">{tr.type}</Badge>
        {tr.reason && <span className="text-xs text-muted-foreground italic">"{tr.reason}"</span>}
      </div>
      {showActions ? (
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 text-success" disabled={decide.isPending} onClick={() => decide.mutate({ id: tr.id, status: "approved" })}>
            <Check className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-destructive" disabled={decide.isPending} onClick={() => decide.mutate({ id: tr.id, status: "rejected" })}>
            <X className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      ) : (
        <Badge variant={tr.status === "approved" ? "default" : "destructive"} className="capitalize shrink-0">{tr.status}</Badge>
      )}
    </div>
  );

  return (
    <Tabs defaultValue="pending">
      <TabsList className="mb-4">
        <TabsTrigger value="pending">
          Pending
          {pending.length > 0 && <span className="ml-1.5 rounded-full bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 font-medium">{pending.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="approved">
          Approved
          {approved.length > 0 && <span className="ml-1.5 rounded-full bg-success/20 text-success text-xs px-1.5 py-0.5 font-medium">{approved.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="rejected">
          Rejected
          {rejected.length > 0 && <span className="ml-1.5 rounded-full bg-destructive/15 text-destructive text-xs px-1.5 py-0.5 font-medium">{rejected.length}</span>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-0">
            {pending.length === 0 && <p className="text-muted-foreground text-center py-6 text-sm">No pending tag requests</p>}
            {pending.map((tr) => renderRow(tr, true))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="approved">
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-0">
            {approved.length === 0 && <p className="text-muted-foreground text-center py-6 text-sm">No approved tag requests yet</p>}
            {approved.map((tr) => renderRow(tr, false))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rejected">
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-0">
            {rejected.length === 0 && <p className="text-muted-foreground text-center py-6 text-sm">No rejected tag requests yet</p>}
            {rejected.map((tr) => renderRow(tr, false))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
