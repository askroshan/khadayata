import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { EmailMessageThreads } from "@/components/messaging/EmailMessageThreads";
import AppLayout from "@/components/AppLayout";
import SEOMeta from "@/components/SEOMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Shield, MapPin, Briefcase, GraduationCap, Users, Heart,
  Phone, Mail, ExternalLink, Maximize2, X, Globe, Activity, Video,
  MessageCircle, Clock, Send, Bookmark,
} from "lucide-react";
import {
  MatrimonialProfile, computeAge, cmToFeetInches,
} from "@/components/matrimonial/constants";

const COUNTRY_DIAL_CODES: Record<string, string> = {
  usa: "1",
  us: "1",
  "united states": "1",
  canada: "1",
  india: "91",
  uk: "44",
  "united kingdom": "44",
  australia: "61",
  "new zealand": "64",
  uae: "971",
  dubai: "971",
};

function normalizeSinglePhone(raw: string, country?: string | null): { display: string; waDigits: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;

  const defaultCode = COUNTRY_DIAL_CODES[(country ?? "").trim().toLowerCase()] ?? "1";

  let fullDigits = digits;
  if (hasPlus) {
    fullDigits = digits;
  } else if (digits.length === 10) {
    // 10-digit local number -> prepend country dial code
    fullDigits = `${defaultCode}${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    fullDigits = digits;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    fullDigits = digits;
  } else if (digits.length >= 11) {
    fullDigits = digits;
  } else {
    fullDigits = `${defaultCode}${digits}`;
  }

  return {
    display: `+${fullDigits}`,
    waDigits: fullDigits,
  };
}

function extractAllPhones(
  fields: Array<{ label: string; raw?: string | null }>,
  country?: string | null
): Array<{ label: string; display: string; waDigits: string }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; display: string; waDigits: string }> = [];
  for (const f of fields) {
    if (!f.raw) continue;
    const parts = f.raw.split(/[,;/\n]+/);
    for (const part of parts) {
      const parsed = normalizeSinglePhone(part, country);
      if (parsed && !seen.has(parsed.waDigits)) {
        seen.add(parsed.waDigits);
        out.push({ label: f.label, display: parsed.display, waDigits: parsed.waDigits });
      }
    }
  }
  return out;
}

function formatLastActive(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground sm:text-right break-words">{value}</span>
    </div>
  );
}

export default function MatrimonialProfileDetail() {
  const { user, loading: authLoading } = useAuth();
  const { member } = useMember();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: isShortlisted = false } = useQuery({
    queryKey: ["matrimonial-shortlist-item", member?.id, id],
    queryFn: async () => {
      if (!member || !id) return false;
      const { data } = await supabase
        .from("matrimonial_shortlists" as never)
        .select("id")
        .eq("member_id", member.id)
        .eq("profile_id", id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!member && !!id,
  });

  const toggleShortlist = useMutation({
    mutationFn: async () => {
      if (!member || !id) throw new Error("Not signed in");
      if (isShortlisted) {
        const { error } = await supabase
          .from("matrimonial_shortlists" as never)
          .delete()
          .eq("member_id", member.id)
          .eq("profile_id", id);
        if (error) throw error;
        return { removed: true };
      } else {
        const { error } = await supabase
          .from("matrimonial_shortlists" as never)
          .insert({ member_id: member.id, profile_id: id } as never);
        if (error) throw error;
        return { removed: false };
      }
    },
    onSuccess: (res) => {
      toast({ title: res.removed ? "Removed from shortlist" : "Profile liked & shortlisted!" });
      queryClient.invalidateQueries({ queryKey: ["matrimonial-shortlist-item", member?.id, id] });
      queryClient.invalidateQueries({ queryKey: ["my-matrimonial-shortlists"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["matrimonial-profile-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matrimonial_profiles")
        .select("*, member:members!matrimonial_profiles_member_id_fkey(id, global_id, first_name, last_name, gender, dob, photo_url, updated_at, social_links, chapters(name))")
        .eq("id", id!)
        .eq("is_deleted", false)
        .maybeSingle();
      if (error) throw error;
      return data as MatrimonialProfile | null;
    },
    enabled: !!id,
  });

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const m = profile?.member;
  const fullName = `${m?.first_name ?? ""} ${m?.last_name ?? ""}`.trim() || "Matrimonial Profile";
  const age = computeAge(m?.dob ?? null);
  const heightDisplay = profile?.height_cm
    ? `${profile.height_cm} cm (${cmToFeetInches(profile.height_cm)})`
    : null;
  const primaryPhoto = (!imgError && (profile?.photos?.[0] || m?.photo_url)) || null;
  const allPhotos = (profile?.photos ?? []).filter(Boolean);
  const lastActive = formatLastActive(profile?.updated_at ?? m?.updated_at ?? profile?.created_at);

  const allPhones = profile
    ? extractAllPhones(
        [
          { label: "Phone", raw: profile.contact_number },
          { label: "WhatsApp", raw: profile.whatsapp_number },
          { label: "Parent Contact", raw: profile.parent_contact },
        ],
        profile.country
      )
    : [];

  const primaryWhatsApp =
    allPhones.find((p) => p.label === "WhatsApp") ?? allPhones[0] ?? null;

  const prefs = (profile?.preferences ?? {}) as {
    age_range?: string | null;
    age_min?: number | null;
    age_max?: number | null;
    gender?: string | null;
    citizenship?: string[] | string | null;
    education?: string[] | string | null;
    location?: string[] | string | null;
    other_aspects?: string | null;
  };

  const formatArrayOrString = (val?: string[] | string | null) => {
    if (!val) return null;
    if (Array.isArray(val)) return val.length ? val.join(", ") : null;
    return val;
  };

  const sendPrivateEmailBody = async (messageBody: string) => {
    if (!profile?.contact_email || !messageBody.trim()) return;
    const { error: fnErr } = await supabase.functions.invoke("send-email", {
      body: {
        template: "matrimonial_interest",
        to: profile.contact_email,
        vars: {
          name: m?.first_name ?? "Member",
          from_name: user?.user_metadata?.first_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name ?? ""}`.trim()
            : "A KhadayataOnline Member",
          message: messageBody.trim(),
        },
      },
    });
    if (fnErr) throw fnErr;

    if (member && profile.member_id) {
      await supabase.from("member_email_messages" as never).insert({
        from_member_id: member.id,
        to_member_id: profile.member_id,
        context_type: "matrimonial",
        context_id: profile.id,
        subject: `Matrimonial Inquiry — ${fullName}`,
        body: messageBody.trim(),
      } as never);
      queryClient.invalidateQueries({ queryKey: ["member-email-messages"] });
    }
  };

  const handleSendPrivateEmail = async () => {
    if (!profile?.contact_email || !emailMessage.trim()) return;
    setSendingEmail(true);
    try {
      await sendPrivateEmailBody(emailMessage);
      toast({
        title: "Message sent privately",
        description: "Your inquiry was delivered via KhadayataOnline without exposing any email address.",
      });
      setEmailMessage("");
      setEmailDialogOpen(false);
    } catch (err) {
      toast({
        title: "Could not send email",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <AppLayout title={fullName}>
      <SEOMeta title={`${fullName} — Matrimonial Profile`} description={`Matrimonial profile for ${fullName}`} />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/matrimonial/manage">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Matrimonial Directory
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {m?.global_id && (
              <Badge variant="outline" className="font-mono text-xs">
                Global ID: {m.global_id}
              </Badge>
            )}
            {profile?.external_profile_id && (
              <Badge variant="secondary" className="font-mono text-xs">
                Profile {profile.external_profile_id}
              </Badge>
            )}
          </div>
        </div>

        {isLoading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading profile...</CardContent></Card>
        )}

        {!isLoading && (error || !profile) && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">Matrimonial profile not found or no longer active.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/matrimonial/manage">Return to Directory</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {profile && (
          <>
            {/* Hero Profile Card */}
            <Card className="overflow-hidden border-border">
              <div className="h-24 gradient-jewel" />
              <CardContent className="px-6 pb-6 -mt-14 relative z-10">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="relative group shrink-0">
                    {primaryPhoto ? (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(primaryPhoto)}
                        className="relative block rounded-2xl overflow-hidden border-4 border-background shadow-xl bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="View high-resolution photo"
                      >
                        <img
                          src={primaryPhoto}
                          alt={fullName}
                          onError={() => setImgError(true)}
                          className="w-36 h-44 sm:w-44 sm:h-52 object-cover object-top"
                        />
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded-md flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <Maximize2 className="w-3 h-3" /> High-Res
                        </span>
                      </button>
                    ) : (
                      <div className="w-36 h-44 sm:w-44 sm:h-52 rounded-2xl gradient-warm flex items-center justify-center text-primary-foreground font-bold text-4xl border-4 border-background shadow-xl">
                        {m?.first_name?.[0]}{m?.last_name?.[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 pt-2 sm:pt-14 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                        {fullName}
                      </h1>
                      {profile.verified && (
                        <Badge className="bg-success/15 text-success border-success/30">
                          <Shield className="w-3.5 h-3.5 mr-1" /> Verified
                        </Badge>
                      )}
                      {m?.global_id && (
                        <Badge variant="outline" className="font-mono text-xs">
                          Global ID: {m.global_id}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {m?.chapters?.name && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4 text-primary" /> {m.chapters.name}
                        </span>
                      )}
                      {(profile.current_city || profile.country) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-secondary" />
                          {[profile.current_city, profile.current_state, profile.country].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {lastActive && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" /> Last active {lastActive}
                        </span>
                      )}
                    </div>

                    {/* Direct Contact Actions (Private Email via Emailit + Direct WhatsApp) */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {primaryWhatsApp && (
                        <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                          <a
                            href={`https://wa.me/${primaryWhatsApp.waDigits}?text=${encodeURIComponent(`Hi ${m?.first_name ?? ""}, I saw your matrimonial profile (${m?.global_id ?? profile.external_profile_id ?? ""}) on KhadayataOnline.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
                          </a>
                        </Button>
                      )}
                      {profile.contact_email && (
                        <Button size="sm" variant="outline" onClick={() => setEmailDialogOpen(true)}>
                          <Mail className="w-4 h-4 mr-1.5" /> Email Candidate (Private)
                        </Button>
                      )}
                      {member && (
                        <Button
                          size="sm"
                          variant={isShortlisted ? "secondary" : "outline"}
                          onClick={() => toggleShortlist.mutate()}
                          disabled={toggleShortlist.isPending}
                        >
                          <Bookmark className={`w-4 h-4 mr-1.5 ${isShortlisted ? "fill-current text-primary" : ""}`} />
                          {isShortlisted ? "Shortlisted" : "Like / Shortlist"}
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {age && <Badge variant="secondary">{age} yrs</Badge>}
                      {m?.gender && <Badge variant="outline">{m.gender}</Badge>}
                      {profile.marital_status && <Badge variant="outline">{profile.marital_status}</Badge>}
                      {heightDisplay && <Badge variant="outline">{heightDisplay}</Badge>}
                      {profile.education_level && <Badge variant="outline">{profile.education_level}</Badge>}
                      {profile.diet && <Badge variant="outline">{profile.diet}</Badge>}
                      {profile.ekda && <Badge variant="outline">Ekda: {profile.ekda}</Badge>}
                    </div>

                    {profile.about && (
                      <p className="text-sm text-muted-foreground pt-2 leading-relaxed">{profile.about}</p>
                    )}

                    {allPhotos.length > 1 && (
                      <div className="flex gap-2 pt-2">
                        {allPhotos.map((url, idx) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightboxUrl(url)}
                            className="rounded-lg overflow-hidden border border-border hover:border-primary"
                          >
                            <img src={url} alt={`${fullName} photo ${idx + 1}`} className="w-14 h-14 object-cover object-top" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partner Preferences / Partner Profile */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-secondary fill-secondary/20" />
                  Partner Profile &amp; Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <DetailRow label="Preferred Gender" value={prefs.gender} />
                <DetailRow
                  label="Preferred Age Range"
                  value={
                    prefs.age_range
                      ? prefs.age_min && prefs.age_max
                        ? `${prefs.age_range} (${prefs.age_min}–${prefs.age_max} yrs)`
                        : prefs.age_range
                      : prefs.age_min || prefs.age_max
                        ? `${prefs.age_min ?? "Any"}–${prefs.age_max ?? "Any"} yrs`
                        : null
                  }
                />
                <DetailRow label="Preferred Citizenship / Visa" value={formatArrayOrString(prefs.citizenship)} />
                <DetailRow label="Preferred Education" value={formatArrayOrString(prefs.education)} />
                <DetailRow label="Preferred Location" value={formatArrayOrString(prefs.location)} />
                <DetailRow
                  label="Other Aspects Looking For"
                  value={prefs.other_aspects || profile.partner_preferences_summary}
                />
                {!prefs.gender && !prefs.age_range && !prefs.citizenship && !prefs.education && !prefs.other_aspects && !profile.partner_preferences_summary && (
                  <p className="text-sm text-muted-foreground py-2">No partner preferences specified yet.</p>
                )}
              </CardContent>
            </Card>

            {/* 2-Column Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Education & Career */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" /> Education &amp; Career
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Education Level" value={profile.education_level} />
                  <DetailRow label="Education Field" value={profile.education_field} />
                  <DetailRow label="Job Title / Position" value={profile.position_title} />
                  <DetailRow label="Company / Business" value={profile.business_name} />
                  <DetailRow label="Employment Type" value={profile.employment_type} />
                  <DetailRow
                    label="Annual Income"
                    value={profile.income ? `${profile.income_currency ?? "USD"} ${profile.income.toLocaleString()}` : null}
                  />
                  {(() => {
                    const sl = m?.social_links ?? {};
                    const links: Array<{ label: string; url: string }> = [];
                    const linkedin = sl.linkedin || profile.linkedin_url;
                    if (linkedin) links.push({ label: "LinkedIn", url: linkedin });
                    if (sl.instagram) links.push({ label: "Instagram", url: sl.instagram });
                    if (sl.facebook) links.push({ label: "Facebook", url: sl.facebook });
                    if (sl.x) links.push({ label: "X / Twitter", url: sl.x });
                    if (sl.website) links.push({ label: "Website", url: sl.website });
                    if (links.length === 0) return null;
                    return (
                      <div className="pt-3 flex flex-wrap gap-2">
                        {links.map((item) => (
                          <a
                            key={item.label}
                            href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-muted/40 text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Briefcase className="w-3.5 h-3.5" /> {item.label} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Personal, Location & Contact (No raw email displayed!) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" /> Personal, Citizenship &amp; Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Global ID" value={m?.global_id} />
                  <DetailRow label="Last Active" value={lastActive} />
                  <DetailRow label="Birth Country" value={profile.birth_country} />
                  <DetailRow label="Passport / Citizenship" value={profile.citizenship} />
                  <DetailRow label="Overseas Visa Status" value={profile.visa_type} />
                  <DetailRow label="First Language" value={profile.first_language} />
                  <DetailRow label="Languages Spoken" value={formatArrayOrString(profile.languages_spoken)} />

                  {/* All phone numbers with mandatory country code + WhatsApp link */}
                  {allPhones.length > 0 ? (
                    allPhones.map((ph) => (
                      <div
                        key={`${ph.label}-${ph.waDigits}`}
                        className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0"
                      >
                        <span className="text-xs font-medium text-muted-foreground">{ph.label}</span>
                        <div className="flex items-center gap-2">
                          <a href={`tel:${ph.display}`} className="text-sm font-medium text-foreground hover:underline font-mono">
                            {ph.display}
                          </a>
                          <a
                            href={`https://wa.me/${ph.waDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                            title={`WhatsApp ${ph.display}`}
                            aria-label={`WhatsApp ${ph.display}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <DetailRow label="Phone" value="Not provided" />
                  )}

                  {profile.video_url && (
                    <div className="pt-3">
                      <a
                        href={profile.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Video className="w-4 h-4" /> Watch Video Profile <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Appearance, Lifestyle & Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Appearance, Lifestyle &amp; Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Height" value={heightDisplay} />
                  <DetailRow label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : null} />
                  <DetailRow label="Eyes / Glasses" value={profile.glasses} />
                  <DetailRow label="Complexion" value={profile.complexion} />
                  <DetailRow label="Blood Group" value={profile.blood_group} />
                  <DetailRow label="Food Habits / Diet" value={profile.diet} />
                  <DetailRow label="Smoking Habits" value={profile.smoking_habits} />
                  <DetailRow label="Drinking Habits" value={profile.drinking_habits} />
                  <DetailRow label="Driving" value={profile.driving} />
                  <DetailRow label="Health Disclosure" value={profile.health_disclosure} />
                  <DetailRow label="Hobbies" value={formatArrayOrString(profile.hobbies)} />
                </CardContent>
              </Card>

              {/* Heritage, Kundali & Family */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Heritage, Kundali &amp; Family
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Ekda" value={profile.ekda} />
                  <DetailRow label="Gotra" value={profile.gotra} />
                  <DetailRow label="Kuldevi" value={profile.kuldevi} />
                  <DetailRow label="Manglik" value={profile.manglik} />
                  <DetailRow label="Rashi" value={profile.rashi} />
                  <DetailRow label="Nakshatra" value={profile.nakshatra} />
                  <DetailRow label="Native Place" value={profile.native_place} />
                  <DetailRow label="Family Type" value={profile.family_type} />
                  <DetailRow label="Family Status" value={profile.family_status} />
                  <DetailRow label="Father" value={[profile.father_name, profile.father_occupation].filter(Boolean).join(" — ")} />
                  <DetailRow label="Mother" value={[profile.mother_name, profile.mother_occupation].filter(Boolean).join(" — ")} />
                  <DetailRow label="Parents Marital Status" value={profile.parents_marital_status} />
                  <DetailRow label="Brothers" value={profile.brothers_count !== null && profile.brothers_count !== undefined ? String(profile.brothers_count) : null} />
                  <DetailRow label="Sisters" value={profile.sisters_count !== null && profile.sisters_count !== undefined ? String(profile.sisters_count) : null} />
                  <DetailRow label="Siblings Summary" value={profile.siblings} />
                </CardContent>
              </Card>
            </div>

            {/* Email Communication Thread with this Member */}
            {member && profile.member_id && profile.member_id !== member.id && (
              <EmailMessageThreads
                partnerMemberId={profile.member_id}
                contextType="matrimonial"
                onSendReply={profile.contact_email ? sendPrivateEmailBody : undefined}
                compact
              />
            )}
          </>
        )}
      </div>

      {/* Private Email Relay Dialog (via Emailit — never exposes candidate email) */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Private Email to {fullName}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Your message will be delivered securely via KhadayataOnline. Candidate email addresses are kept private and never displayed on the site.
          </p>
          <Textarea
            rows={4}
            placeholder="Write a brief introduction and how the family can reach you..."
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendPrivateEmail} disabled={sendingEmail || !emailMessage.trim()}>
              <Send className="w-4 h-4 mr-1.5" /> {sendingEmail ? "Sending..." : "Send Privately"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* High-Resolution Photo Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution photo viewer"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 bg-white/15 hover:bg-white/25 text-white rounded-full p-2"
            aria-label="Close high-resolution photo"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt={fullName}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </AppLayout>
  );
}
