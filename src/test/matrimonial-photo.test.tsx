import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { ProfileForm } from "@/components/matrimonial/ProfileForm";
import { ProfileDetailDialog } from "@/components/matrimonial/ProfileDetailDialog";
import type { MatrimonialProfile } from "@/components/matrimonial/constants";

function makeProfile(photoUrl: string | null): MatrimonialProfile {
  return {
    id: "mp-1",
    member_id: "m-1",
    about: "Community member",
    height_cm: 170,
    weight_kg: 65,
    complexion: "Fair",
    blood_group: "O+",
    diet: "Vegetarian",
    marital_status: "Never Married",
    manglik: "No",
    gotra: "Garg",
    nakshatra: null,
    rashi: null,
    native_place: "Ahmedabad",
    family_type: "Nuclear",
    family_status: "Upper Middle Class",
    father_occupation: null,
    mother_occupation: null,
    siblings: null,
    hobbies: ["Reading"],
    preferences: {},
    verified: true,
    visibility: "members",
    created_at: new Date().toISOString(),
    glasses: null,
    driving: null,
    citizenship: null,
    current_city: "Mumbai",
    current_state: "Maharashtra",
    education_level: "Graduate",
    education_field: "Engineering",
    father_name: null,
    mother_name: null,
    parents_marital_status: null,
    position_title: "Engineer",
    business_name: null,
    visa_type: null,
    income: null,
    income_currency: "INR",
    linkedin_url: null,
    contact_number: null,
    parent_contact: null,
    ekda: null,
    kuldevi: null,
    country: "India",
    member: {
      id: "m-1",
      first_name: "Aarav",
      last_name: "Shah",
      gender: "Male",
      dob: "1996-05-10",
      photo_url: photoUrl,
      chapters: { name: "Ahmedabad" },
    },
  };
}

describe("Matrimonial photo upload and rendering", () => {
  it("ProfileForm renders Profile Photo upload section and current photo", () => {
    renderApp(
      <ProfileForm
        memberId="m-1"
        currentPhotoUrl="https://example.com/avatar.jpg"
        initials="AS"
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByText("Profile Photo")).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    const img = document.querySelector('img[src="https://example.com/avatar.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it("ProfileDetailDialog renders member photo when photo_url is set", async () => {
    const user = userEvent.setup();
    renderApp(
      <ProfileDetailDialog profile={makeProfile("https://example.com/aarav.jpg")}>
        <button>Open Detail</button>
      </ProfileDetailDialog>
    );
    await user.click(screen.getByRole("button", { name: "Open Detail" }));
    const img = await screen.findByAltText("Aarav Shah");
    expect(img).toHaveAttribute("src", "https://example.com/aarav.jpg");
  });

  it("ProfileDetailDialog falls back to initials when photo_url is null", async () => {
    const user = userEvent.setup();
    renderApp(
      <ProfileDetailDialog profile={makeProfile(null)}>
        <button>Open Detail</button>
      </ProfileDetailDialog>
    );
    await user.click(screen.getByRole("button", { name: "Open Detail" }));
    expect(await screen.findByText("AS")).toBeInTheDocument();
  });
});
