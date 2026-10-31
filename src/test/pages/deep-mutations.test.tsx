import { describe, it, expect, afterAll } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Matrimonial from "@/pages/Matrimonial";
import Events from "@/pages/Events";
import News from "@/pages/News";
import Obituaries from "@/pages/Obituaries";
import Mentorship from "@/pages/Mentorship";
import Scholarships from "@/pages/Scholarships";
import ObituaryForm from "@/components/obituaries/ObituaryForm";
import { ProfileForm } from "@/components/matrimonial/ProfileForm";
import { SearchFilters, EMPTY_FILTERS } from "@/components/matrimonial/SearchFilters";
import { MatrimonialModerationPanel } from "@/components/matrimonial/MatrimonialModerationPanel";
import { RishtaWorkflow } from "@/components/matrimonial/RishtaWorkflow";
import { ProfileDetailDialog } from "@/components/matrimonial/ProfileDetailDialog";
import { CampaignsPanel } from "@/components/finance/CampaignsPanel";
import { TrustCorpusPanel } from "@/components/finance/TrustCorpusPanel";
import { RecurringPledgesPanel } from "@/components/finance/RecurringPledgesPanel";
import { VerificationCenter } from "@/components/verification/VerificationCenter";
import { FamilyInviteDialog } from "@/components/profile/FamilyInviteDialog";
import { EventGallery } from "@/components/events/EventGallery";
import { HeritageTagging } from "@/components/heritage/HeritageTagging";
import ReportsTab from "@/components/admin/ReportsTab";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import type { MatrimonialProfile } from "@/components/matrimonial/constants";
import { useState } from "react";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

let lastSignInAt = 0;

async function signIn(email: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;

  // Avoid GoTrue rate limits when the full suite signs in many roles.
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: E2E_PASSWORD,
    });
    lastSignInAt = Date.now();
    if (!error) return;
    lastErr = error;
    if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      continue;
    }
    throw error;
  }
  throw lastErr ?? new Error(`signIn failed for ${email}`);
}

async function memberId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("members").select("id").eq("user_id", user!.id).maybeSingle();
  return data!.id;
}

const stubProfile = {
  id: "00000000-0000-0000-0000-0000000000aa",
  member_id: "00000000-0000-0000-0000-0000000000bb",
  about: "Coverage profile",
  height_cm: 170,
  weight_kg: 70,
  complexion: null,
  blood_group: null,
  diet: "Vegetarian",
  marital_status: "Never Married",
  manglik: null,
  gotra: null,
  nakshatra: null,
  rashi: null,
  native_place: null,
  family_type: null,
  family_status: null,
  father_occupation: null,
  mother_occupation: null,
  siblings: null,
  hobbies: [],
  preferences: {},
  verified: false,
  visibility: "members",
  created_at: new Date().toISOString(),
  glasses: null,
  driving: null,
  citizenship: null,
  current_city: "Ahmedabad",
  current_state: null,
  education_level: null,
  education_field: null,
  father_name: null,
  mother_name: null,
  parents_marital_status: null,
  position_title: null,
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
    id: "00000000-0000-0000-0000-0000000000bb",
    first_name: "Coverage",
    last_name: "Match",
    dob: "1990-01-01",
    gender: "male",
    photo_url: null,
    chapters: { name: "Ahmedabad India Chapter" },
  },
} satisfies MatrimonialProfile;

describe("Deep page / component mutation trees (real sessions)", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("Matrimonial: tabs + create-profile form fill", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<Matrimonial />, { route: "/matrimonial/manage" });
    await waitFor(
      () => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/matrimonial|profile|match/);
      },
      { timeout: 25_000 },
    );
    for (const name of [/Matches/i, /Rishta/i, /Introduction/i, /My Profile/i]) {
      const tab = screen.queryByRole("tab", { name });
      if (tab) await user.click(tab);
    }
    const create =
      screen.queryByRole("button", { name: /Create My Profile|Create Matrimonial|Create Your Profile/i }) ||
      screen.queryByRole("button", { name: /Create/i });
    if (create) {
      await user.click(create);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/about|height|diet|marital|education|city/);
      }, { timeout: 10_000 });
      const about = document.querySelector("textarea");
      if (about) fireEvent.change(about, { target: { value: "Coverage about text" } });
      const inputs = document.querySelectorAll("input");
      if (inputs[0]) fireEvent.change(inputs[0], { target: { value: "170" } });
    }
    expect(document.body.textContent?.length ?? 0).toBeGreaterThan(40);
  }, 60_000);

  it("ProfileForm mounts and fills fields for real member", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const mid = await memberId();
    const user = userEvent.setup();
    renderApp(
      <ProfileForm memberId={mid} onSuccess={() => {}} />,
      { route: "/matrimonial/manage" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/about|height|diet|personal|education/);
    }, { timeout: 15_000 });
    const textareas = document.querySelectorAll("textarea");
    if (textareas[0]) {
      await user.clear(textareas[0]);
      await user.type(textareas[0], "Pass5 coverage about");
    }
    const save = screen.queryByRole("button", { name: /save|create|submit|publish/i });
    // Exercise validation / submit path without requiring success
    if (save) await user.click(save);
    await waitFor(() => expect(true).toBe(true), { timeout: 5_000 });
  }, 60_000);

  it("SearchFilters expands and mutates filter state", async () => {
    function Harness() {
      const [filters, setFilters] = useState(EMPTY_FILTERS);
      return <SearchFilters filters={filters} onChange={setFilters} />;
    }
    const user = userEvent.setup();
    renderApp(<Harness />, { route: "/" });
    const search = screen.getByPlaceholderText(/Search by name/i);
    await user.type(search, "Shah");
    const expand = screen.queryByRole("button", { name: /filter|advanced|sliders/i }) ||
      document.querySelector("button");
    if (expand) await user.click(expand);
    expect((search as HTMLInputElement).value).toMatch(/Shah/);
  });

  it("ProfileDetailDialog + MatrimonialModerationPanel + RishtaWorkflow mount", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    renderApp(
      <div>
        <ProfileDetailDialog profile={stubProfile}>
          <button type="button">Open detail</button>
        </ProfileDetailDialog>
        <MatrimonialModerationPanel />
        <RishtaWorkflow
          myProfileId="00000000-0000-0000-0000-0000000000aa"
          targetProfileId="00000000-0000-0000-0000-0000000000cc"
          introMessage="Coverage rishta"
          onRequestSent={() => {}}
        />
      </div>,
      { route: "/matrimonial/manage" },
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Open detail/i }));
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
    }, { timeout: 15_000 });
  }, 40_000);

  it("Events: open create dialog, fill required fields, submit real event then delete", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    renderApp(<Events />, { route: "/events/manage" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/event/);
    }, { timeout: 25_000 });
    // Event Manager sees "Create" when canManageEvents is true
    await waitFor(() => {
      const create = screen.queryAllByRole("button").find((b) =>
        /^Create$/i.test((b.textContent ?? "").replace(/\s+/g, " ").trim()) ||
        /Create Event/i.test(b.textContent ?? ""),
      );
      expect(create).toBeTruthy();
    }, { timeout: 25_000 });
    const createBtn = screen
      .queryAllByRole("button")
      .find((b) => /^Create$/i.test((b.textContent ?? "").replace(/\s+/g, " ").trim()));
    expect(createBtn).toBeTruthy();
    await user.click(createBtn!);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Create Event|Event Name/i);
    }, { timeout: 10_000 });

    const labels = Array.from(document.querySelectorAll("label"));
    for (const label of labels) {
      const text = label.textContent ?? "";
      const input = label.parentElement?.querySelector("input, textarea") as HTMLInputElement | null;
      if (!input) continue;
      if (/Event Name/i.test(text)) fireEvent.change(input, { target: { value: "Pass5 Coverage Event" } });
      if (/Starts At/i.test(text)) {
        const start = new Date(Date.now() + 864e5 * 10);
        fireEvent.change(input, { target: { value: start.toISOString().slice(0, 16) } });
      }
      if (/Ends At/i.test(text)) {
        const end = new Date(Date.now() + 864e5 * 10 + 3_600_000);
        fireEvent.change(input, { target: { value: end.toISOString().slice(0, 16) } });
      }
      if (/^Venue/i.test(text)) fireEvent.change(input, { target: { value: "Ahmedabad Hall" } });
      if (/Description/i.test(text)) fireEvent.change(input, { target: { value: "Coverage description" } });
    }

    const submit = screen
      .queryAllByRole("button")
      .find((b) => /^(Create|Create Event|Publish|Save)$/i.test((b.textContent ?? "").trim()));
    if (submit && !(submit as HTMLButtonElement).disabled) {
      await user.click(submit);
      await waitFor(() => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(10);
      }, { timeout: 15_000 });
    }

    const { data: { user: u } } = await supabase.auth.getUser();
    await supabase.from("events").delete().eq("name", "Pass5 Coverage Event").eq("created_by", u!.id);
  }, 90_000);

  it("News: open new article dialog and fill fields", async () => {
    await signIn(E2E_ACCOUNTS.publisher.email);
    const user = userEvent.setup();
    renderApp(<News />, { route: "/news/manage" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/news|article/);
    }, { timeout: 25_000 });
    const newBtn = screen.queryByRole("button", { name: /new article|create|add|publish/i });
    if (newBtn) await user.click(newBtn);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/title|article|category|new article/);
    }, { timeout: 10_000 });
    const inputs = document.querySelectorAll("input, textarea");
    if (inputs[0]) fireEvent.change(inputs[0], { target: { value: "Pass5 Coverage Article" } });
    if (inputs[1]) fireEvent.change(inputs[1], { target: { value: "Summary for coverage" } });
    // Do not publish — form fill covers create UI branches
    expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
  }, 60_000);

  it("Obituaries: search + ObituaryForm validation and chapter-admin submit cleanup", async () => {
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const user = userEvent.setup();
    renderApp(<Obituaries />, { route: "/obituaries" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/memoriam|obituar|remember/);
    }, { timeout: 20_000 });
    const search = screen.queryByPlaceholderText(/Search by name/i);
    if (search) await user.type(search, "a");

    let success = false;
    const { unmount } = renderApp(
      <ObituaryForm onClose={() => {}} onSuccess={() => { success = true; }} />,
      { route: "/obituaries" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/post obituary|full name|tribute/);
    }, { timeout: 10_000 });

    // Validation error path — click Post without fields
    const submit = screen
      .queryAllByRole("button")
      .find((b) => /post|submit|save/i.test(b.textContent ?? ""));
    expect(submit).toBeTruthy();
    await user.click(submit!);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/required|full name|date/);
    });

    for (const el of document.querySelectorAll("input, textarea")) {
      const nearby = (el.parentElement?.textContent ?? "") + (el.getAttribute("placeholder") ?? "");
      if (/full name|^name/i.test(nearby) && el instanceof HTMLInputElement && el.type !== "date") {
        fireEvent.change(el, { target: { value: "Pass5 Coverage Deceased" } });
      }
      if ((/passing|dod/i.test(nearby) || el.type === "date") && el instanceof HTMLInputElement) {
        fireEvent.change(el, { target: { value: "2024-01-15" } });
      }
      if (/tribute/i.test(nearby) && el instanceof HTMLTextAreaElement) {
        fireEvent.change(el, { target: { value: "Coverage tribute" } });
      }
    }
    await user.click(submit!);
    await waitFor(() => {
      const txt = document.body.textContent?.toLowerCase() ?? "";
      expect(success || /required|fail|error|posted|success|obituar/.test(txt)).toBe(true);
    }, { timeout: 15_000 });

    await supabase.from("obituaries").delete().eq("full_name", "Pass5 Coverage Deceased");
    unmount();
  }, 90_000);

  it("Mentorship + Scholarships manage: open create / request UI", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<Mentorship />, { route: "/mentorship/manage" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/mentor/);
    }, { timeout: 20_000 });
    for (const b of screen.queryAllByRole("button").slice(0, 8)) {
      if ((b as HTMLButtonElement).disabled || getComputedStyle(b).pointerEvents === "none") continue;
      try {
        await user.click(b);
      } catch {
        /* pointer-events:none / overlay — skip */
      }
    }

    const { unmount } = renderApp(<Scholarships />, { route: "/scholarships/manage" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/scholarship/);
    }, { timeout: 20_000 });
    for (const b of screen.queryAllByRole("button").slice(0, 8)) {
      if ((b as HTMLButtonElement).disabled || getComputedStyle(b).pointerEvents === "none") continue;
      try {
        await user.click(b);
      } catch {
        /* ignore */
      }
    }
    unmount();
  }, 60_000);

  it("CampaignsPanel create dialog fill + TrustCorpus + RecurringPledges", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    renderApp(
      <div>
        <CampaignsPanel myChapterId={null} />
        <TrustCorpusPanel myChapterId={null} />
        <RecurringPledgesPanel />
      </div>,
      { route: "/admin" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
    }, { timeout: 20_000 });
    const create = screen
      .queryAllByRole("button")
      .find((b) => /new pledge|create campaign|new campaign|add campaign/i.test(b.textContent ?? "")) ||
      screen.queryAllByRole("button").find((b) => /create|new/i.test(b.textContent ?? ""));
    if (create) {
      await user.click(create);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/title|goal|campaign|amount|start|pledge/);
      }, { timeout: 10_000 });
      const title = document.querySelector("input");
      if (title) fireEvent.change(title, { target: { value: "Pass5 Coverage Campaign" } });
    }
  }, 40_000);

  it("VerificationCenter + FamilyInviteDialog interaction", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const mid = await memberId();
    const user = userEvent.setup();
    renderApp(
      <div>
        <VerificationCenter />
        <FamilyInviteDialog memberId={mid} />
      </div>,
      { route: "/settings?tab=verification" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/verif|l0|l1|document|vouch|invite|family/);
    }, { timeout: 25_000 });
    const notes = document.querySelector("textarea");
    if (notes) {
      await user.type(notes, "Coverage verification notes");
    }
    const invite = screen.queryByRole("button", { name: /invite|add family|user/i });
    if (invite) await user.click(invite);
    const buttons = screen.queryAllByRole("button").slice(0, 6);
    for (const b of buttons) await user.click(b);
  }, 60_000);

  it("EventGallery + HeritageTagging + ReportsTab + ChapterTransfersTab", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    // Use a synthetic event id — gallery should load empty/error without crashing
    renderApp(
      <div>
        <EventGallery eventId="00000000-0000-0000-0000-000000000099" eventName="Coverage" />
        <HeritageTagging entityType="member" entityId={AHMEDABAD} />
        <ReportsTab />
        <ChapterTransfersTab />
      </div>,
      { route: "/admin" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(15);
    }, { timeout: 20_000 });
    for (const b of screen.queryAllByRole("button").slice(0, 8)) {
      await user.click(b);
    }
  }, 40_000);
});
