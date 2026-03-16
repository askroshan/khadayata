import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, MapPin, Briefcase, GraduationCap, Heart, Users, ChevronUp, ChevronDown, CreditCard as Edit, UserCheck, UserX, FileText, ClipboardList, Pencil, MessageCircle } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useMember } from "@/hooks/useMember";
import { usePermissions, useRoles } from "@/hooks/useRoles";
import { ReportDialog } from "@/components/ReportDialog";
import { FamilyTree } from "@/components/profile/FamilyTree";
import { SakhaEndorsement } from "@/components/profile/SakhaEndorsement";

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { member: currentMember } = useMember();
  const { canVerifyMembers, canEditAnyMember, canManageDirectory } = usePermissions();
  const { myChapterId } = useRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [vouchNote, setVouchNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", gender: "" });
  const [verifyNote, setVerifyNote] = useState("");
  const [docRequest, setDocRequest] = useState("");
  const [verifyPanelOpen, setVerifyPanelOpen] = useState(false);
  const [vouchReqMessage, setVouchReqMessage] = useState("");
  const [vouchReqOpen, setVouchReqOpen] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ["member-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*, chapters(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: education } = useQuery({
    queryKey: ["member-education", id],
    queryFn: async () => {
      const { data } = await supabase.from("education").select("*").eq("member_id", id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: employment } = useQuery({
    queryKey: ["member-employment", id],
    queryFn: async () => {
      const { data } = await supabase.from("employment").select("*").eq("member_id", id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: vouches } = useQuery({
    queryKey: ["member-vouches", id],
    queryFn: async () => {
      const { data } = await supabase.from("vouches").select("*, voucher:members!vouches_voucher_member_id_fkey(first_name, last_name)").eq("member_id", id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: familyLinks } = useQuery({
    queryKey: ["member-family", id],
    queryFn: async () => {
      const { data } = await supabase.from("family_links").select("*, related:members!family_links_related_member_id_fkey(first_name, last_name)").eq("member_id", id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: memberRoles } = useQuery({
    queryKey: ["member-roles", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("role_assignments")
        .select("roles(name)")
        .eq("member_id", id!)
        .is("revoked_at", null);
      return (data ?? []).map((r) => (r.roles as { name: string } | null)?.name).filter(Boolean) as string[];
    },
    enabled: !!id && !!user,
  });

  const { data: memberBusinesses } = useQuery({
    queryKey: ["member-businesses", id],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id, name, sector, verified").eq("owner_member_id", id!);
      return data ?? [];
    },
    enabled: !!id && !!user && canManageDirectory,
  });

  const { data: verificationHistory } = useQuery({
    queryKey: ["verification-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("member_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!user && canVerifyMembers,
  });

  const addVerificationNote = useMutation({
    mutationFn: async () => {
      if (!verifyNote.trim()) throw new Error("Note is empty");
      const { error } = await supabase.from("verification_requests").insert({
        member_id: id!,
        requested_level: (member?.verification_level ?? 0) + 1,
        status: "note",
        notes: verifyNote.trim(),
        reviewer_user_id: user!.id,
        reviewed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verification note saved" });
      setVerifyNote("");
      queryClient.invalidateQueries({ queryKey: ["verification-history", id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const requestDocumentation = useMutation({
    mutationFn: async () => {
      const docType = docRequest.trim() || "Government ID";
      const { error } = await supabase.from("verification_requests").insert({
        member_id: id!,
        requested_level: (member?.verification_level ?? 0) + 1,
        status: "pending",
        document_type: docType,
        notes: `Documentation requested: ${docType}`,
        reviewer_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Documentation request created" });
      setDocRequest("");
      queryClient.invalidateQueries({ queryKey: ["verification-history", id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const vouchMutation = useMutation({
    mutationFn: async () => {
      if (!currentMember) throw new Error("Not a member");
      const { error } = await supabase.from("vouches").insert({
        member_id: id!,
        voucher_member_id: currentMember.id,
        note: vouchNote.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vouch submitted!" });
      setVouchNote("");
      queryClient.invalidateQueries({ queryKey: ["member-vouches", id] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const { data: existingVouchRequest } = useQuery({
    queryKey: ["vouch-request", id, currentMember?.id],
    queryFn: async () => {
      if (!currentMember || !id) return null;
      const { data } = await supabase
        .from("vouch_requests")
        .select("id, status")
        .eq("requester_member_id", currentMember.id)
        .eq("target_member_id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentMember && !!id && !!user,
  });

  const sendVouchRequestMutation = useMutation({
    mutationFn: async () => {
      if (!currentMember) throw new Error("Not a member");
      const { error } = await supabase.from("vouch_requests").insert({
        requester_member_id: currentMember.id,
        target_member_id: id!,
        message: vouchReqMessage.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vouch request sent!", description: `Your request has been sent to ${member?.first_name ?? "this member"}.` });
      setVouchReqMessage("");
      setVouchReqOpen(false);
      queryClient.invalidateQueries({ queryKey: ["vouch-request", id, currentMember?.id] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateLevelMutation = useMutation({
    mutationFn: async (level: number) => {
      const { error } = await supabase.from("members").update({ verification_level: level }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verification level updated" });
      queryClient.invalidateQueries({ queryKey: ["member-profile", id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("members").update({ onboarding_completed: false }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member suspended" });
      queryClient.invalidateQueries({ queryKey: ["member-profile", id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("members").update({
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        gender: editForm.gender || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member updated" });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["member-profile", id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const verifyBusinessMutation = useMutation({
    mutationFn: async ({ bizId, verified }: { bizId: string; verified: boolean }) => {
      const { error } = await supabase.from("businesses").update({ verified }).eq("id", bizId);
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      toast({ title: verified ? "Business verified" : "Business verification removed" });
      queryClient.invalidateQueries({ queryKey: ["member-businesses", id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const verifyEmploymentMutation = useMutation({
    mutationFn: async (empId: string) => {
      const { error } = await supabase.from("employment").update({ verified: true } as never).eq("id", empId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Employment record verified" });
      queryClient.invalidateQueries({ queryKey: ["member-employment", id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (authLoading || isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!member) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Member not found</div>;

  const isOwnProfile = member.user_id === user.id;
  const privacy = (member.privacy as Record<string, string>) ?? {};
  const canSeeField = (field: string) => {
    const level = privacy[field] ?? "public";
    if (level === "public") return true;
    if (level === "members" && user) return true;
    if (level === "chapter" && currentMember?.chapter_id === member.chapter_id) return true;
    if (level === "private") return isOwnProfile;
    return true;
  };

  const alreadyVouched = vouches?.some((v) => (v as { voucher_member_id: string }).voucher_member_id === currentMember?.id);

  return (
    <AppLayout title="Member Profile">
      <div className="p-6 max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold text-xl">
            {member.first_name?.[0]}{member.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{member.first_name} {member.middle_names} {member.last_name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />{(member.chapters as { name: string } | null)?.name}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />Level {member.verification_level}</Badge>
              {member.global_id && <Badge variant="secondary" className="font-mono text-xs">{member.global_id}</Badge>}
              {memberRoles?.map((role) => (
                <Badge key={role} className="bg-primary/10 text-primary border-0 text-xs">
                  <Shield className="w-3 h-3 mr-1" />{role}
                </Badge>
              ))}
            </div>
            {/* Admin controls */}
            {!isOwnProfile && (canVerifyMembers || canEditAnyMember) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {canEditAnyMember && (
                  <Dialog open={editOpen} onOpenChange={(open) => {
                    setEditOpen(open);
                    if (open) setEditForm({ first_name: member.first_name ?? "", last_name: member.last_name ?? "", gender: member.gender ?? "" });
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8">
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Edit Member</DialogTitle>
                        <DialogDescription>Update basic profile fields for this member.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div><Label>First Name</Label><Input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} /></div>
                        <div><Label>Last Name</Label><Input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} /></div>
                        <div><Label>Gender</Label>
                          <select className="w-full border rounded-md px-3 py-2 text-sm" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending} className="w-full gradient-warm text-primary-foreground">Save Changes</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {canVerifyMembers && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm" variant="outline" className="h-8"
                      disabled={member.verification_level >= 3 || updateLevelMutation.isPending}
                      onClick={() => updateLevelMutation.mutate(member.verification_level + 1)}
                      aria-label="Upgrade verification level"
                    >
                      <ChevronUp className="w-3.5 h-3.5 mr-1" /><UserCheck className="w-3.5 h-3.5" /> Level Up
                    </Button>
                    <Button
                      size="sm" variant="outline" className="h-8"
                      disabled={member.verification_level <= 0 || updateLevelMutation.isPending}
                      onClick={() => updateLevelMutation.mutate(member.verification_level - 1)}
                      aria-label="Downgrade verification level"
                    >
                      <ChevronDown className="w-3.5 h-3.5 mr-1" /><UserX className="w-3.5 h-3.5" /> Level Down
                    </Button>
                  </div>
                )}
              </div>
            )}
            {/* Verification panel for Data Steward / admins */}
            {!isOwnProfile && canVerifyMembers && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => setVerifyPanelOpen((o) => !o)}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  {verifyPanelOpen ? "Hide" : "Verification Panel"}
                  {verificationHistory && verificationHistory.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/15 text-primary text-xs px-1.5 py-0.5">{verificationHistory.length}</span>
                  )}
                </Button>
              </div>
            )}
            {/* Ask-to-vouch nudge for L0 members viewing others' profiles */}
            {!isOwnProfile && (currentMember?.verification_level ?? 0) < 1 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50/60 border border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-700/30 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
                <MessageCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Need to get verified? Ask <strong>{member.first_name}</strong> to vouch for you — scroll down to the Vouches section to send a vouch request.
                </span>
              </div>
            )}
            {/* Report button */}
            {!isOwnProfile && (
              <div className="mt-3">
                <ReportDialog
                  entityType="member"
                  entityId={member.id}
                  entityName={`${member.first_name} ${member.last_name}`}
                  variant="button"
                />
              </div>
            )}
          </div>
        </div>

        {/* Verification Panel */}
        {!isOwnProfile && canVerifyMembers && verifyPanelOpen && (
          <Card className="shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Verification Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chapter scope check */}
              {myChapterId && member.chapter_id !== myChapterId && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  This member is in a different chapter. Verification actions may be limited.
                </div>
              )}

              {/* Quick level change */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Current Level: <strong>L{member.verification_level}</strong></p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-success border-success/40 hover:bg-success/10"
                    disabled={member.verification_level >= 5 || updateLevelMutation.isPending}
                    onClick={() => updateLevelMutation.mutate(member.verification_level + 1)}
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Mark L{member.verification_level + 1}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={member.verification_level <= 0 || updateLevelMutation.isPending}
                    onClick={() => updateLevelMutation.mutate(member.verification_level - 1)}
                  >
                    <UserX className="w-3.5 h-3.5 mr-1" /> Downgrade
                  </Button>
                </div>
              </div>

              {/* Add verification note */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Add Verification Note
                </p>
                <Textarea
                  placeholder="Record a note about this member's verification (e.g. identity confirmed via community leader)..."
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
                <Button size="sm" onClick={() => addVerificationNote.mutate()} disabled={!verifyNote.trim() || addVerificationNote.isPending} className="h-8">
                  Save Note
                </Button>
              </div>

              {/* Request documentation */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Request Documentation
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Document type (e.g. Passport, Aadhaar, Driver License)"
                    value={docRequest}
                    onChange={(e) => setDocRequest(e.target.value)}
                    maxLength={200}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={() => requestDocumentation.mutate()} disabled={requestDocumentation.isPending} className="h-8 shrink-0">
                    Request
                  </Button>
                </div>
              </div>

              {/* Verification history */}
              {verificationHistory && verificationHistory.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" /> History ({verificationHistory.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {verificationHistory.map((vr) => (
                      <div key={vr.id} className="text-xs border border-border rounded-md px-3 py-2 bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium capitalize">{vr.status}</span>
                          {vr.document_type && <Badge variant="outline" className="text-[10px]">{vr.document_type}</Badge>}
                          <span className="text-muted-foreground ml-auto">{new Date(vr.created_at).toLocaleDateString()}</span>
                        </div>
                        {vr.notes && <p className="text-muted-foreground mt-1">{vr.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vouch chain */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Vouch Chain ({vouches?.length ?? 0} vouches)
                </p>
                {!vouches?.length && <p className="text-xs text-muted-foreground">No vouches yet</p>}
                {vouches?.map((v) => (
                  <div key={v.id} className="text-xs flex items-center gap-2 py-1 border-b border-border last:border-0">
                    <span className="font-medium">{(v.voucher as { first_name: string; last_name: string } | null)?.first_name} {(v.voucher as { first_name: string; last_name: string } | null)?.last_name}</span>
                    {v.note && <span className="text-muted-foreground italic">"{v.note}"</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Directory Manager: Employment & Business verification */}
        {!isOwnProfile && canManageDirectory && (
          <Card className="shadow-card border-amber-200/50">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-600" /> Directory Manager Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employment && employment.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Employment Records</p>
                  <div className="space-y-2">
                    {employment.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-muted/40">
                        <span className="font-medium truncate">{e.job_title}{e.company ? ` — ${e.company}` : ""}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => verifyEmploymentMutation.mutate(e.id)}
                          disabled={verifyEmploymentMutation.isPending}
                        >
                          Verify
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {memberBusinesses && memberBusinesses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Business Listings</p>
                  <div className="space-y-2">
                    {memberBusinesses.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-muted/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{b.name}</span>
                          {b.verified && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Verified</Badge>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!b.verified ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => verifyBusinessMutation.mutate({ bizId: b.id, verified: true })}
                              disabled={verifyBusinessMutation.isPending}
                            >
                              Approve
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                              onClick={() => verifyBusinessMutation.mutate({ bizId: b.id, verified: false })}
                              disabled={verifyBusinessMutation.isPending}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!employment || employment.length === 0) && (!memberBusinesses || memberBusinesses.length === 0) && (
                <p className="text-sm text-muted-foreground">No employment records or business listings to verify.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Personal info */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg font-display">Personal Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            {member.gender && <div><span className="text-muted-foreground">Gender</span><p>{member.gender}</p></div>}
            {canSeeField("dob") && member.dob && <div><span className="text-muted-foreground">Date of Birth</span><p>{format(parseISO(member.dob), "d MMMM yyyy")}</p></div>}
            {canSeeField("birth_place") && member.birth_place && <div><span className="text-muted-foreground">Birth Place</span><p>{member.birth_place}</p></div>}
          </CardContent>
        </Card>

        {/* Employment */}
        {employment && employment.length > 0 && canSeeField("employment") && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg font-display flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />Employment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {employment.map((e) => (
                <div key={e.id} className="text-sm">
                  <p className="font-medium">{e.job_title}{e.company ? ` at ${e.company}` : ""}</p>
                  {e.sector && <p className="text-muted-foreground">{e.sector}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg font-display flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Education</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {education.map((e) => (
                <div key={e.id} className="text-sm">
                  <p className="font-medium">{e.degree}{e.institution ? ` — ${e.institution}` : ""}</p>
                  {e.year && <p className="text-muted-foreground">{e.year}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Family tree */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg font-display flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Family</CardTitle></CardHeader>
          <CardContent>
            <FamilyTree memberId={id!} />
            {(!familyLinks || familyLinks.length === 0) && (
              <p className="text-sm text-muted-foreground">No family connections linked yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Sakha endorsement */}
        <SakhaEndorsement
          targetMemberId={id!}
          currentMemberId={currentMember?.id ?? null}
          currentMemberLevel={currentMember?.verification_level ?? 0}
          targetMemberLevel={member.verification_level ?? 0}
          isOwnProfile={isOwnProfile}
        />

        {/* Vouches */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg font-display flex items-center gap-2"><Heart className="w-4 h-4 text-secondary" />Vouches ({vouches?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {vouches?.map((v) => (
              <div key={v.id} className="text-sm border-b border-border pb-2 last:border-0">
                <p className="font-medium">{(v.voucher as { first_name: string; last_name: string } | null)?.first_name} {(v.voucher as { first_name: string; last_name: string } | null)?.last_name}</p>
                {v.note && <p className="text-muted-foreground">{v.note}</p>}
              </div>
            ))}
            {!isOwnProfile && !alreadyVouched && currentMember && (
              <div className="pt-2 space-y-2">
                <Textarea placeholder="Add a note (optional)" value={vouchNote} onChange={(e) => setVouchNote(e.target.value)} maxLength={500} />
                <Button size="sm" className="gradient-warm text-primary-foreground" onClick={() => vouchMutation.mutate()} disabled={vouchMutation.isPending}>
                  Vouch for {member.first_name}
                </Button>
              </div>
            )}
            {/* Request Vouch — for L0/L1 viewers to ask this member to vouch for them */}
            {!isOwnProfile && currentMember && (currentMember?.verification_level ?? 0) < 2 && (
              <div className="border-t border-border pt-3 mt-1">
                {existingVouchRequest ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Vouch request sent — status: <span className="font-semibold capitalize">{existingVouchRequest.status}</span>
                  </p>
                ) : vouchReqOpen ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Ask {member.first_name} to vouch for you</p>
                    <Textarea
                      placeholder={`Hi ${member.first_name}, I'm [your name] from [chapter]. Could you vouch for me?`}
                      value={vouchReqMessage}
                      onChange={(e) => setVouchReqMessage(e.target.value)}
                      maxLength={500}
                      className="text-xs"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setVouchReqOpen(false); setVouchReqMessage(""); }} className="text-xs">Cancel</Button>
                      <Button size="sm" onClick={() => sendVouchRequestMutation.mutate()} disabled={sendVouchRequestMutation.isPending} className="text-xs">
                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> Send Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setVouchReqOpen(true)}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Request {member.first_name} to vouch for you
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
