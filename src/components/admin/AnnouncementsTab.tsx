import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Megaphone, CreditCard as Edit, Trash2, Globe, Building2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  chapter_id: string | null;
  created_at: string;
}

interface AnnouncementsTabProps {
  announcements: Announcement[] | undefined;
  myChapterId: string | null;
}

export default function AnnouncementsTab({ announcements, myChapterId }: AnnouncementsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleError, setTitleError] = useState("");
  const [scope, setScope] = useState<"global" | "chapter">(myChapterId ? "chapter" : "global");
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const chapter_id = scope === "chapter" && myChapterId ? myChapterId : null;
      const { error } = await supabase.from("announcements").insert({ title: title.trim(), body: body.trim() || null, created_by: user!.id, chapter_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Announcement created!" });
      setTitle("");
      setBody("");
      setTitleError("");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Announcement deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateAnnouncement = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("announcements").update({ title: editTitle.trim(), body: editBody.trim() || null }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Announcement updated" });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handlePublish = () => {
    if (!title.trim()) {
      setTitleError("Title is required");
      toast({ title: "Validation Error", description: "Title cannot be empty.", variant: "destructive" });
      return;
    }
    setTitleError("");
    create.mutate();
  };

  return (
    <div className="space-y-4">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update the announcement content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={200} /></div>
            <div><Label>Body</Label><Textarea value={editBody} onChange={e => setEditBody(e.target.value)} maxLength={1000} /></div>
            <Button onClick={() => updateAnnouncement.mutate()} disabled={!editTitle.trim() || updateAnnouncement.isPending} className="w-full gradient-hero text-primary-foreground">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" />New Announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Input
              placeholder="Title *"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(""); }}
              maxLength={200}
              className={titleError ? "border-destructive" : ""}
              aria-required="true"
            />
            {titleError && <p className="text-xs text-destructive mt-1">{titleError}</p>}
          </div>
          <Textarea placeholder="Body (optional)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
          {myChapterId && (
            <div>
              <Label className="text-xs mb-2 block">Audience</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={scope === "chapter" ? "default" : "outline"}
                  onClick={() => setScope("chapter")}
                  className="flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />Chapter Only
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scope === "global" ? "default" : "outline"}
                  onClick={() => setScope("global")}
                  className="flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />All Members
                </Button>
              </div>
            </div>
          )}
          <Button onClick={handlePublish} disabled={create.isPending} className="gradient-hero text-primary-foreground">Publish</Button>
        </CardContent>
      </Card>

      {announcements?.map((a) => (
        <Card key={a.id} className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.chapter_id
                    ? <Badge variant="outline" className="text-xs"><Building2 className="w-3 h-3 mr-1" />Chapter</Badge>
                    : <Badge variant="secondary" className="text-xs"><Globe className="w-3 h-3 mr-1" />Global</Badge>
                  }
                </div>
                {a.body && <p className="text-sm text-muted-foreground mt-1">{a.body}</p>}
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit announcement" onClick={() => {
                  setEditId(a.id);
                  setEditTitle(a.title);
                  setEditBody(a.body ?? "");
                  setEditOpen(true);
                }}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete announcement">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                      <AlertDialogDescription>Permanently delete "{a.title}"? This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteAnnouncement.mutate(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
