import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Pencil, Users, Power, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Chapter {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

export default function ChaptersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", country: "", description: "" });

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: async () => {
      const { data: chaptersData, error } = await supabase
        .from("chapters")
        .select("id, name, city, country, is_active, created_at")
        .order("name");
      if (error) throw error;

      const chaptersWithCounts = await Promise.all(
        (chaptersData ?? []).map(async (ch) => {
          const { count } = await supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("chapter_id", ch.id);
          return { ...ch, member_count: count ?? 0 };
        })
      );
      return chaptersWithCounts as Chapter[];
    },
  });

  const createChapter = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chapters").insert({
        name: form.name.trim(),
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chapter created!" });
      setCreateOpen(false);
      setForm({ name: "", city: "", country: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateChapter = useMutation({
    mutationFn: async (ch: { id: string; name: string; city: string | null; country: string | null }) => {
      const { error } = await supabase.from("chapters").update({ name: ch.name, city: ch.city, country: ch.country }).eq("id", ch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chapter updated!" });
      setEditChapter(null);
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("chapters").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.active ? "Chapter activated." : "Chapter deactivated." });
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Chapter Management
          </h2>
          <p className="text-sm text-muted-foreground">{chapters?.length ?? 0} chapters total</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-warm text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" /> New Chapter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Chapter</DialogTitle>
              <DialogDescription>Add a new community chapter to the platform.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Chapter Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Bengaluru Chapter" maxLength={100} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="e.g. Bengaluru" maxLength={100} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({...form, country: e.target.value})} placeholder="e.g. India" maxLength={100} /></div>
              </div>
              <Button onClick={() => createChapter.mutate()} disabled={!form.name.trim() || createChapter.isPending} className="w-full gradient-hero text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Create Chapter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse rounded-xl border border-border h-16 bg-muted/30" />)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chapters?.map((ch) => (
          <Card key={ch.id} className={`shadow-card transition-all ${!ch.is_active ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm truncate">{ch.name}</h3>
                    {!ch.is_active && <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>}
                  </div>
                  {(ch.city || ch.country) && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />{[ch.city, ch.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ch.member_count ?? 0} members</span>
                    <span>Since {format(new Date(ch.created_at), "MMM yyyy")}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Dialog open={editChapter?.id === ch.id} onOpenChange={(open) => { if (!open) setEditChapter(null); }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditChapter(ch)}
                        aria-label="Edit chapter"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    {editChapter?.id === ch.id && (
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Chapter</DialogTitle>
                          <DialogDescription>Update chapter details.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Chapter Name *</Label><Input value={editChapter.name} onChange={e => setEditChapter({...editChapter, name: e.target.value})} maxLength={100} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>City</Label><Input value={editChapter.city ?? ""} onChange={e => setEditChapter({...editChapter, city: e.target.value})} maxLength={100} /></div>
                            <div><Label>Country</Label><Input value={editChapter.country ?? ""} onChange={e => setEditChapter({...editChapter, country: e.target.value})} maxLength={100} /></div>
                          </div>
                          <Button onClick={() => updateChapter.mutate({ id: editChapter.id, name: editChapter.name, city: editChapter.city || null, country: editChapter.country || null })} disabled={!editChapter.name.trim() || updateChapter.isPending} className="w-full gradient-warm text-primary-foreground">
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 w-7 p-0 ${ch.is_active ? "text-destructive hover:text-destructive" : "text-success hover:text-success"}`}
                    onClick={() => toggleActive.mutate({ id: ch.id, active: !ch.is_active })}
                    disabled={toggleActive.isPending}
                    aria-label={ch.is_active ? "Deactivate chapter" : "Activate chapter"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !chapters?.length && (
          <div className="col-span-full text-center py-16 text-muted-foreground">No chapters found</div>
        )}
      </div>
    </div>
  );
}
