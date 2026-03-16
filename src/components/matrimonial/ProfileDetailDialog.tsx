import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoChip } from "./InfoChip";
import { MatrimonialProfile, computeAge, cmToFeetInches } from "./constants";
import { Heart, Shield, User, MapPin, GraduationCap, Briefcase, Ruler, Scale, UtensilsCrossed, Star, Users, Calendar, Gem, BookOpen, Chrome as Home, UserCheck, Glasses, Car, Globe, Building, BadgeDollarSign, Linkedin, Phone, Crown } from "lucide-react";

export function ProfileDetailDialog({ profile, children }: { profile: MatrimonialProfile; children: React.ReactNode }) {
  const m = profile.member;
  const age = computeAge(m?.dob ?? null);
  const height = cmToFeetInches(profile.height_cm);
  const prefs = profile.preferences as Record<string, unknown>;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-3">
            <div className="w-14 h-14 rounded-full gradient-jewel flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
              {m?.first_name?.[0]}{m?.last_name?.[0]}
            </div>
            <div>
              {m?.first_name} {m?.last_name}
              {profile.verified && <Badge className="bg-success/20 text-success text-xs ml-2"><Shield className="w-3 h-3 mr-0.5" />Verified</Badge>}
              <p className="text-sm font-normal text-muted-foreground mt-0.5">{m?.chapters?.name}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Matrimonial profile details</DialogDescription>
        </DialogHeader>

        {profile.about && (
          <div className="bg-muted/30 rounded-lg p-4 mt-2">
            <p className="text-sm leading-relaxed">{profile.about}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {age && <InfoChip icon={Calendar} label="Age" value={`${age} years`} />}
          {height && <InfoChip icon={Ruler} label="Height" value={height} />}
          {profile.weight_kg && <InfoChip icon={Scale} label="Weight" value={`${profile.weight_kg} kg`} />}
          {profile.complexion && <InfoChip icon={User} label="Complexion" value={profile.complexion} />}
          {profile.diet && <InfoChip icon={UtensilsCrossed} label="Diet" value={profile.diet} />}
          {profile.marital_status && <InfoChip icon={Heart} label="Status" value={profile.marital_status} />}
          {profile.blood_group && <InfoChip icon={Heart} label="Blood" value={profile.blood_group} />}
          {profile.glasses && <InfoChip icon={Glasses} label="Glasses" value={profile.glasses} />}
          {profile.driving && <InfoChip icon={Car} label="Driving" value={profile.driving} />}
          {profile.contact_number && <InfoChip icon={Phone} label="Contact" value={profile.contact_number} />}
          {profile.current_city && <InfoChip icon={MapPin} label="Current City" value={`${profile.current_city}${profile.current_state ? ', ' + profile.current_state : ''}`} />}
          {profile.country && <InfoChip icon={Globe} label="Country" value={profile.country} />}
          {profile.citizenship && <InfoChip icon={Globe} label="Citizenship" value={profile.citizenship} />}
          {profile.visa_type && <InfoChip icon={Globe} label="Visa" value={profile.visa_type} />}
        </div>

        <Separator className="my-4" />

        <h4 className="font-display font-semibold flex items-center gap-2 mb-3"><GraduationCap className="w-4 h-4 text-secondary" /> Education & Career</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {profile.education_level && <InfoChip icon={GraduationCap} label="Education" value={`${profile.education_level}${profile.education_field ? ' - ' + profile.education_field : ''}`} />}
          {profile.position_title && <InfoChip icon={Briefcase} label="Position" value={profile.position_title} />}
          {profile.business_name && <InfoChip icon={Building} label="Company/Business" value={profile.business_name} />}
          {profile.income && <InfoChip icon={BadgeDollarSign} label="Income" value={`${profile.income_currency ?? 'INR'} ${Number(profile.income).toLocaleString()} / year`} />}
          {profile.linkedin_url && <InfoChip icon={Linkedin} label="LinkedIn" value="View Profile" />}
        </div>

        <Separator className="my-4" />

        <h4 className="font-display font-semibold flex items-center gap-2 mb-3"><Star className="w-4 h-4 text-secondary" /> Kundali Details</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {profile.manglik && <InfoChip icon={Star} label="Manglik" value={profile.manglik} />}
          {profile.gotra && <InfoChip icon={BookOpen} label="Gotra" value={profile.gotra} />}
          {profile.rashi && <InfoChip icon={Star} label="Rashi" value={profile.rashi} />}
          {profile.nakshatra && <InfoChip icon={Gem} label="Nakshatra" value={profile.nakshatra} />}
          {profile.native_place && <InfoChip icon={MapPin} label="Native" value={profile.native_place} />}
          {profile.ekda && <InfoChip icon={Crown} label="Ekda" value={profile.ekda} />}
          {profile.kuldevi && <InfoChip icon={Crown} label="Kuldevi" value={profile.kuldevi} />}
        </div>

        <Separator className="my-4" />

        <h4 className="font-display font-semibold flex items-center gap-2 mb-3"><Home className="w-4 h-4 text-secondary" /> Family Details</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {profile.family_type && <InfoChip icon={Users} label="Family" value={profile.family_type} />}
          {profile.family_status && <InfoChip icon={Briefcase} label="Status" value={profile.family_status} />}
          {profile.father_name && <InfoChip icon={User} label="Father's Name" value={profile.father_name} />}
          {profile.father_occupation && <InfoChip icon={Briefcase} label="Father's Profession" value={profile.father_occupation} />}
          {profile.mother_name && <InfoChip icon={User} label="Mother's Name" value={profile.mother_name} />}
          {profile.mother_occupation && <InfoChip icon={Briefcase} label="Mother's Profession" value={profile.mother_occupation} />}
          {profile.parents_marital_status && <InfoChip icon={Heart} label="Parents Status" value={profile.parents_marital_status} />}
          {profile.siblings && <InfoChip icon={Users} label="Siblings" value={profile.siblings} />}
          {profile.parent_contact && <InfoChip icon={Phone} label="Parent's Contact" value={profile.parent_contact} />}
        </div>

        {profile.hobbies && profile.hobbies.length > 0 && (
          <>
            <Separator className="my-4" />
            <h4 className="font-display font-semibold mb-2">Hobbies & Interests</h4>
            <div className="flex flex-wrap gap-2">
              {profile.hobbies.map(h => <Badge key={h} variant="outline" className="text-xs">{h}</Badge>)}
            </div>
          </>
        )}

        {prefs && Object.keys(prefs).length > 0 && (
          <>
            <Separator className="my-4" />
            <h4 className="font-display font-semibold flex items-center gap-2 mb-3"><UserCheck className="w-4 h-4 text-secondary" /> Partner Preferences</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {prefs.min_age && prefs.max_age && <InfoChip icon={Calendar} label="Age" value={`${prefs.min_age} - ${prefs.max_age} years`} />}
              {prefs.min_height && prefs.max_height && <InfoChip icon={Ruler} label="Height" value={`${cmToFeetInches(Number(prefs.min_height))} - ${cmToFeetInches(Number(prefs.max_height))}`} />}
              {prefs.preferred_diet && <InfoChip icon={UtensilsCrossed} label="Diet" value={String(prefs.preferred_diet)} />}
              {prefs.preferred_marital_status && <InfoChip icon={Heart} label="Status" value={String(prefs.preferred_marital_status)} />}
              {prefs.preferred_manglik && <InfoChip icon={Star} label="Manglik" value={String(prefs.preferred_manglik)} />}
              {prefs.preferred_education && <InfoChip icon={GraduationCap} label="Education" value={String(prefs.preferred_education)} />}
              {prefs.preferred_occupation && <InfoChip icon={Briefcase} label="Occupation" value={String(prefs.preferred_occupation)} />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
