import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Clock, Mail, Phone, Pencil, Check, X } from "lucide-react";

const RELATIONS = ["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister"];
const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+1", label: "🇨🇦 +1" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+254", label: "🇰🇪 +254" },
];

export interface FamilyInvitation {
  id: string;
  relation: string;
  invitee_name: string;
  invitee_email: string | null;
  invitee_phone: string | null;
  invitee_phone_country_code: string | null;
  status: string;
  created_at: string;
}

interface FamilyInviteDialogProps {
  memberId: string;
}

interface InviteFormState {
  relation: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

const defaultForm: InviteFormState = {
  relation: "",
  name: "",
  email: "",
  phone: "",
  countryCode: "+91",
};

export function useFamilyInvitations(memberId: string) {
  return useQuery<FamilyInvitation[]>({
    queryKey: ["family-invitations", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("family_invitations")
        .select("*")
        .eq("inviter_member_id", memberId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return (data ?? []) as FamilyInvitation[];
    },
    enabled: !!memberId,
  });
}

export function FamilyInviteDialog({ memberId }: FamilyInviteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InviteFormState>(defaultForm);

  const setField = (field: keyof InviteFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const sendInvite = useMutation({
    mutationFn: async () => {
      if (!form.relation || !form.name.trim()) throw new Error("Name and relation are required");
      if (!form.email.trim() && !form.phone.trim()) throw new Error("Please provide email or phone");
      const { data: inserted, error } = await supabase
        .from("family_invitations")
        .insert({
          inviter_member_id: memberId,
          relation: form.relation,
          invitee_name: form.name.trim(),
          invitee_email: form.email.trim() || null,
          invitee_phone: form.phone.trim() || null,
          invitee_phone_country_code: form.phone.trim() ? form.countryCode : null,
        })
        .select("acceptance_token")
        .single();
      if (error) throw error;

      if (form.email.trim() && inserted?.acceptance_token) {
        const { data: inviterData } = await supabase
          .from("members")
          .select("first_name, last_name")
          .eq("id", memberId)
          .maybeSingle();
        const inviterName = inviterData
          ? `${inviterData.first_name} ${inviterData.last_name}`.trim()
          : "A community member";
        const acceptUrl = `${window.location.origin}/accept-family-invite/${inserted.acceptance_token}`;
        await supabase.functions.invoke("send-email", {
          body: {
            template: "family_invitation_sent",
            to: form.email.trim(),
            vars: {
              name: form.name.trim(),
              inviter_name: inviterName,
              relation: form.relation,
              join_url: acceptUrl,
            },
          },
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Invitation sent!" });
      setForm(defaultForm);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["family-invitations", memberId] });
      queryClient.invalidateQueries({ queryKey: ["my-family-links"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isValid = form.relation && form.name.trim() && (form.email.trim() || form.phone.trim());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="w-3.5 h-3.5 mr-1" />Invite Family
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a Family Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Relation *</Label>
            <Select value={form.relation} onValueChange={(v) => setField("relation", v)}>
              <SelectTrigger><SelectValue placeholder="Select relation..." /></SelectTrigger>
              <SelectContent>
                {RELATIONS.map((r) => (
                  <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Enter their name" maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="their@email.com" maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <div className="flex gap-2">
              <Select value={form.countryCode} onValueChange={(v) => setField("countryCode", v)}>
                <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((cc) => (
                    <SelectItem key={cc.label} value={cc.code}>{cc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="9876543210"
                maxLength={15}
              />
            </div>
          </div>
          <Button
            onClick={() => sendInvite.mutate()}
            disabled={!isValid || sendInvite.isPending}
            className="w-full gradient-warm text-primary-foreground"
          >
            <UserPlus className="w-4 h-4 mr-1" />{sendInvite.isPending ? "Sending…" : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PendingInvitationsListProps {
  memberId: string;
}

export function PendingInvitationsList({ memberId }: PendingInvitationsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: invitations } = useFamilyInvitations(memberId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InviteFormState>>({});

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-invitations", memberId] });
      toast({ title: "Invitation cancelled" });
    },
  });

  const saveEdit = useMutation({
    mutationFn: async (id: string) => {
      if (!editForm.name?.trim()) throw new Error("Name is required");
      if (!editForm.email?.trim() && !editForm.phone?.trim()) throw new Error("Email or phone required");
      const { error } = await supabase
        .from("family_invitations")
        .update({
          relation: editForm.relation,
          invitee_name: editForm.name?.trim(),
          invitee_email: editForm.email?.trim() || null,
          invitee_phone: editForm.phone?.trim() || null,
          invitee_phone_country_code: editForm.phone?.trim() ? (editForm.countryCode ?? "+91") : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditForm({});
      queryClient.invalidateQueries({ queryKey: ["family-invitations", memberId] });
      toast({ title: "Invitation updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const startEdit = (inv: FamilyInvitation) => {
    setEditingId(inv.id);
    setEditForm({
      relation: inv.relation,
      name: inv.invitee_name,
      email: inv.invitee_email ?? "",
      phone: inv.invitee_phone ?? "",
      countryCode: inv.invitee_phone_country_code ?? "+91",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (!invitations?.length) return null;

  return (
    <div className="w-full space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Pending Invitations
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relation</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Contact</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) =>
            editingId === inv.id ? (
              <tr key={inv.id}>
                <td colSpan={5} className="py-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Relation</Label>
                        <Select value={editForm.relation ?? ""} onValueChange={(v) => setEditForm((p) => ({ ...p, relation: v }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RELATIONS.map((r) => (
                              <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input className="h-8 text-xs" value={editForm.name ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} maxLength={200} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input className="h-8 text-xs" type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} maxLength={255} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <div className="flex gap-1">
                          <Select value={editForm.countryCode ?? "+91"} onValueChange={(v) => setEditForm((p) => ({ ...p, countryCode: v }))}>
                            <SelectTrigger className="w-20 h-8 text-xs shrink-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COUNTRY_CODES.map((cc) => (
                                <SelectItem key={cc.label} value={cc.code}>{cc.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input className="h-8 text-xs" value={editForm.phone ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, "") }))} maxLength={15} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gradient-warm text-primary-foreground" onClick={() => saveEdit.mutate(inv.id)} disabled={saveEdit.isPending}>
                        <Check className="w-3 h-3 mr-1" />Save
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEdit}>
                        <X className="w-3 h-3 mr-1" />Cancel
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
                <td className="py-3 font-medium text-foreground">{inv.invitee_name}</td>
                <td className="py-3 px-3">
                  <Badge variant="outline" className="capitalize">{inv.relation}</Badge>
                </td>
                <td className="py-3 px-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {inv.invitee_email && <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /><span className="truncate max-w-32">{inv.invitee_email}</span></span>}
                    {inv.invitee_phone && !inv.invitee_email && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{inv.invitee_phone_country_code} {inv.invitee_phone}</span>}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Clock className="w-3 h-3" />{inv.status}
                  </Badge>
                </td>
                <td className="py-3 text-right">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(inv)} title="Edit">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cancelInvite.mutate(inv.id)} title="Cancel">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
