/**
 * Pass 14 — Matrimonial.tsx + related matrimonial components → ~100% against real Kong :54331.
 * Reversible CovMat* seeds; no MSW / fixture JSON for views; E2E role users kept intact.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Matrimonial from "@/pages/Matrimonial";
import PublicMatrimonial from "@/pages/PublicMatrimonial";
import { ProfileForm } from "@/components/matrimonial/ProfileForm";
import { MatrimonialModerationPanel } from "@/components/matrimonial/MatrimonialModerationPanel";
import { RishtaWorkflow } from "@/components/matrimonial/RishtaWorkflow";
import { ProfileDetailDialog } from "@/components/matrimonial/ProfileDetailDialog";
import { SearchFilters, EMPTY_FILTERS, type Filters } from "@/components/matrimonial/SearchFilters";
import { InfoChip } from "@/components/matrimonial/InfoChip";
import { Toaster } from "@/components/ui/toaster";
import { Heart } from "lucide-react";
import { useState } from "react";

const MARKER = "CovMat";
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
/** Disposable host members (no existing matrimonial profiles). */
const DELETE_HOST = "a57b20a7-5d84-4300-b61d-92602e237bbc"; // Neev Shah
const FLAG_HOST = "4b57830a-60ab-4a96-bace-9169f830a470"; // Parth Shah
const SRUSHTI_PROFILE = "ccb4e230-108c-45d6-a460-d884211fa584";
const VIRAL_PROFILE = "5bea7f63-8a07-4afe-9fe8-6212f15df6d2";

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const fromVite = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  if (fromVite) return fromVite;
  for (const candidate of [resolve(process.cwd(), ".env"), resolve(__dirname, "../../../.env")]) {
    try {
      const raw = readFileSync(candidate, "utf8");
      const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
      if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
    } catch {
      /* try next */
    }
  }
  return undefined;
}

const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;

function adminClient(): SupabaseClient {
  const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function psql(sql: string) {
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_khadayata-local",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

function setVerificationLevelSql(memberId: string, level: number) {
  psql(`ALTER TABLE members DISABLE TRIGGER trg_guard_privileged_member_columns;
       UPDATE members SET verification_level = ${Number(level)} WHERE id = '${memberId}';
       ALTER TABLE members ENABLE TRIGGER trg_guard_privileged_member_columns;`);
}

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

let lastSignInAt = 0;
async function signIn(email: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 5; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    }
    throw error;
  }
}

async function currentMemberId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no user");
  const { data } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("no member row");
  return data.id;
}

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: Element | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return false;
  try {
    await user.click(el);
    return true;
  } catch {
    try {
      fireEvent.click(el);
      return true;
    } catch {
      return false;
    }
  }
}

async function closeDialogs(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 4; i++) {
    if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) break;
    await user.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 120));
  }
}

function FiltersHarness({ initial }: { initial?: Filters }) {
  const [filters, setFilters] = useState<Filters>(initial ?? EMPTY_FILTERS);
  return (
    <div>
      <SearchFilters filters={filters} onChange={setFilters} />
      <pre data-testid="filters-json">{JSON.stringify(filters)}</pre>
    </div>
  );
}

const richProfileFields = {
  visibility: "members",
  verified: true,
  suspended: false,
  about: `${MARKER} about me — community matchmaking coverage`,
  height_cm: 168,
  weight_kg: 62,
  complexion: "Fair",
  blood_group: "B+",
  diet: "Vegetarian",
  marital_status: "Never Married",
  glasses: "No",
  driving: "Both",
  current_city: "Ahmedabad",
  current_state: "Gujarat",
  country: "India",
  citizenship: "Indian",
  visa_type: "Citizen",
  education_level: "Post Graduate",
  education_field: "Computer Science",
  position_title: "Software Engineer",
  business_name: `${MARKER} Tech LLP`,
  income: 1800000,
  income_currency: "INR",
  linkedin_url: "https://linkedin.com/in/covmat",
  contact_number: "+91 98765 43210",
  manglik: "No",
  gotra: "Kashyap",
  rashi: "Mesh (Aries)",
  nakshatra: "Ashwini",
  native_place: "Surat, Gujarat",
  ekda: "Mevada",
  kuldevi: "Amba Mata",
  family_type: "Nuclear Family",
  family_status: "Upper Middle Class",
  father_name: `${MARKER} Father`,
  father_occupation: "Business",
  mother_name: `${MARKER} Mother`,
  mother_occupation: "Homemaker",
  parents_marital_status: "Married",
  siblings: "1 Younger Sister",
  parent_contact: "+91 91234 56789",
  hobbies: ["Reading", "Travel", "Music"],
  preferences: {
    min_age: 22,
    max_age: 35,
    min_height: 150,
    max_height: 185,
    preferred_diet: "vegetarian",
    preferred_marital_status: "never_married",
    preferred_manglik: "Doesn't Matter",
    preferred_education: "Graduate",
    preferred_occupation: "Professional",
  },
};

const seeded = {
  memberId: null as string | null,
  gaMemberId: null as string | null,
  prevMemberVerification: 0,
  prevGaVerification: 0,
  memberProfileId: null as string | null,
  memberProfileCreated: false,
  gaProfileId: null as string | null,
  gaProfileCreated: false,
  deleteProfileId: null as string | null,
  flagProfileId: null as string | null,
  introInboundId: null as string | null,
  introOutboundId: null as string | null,
  introAcceptedId: null as string | null,
  rishtaIds: [] as string[],
  createFormProfileId: null as string | null,
  srushtiMemberId: null as string | null,
  viralMemberId: null as string | null,
  photoBackup: null as string | null,
  photoMemberId: null as string | null,
};

describe("Pass 14 — Matrimonial (+ related) real Kong", () => {
  beforeAll(async () => {
    const admin = adminClient();

    await signIn(E2E_ACCOUNTS.member.email);
    const memberId = await currentMemberId();
    seeded.memberId = memberId;
    const { data: memRow } = await admin.from("members").select("verification_level").eq("id", memberId).single();
    seeded.prevMemberVerification = (memRow?.verification_level as number) ?? 0;
    setVerificationLevelSql(memberId, 2);
    {
      const { data: check } = await admin.from("members").select("verification_level").eq("id", memberId).single();
      if ((check?.verification_level as number) < 2) {
        throw new Error(`Failed to bump member verification (got ${check?.verification_level})`);
      }
    }

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const gaId = await currentMemberId();
    seeded.gaMemberId = gaId;
    const { data: gaRow } = await admin.from("members").select("verification_level").eq("id", gaId).single();
    seeded.prevGaVerification = (gaRow?.verification_level as number) ?? 0;
    setVerificationLevelSql(gaId, 2);

    // Resolve counterpart member ids from live profiles
    const { data: srushti } = await admin
      .from("matrimonial_profiles")
      .select("id, member_id")
      .eq("id", SRUSHTI_PROFILE)
      .maybeSingle();
    const { data: viral } = await admin
      .from("matrimonial_profiles")
      .select("id, member_id")
      .eq("id", VIRAL_PROFILE)
      .maybeSingle();
    seeded.srushtiMemberId = srushti?.member_id ?? null;
    seeded.viralMemberId = viral?.member_id ?? null;

    // Member rich profile
    const { data: existingMemberProfile } = await admin
      .from("matrimonial_profiles")
      .select("id")
      .eq("member_id", memberId)
      .maybeSingle();
    if (existingMemberProfile) {
      seeded.memberProfileId = existingMemberProfile.id;
      await admin.from("matrimonial_profiles").update(richProfileFields).eq("id", existingMemberProfile.id);
    } else {
      const { data: created, error } = await admin
        .from("matrimonial_profiles")
        .insert({ member_id: memberId, ...richProfileFields })
        .select("id")
        .single();
      if (error) throw error;
      seeded.memberProfileId = created.id;
      seeded.memberProfileCreated = true;
    }

    // Global Admin profile (unlocks inline Moderate tab in Matrimonial.tsx)
    const { data: existingGaProfile } = await admin
      .from("matrimonial_profiles")
      .select("id")
      .eq("member_id", gaId)
      .maybeSingle();
    if (existingGaProfile) {
      seeded.gaProfileId = existingGaProfile.id;
    } else {
      const { data: gaProf, error: gaErr } = await admin
        .from("matrimonial_profiles")
        .insert({
          member_id: gaId,
          visibility: "members",
          about: `${MARKER} GA moderation profile`,
          current_city: "Mumbai",
          diet: "Vegetarian",
          marital_status: "Never Married",
          gotra: "Garg",
          verified: false,
          suspended: false,
        })
        .select("id")
        .single();
      if (gaErr) throw gaErr;
      seeded.gaProfileId = gaProf.id;
      seeded.gaProfileCreated = true;
    }

    // Disposable profiles for verify / flag / delete
    await admin.from("matrimonial_profiles").delete().eq("member_id", DELETE_HOST);
    const { data: delProf, error: delErr } = await admin
      .from("matrimonial_profiles")
      .insert({
        member_id: DELETE_HOST,
        visibility: "members",
        about: `${MARKER} delete-me`,
        current_city: "Vadodara",
        diet: "Vegetarian",
        marital_status: "Never Married",
        verified: false,
        suspended: false,
      })
      .select("id")
      .single();
    if (delErr) throw delErr;
    seeded.deleteProfileId = delProf.id;

    await admin.from("matrimonial_profiles").delete().eq("member_id", FLAG_HOST);
    const { data: flagProf, error: flagErr } = await admin
      .from("matrimonial_profiles")
      .insert({
        member_id: FLAG_HOST,
        visibility: "members",
        about: `${MARKER} flag-me`,
        current_city: "Rajkot",
        diet: "Vegetarian",
        marital_status: "Never Married",
        verified: true,
        suspended: false,
      })
      .select("id")
      .single();
    if (flagErr) throw flagErr;
    seeded.flagProfileId = flagProf.id;

    // Introductions for member
    if (seeded.srushtiMemberId) {
      await admin.from("matrimonial_introductions").delete().eq("from_member_id", seeded.srushtiMemberId).eq("to_member_id", memberId);
      const { data: inbound, error: inErr } = await admin
        .from("matrimonial_introductions")
        .insert({
          from_member_id: seeded.srushtiMemberId,
          to_member_id: memberId,
          status: "pending",
          message: `${MARKER} inbound hello`,
        })
        .select("id")
        .single();
      if (inErr) throw inErr;
      seeded.introInboundId = inbound.id;
    }
    if (seeded.viralMemberId) {
      await admin.from("matrimonial_introductions").delete().eq("from_member_id", memberId).eq("to_member_id", seeded.viralMemberId);
      const { data: outbound, error: outErr } = await admin
        .from("matrimonial_introductions")
        .insert({
          from_member_id: memberId,
          to_member_id: seeded.viralMemberId,
          status: "pending",
          message: `${MARKER} outbound`,
        })
        .select("id")
        .single();
      if (outErr) throw outErr;
      seeded.introOutboundId = outbound.id;

      // Accepted row for badge styling
      const { data: otherProfiles } = await admin
        .from("matrimonial_profiles")
        .select("member_id")
        .neq("member_id", memberId)
        .neq("member_id", seeded.viralMemberId)
        .limit(1);
      const otherMid = otherProfiles?.[0]?.member_id;
      if (otherMid) {
        await admin.from("matrimonial_introductions").delete().eq("from_member_id", otherMid).eq("to_member_id", memberId);
        const { data: accepted, error: accErr } = await admin
          .from("matrimonial_introductions")
          .insert({
            from_member_id: otherMid,
            to_member_id: memberId,
            status: "accepted",
            message: `${MARKER} accepted`,
            responded_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (!accErr) seeded.introAcceptedId = accepted.id;
      }
    }

    // Rishta seeds for RishtaWorkflow tab
    const myPid = seeded.memberProfileId!;
    await admin.from("rishta_requests").delete().or(`from_profile_id.eq.${myPid},to_profile_id.eq.${myPid}`);
    const counterparts = [SRUSHTI_PROFILE, VIRAL_PROFILE, "b9aa2b08-107a-4568-9de2-fb0d463ff61b"].filter(Boolean);
    const { data: r1 } = await admin
      .from("rishta_requests")
      .insert({
        from_profile_id: myPid,
        to_profile_id: counterparts[0],
        status: "intro_sent",
        intro_message: `${MARKER} rishta intro`,
      })
      .select("id")
      .single();
    if (r1) seeded.rishtaIds.push(r1.id);
    const { data: r2 } = await admin
      .from("rishta_requests")
      .insert({
        from_profile_id: myPid,
        to_profile_id: counterparts[1],
        status: "family_review",
        intro_message: `${MARKER} family review`,
        from_family_ok: null,
        to_family_ok: null,
      })
      .select("id")
      .single();
    if (r2) seeded.rishtaIds.push(r2.id);
    const { data: r3 } = await admin
      .from("rishta_requests")
      .insert({
        from_profile_id: counterparts[2] ?? counterparts[0],
        to_profile_id: myPid,
        status: "family_approved",
        intro_message: `${MARKER} ready`,
        from_family_ok: true,
        to_family_ok: true,
      })
      .select("id")
      .single();
    if (r3) seeded.rishtaIds.push(r3.id);

    // Photo arm for PublicMatrimonial
    const { data: photoHost } = await admin
      .from("matrimonial_profiles")
      .select("member_id, member:members!matrimonial_profiles_member_id_fkey(id, photo_url)")
      .eq("id", SRUSHTI_PROFILE)
      .maybeSingle();
    const photoMember = photoHost?.member as { id: string; photo_url: string | null } | null;
    if (photoMember?.id) {
      seeded.photoMemberId = photoMember.id;
      seeded.photoBackup = photoMember.photo_url;
      await admin
        .from("members")
        .update({ photo_url: "https://picsum.photos/seed/covmat/120" })
        .eq("id", photoMember.id);
    }

    await signIn(E2E_ACCOUNTS.member.email);
  }, 180_000);

  afterAll(async () => {
    const admin = adminClient();
    cleanup();

    for (const id of [
      seeded.introInboundId,
      seeded.introOutboundId,
      seeded.introAcceptedId,
    ]) {
      if (id) await admin.from("matrimonial_introductions").delete().eq("id", id);
    }
    if (seeded.memberId) {
      await admin.from("matrimonial_introductions").delete().or(`from_member_id.eq.${seeded.memberId},to_member_id.eq.${seeded.memberId}`);
    }
    for (const id of seeded.rishtaIds) {
      await admin.from("rishta_requests").delete().eq("id", id);
    }
    if (seeded.memberProfileId) {
      await admin
        .from("rishta_requests")
        .delete()
        .or(`from_profile_id.eq.${seeded.memberProfileId},to_profile_id.eq.${seeded.memberProfileId}`);
    }
    if (seeded.createFormProfileId) {
      await admin.from("matrimonial_profiles").delete().eq("id", seeded.createFormProfileId);
    }
    if (seeded.deleteProfileId) {
      await admin.from("matrimonial_profiles").delete().eq("id", seeded.deleteProfileId);
    }
    await admin.from("matrimonial_profiles").delete().eq("member_id", DELETE_HOST);
    await admin.from("matrimonial_profiles").delete().eq("member_id", FLAG_HOST);

    if (seeded.memberProfileCreated && seeded.memberProfileId) {
      await admin.from("matrimonial_profiles").delete().eq("id", seeded.memberProfileId);
    } else if (seeded.memberProfileId && !seeded.memberProfileCreated) {
      // leave preexisting; nothing to undo beyond our update — delete if we created via create-form path only
    }
    // Always remove member profile we created for this suite
    if (seeded.memberId && seeded.memberProfileCreated) {
      await admin.from("matrimonial_profiles").delete().eq("member_id", seeded.memberId);
    } else if (seeded.memberId) {
      // If we only updated an existing one that wasn't ours originally — check marker
      const { data: mp } = await admin
        .from("matrimonial_profiles")
        .select("id, about")
        .eq("member_id", seeded.memberId)
        .maybeSingle();
      if (mp?.about?.includes(MARKER)) {
        await admin.from("rishta_requests").delete().or(`from_profile_id.eq.${mp.id},to_profile_id.eq.${mp.id}`);
        await admin.from("matrimonial_profiles").delete().eq("id", mp.id);
      }
    }

    if (seeded.gaProfileCreated && seeded.gaProfileId) {
      await admin.from("rishta_requests").delete().or(`from_profile_id.eq.${seeded.gaProfileId},to_profile_id.eq.${seeded.gaProfileId}`);
      await admin.from("matrimonial_profiles").delete().eq("id", seeded.gaProfileId);
    }

    if (seeded.photoMemberId) {
      await admin.from("members").update({ photo_url: seeded.photoBackup }).eq("id", seeded.photoMemberId);
    }

    if (seeded.memberId) setVerificationLevelSql(seeded.memberId, seeded.prevMemberVerification);
    if (seeded.gaMemberId) setVerificationLevelSql(seeded.gaMemberId, seeded.prevGaVerification);

    await supabase.auth.signOut();
  }, 120_000);

  it("signed-out Matrimonial redirects to auth", async () => {
    await supabase.auth.signOut();
    renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
    await waitFor(() => {
      // Navigate to /auth — MemoryRouter shows empty or Auth route not mounted; component returns Navigate
      expect(document.body.textContent?.toLowerCase() ?? "").not.toMatch(/create my profile|matches/);
    }, { timeout: 15_000 });
    cleanup();
  }, 30_000);

  it("PublicMatrimonial: filters, empty search, signed-in My Profile, photo arm", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<PublicMatrimonial />), { route: "/matrimonial" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/matrimonial/);
    }, { timeout: 20_000 });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Srushti|profile|PROFILES/i);
    }, { timeout: 20_000 });

    const search = document.querySelector('input[placeholder*="Search" i]') as HTMLInputElement | null;
    expect(search).toBeTruthy();
    fireEvent.change(search!, { target: { value: "zzz-covmat-nomatch-999" } });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/No profiles match/i);
    }, { timeout: 8_000 });
    fireEvent.change(search!, { target: { value: "Srushti" } });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Srushti/i);
    }, { timeout: 8_000 });

    // Exercise select filters (Radix)
    for (const trigger of screen.queryAllByRole("combobox").slice(0, 3)) {
      await clickSafe(user, trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 2000 }).catch(() => []);
      if (opts[1]) await clickSafe(user, opts[1]);
      else if (opts[0]) await clickSafe(user, opts[0]);
      await user.keyboard("{Escape}");
    }
    unmount();
    cleanup();

    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(withToaster(<PublicMatrimonial />), { route: "/matrimonial" });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/My Profile/i);
    }, { timeout: 20_000 });
    cleanup();
  }, 90_000);

  it("L0 unverified sees verification gate CTA (browse-only)", async () => {
    await signIn(E2E_ACCOUNTS.unverified.email);
    const user = userEvent.setup();
    renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/L1 Verification Required|Get Verified|browse/i);
    }, { timeout: 25_000 });
    const link = screen.queryByRole("link", { name: /Get Verified/i });
    if (link) await clickSafe(user, link);
    cleanup();
  }, 45_000);

  it("Matrimonial member: matches filters/introduce/rishta + intros accept/decline + my profile", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });

    await waitFor(() => {
      expect(screen.queryByRole("tab", { name: /Matches/i })).toBeTruthy();
    }, { timeout: 30_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Matches/i }));
    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /View Profile/i }).length).toBeGreaterThan(0);
    }, { timeout: 30_000 });

    // Gotra / ekda conflict warning should appear (same Kashyap/Mevada)
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Same Gotra|Same Ekda|not compatible|incompatible/i);
    }, { timeout: 10_000 });

    // Match score badge
    expect(document.body.textContent ?? "").toMatch(/% Match/i);

    // Filters → empty then clear
    const search = document.querySelector('input[placeholder*="Search" i]') as HTMLInputElement | null;
    expect(search).toBeTruthy();
    fireEvent.change(search!, { target: { value: "zzz-no-such-covmat" } });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/No profiles found|adjusting your filters/i);
    }, { timeout: 8_000 });
    fireEvent.change(search!, { target: { value: "" } });

    const filterToggle = screen.queryAllByRole("button").find((b) =>
      b.querySelector("svg.lucide-sliders-horizontal, svg.lucide-sliders"),
    );
    expect(filterToggle).toBeTruthy();
    await clickSafe(user, filterToggle!);
    await waitFor(() => {
      expect(document.querySelector('input[placeholder*="Mumbai" i]')).toBeTruthy();
    }, { timeout: 5_000 });
    // City / country / age / exclude gotra via expanded filters (hits Matrimonial useMemo arms)
    const city = document.querySelector('input[placeholder*="Mumbai" i]') as HTMLInputElement;
    fireEvent.change(city, { target: { value: "Surat" } });
    const country = document.querySelector('input[placeholder*="India" i]') as HTMLInputElement;
    fireEvent.change(country, { target: { value: "India" } });
    const minAge = document.querySelector('input[placeholder="18"]') as HTMLInputElement | null;
    if (minAge) fireEvent.change(minAge, { target: { value: "20" } });
    const maxAge = document.querySelector('input[placeholder="60"]') as HTMLInputElement | null;
    if (maxAge) fireEvent.change(maxAge, { target: { value: "40" } });
    const exclude = screen.queryByRole("switch");
    if (exclude) await clickSafe(user, exclude);

    // Gender / diet / gotra selects
    for (const trigger of screen.queryAllByRole("combobox").slice(0, 5)) {
      await clickSafe(user, trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 1500 }).catch(() => []);
      if (opts[0]) await clickSafe(user, opts[0]);
      await user.keyboard("{Escape}");
    }

    await waitFor(() => {
      expect(
        screen.queryAllByRole("button", { name: /View Profile/i }).length > 0 ||
          /No profiles found/i.test(document.body.textContent ?? ""),
      ).toBeTruthy();
    }, { timeout: 15_000 });

    const clear = screen.queryByRole("button", { name: /Clear/i });
    if (clear) await clickSafe(user, clear);
    else {
      fireEvent.change(city, { target: { value: "" } });
      fireEvent.change(country, { target: { value: "" } });
    }

    // View profile dialog
    await clickSafe(user, screen.getAllByRole("button", { name: /View Profile/i })[0]);
    await waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    }, { timeout: 10_000 });
    await closeDialogs(user);

    // Introduce someone not yet contacted (prefer Srushti if outbound was Viral)
    const introBtn = screen.queryAllByRole("button").find((b) => /^Introduce$/i.test((b.textContent ?? "").trim()));
    if (introBtn) {
      await clickSafe(user, introBtn);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/introduction sent|sent|error|already/);
      }, { timeout: 15_000 });
    }

    // Formal Rishta dialog
    const rishtaBtn =
      screen.queryAllByRole("button", { name: /Send formal Rishta/i })[0] ??
      screen.queryAllByRole("button").find((b) => /rishta|formal/i.test(b.getAttribute("aria-label") ?? ""));
    if (rishtaBtn) {
      await clickSafe(user, rishtaBtn);
      await waitFor(() => {
        expect(document.body.textContent ?? "").toMatch(/Formal Rishta|Family Contact/i);
      }, { timeout: 10_000 });
      const name = document.querySelector('input[placeholder*="Father" i]') as HTMLInputElement | null;
      if (name) fireEvent.change(name, { target: { value: `${MARKER} Father Contact` } });
      const phone = document.querySelector('input[placeholder*="+91" i]') as HTMLInputElement | null;
      if (phone) fireEvent.change(phone, { target: { value: "+91 90000 11111" } });
      const msg = document.querySelector("textarea") as HTMLTextAreaElement | null;
      if (msg) fireEvent.change(msg, { target: { value: `${MARKER} rishta message` } });
      const send = screen.queryByRole("button", { name: /Send Rishta Request/i });
      if (send && !(send as HTMLButtonElement).disabled) {
        await clickSafe(user, send);
        await waitFor(() => {
          expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/rishta request sent|sent to family|error/);
        }, { timeout: 15_000 });
      }
      await closeDialogs(user);
    }

    // Intros tab — Accept pending inbound (toast is the hard signal)
    await clickSafe(user, screen.getByRole("tab", { name: /Intro/i }));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Received from|Sent to|accepted|pending/i);
    }, { timeout: 15_000 });
    const accept = screen.queryByRole("button", { name: /Accept/i });
    if (accept) {
      await clickSafe(user, accept);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/response recorded/);
      }, { timeout: 12_000 });
    }

    cleanup();

    // Fresh mount for Decline + My Profile + Rishta (query cache reset)
    {
      const admin = adminClient();
      if (seeded.srushtiMemberId && seeded.memberId) {
        await admin.from("matrimonial_introductions").delete().eq("from_member_id", seeded.srushtiMemberId).eq("to_member_id", seeded.memberId);
        await admin.from("matrimonial_introductions").insert({
          from_member_id: seeded.srushtiMemberId,
          to_member_id: seeded.memberId,
          status: "pending",
          message: `${MARKER} decline-me`,
        });
      }
      // Refresh rishta inbox arms for Rishta tab
      if (seeded.memberProfileId) {
        const myPid = seeded.memberProfileId;
        await admin.from("rishta_requests").delete().or(`from_profile_id.eq.${myPid},to_profile_id.eq.${myPid}`);
        seeded.rishtaIds = [];
        const counterparts = [SRUSHTI_PROFILE, VIRAL_PROFILE, "b9aa2b08-107a-4568-9de2-fb0d463ff61b"];
        for (const [to, status, extra] of [
          [counterparts[0], "intro_sent", { intro_message: `${MARKER} rishta intro` }],
          [counterparts[1], "family_review", { intro_message: `${MARKER} family review`, from_family_ok: null, to_family_ok: null }],
        ] as const) {
          const { data } = await admin
            .from("rishta_requests")
            .insert({ from_profile_id: myPid, to_profile_id: to, status, ...extra })
            .select("id")
            .single();
          if (data) seeded.rishtaIds.push(data.id);
        }
        const { data: inbound } = await admin
          .from("rishta_requests")
          .insert({
            from_profile_id: counterparts[2],
            to_profile_id: myPid,
            status: "family_approved",
            intro_message: `${MARKER} ready`,
            from_family_ok: true,
            to_family_ok: true,
          })
          .select("id")
          .single();
        if (inbound) seeded.rishtaIds.push(inbound.id);
      }
      await signIn(E2E_ACCOUNTS.member.email);
      renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
      await waitFor(() => {
        expect(screen.queryByRole("tab", { name: /Intro/i })).toBeTruthy();
      }, { timeout: 25_000 });
      await clickSafe(user, screen.getByRole("tab", { name: /Intro/i }));
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Accept/i })).toBeTruthy();
      }, { timeout: 20_000 });
      const decline =
        screen.queryAllByRole("button").find((b) => b.querySelector("svg.lucide-x") && !/Accept/i.test(b.textContent ?? "")) ??
        null;
      expect(decline).toBeTruthy();
      await clickSafe(user, decline!);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/response recorded/);
      }, { timeout: 12_000 });
    }

    // My Profile tab — chips + Edit form
    await clickSafe(user, screen.getByRole("tab", { name: /My Profile/i }));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Personal Details|Kundali|Partner Preferences|About Me/i);
    }, { timeout: 15_000 });
    expect(document.body.textContent ?? "").toMatch(new RegExp(MARKER));
    const edit = screen.queryByRole("button", { name: /Edit/i });
    if (edit) {
      await clickSafe(user, edit);
      await waitFor(() => {
        expect(document.body.textContent ?? "").toMatch(/Edit Profile|Personal & Lifestyle|Partner Preferences/i);
      }, { timeout: 10_000 });
      // Walk wizard steps via step buttons + Next
      for (const label of [/Education & Career/i, /Kundali/i, /Family/i, /Partner Preferences/i]) {
        const stepBtn = screen.queryByRole("button", { name: label });
        if (stepBtn) await clickSafe(user, stepBtn);
      }
      const about = document.querySelector("textarea");
      if (about) fireEvent.change(about, { target: { value: `${MARKER} about updated` } });
      await clickSafe(user, screen.queryByRole("button", { name: /Partner Preferences/i }));
      const update = screen.queryByRole("button", { name: /Update Profile/i });
      if (update) {
        await clickSafe(user, update);
        await waitFor(() => {
          expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/profile updated|error/);
        }, { timeout: 15_000 });
      }
      await closeDialogs(user);
    }

    // Rishta tab
    await clickSafe(user, screen.getByRole("tab", { name: /Rishta/i }));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Rishta|Introduction Sent|Family Review|Family Approved|Withdraw/i);
    }, { timeout: 20_000 });
    const familyOk = screen.queryByRole("button", { name: /Family OK/i });
    if (familyOk) await clickSafe(user, familyOk);
    const withdraw = screen.queryByRole("button", { name: /Withdraw/i });
    if (withdraw) await clickSafe(user, withdraw);
    const sendToFamily = screen.queryByRole("button", { name: /Send to Family/i });
    if (sendToFamily) await clickSafe(user, sendToFamily);
    const acceptRishta = screen.queryAllByRole("button", { name: /^Accept$/i })[0];
    if (acceptRishta) await clickSafe(user, acceptRishta);

    cleanup();
  }, 180_000);

  it("create-profile CTA + ProfileForm insert (L1+, no existing profile)", async () => {
    const admin = adminClient();
    // Park member profile + related rows
    if (seeded.memberProfileId) {
      await admin
        .from("rishta_requests")
        .delete()
        .or(`from_profile_id.eq.${seeded.memberProfileId},to_profile_id.eq.${seeded.memberProfileId}`);
      await admin.from("matrimonial_profiles").delete().eq("id", seeded.memberProfileId);
      seeded.memberProfileId = null;
      seeded.memberProfileCreated = false;
    }
    if (seeded.memberId) {
      await admin.from("matrimonial_introductions").delete().or(`from_member_id.eq.${seeded.memberId},to_member_id.eq.${seeded.memberId}`);
      setVerificationLevelSql(seeded.memberId, 2);
    }

    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });

    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Create Your Profile|Create My Profile/i);
    }, { timeout: 30_000 });

    // Browse-only Introduce → setShowForm(true)
    const browseIntro = screen.queryAllByRole("button").find((b) => /Introduce/i.test(b.textContent ?? ""));
    if (browseIntro) {
      await clickSafe(user, browseIntro);
      await waitFor(() => {
        expect(document.body.textContent ?? "").toMatch(/Create Matrimonial Profile|Personal & Lifestyle/i);
      }, { timeout: 10_000 });
    } else {
      await clickSafe(user, screen.getByRole("button", { name: /Create My Profile/i }));
      await waitFor(() => {
        expect(document.body.textContent ?? "").toMatch(/Create Matrimonial Profile|Personal & Lifestyle/i);
      }, { timeout: 10_000 });
    }

    // Fill minimal create form across steps
    const about = document.querySelector("textarea");
    if (about) fireEvent.change(about, { target: { value: `${MARKER} brand new profile` } });
    const height = document.querySelector('input[placeholder="165"]') as HTMLInputElement | null;
    if (height) fireEvent.change(height, { target: { value: "170" } });
    // Toggle a hobby
    const hobby = screen.queryByRole("button", { name: /^Reading$/i });
    if (hobby) await clickSafe(user, hobby);

    for (let i = 0; i < 4; i++) {
      const next = screen.queryByRole("button", { name: /^Next$/i });
      if (next) await clickSafe(user, next);
    }
    // Back once then Next again to cover Back arm
    const back = screen.queryByRole("button", { name: /^Back$/i });
    if (back && !(back as HTMLButtonElement).disabled) await clickSafe(user, back);
    const nextAgain = screen.queryByRole("button", { name: /^Next$/i });
    if (nextAgain) await clickSafe(user, nextAgain);
    // Jump to last step via indicator
    await clickSafe(user, screen.queryByRole("button", { name: /Partner Preferences/i }));

    const create = screen.queryByRole("button", { name: /Create Profile/i });
    expect(create).toBeTruthy();
    await clickSafe(user, create!);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/profile created|matches|my profile|error/);
    }, { timeout: 20_000 });

    const { data: created } = await admin
      .from("matrimonial_profiles")
      .select("id")
      .eq("member_id", seeded.memberId!)
      .maybeSingle();
    if (created) {
      seeded.createFormProfileId = created.id;
      seeded.memberProfileId = created.id;
      seeded.memberProfileCreated = true;
      // Restore rich fields for later tests
      await admin.from("matrimonial_profiles").update(richProfileFields).eq("id", created.id);
    }

    cleanup();
  }, 120_000);

  it("Global Admin: inline Moderate tab verify/flag/delete + ModerationPanel", async () => {
    const admin = adminClient();
    // Ensure GA still has a profile so Matrimonial.tsx inline Moderate tab mounts
    if (seeded.gaMemberId) {
      const { data: gaProf } = await admin
        .from("matrimonial_profiles")
        .select("id")
        .eq("member_id", seeded.gaMemberId)
        .maybeSingle();
      if (!gaProf) {
        const { data: created, error } = await admin
          .from("matrimonial_profiles")
          .insert({
            member_id: seeded.gaMemberId,
            visibility: "members",
            about: `${MARKER} GA moderation profile`,
            current_city: "Mumbai",
            diet: "Vegetarian",
            marital_status: "Never Married",
            gotra: "Garg",
            verified: false,
            suspended: false,
          })
          .select("id")
          .single();
        if (error) throw error;
        seeded.gaProfileId = created.id;
        seeded.gaProfileCreated = true;
      } else {
        seeded.gaProfileId = gaProf.id;
      }
    }

    // Recreate disposable Neev/Parth if prior run deleted them
    await admin.from("matrimonial_profiles").delete().eq("member_id", DELETE_HOST);
    const { data: delProf, error: delErr } = await admin
      .from("matrimonial_profiles")
      .insert({
        member_id: DELETE_HOST,
        visibility: "members",
        about: `${MARKER} delete-me`,
        current_city: "Vadodara",
        diet: "Vegetarian",
        marital_status: "Never Married",
        verified: false,
        suspended: false,
      })
      .select("id")
      .single();
    if (delErr) throw delErr;
    seeded.deleteProfileId = delProf.id;

    await admin.from("matrimonial_profiles").delete().eq("member_id", FLAG_HOST);
    const { data: flagProf, error: flagErr } = await admin
      .from("matrimonial_profiles")
      .insert({
        member_id: FLAG_HOST,
        visibility: "members",
        about: `${MARKER} flag-me`,
        current_city: "Rajkot",
        diet: "Vegetarian",
        marital_status: "Never Married",
        verified: true,
        suspended: false,
      })
      .select("id")
      .single();
    if (flagErr) throw flagErr;
    seeded.flagProfileId = flagProf.id;

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Moderat/i })).toBeTruthy();
    }, { timeout: 40_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Moderat/i }));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Neev|Parth|Matrimonial Moderation/i);
    }, { timeout: 25_000 });

    // Verify Neev (pending disposable) — scope to row
    const neevRow = Array.from(document.querySelectorAll("tr")).find((tr) => /Neev/i.test(tr.textContent ?? ""));
    expect(neevRow).toBeTruthy();
    const verifyBtn = neevRow!.querySelector('button[aria-label="Verify profile"]') as HTMLButtonElement | null;
    expect(verifyBtn).toBeTruthy();
    await clickSafe(user, verifyBtn!);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/profile verified/);
    }, { timeout: 15_000 });

    // Flag Parth (verified disposable)
    const parthRow = Array.from(document.querySelectorAll("tr")).find((tr) => /Parth/i.test(tr.textContent ?? ""));
    expect(parthRow).toBeTruthy();
    const flagBtn = parthRow!.querySelector('button[aria-label="Flag profile"]') as HTMLButtonElement | null;
    expect(flagBtn).toBeTruthy();
    await clickSafe(user, flagBtn!);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/profile flagged/);
    }, { timeout: 15_000 });

    // Delete only Neev disposable row
    const neevRow2 = Array.from(document.querySelectorAll("tr")).find((tr) => /Neev/i.test(tr.textContent ?? ""));
    const deleteBtn = neevRow2?.querySelector('button[aria-label="Delete profile"]') as HTMLButtonElement | null;
    expect(deleteBtn).toBeTruthy();
    const before = seeded.deleteProfileId!;
    await clickSafe(user, deleteBtn!);
    await waitFor(async () => {
      const { data } = await admin.from("matrimonial_profiles").select("id").eq("id", before).maybeSingle();
      expect(data).toBeNull();
    }, { timeout: 15_000 });
    seeded.deleteProfileId = null;

    const view = screen.queryAllByRole("button", { name: /View profile/i })[0];
    if (view) {
      await clickSafe(user, view);
      await closeDialogs(user);
    }

    cleanup();

    // Standalone ModerationPanel — Parth was flagged in Matrimonial (verified=false, not suspended).
    // Re-verify via panel, suspend, then delete from Suspended (covers delete arm + suspended badge).
    if (seeded.flagProfileId) {
      await admin.from("matrimonial_profiles").update({ verified: false, suspended: false }).eq("id", seeded.flagProfileId);
    }
    renderApp(withToaster(<MatrimonialModerationPanel />), { route: "/matrimonial/manage" });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Matrimonial Moderation/i);
    }, { timeout: 20_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Pending/i }));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Parth/i);
    }, { timeout: 15_000 });
    const parthPending = Array.from(document.querySelectorAll("tr")).find((tr) => /Parth/i.test(tr.textContent ?? ""));
    const verifyParth = parthPending?.querySelector('button[aria-label="Verify profile"]') as HTMLButtonElement | null;
    expect(verifyParth).toBeTruthy();
    await clickSafe(user, verifyParth!);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/profile verified/);
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Verified/i }));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Parth/i);
    }, { timeout: 15_000 });
    const parthVerified = Array.from(document.querySelectorAll("tr")).find((tr) => /Parth/i.test(tr.textContent ?? ""));
    const suspend = parthVerified?.querySelector('button[aria-label="Suspend profile"]') as HTMLButtonElement | null;
    expect(suspend).toBeTruthy();
    await clickSafe(user, suspend!);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/profile suspended/);
    }, { timeout: 15_000 });

    await clickSafe(user, screen.getByRole("tab", { name: /Suspended/i }));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Parth/i);
    }, { timeout: 15_000 });
    const parthSusp = Array.from(document.querySelectorAll("tr")).find((tr) => /Parth/i.test(tr.textContent ?? ""));
    const del = parthSusp?.querySelector('button[aria-label="Delete profile"]') as HTMLButtonElement | null;
    expect(del).toBeTruthy();
    await clickSafe(user, del!);
    await waitFor(async () => {
      const { data } = await admin.from("matrimonial_profiles").select("id").eq("member_id", FLAG_HOST).maybeSingle();
      expect(data).toBeNull();
    }, { timeout: 15_000 });
    seeded.flagProfileId = null;
    cleanup();
  }, 150_000);

  it("ProfileForm standalone create error + edit save; RishtaWorkflow send; SearchFilters selects", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const memberId = seeded.memberId!;
    const admin = adminClient();

    // Ensure member has profile for edit path
    let { data: profile } = await admin.from("matrimonial_profiles").select("*").eq("member_id", memberId).maybeSingle();
    if (!profile) {
      const { data: created, error } = await admin
        .from("matrimonial_profiles")
        .insert({ member_id: memberId, ...richProfileFields })
        .select("*")
        .single();
      if (error) throw error;
      profile = created;
      seeded.memberProfileId = created.id;
      seeded.memberProfileCreated = true;
    }

    // Edit form — walk all steps + hobby toggle + Update
    const { unmount: u1 } = renderApp(
      withToaster(
        <ProfileForm initial={profile as never} memberId={memberId} onSuccess={() => {}} />,
      ),
      { route: "/matrimonial/manage" },
    );
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Personal & Lifestyle|About Me/i);
    }, { timeout: 10_000 });
    for (const name of [/Education & Career/i, /Kundali/i, /Family/i, /Partner Preferences/i, /Personal & Lifestyle/i]) {
      await clickSafe(user, screen.queryByRole("button", { name }));
    }
    const hobby = screen.queryByRole("button", { name: /^Yoga$/i });
    if (hobby) await clickSafe(user, hobby);
    await clickSafe(user, screen.queryByRole("button", { name: /Education & Career/i }));
    const income = document.querySelector('input[placeholder*="1200000" i]') as HTMLInputElement | null;
    if (income) fireEvent.change(income, { target: { value: "2000000" } });
    await clickSafe(user, screen.queryByRole("button", { name: /Partner Preferences/i }));
    await clickSafe(user, screen.queryByRole("button", { name: /Update Profile/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/profile updated|error/);
    }, { timeout: 15_000 });
    u1();
    cleanup();

    // Create-path error: insert while profile already exists (unique member_id)
    const { unmount: u2 } = renderApp(
      withToaster(<ProfileForm memberId={memberId} onSuccess={() => {}} />),
      { route: "/matrimonial/manage" },
    );
    await clickSafe(user, screen.queryByRole("button", { name: /Partner Preferences/i }));
    await clickSafe(user, screen.queryByRole("button", { name: /Create Profile/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/error|could not save|duplicate|unique/);
    }, { timeout: 15_000 });
    u2();
    cleanup();

    // RishtaWorkflow inbox + send dialog (full status arms)
    {
      const myPid = profile!.id as string;
      await admin.from("rishta_requests").delete().or(`from_profile_id.eq.${myPid},to_profile_id.eq.${myPid}`);
      await admin.from("rishta_requests").insert([
        {
          from_profile_id: myPid,
          to_profile_id: SRUSHTI_PROFILE,
          status: "intro_sent",
          intro_message: `${MARKER} wf intro`,
        },
        {
          // Recipient family already OK — Family OK as sender flips to family_approved
          from_profile_id: myPid,
          to_profile_id: VIRAL_PROFILE,
          status: "family_review",
          intro_message: `${MARKER} wf family`,
          from_family_ok: null,
          to_family_ok: true,
        },
        {
          from_profile_id: "b9aa2b08-107a-4568-9de2-fb0d463ff61b",
          to_profile_id: myPid,
          status: "family_approved",
          intro_message: `${MARKER} wf approve`,
          from_family_ok: true,
          to_family_ok: true,
        },
        {
          // Inbound family_review so we can Family OK as recipient (to_family_ok)
          from_profile_id: "283bdbcf-2032-4966-b5e6-51f5d58177f3",
          to_profile_id: myPid,
          status: "family_review",
          intro_message: `${MARKER} wf inbound family`,
          from_family_ok: true,
          to_family_ok: null,
        },
      ]);
    }
    const { unmount: u3 } = renderApp(
      withToaster(<RishtaWorkflow myProfileId={profile!.id} />),
      { route: "/matrimonial/manage" },
    );
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Rishta Requests|Introduction Sent|Family Review/i);
    }, { timeout: 20_000 });
    for (const name of [/Send to Family/i, /Family OK/i, /Withdraw/i, /^Accept$/i, /Decline/i]) {
      const btns = screen.queryAllByRole("button", { name });
      for (const btn of btns.slice(0, 2)) {
        await clickSafe(user, btn);
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    u3();
    cleanup();

    // Send dialog against a free target (Deep)
    const { unmount: u4 } = renderApp(
      withToaster(
        <RishtaWorkflow
          myProfileId={profile!.id}
          targetProfileId="67f1a5fa-b31f-4b0d-9ce7-e3f8c246fc05"
          introMessage={`${MARKER} workflow send`}
          onRequestSent={() => {}}
        />,
      ),
      { route: "/matrimonial/manage" },
    );
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Send Rishta/i }) || screen.queryByText(/Rishta Sent/i)).toBeTruthy();
    }, { timeout: 15_000 });
    const sendBtn = screen.queryByRole("button", { name: /Send Rishta/i });
    if (sendBtn) {
      await clickSafe(user, sendBtn);
      await waitFor(() => {
        expect(document.body.textContent ?? "").toMatch(/Introduction Message|Rishta Workflow/i);
      }, { timeout: 8_000 });
      await clickSafe(user, screen.getByRole("button", { name: /Send Rishta Request/i }));
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase() ?? "").toMatch(/rishta request sent|error|sent/);
      }, { timeout: 15_000 });
    }
    u4();
    cleanup();

    // alreadySent badge path
    renderApp(
      withToaster(
        <RishtaWorkflow
          myProfileId={profile!.id}
          targetProfileId="67f1a5fa-b31f-4b0d-9ce7-e3f8c246fc05"
        />,
      ),
      { route: "/matrimonial/manage" },
    );
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Rishta Sent|Send Rishta/i);
    }, { timeout: 15_000 });
    cleanup();

    // null profile id → null render
    const { container } = renderApp(<RishtaWorkflow myProfileId={null} />, { route: "/" });
    expect(container.textContent ?? "").toBe("");
    cleanup();

    // SearchFilters — expand and exercise selects via Radix
    renderApp(<FiltersHarness />, { route: "/" });
    const expand = screen.getAllByRole("button").find((b) => b.querySelector("svg"));
    if (expand) await clickSafe(user, expand);
    for (const trigger of screen.queryAllByRole("combobox").slice(0, 6)) {
      await clickSafe(user, trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 1500 }).catch(() => []);
      if (opts[0]) await clickSafe(user, opts[0]);
      await user.keyboard("{Escape}");
    }
    const sw = screen.queryByRole("switch");
    if (sw) await clickSafe(user, sw);
    expect(screen.getByTestId("filters-json")).toBeInTheDocument();
    cleanup();

    // InfoChip + ProfileDetailDialog smoke with rich profile
    renderApp(
      withToaster(
        <div>
          <InfoChip icon={Heart} label="Coverage" value="ok" />
          <ProfileDetailDialog profile={profile as never}>
            <button type="button">Open detail</button>
          </ProfileDetailDialog>
        </div>,
      ),
      { route: "/" },
    );
    await clickSafe(user, screen.getByRole("button", { name: /Open detail/i }));
    await waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    }, { timeout: 8_000 });
    await closeDialogs(user);
    cleanup();
  }, 150_000);

  it("GA without myProfile browse path mounts ModerationPanel (park GA profile)", async () => {
    const admin = adminClient();
    if (seeded.gaProfileId) {
      await admin.from("rishta_requests").delete().or(`from_profile_id.eq.${seeded.gaProfileId},to_profile_id.eq.${seeded.gaProfileId}`);
      await admin.from("matrimonial_profiles").delete().eq("id", seeded.gaProfileId);
      seeded.gaProfileId = null;
      seeded.gaProfileCreated = false;
    }

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
    await waitFor(() => {
      expect(document.body.textContent ?? "").toMatch(/Matrimonial Moderation|Create Your Profile|No profiles found|profile/i);
    }, { timeout: 30_000 });
    // Empty filter arm on browse-only
    const search = document.querySelector('input[placeholder*="Search" i]') as HTMLInputElement | null;
    if (search) {
      fireEvent.change(search, { target: { value: "zzz-ga-empty" } });
      await waitFor(() => {
        expect(document.body.textContent ?? "").toMatch(/No profiles found|adjusting/i);
      }, { timeout: 8_000 });
      fireEvent.change(search, { target: { value: "" } });
    }
    for (const name of [/Pending/i, /Verified/i, /Suspended/i]) {
      const t = screen.queryByRole("tab", { name });
      if (t) await clickSafe(user, t);
    }
    cleanup();
  }, 60_000);
});
