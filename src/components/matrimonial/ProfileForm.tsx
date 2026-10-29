import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Star, UserCheck } from "lucide-react";
import { safeErrorMessage } from "@/lib/error-utils";
import {
  MatrimonialProfile, MARITAL_STATUS, DIETS, COMPLEXIONS, MANGLIK, BLOOD_GROUPS,
  FAMILY_TYPES, FAMILY_STATUS, RASHIS, NAKSHATRAS, HOBBIES, GLASSES_OPTIONS,
  DRIVING_OPTIONS, EDUCATION_LEVELS, VISA_TYPES, CURRENCIES, PARENTS_MARITAL_STATUS,
  cmToFeetInches
} from "./constants";

export function ProfileForm({
  initial,
  memberId,
  onSuccess,
}: {
  initial?: MatrimonialProfile | null;
  memberId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!initial;
  const prefs = (initial?.preferences ?? {}) as Record<string, unknown>;

  // Personal
  const [about, setAbout] = useState(initial?.about ?? "");
  const [heightCm, setHeightCm] = useState(String(initial?.height_cm ?? ""));
  const [weightKg, setWeightKg] = useState(String(initial?.weight_kg ?? ""));
  const [complexion, setComplexion] = useState(initial?.complexion ?? "");
  const [bloodGroup, setBloodGroup] = useState(initial?.blood_group ?? "");
  const [diet, setDiet] = useState(initial?.diet ?? "Vegetarian");
  const [maritalStatus, setMaritalStatus] = useState(initial?.marital_status ?? "Never Married");
  const [glasses, setGlasses] = useState(initial?.glasses ?? "");
  const [driving, setDriving] = useState(initial?.driving ?? "");
  const [hobbies, setHobbies] = useState<string[]>(initial?.hobbies ?? []);
  const [contactNumber, setContactNumber] = useState(initial?.contact_number ?? "");

  // Location & Visa
  const [currentCity, setCurrentCity] = useState(initial?.current_city ?? "");
  const [currentState, setCurrentState] = useState(initial?.current_state ?? "");
  const [citizenship, setCitizenship] = useState(initial?.citizenship ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [visaType, setVisaType] = useState(initial?.visa_type ?? "");

  // Education & Career
  const [educationLevel, setEducationLevel] = useState(initial?.education_level ?? "");
  const [educationField, setEducationField] = useState(initial?.education_field ?? "");
  const [positionTitle, setPositionTitle] = useState(initial?.position_title ?? "");
  const [businessName, setBusinessName] = useState(initial?.business_name ?? "");
  const [income, setIncome] = useState(String(initial?.income ?? ""));
  const [incomeCurrency, setIncomeCurrency] = useState(initial?.income_currency ?? "INR");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedin_url ?? "");

  // Kundali
  const [manglik, setManglik] = useState(initial?.manglik ?? "");
  const [gotra, setGotra] = useState(initial?.gotra ?? "");
  const [nakshatra, setNakshatra] = useState(initial?.nakshatra ?? "");
  const [rashi, setRashi] = useState(initial?.rashi ?? "");
  const [nativePlace, setNativePlace] = useState(initial?.native_place ?? "");
  const [ekda, setEkda] = useState(initial?.ekda ?? "");
  const [kuldevi, setKuldevi] = useState(initial?.kuldevi ?? "");

  // Family
  const [familyType, setFamilyType] = useState(initial?.family_type ?? "");
  const [familyStatus, setFamilyStatus] = useState(initial?.family_status ?? "");
  const [fatherName, setFatherName] = useState(initial?.father_name ?? "");
  const [fatherOccupation, setFatherOccupation] = useState(initial?.father_occupation ?? "");
  const [motherName, setMotherName] = useState(initial?.mother_name ?? "");
  const [motherOccupation, setMotherOccupation] = useState(initial?.mother_occupation ?? "");
  const [parentsMaritalStatus, setParentsMaritalStatus] = useState(initial?.parents_marital_status ?? "Married");
  const [siblings, setSiblings] = useState(initial?.siblings ?? "");
  const [parentContact, setParentContact] = useState(initial?.parent_contact ?? "");

  // Partner prefs
  const [minAge, setMinAge] = useState(String(prefs.min_age ?? "21"));
  const [maxAge, setMaxAge] = useState(String(prefs.max_age ?? "35"));
  const [minHeight, setMinHeight] = useState(String(prefs.min_height ?? "150"));
  const [maxHeight, setMaxHeight] = useState(String(prefs.max_height ?? "185"));
  const [prefDiet, setPrefDiet] = useState(String(prefs.preferred_diet ?? ""));
  const [prefMarital, setPrefMarital] = useState(String(prefs.preferred_marital_status ?? ""));
  const [prefManglik, setPrefManglik] = useState(String(prefs.preferred_manglik ?? ""));
  const [prefEducation, setPrefEducation] = useState(String(prefs.preferred_education ?? ""));
  const [prefOccupation, setPrefOccupation] = useState(String(prefs.preferred_occupation ?? ""));

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const FORM_STEPS = ["Personal & Lifestyle", "Education & Career", "Kundali & Background", "Family", "Partner Preferences"];

  const save = async () => {
    setSaving(true);
    const payload = {
      member_id: memberId,
      about: about.trim() || null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      complexion: complexion || null,
      blood_group: bloodGroup || null,
      diet: diet || null,
      marital_status: maritalStatus || null,
      glasses: glasses || null,
      driving: driving || null,
      current_city: currentCity.trim() || null,
      current_state: currentState.trim() || null,
      citizenship: citizenship.trim() || null,
      country: country.trim() || null,
      visa_type: visaType || null,
      education_level: educationLevel || null,
      education_field: educationField.trim() || null,
      position_title: positionTitle.trim() || null,
      business_name: businessName.trim() || null,
      income: income ? Number(income) : null,
      income_currency: incomeCurrency || "INR",
      linkedin_url: linkedinUrl.trim() || null,
      contact_number: contactNumber.trim() || null,
      manglik: manglik || null,
      gotra: gotra.trim() || null,
      nakshatra: nakshatra || null,
      rashi: rashi || null,
      native_place: nativePlace.trim() || null,
      ekda: ekda.trim() || null,
      kuldevi: kuldevi.trim() || null,
      family_type: familyType || null,
      family_status: familyStatus || null,
      father_name: fatherName.trim() || null,
      father_occupation: fatherOccupation.trim() || null,
      mother_name: motherName.trim() || null,
      mother_occupation: motherOccupation.trim() || null,
      parents_marital_status: parentsMaritalStatus || null,
      siblings: siblings.trim() || null,
      parent_contact: parentContact.trim() || null,
      hobbies: hobbies.length > 0 ? hobbies : null,
      preferences: {
        min_age: minAge ? Number(minAge) : null,
        max_age: maxAge ? Number(maxAge) : null,
        min_height: minHeight ? Number(minHeight) : null,
        max_height: maxHeight ? Number(maxHeight) : null,
        preferred_diet: prefDiet || null,
        preferred_marital_status: prefMarital || null,
        preferred_manglik: prefManglik || null,
        preferred_education: prefEducation.trim() || null,
        preferred_occupation: prefOccupation.trim() || null,
      },
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("matrimonial_profiles").update(payload).eq("id", initial!.id));
    } else {
      ({ error } = await supabase.from("matrimonial_profiles").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: safeErrorMessage(error, "We could not save your profile. Please try again."), variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Profile updated!" : "Profile created!" });
      queryClient.invalidateQueries({ queryKey: ["my-matrimonial"] });
      queryClient.invalidateQueries({ queryKey: ["matrimonial-profiles"] });
      onSuccess();
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {FORM_STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all whitespace-nowrap px-1 ${
              i === step ? "gradient-warm text-primary-foreground shadow-md" : i < step ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Step 0: Personal & Lifestyle */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label>About Me / Bio</Label>
            <Textarea placeholder="Tell potential matches about yourself..." value={about} onChange={(e) => setAbout(e.target.value)} className="mt-1.5 min-h-[80px]" maxLength={1000} />
            <p className="text-xs text-muted-foreground mt-1">{about.length}/1000</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" placeholder="165" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} min={120} max={220} className="mt-1.5" />
              {heightCm && <p className="text-xs text-muted-foreground mt-0.5">{cmToFeetInches(Number(heightCm))}</p>}
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" placeholder="65" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} min={30} max={200} className="mt-1.5" />
            </div>
            <div>
              <Label>Complexion</Label>
              <Select value={complexion} onValueChange={setComplexion}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{COMPLEXIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Blood Group</Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Diet</Label>
              <Select value={diet} onValueChange={setDiet}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{DIETS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Marital Status</Label>
              <Select value={maritalStatus} onValueChange={setMaritalStatus}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{MARITAL_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Glasses</Label>
              <Select value={glasses} onValueChange={setGlasses}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{GLASSES_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Driving</Label>
              <Select value={driving} onValueChange={setDriving}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{DRIVING_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label>Contact Number</Label>
              <Input placeholder="e.g., +91 98765 43210" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="mt-1.5" maxLength={20} />
            </div>
            <div>
              <Label>Current City</Label>
              <Input placeholder="e.g., Mumbai" value={currentCity} onChange={(e) => setCurrentCity(e.target.value)} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Current State</Label>
              <Input placeholder="e.g., Maharashtra" value={currentState} onChange={(e) => setCurrentState(e.target.value)} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Country</Label>
              <Input placeholder="e.g., India" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Citizenship</Label>
              <Input placeholder="e.g., Indian" value={citizenship} onChange={(e) => setCitizenship(e.target.value)} className="mt-1.5" maxLength={100} />
            </div>
          </div>
          <div>
            <Label>Hobbies & Interests</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {HOBBIES.map(h => (
                <button
                  key={h} type="button"
                  onClick={() => setHobbies(hobbies.includes(h) ? hobbies.filter(x => x !== h) : [...hobbies, h])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${hobbies.includes(h) ? "gradient-warm text-primary-foreground border-transparent shadow-sm" : "bg-background text-muted-foreground border-border hover:border-secondary/50"}`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Education & Career */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label>Education Level</Label>
              <Select value={educationLevel} onValueChange={setEducationLevel}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{EDUCATION_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Field of Study</Label>
              <Input placeholder="e.g., Computer Science" value={educationField} onChange={(e) => setEducationField(e.target.value)} className="mt-1.5" maxLength={200} />
            </div>
            <div>
              <Label>Position / Job Title</Label>
              <Input placeholder="e.g., Software Engineer" value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} className="mt-1.5" maxLength={200} />
            </div>
            <div>
              <Label>Company / Business</Label>
              <Input placeholder="e.g., Tata Consultancy" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1.5" maxLength={200} />
            </div>
            <div>
              <Label>Annual Income</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={incomeCurrency} onValueChange={setIncomeCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="e.g., 1200000" value={income} onChange={(e) => setIncome(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Visa Type</Label>
              <Select value={visaType} onValueChange={setVisaType}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{VISA_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <Label>LinkedIn URL</Label>
              <Input placeholder="https://linkedin.com/in/yourprofile" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="mt-1.5" maxLength={300} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Kundali / Background */}
      {step === 2 && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
          <CardContent className="pt-5">
            <h4 className="font-display font-semibold flex items-center gap-2 mb-4 text-amber-800 dark:text-amber-200">
              <Star className="w-4 h-4" /> Kundali Details
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label>Manglik</Label>
                <Select value={manglik} onValueChange={setManglik}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{MANGLIK.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Gotra</Label>
                <Input placeholder="e.g., Kashyap" value={gotra} onChange={(e) => setGotra(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Rashi (Moon Sign)</Label>
                <Select value={rashi} onValueChange={setRashi}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{RASHIS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Nakshatra (Birth Star)</Label>
                <Select value={nakshatra} onValueChange={setNakshatra}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{NAKSHATRAS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Native Place</Label>
                <Input placeholder="e.g., Rajkot, Gujarat" value={nativePlace} onChange={(e) => setNativePlace(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Ekda</Label>
                <Input placeholder="e.g., Ekda name" value={ekda} onChange={(e) => setEkda(e.target.value)} className="mt-1.5" maxLength={100} />
              </div>
              <div>
                <Label>Kuldevi</Label>
                <Input placeholder="e.g., Kuldevi name" value={kuldevi} onChange={(e) => setKuldevi(e.target.value)} className="mt-1.5" maxLength={100} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Family */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Family Type</Label>
              <Select value={familyType} onValueChange={setFamilyType}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{FAMILY_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Family Status</Label>
              <Select value={familyStatus} onValueChange={setFamilyStatus}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{FAMILY_STATUS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Father's Name</Label>
              <Input placeholder="e.g., Rameshbhai" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Father's Profession</Label>
              <Input placeholder="e.g., Business Owner" value={fatherOccupation} onChange={(e) => setFatherOccupation(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Mother's Name</Label>
              <Input placeholder="e.g., Sumitraben" value={motherName} onChange={(e) => setMotherName(e.target.value)} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Mother's Profession</Label>
              <Input placeholder="e.g., Homemaker" value={motherOccupation} onChange={(e) => setMotherOccupation(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Parents' Marital Status</Label>
              <Select value={parentsMaritalStatus} onValueChange={setParentsMaritalStatus}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{PARENTS_MARITAL_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label>Siblings</Label>
              <Input placeholder="e.g., 1 Elder Brother (Married)" value={siblings} onChange={(e) => setSiblings(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Parent's Contact Number</Label>
              <Input placeholder="e.g., +91 98765 43210" value={parentContact} onChange={(e) => setParentContact(e.target.value)} className="mt-1.5" maxLength={20} />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Partner Preferences */}
      {step === 4 && (
        <Card className="bg-pink-50/50 dark:bg-pink-950/20 border-pink-200/50">
          <CardContent className="pt-5">
            <h4 className="font-display font-semibold flex items-center gap-2 mb-4 text-pink-800 dark:text-pink-200">
              <UserCheck className="w-4 h-4" /> Partner Preferences
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label>Min Age</Label>
                <Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} min={18} max={60} className="mt-1.5" />
              </div>
              <div>
                <Label>Max Age</Label>
                <Input type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} min={18} max={60} className="mt-1.5" />
              </div>
              <div>
                <Label>Min Height (cm)</Label>
                <Input type="number" value={minHeight} onChange={(e) => setMinHeight(e.target.value)} min={120} max={220} className="mt-1.5" />
                {minHeight && <p className="text-xs text-muted-foreground mt-0.5">{cmToFeetInches(Number(minHeight))}</p>}
              </div>
              <div>
                <Label>Max Height (cm)</Label>
                <Input type="number" value={maxHeight} onChange={(e) => setMaxHeight(e.target.value)} min={120} max={220} className="mt-1.5" />
                {maxHeight && <p className="text-xs text-muted-foreground mt-0.5">{cmToFeetInches(Number(maxHeight))}</p>}
              </div>
              <div>
                <Label>Diet Preference</Label>
                <Select value={prefDiet} onValueChange={setPrefDiet}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger><SelectContent>{DIETS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Marital Status</Label>
                <Select value={prefMarital} onValueChange={setPrefMarital}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger><SelectContent>{MARITAL_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Manglik Preference</Label>
                <Select value={prefManglik} onValueChange={setPrefManglik}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger><SelectContent>{[...MANGLIK, "Doesn't Matter"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Education</Label>
                <Select value={prefEducation} onValueChange={setPrefEducation}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Any" /></SelectTrigger><SelectContent>{EDUCATION_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Occupation</Label>
                <Input placeholder="e.g., Business, Professional" value={prefOccupation} onChange={(e) => setPrefOccupation(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        <div className="flex gap-2">
          {step < FORM_STEPS.length - 1 ? (
            <Button className="gradient-hero text-primary-foreground" onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="gradient-hero text-primary-foreground" onClick={save} disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update Profile" : "Create Profile"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
