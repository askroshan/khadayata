import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember, useChapters } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, User, MapPin, Briefcase, Shield, Phone } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+254", label: "🇰🇪 +254" },
];

const STEPS = [
  { id: "chapter", label: "Chapter", icon: MapPin },
  { id: "personal", label: "Personal", icon: User },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "privacy", label: "Privacy", icon: Shield },
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const PRIVACY_LEVELS = ["public", "members", "chapter", "private"] as const;
const PRIVACY_FIELDS = ["dob", "phone", "email", "birth_place", "employment"] as const;

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { member, isLoading: memberLoading, updateMember } = useMember();
  const { data: chapters, isLoading: chaptersLoading } = useChapters();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [chapterId, setChapterId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [ekda, setEkda] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [privacy, setPrivacy] = useState<Record<string, string>>({
    dob: "members",
    phone: "private",
    email: "members",
    birth_place: "members",
    employment: "public",
  });

  if (authLoading || memberLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (member?.onboarding_completed) return <Navigate to="/dashboard" replace />;

  const currentStep = STEPS[step];

  const handleNext = () => {
    if (step === 0 && !chapterId) {
      toast({ title: "Please select a chapter", variant: "destructive" });
      return;
    }
    if (step === 1 && (!firstName.trim() || !lastName.trim())) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    if (step === 1 && !phone.trim()) {
      toast({ title: "Phone number is required", variant: "destructive" });
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Update member profile
      const memberUpdateResult = await updateMember.mutateAsync({
        chapter_id: chapterId || null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_names: middleNames.trim() || null,
        gender: gender || null,
        dob: dob || null,
        birth_place: birthPlace.trim() || null,
        ekda: ekda.trim() || null,
        privacy,
        onboarding_completed: true,
      });

      // Auto-generate Global ID
      if (member?.id && chapterId) {
        try {
          await supabase.functions.invoke("generate-global-id", {
            body: { member_id: member.id },
          });
        } catch {
          // Non-critical - ID can be generated later
          console.warn("Global ID generation deferred");
        }
      }

      // Save phone
      if (phone.trim() && member?.id) {
        await supabase.from("member_contacts").insert({
          member_id: member.id,
          type: "phone",
          value: `${phoneCountryCode} ${phone.trim()}`,
          primary_flag: true,
        });
      }

      // Save education if provided
      if (degree.trim() || institution.trim()) {
        const memberId = member?.id;
        if (memberId) {
          await supabase.from("education").insert({
            member_id: memberId,
            degree: degree.trim() || null,
            institution: institution.trim() || null,
            year: gradYear ? parseInt(gradYear) : null,
          });
        }
      }

      // Save employment if provided
      if (jobTitle.trim() || company.trim()) {
        const memberId = member?.id;
        if (memberId) {
          await supabase.from("employment").insert({
            member_id: memberId,
            job_title: jobTitle.trim() || null,
            company: company.trim() || null,
            sector: sector.trim() || null,
          });
        }
      }

      // Save skills
      if (skills.trim() && member?.id) {
        const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);
        for (const skill of skillList) {
          await supabase.from("member_skills").insert({ member_id: member.id, skill });
        }
      }

      // Save languages
      if (languages.trim() && member?.id) {
        const langList = languages.split(",").map((l) => l.trim()).filter(Boolean);
        for (const lang of langList) {
          await supabase.from("member_languages").insert({ member_id: member.id, language: lang });
        }
      }

      toast({ title: "Profile completed!", description: "Welcome to KhadayataOnline." });
      navigate("/dashboard");
    } catch (err: unknown) {
      toast({ title: "Error saving profile", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="border-b border-border bg-card">
        <div className="container max-w-3xl py-6">
          <h1 className="text-2xl font-display font-bold text-gradient-hero mb-1">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground mb-4">Step {step + 1} of {STEPS.length}</p>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => i < step && setStep(i)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  i <= step ? "gradient-hero" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className={`flex items-center gap-1.5 text-xs ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 container max-w-3xl py-8">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              {(() => { const Icon = currentStep.icon; return <Icon className="w-5 h-5 text-primary" />; })()}
              {currentStep.label} Details
            </CardTitle>
            <CardDescription>
              {step === 0 && "Select your chapter to join your local community (US-011)"}
              {step === 1 && "Enter your personal details to build your identity (US-004)"}
              {step === 2 && "Add your professional background for networking (US-006)"}
              {step === 3 && "Control who can see your information (US-008)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 0: Chapter selection */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select your Chapter</Label>
                  {chaptersLoading ? (
                    <div className="text-sm text-muted-foreground">Loading chapters...</div>
                  ) : (
                    <Select value={chapterId} onValueChange={setChapterId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a chapter..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters?.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            {ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {chapterId && chapters && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm font-medium">
                      {chapters.find((c) => c.id === chapterId)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll be connected to this chapter's local community.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Personal details */}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleNames">Middle Names</Label>
                  <Input id="middleNames" value={middleNames} onChange={(e) => setMiddleNames(e.target.value)} maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthPlace">Birth Place</Label>
                  <Input id="birthPlace" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ekda">Ekda</Label>
                  <Input id="ekda" value={ekda} onChange={(e) => setEkda(e.target.value)} placeholder="e.g., Kadva, Leuva" maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Phone *</Label>
                  <div className="flex gap-2">
                    <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
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
              </div>
            )}

            {/* Step 2: Professional */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Employment</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Sector</Label>
                      <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g., Healthcare, Technology" maxLength={200} />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Education</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Degree</Label>
                      <Input value={degree} onChange={(e) => setDegree(e.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label>Institution</Label>
                      <Input value={institution} onChange={(e) => setInstitution(e.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} min={1950} max={2030} />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Skills (comma-separated)</Label>
                    <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g., cardiology, operations" maxLength={500} />
                  </div>
                  <div className="space-y-2">
                    <Label>Languages (comma-separated)</Label>
                    <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g., English, Gujarati, Hindi" maxLength={500} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Privacy */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose who can see each piece of your information. You can change these anytime.
                </p>
                {PRIVACY_FIELDS.map((field) => (
                  <div key={field} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <Label className="capitalize">{field.replace("_", " ")}</Label>
                    <Select
                      value={privacy[field] || "members"}
                      onValueChange={(val) => setPrivacy({ ...privacy, [field]: val })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIVACY_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="gradient-hero text-primary-foreground">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving} className="gradient-hero text-primary-foreground">
              {saving ? "Saving..." : <><Check className="w-4 h-4 mr-1" /> Complete Profile</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
