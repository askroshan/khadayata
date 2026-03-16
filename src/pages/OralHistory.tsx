import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mic, Video, Upload, Play, Clock, Tag, Search } from "lucide-react";
import { usePermissions } from "@/hooks/useRoles";
import { ReportDialog } from "@/components/ReportDialog";

export default function OralHistory() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { canManageOralHistories } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [elderOnly, setElderOnly] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", narrator_name: "", media_type: "audio" as "audio" | "video",
    recorded_date: "", tags: "",
  });
  const [uploading, setUploading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const { data: histories } = useQuery({
    queryKey: ["oral-histories", search, tagFilter, elderOnly],
    queryFn: async () => {
      let q = supabase.from("oral_histories").select("*, narrator:members!oral_histories_narrator_member_id_fkey(first_name, last_name)").eq("status", "published");
      if (elderOnly) {
        q = q.eq("elder_priority", true).order("created_at", { ascending: false });
      } else {
        q = q.order("elder_priority", { ascending: false }).order("created_at", { ascending: false });
      }
      if (search.trim()) q = q.or(`title.ilike.%${search}%,narrator_name.ilike.%${search}%`);
      if (tagFilter) q = q.contains("tags", [tagFilter]);
      const { data } = await q.limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Get unique tags for filter
  const allTags = [...new Set(histories?.flatMap((h) => h.tags ?? []) ?? [])].sort();

  const handleUploadClick = () => {
    if (!form.title.trim()) {
      toast({ title: "Validation Error", description: "Title is required.", variant: "destructive" });
      return;
    }
    if (!mediaFile) {
      toast({ title: "Validation Error", description: "Media file is required. Please select an audio or video file.", variant: "destructive" });
      return;
    }
    uploadHistory.mutate();
  };

  const uploadHistory = useMutation({
    mutationFn: async () => {
      if (!member || !mediaFile) throw new Error("Not ready");
      setUploading(true);

      // Upload media file
      const ext = mediaFile.name.split(".").pop();
      const filePath = `${member.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("oral-histories").upload(filePath, mediaFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("oral-histories").getPublicUrl(filePath);

      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

      const memberAge = member.dob ? Math.floor((Date.now() - new Date(member.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
      const isElder = memberAge >= 70;

      const { error } = await supabase.from("oral_histories").insert({
        title: form.title,
        description: form.description || null,
        narrator_name: form.narrator_name || null,
        narrator_member_id: member.id,
        media_url: publicUrl,
        media_type: form.media_type,
        recorded_date: form.recorded_date || null,
        tags,
        uploaded_by: member.id,
        status: canManageOralHistories ? "published" : "pending",
        elder_priority: isElder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Oral history uploaded!" });
      setForm({ title: "", description: "", narrator_name: "", media_type: "audio", recorded_date: "", tags: "" });
      setMediaFile(null);
      queryClient.invalidateQueries({ queryKey: ["oral-histories"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    onSettled: () => setUploading(false),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="Oral History Project">
      <div className="space-y-6">
        <div className="gradient-hero p-6 sm:p-8 text-primary-foreground">
          <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" /> Oral History Project
          </h1>
          <p className="text-primary-foreground/70 mt-1 max-w-md text-sm">
            Preserving community stories, elder wisdom, and cultural memories through audio and video recordings.
          </p>
        </div>

        <div className="px-3 sm:px-6 pb-6 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search stories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Filter by tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tags</SelectItem>
                  {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button
              variant={elderOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setElderOnly(!elderOnly)}
              className={elderOnly ? "gradient-warm text-primary-foreground" : ""}
            >
              Param Pujaniya
            </Button>
            {member && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gradient-warm text-primary-foreground"><Upload className="w-4 h-4 mr-1" />Upload Story</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Upload Oral History</DialogTitle>
                    <DialogDescription>Share an audio or video recording of a community story, memory, or cultural narrative.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Grandfather's journey to East Africa" /></div>
                    <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief context about this recording..." rows={3} maxLength={2000} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Narrator Name</Label><Input value={form.narrator_name} onChange={(e) => setForm({ ...form, narrator_name: e.target.value })} /></div>
                      <div>
                        <Label>Media Type</Label>
                        <Select value={form.media_type} onValueChange={(v) => setForm({ ...form, media_type: v as "audio" | "video" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="audio"><Mic className="w-3 h-3 inline mr-1" />Audio</SelectItem>
                            <SelectItem value="video"><Video className="w-3 h-3 inline mr-1" />Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Date Recorded</Label><Input type="date" value={form.recorded_date} onChange={(e) => setForm({ ...form, recorded_date: e.target.value })} /></div>
                    <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="migration, traditions, festivals" /></div>
                    <div>
                      <Label>Media File *</Label>
                      <input ref={fileInputRef} type="file" accept={form.media_type === "audio" ? "audio/*" : "video/*"} onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20 mt-1" />
                    </div>
                    <Button onClick={handleUploadClick} disabled={uploading} className="w-full gradient-hero text-primary-foreground">
                      {uploading ? "Uploading..." : "Upload Story"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Stories Grid */}
          {(!histories || histories.length === 0) ? (
            <Card className="shadow-card"><CardContent className="text-center py-16"><Mic className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No oral histories yet. Be the first to share a story!</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {histories.map((h) => (
                <Card key={h.id} className="shadow-card hover:shadow-elevated transition-all overflow-hidden group">
                  <div className={`h-2 ${h.media_type === "video" ? "gradient-jewel" : "gradient-warm"}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${h.media_type === "video" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
                        {h.media_type === "video" ? <Video className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-sm group-hover:text-primary transition-colors truncate">{h.title}</h3>
                          {h.elder_priority && (
                            <Badge className="text-[10px] bg-gold/20 text-gold-foreground border-0 shrink-0">Param Pujaniya</Badge>
                          )}
                        </div>
                        {h.narrator_name && <p className="text-xs text-muted-foreground">Narrated by {h.narrator_name}</p>}
                      </div>
                    </div>
                    {h.description && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{h.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(h.tags ?? []).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10" onClick={() => setTagFilter(tag)}>
                          <Tag className="w-2.5 h-2.5 mr-0.5" />{tag}
                        </Badge>
                      ))}
                    </div>
                    {h.media_url && (
                      <div className="mt-3">
                        {h.media_type === "video" ? (
                          <video src={h.media_url} controls className="w-full rounded-lg" preload="metadata" />
                        ) : (
                          <audio src={h.media_url} controls className="w-full" preload="metadata" />
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {h.recorded_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(h.recorded_date).toLocaleDateString()}</span>}
                        {h.duration_seconds && <span>{Math.floor(h.duration_seconds / 60)}:{String(h.duration_seconds % 60).padStart(2, "0")}</span>}
                      </div>
                      <ReportDialog
                        entityType="oral_history"
                        entityId={h.id}
                        entityName={h.title}
                        variant="icon"
                        className="h-7 w-7 opacity-60 hover:opacity-100"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
