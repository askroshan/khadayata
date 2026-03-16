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
import { Plus, UserPlus, Trash2, Clock, Mail, Phone } from "lucide-react";

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

interface FamilyInviteDialogProps {
  memberId: string;
}

export function FamilyInviteDialog({ memberId }: FamilyInviteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [relation, setRelation] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  const { data: invitations, refetch } = useQuery({
    queryKey: ["family-invitations", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("family_invitations")
        .select("*")
        .eq("inviter_member_id", memberId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!memberId,
  });

  const sendInvite = useMutation({
    mutationFn: async () => {
      if (!relation || !name.trim()) throw new Error("Name and relation are required");
      if (!email.trim() && !phone.trim()) throw new Error("Please provide email or phone");
      const { error } = await supabase.from("family_invitations").insert({
        inviter_member_id: memberId,
        relation,
        invitee_name: name.trim(),
        invitee_email: email.trim() || null,
        invitee_phone: phone.trim() || null,
        invitee_phone_country_code: phone.trim() ? countryCode : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation sent!" });
      setRelation("");
      setName("");
      setEmail("");
      setPhone("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["my-family-links"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetch(),
  });

  return (
    <>
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
              <Select value={relation} onValueChange={setRelation}>
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
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter their name" maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their@email.com" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((cc) => (
                      <SelectItem key={cc.label} value={cc.code}>{cc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))} placeholder="9876543210\" maxLength={15} />
              </div>
            </div>
            <Button
              onClick={() => sendInvite.mutate()}
              disabled={!relation || !name.trim() || (!email.trim() && !phone.trim()) || sendInvite.isPending}
              className="w-full gradient-warm text-primary-foreground"
            >
              <UserPlus className="w-4 h-4 mr-1" />Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending invitations list */}
      {invitations && invitations.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Invitations</p>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm group">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{inv.relation}</Badge>
                <span className="font-medium">{inv.invitee_name}</span>
                {inv.invitee_email && <Mail className="w-3 h-3 text-muted-foreground" />}
                {inv.invitee_phone && <Phone className="w-3 h-3 text-muted-foreground" />}
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />{inv.status}
                </Badge>
              </div>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => cancelInvite.mutate(inv.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
