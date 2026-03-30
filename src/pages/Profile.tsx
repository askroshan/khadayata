import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember, useChapters } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/AvatarUpload";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { PhoneField } from "@/components/profile/PhoneField";
import { FamilyInviteDialog, PendingInvitationsList } from "@/components/profile/FamilyInviteDialog";
import { User, Briefcase, GraduationCap, Users, Shield, QrCode, CreditCard as Edit, Check, X, Plus, Trash2, MapPin, Award, Heart, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

interface FamilyLink {
  id: string;
  relation: string;
  related: unknown;
}

function FamilyConnectionsTable({ familyLinks }: { familyLinks: FamilyLink[] }) {
  if (familyLinks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Users className="w-10 h-10 text-muted-foreground/25 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No family connections yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Use "Invite Family" above to start building your Parivar tree</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10"></th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relation</th>
          </tr>
        </thead>
        <tbody>
          {familyLinks.map((fl) => {
            const rel = fl.related as { first_name?: string; last_name?: string; verification_level?: number } | null;
            const initials = rel?.first_name?.[0] ?? "?";
            const fullName = [rel?.first_name, rel?.last_name].filter(Boolean).join(" ") || "Unknown";
            return (
              <tr key={fl.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {initials}
                  </div>
                </td>
                <td className="py-3 px-3 font-medium text-foreground">{fullName}</td>
                <td className="py-3 px-3">
                  <Badge variant="outline" className="capitalize">{fl.relation}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Profile() {
  const { user, loading } = useAuth();
  const { member, isLoading, updateMember } = useMember();
  const { data: chapters } = useChapters();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [newEducation, setNewEducation] = useState({ degree: "", institution: "", year: "" });
  const [newEmployment, setNewEmployment] = useState({ job_title: "", company: "", sector: "" });

  const { data: education, refetch: refetchEducation } = useQuery({
    queryKey: ["my-education"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("education").select("*").eq("member_id", member.id);
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: employment, refetch: refetchEmployment } = useQuery({
    queryKey: ["my-employment"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("employment").select("*").eq("member_id", member.id);
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: skills, refetch: refetchSkills } = useQuery({
    queryKey: ["my-skills"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("member_skills").select("*").eq("member_id", member.id);
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: languages, refetch: refetchLanguages } = useQuery({
    queryKey: ["my-languages"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("member_languages").select("*").eq("member_id", member.id);
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: familyLinks } = useQuery({
    queryKey: ["my-family-links"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("family_links").select("*, related:members!family_links_related_member_id_fkey(first_name, last_name)").eq("member_id", member.id);
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: vouches } = useQuery({
    queryKey: ["my-vouches", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("vouches")
        .select("id, created_at, note, voucher:members!vouches_voucher_member_id_fkey(id, first_name, last_name, photo_url, global_id, verification_level)")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: matProfile } = useQuery({
    queryKey: ["my-mat-profile"],
    queryFn: async () => {
      if (!member) return null;
      const { data } = await supabase.from("matrimonial_profiles").select("ekda").eq("member_id", member.id).maybeSingle();
      return data;
    },
    enabled: !!member,
  });

  const handleAvatarUpload = async (url: string) => {
    await updateMember.mutateAsync({ photo_url: url });
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      await updateMember.mutateAsync({
        first_name: editData.first_name || member?.first_name,
        last_name: editData.last_name || member?.last_name,
        middle_names: editData.middle_names || member?.middle_names || null,
        gender: editData.gender || member?.gender || null,
        dob: editData.dob || member?.dob || null,
        birth_place: editData.birth_place || member?.birth_place || null,
        chapter_id: editData.chapter_id || member?.chapter_id || null,
        ekda: editData.ekda ?? (member as Record<string, unknown>)?.ekda ?? null,
        kuldevi: editData.kuldevi ?? (member as Record<string, unknown>)?.kuldevi ?? null,
      });
    },
    onSuccess: () => {
      toast({ title: "Profile updated!" });
      setEditing(false);
      setEditData({});
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addSkill = useMutation({
    mutationFn: async () => {
      if (!member || !newSkill.trim()) throw new Error("Missing data");
      const { error } = await supabase.from("member_skills").insert({ member_id: member.id, skill: newSkill.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setNewSkill(""); refetchSkills(); toast({ title: "Skill added!" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetchSkills(); },
  });

  const addLanguage = useMutation({
    mutationFn: async () => {
      if (!member || !newLanguage.trim()) throw new Error("Missing data");
      const { error } = await supabase.from("member_languages").insert({ member_id: member.id, language: newLanguage.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setNewLanguage(""); refetchLanguages(); toast({ title: "Language added!" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeLanguage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_languages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetchLanguages(); },
  });

  const addEducationRecord = useMutation({
    mutationFn: async () => {
      if (!member || !newEducation.degree.trim()) throw new Error("Missing data");
      const { error } = await supabase.from("education").insert({
        member_id: member.id,
        degree: newEducation.degree.trim(),
        institution: newEducation.institution.trim() || null,
        year: newEducation.year ? parseInt(newEducation.year) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewEducation({ degree: "", institution: "", year: "" });
      refetchEducation();
      toast({ title: "Education added!" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeEducation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("education").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetchEducation(); },
  });

  const addEmploymentRecord = useMutation({
    mutationFn: async () => {
      if (!member || !newEmployment.job_title.trim()) throw new Error("Missing data");
      const { error } = await supabase.from("employment").insert({
        member_id: member.id,
        job_title: newEmployment.job_title.trim(),
        company: newEmployment.company.trim() || null,
        sector: newEmployment.sector.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewEmployment({ job_title: "", company: "", sector: "" });
      refetchEmployment();
      toast({ title: "Employment added!" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeEmployment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetchEmployment(); },
  });

  if (loading || isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  // Profile completeness
  const fields = [
    !!member?.first_name, !!member?.last_name, !!member?.gender, !!member?.dob,
    !!member?.chapter_id, !!member?.birth_place, (education?.length ?? 0) > 0,
    (employment?.length ?? 0) > 0, (skills?.length ?? 0) > 0, (languages?.length ?? 0) > 0,
  ];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const qrData = member?.global_id ?? member?.id ?? "";

  return (
    <AppLayout title="My Profile">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl">
        {/* Header with avatar upload */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <AvatarUpload
            currentUrl={member?.photo_url}
            onUploadComplete={handleAvatarUpload}
            size="lg"
            initials={`${member?.first_name?.[0] ?? ""}${member?.last_name?.[0] ?? ""}`}
          />
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2 max-w-md">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={editData.first_name ?? member?.first_name ?? ""}
                    onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    value={editData.last_name ?? member?.last_name ?? ""}
                    onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Middle Names</Label>
                  <Input
                    value={editData.middle_names ?? member?.middle_names ?? ""}
                    onChange={(e) => setEditData({ ...editData, middle_names: e.target.value })}
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label className="text-xs">Gender</Label>
                  <Select value={editData.gender ?? member?.gender ?? ""} onValueChange={(v) => setEditData({ ...editData, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" value={editData.dob ?? member?.dob ?? ""} onChange={(e) => setEditData({ ...editData, dob: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Birth Place</Label>
                  <Input value={editData.birth_place ?? member?.birth_place ?? ""} onChange={(e) => setEditData({ ...editData, birth_place: e.target.value })} maxLength={200} />
                </div>
                <div>
                  <Label className="text-xs">Ekda</Label>
                  <Input value={editData.ekda ?? (member as Record<string, unknown>)?.ekda as string ?? ""} onChange={(e) => setEditData({ ...editData, ekda: e.target.value })} placeholder="e.g., Kadva, Leuva" maxLength={100} />
                </div>
                <div>
                  <Label className="text-xs">Kuldevi (Patron Deity)</Label>
                  <Input value={editData.kuldevi ?? (member as Record<string, unknown>)?.kuldevi as string ?? ""} onChange={(e) => setEditData({ ...editData, kuldevi: e.target.value })} placeholder="e.g., Khodiyar Mata, Umiya Mata" maxLength={100} />
                </div>
                <div>
                  <Label className="text-xs">Chapter</Label>
                  <Select value={editData.chapter_id ?? member?.chapter_id ?? ""} onValueChange={(v) => setEditData({ ...editData, chapter_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="gradient-warm text-primary-foreground">
                    <Check className="w-4 h-4 mr-1" /> Save
                  </Button>
                  <Button variant="outline" onClick={() => { setEditing(false); setEditData({}); }}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-display font-bold truncate">{member?.first_name} {member?.middle_names} {member?.last_name}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
                  <MapPin className="w-3.5 h-3.5" />
                  {(member?.chapters as { name: string } | null)?.name ?? "No chapter"}
                </p>
                {member?.global_id ? (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-mono text-sm font-semibold tracking-wide text-primary">{member.global_id}</span>
                  </div>
                ) : member?.chapter_id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={generatingId}
                    onClick={async () => {
                      setGeneratingId(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("generate-global-id", {
                          body: { member_id: member.id },
                        });
                        if (error) throw error;
                        toast({ title: "Global ID Generated!", description: data?.global_id });
                        await queryClient.invalidateQueries({ queryKey: ["member", user?.id] });
                      } catch (err) {
                        toast({ title: "Error generating ID", description: (err as Error).message, variant: "destructive" });
                      } finally {
                        setGeneratingId(false);
                      }
                    }}
                  >
                    <Shield className="w-3.5 h-3.5 mr-1" />{generatingId ? "Generating…" : "Generate Global ID"}
                  </Button>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                  <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />Level {member?.verification_level}</Badge>
                </div>
              </>
            )}
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="shrink-0">
              <Edit className="w-3.5 h-3.5 mr-1" />Edit
            </Button>
          )}
        </div>

        {/* Completeness meter */}
        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completeness</span>
              <span className="text-sm font-bold text-primary">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2" />
          </CardContent>
        </Card>

        {/* Digital Member Card */}
        <Card className="shadow-elevated overflow-hidden">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" />Digital Member Card</CardTitle></CardHeader>
          <CardContent className="pb-6">
            <div className="relative rounded-2xl overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
              {/* Decorative pattern overlay */}
              <div className="absolute inset-0 opacity-[0.07]" style={{
                backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "30px 30px"
              }} />
              <div className="relative p-6 sm:p-8">
                {/* Top row: Org name + verification badge */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-foreground/70">KhadayataOnline</p>
                  <Badge className="bg-primary-foreground/20 border-0 text-primary-foreground text-xs font-semibold backdrop-blur-sm">
                    L{member?.verification_level} {member?.verification_level === 2 ? "Trusted" : member?.verification_level === 1 ? "Verified" : "Basic"}
                  </Badge>
                </div>

                {/* Main content: Info + QR */}
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
                  <div className="flex-1 text-center sm:text-left space-y-3">
                    {/* Name */}
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary-foreground leading-tight">
                      {member?.first_name} {member?.last_name}
                    </h2>

                    {/* Chapter */}
                    <p className="text-sm text-primary-foreground/80 flex items-center gap-1.5 justify-center sm:justify-start">
                      <MapPin className="w-3.5 h-3.5" />
                      {(member?.chapters as { name: string } | null)?.name ?? "No chapter"}
                    </p>

                    {/* Ekda */}
                    {((member as Record<string, unknown>)?.ekda || matProfile?.ekda) && (
                      <p className="text-sm text-primary-foreground/80">
                        Ekda: <span className="font-medium text-primary-foreground">{(member as Record<string, unknown>)?.ekda as string || matProfile?.ekda}</span>
                      </p>
                    )}

                    {/* Global ID - prominent */}
                    {member?.global_id && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-foreground/15 backdrop-blur-sm px-4 py-2 border border-primary-foreground/20">
                        <Shield className="w-4 h-4 text-primary-foreground" />
                        <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-primary-foreground">{member.global_id}</span>
                      </div>
                    )}
                  </div>

                  {/* QR Code */}
                  <div className="shrink-0">
                    <div className="bg-white rounded-xl p-3 shadow-lg">
                      <QRCodeDisplay data={qrData} size={120} />
                    </div>
                    <p className="text-[10px] text-primary-foreground/60 text-center mt-1.5">Scan to verify</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">Present this card for event check-in and identity verification</p>
          </CardContent>
        </Card>

        {/* Personal details (view-only section) */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><User className="w-5 h-5 text-primary" />Personal</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Gender</span><p>{member?.gender ?? "—"}</p></div>
            <div><span className="text-muted-foreground">Date of Birth</span><p>{member?.dob ? format(new Date(member.dob), "d MMMM yyyy") : "—"}</p></div>
            <div><span className="text-muted-foreground">Birth Place</span><p>{member?.birth_place ?? "—"}</p></div>
            <div><span className="text-muted-foreground">Ekda</span><p>{(member as Record<string, unknown>)?.ekda as string ?? "—"}</p></div>
            <div><span className="text-muted-foreground">Kuldevi</span><p>{(member as Record<string, unknown>)?.kuldevi as string ?? "—"}</p></div>
            <div><span className="text-muted-foreground">Global ID</span><p className="font-mono font-semibold text-primary">{member?.global_id ?? "Not assigned"}</p></div>
            {member && <PhoneField memberId={member.id} />}
          </CardContent>
        </Card>

        {/* Employment with inline add */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" />Employment</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Employment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Job Title</Label><Input value={newEmployment.job_title} onChange={(e) => setNewEmployment({ ...newEmployment, job_title: e.target.value })} maxLength={200} /></div>
                  <div><Label>Company</Label><Input value={newEmployment.company} onChange={(e) => setNewEmployment({ ...newEmployment, company: e.target.value })} maxLength={200} /></div>
                  <div><Label>Sector</Label><Input value={newEmployment.sector} onChange={(e) => setNewEmployment({ ...newEmployment, sector: e.target.value })} maxLength={200} /></div>
                  <Button onClick={() => addEmploymentRecord.mutate()} disabled={!newEmployment.job_title.trim() || addEmploymentRecord.isPending} className="w-full gradient-warm text-primary-foreground">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {employment?.length === 0 ? <p className="text-sm text-muted-foreground">No employment records</p> : employment?.map((e) => (
              <div key={e.id} className="py-2 border-b border-border last:border-0 text-sm flex items-start justify-between group">
                <div>
                  <p className="font-medium">{e.job_title}{e.company ? ` at ${e.company}` : ""}</p>
                  {e.sector && <p className="text-muted-foreground">{e.sector}</p>}
                </div>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => removeEmployment.mutate(e.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Education with inline add */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" />Education</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Education</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Degree</Label><Input value={newEducation.degree} onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })} maxLength={200} /></div>
                  <div><Label>Institution</Label><Input value={newEducation.institution} onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })} maxLength={200} /></div>
                  <div><Label>Year</Label><Input type="number" value={newEducation.year} onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })} min={1950} max={2030} /></div>
                  <Button onClick={() => addEducationRecord.mutate()} disabled={!newEducation.degree.trim() || addEducationRecord.isPending} className="w-full gradient-warm text-primary-foreground">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {education?.length === 0 ? <p className="text-sm text-muted-foreground">No education records</p> : education?.map((e) => (
              <div key={e.id} className="py-2 border-b border-border last:border-0 text-sm flex items-start justify-between group">
                <div>
                  <p className="font-medium">{e.degree}{e.institution ? ` — ${e.institution}` : ""}</p>
                  {e.year && <p className="text-muted-foreground">{e.year}</p>}
                </div>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => removeEducation.mutate(e.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skills & Languages with inline add/remove */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {skills?.length === 0 ? <p className="text-sm text-muted-foreground">No skills added</p> : skills?.map((s) => (
                  <Badge key={s.id} variant="secondary" className="pr-1 group">
                    {s.skill}
                    <button onClick={() => removeSkill.mutate(s.id)} className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add skill..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)} className="h-8 text-sm" maxLength={100} />
                <Button size="sm" onClick={() => addSkill.mutate()} disabled={!newSkill.trim() || addSkill.isPending} className="h-8">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-base">Languages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {languages?.length === 0 ? <p className="text-sm text-muted-foreground">No languages added</p> : languages?.map((l) => (
                  <Badge key={l.id} variant="secondary" className="pr-1 group">
                    {l.language}
                    <button onClick={() => removeLanguage.mutate(l.id)} className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add language..." value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} className="h-8 text-sm" maxLength={100} />
                <Button size="sm" onClick={() => addLanguage.mutate()} disabled={!newLanguage.trim() || addLanguage.isPending} className="h-8">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Family */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />Parivar (Family Tree)
              </CardTitle>
              {member && <FamilyInviteDialog memberId={member.id} />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Connected family members within the community</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {member && <PendingInvitationsList memberId={member.id} />}
            <FamilyConnectionsTable familyLinks={familyLinks ?? []} />
          </CardContent>
        </Card>

        {/* Vouches */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Vouched By
              {vouches && vouches.length > 0 && (
                <Badge variant="secondary" className="ml-2">{vouches.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verification progress for L0 and L1 members */}
            {(member?.verification_level ?? 0) < 2 && (
              <div className={`rounded-xl p-4 space-y-3 ${(member?.verification_level ?? 0) === 0 ? "bg-amber-50/60 border border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-700/30" : "bg-blue-50/60 border border-blue-200/50 dark:bg-blue-900/10 dark:border-blue-700/30"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {(member?.verification_level ?? 0) === 0
                      ? `Vouches to reach L1: ${Math.min(vouches?.length ?? 0, 2)}/2`
                      : `L1+ vouches to reach L2: ${Math.min(vouches?.filter((v) => ((v.voucher as { verification_level?: number } | null)?.verification_level ?? 0) >= 1).length ?? 0, 3)}/3`
                    }
                  </p>
                  <Link to="/directory" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Find members <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <Progress
                  value={
                    (member?.verification_level ?? 0) === 0
                      ? Math.min((vouches?.length ?? 0) / 2, 1) * 100
                      : Math.min((vouches?.filter((v) => ((v.voucher as { verification_level?: number } | null)?.verification_level ?? 0) >= 1).length ?? 0) / 3, 1) * 100
                  }
                  className={`h-2 ${(member?.verification_level ?? 0) === 0 ? "bg-amber-100 [&>div]:bg-amber-500" : "bg-blue-100 [&>div]:bg-blue-500"}`}
                />
                <p className="text-[11px] text-muted-foreground">
                  {(member?.verification_level ?? 0) === 0
                    ? "Visit the Member Directory and ask verified members to vouch for you."
                    : "You need 3 vouches from L1+ verified members plus a KYC document to reach L2."
                  }
                </p>
              </div>
            )}

            {!vouches || vouches.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No vouches yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask verified members to vouch for you to increase your verification level
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {vouches.map((v) => {
                  const voucher = v.voucher as { id: string; first_name: string; last_name: string; photo_url: string | null; global_id: string | null } | null;
                  return (
                    <div key={v.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <Link to={`/member/${voucher?.id}`}>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={voucher?.photo_url ?? undefined} />
                          <AvatarFallback className="gradient-hero text-primary-foreground text-xs font-bold">
                            {voucher?.first_name?.[0]}{voucher?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/member/${voucher?.id}`} className="text-sm font-semibold hover:text-primary transition-colors">
                          {voucher?.first_name} {voucher?.last_name}
                        </Link>
                        {voucher?.global_id && (
                          <p className="text-xs text-muted-foreground font-mono">{voucher.global_id}</p>
                        )}
                        {v.note && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{v.note}"</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(v.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
