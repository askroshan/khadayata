import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Heart, Shield, Send, Check, X, Sparkles, User, MapPin, GraduationCap, Briefcase, Ruler, Scale, UtensilsCrossed, Star, Users, Eye, Pencil, Calendar, Gem, BookOpen, Chrome as Home, UserCheck, MessageCircle, Glasses, Car, Globe, Building, BadgeDollarSign, Linkedin, Phone, Crown, Flag, Trash2 } from "lucide-react";
import matrimonialHero from "@/assets/matrimonial-hero.jpg";
import { usePermissions } from "@/hooks/useRoles";

import { MatrimonialProfile, computeAge, cmToFeetInches, matchScore, hasGotraConflict, hasEkdaConflict } from "@/components/matrimonial/constants";
import { InfoChip } from "@/components/matrimonial/InfoChip";
import { ProfileDetailDialog } from "@/components/matrimonial/ProfileDetailDialog";
import { ProfileForm } from "@/components/matrimonial/ProfileForm";
import { SearchFilters, EMPTY_FILTERS, type Filters } from "@/components/matrimonial/SearchFilters";
import { MatrimonialModerationPanel } from "@/components/matrimonial/MatrimonialModerationPanel";

// ── Profile Card ─────────────────────────────────────────────────────
function ProfileCard({
  profile, score, alreadySent, onSendIntro, sending, myProfile, onRishta,
}: {
  profile: MatrimonialProfile; score: number | null; alreadySent: boolean; onSendIntro: () => void; sending: boolean; myProfile: MatrimonialProfile | null | undefined; onRishta?: () => void;
}) {
  const m = profile.member;
  const age = computeAge(m?.dob ?? null);
  const height = cmToFeetInches(profile.height_cm);
  const gotraWarn = myProfile ? hasGotraConflict(myProfile, profile) : false;
  const ekdaWarn = myProfile ? hasEkdaConflict(myProfile, profile) : false;

  return (
    <Card className="border-border hover:border-secondary/40 transition-all group hover:shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="h-16 gradient-jewel relative">
          {score !== null && (
            <div className="absolute top-2 right-2">
              <Badge className={`text-xs font-bold ${score >= 70 ? "bg-success/90 text-success-foreground" : score >= 40 ? "bg-gold/90 text-primary-foreground" : "bg-muted"}`}>
                {score}% Match
              </Badge>
            </div>
          )}
        </div>
        <div className="px-4 pb-4 -mt-8">
          <div className="w-16 h-16 rounded-full gradient-warm flex items-center justify-center text-primary-foreground font-bold text-lg border-4 border-background shadow-lg">
            {m?.first_name?.[0]}{m?.last_name?.[0]}
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm group-hover:text-secondary transition-colors">
                {m?.first_name} {m?.last_name}
              </h3>
              {profile.verified && <Shield className="w-3.5 h-3.5 text-success" />}
            </div>
            <p className="text-xs text-muted-foreground">{m?.chapters?.name}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {age && <Badge variant="outline" className="text-[10px] py-0.5">{age} yrs</Badge>}
            {height && <Badge variant="outline" className="text-[10px] py-0.5">{height}</Badge>}
            {profile.education_level && <Badge variant="outline" className="text-[10px] py-0.5">{profile.education_level}</Badge>}
            {profile.position_title && <Badge variant="outline" className="text-[10px] py-0.5">{profile.position_title}</Badge>}
            {profile.current_city && <Badge variant="outline" className="text-[10px] py-0.5">{profile.current_city}</Badge>}
            {profile.diet && <Badge variant="outline" className="text-[10px] py-0.5">{profile.diet}</Badge>}
            {profile.marital_status && <Badge variant="outline" className="text-[10px] py-0.5">{profile.marital_status}</Badge>}
            {profile.manglik && <Badge variant="outline" className="text-[10px] py-0.5">Manglik: {profile.manglik}</Badge>}
          </div>
          {profile.about && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{profile.about}</p>}
          {(gotraWarn || ekdaWarn) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5">
              <span className="font-semibold">⚠</span>
              {gotraWarn && ekdaWarn ? "Same Gotra & Ekda — not compatible" : gotraWarn ? "Same Gotra — traditionally incompatible" : "Same Ekda — check compatibility"}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <ProfileDetailDialog profile={profile}>
              <Button size="sm" variant="outline" className="flex-1 text-xs h-8"><Eye className="w-3 h-3 mr-1" /> View Profile</Button>
            </ProfileDetailDialog>
            {alreadySent ? (
              <Badge variant="outline" className="text-xs py-1.5 px-3">✓ Sent</Badge>
            ) : (
              <Button size="sm" className="flex-1 text-xs h-8 gradient-warm text-primary-foreground" onClick={onSendIntro} disabled={sending}>
                <Send className="w-3 h-3 mr-1" /> Introduce
              </Button>
            )}
            {onRishta && (
              <Button size="sm" variant="outline" className="text-xs h-8 px-2" onClick={onRishta} aria-label="Send formal Rishta request">
                <Heart className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function Matrimonial() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const { canManageMatrimonial } = usePermissions();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [rishtaTarget, setRishtaTarget] = useState<MatrimonialProfile | null>(null);
  const [rishtaForm, setRishtaForm] = useState({ family_contact_name: "", family_contact_phone: "", message: "" });

  const { data: myProfile } = useQuery({
    queryKey: ["my-matrimonial"],
    queryFn: async () => {
      if (!member) return null;
      const { data } = await supabase
        .from("matrimonial_profiles")
        .select("*")
        .eq("member_id", member.id)
        .maybeSingle();
      return data as MatrimonialProfile | null;
    },
    enabled: !!member,
  });

  const { data: profiles } = useQuery({
    queryKey: ["matrimonial-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matrimonial_profiles")
        .select("*, member:members!matrimonial_profiles_member_id_fkey(id, first_name, last_name, gender, dob, photo_url, chapters(name))")
        .neq("member_id", member?.id ?? "")
        .order("created_at", { ascending: false });
      return (data ?? []) as MatrimonialProfile[];
    },
    enabled: !!member,
  });

  const { data: introductions } = useQuery({
    queryKey: ["my-introductions"],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("matrimonial_introductions")
        .select("*, from:members!matrimonial_introductions_from_member_id_fkey(first_name, last_name), to:members!matrimonial_introductions_to_member_id_fkey(first_name, last_name)")
        .or(`from_member_id.eq.${member.id},to_member_id.eq.${member.id}`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!member,
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["admin-matrimonial-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matrimonial_profiles")
        .select("*, member:members!matrimonial_profiles_member_id_fkey(id, first_name, last_name, gender, dob, photo_url, chapters(name))")
        .order("created_at", { ascending: false });
      return (data ?? []) as MatrimonialProfile[];
    },
    enabled: !!canManageMatrimonial,
  });

  const moderateProfile = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "verify" | "flag" | "delete" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("matrimonial_profiles").delete().eq("id", id);
        if (error) throw error;
      } else {
        const update = action === "verify" ? { verified: true } : { verified: false };
        const { error } = await supabase.from("matrimonial_profiles").update(update).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.action === "delete" ? "Profile deleted" : vars.action === "verify" ? "Profile verified" : "Profile flagged" });
      queryClient.invalidateQueries({ queryKey: ["admin-matrimonial-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["matrimonial-profiles"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendRishta = useMutation({
    mutationFn: async () => {
      if (!myProfile || !rishtaTarget) throw new Error("Missing profile");
      const { error } = await supabase.from("rishta_requests").insert({
        from_profile_id: myProfile.id,
        to_profile_id: rishtaTarget.id,
        family_contact_name: rishtaForm.family_contact_name || null,
        family_contact_phone: rishtaForm.family_contact_phone || null,
        message: rishtaForm.message || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rishta request sent to family!" });
      setRishtaTarget(null);
      setRishtaForm({ family_contact_name: "", family_contact_phone: "", message: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendIntro = useMutation({
    mutationFn: async (toMemberId: string) => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("matrimonial_introductions").insert({
        from_member_id: member.id,
        to_member_id: toMemberId,
        message: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Introduction sent!" });
      queryClient.invalidateQueries({ queryKey: ["my-introductions"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const respondIntro = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("matrimonial_introductions").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Response recorded!" });
      queryClient.invalidateQueries({ queryKey: ["my-introductions"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Compute match scores and apply filters
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    let list = [...profiles];

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => {
        const m = p.member;
        return [m?.first_name, m?.last_name, p.gotra, p.current_city, p.current_state, p.native_place, p.education_level, p.position_title, p.business_name]
          .some(v => v?.toLowerCase().includes(q));
      });
    }

    // Gender
    if (filters.gender) list = list.filter(p => p.member?.gender === filters.gender);

    // Age range
    if (filters.minAge || filters.maxAge) {
      list = list.filter(p => {
        const age = computeAge(p.member?.dob ?? null);
        if (!age) return false;
        if (filters.minAge && age < Number(filters.minAge)) return false;
        if (filters.maxAge && age > Number(filters.maxAge)) return false;
        return true;
      });
    }

    // Other filters
    if (filters.diet) list = list.filter(p => p.diet === filters.diet);
    if (filters.maritalStatus) list = list.filter(p => p.marital_status === filters.maritalStatus);
    if (filters.education) list = list.filter(p => p.education_level === filters.education);
    if (filters.manglik) list = list.filter(p => p.manglik === filters.manglik);
    if (filters.city) {
      const c = filters.city.toLowerCase();
      list = list.filter(p => p.current_city?.toLowerCase().includes(c) || p.current_state?.toLowerCase().includes(c));
    }
    if (filters.country) {
      const c = filters.country.toLowerCase();
      list = list.filter(p => p.country?.toLowerCase().includes(c));
    }
    if (filters.visaType) list = list.filter(p => p.visa_type === filters.visaType);

    // Sort by match score
    if (myProfile) {
      list.sort((a, b) => matchScore(myProfile, b, member) - matchScore(myProfile, a, member));
    }

    return list;
  }, [profiles, filters, myProfile, member]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="Matrimonial">
      <Dialog open={!!rishtaTarget} onOpenChange={(o) => { if (!o) setRishtaTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Heart className="w-5 h-5 text-secondary" /> Formal Rishta Request
            </DialogTitle>
            <DialogDescription>
              This request will be routed to the family contact of {rishtaTarget?.member?.first_name}, not directly to them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Family Contact Name</label>
              <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={rishtaForm.family_contact_name} onChange={e => setRishtaForm({...rishtaForm, family_contact_name: e.target.value})} placeholder="e.g. Ramesh Shah (Father)" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Family Contact Phone</label>
              <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={rishtaForm.family_contact_phone} onChange={e => setRishtaForm({...rishtaForm, family_contact_phone: e.target.value})} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message to Family</label>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={rishtaForm.message} onChange={e => setRishtaForm({...rishtaForm, message: e.target.value})} placeholder="Brief introduction message..." maxLength={500} />
            </div>
            <Button onClick={() => sendRishta.mutate()} disabled={sendRishta.isPending || !rishtaForm.family_contact_name} className="w-full gradient-warm text-primary-foreground">
              <Send className="w-4 h-4 mr-2" /> Send Rishta Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative h-48 sm:h-56 overflow-hidden">
          <img src={matrimonialHero} alt="Wedding ceremony" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 to-foreground/50" />
          <div className="absolute inset-0 flex items-center p-4 sm:p-8">
            <div>
              <h1 className="text-xl sm:text-3xl font-display font-bold text-primary-foreground flex items-center gap-2">
                <Heart className="w-5 sm:w-7 h-5 sm:h-7 text-secondary fill-secondary" /> Matrimonial
              </h1>
              <p className="text-primary-foreground/70 mt-1 max-w-md text-sm sm:text-base">
                Safe, verified matchmaking within the Khadayata community. Guided by tradition, powered by trust.
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
            {/* Profile creation form (when requested) */}
          {!myProfile && showForm && (
            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" /> Create Matrimonial Profile
                </CardTitle>
                <CardDescription>Fill in your details to find the perfect match within our community</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm memberId={member?.id ?? ""} onSuccess={() => setShowForm(false)} />
              </CardContent>
            </Card>
          )}

          {/* No profile CTA banner (shown above browse, not instead of it) */}
          {!myProfile && !showForm && !canManageMatrimonial && (
            <Card className="shadow-elevated border-secondary/20 overflow-hidden">
              <div className="gradient-jewel px-6 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="font-display font-bold text-lg sm:text-xl text-primary-foreground flex items-center gap-2 justify-center sm:justify-start">
                    <Sparkles className="w-5 h-5" /> Create Your Profile to Connect
                  </h3>
                  <p className="text-primary-foreground/70 mt-1 text-sm max-w-lg">
                    Browse community profiles below. Create your own profile to send introductions and show your match score.
                  </p>
                </div>
                <Button onClick={() => setShowForm(true)} className="shrink-0 bg-primary-foreground text-foreground hover:bg-primary-foreground/90 h-10 px-6">
                  <Heart className="w-4 h-4 mr-2" /> Create My Profile
                </Button>
              </div>
            </Card>
          )}

          {/* Has profile — show tabs; no profile — show moderator panel or browse-only view */}
          {myProfile ? (
            <Tabs defaultValue="matches" className="space-y-4">
              <TabsList className={`w-full grid ${canManageMatrimonial ? "grid-cols-4" : "grid-cols-3"}`}>
                <TabsTrigger value="matches" className="text-xs sm:text-sm">
                  <Heart className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Matches
                </TabsTrigger>
                <TabsTrigger value="introductions" className="text-xs sm:text-sm">
                  <MessageCircle className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Introductions
                </TabsTrigger>
                <TabsTrigger value="myprofile" className="text-xs sm:text-sm">
                  <User className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> My Profile
                </TabsTrigger>
                {canManageMatrimonial && (
                  <TabsTrigger value="moderate" className="text-xs sm:text-sm">
                    <Shield className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Moderate
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ── Matches Tab ── */}
              <TabsContent value="matches" className="space-y-4">
                <SearchFilters filters={filters} onChange={setFilters} />

                {filteredProfiles.length === 0 ? (
                  <Card className="shadow-card">
                    <CardContent className="text-center py-16">
                      <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="font-display font-semibold text-lg">No profiles found</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {filters.search || Object.values(filters).some(v => v) ? "Try adjusting your filters." : "New profiles will appear here as community members join."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">{filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} found</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredProfiles.map((p) => {
                        const score = myProfile ? matchScore(myProfile, p, member) : null;
                        const alreadySent = introductions?.some(
                          (i) => (i as { to_member_id: string }).to_member_id === p.member_id
                        );
                        return (
                          <ProfileCard
                            key={p.id} profile={p} score={score} alreadySent={!!alreadySent}
                            onSendIntro={() => sendIntro.mutate(p.member_id)} sending={sendIntro.isPending}
                            myProfile={myProfile}
                            onRishta={() => setRishtaTarget(p)}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ── Introductions Tab ── */}
              <TabsContent value="introductions">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-secondary" /> My Introductions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(!introductions || introductions.length === 0) && (
                      <div className="text-center py-12">
                        <Send className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">No introductions yet. Browse matches and send an introduction!</p>
                      </div>
                    )}
                    {introductions?.map((intro) => {
                      const isSent = (intro as { from_member_id: string }).from_member_id === member?.id;
                      const other = isSent
                        ? (intro as { to: { first_name: string; last_name: string } }).to
                        : (intro as { from: { first_name: string; last_name: string } }).from;
                      return (
                        <div key={intro.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full gradient-jewel flex items-center justify-center text-primary-foreground text-xs font-bold">
                              {other?.first_name?.[0]}{other?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{isSent ? "Sent to" : "Received from"} {other?.first_name} {other?.last_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className={`text-xs capitalize ${intro.status === "accepted" ? "border-success text-success" : intro.status === "declined" ? "border-destructive text-destructive" : ""}`}>
                                  {intro.status}
                                </Badge>
                                {intro.message && <span className="text-xs text-muted-foreground italic">"{intro.message}"</span>}
                              </div>
                            </div>
                          </div>
                          {!isSent && intro.status === "pending" && (
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-8 bg-success hover:bg-success/80 text-success-foreground" onClick={() => respondIntro.mutate({ id: intro.id, status: "accepted" })}>
                                <Check className="w-3.5 h-3.5 mr-1" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="h-8" onClick={() => respondIntro.mutate({ id: intro.id, status: "declined" })}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── My Profile Tab ── */}
              <TabsContent value="myprofile">
                <Card className="shadow-elevated">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="font-display flex items-center gap-2">
                        <User className="w-5 h-5 text-secondary" /> My Matrimonial Profile
                      </CardTitle>
                      <CardDescription>Your profile as seen by potential matches</CardDescription>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-display">Edit Profile</DialogTitle>
                          <DialogDescription>Update your matrimonial profile details</DialogDescription>
                        </DialogHeader>
                        <ProfileForm initial={myProfile} memberId={member?.id ?? ""} onSuccess={() => {}} />
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {myProfile.about && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">About Me</h4>
                          <p className="text-sm leading-relaxed">{myProfile.about}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="font-display font-semibold mb-3 flex items-center gap-2"><User className="w-4 h-4 text-secondary" /> Personal Details</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {myProfile.height_cm && <InfoChip icon={Ruler} label="Height" value={`${cmToFeetInches(myProfile.height_cm)} (${myProfile.height_cm}cm)`} />}
                          {myProfile.weight_kg && <InfoChip icon={Scale} label="Weight" value={`${myProfile.weight_kg} kg`} />}
                          {myProfile.complexion && <InfoChip icon={User} label="Complexion" value={myProfile.complexion} />}
                          {myProfile.diet && <InfoChip icon={UtensilsCrossed} label="Diet" value={myProfile.diet} />}
                          {myProfile.marital_status && <InfoChip icon={Heart} label="Marital Status" value={myProfile.marital_status} />}
                          {myProfile.blood_group && <InfoChip icon={Heart} label="Blood Group" value={myProfile.blood_group} />}
                          {myProfile.glasses && <InfoChip icon={Glasses} label="Glasses" value={myProfile.glasses} />}
                          {myProfile.driving && <InfoChip icon={Car} label="Driving" value={myProfile.driving} />}
                          {myProfile.current_city && <InfoChip icon={MapPin} label="Current Location" value={`${myProfile.current_city}${myProfile.current_state ? ', ' + myProfile.current_state : ''}`} />}
                          {myProfile.country && <InfoChip icon={Globe} label="Country" value={myProfile.country} />}
                          {myProfile.citizenship && <InfoChip icon={Globe} label="Citizenship" value={myProfile.citizenship} />}
                          {myProfile.visa_type && <InfoChip icon={Globe} label="Visa Type" value={myProfile.visa_type} />}
                          {myProfile.contact_number && <InfoChip icon={Phone} label="Contact" value={myProfile.contact_number} />}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-display font-semibold mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-secondary" /> Education & Career</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {myProfile.education_level && <InfoChip icon={GraduationCap} label="Education" value={`${myProfile.education_level}${myProfile.education_field ? ' - ' + myProfile.education_field : ''}`} />}
                          {myProfile.position_title && <InfoChip icon={Briefcase} label="Position" value={myProfile.position_title} />}
                          {myProfile.business_name && <InfoChip icon={Building} label="Company/Business" value={myProfile.business_name} />}
                          {myProfile.income && <InfoChip icon={BadgeDollarSign} label="Income" value={`${myProfile.income_currency ?? 'INR'} ${Number(myProfile.income).toLocaleString()} / year`} />}
                          {myProfile.linkedin_url && <InfoChip icon={Linkedin} label="LinkedIn" value="Connected" />}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-display font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-secondary" /> Kundali Details</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {myProfile.manglik && <InfoChip icon={Star} label="Manglik" value={myProfile.manglik} />}
                          {myProfile.gotra && <InfoChip icon={BookOpen} label="Gotra" value={myProfile.gotra} />}
                          {myProfile.rashi && <InfoChip icon={Star} label="Rashi" value={myProfile.rashi} />}
                          {myProfile.nakshatra && <InfoChip icon={Gem} label="Nakshatra" value={myProfile.nakshatra} />}
                          {myProfile.native_place && <InfoChip icon={MapPin} label="Native Place" value={myProfile.native_place} />}
                          {myProfile.ekda && <InfoChip icon={Crown} label="Ekda" value={myProfile.ekda} />}
                          {myProfile.kuldevi && <InfoChip icon={Crown} label="Kuldevi" value={myProfile.kuldevi} />}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-display font-semibold mb-3 flex items-center gap-2"><Home className="w-4 h-4 text-secondary" /> Family Background</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {myProfile.family_type && <InfoChip icon={Users} label="Family Type" value={myProfile.family_type} />}
                          {myProfile.family_status && <InfoChip icon={Briefcase} label="Status" value={myProfile.family_status} />}
                          {myProfile.father_name && <InfoChip icon={User} label="Father's Name" value={myProfile.father_name} />}
                          {myProfile.father_occupation && <InfoChip icon={Briefcase} label="Father's Profession" value={myProfile.father_occupation} />}
                          {myProfile.mother_name && <InfoChip icon={User} label="Mother's Name" value={myProfile.mother_name} />}
                          {myProfile.mother_occupation && <InfoChip icon={Briefcase} label="Mother's Profession" value={myProfile.mother_occupation} />}
                          {myProfile.parents_marital_status && <InfoChip icon={Heart} label="Parents Status" value={myProfile.parents_marital_status} />}
                          {myProfile.siblings && <InfoChip icon={Users} label="Siblings" value={myProfile.siblings} />}
                          {myProfile.parent_contact && <InfoChip icon={Phone} label="Parent's Contact" value={myProfile.parent_contact} />}
                        </div>
                      </div>

                      {myProfile.hobbies && myProfile.hobbies.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-display font-semibold mb-2">Hobbies & Interests</h4>
                            <div className="flex flex-wrap gap-2">
                              {myProfile.hobbies.map(h => <Badge key={h} variant="outline">{h}</Badge>)}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div>
                        <h4 className="font-display font-semibold mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4 text-secondary" /> Partner Preferences</h4>
                        {(() => {
                          const p = myProfile.preferences as Record<string, unknown>;
                          if (!p || Object.keys(p).length === 0) return <p className="text-xs text-muted-foreground italic">No preferences set. Click Edit to add.</p>;
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {p.min_age && p.max_age && <InfoChip icon={Calendar} label="Age Range" value={`${p.min_age} - ${p.max_age} years`} />}
                              {p.min_height && p.max_height && <InfoChip icon={Ruler} label="Height Range" value={`${cmToFeetInches(Number(p.min_height))} - ${cmToFeetInches(Number(p.max_height))}`} />}
                              {p.preferred_diet && <InfoChip icon={UtensilsCrossed} label="Diet" value={String(p.preferred_diet)} />}
                              {p.preferred_marital_status && <InfoChip icon={Heart} label="Marital Status" value={String(p.preferred_marital_status)} />}
                              {p.preferred_manglik && <InfoChip icon={Star} label="Manglik" value={String(p.preferred_manglik)} />}
                              {p.preferred_education && <InfoChip icon={GraduationCap} label="Education" value={String(p.preferred_education)} />}
                              {p.preferred_occupation && <InfoChip icon={Briefcase} label="Occupation" value={String(p.preferred_occupation)} />}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {canManageMatrimonial && (
                <TabsContent value="moderate" className="space-y-4">
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="font-display flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" /> Matrimonial Moderation
                      </CardTitle>
                      <CardDescription>Review, verify, or remove submitted profiles</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-border bg-muted/50">
                            <tr>
                              <th className="p-3 text-left font-medium">Member</th>
                              <th className="p-3 text-left font-medium">Chapter</th>
                              <th className="p-3 text-left font-medium">Status</th>
                              <th className="p-3 text-left font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(!allProfiles || allProfiles.length === 0) && (
                              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No profiles submitted</td></tr>
                            )}
                            {allProfiles?.map((p) => {
                              const m = p.member;
                              return (
                                <tr key={p.id} className="border-b border-border last:border-0">
                                  <td className="p-3">
                                    <div>
                                      <p className="font-medium">{m?.first_name} {m?.last_name}</p>
                                      <p className="text-xs text-muted-foreground capitalize">{m?.gender}</p>
                                    </div>
                                  </td>
                                  <td className="p-3 text-muted-foreground">{m?.chapters?.name ?? "—"}</td>
                                  <td className="p-3">
                                    {p.verified
                                      ? <Badge className="bg-success/20 text-success border-0">Verified</Badge>
                                      : <Badge variant="outline">Pending</Badge>
                                    }
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                      <ProfileDetailDialog profile={p}>
                                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" aria-label="View profile">
                                          <Eye className="w-3 h-3" />
                                        </Button>
                                      </ProfileDetailDialog>
                                      {!p.verified && (
                                        <Button size="sm" className="h-7 text-xs px-2 bg-success hover:bg-success/80 text-success-foreground" aria-label="Verify profile" onClick={() => moderateProfile.mutate({ id: p.id, action: "verify" })} disabled={moderateProfile.isPending}>
                                          <Check className="w-3 h-3" />
                                        </Button>
                                      )}
                                      {p.verified && (
                                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" aria-label="Flag profile" onClick={() => moderateProfile.mutate({ id: p.id, action: "flag" })} disabled={moderateProfile.isPending}>
                                          <Flag className="w-3 h-3" />
                                        </Button>
                                      )}
                                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-destructive hover:text-destructive border-destructive/30" aria-label="Delete profile" onClick={() => moderateProfile.mutate({ id: p.id, action: "delete" })} disabled={moderateProfile.isPending}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          ) : !showForm && (
            /* No profile: browse-only view */
            <div className="space-y-4">
              {canManageMatrimonial && <MatrimonialModerationPanel allProfiles={allProfiles} />}
              <SearchFilters filters={filters} onChange={setFilters} />
              {filteredProfiles.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="text-center py-16">
                    <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-display font-semibold text-lg">No profiles found</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {filters.search || Object.values(filters).some(v => v) ? "Try adjusting your filters." : "New profiles will appear here as community members join."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} found</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProfiles.map((p) => (
                      <ProfileCard
                        key={p.id} profile={p} score={null} alreadySent={false}
                        onSendIntro={() => setShowForm(true)} sending={false}
                        myProfile={null}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
