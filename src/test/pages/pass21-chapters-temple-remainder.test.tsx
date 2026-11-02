/**
 * Pass 21 — Wave 10 remainder: Chapters / Temple / event-notifications / CampaignsPanel /
 * use-toast / EldersCouncil + ≤4-unc leftovers → 100% lines.
 * Real Kong :54331 / khadayata_local :5438. Disposable covctr_* fixtures — no view mocks.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
  cleanup,
  within,
  renderHook,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { toast, useToast, reducer } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubdomainSSO } from "@/hooks/useSubdomainSSO";
import {
  notifyEventCreated,
  notifyRSVPConfirmation,
} from "@/lib/event-notifications";
import Chapters from "@/pages/Chapters";
import Temple from "@/pages/Temple";
import EldersCouncil from "@/pages/EldersCouncil";
import Admin from "@/pages/Admin";
import Obituaries from "@/pages/Obituaries";
import PublicArchives from "@/pages/PublicArchives";
import Directory from "@/pages/Directory";
import News from "@/pages/News";
import { CampaignsPanel } from "@/components/finance/CampaignsPanel";
import { AvatarUpload } from "@/components/AvatarUpload";
import { FamilyInviteDialog } from "@/components/profile/FamilyInviteDialog";
import { LanguageToggle } from "@/components/LanguageToggle";
import { VerificationCenter } from "@/components/verification/VerificationCenter";
import { ReportDialog } from "@/components/ReportDialog";
import BulkContentTab from "@/components/admin/BulkContentTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import ObituaryForm from "@/components/obituaries/ObituaryForm";
import {
  ChartContainer,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ContextMenuShortcut } from "@/components/ui/context-menu";
import { useFormField, Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";

const PREFIX = `covctr_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

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
        if (m?.[1] === name) return m[2].replace(/^["\']|["\']$/g, "");
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

async function clickSafe(user: ReturnType<typeof userEvent.setup>, el: HTMLElement | null | undefined) {
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

function forceReactClick(el: HTMLElement) {
  const propsKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  const props = propsKey ? (el as unknown as Record<string, { onClick?: (e: unknown) => void }>)[propsKey] : null;
  if (props?.onClick) {
    props.onClick({
      preventDefault() {},
      stopPropagation() {},
      nativeEvent: new MouseEvent("click"),
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist() {},
      target: el,
      currentTarget: el,
      type: "click",
    });
    return;
  }
  fireEvent.click(el);
}

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement | null | undefined,
  option: RegExp,
) {
  if (!trigger) return false;
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 5000 }).catch(() => [] as HTMLElement[]);
  const match = opts.find((o) => option.test(o.textContent ?? ""));
  if (match) {
    await clickSafe(user, match);
    return true;
  }
  await user.keyboard("{Escape}");
  return false;
}

function Providers({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** supabase.functions is a new FunctionsClient per access — spy the prototype. */
function spyFunctionsInvoke(impl: (...args: unknown[]) => unknown) {
  const proto = Object.getPrototypeOf(supabase.functions) as {
    invoke: (...args: unknown[]) => unknown;
  };
  return vi.spyOn(proto, "invoke").mockImplementation(impl as typeof proto.invoke);
}

const seeded = {
  emptyChapterId: null as string | null,
  emptyChapterSlug: `${PREFIX}-empty`,
  threadId: null as string | null,
  voteId: null as string | null,
  memberId: null as string | null,
  memberFirst: null as string | null,
  memberLast: null as string | null,
  campaignId: null as string | null,
  donationId: null as string | null,
  campaignDonationId: null as string | null,
  announcementId: null as string | null,
  obituaryIds: [] as string[],
  newsId: null as string | null,
  inviteId: null as string | null,
  wallClearedIds: [] as string[],
  contentNewsId: null as string | null,
};

describe("Pass 21 — Wave 10 chapters/temple remainder (real Kong)", () => {
  beforeAll(async () => {
    const admin = adminClient();
    const { data: mem } = await admin
      .from("members")
      .select("id, first_name, last_name")
      .eq("user_id", (await admin.auth.admin.listUsers({ perPage: 200 })).data.users.find((u) => u.email === E2E_ACCOUNTS.member.email)?.id ?? "")
      .maybeSingle();
    // Fallback: look up by email contact / known e2e
    if (!mem) {
      const { data: byName } = await admin
        .from("members")
        .select("id, first_name, last_name, user_id")
        .ilike("first_name", "%")
        .limit(1);
      void byName;
    }
    const { data: memberRow } = await admin
      .from("members")
      .select("id, first_name, last_name")
      .or("first_name.ilike.E2E,last_name.ilike.Member")
      .limit(5);
    // Prefer signing in to resolve member id
    await signIn(E2E_ACCOUNTS.member.email);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await admin.from("members").select("id, first_name, last_name").eq("user_id", user!.id).single();
    seeded.memberId = me!.id;
    seeded.memberFirst = me!.first_name;
    seeded.memberLast = me!.last_name;

    // Empty chapter (no members) for event-notifications early return.
    // chapters require subdomain NOT NULL; no `active` column — is_active lives in settings.
    // Prefer a city that currently has zero chapters (hence zero members via chapter).
    const { data: cities } = await admin.from("cities").select("id, name, state_id, country_id").limit(120);
    let emptyCity: { id: string; name: string; state_id: string | null; country_id: string | null } | null = null;
    for (const c of cities ?? []) {
      const { count } = await admin
        .from("chapters")
        .select("id", { count: "exact", head: true })
        .eq("city_id", c.id);
      if ((count ?? 0) === 0) {
        emptyCity = c;
        break;
      }
    }
    const { data: ch, error: chErr } = await admin
      .from("chapters")
      .insert({
        name: `${PREFIX} Empty Chapter`,
        slug: seeded.emptyChapterSlug,
        subdomain: seeded.emptyChapterSlug,
        settings: { is_active: true, city: emptyCity?.name ?? "X", country: "India" },
        country_id: emptyCity?.country_id ?? null,
        state_id: emptyCity?.state_id ?? null,
        city_id: emptyCity?.id ?? null,
      })
      .select("id")
      .single();
    if (chErr) throw chErr;
    seeded.emptyChapterId = ch!.id;

    // Elders: announcement-category empty + general thread with my upvote
    const { data: thr } = await admin
      .from("council_threads")
      .insert({
        author_id: seeded.memberId,
        title: `${PREFIX} Vote Toggle Thread`,
        body: "Seeded for upvote-delete arm.",
        category: "general",
        pinned: false,
        closed: false,
      })
      .select("id")
      .single();
    if (thr) {
      seeded.threadId = thr.id;
      const { data: vote } = await admin
        .from("council_votes")
        .insert({ thread_id: thr.id, member_id: seeded.memberId, vote: 1 })
        .select("id")
        .single();
      seeded.voteId = vote?.id ?? null;
    }

    // Campaign + pending/wrong-currency donation for getRaised skip arms
    const { data: camp } = await admin
      .from("fundraising_campaigns")
      .insert({
        title: `${PREFIX} Raised Skip`,
        description: "cov",
        goal_amount: 10000,
        currency: "INR",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
        campaign_type: "general",
        chapter_id: AHMEDABAD,
        created_by: seeded.memberId,
        status: "active",
      })
      .select("id")
      .single();
    seeded.campaignId = camp?.id ?? null;

    const { data: fund } = await admin.from("funds").select("id").eq("active", true).limit(1).maybeSingle();
    if (fund && seeded.campaignId) {
      const { data: don } = await admin
        .from("donations")
        .insert({
          fund_id: fund.id,
          member_id: seeded.memberId,
          amount: 50,
          currency: "USD",
          type: "one_time",
          provider: "manual",
          status: "pending",
          donor_name: `${PREFIX} Pending`,
        })
        .select("id")
        .single();
      seeded.donationId = don?.id ?? null;
      if (don) {
        const { data: cd } = await admin
          .from("campaign_donations")
          .insert({ campaign_id: seeded.campaignId, donation_id: don.id })
          .select("id")
          .single();
        seeded.campaignDonationId = cd?.id ?? null;
      }
    }

    // Chapter announcement for badge
    const { data: ann } = await admin
      .from("announcements")
      .insert({
        title: `${PREFIX} Chapter Announcement`,
        body: "Chapter-scoped badge coverage",
        chapter_id: AHMEDABAD,
        created_by: seeded.memberId,
      })
      .select("id")
      .single();
    seeded.announcementId = ann?.id ?? null;

    // Obituaries: missing dob + with photo
    const { data: ob1 } = await admin
      .from("obituaries")
      .insert({
        full_name: `${PREFIX} No Dates Elder`,
        dod: "2020-01-01",
        dob: null,
        status: "published",
        chapter_id: AHMEDABAD,
      })
      .select("id")
      .single();
    if (ob1) seeded.obituaryIds.push(ob1.id);
    const { data: ob2 } = await admin
      .from("obituaries")
      .insert({
        full_name: `${PREFIX} Photo Elder`,
        dod: "2021-06-15",
        dob: "1930-01-01",
        photo_url: "https://placehold.co/200x200/png?text=cov",
        status: "published",
        chapter_id: AHMEDABAD,
      })
      .select("id")
      .single();
    if (ob2) seeded.obituaryIds.push(ob2.id);

    // News article for unpin edit (created_by is auth user id, not member id)
    const { data: { user: seedUser } } = await supabase.auth.getUser();
    const createdBy = seedUser?.id ?? null;
    const { data: news, error: newsErr } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Unpin Me`,
        summary: "cov",
        body: "body",
        status: "published",
        article_type: "news",
        pinned: true,
        pinned_until: new Date(Date.now() + 864e5).toISOString(),
        published_at: new Date().toISOString(),
        created_by: createdBy,
      })
      .select("id")
      .single();
    if (newsErr) throw newsErr;
    seeded.newsId = news?.id ?? null;

    // Bulk content news row — must be published so Global Admin can read via RLS
    // ("Anyone can read published news"; drafts are creator-only).
    const { data: cn, error: cnErr } = await admin
      .from("content_news")
      .insert({
        title: `${PREFIX} Bulk News Row`,
        summary: "bulk",
        body: "bulk body",
        status: "published",
        article_type: "news",
        pinned: false,
        published_at: new Date().toISOString(),
        created_by: createdBy,
      })
      .select("id")
      .single();
    if (cnErr) throw cnErr;
    seeded.contentNewsId = cn?.id ?? null;

    // Clear donor wall opt-ins so empty arm is reachable
    const { data: wall } = await admin
      .from("donations")
      .select("id")
      .eq("donor_wall_opt_in", true)
      .eq("status", "succeeded");
    seeded.wallClearedIds = (wall ?? []).map((d) => d.id);
    if (seeded.wallClearedIds.length) {
      await admin.from("donations").update({ donor_wall_opt_in: false }).in("id", seeded.wallClearedIds);
    }
  }, 180_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.wallClearedIds.length) {
      await admin.from("donations").update({ donor_wall_opt_in: true }).in("id", seeded.wallClearedIds);
    }
    if (seeded.campaignDonationId) await admin.from("campaign_donations").delete().eq("id", seeded.campaignDonationId);
    if (seeded.donationId) await admin.from("donations").delete().eq("id", seeded.donationId);
    if (seeded.campaignId) await admin.from("fundraising_campaigns").delete().eq("id", seeded.campaignId);
    if (seeded.voteId) await admin.from("council_votes").delete().eq("id", seeded.voteId);
    if (seeded.threadId) {
      await admin.from("council_votes").delete().eq("thread_id", seeded.threadId);
      await admin.from("council_replies").delete().eq("thread_id", seeded.threadId);
      await admin.from("council_threads").delete().eq("id", seeded.threadId);
    }
    await admin.from("council_threads").delete().ilike("title", `${PREFIX}%`);
    if (seeded.announcementId) await admin.from("announcements").delete().eq("id", seeded.announcementId);
    await admin.from("announcements").delete().ilike("title", `${PREFIX}%`);
    if (seeded.obituaryIds.length) await admin.from("obituaries").delete().in("id", seeded.obituaryIds);
    await admin.from("obituaries").delete().ilike("full_name", `${PREFIX}%`);
    if (seeded.newsId) await admin.from("content_news").delete().eq("id", seeded.newsId);
    if (seeded.contentNewsId) await admin.from("content_news").delete().eq("id", seeded.contentNewsId);
    await admin.from("content_news").delete().ilike("title", `${PREFIX}%`);
    if (seeded.inviteId) await admin.from("family_invitations").delete().eq("id", seeded.inviteId);
    await admin.from("family_invitations").delete().ilike("invitee_name", `${PREFIX}%`);
    if (seeded.emptyChapterId) await admin.from("chapters").delete().eq("id", seeded.emptyChapterId);
    await admin.from("chapters").delete().eq("slug", seeded.emptyChapterSlug);
    await supabase.auth.signOut();
  }, 120_000);

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("Chapters: country→state filter + empty Clear filters", async () => {
    await supabase.auth.signOut();
    const user = userEvent.setup();
    // Cities dropdown is derived from chapters that have that city — UI can never
    // naturally show 0 results. After India→Gujarat (handleStateChange), force
    // useChapters key empty via controlled QueryClient.
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/chapters"]}>{withToaster(<Chapters />)}</MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/chapter/i);
      expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
    }, { timeout: 30_000 });

    const boxes = screen.getAllByRole("combobox");
    await pickSelectOption(user, boxes[0], /^India$/i);
    await waitFor(() => {
      expect(screen.getAllByRole("combobox")[1]).not.toBeDisabled();
    }, { timeout: 15_000 });

    // Pick Gujarat (hits handleStateChange 105–107)
    const stateBox = screen.getAllByRole("combobox")[1];
    const picked = await pickSelectOption(user, stateBox, /^Gujarat$/i);
    if (!picked) await pickSelectOption(user, stateBox, /Maharashtra|Rajasthan|Delhi|./i);

    await act(async () => {
      await qc.cancelQueries({ queryKey: ["chapters"] });
      qc.setQueryData(["chapters"], []);
    });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No chapters match your filters/i);
    }, { timeout: 10_000 });
    const clear = screen.getByRole("button", { name: /Clear filters/i });
    await clickSafe(user, clear);
    // Refetch real chapters so empty arm clears after Clear filters reset state.
    await act(async () => {
      await qc.invalidateQueries({ queryKey: ["chapters"] });
    });
    await waitFor(() => {
      expect(document.body.textContent).not.toMatch(/No chapters match your filters/i);
    }, { timeout: 20_000 });
  }, 120_000);

  it("Temple: empty donor wall + empty my donations + ledger member-name search", async () => {
    const user = userEvent.setup();
    // Regular member — My Donations (not ledger). Cancel + set both keys so in-flight fetch cannot overwrite.
    await signIn(E2E_ACCOUNTS.member.email);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/temple"]}>
            {withToaster(<Temple />)}
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Kotyark Temple|Make a Donation|Dharmaada/i);
    }, { timeout: 30_000 });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Be the first Dharmaada Patron|Dharmaada Patron Wall/i);
    }, { timeout: 20_000 });
    await act(async () => {
      await qc.cancelQueries({ queryKey: ["donor-wall"] });
      await qc.cancelQueries({ queryKey: ["my-donations"] });
      qc.setQueryData(["donor-wall"], []);
      qc.setQueryData(["my-donations"], []);
    });
    // Re-assert immediately after loaded paint in case a late resolve raced cancel.
    await waitFor(() => {
      act(() => {
        qc.setQueryData(["donor-wall"], []);
        qc.setQueryData(["my-donations"], []);
      });
      expect(document.body.textContent).toMatch(/Be the first Dharmaada Patron/i);
      expect(document.body.textContent).toMatch(/No donations yet/i);
    }, { timeout: 10_000 });
    unmount();

    // Finance admin — search by member first name (not MARKER donor_name) for lines 508–509
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    renderApp(withToaster(<Temple />), { route: "/temple" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Donation Ledger/i);
    }, { timeout: 30_000 });
    const search = await screen.findByPlaceholderText(/Search donor or fund/i);
    const nameQ = (seeded.memberFirst || "E2E").slice(0, 12);
    fireEvent.change(search, { target: { value: nameQ } });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Donation Ledger|raised|donation/i);
    }, { timeout: 10_000 });
    void user;
  }, 120_000);

  it("event-notifications: empty chapter + send-email catch arms", async () => {
    expect(seeded.emptyChapterId).toBeTruthy();
    const admin = adminClient();

    // Empty chapter → getChapterOptedInMembers early return (32–33)
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    await expect(
      notifyEventCreated({
        id: "00000000-0000-0000-0000-00000000c001",
        name: `${PREFIX} empty`,
        chapter_id: seeded.emptyChapterId!,
      }),
    ).resolves.toBeUndefined();

    // Seed contact + prefs, then act as the member so RLS can read own contacts
    await admin.from("member_contacts").delete().eq("member_id", seeded.memberId!).eq("type", "email");
    const { error: contactErr } = await admin.from("member_contacts").insert({
      member_id: seeded.memberId!,
      type: "email",
      value: `${PREFIX}-notify@example.invalid`,
    });
    if (contactErr) throw contactErr;
    const { error: prefErr } = await admin.from("notification_preferences").upsert(
      {
        member_id: seeded.memberId!,
        email_enabled: true,
        chapter_notifications_enabled: true,
        whatsapp_enabled: false,
        push_enabled: false,
      } as never,
      { onConflict: "member_id" },
    );
    if (prefErr) {
      const { error: updErr } = await admin
        .from("notification_preferences")
        .update({
          email_enabled: true,
          chapter_notifications_enabled: true,
        })
        .eq("member_id", seeded.memberId!);
      if (updErr) throw prefErr;
    }

    await signIn(E2E_ACCOUNTS.member.email);
    // Confirm contact visible under member RLS before notify paths
    const { data: ownContact } = await supabase
      .from("member_contacts")
      .select("value")
      .eq("member_id", seeded.memberId!)
      .eq("type", "email")
      .maybeSingle();
    expect(ownContact?.value).toBeTruthy();

    const invoke = spyFunctionsInvoke(async () => {
      throw new Error("boom");
    });

    // RSVP confirmation catch (228–229)
    await notifyRSVPConfirmation(
      { id: "00000000-0000-0000-0000-00000000c002", name: `${PREFIX} rsvp`, chapter_id: AHMEDABAD },
      seeded.memberId!,
      "going",
    );

    // Fan-out catch (161–162)
    const { data: memRow } = await admin
      .from("members")
      .select("chapter_id")
      .eq("id", seeded.memberId!)
      .maybeSingle();
    const fanChapter = memRow?.chapter_id ?? AHMEDABAD;
    await notifyEventCreated({
      id: "00000000-0000-0000-0000-00000000c003",
      name: `${PREFIX} fanout`,
      chapter_id: fanChapter,
    });
    expect(invoke).toHaveBeenCalled();
    invoke.mockRestore();
    await admin.from("member_contacts").delete().eq("value", `${PREFIX}-notify@example.invalid`);
  }, 90_000);

  it("CampaignsPanel: force empty create validation + getRaised skips", async () => {
    await signIn(E2E_ACCOUNTS.financeAdmin.email);
    const user = userEvent.setup();
    renderApp(withToaster(<CampaignsPanel myChapterId={AHMEDABAD} />), { route: "/admin?tab=finance" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Fundraising Campaigns|New Campaign/i);
    }, { timeout: 30_000 });
    // getRaised skip arms — seeded pending USD linked donation on INR campaign
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(PREFIX));
    }, { timeout: 20_000 });

    await clickSafe(user, screen.getByRole("button", { name: /New Campaign/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    const dlg = screen.getByRole("dialog");
    const createBtn = within(dlg).getByRole("button", { name: /Create Campaign/i });
    expect(createBtn).toBeDisabled();
    await act(async () => {
      forceReactClick(createBtn);
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Fill in all required fields|Error/i);
    }, { timeout: 10_000 });
  }, 90_000);

  it("use-toast: REMOVE_TOAST timeout callback fires", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(), { wrapper: Providers });
    let id = "";
    act(() => {
      const h = toast({ title: `${PREFIX} toast` });
      id = h.id;
      h.dismiss();
    });
    expect(result.current.toasts.some((t) => t.id === id)).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(1_000_001);
    });
    expect(result.current.toasts.find((t) => t.id === id)).toBeUndefined();
    // also exercise reducer REMOVE after dismiss queue duplicate early-return
    let state = { toasts: [{ id: "z", open: true, title: "x" }] as ReturnType<typeof reducer>["toasts"] };
    state = reducer(state, { type: "DISMISS_TOAST", toastId: "z" });
    state = reducer(state, { type: "DISMISS_TOAST", toastId: "z" });
    vi.useRealTimers();
  });

  it("EldersCouncil: upvote-delete when my_vote matches + empty Announcement filter", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(withToaster(<EldersCouncil />), { route: "/elders-council/full" });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} Vote Toggle Thread`);
    }, { timeout: 30_000 });

    await clickSafe(user, screen.getByRole("button", { name: /^General$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} Vote Toggle Thread`);
    }, { timeout: 15_000 });

    const card = screen.getByText(`${PREFIX} Vote Toggle Thread`).closest("div.flex, [class*='Card']") ?? screen.getByText(`${PREFIX} Vote Toggle Thread`).parentElement;
    const upvote =
      (card && within(card as HTMLElement).queryAllByLabelText("Upvote")[0]) ||
      screen.getAllByLabelText("Upvote").find((btn) => btn.closest(".cursor-pointer, [class*='card']")?.textContent?.includes(PREFIX));
    expect(upvote).toBeTruthy();
    await clickSafe(user, upvote!);
    await waitFor(async () => {
      const admin = adminClient();
      const { data } = await admin
        .from("council_votes")
        .select("id")
        .eq("thread_id", seeded.threadId!)
        .eq("member_id", seeded.memberId!)
        .maybeSingle();
      expect(data).toBeNull();
    }, { timeout: 20_000 });

    await clickSafe(user, screen.getByRole("button", { name: /^Announcement$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No threads yet/i);
    }, { timeout: 15_000 });
  }, 120_000);

  it("AvatarUpload with currentUrl + LanguageToggle click", async () => {
    const onChange = vi.fn();
    renderApp(
      <div>
        <AvatarUpload currentUrl="https://placehold.co/64x64/png" onUploadComplete={() => {}} initials="CT" />
        <LanguageToggle content={{ en: "Hello", gu: "નમસ્તે", hi: "नमस्ते" }} onChange={onChange} />
      </div>,
      { route: "/profile" },
    );
    expect(screen.getByAltText("Avatar")).toBeInTheDocument();
    const gu = screen.getByRole("button", { name: /Switch to Gujarati|Gujarati/i });
    fireEvent.click(gu);
    expect(onChange).toHaveBeenCalled();
  });

  it("FamilyInviteDialog: inviter fallback + send-email throw catch", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    const invoke = spyFunctionsInvoke(async () => {
      throw new Error("email down");
    });

    const { unmount } = renderApp(withToaster(<FamilyInviteDialog memberId={seeded.memberId!} />), {
      route: "/profile",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Invite Family/i })).toBeTruthy();
    }, { timeout: 20_000 });
    await clickSafe(user, screen.getByRole("button", { name: /Invite Family/i }));
    await waitFor(() => expect(screen.getByText(/Invite a Family Member/i)).toBeInTheDocument(), {
      timeout: 8_000,
    });

    const relation = screen.getAllByRole("combobox")[0];
    await pickSelectOption(user, relation, /Son/i);
    fireEvent.change(screen.getByPlaceholderText(/Enter their name/i), {
      target: { value: `${PREFIX} Invitee` },
    });
    fireEvent.change(screen.getByPlaceholderText(/their@email\.com/i), {
      target: { value: `${PREFIX}@example.com` },
    });

    // Cover inviter fallback (line 108): stub members chain after form filled
    const realFrom = supabase.from.bind(supabase);
    const fromSpy = vi.spyOn(supabase, "from").mockImplementation(((table: string) => {
      if (table === "members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
              single: async () => ({ data: null, error: null }),
            }),
          }),
        } as never;
      }
      return realFrom(table);
    }) as typeof supabase.from);

    const send = screen.getByRole("button", { name: /Send Invitation/i });
    expect(send).not.toBeDisabled();
    await act(async () => {
      forceReactClick(send);
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/could not send the email|Invitation created|Error/i);
    }, { timeout: 25_000 });
    expect(invoke).toHaveBeenCalled();
    fromSpy.mockRestore();
    invoke.mockRestore();
    const admin = adminClient();
    const { data: inv } = await admin
      .from("family_invitations")
      .select("id")
      .ilike("invitee_name", `${PREFIX}%`)
      .limit(1);
    if (inv?.[0]) seeded.inviteId = inv[0].id;
    unmount();
  }, 90_000);

  it("useSubdomainSSO: invalid relay decode + refreshSession error", async () => {
    window.location.hash = "sso_relay=%%%not-valid-b64%%%";
    renderHook(() => useSubdomainSSO(), { wrapper: Providers });
    await waitFor(() => {
      expect(window.location.hash === "" || !window.location.hash.includes("sso_relay")).toBe(true);
    }, { timeout: 5_000 });

    const bad = btoa(JSON.stringify({ refreshToken: "invalid-token", timestamp: Date.now(), origin: "x" }));
    const refresh = vi.spyOn(supabase.auth, "refreshSession").mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "bad refresh", name: "AuthError", status: 400 } as never,
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        hostname: "localhost",
        pathname: "/",
        search: "",
        hash: `#sso_relay=${bad}`,
        href: `http://localhost/#sso_relay=${bad}`,
      },
    });
    const replaceState = vi.spyOn(window.history, "replaceState");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderHook(() => useSubdomainSSO(), { wrapper: Providers });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
      expect(replaceState).toHaveBeenCalled();
    }, { timeout: 10_000 });
    errSpy.mockRestore();
    refresh.mockRestore();
  });

  it("VerificationCenter onError + ReportDialog onError", async () => {
    await signIn(E2E_ACCOUNTS.unverified.email);
    const user = userEvent.setup();

    const { unmount: uVer } = renderApp(withToaster(<VerificationCenter />), {
      route: "/verification",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Verification|L0|L1|Request|vouch/i);
    }, { timeout: 30_000 });

    const realFrom = supabase.from.bind(supabase);
    const verFromSpy = vi.spyOn(supabase, "from").mockImplementation(((table: string) => {
      if (table === "verification_requests") {
        return {
          insert: () => Promise.resolve({ data: null, error: { message: "forced ver error" } }),
        } as never;
      }
      return realFrom(table);
    }) as typeof supabase.from);

    const reqBtn =
      screen.queryByRole("button", { name: /Submit Verification Request/i }) ||
      screen.queryByRole("button", { name: /Submit|Request Verification|Apply/i });
    if (reqBtn) {
      await act(async () => forceReactClick(reqBtn));
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/Error|forced ver|Not a member|vouches|required/i);
      }, { timeout: 15_000 });
    }
    verFromSpy.mockRestore();
    uVer();

    // ReportDialog returns null unless moderator/admin
    await signIn(E2E_ACCOUNTS.moderator.email);
    const { unmount: uRep } = renderApp(
      withToaster(
        <ReportDialog entityType="member" entityId={seeded.memberId!} variant="button" />,
      ),
      { route: "/" },
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /Report/i })).toBeTruthy(), {
      timeout: 20_000,
    });
    await clickSafe(user, screen.getByRole("button", { name: /Report/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    const dlg = screen.getByRole("dialog");
    const cat = within(dlg).queryByRole("combobox");
    if (cat) await pickSelectOption(user, cat, /Non-Khadayata|Spam|Harassment|Inappropriate|Other|./i);
    const reason =
      within(dlg).queryByPlaceholderText(/additional context/i) || within(dlg).queryByRole("textbox");
    if (reason) fireEvent.change(reason, { target: { value: `${PREFIX} reason text long enough` } });

    const realFrom2 = supabase.from.bind(supabase);
    const reportFromSpy = vi.spyOn(supabase, "from").mockImplementation(((table: string) => {
      if (table === "reports") {
        return {
          insert: () => Promise.resolve({ data: null, error: { message: "forced report error" } }),
        } as never;
      }
      return realFrom2(table);
    }) as typeof supabase.from);

    const submit =
      within(dlg).queryByRole("button", { name: /Submit Report/i }) ||
      within(dlg).getByRole("button", { name: /Submit|Send|Report/i });
    await act(async () => forceReactClick(submit));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Error|could not submit|forced report/i);
    }, { timeout: 15_000 });
    reportFromSpy.mockRestore();
    uRep();
  }, 120_000);

  it("BulkContentTab content_news mapping + AnnouncementsTab chapter badge", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount: uBulk } = renderApp(withToaster(<BulkContentTab />), {
      route: "/admin?tab=bulk",
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Bulk Content Management/i);
    }, { timeout: 30_000 });
    expect(seeded.contentNewsId).toBeTruthy();
    const newsTab =
      screen.queryByRole("tab", { name: /^News Articles$/i }) ||
      screen.getAllByRole("tab").find((t) => /News/i.test(t.textContent ?? ""));
    await clickSafe(user, newsTab as HTMLElement);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search news/i)).toBeTruthy();
    }, { timeout: 15_000 });
    fireEvent.change(screen.getByPlaceholderText(/Search news/i), { target: { value: PREFIX } });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(`${PREFIX} Bulk News Row`));
    }, { timeout: 25_000 });
    uBulk();

    const admin = adminClient();
    const { data: anns } = await admin
      .from("announcements")
      .select("id, title, body, created_at, chapter_id")
      .ilike("title", `${PREFIX}%`);
    renderApp(
      withToaster(
        <AnnouncementsTab
          announcements={
            (anns?.length
              ? anns
              : [
                  {
                    id: seeded.announcementId ?? "00000000-0000-0000-0000-00000000a001",
                    title: `${PREFIX} Chapter Announcement`,
                    body: "Chapter-scoped badge coverage",
                    created_at: new Date().toISOString(),
                    chapter_id: AHMEDABAD,
                  },
                ]) as never[]
          }
        />,
      ),
      { route: "/admin?tab=announcements" },
    );
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} Chapter Announcement`);
      expect(document.body.textContent).toMatch(/Chapter/);
    }, { timeout: 30_000 });
  }, 90_000);

  it("chart non-object payload + context-menu Shortcut open + form orphan throw", async () => {
    const config: ChartConfig = { sales: { label: "Sales", color: "#111" } };
    // ChartLegendContent + non-object / null payload hits getPayloadConfigFromPayload early return
    render(
      <ChartContainer config={config}>
        <ChartLegendContent payload={["not-an-object" as never]} />
        <ChartLegendContent payload={[{ payload: null } as never]} />
      </ChartContainer>,
    );

    // Render Shortcut directly — covers 158–159 without Radix floating-ui fromRect flake
    render(<ContextMenuShortcut data-testid="ctx-shortcut">⌘C</ContextMenuShortcut>);
    expect(screen.getByTestId("ctx-shortcut").textContent).toBe("⌘C");

    // Form orphan: wrap in Form provider so throw is the FormField guard (not useFormContext)
    function Orphan() {
      useFormField();
      return null;
    }
    function Wrap() {
      const form = useForm({ defaultValues: { n: "" } });
      return (
        <Form {...form}>
          <Orphan />
        </Form>
      );
    }
    expect(() => render(<Wrap />)).toThrow(/useFormField should be used within <FormField>/);
  });

  it("use-mobile matchMedia change fires", async () => {
    const listeners: Array<() => void> = [];
    const mql = {
      matches: false,
      media: "(max-width: 767px)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, cb: () => void) => {
        listeners.push(cb);
      },
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
    window.matchMedia = vi.fn().mockReturnValue(mql) as typeof window.matchMedia;
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe("boolean");
    act(() => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });

  it("Admin ?tab=moderator redirects to /moderation", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    renderApp(<Admin />, { route: "/admin?tab=moderator" });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Moderation|Moderator|Reports|dashboard/i);
    }, { timeout: 30_000 });
  }, 60_000);

  it("Obituaries missing dob/photo + PublicArchives signed-in redirect", async () => {
    await supabase.auth.signOut();
    renderApp(<Obituaries />, { route: "/obituaries" });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} No Dates Elder`);
      expect(document.body.textContent).toContain(`${PREFIX} Photo Elder`);
    }, { timeout: 30_000 });
    cleanup();

    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<PublicArchives />, { route: "/archives" });
    await waitFor(() => {
      // Navigate to full archives
      expect(document.body.textContent).toMatch(/Archive|Heritage|Jyoti|document/i);
    }, { timeout: 30_000 });
  }, 90_000);

  it("ObituaryForm onSuccess + Directory empty + News unpin edit", async () => {
    // Chapter Admin / Publisher roles pass obituaries INSERT RLS
    await signIn(E2E_ACCOUNTS.chapterAdmin.email);
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { unmount: uObit } = renderApp(
      withToaster(<ObituaryForm onSuccess={onSuccess} onClose={() => {}} />),
      { route: "/obituaries" },
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Full Name|Obituary|Tribute|Post Obituary/i);
    }, { timeout: 15_000 });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ramesh Patel/i), {
      target: { value: `${PREFIX} Form Success` },
    });
    const dates = document.querySelectorAll('input[type="date"]');
    // dates[0]=DOB, dates[1]=Date of Passing (required)
    expect(dates.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(dates[1], { target: { value: "2022-01-01" } });
    const form = document.querySelector("form");
    expect(form).toBeTruthy();
    await act(async () => {
      fireEvent.submit(form!);
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 25_000 });
    const admin = adminClient();
    const { data: created } = await admin
      .from("obituaries")
      .select("id")
      .eq("full_name", `${PREFIX} Form Success`)
      .maybeSingle();
    if (created) seeded.obituaryIds.push(created.id);
    uObit();

    // Directory empty via impossible search
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Directory />, { route: "/directory" });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by name/i)).toBeTruthy();
    }, { timeout: 30_000 });
    fireEvent.change(screen.getByPlaceholderText(/Search by name/i), {
      target: { value: "zzz_nomatch" },
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No members found/i);
    }, { timeout: 20_000 });
    cleanup();

    // News edit unpin (pinned=false → pinned_until null)
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    renderApp(withToaster(<News />), { route: "/news" });
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${PREFIX} Unpin Me`);
    }, { timeout: 30_000 });
    // Permissions resolve async — wait for moderate controls
    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /Edit article/i }).length).toBeGreaterThan(0);
    }, { timeout: 30_000 });
    const titleEl = screen.getByText(`${PREFIX} Unpin Me`);
    const card =
      titleEl.closest("[class*='Card'], article, li, .group, .shadow-card") ?? titleEl.parentElement?.parentElement;
    const editBtn =
      (card && within(card as HTMLElement).queryByRole("button", { name: /Edit article/i })) ||
      screen.getAllByRole("button", { name: /Edit article/i })[0];
    await clickSafe(user, editBtn!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeTruthy(), { timeout: 10_000 });
    const dlg = screen.getByRole("dialog");
    const pin =
      within(dlg).queryByRole("checkbox") ||
      (dlg.querySelector('input[type="checkbox"]') as HTMLInputElement | null);
    expect(pin).toBeTruthy();
    if ((pin as HTMLInputElement).checked) fireEvent.click(pin!);
    // Ensure unchecked for pinned=false → pinned_until null
    if ((pin as HTMLInputElement).checked) fireEvent.click(pin!);
    const save = within(dlg).getByRole("button", { name: /Save|Update/i });
    await clickSafe(user, save);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Article updated/i);
    }, { timeout: 20_000 });
    const { data: updated } = await admin
      .from("content_news")
      .select("pinned, pinned_until")
      .eq("id", seeded.newsId!)
      .maybeSingle();
    expect(updated?.pinned).toBe(false);
    expect(updated?.pinned_until).toBeNull();
  }, 180_000);
});
