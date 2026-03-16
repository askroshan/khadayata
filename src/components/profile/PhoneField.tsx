import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, Pencil as Edit, X, Phone } from "lucide-react";

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

interface PhoneFieldProps {
  memberId: string;
}

export function PhoneField({ memberId }: PhoneFieldProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  const { data: phoneContact } = useQuery({
    queryKey: ["member-phone", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_contacts")
        .select("*")
        .eq("member_id", memberId)
        .eq("type", "phone")
        .eq("primary_flag", true)
        .maybeSingle();
      return data;
    },
    enabled: !!memberId,
  });

  useEffect(() => {
    if (phoneContact?.value) {
      // Parse existing value to extract country code
      const match = phoneContact.value.match(/^(\+\d{1,4})\s*(.*)$/);
      if (match) {
        setCountryCode(match[1]);
        setPhoneNumber(match[2]);
      } else {
        setPhoneNumber(phoneContact.value);
      }
    }
  }, [phoneContact]);

  const savePhone = useMutation({
    mutationFn: async () => {
      if (!phoneNumber.trim()) throw new Error("Phone number required");
      const fullNumber = `${countryCode} ${phoneNumber.trim()}`;
      if (phoneContact) {
        const { error } = await supabase
          .from("member_contacts")
          .update({ value: fullNumber })
          .eq("id", phoneContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("member_contacts")
          .insert({ member_id: memberId, type: "phone", value: fullNumber, primary_flag: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Phone updated!" });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["member-phone", memberId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (editing) {
    return (
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Phone</Label>
        <div className="flex gap-2">
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="w-28 shrink-0 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((cc) => (
                <SelectItem key={cc.label} value={cc.code}>{cc.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="9876543210"
            maxLength={15}
            className="h-9"
          />
          <Button size="sm" variant="ghost" className="h-9" onClick={() => savePhone.mutate()} disabled={savePhone.isPending}>
            <Check className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-9" onClick={() => setEditing(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-muted-foreground text-sm">Phone</span>
        <p className="text-sm">{phoneContact?.value ?? "—"}</p>
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
        <Edit className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
