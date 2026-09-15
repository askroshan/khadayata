import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronUp, ChevronDown, ExternalLink, Search, Download, X, Pencil, UserPlus, ShieldBan, Lock, Clock as Unlock, Trash2, Mail, MailCheck, Send, Upload, FileText, Users, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { LEVEL_LABELS as SHARED_LEVEL_LABELS, exportFilteredCsv, type AdminMember } from "@/lib/admin-utils";
import { parseEmailsFromText } from "@/lib/bulk-invite-utils";

interface Member {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  verification_level: number;
  onboarding_completed: boolean;
  chapter_id: string | null;
  created_at?: string;
  chapters: { name: string } | null;
}

interface CommitteeRole {
  id: string;
  name: string;
}

interface MembersTabProps {
  members: Member[] | undefined;
  myChapterId: string | null;
  canInvite?: boolean;
  isGlobalAdmin?: boolean;
}

const LEVEL_LABELS = SHARED_LEVEL_LABELS;
const PAGE_SIZE = 25;

export default function MembersTab({ members, myChapterId, canInvite = false, isGlobalAdmin = false }: MembersTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editMember, setEditMember] = useState<{
    id: string; first_name: string; last_name: string; chapter_id: string;
    middle_names: string; gender: string; dob: string; birth_place: string;
    ekda: string; kuldevi: string;
  } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", first_name: "", last_name: "", chapter_id: "" });
  const [memberCommitteeRoles, setMemberCommitteeRoles] = useState<Record<string, string>>({});

  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [bulkInvalid, setBulkInvalid] = useState<string[]>([]);
  const [bulkDuplicates, setBulkDuplicates] = useState(0);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkChapterId, setBulkChapterId] = useState(myChapterId ?? "");
  const [bulkFirstName, setBulkFirstName] = useState("");

  const { data: memberStatuses } = useQuery({
    queryKey: ["admin-member-statuses", myChapterId],
    queryFn: async () => {
      let q = supabase.from("members").select("id, suspended, blocked").limit(500);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      const map: Record<string, { suspended: boolean; blocked: boolean }> = {};
      data?.forEach((m) => { map[m.id] = { suspended: m.suspended, blocked: m.blocked }; });
      return map;
    },
    enabled: isGlobalAdmin,
  });

  const { data: memberEmails } = useQuery({
    queryKey: ["admin-member-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_member_emails");
      if (error) throw error;
      const map: Record<string, { email: string; email_confirmed_at: string | null }> = {};
      (data ?? []).forEach((r: { member_id: string; email: string; email_confirmed_at: string | null }) => {
        map[r.member_id] = { email: r.email, email_confirmed_at: r.email_confirmed_at };
      });
      return map;
    },
    enabled: isGlobalAdmin || !!editMember,
  });

  const { data: memberPhones } = useQuery({
    queryKey: ["admin-member-phones"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_member_phones");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { member_id: string; phone: string }) => {
        map[r.member_id] = r.phone;
      });
      return map;
    },
    enabled: isGlobalAdmin || !!editMember,
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters-list"],
    queryFn: async () => {
      const { data } = await supabase.from("chapters").select("id, name").order("name");
      return data ?? [];
    },
    enabled: !!editMember || inviteOpen || bulkInviteOpen,
  });

  const { data: committeeRoles } = useQuery({
    queryKey: ["committee-roles", editMember?.chapter_id],
    queryFn: async () => {
      if (!editMember?.chapter_id) return [];
      const { data } = await supabase.from("roles").select("id, name").eq("chapter_id", editMember.chapter_id).ilike("name", "%Committee%");
      return data ?? [];
    },
    enabled: !!editMember?.chapter_id,
  });

  const { data: memberRoles } = useQuery({
    queryKey: ["member-roles", editMember?.id],
    queryFn: async () => {
      if (!editMember?.id) return [];
      const { data } = await supabase
        .from("role_assignments")
        .select("role_id, roles(id, name)")
        .eq("member_id", editMember.id);
      return data ?? [];
    },
    enabled: !!editMember?.id,
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async () => {
      if (bulkEmails.length === 0) throw new Error("No valid emails to send");
      const { data, error } = await supabase.functions.invoke("bulk-invite", {
        body: {
          emails: bulkEmails,
          chapter_id: bulkChapterId || null,
          first_name: bulkFirstName.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message ?? "Failed to send bulk invitations");
      if (data?.error) throw new Error(data.error);
      return data as { sent: number; failed: number; skipped: number; errors: string[]; total: number };
    },
    onSuccess: (result) => {
      if (result.sent > 0) {
        const parts: string[] = [`${result.sent} invitation${result.sent !== 1 ? "s" : ""} sent`];
        if (result.failed > 0) parts.push(`${result.failed} failed`);
        if (result.skipped > 0) parts.push(`${result.skipped} already registered`);
        toast({ title: "Bulk invitations sent", description: parts.join(", ") + "." });
      } else {
        toast({
          title: "No invitations sent",
          description: `All ${result.failed + result.skipped} email${(result.failed + result.skipped) !== 1 ? "s" : ""} were already registered or failed.`,
          variant: "destructive",
        });
      }
      setBulkInviteOpen(false);
      setBulkEmails([]);
      setBulkInvalid([]);
      setBulkDuplicates(0);
      setBulkFileName("");
      setBulkFirstName("");
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const result = parseEmailsFromText(text);
      setBulkEmails(result.valid);
      setBulkInvalid(result.invalid);
      setBulkDuplicates(result.duplicates);
    };
    reader.readAsText(file);
  };

  const editMemberMutation = useMutation({
    mutationFn: async () => {
      if (!editMember) return;
      const updatePayload: Record<string, unknown> = {
        first_name: editMember.first_name.trim(),
        last_name: editMember.last_name.trim(),
        chapter_id: editMember.chapter_id || null,
      };
      if (isGlobalAdmin) {
        updatePayload.middle_names = editMember.middle_names.trim() || null;
        updatePayload.gender = editMember.gender || null;
        updatePayload.dob = editMember.dob || null;
        updatePayload.birth_place = editMember.birth_place.trim() || null;
        updatePayload.ekda = editMember.ekda.trim() || null;
        updatePayload.kuldevi = editMember.kuldevi.trim() || null;
      }
      const { error } = await supabase.from("members").update(updatePayload).eq("id", editMember.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member updated" });
      setEditMember(null);
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async () => {
      if (!inviteForm.email.trim()) throw new Error("Email is required");
      if (!inviteForm.first_name.trim()) throw new Error("First name is required");
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: {
          email: inviteForm.email.trim(),
          first_name: inviteForm.first_name.trim(),
          last_name: inviteForm.last_name.trim(),
          chapter_id: inviteForm.chapter_id || null,
        },
      });
      if (error) throw new Error(error.message ?? "Failed to send invitation");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Invitation sent", description: `An invite email has been sent to ${inviteForm.email}` });
      setInviteForm({ email: "", first_name: "", last_name: "", chapter_id: "" });
      setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resendVerificationEmail = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { data, error } = await supabase.functions.invoke("send-reminder", {
        body: { member_ids: [memberId] },
      });
      if (error) throw new Error(error.message ?? "Failed to resend invitation");
      if (data?.error) throw new Error(data.error);
      if (data?.sent === 0) throw new Error(data.errors?.[0] ?? "Email sending failed");
    },
    onSuccess: (_, { memberId }) => {
      const email = memberEmails?.[memberId]?.email ?? "member";
      toast({ title: "Verification email resent", description: `Invitation re-sent to ${email}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateLevel = useMutation({
    mutationFn: async ({ memberId, level }: { memberId: string; level: number }) => {
      const { error } = await supabase.from("members").update({ verification_level: level }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verification level updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCommitteeRole = useMutation({
    mutationFn: async ({ memberId, roleId, roleName }: { memberId: string; roleId: string; roleName: string }) => {
      if (!editMember?.chapter_id) throw new Error("No chapter assigned");
      const { data: existingAssignment } = await supabase
        .from("role_assignments")
        .select("id")
        .eq("member_id", memberId)
        .eq("role_id", roleId)
        .maybeSingle();
      if (existingAssignment) {
        const { error: revokeError } = await supabase.rpc("revoke_role", { p_assignment_id: existingAssignment.id });
        if (revokeError) throw new Error(revokeError.message);
      } else {
        const { error: assignError } = await supabase.rpc("assign_role", {
          p_member_id: memberId,
          p_role_id: roleId,
          p_chapter_id: editMember.chapter_id,
        });
        if (assignError) throw new Error(assignError.message);
      }
    },
    onSuccess: () => {
      toast({ title: "Committee role updated" });
      queryClient.invalidateQueries({ queryKey: ["member-roles", editMember?.id] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const suspendMember = useMutation({
    mutationFn: async ({ memberId, suspend }: { memberId: string; suspend: boolean }) => {
      const { error } = await supabase.from("members").update({
        suspended: suspend,
        suspended_at: suspend ? new Date().toISOString() : null,
        suspended_reason: suspend ? suspendReason.trim() || null : null,
      }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, { suspend }) => {
      toast({ title: suspend ? "Member suspended" : "Member unsuspended" });
      setSuspendTarget(null);
      setSuspendReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-member-statuses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const blockMember = useMutation({
    mutationFn: async ({ memberId, block }: { memberId: string; block: boolean }) => {
      const { error } = await supabase.from("members").update({
        blocked: block,
        blocked_at: block ? new Date().toISOString() : null,
      }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, { block }) => {
      toast({ title: block ? "Member blocked" : "Member unblocked" });
      setBlockTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-member-statuses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMember = useMutation({
    mutationFn: async (memberId: string) => {
      const memberData = members?.find((m) => m.id === memberId);
      if (!memberData) throw new Error("Member not found");

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: memberData.user_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }
    },
    onSuccess: () => {
      toast({ title: "Member deleted permanently" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-member-statuses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const loadFullMemberForEdit = async (memberId: string, firstName: string, lastName: string, chapterId: string) => {
    const { data } = await supabase
      .from("members")
      .select("middle_names, gender, dob, birth_place, ekda, kuldevi")
      .eq("id", memberId)
      .maybeSingle();
    setEditMember({
      id: memberId,
      first_name: firstName,
      last_name: lastName,
      chapter_id: chapterId,
      middle_names: (data?.middle_names as string) ?? "",
      gender: (data?.gender as string) ?? "",
      dob: (data?.dob as string) ?? "",
      birth_place: (data?.birth_place as string) ?? "",
      ekda: (data?.ekda as string) ?? "",
      kuldevi: (data?.kuldevi as string) ?? "",
    });
  };

  const filtered = useMemo(() => {
    if (!members) return [];
    let list = [...members];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.chapters as { name: string } | null)?.name?.toLowerCase().includes(q) ||
        (isGlobalAdmin && memberEmails?.[m.id]?.email?.toLowerCase().includes(q))
      );
    }
    if (filterLevel !== "" && filterLevel !== "all") {
      list = list.filter((m) => m.verification_level === Number(filterLevel));
    }
    if (filterStatus === "complete") list = list.filter((m) => m.onboarding_completed);
    if (filterStatus === "pending") list = list.filter((m) => !m.onboarding_completed);
    if (filterStatus === "suspended") list = list.filter((m) => memberStatuses?.[m.id]?.suspended);
    if (filterStatus === "blocked") list = list.filter((m) => memberStatuses?.[m.id]?.blocked);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      list = list.filter((m) => m.created_at && new Date(m.created_at) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      list = list.filter((m) => m.created_at && new Date(m.created_at) <= toDate);
    }
    return list;
  }, [members, search, filterLevel, filterStatus, dateFrom, dateTo, memberStatuses, isGlobalAdmin, memberEmails, memberPhones]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || (filterLevel && filterLevel !== "all") || (filterStatus && filterStatus !== "all") || dateFrom || dateTo;

  const clearFilters = () => { setSearch(""); setFilterLevel(""); setFilterStatus(""); setDateFrom(""); setDateTo(""); setPage(1); };

  const getMemberStatusBadge = (memberId: string) => {
    if (!memberStatuses) return null;
    const s = memberStatuses[memberId];
    if (!s) return null;
    if (s.blocked) return <Badge className="bg-red-600 text-white border-0 text-[10px]">Blocked</Badge>;
    if (s.suspended) return <Badge className="bg-amber-600 text-white border-0 text-[10px]">Suspended</Badge>;
    return null;
  };

  return (
    <>
    <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) { setInviteOpen(false); setInviteForm({ email: "", first_name: "", last_name: "", chapter_id: "" }); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          <DialogDescription>Send an email invitation to join the community.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="member@example.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name *</Label><Input value={inviteForm.first_name} onChange={e => setInviteForm({ ...inviteForm, first_name: e.target.value })} maxLength={100} /></div>
            <div><Label>Last Name</Label><Input value={inviteForm.last_name} onChange={e => setInviteForm({ ...inviteForm, last_name: e.target.value })} maxLength={100} /></div>
          </div>
          <div>
            <Label>Assign to Chapter</Label>
            <Select value={inviteForm.chapter_id || "__none__"} onValueChange={v => setInviteForm({ ...inviteForm, chapter_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="No chapter (assign later)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No chapter (assign later)</SelectItem>
                {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => inviteMemberMutation.mutate()} disabled={!inviteForm.email.trim() || !inviteForm.first_name.trim() || inviteMemberMutation.isPending} className="w-full gradient-warm text-primary-foreground">
            <UserPlus className="w-4 h-4 mr-1" /> Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={!!editMember} onOpenChange={(open) => { if (!open) setEditMember(null); }}>
      <DialogContent className={`${isGlobalAdmin ? "max-w-md" : "max-w-sm"} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>{isGlobalAdmin ? "Update all member profile fields." : "Update member name, chapter assignment, and committee roles."}</DialogDescription>
        </DialogHeader>
        {editMember && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={editMember.first_name} onChange={e => setEditMember({ ...editMember, first_name: e.target.value })} maxLength={100} /></div>
              <div><Label>Last Name *</Label><Input value={editMember.last_name} onChange={e => setEditMember({ ...editMember, last_name: e.target.value })} maxLength={100} /></div>
            </div>
            {(() => {
              const email = memberEmails?.[editMember.id]?.email;
              const phone = memberPhones?.[editMember.id];
              if (!email && !phone) return null;
              return (
                <div className="grid grid-cols-2 gap-3">
                  {email && (
                    <div>
                      <Label className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
                      <Input value={email} readOnly className="bg-muted/50 text-muted-foreground" />
                    </div>
                  )}
                  {phone && (
                    <div>
                      <Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
                      <Input value={phone} readOnly className="bg-muted/50 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })()}
            {isGlobalAdmin && (
              <div><Label>Middle Names</Label><Input value={editMember.middle_names} onChange={e => setEditMember({ ...editMember, middle_names: e.target.value })} maxLength={200} placeholder="Middle name(s)" /></div>
            )}
            {isGlobalAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={editMember.gender || "__none__"} onValueChange={v => setEditMember({ ...editMember, gender: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not set</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date of Birth</Label><Input type="date" value={editMember.dob} onChange={e => setEditMember({ ...editMember, dob: e.target.value })} /></div>
              </div>
            )}
            {isGlobalAdmin && (
              <div><Label>Birth Place</Label><Input value={editMember.birth_place} onChange={e => setEditMember({ ...editMember, birth_place: e.target.value })} maxLength={200} placeholder="City, State, Country" /></div>
            )}
            {isGlobalAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Ekda</Label><Input value={editMember.ekda} onChange={e => setEditMember({ ...editMember, ekda: e.target.value })} maxLength={200} placeholder="Ekda name" /></div>
                <div><Label>Kuldevi</Label><Input value={editMember.kuldevi} onChange={e => setEditMember({ ...editMember, kuldevi: e.target.value })} maxLength={200} placeholder="Kuldevi name" /></div>
              </div>
            )}
            <div>
              <Label>Chapter</Label>
              <Select value={editMember.chapter_id || "__none__"} onValueChange={v => setEditMember({ ...editMember, chapter_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Chapter</SelectItem>
                  {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editMember.chapter_id && committeeRoles && committeeRoles.length > 0 && (
              <div>
                <Label>Committee Roles</Label>
                <div className="space-y-2 mt-2">
                  {committeeRoles.map(role => {
                    const isAssigned = memberRoles?.some(mr => {
                      const r = mr.roles as CommitteeRole | null;
                      return r?.id === role.id;
                    });
                    return (
                      <div key={role.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`role-${role.id}`}
                          checked={isAssigned ?? false}
                          onChange={e => {
                            if (e.target.checked || isAssigned) {
                              updateCommitteeRole.mutate({ memberId: editMember.id, roleId: role.id, roleName: role.name });
                            }
                          }}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer font-normal">{role.name}</Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <Button onClick={() => editMemberMutation.mutate()} disabled={!editMember.first_name.trim() || editMemberMutation.isPending} className="w-full gradient-warm text-primary-foreground">
              Save Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Suspend member dialog */}
    <AlertDialog open={!!suspendTarget} onOpenChange={(open) => { if (!open) { setSuspendTarget(null); setSuspendReason(""); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend Member</AlertDialogTitle>
          <AlertDialogDescription>
            Suspend <strong>{suspendTarget?.name}</strong>? They will lose access to most platform features until unsuspended.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label>Reason (optional)</Label>
          <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension..." rows={2} maxLength={500} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => suspendTarget && suspendMember.mutate({ memberId: suspendTarget.id, suspend: true })}
            disabled={suspendMember.isPending}
          >
            Suspend Member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Block member dialog */}
    <AlertDialog open={!!blockTarget} onOpenChange={(open) => { if (!open) setBlockTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block Member</AlertDialogTitle>
          <AlertDialogDescription>
            Block <strong>{blockTarget?.name}</strong>? This is more severe than suspension -- the member will be completely locked out of the platform.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => blockTarget && blockMember.mutate({ memberId: blockTarget.id, block: true })}
            disabled={blockMember.isPending}
          >
            Block Member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete member dialog */}
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently Delete Member</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently delete <strong>{deleteTarget?.name}</strong>? This will remove all their data including profile, contacts, and related records. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => deleteTarget && deleteMember.mutate(deleteTarget.id)}
            disabled={deleteMember.isPending}
          >
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Member actions dropdown */}
    <Dialog open={!!actionOpen} onOpenChange={(open) => { if (!open) setActionOpen(null); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Member Actions</DialogTitle>
          <DialogDescription>Choose an action for this member.</DialogDescription>
        </DialogHeader>
        {actionOpen && (() => {
          const m = members?.find(mem => mem.id === actionOpen);
          if (!m) return null;
          const status = memberStatuses?.[m.id];
          const isSuspended = status?.suspended ?? false;
          const isBlocked = status?.blocked ?? false;
          return (
            <div className="space-y-2">
              <p className="text-sm font-medium">{m.first_name} {m.last_name}</p>
              <div className="flex flex-wrap gap-1">
                {getMemberStatusBadge(m.id)}
              </div>
              <div className="space-y-2 pt-2 border-t">
                {isGlobalAdmin && (isSuspended ? (
                  <Button
                    variant="outline" className="w-full justify-start gap-2 text-emerald-700"
                    onClick={() => { suspendMember.mutate({ memberId: m.id, suspend: false }); setActionOpen(null); }}
                    disabled={suspendMember.isPending}
                  >
                    <Unlock className="w-4 h-4" /> Unsuspend Member
                  </Button>
                ) : (
                  <Button
                    variant="outline" className="w-full justify-start gap-2 text-amber-700"
                    onClick={() => { setSuspendTarget({ id: m.id, name: `${m.first_name} ${m.last_name}` }); setActionOpen(null); }}
                  >
                    <Lock className="w-4 h-4" /> Suspend Member
                  </Button>
                ))}
                {isGlobalAdmin && (isBlocked ? (
                  <Button
                    variant="outline" className="w-full justify-start gap-2 text-emerald-700"
                    onClick={() => { blockMember.mutate({ memberId: m.id, block: false }); setActionOpen(null); }}
                    disabled={blockMember.isPending}
                  >
                    <Unlock className="w-4 h-4" /> Unblock Member
                  </Button>
                ) : (
                  <Button
                    variant="outline" className="w-full justify-start gap-2 text-red-700"
                    onClick={() => { setBlockTarget({ id: m.id, name: `${m.first_name} ${m.last_name}` }); setActionOpen(null); }}
                  >
                    <ShieldBan className="w-4 h-4" /> Block Member
                  </Button>
                ))}
                {isGlobalAdmin && (
                <Button
                  variant="outline" className="w-full justify-start gap-2 text-destructive"
                  onClick={() => { setDeleteTarget({ id: m.id, name: `${m.first_name} ${m.last_name}` }); setActionOpen(null); }}
                >
                  <Trash2 className="w-4 h-4" /> Delete Permanently
                </Button>
                )}
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>

    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isGlobalAdmin ? "Search by name, chapter, or email..." : "Search by name or chapter..."}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {[0, 1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)}>L{l} — {LEVEL_LABELS[l]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              {isGlobalAdmin && <SelectItem value="suspended">Suspended</SelectItem>}
              {isGlobalAdmin && <SelectItem value="blocked">Blocked</SelectItem>}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="h-9 w-32 text-sm"
            placeholder="From date"
            title="Joined from date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="h-9 w-32 text-sm"
            placeholder="To date"
            title="Joined to date"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-destructive">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => exportFilteredCsv(filtered as AdminMember[])} className="h-9 text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
            {canInvite && (
              <>
                <Button size="sm" variant="outline" onClick={() => {
                  setBulkEmails([]);
                  setBulkInvalid([]);
                  setBulkDuplicates(0);
                  setBulkFileName("");
                  setBulkFirstName("");
                  setBulkChapterId(myChapterId ?? "");
                  setBulkInviteOpen(true);
                }} className="h-9 text-xs">
                  <Users className="w-3.5 h-3.5 mr-1" /> Bulk Invite
                </Button>
                <Button size="sm" onClick={() => {
                  setInviteForm({ email: "", first_name: "", last_name: "", chapter_id: myChapterId ?? "" });
                  setInviteOpen(true);
                }} className="h-9 text-xs gradient-warm text-primary-foreground">
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Invite Member
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} member{filtered.length !== 1 ? "s" : ""} found</p>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Name</th>
                    {isGlobalAdmin && <th className="p-3 text-left font-medium">Email</th>}
                    {isGlobalAdmin && <th className="p-3 text-left font-medium">Phone</th>}
                    <th className="p-3 text-left font-medium">Chapter</th>
                    <th className="p-3 text-left font-medium">Level</th>
                    <th className="p-3 text-left font-medium">Joined</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m) => {
                    const inScope = !myChapterId || m.chapter_id === myChapterId;
                    const status = memberStatuses?.[m.id];
                    return (
                      <tr key={m.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${!inScope ? "opacity-60" : ""} ${status?.blocked ? "bg-red-50/50" : status?.suspended ? "bg-amber-50/50" : ""}`}>
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            {m.first_name} {m.last_name}
                            {getMemberStatusBadge(m.id)}
                          </div>
                        </td>
                        {isGlobalAdmin && (
                          <td className="p-3 text-muted-foreground text-xs">
                            {memberEmails?.[m.id] ? (
                              <div className="flex items-center gap-1">
                                <span className="truncate max-w-[180px]">{memberEmails[m.id].email}</span>
                                {memberEmails[m.id].email_confirmed_at ? (
                                  <MailCheck className="w-3 h-3 text-emerald-600 shrink-0" aria-label="Email verified" />
                                ) : (
                                  <Mail className="w-3 h-3 text-amber-500 shrink-0" aria-label="Email not verified" />
                                )}
                              </div>
                            ) : "—"}
                          </td>
                        )}
                        {isGlobalAdmin && (
                          <td className="p-3 text-muted-foreground text-xs">
                            {memberPhones?.[m.id] ?? "—"}
                          </td>
                        )}
                        <td className="p-3 text-muted-foreground">{(m.chapters as { name: string } | null)?.name ?? "—"}</td>
                        <td className="p-3">
                          <Badge variant="outline">L{m.verification_level} — {LEVEL_LABELS[m.verification_level] ?? "Unknown"}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="p-3">
                          {m.onboarding_completed
                            ? <Badge className="bg-success/20 text-success border-0">Complete</Badge>
                            : (
                              <Link to={`/member/${m.id}?verify=1`} aria-label="Review pending member">
                                <Badge variant="secondary" className="cursor-pointer hover:bg-amber-100 hover:text-amber-800 transition-colors">Pending</Badge>
                              </Link>
                            )
                          }
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={!inScope || m.verification_level >= 5 || updateLevel.isPending}
                                    onClick={() => updateLevel.mutate({ memberId: m.id, level: m.verification_level + 1 })}
                                    aria-label="Upgrade verification level"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!inScope && <TooltipContent>Cannot change level: member belongs to a different chapter</TooltipContent>}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={!inScope || m.verification_level <= 0 || updateLevel.isPending}
                                    onClick={() => updateLevel.mutate({ memberId: m.id, level: m.verification_level - 1 })}
                                    aria-label="Downgrade verification level"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!inScope && <TooltipContent>Cannot change level: member belongs to a different chapter</TooltipContent>}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon" variant="ghost" className="h-7 w-7"
                                  disabled={!inScope}
                                  aria-label="Edit member"
                                  onClick={() => {
                                    if (!inScope) return;
                                    if (isGlobalAdmin) {
                                      loadFullMemberForEdit(m.id, m.first_name, m.last_name, m.chapter_id ?? "");
                                    } else {
                                      setEditMember({ id: m.id, first_name: m.first_name, last_name: m.last_name, chapter_id: m.chapter_id ?? "", middle_names: "", gender: "", dob: "", birth_place: "", ekda: "", kuldevi: "" });
                                    }
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              {!inScope && <TooltipContent>Cannot edit: member belongs to a different chapter</TooltipContent>}
                            </Tooltip>
                            <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="View profile">
                              <Link to={`/member/${m.id}`} aria-label="View member profile">
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </Button>
                            {isGlobalAdmin && !m.onboarding_completed && memberEmails?.[m.id] && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon" variant="ghost"
                                    className="h-7 w-7 text-primary hover:text-primary"
                                    aria-label="Resend verification email"
                                    disabled={resendVerificationEmail.isPending}
                                    onClick={() => resendVerificationEmail.mutate({ memberId: m.id })}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Resend verification email</TooltipContent>
                              </Tooltip>
                            )}
                            {isGlobalAdmin && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon" variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    aria-label="Member admin actions"
                                    onClick={() => setActionOpen(m.id)}
                                  >
                                    <ShieldBan className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Suspend / Block / Delete</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!paginated.length && (
                    <tr><td colSpan={isGlobalAdmin ? 8 : 6} className="p-6 text-center text-muted-foreground">No members found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>

    {/* Bulk Invite Dialog */}
    <Dialog open={bulkInviteOpen} onOpenChange={(open) => { if (!open) { setBulkInviteOpen(false); setBulkEmails([]); setBulkInvalid([]); setBulkDuplicates(0); setBulkFileName(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Bulk Invite Members</DialogTitle>
          <DialogDescription>
            Upload a text file or CSV with one email per line. Each person will receive an invitation email to join the community.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-file-upload">Email File (.txt or .csv)</Label>
            <div className="mt-1">
              <label htmlFor="bulk-file-upload" className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors min-h-[120px]">
                {bulkFileName ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium">{bulkFileName}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
                    <Upload className="w-6 h-6" />
                    <span>Click to choose a file</span>
                    <span className="text-xs">.txt or .csv, one email per line</span>
                  </div>
                )}
                <input
                  id="bulk-file-upload"
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  className="sr-only"
                  onChange={handleBulkFileUpload}
                />
              </label>
            </div>
          </div>

          {bulkEmails.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <MailCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">{bulkEmails.length} valid email{bulkEmails.length !== 1 ? "s" : ""}</span>
              </div>
              {bulkDuplicates > 0 && (
                <p className="text-xs text-muted-foreground ml-6">{bulkDuplicates} duplicate{bulkDuplicates !== 1 ? "s" : ""} removed</p>
              )}
              {bulkInvalid.length > 0 && (
                <p className="text-xs text-amber-600 ml-6">{bulkInvalid.length} invalid line{bulkInvalid.length !== 1 ? "s" : ""} skipped</p>
              )}
            </div>
          )}

          {bulkInvalid.length > 0 && bulkInvalid.length <= 10 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">View invalid lines</summary>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                {bulkInvalid.map((line, i) => <li key={i} className="text-amber-600">{line}</li>)}
              </ul>
            </details>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bulk-first-name">Default First Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="bulk-first-name"
                value={bulkFirstName}
                onChange={(e) => setBulkFirstName(e.target.value)}
                placeholder="Member"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-0.5">Used in the invitation email greeting.</p>
            </div>
            <div>
              <Label>Assign to Chapter</Label>
              <Select value={bulkChapterId} onValueChange={setBulkChapterId}>
                <SelectTrigger><SelectValue placeholder="Auto / None" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {chapters?.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => bulkInviteMutation.mutate()}
            disabled={bulkEmails.length === 0 || bulkInviteMutation.isPending}
            className="w-full gradient-warm text-primary-foreground"
          >
            {bulkInviteMutation.isPending
              ? "Sending invitations..."
              : `Send ${bulkEmails.length} Invitation${bulkEmails.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
