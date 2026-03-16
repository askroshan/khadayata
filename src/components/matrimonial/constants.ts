export const MARITAL_STATUS = ["Never Married", "Divorced", "Widowed", "Awaiting Divorce"];
export const DIETS = ["Vegetarian", "Jain Vegetarian", "Eggetarian"];
export const COMPLEXIONS = ["Very Fair", "Fair", "Wheatish", "Wheatish Brown"];
export const MANGLIK = ["Yes", "No", "Partial (Anshik)", "Don't Know"];
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const FAMILY_TYPES = ["Joint Family", "Nuclear Family"];
export const FAMILY_STATUS = ["Middle Class", "Upper Middle Class", "Rich", "Affluent"];
export const RASHIS = ["Mesh (Aries)", "Vrishabh (Taurus)", "Mithun (Gemini)", "Kark (Cancer)", "Sinh (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchik (Scorpio)", "Dhanu (Sagittarius)", "Makar (Capricorn)", "Kumbh (Aquarius)", "Meen (Pisces)"];
export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
export const HOBBIES = ["Reading", "Cooking", "Music", "Dance", "Sports", "Travel", "Yoga", "Meditation", "Painting", "Photography", "Gardening", "Social Work"];
export const GLASSES_OPTIONS = ["Yes", "No", "Contact Lenses"];
export const DRIVING_OPTIONS = ["2 Wheeler", "4 Wheeler", "Both", "None"];
export const EDUCATION_LEVELS = ["High School", "Diploma", "Graduate", "Post Graduate", "MBA", "MBBS/MD", "Engineer (B.E./B.Tech)", "CA/CS/CMA", "PhD", "Other"];
export const VISA_TYPES = ["Citizen", "PR / Green Card", "Work Visa (H1B/L1)", "Student Visa", "Dependent Visa", "OCI/PIO", "Not Applicable"];
export const CURRENCIES = ["INR", "USD", "GBP", "EUR", "CAD", "AUD", "AED"];
export const PARENTS_MARITAL_STATUS = ["Married", "Divorced", "Father Deceased", "Mother Deceased", "Both Deceased"];

export type MatrimonialProfile = {
  id: string;
  member_id: string;
  about: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  complexion: string | null;
  blood_group: string | null;
  diet: string | null;
  marital_status: string | null;
  manglik: string | null;
  gotra: string | null;
  nakshatra: string | null;
  rashi: string | null;
  native_place: string | null;
  family_type: string | null;
  family_status: string | null;
  father_occupation: string | null;
  mother_occupation: string | null;
  siblings: string | null;
  hobbies: string[] | null;
  preferences: Record<string, unknown>;
  verified: boolean;
  visibility: string;
  created_at: string;
  glasses: string | null;
  driving: string | null;
  citizenship: string | null;
  current_city: string | null;
  current_state: string | null;
  education_level: string | null;
  education_field: string | null;
  father_name: string | null;
  mother_name: string | null;
  parents_marital_status: string | null;
  position_title: string | null;
  business_name: string | null;
  visa_type: string | null;
  income: number | null;
  income_currency: string | null;
  linkedin_url: string | null;
  contact_number: string | null;
  parent_contact: string | null;
  ekda: string | null;
  kuldevi: string | null;
  country: string | null;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    gender: string | null;
    dob: string | null;
    photo_url: string | null;
    chapters: { name: string } | null;
  } | null;
};

export function computeAge(dob: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function cmToFeetInches(cm: number | null) {
  if (!cm) return null;
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${feet}'${rem}"`;
}

export function hasGotraConflict(a: MatrimonialProfile, b: MatrimonialProfile): boolean {
  if (!a.gotra || !b.gotra) return false;
  return a.gotra.trim().toLowerCase() === b.gotra.trim().toLowerCase();
}

export function hasEkdaConflict(a: MatrimonialProfile, b: MatrimonialProfile): boolean {
  if (!a.ekda || !b.ekda) return false;
  return a.ekda.trim().toLowerCase() === b.ekda.trim().toLowerCase();
}

export function matchScore(myProfile: MatrimonialProfile, otherProfile: MatrimonialProfile, myMember: { gender: string | null; dob: string | null } | null): number {
  if (!myProfile.preferences || !otherProfile) return 0;
  const prefs = myProfile.preferences as Record<string, unknown>;
  let score = 0;
  let total = 0;

  if (prefs.min_age && prefs.max_age && otherProfile.member?.dob) {
    total += 25;
    const age = computeAge(otherProfile.member.dob);
    if (age && age >= Number(prefs.min_age) && age <= Number(prefs.max_age)) score += 25;
  }
  if (prefs.min_height && prefs.max_height && otherProfile.height_cm) {
    total += 20;
    if (otherProfile.height_cm >= Number(prefs.min_height) && otherProfile.height_cm <= Number(prefs.max_height)) score += 20;
  }
  if (prefs.preferred_diet && otherProfile.diet) {
    total += 15;
    if (otherProfile.diet === prefs.preferred_diet) score += 15;
  }
  if (prefs.preferred_marital_status && otherProfile.marital_status) {
    total += 15;
    if (otherProfile.marital_status === prefs.preferred_marital_status) score += 15;
  }
  if (prefs.preferred_manglik && otherProfile.manglik) {
    total += 15;
    if (otherProfile.manglik === prefs.preferred_manglik || prefs.preferred_manglik === "Doesn't Matter") score += 15;
  }
  if (prefs.preferred_education && otherProfile.education_level) {
    total += 10;
    if (otherProfile.education_level === prefs.preferred_education) score += 10;
    else score += 3;
  }

  return total > 0 ? Math.round((score / total) * 100) : 50;
}
