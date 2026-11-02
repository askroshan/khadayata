import { describe, it, expect } from "vitest";
import {
  computeAge,
  cmToFeetInches,
  hasGotraConflict,
  hasEkdaConflict,
  matchScore,
  type MatrimonialProfile,
} from "@/components/matrimonial/constants";

function profile(partial: Partial<MatrimonialProfile> & { gotra?: string | null; ekda?: string | null }): MatrimonialProfile {
  return {
    id: "1",
    member_id: "m1",
    about: null,
    height_cm: 170,
    weight_kg: null,
    complexion: null,
    blood_group: null,
    diet: "Vegetarian",
    marital_status: "Never Married",
    manglik: "No",
    gotra: null,
    nakshatra: null,
    rashi: null,
    native_place: null,
    family_type: null,
    family_status: null,
    father_occupation: null,
    mother_occupation: null,
    siblings: null,
    hobbies: null,
    preferences: {},
    verified: false,
    visibility: "members",
    created_at: new Date().toISOString(),
    glasses: null,
    driving: null,
    citizenship: null,
    current_city: null,
    current_state: null,
    education_level: "Graduate",
    education_field: null,
    father_name: null,
    mother_name: null,
    parents_marital_status: null,
    position_title: null,
    business_name: null,
    visa_type: null,
    income: null,
    income_currency: null,
    linkedin_url: null,
    contact_number: null,
    parent_contact: null,
    ekda: null,
    kuldevi: null,
    country: null,
    member: {
      id: "m1",
      first_name: "A",
      last_name: "B",
      gender: "female",
      dob: "1995-06-15",
      photo_url: null,
      chapters: { name: "Ahmedabad" },
    },
    ...partial,
  };
}

describe("matrimonial constants pure helpers", () => {
  it("computeAge / cmToFeetInches edge cases", () => {
    expect(computeAge(null)).toBeNull();
    expect(computeAge("1990-01-01")).toBeGreaterThan(20);
    expect(cmToFeetInches(null)).toBeNull();
    expect(cmToFeetInches(0)).toBeNull();
    expect(cmToFeetInches(183)).toMatch(/'/);
  });

  it("gotra / ekda conflict detection", () => {
    const a = profile({ gotra: "Garg", ekda: "One" });
    const b = profile({ gotra: "garg", ekda: "one" });
    const c = profile({ gotra: "Kashyap", ekda: "Two" });
    expect(hasGotraConflict(a, b)).toBe(true);
    expect(hasGotraConflict(a, c)).toBe(false);
    expect(hasGotraConflict(profile({ gotra: null }), b)).toBe(false);
    expect(hasEkdaConflict(a, b)).toBe(true);
    expect(hasEkdaConflict(a, c)).toBe(false);
    expect(hasEkdaConflict(profile({ ekda: null }), b)).toBe(false);
  });

  it("matchScore with preferences and empty prefs", () => {
    const other = profile({
      height_cm: 165,
      diet: "Vegetarian",
      marital_status: "Never Married",
      manglik: "No",
      education_level: "Graduate",
    });
    expect(matchScore(profile({ preferences: {} }), other, null)).toBe(50);
    const scored = matchScore(
      profile({
        preferences: {
          min_age: 20,
          max_age: 40,
          min_height: 150,
          max_height: 180,
          preferred_diet: "Vegetarian",
          preferred_marital_status: "Never Married",
          preferred_manglik: "Doesn't Matter",
          preferred_education: "MBA",
        },
      }),
      other,
      { gender: "male", dob: "1990-01-01" },
    );
    expect(scored).toBeGreaterThan(0);
    expect(scored).toBeLessThanOrEqual(100);
    expect(matchScore(profile({ preferences: { min_age: 20, max_age: 40 } }), profile({ member: null }), null)).toBe(50);
  });
});
