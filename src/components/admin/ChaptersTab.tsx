import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Pencil, Users, Power, ChevronRight, Settings, UserPlus, Trash2, Mail, Phone, Globe, Shield, Search, X } from "lucide-react";
import { format } from "date-fns";

interface Chapter {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  created_at: string;
  settings?: {
    contact?: { phone?: string; email?: string; url?: string };
    theme?: string;
    subdomain?: string;
    city?: string;
    country?: string;
  } | null;
  member_count?: number;
  admin_names?: string[];
}

interface ChapterAdmin {
  id: string;
  member_id: string;
  member_name: string;
  start_date: string;
}

const EMPTY_FORM = { name: "", city: "", country: "", phone: "", email: "", url: "", subdomain: "", slug: "" };

export default function ChaptersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const [settingsChapter, setSettingsChapter] = useState<Chapter | null>(null);
  const [inviteChapter, setInviteChapter] = useState<Chapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ chapterId: string; adminId: string; memberName: string } | null>(null);
  const [committeeChapter, setCommitteeChapter] = useState<Chapter | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [settingsForm, setSettingsForm] = useState({ phone: "", email: "", url: "", subdomain: "" });
  const [inviteForm, setInviteForm] = useState({ memberId: "", email: "", name: "" });
  const [memberSearch, setMemberSearch] = useState("");

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: async () => {
      const { data: chaptersData, error } = await supabase
        .from("chapters")
        .select("id, name, slug, subdomain, created_at, settings")
        .order("name");
      if (error) throw error;

      const chaptersWithMeta = await Promise.all(
        (chaptersData ?? []).map(async (ch) => {
          const [{ count }, { data: adminData }] = await Promise.all([
            supabase.from("members").select("id", { count: "exact", head: true }).eq("chapter_id", ch.id),
            supabase
              .from("role_assignments")
              .select("id, member_id, start_date, members(first_name, last_name), roles(name)")
              .eq("chapter_id", ch.id),
          ]);
          const admins = (adminData ?? [])
            .filter((ra) => {
              const role = ra.roles as { name: string } | null;
              return role?.name === "Chapter Admin";
            })
            .map((ra) => {
              const m = ra.members as { first_name: string; last_name: string } | null;
              return { id: ra.id, member_id: ra.member_id, member_name: `${m?.first_name ?? ""} ${m?.last_name ?? ""}`.trim(), start_date: ra.start_date };
            }) as ChapterAdmin[];
          return { ...ch, member_count: count ?? 0, admins };
        })
      );
      return chaptersWithMeta as (Chapter & { admins: ChapterAdmin[] })[];
    },
  });

  const { data: allMembers } = useQuery({
    queryKey: ["all-members-for-chapter-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("id, first_name, last_name, chapter_id, chapters(name)")
        .order("first_name")
        .limit(500);
      return data ?? [];
    },
    enabled: !!inviteChapter,
  });

  const { data: chapterAdminRoleId } = useQuery({
    queryKey: ["chapter-admin-role-id"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("id").eq("name", "Chapter Admin").maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!inviteChapter,
  });

  const filteredMembers = allMembers?.filter((m) => {
    const name = `${m.first_name} ${m.last_name}`.toLowerCase();
    return memberSearch === "" || name.includes(memberSearch.toLowerCase());
  }) ?? [];

  const createChapter = useMutation({
    mutationFn: async () => {
      const slug = form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const subdomain = form.subdomain.trim() || slug;
      const { error } = await supabase.from("chapters").insert({
        name: form.name.trim(),
        slug,
        subdomain,
        settings: {
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          contact: {
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            url: form.url.trim() || null,
          },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chapter created!" });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateChapter = useMutation({
    mutationFn: async () => {
      if (!editChapter) return;
      const existing = editChapter.settings ?? {};
      const { error } = await supabase.from("chapters").update({
        name: editForm.name.trim(),
        settings: {
          ...existing,
          city: editForm.city.trim() || null,
          country: editForm.country.trim() || null,
        },
      }).eq("id", editChapter.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chapter updated!" });
      setEditChapter(null);
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!settingsChapter) return;
      const existing = settingsChapter.settings ?? {};
      const { error } = await supabase.from("chapters").update({
        settings: {
          ...existing,
          contact: {
            phone: settingsForm.phone.trim() || null,
            email: settingsForm.email.trim() || null,
            url: settingsForm.url.trim() || null,
          },
          subdomain: settingsForm.subdomain.trim() || null,
        },
      }).eq("id", settingsChapter.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings saved!" });
      setSettingsChapter(null);
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const ch = (chapters as (Chapter & { admins: ChapterAdmin[] })[] | undefined)?.find(c => c.id === id);
      const existing = ch?.settings ?? {};
      const { error } = await supabase.from("chapters").update({
        settings: { ...existing, is_active: active },
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.active ? "Chapter activated." : "Chapter deactivated." });
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteChapter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chapter deleted." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const assignChapterAdmin = useMutation({
    mutationFn: async () => {
      if (!inviteChapter || !inviteForm.memberId) throw new Error("Select a member to assign");
      let roleId = chapterAdminRoleId;
      if (!roleId) {
        const { data, error: roleErr } = await supabase.from("roles").select("id").eq("name", "Chapter Admin").maybeSingle();
        if (roleErr || !data) throw new Error("Chapter Admin role not found");
        roleId = data.id;
      }
      const { error } = await supabase.rpc("assign_role", {
        p_member_id: inviteForm.memberId,
        p_role_id: roleId,
        p_chapter_id: inviteChapter.id,
      });
      if (error) throw new Error(error.message);

      if (inviteForm.email.trim()) {
        const member = allMembers?.find((m) => m.id === inviteForm.memberId);
        const memberName = member ? `${member.first_name} ${member.last_name}` : inviteForm.name;
        await supabase.functions.invoke("send-email", {
          body: {
            template: "chapter_admin_invite",
            to: inviteForm.email.trim(),
            vars: {
              name: memberName,
              chapter_name: inviteChapter.name,
              chapter_city: inviteChapter.settings?.city ?? "",
              chapter_country: inviteChapter.settings?.country ?? "",
              login_url: `${window.location.origin}/auth`,
              admin_url: `${window.location.origin}/admin`,
            },
          },
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Chapter Admin assigned!", description: inviteForm.email ? "Invitation email sent." : undefined });
      setInviteChapter(null);
      setInviteForm({ memberId: "", email: "", name: "" });
      setMemberSearch("");
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const revokeAdmin = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.rpc("revoke_role", { p_assignment_id: assignmentId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Role revoked." });
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEdit = (ch: Chapter) => {
    setEditChapter(ch);
    setEditForm({ name: ch.name, city: ch.settings?.city ?? "", country: ch.settings?.country ?? "", phone: "", email: "", url: "", subdomain: ch.subdomain ?? "", slug: ch.slug ?? "" });
  };

  const openSettings = (ch: Chapter) => {
    setSettingsChapter(ch);
    setSettingsForm({
      phone: ch.settings?.contact?.phone ?? "",
      email: ch.settings?.contact?.email ?? "",
      url: ch.settings?.contact?.url ?? "",
      subdomain: (ch.settings as { subdomain?: string } | null | undefined)?.subdomain ?? "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Chapter Management
          </h2>
          <p className="text-sm text-muted-foreground">{chapters?.length ?? 0} chapters total</p>
        </div>
        <Button className="gradient-warm text-primary-foreground" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Chapter
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse rounded-xl border border-border h-20 bg-muted/30" />)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(chapters as (Chapter & { admins: ChapterAdmin[] })[] | undefined)?.map((ch) => (
          <Card key={ch.id} className={`shadow-card transition-all ${ch.settings?.is_active === false ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-sm truncate">{ch.name}</h3>
                    {ch.settings?.is_active === false && <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>}
                  </div>
                  {(ch.settings?.city || ch.settings?.country) && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />{[ch.settings?.city, ch.settings?.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ch.member_count ?? 0} members</span>
                    <span>Since {format(new Date(ch.created_at), "MMM yyyy")}</span>
                  </div>
                  {ch.admins?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ch.admins.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          <Shield className="w-2.5 h-2.5" />{a.member_name}
                          <button
                            className="ml-0.5 hover:text-destructive"
                            onClick={() => setRevokeTarget({ chapterId: ch.id, adminId: a.id, memberName: a.member_name })}
                            aria-label={`Revoke admin for ${a.member_name}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {ch.admins?.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No chapter admin assigned</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(ch)} aria-label="Edit chapter">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openSettings(ch)} aria-label="Chapter settings">
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:text-primary" onClick={() => { setInviteChapter(ch); setInviteForm({ memberId: "", email: "", name: "" }); setMemberSearch(""); }} aria-label="Assign chapter admin">
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:text-primary" onClick={() => setCommitteeChapter(ch)} aria-label="Manage committee">
                    <Users className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className={`h-7 w-7 p-0 ${ch.settings?.is_active !== false ? "text-destructive hover:text-destructive" : "text-success hover:text-success"}`}
                    onClick={() => toggleActive.mutate({ id: ch.id, active: ch.settings?.is_active === false })}
                    disabled={toggleActive.isPending}
                    aria-label={ch.settings?.is_active !== false ? "Deactivate chapter" : "Activate chapter"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(ch)} aria-label="Delete chapter">
                    <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create Chapter Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Chapter</DialogTitle>
            <DialogDescription>Add a new community chapter to the platform.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
              <TabsTrigger value="contact" className="flex-1">Contact & Web</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-3 mt-3">
              <div><Label>Chapter Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bengaluru Chapter" maxLength={100} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Bengaluru" maxLength={100} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. India" maxLength={100} /></div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="space-y-3 mt-3">
              <div><Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" maxLength={30} /></div>
              <div><Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="chapter@example.com" maxLength={100} /></div>
              <div><Label className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Website URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." maxLength={200} /></div>
              <div><Label>Subdomain</Label><Input value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value })} placeholder="bengaluru" maxLength={50} /></div>
            </TabsContent>
          </Tabs>
          <Button onClick={() => createChapter.mutate()} disabled={!form.name.trim() || createChapter.isPending} className="w-full gradient-hero text-primary-foreground mt-2">
            <Plus className="w-4 h-4 mr-1" /> Create Chapter
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Chapter Dialog */}
      <Dialog open={!!editChapter} onOpenChange={(open) => { if (!open) setEditChapter(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>Update chapter name and location.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Chapter Name *</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} maxLength={100} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} maxLength={100} /></div>
              <div><Label>Country</Label><Input value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value })} maxLength={100} /></div>
            </div>
            <Button onClick={() => updateChapter.mutate()} disabled={!editForm.name.trim() || updateChapter.isPending} className="w-full gradient-warm text-primary-foreground">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chapter Settings Dialog */}
      <Dialog open={!!settingsChapter} onOpenChange={(open) => { if (!open) setSettingsChapter(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-4 h-4" />Chapter Settings — {settingsChapter?.name}</DialogTitle>
            <DialogDescription>Update contact information and web presence for this chapter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Contact Phone</Label><Input value={settingsForm.phone} onChange={e => setSettingsForm({ ...settingsForm, phone: e.target.value })} placeholder="+1 (555) 000-0000" maxLength={30} /></div>
            <div><Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Contact Email</Label><Input type="email" value={settingsForm.email} onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })} placeholder="chapter@example.com" maxLength={100} /></div>
            <div><Label className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Website URL</Label><Input value={settingsForm.url} onChange={e => setSettingsForm({ ...settingsForm, url: e.target.value })} placeholder="https://..." maxLength={200} /></div>
            <div><Label>Subdomain</Label><div className="flex items-center"><Input value={settingsForm.subdomain} onChange={e => setSettingsForm({ ...settingsForm, subdomain: e.target.value })} placeholder="bengaluru" maxLength={50} /><span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">.khadayataonline.com</span></div></div>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="w-full gradient-warm text-primary-foreground">
              <Settings className="w-4 h-4 mr-1" />Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Chapter Admin Dialog */}
      <Dialog open={!!inviteChapter} onOpenChange={(open) => { if (!open) { setInviteChapter(null); setMemberSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" />Assign Chapter Admin — {inviteChapter?.name}</DialogTitle>
            <DialogDescription>
              {inviteChapter && (inviteChapter as Chapter & { admins: ChapterAdmin[] }).admins?.length > 0
                ? "This chapter already has a Chapter Admin. Revoke their role first to assign a new one."
                : "Select an existing member to become Chapter Admin. An invitation email will be sent if an email address is provided."}
            </DialogDescription>
          </DialogHeader>
          {inviteChapter && (inviteChapter as Chapter & { admins: ChapterAdmin[] }).admins?.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    {(inviteChapter as Chapter & { admins: ChapterAdmin[] }).admins[0].member_name} is the current Chapter Admin
                  </p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5 ml-6">
                  Revoke their role first to assign a new admin. Use the × button next to their name on the chapter card.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setRevokeTarget({
                    chapterId: inviteChapter.id,
                    adminId: (inviteChapter as Chapter & { admins: ChapterAdmin[] }).admins[0].id,
                    memberName: (inviteChapter as Chapter & { admins: ChapterAdmin[] }).admins[0].member_name,
                  });
                  setInviteChapter(null);
                }}
              >
                <X className="w-4 h-4 mr-1" /> Revoke Current Admin
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Search Member</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Type a name..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Select Member *</Label>
                <Select value={inviteForm.memberId} onValueChange={(v) => {
                  setInviteForm({ ...inviteForm, memberId: v });
                  const m = allMembers?.find((x) => x.id === v);
                  if (m) setInviteForm(f => ({ ...f, memberId: v, name: `${m.first_name} ${m.last_name}` }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a member..." /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    {filteredMembers.map((m) => {
                      const ch = m.chapters as { name: string } | null;
                      return (
                        <SelectItem key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}{ch?.name ? ` — ${ch.name}` : ""}
                        </SelectItem>
                      );
                    })}
                    {filteredMembers.length === 0 && <div className="p-2 text-xs text-muted-foreground text-center">No members found</div>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Send Invite to Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="admin@example.com"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">If provided, an invitation email will be sent to this address.</p>
              </div>
              <Button
                onClick={() => assignChapterAdmin.mutate()}
                disabled={!inviteForm.memberId || assignChapterAdmin.isPending}
                className="w-full gradient-hero text-primary-foreground"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                {inviteForm.email ? "Assign & Send Invite" : "Assign as Chapter Admin"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Admin Confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Chapter Admin Role</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{revokeTarget?.memberName}</strong> as Chapter Admin? They will lose all admin privileges for this chapter immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && revokeAdmin.mutate(revokeTarget.adminId)}
              disabled={revokeAdmin.isPending}
            >
              Revoke Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Chapter Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone. All associated data (members, events, announcements) will be unlinked. Consider deactivating the chapter instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteChapter.mutate(deleteTarget.id)}
              disabled={deleteChapter.isPending}
            >
              Delete Chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Committee Management Dialog */}
      <CommitteeManagementDialog chapter={committeeChapter} onClose={() => setCommitteeChapter(null)} />
    </div>
  );
}

interface CommitteeManagementDialogProps {
  chapter: Chapter | null;
  onClose: () => void;
}

function CommitteeManagementDialog({ chapter, onClose }: CommitteeManagementDialogProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedMember, setSelectedMember] = useState("");

  const { data: committeeRoles } = useQuery({
    queryKey: ["committee-roles", chapter?.id],
    queryFn: async () => {
      if (!chapter?.id) return [];
      const { data } = await supabase.from("roles").select("id, name").eq("chapter_id", chapter.id).ilike("name", "%Committee%");
      return data ?? [];
    },
    enabled: !!chapter?.id,
  });

  const { data: chapterMembers } = useQuery({
    queryKey: ["committee-members", chapter?.id],
    queryFn: async () => {
      if (!chapter?.id) return [];
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("chapter_id", chapter.id).order("first_name");
      return data ?? [];
    },
    enabled: !!chapter?.id,
  });

  const { data: committeeAssignments } = useQuery({
    queryKey: ["committee-assignments", chapter?.id],
    queryFn: async () => {
      if (!chapter?.id) return [];
      const { data } = await supabase
        .from("role_assignments")
        .select("id, member_id, role_id, members(first_name, last_name), roles(name)")
        .eq("chapter_id", chapter.id);
      return data?.filter(ra => {
        const role = ra.roles as { name: string } | null;
        return role?.name?.includes("Committee");
      }) ?? [];
    },
    enabled: !!chapter?.id,
  });

  const assignCommitteeRole = useMutation({
    mutationFn: async () => {
      if (!selectedMember || !selectedRole || !chapter?.id) throw new Error("Select member and role");
      const role = committeeRoles?.find(r => r.id === selectedRole);
      if (!role) throw new Error("Role not found");
      const { error } = await supabase.rpc("assign_role", {
        p_member_id: selectedMember,
        p_role_id: selectedRole,
        p_chapter_id: chapter.id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Committee member assigned!" });
      setSelectedMember("");
      setSelectedRole("");
      const queryClient = useQueryClient();
      queryClient.invalidateQueries({ queryKey: ["committee-assignments", chapter?.id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeCommitteeRole = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.rpc("revoke_role", { p_assignment_id: assignmentId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Committee member removed." });
      const queryClient = useQueryClient();
      queryClient.invalidateQueries({ queryKey: ["committee-assignments", chapter?.id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!chapter} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4" />Manage Committee — {chapter?.name}</DialogTitle>
          <DialogDescription>Assign committee roles to chapter members.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-sm">Assign Committee Role</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Member</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                  <SelectContent>
                    {chapterMembers?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                  <SelectContent>
                    {committeeRoles?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => assignCommitteeRole.mutate()}
              disabled={!selectedMember || !selectedRole || assignCommitteeRole.isPending}
              className="w-full gradient-hero text-primary-foreground"
            >
              <UserPlus className="w-4 h-4 mr-1" />Assign Role
            </Button>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Current Committee Members</h4>
            {committeeAssignments && committeeAssignments.length > 0 ? (
              <div className="space-y-2">
                {committeeAssignments.map((ra) => {
                  const member = ra.members as { first_name: string; last_name: string } | null;
                  const role = ra.roles as { name: string } | null;
                  return (
                    <div key={ra.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="text-sm font-medium">{member?.first_name} {member?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{role?.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeCommitteeRole.mutate(ra.id)}
                        disabled={removeCommitteeRole.isPending}
                        aria-label={`Remove ${member?.first_name} from committee`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground p-2">No committee members assigned yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
