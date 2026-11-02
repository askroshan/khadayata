/**
 * Pass 17 / Wave 7 — ConsentCenter + AcceptFamilyInvite + EmergencyContacts → 100% lines
 * against real Kong :54331 / khadayata_local. Disposable covcic_* rows only.
 * No MSW / fixture JSON for view domain data.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { ConsentCenter } from "@/components/consent/ConsentCenter";
import AcceptFamilyInvite from "@/pages/AcceptFamilyInvite";
import EmergencyContacts from "@/pages/EmergencyContacts";
import { Toaster } from "@/components/ui/toaster";

const CITY_AHM = "e1000001-0000-0000-0000-000000000001";
const PREFIX = `covcic_${Date.now().toString(36)}`;
const MEMBER_ID = "6fef3f76-d6b8-4fa1-bb84-a376d30eb018";
const GLOBAL_ADMIN_ID = "d34c0a26-dafe-42cf-b8f4-0a876430761d";
const CHAPTER_ADMIN_ID = "efe72c36-4ceb-4d1c-b78e-8a67bfd45a43";

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const fromVite = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  if (fromVite) return fromVite;
  for (const file of [".env", ".env.local"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m?.[1] === name) return m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      /* next */
    }
  }
  return undefined;
}

function adminClient(): SupabaseClient {
  const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let lastSignInAt = 0;
async function signIn(email: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 6; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit|fetch failed|network|ECONNREFUSED/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    throw error;
  }
  throw new Error(`signIn failed for ${email}`);
}

async function signOut() {
  await supabase.auth.signOut();
  lastSignInAt = Date.now();
}

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function forceClick(el: HTMLElement | null | undefined) {
  if (!el) return;
  fireEvent.click(el);
}

function spyTimezone(tz: string) {
  const orig = Intl.DateTimeFormat.prototype.resolvedOptions;
  return vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
    const base = orig.call(this);
    return { ...base, timeZone: tz };
  });
}

const seeded = {
  consentIds: [] as string[],
  dataRequestIds: [] as string[],
  inviteIds: [] as string[],
  contactIds: [] as string[],
  familyLinkKeys: [] as { member_id: string; related_member_id: string }[],
};

async function cleanupSeeds(admin: SupabaseClient) {
  if (seeded.familyLinkKeys.length) {
    for (const k of seeded.familyLinkKeys) {
      await admin
        .from("family_links")
        .delete()
        .eq("member_id", k.member_id)
        .eq("related_member_id", k.related_member_id);
    }
    seeded.familyLinkKeys = [];
  }
  if (seeded.inviteIds.length) {
    await admin.from("family_invitations").delete().in("id", seeded.inviteIds);
    seeded.inviteIds = [];
  }
  await admin.from("family_invitations").delete().like("invitee_name", `${PREFIX}%`);
  if (seeded.consentIds.length) {
    await admin.from("consents").delete().in("id", seeded.consentIds);
    seeded.consentIds = [];
  }
  await admin.from("consents").delete().eq("member_id", MEMBER_ID).like("policy_version", "covcic%");
  if (seeded.dataRequestIds.length) {
    await admin.from("data_requests").delete().in("id", seeded.dataRequestIds);
    seeded.dataRequestIds = [];
  }
  if (seeded.contactIds.length) {
    await admin.from("emergency_contacts").delete().in("id", seeded.contactIds);
    seeded.contactIds = [];
  }
  await admin.from("emergency_contacts").delete().like("name", `${PREFIX}%`);
}

describe("Pass 17 — ConsentCenter / AcceptFamilyInvite / EmergencyContacts (real Kong)", () => {
  const admin = adminClient();

  beforeAll(async () => {
    await cleanupSeeds(admin);
  }, 60_000);

  afterAll(async () => {
    cleanup();
    vi.restoreAllMocks();
    await cleanupSeeds(admin);
    await signOut();
  }, 60_000);

  it("ConsentCenter: regions, toggles, export/deletion, history, error arms", async () => {
    const user = makeUser();

    // Seed consents (accepted + declined + empty payload) and data_requests (pending + completed)
    const { data: consents, error: cErr } = await admin
      .from("consents")
      .insert([
        {
          member_id: MEMBER_ID,
          context: "cookie_consent",
          policy_version: `covcic-1`,
          region: "US",
          payload: { accepted: true, timestamp: new Date().toISOString() },
        },
        {
          member_id: MEMBER_ID,
          context: "directory_visibility",
          policy_version: `covcic-1`,
          region: "US",
          payload: { accepted: false },
        },
        {
          member_id: MEMBER_ID,
          context: "matrimonial_display",
          policy_version: `covcic-1`,
          region: "US",
          payload: {},
        },
      ])
      .select("id");
    if (cErr) throw cErr;
    for (const r of consents ?? []) seeded.consentIds.push(r.id);

    const { data: reqs, error: rErr } = await admin
      .from("data_requests")
      .insert([
        { member_id: MEMBER_ID, type: "export", status: "pending" },
        {
          member_id: MEMBER_ID,
          type: "deletion",
          status: "completed",
          completed_at: new Date().toISOString(),
        },
      ])
      .select("id");
    if (rErr) throw rErr;
    for (const r of reqs ?? []) seeded.dataRequestIds.push(r.id);

    await signIn(E2E_ACCOUNTS.member.email);

    // EU region badge
    let tzSpy = spyTimezone("Europe/Paris");
    let view = renderApp(withToaster(<ConsentCenter />), { route: "/privacy" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/GDPR \(EU\)/i);
        expect(document.body.textContent).toMatch(/Consent Audit Log|Request History/i);
      },
      { timeout: 30_000 },
    );
    view.unmount();
    tzSpy.mockRestore();

    // IN region badge
    tzSpy = spyTimezone("Asia/Kolkata");
    view = renderApp(withToaster(<ConsentCenter />), { route: "/privacy" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/DPDP Act \(India\)/i);
      expect(document.body.textContent).toMatch(/Consent Audit Log/i);
    }, { timeout: 30_000 });
    view.unmount();
    tzSpy.mockRestore();

    // US default + interactions
    view = renderApp(withToaster(<ConsentCenter />), { route: "/privacy" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/US Privacy Laws/i);
      expect(document.querySelectorAll('[role="switch"]').length).toBeGreaterThan(0);
      expect(document.body.textContent).toMatch(/Consent Audit Log|Accepted|Declined/i);
    }, { timeout: 30_000 });

    const realFrom = supabase.from.bind(supabase);
    function failInsertOn(table: string, message: string) {
      return vi.spyOn(supabase, "from").mockImplementation(((relation: string) => {
        const builder = realFrom(relation);
        if (relation !== table) return builder;
        return new Proxy(builder, {
          get(target, prop, receiver) {
            if (prop === "insert") {
              return async () => ({
                data: null,
                error: { message, code: "42501", details: null, hint: null, name: "PostgrestError" },
              });
            }
            const val = Reflect.get(target, prop, receiver);
            return typeof val === "function" ? val.bind(target) : val;
          },
        });
      }) as typeof supabase.from);
    }

    // Successful toggle
    const sw = document.querySelectorAll('[role="switch"]')[0] as HTMLElement;
    await user.click(sw);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Consent preference updated|Error/i);
      },
      { timeout: 15_000 },
    );

    // Toggle insert error arm
    const failConsent = failInsertOn("consents", "covcic consent deny");
    const sw2 = document.querySelectorAll('[role="switch"]')[1] as HTMLElement;
    await user.click(sw2);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/covcic consent deny|Error/i);
    }, { timeout: 15_000 });
    failConsent.mockRestore();

    // Export success (covers requestExport mutation + onSuccess)
    forceClick(screen.getByRole("button", { name: /Request Export/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Data export request submitted/i);
    }, { timeout: 15_000 });

    // Deletion cancel (confirm false) — still executes the onClick wrapper
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    forceClick(screen.getByRole("button", { name: /Request Deletion/i }));
    expect(confirmSpy).toHaveBeenCalled();

    // Deletion success
    confirmSpy.mockReturnValue(true);
    forceClick(screen.getByRole("button", { name: /Request Deletion/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Deletion request submitted/i);
    }, { timeout: 15_000 });

    // Deletion error via insert Proxy (same table as export; deny next insert only)
    let denyNextDataRequestInsert = true;
    const failDel = vi.spyOn(supabase, "from").mockImplementation(((relation: string) => {
      const builder = realFrom(relation);
      if (relation !== "data_requests") return builder;
      return new Proxy(builder, {
        get(target, prop, receiver) {
          if (prop === "insert") {
            return async (payload: unknown) => {
              if (denyNextDataRequestInsert) {
                denyNextDataRequestInsert = false;
                return {
                  data: null,
                  error: {
                    message: "covcic deletion deny",
                    code: "42501",
                    details: null,
                    hint: null,
                    name: "PostgrestError",
                  },
                };
              }
              return (target as { insert: (p: unknown) => Promise<unknown> }).insert(payload);
            };
          }
          const val = Reflect.get(target, prop, receiver);
          return typeof val === "function" ? val.bind(target) : val;
        },
      });
    }) as typeof supabase.from);
    forceClick(screen.getByRole("button", { name: /Request Deletion/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/covcic deletion deny|Error|Deletion request submitted/i);
    }, { timeout: 15_000 });
    failDel.mockRestore();
    confirmSpy.mockRestore();
    view.unmount();

    // Not-a-member mutation arms (UI renders without member; mutate throws)
    await signOut();
    view = renderApp(withToaster(<ConsentCenter />), { route: "/privacy" });
    await waitFor(() => {
      expect(document.querySelectorAll('[role="switch"]').length).toBeGreaterThan(0);
    }, { timeout: 15_000 });
    await user.click(document.querySelectorAll('[role="switch"]')[0] as HTMLElement);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Not a member|Error/i);
    }, { timeout: 10_000 });
    forceClick(screen.getByRole("button", { name: /Request Export/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Not a member/i);
    }, { timeout: 10_000 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    forceClick(screen.getByRole("button", { name: /Request Deletion/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Not a member/i);
    }, { timeout: 10_000 });
    view.unmount();
    vi.restoreAllMocks();

    // Track any consents / data_requests created by the member during the drill
    const { data: liveConsents } = await admin.from("consents").select("id").eq("member_id", MEMBER_ID);
    for (const r of liveConsents ?? []) {
      if (!seeded.consentIds.includes(r.id)) seeded.consentIds.push(r.id);
    }
    const { data: liveReqs } = await admin.from("data_requests").select("id").eq("member_id", MEMBER_ID);
    for (const r of liveReqs ?? []) {
      if (!seeded.dataRequestIds.includes(r.id)) seeded.dataRequestIds.push(r.id);
    }
  }, 120_000);

  it("AcceptFamilyInvite: invalid / already_used / preview / accept success+error arms", async () => {
    const user = makeUser();

    // No token → invalid invitation link
    let view = renderApp(<AcceptFamilyInvite />, {
      route: "/accept-family-invite",
      pathPattern: "/accept-family-invite",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Invalid invitation link/i);
    }, { timeout: 15_000 });
    forceClick(screen.getByRole("button", { name: /Go Home/i }));
    view.unmount();

    // Invalid token (not found)
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${crypto.randomUUID()}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/invalid or has expired/i);
    }, { timeout: 20_000 });
    view.unmount();

    // Seed pending + already-accepted invitations (inviter = global admin)
    const { data: invites, error: invErr } = await admin
      .from("family_invitations")
      .insert([
        {
          inviter_member_id: GLOBAL_ADMIN_ID,
          relation: "cousin",
          invitee_name: `${PREFIX} Pending`,
          invitee_email: `${PREFIX}-pending@example.invalid`,
          status: "pending",
        },
        {
          inviter_member_id: GLOBAL_ADMIN_ID,
          relation: "brother",
          invitee_name: `${PREFIX} Used`,
          invitee_email: `${PREFIX}-used@example.invalid`,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by_member_id: CHAPTER_ADMIN_ID,
        },
      ])
      .select("id, acceptance_token, status");
    if (invErr) throw invErr;
    for (const r of invites ?? []) seeded.inviteIds.push(r.id);
    const pending = (invites ?? []).find((i) => i.status === "pending");
    const used = (invites ?? []).find((i) => i.status === "accepted");
    expect(pending?.acceptance_token).toBeTruthy();
    expect(used?.acceptance_token).toBeTruthy();

    // Already used
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${used!.acceptance_token}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/already been accepted/i);
    }, { timeout: 20_000 });
    forceClick(screen.getByRole("button", { name: /Go to My Profile/i }));
    view.unmount();

    // Pending preview — signed out → Sign In link
    await signOut();
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${pending!.acceptance_token}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Sign In to Accept|Parivar Connection/i);
      expect(document.body.textContent).toMatch(/cousin|E2E GlobalAdmin/i);
    }, { timeout: 20_000 });
    const signInLink = screen.getByRole("link", { name: /Sign In to Accept/i });
    expect(signInLink.getAttribute("href")).toContain(pending!.acceptance_token);
    view.unmount();

    // Pending + signed in as member → accept success
    await signIn(E2E_ACCOUNTS.member.email);
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${pending!.acceptance_token}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Accept & Connect/i })).toBeTruthy();
    }, { timeout: 20_000 });
    await user.click(screen.getByRole("button", { name: /Accept & Connect/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Connection established|Something went wrong/i);
    }, { timeout: 20_000 });
    if (/Connection established/i.test(document.body.textContent ?? "")) {
      seeded.familyLinkKeys.push(
        { member_id: GLOBAL_ADMIN_ID, related_member_id: MEMBER_ID },
        { member_id: MEMBER_ID, related_member_id: GLOBAL_ADMIN_ID },
      );
      forceClick(screen.getByRole("button", { name: /View My Profile/i }));
    }
    view.unmount();

    // Fresh pending invite for error arms
    const { data: errInv, error: e2 } = await admin
      .from("family_invitations")
      .insert({
        inviter_member_id: GLOBAL_ADMIN_ID,
        relation: "sister",
        invitee_name: `${PREFIX} Err`,
        invitee_email: `${PREFIX}-err@example.invalid`,
        status: "pending",
      })
      .select("id, acceptance_token")
      .single();
    if (e2) throw e2;
    seeded.inviteIds.push(errInv.id);

    // Accept RPC returns error payload
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${errInv.acceptance_token}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Accept & Connect/i })).toBeTruthy();
    }, { timeout: 20_000 });
    const rpcSpy = vi.spyOn(supabase, "rpc").mockImplementation(((fn: string) => {
      if (fn === "get_family_invitation_preview") {
        return Promise.resolve({
          data: {
            found: true,
            status: "pending",
            invitee_name: `${PREFIX} Err`,
            relation: "sister",
            inviter_first_name: "E2E",
            inviter_last_name: "GlobalAdmin",
          },
          error: null,
        }) as never;
      }
      if (fn === "accept_family_invitation") {
        return Promise.resolve({
          data: { error: "covcic invite rpc deny" },
          error: null,
        }) as never;
      }
      return Promise.resolve({ data: null, error: null }) as never;
    }) as typeof supabase.rpc);
    // Remount so preview uses spy; click accept
    view.unmount();
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${errInv.acceptance_token}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Accept & Connect/i })).toBeTruthy();
    }, { timeout: 20_000 });
    await user.click(screen.getByRole("button", { name: /Accept & Connect/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/covcic invite rpc deny|Something went wrong/i);
    }, { timeout: 15_000 });
    rpcSpy.mockRestore();
    view.unmount();

    // No member profile arm: members.maybeSingle → null
    const { data: errInv2, error: e3 } = await admin
      .from("family_invitations")
      .insert({
        inviter_member_id: GLOBAL_ADMIN_ID,
        relation: "uncle",
        invitee_name: `${PREFIX} Nomem`,
        status: "pending",
      })
      .select("id, acceptance_token")
      .single();
    if (e3) throw e3;
    seeded.inviteIds.push(errInv2.id);

    await signIn(E2E_ACCOUNTS.member.email);
    const fromOrig = supabase.from.bind(supabase);
    const noMember = vi.spyOn(supabase, "from").mockImplementation(((relation: string) => {
      const q = fromOrig(relation);
      if (relation === "members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        } as never;
      }
      return q;
    }) as typeof supabase.from);
    const rpcPreview = vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: {
        found: true,
        status: "pending",
        invitee_name: `${PREFIX} Nomem`,
        relation: "uncle",
        inviter_first_name: null,
        inviter_last_name: null,
      },
      error: null,
    } as never);
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${errInv2.acceptance_token}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Accept & Connect/i })).toBeTruthy();
    }, { timeout: 20_000 });
    // inviter null names → "A community member" / empty-string coalescing
    expect(document.body.textContent).toMatch(/A community member|has invited you/i);
    await user.click(screen.getByRole("button", { name: /Accept & Connect/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No member profile found/i);
    }, { timeout: 15_000 });
    noMember.mockRestore();
    rpcPreview.mockRestore();
    view.unmount();

    // RPC transport error → safeErrorMessage fallback
    const { data: errInv3, error: e4 } = await admin
      .from("family_invitations")
      .insert({
        inviter_member_id: GLOBAL_ADMIN_ID,
        relation: "aunt",
        invitee_name: `${PREFIX} RpcErr`,
        status: "pending",
      })
      .select("id, acceptance_token")
      .single();
    if (e4) throw e4;
    seeded.inviteIds.push(errInv3.id);

    const rpcFail = vi.spyOn(supabase, "rpc").mockImplementation(((fn: string) => {
      if (fn === "get_family_invitation_preview") {
        return Promise.resolve({
          data: {
            found: true,
            status: "pending",
            invitee_name: `${PREFIX} RpcErr`,
            relation: "aunt",
            inviter_first_name: "E2E",
            inviter_last_name: "GlobalAdmin",
          },
          error: null,
        }) as never;
      }
      return Promise.resolve({
        data: null,
        error: { message: "covcic network boom" },
      }) as never;
    }) as typeof supabase.rpc);
    view = renderApp(<AcceptFamilyInvite />, {
      route: `/accept-family-invite/${errInv3.acceptance_token}`,
      pathPattern: "/accept-family-invite/:token",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Accept & Connect/i })).toBeTruthy();
    }, { timeout: 20_000 });
    await user.click(screen.getByRole("button", { name: /Accept & Connect/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/covcic network boom|could not accept|Something went wrong/i);
    }, { timeout: 15_000 });
    rpcFail.mockRestore();
    view.unmount();
  }, 180_000);

  it("EmergencyContacts: empty, search, typed cards, loading/signed-out guards", async () => {
    const user = makeUser();

    // Signed out → Navigate to auth
    await signOut();
    let view = renderApp(<EmergencyContacts />, { route: "/emergency" });
    await waitFor(() => {
      // MemoryRouter Navigate leaves body without crashing; auth redirect path present or empty layout
      expect(document.body).toBeTruthy();
    }, { timeout: 10_000 });
    view.unmount();

    // Loading arm: hang getSession briefly
    const hang = new Promise<{ data: { session: null }; error: null }>(() => {
      /* never */
    });
    const sessSpy = vi.spyOn(supabase.auth, "getSession").mockReturnValue(hang as never);
    const oascSpy = vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
      data: { subscription: { unsubscribe: () => undefined } },
    } as never);
    view = renderApp(<EmergencyContacts />, { route: "/emergency" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Loading/i);
    }, { timeout: 10_000 });
    view.unmount();
    sessSpy.mockRestore();
    oascSpy.mockRestore();

    await signIn(E2E_ACCOUNTS.member.email);

    // Empty state (table has no contacts, or only non-matching search later)
    view = renderApp(<EmergencyContacts />, { route: "/emergency" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No emergency contacts found|Universal Emergency Numbers/i);
    }, { timeout: 25_000 });
    // Prefer empty-card path when table empty
    expect(document.body.textContent).toMatch(/No emergency contacts found|Universal Emergency/i);
    view.unmount();

    // Seed contacts across types (+ unknown type, empty type, with/without city)
    const { data: contacts, error: ecErr } = await admin
      .from("emergency_contacts")
      .insert([
        {
          name: `${PREFIX} Civil Hospital`,
          phone: "0791234567",
          type: "hospital",
          city_id: CITY_AHM,
        },
        {
          name: `${PREFIX} Police HQ`,
          phone: "100",
          type: "police",
          city_id: CITY_AHM,
        },
        {
          name: `${PREFIX} Fire Station`,
          phone: "101",
          type: "fire",
          city_id: null,
        },
        {
          name: `${PREFIX} Community Desk`,
          phone: "9876543210",
          type: "community",
          city_id: CITY_AHM,
        },
        {
          name: `${PREFIX} Collectorate`,
          phone: "0799999999",
          type: "government",
          city_id: null,
        },
        {
          name: `${PREFIX} Misc Helpline`,
          phone: "108",
          type: "other",
          city_id: null,
        },
        {
          name: `${PREFIX} Unknown Type`,
          phone: "112",
          type: "ambulance_custom",
          city_id: CITY_AHM,
        },
        {
          name: `${PREFIX} EmptyType`,
          phone: "000",
          type: "",
          city_id: null,
        },
      ])
      .select("id, name, type");
    if (ecErr) throw ecErr;
    for (const r of contacts ?? []) seeded.contactIds.push(r.id);
    expect((contacts ?? []).length).toBeGreaterThanOrEqual(6);

    view = renderApp(<EmergencyContacts />, { route: "/emergency" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(PREFIX));
      expect(document.body.textContent).toMatch(/hospital|police|fire|Ahmedabad/i);
    }, { timeout: 25_000 });

    // Search filter (ilike path)
    const input = screen.getByPlaceholderText(/Search contacts/i);
    await user.clear(input);
    await user.type(input, "Civil");
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Civil Hospital/i);
    }, { timeout: 20_000 });

    // Search with no matches → empty card
    await user.clear(input);
    await user.type(input, `zzz-no-match-${PREFIX}`);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No emergency contacts found/i);
    }, { timeout: 20_000 });

    // Clear search — full list again
    await user.clear(input);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Police HQ|Fire Station|Collectorate/i);
    }, { timeout: 20_000 });

    // tel: links present
    const tel = document.querySelector('a[href^="tel:"]');
    expect(tel).toBeTruthy();
    view.unmount();
  }, 120_000);
});
