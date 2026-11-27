import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Share2, Save, Phone, MapPin } from "lucide-react";

type SocialLinks = {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  x?: string;
  website?: string;
};

type MemberExt = {
  id: string;
  social_links?: SocialLinks | null;
  current_country_id?: string | null;
  current_city_id?: string | null;
};

export function SocialLinksEditor() {
  const { user } = useAuth();
  const { data: rawMember } = useMember();
  const member = rawMember as unknown as MemberExt | null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [links, setLinks] = useState<SocialLinks>({});
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");

  // Load existing contacts
  const { data: contacts } = useQuery({
    queryKey: ["member-contacts-editor", member?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_contacts")
        .select("id, type, value, primary_flag")
        .eq("member_id", member!.id);
      return data ?? [];
    },
    enabled: !!member?.id,
  });

  // Load master seed countries & cities
  const { data: countries = [] } = useQuery({
    queryKey: ["seed-countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("id, name, iso2").order("name");
      return data ?? [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["seed-cities-by-country", countryId],
    queryFn: async () => {
      if (!countryId) return [];
      const { data: states } = await supabase.from("states").select("id").eq("country_id", countryId);
      const stateIds = (states ?? []).map((s) => s.id);
      if (stateIds.length === 0) return [];
      const { data } = await supabase
        .from("cities")
        .select("id, name")
        .in("state_id", stateIds)
        .order("name");
      return data ?? [];
    },
    enabled: !!countryId,
  });

  useEffect(() => {
    if (!member) return;
    setLinks(member.social_links ?? {});
    setCountryId(member.current_country_id ?? "");
    setCityId(member.current_city_id ?? "");
  }, [member]);

  useEffect(() => {
    const existingEmail = contacts?.find((c) => c.type === "email")?.value ?? user?.email ?? "";
    const existingPhone = contacts?.find((c) => c.type === "phone")?.value ?? "";
    const existingWa = contacts?.find((c) => c.type === "whatsapp")?.value ?? "";
    setEmail(existingEmail);
    setPhone(existingPhone);
    setWhatsapp(existingWa);
    setSameAsPhone(Boolean(existingPhone && existingWa && existingPhone === existingWa));
  }, [contacts, user?.email]);

  const effectiveWhatsapp = useMemo(() => (sameAsPhone ? phone : whatsapp), [sameAsPhone, phone, whatsapp]);

  const saveAll = useMutation({
    mutationFn: async () => {
      if (!member?.id) throw new Error("Member profile not found");
      const cleanEmail = email.trim();
      const cleanPhone = phone.trim();
      const cleanWa = effectiveWhatsapp.trim();

      if (!cleanEmail) throw new Error("At least 1 email address is required.");
      if (!cleanPhone) throw new Error("At least 1 phone number (with country code) is required.");
      if (!cleanWa) throw new Error("At least 1 WhatsApp number (with country code) is required.");
      if (!countryId) throw new Error("Current Country (from master list) is required.");
      if (cities.length > 0 && !cityId) throw new Error("Current City (from master list) is required.");

      const cleanedLinks: SocialLinks = {};
      (["linkedin", "instagram", "facebook", "x", "website"] as const).forEach((k) => {
        const val = (links[k] ?? "").trim();
        if (val) cleanedLinks[k] = val;
      });

      // 1. Update members (single source of truth: social_links + current_country_id + current_city_id)
      const { error: memErr } = await supabase
        .from("members")
        .update({
          social_links: cleanedLinks,
          current_country_id: countryId || null,
          current_city_id: cityId || null,
        } as Record<string, unknown>)
        .eq("id", member.id);
      if (memErr) throw memErr;

      // 2. Upsert primary email, phone, whatsapp in member_contacts
      const upsertContact = async (type: "email" | "phone" | "whatsapp", value: string) => {
        const existingRow = contacts?.find((c) => c.type === type);
        if (existingRow) {
          const { error } = await supabase
            .from("member_contacts")
            .update({ value, primary_flag: true })
            .eq("id", existingRow.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("member_contacts")
            .insert({ member_id: member.id, type, value, primary_flag: true });
          if (error) throw error;
        }
      };

      await upsertContact("email", cleanEmail);
      await upsertContact("phone", cleanPhone);
      await upsertContact("whatsapp", cleanWa);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member"] });
      queryClient.invalidateQueries({ queryKey: ["member-contacts-editor"] });
      queryClient.invalidateQueries({ queryKey: ["member-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["matrimonial-profile-detail"] });
      toast({
        title: "Contact, location & social profiles saved",
        description: "Updated once — synced across your profile, directory, and matrimonial page.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Please check required fields", description: err.message, variant: "destructive" });
    },
  });

  if (!member) return null;

  return (
    <Card className="card-lift border-border" id="contact-location-social">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" /> Contact, Current Location &amp; Social Profiles
        </CardTitle>
        <CardDescription>
          Required for profile completeness. Single source of truth — updates here automatically sync to your directory and matrimonial profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mandatory Contact Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <Phone className="w-4 h-4 text-primary" /> Contact Details (Mandatory)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contact-email">Primary Email *</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone Number (with country code) *</Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="+1 555-123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-whatsapp">WhatsApp Number (with country code) *</Label>
              <Input
                id="contact-whatsapp"
                type="tel"
                placeholder="+1 555-123-4567"
                value={effectiveWhatsapp}
                disabled={sameAsPhone}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
              />
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="wa-same-as-phone"
                  checked={sameAsPhone}
                  onCheckedChange={(checked) => {
                    const isSame = checked === true;
                    setSameAsPhone(isSame);
                    if (isSame) setWhatsapp(phone);
                  }}
                />
                <Label htmlFor="wa-same-as-phone" className="text-xs font-normal text-muted-foreground cursor-pointer">
                  WhatsApp number is the same as Phone number
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Mandatory Current Country & City from Master Seed Data */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <MapPin className="w-4 h-4 text-primary" /> Current Location (Select from Master List) *
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Current Country *</Label>
              <Select
                value={countryId}
                onValueChange={(val) => {
                  setCountryId(val);
                  setCityId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country..." />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Current City *</Label>
              <Select
                value={cityId}
                onValueChange={setCityId}
                disabled={!countryId || cities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!countryId ? "Select country first..." : cities.length === 0 ? "No cities listed for country" : "Select city..."} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Social & Professional Handles */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <Share2 className="w-4 h-4 text-primary" /> Social Media Handles (LinkedIn, Instagram, Facebook, X)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="social-linkedin">LinkedIn URL</Label>
              <Input
                id="social-linkedin"
                placeholder="https://linkedin.com/in/yourname"
                value={links.linkedin ?? ""}
                onChange={(e) => setLinks((p) => ({ ...p, linkedin: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social-instagram">Instagram URL or Handle</Label>
              <Input
                id="social-instagram"
                placeholder="https://instagram.com/yourhandle"
                value={links.instagram ?? ""}
                onChange={(e) => setLinks((p) => ({ ...p, instagram: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social-facebook">Facebook URL</Label>
              <Input
                id="social-facebook"
                placeholder="https://facebook.com/yourprofile"
                value={links.facebook ?? ""}
                onChange={(e) => setLinks((p) => ({ ...p, facebook: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social-x">X (Twitter) URL</Label>
              <Input
                id="social-x"
                placeholder="https://x.com/yourhandle"
                value={links.x ?? ""}
                onChange={(e) => setLinks((p) => ({ ...p, x: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="social-website">Personal / Business Website</Label>
              <Input
                id="social-website"
                placeholder="https://yourwebsite.com"
                value={links.website ?? ""}
                onChange={(e) => setLinks((p) => ({ ...p, website: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={() => saveAll.mutate()}
          disabled={saveAll.isPending}
          className="cta-shimmer gradient-warm text-primary-foreground"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saveAll.isPending ? "Saving..." : "Save Contact, Location & Social Profiles"}
        </Button>
      </CardContent>
    </Card>
  );
}
