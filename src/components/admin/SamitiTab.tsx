import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Plus, Trash2, Pencil } from "lucide-react";

const SAMITI_TYPES = ["Mahila Mandal", "Yuva Samiti", "Senior Citizens", "Cultural", "Sports", "Education", "General"];

interface SamitiTabProps {
  chapterId?: string | null;
}

export default function SamitiTab({ chapterId }: SamitiTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "General", description: "" });
  const [editSamiti, setEditSamiti] = useState<{ id: string; name: string; type: string; description: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: samitis } = useQuery({
    queryKey: ["admin-samitis", chapterId],
    queryFn: async () => {
      let q = supabase.from("samiti_groups").select("*, chapters(name)").order("created_at", { ascending: false });
      if (chapterId) q = q.eq("chapter_id", chapterId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters-list"],
    queryFn: async () => {
      const { data } = await supabase.from("chapters").select("id, name").order("name");
      return data ?? [];
    },
  });

  const [selectedChapter, setSelectedChapter] = useState(chapterId ?? "");

  const createSamiti = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("samiti_groups").insert({
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || null,
        chapter_id: selectedChapter || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sub-group created!" });
      setForm({ name: "", type: "General", description: "" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-samitis"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSamiti = useMutation({
    mutationFn: async () => {
      if (!editSamiti) return;
      const { error } = await supabase.from("samiti_groups").update({
        name: editSamiti.name.trim(),
        type: editSamiti.type,
        description: editSamiti.description.trim() || null,
      }).eq("id", editSamiti.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sub-group updated" });
      setEditSamiti(null);
      queryClient.invalidateQueries({ queryKey: ["admin-samitis"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSamiti = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("samiti_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sub-group removed" });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-samitis"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      {/* Edit Samiti Dialog */}
      <Dialog open={!!editSamiti} onOpenChange={(open) => { if (!open) setEditSamiti(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sub-Group</DialogTitle>
            <DialogDescription>Update the name, type, or description of this samiti/mandal.</DialogDescription>
          </DialogHeader>
          {editSamiti && (
            <div className="space-y-3">
              <div><Label>Group Name *</Label><Input value={editSamiti.name} onChange={e => setEditSamiti({ ...editSamiti, name: e.target.value })} placeholder="e.g. Mahila Mandal" /></div>
              <div>
                <Label>Type</Label>
                <Select value={editSamiti.type} onValueChange={v => setEditSamiti({ ...editSamiti, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SAMITI_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={editSamiti.description} onChange={e => setEditSamiti({ ...editSamiti, description: e.target.value })} placeholder="Optional description..." /></div>
              <Button onClick={() => updateSamiti.mutate()} disabled={!editSamiti.name.trim() || updateSamiti.isPending} className="w-full gradient-warm text-primary-foreground">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Samiti Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Group</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete this sub-group? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteSamiti.mutate(deleteId)} disabled={deleteSamiti.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sub-Group (Samiti/Mandal)</DialogTitle>
            <DialogDescription>Create a sub-group within a chapter for Mahila Mandal, Yuva Samiti, or other community groups.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Group Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mahila Mandal, Yuva Samiti" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SAMITI_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chapter</Label>
              <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                <SelectContent>{chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." /></div>
            <Button onClick={() => createSamiti.mutate()} disabled={!form.name.trim() || createSamiti.isPending} className="w-full gradient-warm text-primary-foreground">Create Sub-Group</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Samiti / Mandal Groups
            </CardTitle>
            <CardDescription>Manage chapter sub-groups like Mahila Mandal, Yuva Samiti, etc.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gradient-warm text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Create
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {(!samitis || samitis.length === 0) && (
            <p className="text-muted-foreground text-center py-8 text-sm">No sub-groups created yet.</p>
          )}
          <div className="divide-y divide-border">
            {samitis?.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{s.name}</p>
                    <Badge variant="outline" className="text-xs">{s.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{(s.chapters as { name: string } | null)?.name ?? "No chapter"}</p>
                  {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Edit ${s.name}`}
                    onClick={() => setEditSamiti({ id: s.id, name: s.name, type: s.type, description: s.description ?? "" })}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" aria-label={`Delete ${s.name}`} onClick={() => setDeleteId(s.id)} disabled={deleteSamiti.isPending} className="text-destructive border-destructive/30 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
