import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Plus, Trash2, Zap, TriangleAlert as AlertTriangle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_CONFIG = {
  low: { label: "Low", color: "bg-blue-100 text-blue-700 border-blue-200" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200" },
  high: { label: "High", color: "bg-destructive/20 text-destructive border-destructive/30" },
};

export default function BannedKeywordsTab() {
  const { user } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");

  const { data: keywords, isLoading } = useQuery({
    queryKey: ["banned-keywords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_keywords")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const addKeyword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("banned_keywords").insert({
        keyword: keyword.trim().toLowerCase(),
        severity,
        added_by: member?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Keyword added to blocklist" });
      setKeyword("");
      queryClient.invalidateQueries({ queryKey: ["banned-keywords"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banned_keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Keyword removed" });
      queryClient.invalidateQueries({ queryKey: ["banned-keywords"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-destructive" />
        <div>
          <h2 className="text-base font-display font-semibold">Auto-Flagging Keywords</h2>
          <p className="text-xs text-muted-foreground">
            Content containing these keywords is automatically flagged for review via the Reports system.
          </p>
        </div>
      </div>

      <Card className="shadow-card border-blue-200/50 bg-blue-50/30">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            Triggers are active on <strong>News</strong> and <strong>Oral Histories</strong>.
            When a match is found, a system report is created automatically with the keyword and severity.
          </p>
        </CardContent>
      </Card>

      {/* Add new keyword */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Add Keyword
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter keyword or phrase..."
              maxLength={100}
              onKeyDown={(e) => e.key === "Enter" && keyword.trim() && addKeyword.mutate()}
              className="flex-1"
            />
            <Select value={severity} onValueChange={(v) => setSeverity(v as "low" | "medium" | "high")}>
              <SelectTrigger className="w-32" aria-label="Severity"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => addKeyword.mutate()}
              disabled={!keyword.trim() || addKeyword.isPending}
              className="gradient-hero text-primary-foreground shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyword list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : !keywords?.length ? (
        <Card className="shadow-card">
          <CardContent className="py-10 text-center">
            <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No banned keywords yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {keywords.map((kw) => {
            const config = SEVERITY_CONFIG[kw.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
            return (
              <div
                key={kw.id}
                className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border border-border bg-card text-sm group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${kw.severity === "high" ? "text-destructive" : kw.severity === "medium" ? "text-amber-600" : "text-blue-600"}`} />
                  <code className="font-mono text-sm font-medium">{kw.keyword}</code>
                  <Badge className={`text-xs border ${config.color}`}>{config.label}</Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDistanceToNow(new Date(kw.created_at), { addSuffix: true })}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove keyword"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Keyword</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove "<code>{kw.keyword}</code>" from the blocklist? New content with this keyword will no longer be auto-flagged.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeKeyword.mutate(kw.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground text-right">{keywords.length} keyword{keywords.length !== 1 ? "s" : ""} in blocklist</p>
        </div>
      )}
    </div>
  );
}
