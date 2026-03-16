import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Crown, Plus, ChevronUp, ChevronDown, MessageCircle, Pin, Lock, ChartBar as BarChart2, Megaphone, Scroll, Globe, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  { value: "general", label: "General", icon: Globe },
  { value: "governance", label: "Governance", icon: Crown },
  { value: "tradition", label: "Tradition", icon: Scroll },
  { value: "announcement", label: "Announcement", icon: Megaphone },
  { value: "poll", label: "Poll", icon: BarChart2 },
];

interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  closed: boolean;
  pinned: boolean;
  created_at: string;
  author: { first_name: string; last_name: string; verification_level: number } | null;
  reply_count?: number;
  vote_sum?: number;
  my_vote?: number | null;
}

function ThreadCard({
  thread,
  myMemberId,
  onOpen,
}: {
  thread: Thread;
  myMemberId: string | null;
  onOpen: (t: Thread) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const vote = useMutation({
    mutationFn: async (v: 1 | -1) => {
      if (!myMemberId) throw new Error("Not a member");
      if (thread.my_vote === v) {
        await supabase.from("council_votes").delete().eq("thread_id", thread.id).eq("member_id", myMemberId);
      } else {
        await supabase.from("council_votes").upsert({ thread_id: thread.id, member_id: myMemberId, vote: v }, { onConflict: "thread_id,member_id" });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["council-threads"] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const cat = CATEGORIES.find((c) => c.value === thread.category);
  const CatIcon = cat?.icon ?? Globe;

  return (
    <Card className={`shadow-card hover:shadow-elevated transition-all cursor-pointer ${thread.pinned ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); vote.mutate(1); }}
              className={`p-1 rounded hover:bg-muted transition-colors ${thread.my_vote === 1 ? "text-success" : "text-muted-foreground"}`}
              aria-label="Upvote"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold tabular-nums ${(thread.vote_sum ?? 0) > 0 ? "text-success" : (thread.vote_sum ?? 0) < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {thread.vote_sum ?? 0}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); vote.mutate(-1); }}
              className={`p-1 rounded hover:bg-muted transition-colors ${thread.my_vote === -1 ? "text-destructive" : "text-muted-foreground"}`}
              aria-label="Downvote"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0" onClick={() => onOpen(thread)}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {thread.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
              {thread.closed && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <CatIcon className="w-3 h-3" />{cat?.label ?? thread.category}
              </Badge>
            </div>
            <h3 className="font-display font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2">
              {thread.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{thread.body}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {thread.author?.first_name} {thread.author?.last_name}
              </span>
              <span>L{thread.author?.verification_level ?? 0}</span>
              <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> {thread.reply_count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ThreadDialog({
  thread,
  myMemberId,
  open,
  onClose,
}: {
  thread: Thread | null;
  myMemberId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [reply, setReply] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: replies } = useQuery({
    queryKey: ["council-replies", thread?.id],
    queryFn: async () => {
      if (!thread) return [];
      const { data } = await supabase
        .from("council_replies")
        .select("*, author:members!council_replies_author_id_fkey(first_name, last_name, verification_level)")
        .eq("thread_id", thread.id)
        .order("created_at");
      return data ?? [];
    },
    enabled: !!thread && open,
  });

  const postReply = useMutation({
    mutationFn: async () => {
      if (!myMemberId || !thread) throw new Error("Not ready");
      const { error } = await supabase.from("council_replies").insert({
        thread_id: thread.id,
        author_id: myMemberId,
        body: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reply posted" });
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["council-replies", thread?.id] });
      queryClient.invalidateQueries({ queryKey: ["council-threads"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!thread) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-lg leading-snug pr-8">{thread.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{thread.author?.first_name} {thread.author?.last_name}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
              {thread.closed && <Badge variant="outline" className="text-xs"><Lock className="w-3 h-3 mr-1" />Closed</Badge>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{thread.body}</p>
          <Separator />
          {replies?.map((r) => (
            <div key={r.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                {(r.author as { first_name: string } | null)?.first_name?.[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="font-semibold">{(r.author as { first_name: string; last_name: string } | null)?.first_name} {(r.author as { first_name: string; last_name: string } | null)?.last_name}</span>
                  <span className="text-muted-foreground">L{(r.author as { verification_level: number } | null)?.verification_level ?? 0}</span>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        {!thread.closed && (
          <div className="pt-4 border-t border-border space-y-2">
            <Label htmlFor="reply-input" className="sr-only">Your reply</Label>
            <Textarea
              id="reply-input"
              placeholder="Add your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={2000}
              rows={2}
            />
            <Button
              size="sm"
              onClick={() => postReply.mutate()}
              disabled={!reply.trim() || postReply.isPending || !myMemberId}
              className="gradient-hero text-primary-foreground"
            >
              Post Reply
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function EldersCouncil() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({ title: "", body: "", category: "general" });

  const canPost = (member?.verification_level ?? 0) >= 3;

  const { data: threads, isLoading } = useQuery({
    queryKey: ["council-threads", categoryFilter, member?.id],
    queryFn: async () => {
      let q = supabase
        .from("council_threads")
        .select(`
          id, title, body, category, closed, pinned, created_at,
          author:members!council_threads_author_id_fkey(first_name, last_name, verification_level),
          council_replies(id),
          council_votes(vote, member_id)
        `)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((t) => {
        const votes = (t.council_votes as { vote: number; member_id: string }[]) ?? [];
        return {
          ...t,
          author: t.author as Thread["author"],
          reply_count: (t.council_replies as unknown[])?.length ?? 0,
          vote_sum: votes.reduce((s, v) => s + v.vote, 0),
          my_vote: votes.find((v) => v.member_id === member?.id)?.vote ?? null,
        } as Thread;
      });
    },
    enabled: !!user,
  });

  const createThread = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("council_threads").insert({
        author_id: member.id,
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Thread created!" });
      setForm({ title: "", body: "", category: "general" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["council-threads"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="Elders Council">
      <div className="space-y-0">
        {/* Hero */}
        <div className="gradient-hero p-6 sm:p-10 text-primary-foreground">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
                <Crown className="w-6 h-6 text-gold" /> Elders Council
              </h1>
              <p className="text-primary-foreground/70 mt-1 max-w-lg text-sm">
                A forum for trusted community members to discuss governance, tradition, and collective decisions.
                {!canPost && <span className="block mt-1 text-xs text-primary-foreground/50">L3+ verification required to post threads. You can still read and reply.</span>}
              </p>
            </div>
            {canPost && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> New Thread
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display">Start a New Thread</DialogTitle>
                    <DialogDescription>Share your thoughts with the council.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="thread-title">Title *</Label>
                      <Input
                        id="thread-title"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Thread title..."
                        maxLength={200}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="thread-body">Body *</Label>
                      <Textarea
                        id="thread-body"
                        value={form.body}
                        onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                        placeholder="Share your thoughts..."
                        maxLength={5000}
                        rows={5}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="thread-category">Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                        <SelectTrigger id="thread-category" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => createThread.mutate()}
                      disabled={!form.title.trim() || !form.body.trim() || createThread.isPending}
                      className="w-full gradient-hero text-primary-foreground"
                    >
                      Post Thread
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-border bg-background sticky top-0 z-10 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" />All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoryFilter(c.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${categoryFilter === c.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              <c.icon className="w-3 h-3" />{c.label}
            </button>
          ))}
        </div>

        {/* Thread list */}
        <div className="px-4 sm:px-6 py-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))
          ) : !threads?.length ? (
            <div className="text-center py-16">
              <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No threads yet.</p>
              {canPost && <p className="text-xs text-muted-foreground mt-1">Be the first to start a discussion.</p>}
            </div>
          ) : (
            threads.map((t) => (
              <ThreadCard
                key={t.id}
                thread={t}
                myMemberId={member?.id ?? null}
                onOpen={setSelectedThread}
              />
            ))
          )}
        </div>
      </div>

      <ThreadDialog
        thread={selectedThread}
        myMemberId={member?.id ?? null}
        open={!!selectedThread}
        onClose={() => setSelectedThread(null)}
      />
    </AppLayout>
  );
}
