import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, Eye, Clock, Trash2, ExternalLink, Pin } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-gold/20 text-gold-foreground",
  published: "bg-success/20 text-success",
  archived: "bg-muted/60 text-muted-foreground",
};

interface Props {
  myChapterId: string | null;
}

export default function NewsPublisherTab({ myChapterId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("__all__");

  const { data: articles } = useQuery({
    queryKey: ["publisher-articles", user?.id, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("content_news")
        .select("*, chapters(name)")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter !== "__all__") q = q.eq("status", statusFilter);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: flaggedArticles } = useQuery({
    queryKey: ["publisher-flagged", user?.id],
    queryFn: async () => {
      const { data: myArticles } = await supabase
        .from("content_news")
        .select("id")
        .eq("created_by", user!.id);
      if (!myArticles?.length) return [];
      const ids = myArticles.map(a => a.id);
      const { data } = await supabase
        .from("reports")
        .select("entity_id, category, created_at")
        .eq("entity_type", "news")
        .in("entity_id", ids)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("content_news")
        .update({
          status,
          published_at: status === "published" ? new Date().toISOString() : undefined,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Article status updated" });
      queryClient.invalidateQueries({ queryKey: ["publisher-articles"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Article deleted" });
      queryClient.invalidateQueries({ queryKey: ["publisher-articles"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const stats = {
    total: articles?.length ?? 0,
    published: articles?.filter(a => a.status === "published").length ?? 0,
    drafts: articles?.filter(a => a.status === "draft").length ?? 0,
    flagged: flaggedArticles?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Articles", value: stats.total, color: "text-primary" },
          { label: "Published", value: stats.published, color: "text-success" },
          { label: "Drafts", value: stats.drafts, color: "text-gold-foreground" },
          { label: "Flagged Reports", value: stats.flagged, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {flaggedArticles && flaggedArticles.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-destructive">Articles with flag reports</p>
            <div className="space-y-1">
              {flaggedArticles.map(f => (
                <div key={f.entity_id + f.created_at} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Entity: {f.entity_id.slice(0, 8)}...</span>
                  <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                  <span>{format(new Date(f.created_at), "d MMM")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display font-semibold">My Articles</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Under Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/news">
            <Button size="sm" className="gradient-hero text-primary-foreground gap-1">
              <Newspaper className="w-3.5 h-3.5" />Write Article
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!articles?.length && (
          <div className="text-center py-16">
            <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No articles yet. Go to /news to write your first article.</p>
          </div>
        )}
        {articles?.map(a => (
          <Card key={a.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm truncate max-w-xs">{a.title}</h3>
                    <Badge className={`${STATUS_COLORS[a.status] ?? ""} text-[10px] capitalize px-1.5 py-0 h-4`}>{a.status}</Badge>
                    {(a as Record<string, unknown>).pinned && (
                      <Badge className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0 h-4">
                        <Pin className="w-2.5 h-2.5 mr-0.5" />Pinned
                      </Badge>
                    )}
                    {a.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{a.category}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(a.created_at), "d MMM yyyy")}</span>
                    {a.views_count > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views_count} views</span>}
                    {(a.chapters as { name: string } | null)?.name && <span>{(a.chapters as { name: string } | null)?.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Select
                    value={a.status}
                    onValueChange={v => updateStatus.mutate({ id: a.id, status: v })}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Under Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Link to={`/news/${a.id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="View article">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete article">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Article</AlertDialogTitle>
                        <AlertDialogDescription>Permanently delete "{a.title}"? This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteArticle.mutate(a.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
