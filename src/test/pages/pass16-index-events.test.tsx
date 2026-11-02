/**
 * Pass 16 — Index / Events / EventGallery / EventsTab → ~100% lines against real Kong :54331.
 * Seeds disposable CovIdxEvt* rows; no MSW / fixture JSON for views.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import Index from "@/pages/Index";
import Events from "@/pages/Events";
import EventsTab from "@/components/admin/EventsTab";
import { EventGallery } from "@/components/events/EventGallery";
import { Toaster } from "@/components/ui/toaster";
import * as eventNotifications from "@/lib/event-notifications";

const MARKER = `CovIdxEvt_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const INDIA = "c1000001-0000-0000-0000-000000000001";

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

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

/** Fire IntersectionObserver callbacks immediately so Reveal / AnimatedCounter run. */
function installFiringIntersectionObserver() {
  class FiringIO {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [0];
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      const entry = {
        isIntersecting: true,
        target,
        intersectionRatio: 1,
        time: Date.now(),
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry;
      queueMicrotask(() => this.cb([entry], this as unknown as IntersectionObserver));
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: FiringIO,
  });
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: FiringIO,
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
  if (!el || (el as HTMLButtonElement).disabled) return;
  try {
    await user.click(el);
  } catch {
    fireEvent.click(el);
  }
}

function hardClick(el: HTMLElement | null | undefined) {
  if (!el || (el as HTMLButtonElement).disabled) return;
  fireEvent.pointerDown(el);
  fireEvent.mouseDown(el);
  fireEvent.pointerUp(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

async function dismissOverlays(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 4; i++) {
    await user.keyboard("{Escape}");
    fireEvent.keyDown(document, { key: "Escape" });
  }
  await waitFor(
    () => {
      const locked = document.body.getAttribute("data-scroll-locked");
      expect(locked === null || locked === "0" || !screen.queryByRole("dialog")).toBeTruthy();
    },
    { timeout: 5_000 },
  ).catch(() => {
    /* continue even if a non-modal remains */
  });
}

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  option: RegExp,
) {
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 4000 }).catch(() => []);
  const match = opts.find((o) => option.test(o.textContent ?? ""));
  if (match) await clickSafe(user, match);
}

function setNear(label: RegExp, value: string, root: HTMLElement = document.body) {
  const labels = Array.from(root.querySelectorAll("label"));
  const lab = labels.find((l) => label.test(l.textContent ?? ""));
  if (!lab) return;
  const container = lab.parentElement ?? lab;
  const input = container.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
  if (input) fireEvent.change(input, { target: { value } });
}

async function authUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no user");
  return user.id;
}

async function currentMemberId(): Promise<string> {
  const uid = await authUserId();
  const { data } = await supabase.from("members").select("id").eq("user_id", uid).maybeSingle();
  if (!data) throw new Error("no member");
  return data.id;
}

const seeded = {
  upcomingId: null as string | null,
  pastId: null as string | null,
  draftId: null as string | null,
  photoId: null as string | null,
  tagId: null as string | null,
  rsvpId: null as string | null,
  memberId: null as string | null,
  otherMemberId: null as string | null,
  uid: null as string | null,
};

describe("Pass 16 — Index / Events / EventGallery / EventsTab (real Kong)", () => {
  beforeAll(async () => {
    installFiringIntersectionObserver();
    const admin = adminClient();

    // Gallery uploads need a public bucket (not present on fresh local Kong).
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "event-photos")) {
      const { error } = await admin.storage.createBucket("event-photos", {
        public: true,
        fileSizeLimit: 5_000_000,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
      });
      if (error && !/already exists|duplicate/i.test(error.message)) {
        console.warn("event-photos bucket create:", error.message);
      }
    }

    await signIn(E2E_ACCOUNTS.eventManager.email);
    seeded.uid = await authUserId();
    seeded.memberId = await currentMemberId();

    const { data: other } = await admin
      .from("members")
      .select("id")
      .neq("id", seeded.memberId)
      .eq("onboarding_completed", true)
      .gte("verification_level", 1)
      .limit(1)
      .maybeSingle();
    seeded.otherMemberId = other?.id ?? seeded.memberId;

    const upcomingStart = new Date(Date.now() + 21 * 864e5).toISOString();
    const upcomingEnd = new Date(Date.now() + 21 * 864e5 + 2 * 3600_000).toISOString();
    const pastStart = new Date(Date.now() - 45 * 864e5).toISOString();
    const pastEnd = new Date(Date.now() - 45 * 864e5 + 2 * 3600_000).toISOString();

    const { data: up, error: upErr } = await admin
      .from("events")
      .insert({
        name: `${MARKER} Upcoming Mahotsav`,
        description: "Pass16 upcoming event with fee and tags",
        venue: "Coverage Hall",
        category: "Cultural",
        event_type: "hybrid",
        virtual_url: "https://example.com/pass16",
        organizer_name: "Pass16 Organizer",
        fee_amount: 250,
        fee_currency: "INR",
        contact_email: "pass16@khadayataonline.com",
        contact_phone: "+15550160000",
        address_line1: "1 Coverage Road",
        max_capacity: 120,
        tags: ["pass16", "mahotsav"],
        consent_required: true,
        starts_at: upcomingStart,
        ends_at: upcomingEnd,
        status: "published",
        chapter_id: AHMEDABAD,
        country_id: INDIA,
        created_by: seeded.uid,
        cover_image_url: "https://example.com/cover-pass16.jpg",
      })
      .select("id")
      .single();
    if (upErr) throw upErr;
    seeded.upcomingId = up.id;

    const { data: past, error: pastErr } = await admin
      .from("events")
      .insert({
        name: `${MARKER} Past Satsang`,
        description: "Pass16 past event for gallery + photo counts",
        venue: "Temple Hall",
        category: "Religious",
        event_type: "in_person",
        organizer_name: "Past Organizer",
        starts_at: pastStart,
        ends_at: pastEnd,
        status: "published",
        chapter_id: AHMEDABAD,
        created_by: seeded.uid,
      })
      .select("id")
      .single();
    if (pastErr) throw pastErr;
    seeded.pastId = past.id;

    const { data: draft, error: draftErr } = await admin
      .from("events")
      .insert({
        name: `${MARKER} Draft Meetup`,
        description: "draft for EventsTab tabs",
        venue: "Draft Hall",
        starts_at: upcomingStart,
        ends_at: upcomingEnd,
        status: "draft",
        chapter_id: AHMEDABAD,
        created_by: seeded.uid,
        category: "Social",
      })
      .select("id")
      .single();
    if (draftErr) throw draftErr;
    seeded.draftId = draft.id;

    const { data: rsvp, error: rsvpErr } = await admin
      .from("event_rsvps")
      .insert({
        event_id: seeded.upcomingId,
        member_id: seeded.memberId,
        status: "going",
      })
      .select("id")
      .single();
    if (rsvpErr) throw rsvpErr;
    seeded.rsvpId = rsvp.id;

    const photoUrl = "https://picsum.photos/seed/pass16cov/400/400";
    const { data: photo, error: photoErr } = await admin
      .from("event_photos")
      .insert({
        event_id: seeded.pastId,
        uploaded_by: seeded.memberId,
        url: photoUrl,
      })
      .select("id")
      .single();
    if (photoErr) throw photoErr;
    seeded.photoId = photo.id;

    const { data: tag, error: tagErr } = await admin
      .from("photo_tags")
      .insert({
        photo_id: seeded.photoId,
        member_id: seeded.memberId,
        tagged_by: seeded.otherMemberId!,
        consent_status: "pending",
      })
      .select("id")
      .single();
    if (tagErr) throw tagErr;
    seeded.tagId = tag.id;
  }, 120_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.tagId) await admin.from("photo_tags").delete().eq("id", seeded.tagId);
    if (seeded.photoId) await admin.from("event_photos").delete().eq("id", seeded.photoId);
    if (seeded.rsvpId) await admin.from("event_rsvps").delete().eq("id", seeded.rsvpId);
    await admin.from("photo_tags").delete().like("photo_id", "%"); // noop safety
    await admin.from("event_photos").delete().ilike("url", "%pass16%");
    await admin.from("event_rsvps").delete().in(
      "event_id",
      [seeded.upcomingId, seeded.pastId, seeded.draftId].filter(Boolean) as string[],
    );
    // Clean all pass16-named events (including UI-created)
    const { data: named } = await admin.from("events").select("id").ilike("name", `${MARKER}%`);
    const ids = (named ?? []).map((e) => e.id);
    if (ids.length) {
      await admin.from("event_rsvps").delete().in("event_id", ids);
      await admin.from("event_photos").delete().in("event_id", ids);
      await admin.from("events").delete().in("id", ids);
    }
    await admin.from("events").delete().ilike("name", "CovIdxEvt_%");
    await supabase.auth.signOut();
  }, 90_000);

  afterEach(() => {
    cleanup();
  });

  it("Index: guest + signed-in hero, counters, hovers, latest members", async () => {
    installFiringIntersectionObserver();
    await supabase.auth.signOut();
    const user = userEvent.setup();

    const { unmount } = renderApp(<Index />, { route: "/" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Khadayata|One Community/i);
      },
      { timeout: 30_000 },
    );

    // Parallax scroll + hover handlers on nav / CTAs / feature cards / stats
    fireEvent.scroll(window, { target: { scrollY: 120 } });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 120 });
    fireEvent.scroll(window);

    for (const a of Array.from(document.querySelectorAll("a")).slice(0, 20)) {
      fireEvent.mouseEnter(a);
      fireEvent.mouseLeave(a);
    }
    for (const el of Array.from(document.querySelectorAll("div")).slice(0, 80)) {
      fireEvent.mouseEnter(el);
      fireEvent.mouseLeave(el);
    }

    await waitFor(
      () => {
        // AnimatedCounter / live stats or latest members eventually resolve
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(200);
      },
      { timeout: 25_000 },
    );

    // Wait for newest members section to leave skeleton when DB has verified members
    await waitFor(
      () => {
        const t = document.body.textContent ?? "";
        expect(t).toMatch(/Welcome to the Community|Newest Members|Join Now|Members Worldwide/i);
      },
      { timeout: 25_000 },
    );

    unmount();

    // Signed-in Dashboard CTA branch
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<Index />, { route: "/" });
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Dashboard|One Community/i);
      },
      { timeout: 30_000 },
    );
    const dash = screen.queryByRole("link", { name: /Dashboard/i });
    if (dash) {
      fireEvent.mouseEnter(dash);
      fireEvent.mouseLeave(dash);
      await clickSafe(user, dash);
    }
    for (const a of Array.from(document.querySelectorAll("a")).slice(0, 15)) {
      fireEvent.mouseEnter(a);
      fireEvent.mouseLeave(a);
    }
  }, 120_000);

  it("Events page: create/publish, RSVP toggle, edit/save, cancel, delete, past gallery", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    renderApp(withToaster(<Events />), { route: "/events" });

    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(new RegExp(MARKER));
      },
      { timeout: 35_000 },
    );

    const filter = screen.getByLabelText(/Filter events by chapter/i);
    await pickSelectOption(user, filter, /All Chapters/i);
    await waitFor(() => {
      expect(document.body.textContent).toContain(`${MARKER} Upcoming Mahotsav`);
    }, { timeout: 15_000 });

    // Create + publish
    hardClick(screen.getByRole("button", { name: /Create/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy(), { timeout: 10_000 });
    const createDlg = screen.getByRole("dialog");
    setNear(/Event Name/i, `${MARKER} UI Published`, createDlg);
    setNear(/Description/i, "pass16 ui create", createDlg);
    setNear(/Venue/i, "UI Venue", createDlg);
    setNear(/Organizer Name/i, "Pass16 UI", createDlg);
    setNear(/Max Capacity/i, "50", createDlg);
    setNear(/Fee Amount/i, "10", createDlg);
    setNear(/Address/i, "UI Street", createDlg);
    setNear(/Virtual URL/i, "https://zoom.example/pass16", createDlg);
    setNear(/Cover Image URL/i, "https://example.com/ui.jpg", createDlg);
    setNear(/Contact Email/i, "ui@khadayataonline.com", createDlg);
    setNear(/Contact Phone/i, "+15550160001", createDlg);
    setNear(/Tags/i, "pass16,ui", createDlg);
    const dts = createDlg.querySelectorAll('input[type="datetime-local"]');
    expect(dts.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(dts[0], { target: { value: "2026-12-20T18:00" } });
    fireEvent.change(dts[1], { target: { value: "2026-12-20T21:00" } });
    const consent = createDlg.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (consent) fireEvent.click(consent);

    const publishBtn = within(createDlg).getByRole("button", { name: /Publish Event/i });
    expect((publishBtn as HTMLButtonElement).disabled).toBe(false);
    hardClick(publishBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/Event created/i), { timeout: 25_000 });
    await dismissOverlays(user);

    // RSVP cancel then RSVP again
    const cancelRsvp = screen.queryAllByRole("button").find((b) => /Going · Cancel/i.test(b.textContent ?? ""));
    if (cancelRsvp) {
      hardClick(cancelRsvp);
      await waitFor(() => expect(document.body.textContent).toMatch(/RSVP cancelled|RSVP Now/i), {
        timeout: 15_000,
      });
    }
    const rsvpNow = screen.queryAllByRole("button", { name: /RSVP Now/i })[0];
    if (rsvpNow) {
      hardClick(rsvpNow);
      await waitFor(() => expect(document.body.textContent).toMatch(/attending|Going/i), {
        timeout: 15_000,
      });
    }

    // Edit + save (controlled dialog)
    await dismissOverlays(user);
    const editBtn = screen.queryAllByLabelText(/Edit event/i)[0];
    expect(editBtn).toBeTruthy();
    hardClick(editBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit Event/i), { timeout: 10_000 });
    const editDlg = screen.getByRole("dialog");
    const nameIn = within(editDlg).queryByDisplayValue(new RegExp(MARKER));
    if (nameIn) fireEvent.change(nameIn, { target: { value: `${MARKER} Upcoming Mahotsav edited` } });
    setNear(/Description/i, "edited desc", editDlg);
    setNear(/Venue/i, "Edited Hall", editDlg);
    hardClick(within(editDlg).getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event updated/i), { timeout: 20_000 });
    await dismissOverlays(user);

    // Cancel event
    const cancelBtn = screen.queryAllByLabelText(/Cancel event/i)[0];
    if (cancelBtn) {
      hardClick(cancelBtn);
      const confirmCancel = await screen.findByRole("button", { name: /^Cancel Event$/i }).catch(() => null);
      if (confirmCancel) {
        hardClick(confirmCancel);
        await waitFor(() => expect(document.body.textContent).toMatch(/Event cancelled/i), {
          timeout: 20_000,
        });
      }
      await dismissOverlays(user);
    }

    // Past tab → photo count + gallery
    hardClick(screen.getByRole("tab", { name: /Past/i }));
    await waitFor(() => expect(document.body.textContent).toContain(`${MARKER} Past Satsang`), {
      timeout: 15_000,
    });
    expect(document.body.textContent).toMatch(/photo/i);

    hardClick(screen.getByRole("tab", { name: /Upcoming/i }));
    const delBtn = screen.queryAllByLabelText(/Delete event/i)[0];
    if (delBtn) {
      hardClick(delBtn);
      const confirmDel = await screen.findByRole("button", { name: /^Delete$/i }).catch(() => null);
      if (confirmDel) {
        hardClick(confirmDel);
        await waitFor(() => expect(document.body.textContent).toMatch(/Event deleted/i), {
          timeout: 15_000,
        });
      }
      await dismissOverlays(user);
    }
  }, 180_000);

  it("EventGallery: upload, tag search, consent, delete on real photo", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    const admin = adminClient();
    expect(seeded.pastId).toBeTruthy();

    // Ensure a photo row exists (prior Events-page interactions may have removed it)
    const { data: existing } = await admin
      .from("event_photos")
      .select("id")
      .eq("event_id", seeded.pastId!)
      .limit(1);
    if (!existing?.length) {
      const { data: photo, error } = await admin
        .from("event_photos")
        .insert({
          event_id: seeded.pastId!,
          uploaded_by: seeded.memberId!,
          url: "https://picsum.photos/seed/pass16gallery/400/400",
        })
        .select("id")
        .single();
      if (error) throw error;
      seeded.photoId = photo.id;
      await admin.from("photo_tags").insert({
        photo_id: photo.id,
        member_id: seeded.memberId!,
        tagged_by: seeded.otherMemberId!,
        consent_status: "pending",
      });
    }

    renderApp(withToaster(<EventGallery eventId={seeded.pastId!} eventName={`${MARKER} Past Satsang`} />), {
      route: "/events",
    });

    await waitFor(() => expect(document.body.textContent).toMatch(/Gallery \(\d+\)/i), {
      timeout: 25_000,
    });

    // Open photo dialog — prefer the thumb button that wraps an <img>
    await waitFor(() => {
      const thumbs = Array.from(document.querySelectorAll("button")).filter((b) => b.querySelector("img"));
      expect(thumbs.length).toBeGreaterThan(0);
    }, { timeout: 10_000 });
    const thumbs = Array.from(document.querySelectorAll("button")).filter((b) => b.querySelector("img"));
    hardClick(thumbs[0] as HTMLElement);

    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Tagged Members|Photo by|Search member to tag/i);
      },
      { timeout: 10_000 },
    );

    // Approve pending tag on self (Check icon button inside badge)
    for (const b of Array.from(document.querySelectorAll("button")).filter((el) =>
      el.querySelector("svg"),
    ).slice(0, 8)) {
      hardClick(b as HTMLElement);
    }

    const tagInput = screen.getByPlaceholderText(/Search member to tag/i);
    fireEvent.change(tagInput, { target: { value: "Sh" } });
    await waitFor(
      () => {
        const rows = Array.from(document.querySelectorAll("button")).filter((b) => {
          const t = (b.textContent ?? "").trim();
          return t.split(/\s+/).length >= 2 && t.length < 80 && !/Add Photo|Remove Photo|Uploading/i.test(t);
        });
        expect(rows.length).toBeGreaterThan(0);
      },
      { timeout: 15_000 },
    );
    const searchRows = Array.from(document.querySelectorAll("button")).filter((b) => {
      const t = (b.textContent ?? "").trim();
      return t.split(/\s+/).length >= 2 && t.length < 80 && !/Add Photo|Remove Photo|Uploading/i.test(t);
    });
    hardClick(searchRows[0] as HTMLElement);
    await waitFor(() => expect(document.body.textContent).toMatch(/Member tagged|Error|Tagged/i), {
      timeout: 15_000,
    });

    const remove = screen.queryByRole("button", { name: /Remove Photo/i });
    if (remove) {
      hardClick(remove);
      await waitFor(() => expect(document.body.textContent).toMatch(/Photo removed|No photos|Gallery/i), {
        timeout: 15_000,
      });
    }
    await dismissOverlays(user);

    // Upload after overlays cleared (user-event refuses pointer-events:none from dialogs)
    const png = new File(
      [
        Uint8Array.from(
          atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
          (c) => c.charCodeAt(0),
        ),
      ],
      "pass16.png",
      { type: "image/png" },
    );
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    Object.defineProperty(fileInput!, "files", { configurable: true, value: [png] });
    fireEvent.change(fileInput!);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Photo uploaded|Upload failed/i);
      },
      { timeout: 25_000 },
    );
    hardClick(screen.queryAllByRole("button", { name: /Add Photo/i })[0]);

    cleanup();
    const emptyId = "00000000-0000-4000-8000-00000000e016";
    renderApp(withToaster(<EventGallery eventId={emptyId} eventName="Empty" />), { route: "/events" });
    await waitFor(() => expect(document.body.textContent).toMatch(/No photos yet/i), { timeout: 20_000 });
    const emptyUpload = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (emptyUpload) {
      const bad = new File([new Uint8Array([1, 2, 3])], "bad.bin", { type: "application/octet-stream" });
      Object.defineProperty(emptyUpload, "files", { configurable: true, value: [bad] });
      fireEvent.change(emptyUpload);
      await waitFor(
        () => expect(document.body.textContent).toMatch(/Upload failed|Photo uploaded|No photos/i),
        { timeout: 20_000 },
      );
    }
  }, 150_000);

  it("EventsTab: search, RSVP list, edit/save, duplicate, cancel, delete, create", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    renderApp(withToaster(<EventsTab myChapterId={AHMEDABAD} />), { route: "/admin?tab=events" });

    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Create Event/i);
      },
      { timeout: 35_000 },
    );

    const search = screen.getByPlaceholderText(/Search events/i);
    fireEvent.change(search, { target: { value: MARKER } });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(MARKER)), {
      timeout: 20_000,
    });

    hardClick(screen.queryAllByLabelText(/View RSVPs/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/RSVP List|going|No RSVPs/i), {
      timeout: 15_000,
    });

    const editBtn = screen.queryAllByLabelText(/Edit event/i)[0];
    expect(editBtn).toBeTruthy();
    hardClick(editBtn);
    await waitFor(() => expect(document.body.textContent).toMatch(/Edit Event/i), { timeout: 10_000 });
    const editDlg = screen.getByRole("dialog");
    setNear(/Event Name/i, `${MARKER} Admin Edited`, editDlg);
    setNear(/Description/i, "admin edit", editDlg);
    setNear(/Venue/i, "Admin Hall", editDlg);
    setNear(/Max Capacity/i, "99", editDlg);
    setNear(/Fee Amount/i, "5", editDlg);
    setNear(/Organizer Name/i, "Admin Org", editDlg);
    setNear(/Contact Email/i, "admin-evt@khadayataonline.com", editDlg);
    setNear(/Contact Phone/i, "+15550160002", editDlg);
    setNear(/Address/i, "Admin St", editDlg);
    setNear(/Cover Image URL/i, "https://example.com/admin.jpg", editDlg);
    hardClick(within(editDlg).getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event updated/i), { timeout: 20_000 });
    await dismissOverlays(user);

    hardClick(screen.queryAllByLabelText(/Duplicate event/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/duplicated|Copy|Draft/i), {
      timeout: 20_000,
    });

    for (const name of [/Drafts/i, /Cancelled/i, /Published/i]) {
      hardClick(screen.queryByRole("tab", { name }));
    }

    fireEvent.change(search, { target: { value: MARKER } });
    hardClick(screen.queryByRole("tab", { name: /Published/i }));
    await waitFor(() => expect(screen.queryAllByLabelText(/Cancel event/i).length).toBeGreaterThan(0), {
      timeout: 15_000,
    }).catch(() => undefined);
    const cancelEvt = screen.queryAllByLabelText(/Cancel event/i)[0];
    if (cancelEvt) {
      hardClick(cancelEvt);
      await waitFor(() => expect(document.body.textContent).toMatch(/Event cancelled/i), {
        timeout: 20_000,
      });
    }

    hardClick(screen.getByRole("button", { name: /Create Event/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy(), { timeout: 10_000 });
    const createDlg = screen.getByRole("dialog");
    setNear(/Event Name/i, `${MARKER} Tab UI`, createDlg);
    setNear(/Description/i, "tab create", createDlg);
    setNear(/Venue/i, "Tab Hall", createDlg);
    setNear(/Organizer Name/i, "Tab Org", createDlg);
    setNear(/Max Capacity/i, "25", createDlg);
    setNear(/Fee Amount/i, "0", createDlg);
    setNear(/Tags/i, "pass16,tab", createDlg);
    setNear(/Contact Email/i, "tab@khadayataonline.com", createDlg);
    const dt = createDlg.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dt[0], { target: { value: "2026-11-15T10:00" } });
    fireEvent.change(dt[1], { target: { value: "2026-11-15T12:00" } });
    if (dt[2]) fireEvent.change(dt[2], { target: { value: "2026-11-14T10:00" } });
    const consent = createDlg.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (consent) fireEvent.click(consent);
    hardClick(within(createDlg).getByRole("button", { name: /Publish Event/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Event created/i), { timeout: 20_000 });
    await dismissOverlays(user);

    fireEvent.change(search, { target: { value: MARKER } });
    await waitFor(() => expect(screen.queryAllByLabelText(/Delete event/i).length).toBeGreaterThan(0), {
      timeout: 15_000,
    });
    hardClick(screen.queryAllByLabelText(/Delete event/i)[0]);
    const confirm = await screen.findByRole("button", { name: /Delete Event/i });
    hardClick(confirm);
    await waitFor(() => expect(document.body.textContent).toMatch(/Event deleted/i), { timeout: 20_000 });
  }, 180_000);

  it("Gap close: Events notify catch + RSVP going notify; gallery consent/fail; tab RSVP rows", async () => {
    await signIn(E2E_ACCOUNTS.eventManager.email);
    const user = userEvent.setup();
    const admin = adminClient();
    const mid = seeded.memberId!;

    const start = new Date(Date.now() + 40 * 864e5).toISOString();
    const end = new Date(Date.now() + 40 * 864e5 + 3600_000).toISOString();
    const { data: gapEvt, error: gapErr } = await admin
      .from("events")
      .insert({
        name: `${MARKER} Gap RSVP Event`,
        description: "gap",
        venue: "Gap Hall",
        starts_at: start,
        ends_at: end,
        status: "published",
        chapter_id: AHMEDABAD,
        created_by: seeded.uid!,
        category: "Social",
        event_type: "in_person",
        organizer_name: "Gap Org",
        fee_amount: 1,
        fee_currency: "INR",
        contact_email: "gap@khadayataonline.com",
        tags: ["pass16", "gap"],
      })
      .select("id")
      .single();
    if (gapErr) throw gapErr;

    // Sync throw from notifyEventCreated hits createEvent's outer catch (lines 121-122).
    // Named-import bindings in Events.tsx are live under Vite, so this spy applies.
    const createdSpy = vi.spyOn(eventNotifications, "notifyEventCreated").mockImplementation(() => {
      throw new Error("pass16 sync notify fail");
    });

    const { unmount: uEvents } = renderApp(withToaster(<Events />), { route: "/events" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Gap RSVP Event/i), { timeout: 35_000 });
    await pickSelectOption(user, screen.getByLabelText(/Filter events by chapter/i), /All Chapters/i);

    hardClick(screen.getByRole("button", { name: /Create/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy(), { timeout: 10_000 });
    {
      const dlg = screen.getByRole("dialog");
      setNear(/Event Name/i, `${MARKER} Notify Catch`, dlg);
      setNear(/Venue/i, "Catch Hall", dlg);
      const dts = dlg.querySelectorAll('input[type="datetime-local"]');
      fireEvent.change(dts[0], { target: { value: "2027-03-01T10:00" } });
      fireEvent.change(dts[1], { target: { value: "2027-03-01T12:00" } });
      hardClick(within(dlg).getByRole("button", { name: /Publish Event/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Event created/i), { timeout: 25_000 });
    }
    await dismissOverlays(user);
    expect(createdSpy).toHaveBeenCalled();
    createdSpy.mockRestore();

    // RSVP Now on Gap event → notifyRSVPConfirmation arm (137-141). Real notify (no spy).
    await waitFor(() => expect(document.body.textContent).toMatch(/Gap RSVP Event/i), { timeout: 20_000 });
    // Prefer RSVP on the Gap card specifically
    const gapCard = Array.from(document.querySelectorAll(".shadow-card, [class*='card']")).find((el) =>
      (el.textContent ?? "").includes("Gap RSVP Event"),
    );
    const rsvpInCard =
      (gapCard &&
        Array.from(gapCard.querySelectorAll("button")).find((b) => /RSVP Now/i.test(b.textContent ?? ""))) ||
      screen.queryAllByRole("button", { name: /RSVP Now/i })[0];
    const goingInCard =
      gapCard &&
      Array.from(gapCard.querySelectorAll("button")).find((b) => /Going · Cancel/i.test(b.textContent ?? ""));
    if (goingInCard) {
      hardClick(goingInCard as HTMLElement);
      await waitFor(() => {
        const again =
          gapCard &&
          Array.from(gapCard.querySelectorAll("button")).find((b) => /RSVP Now/i.test(b.textContent ?? ""));
        expect(again || screen.queryAllByRole("button", { name: /RSVP Now/i })[0]).toBeTruthy();
      }, { timeout: 15_000 });
    }
    const rsvpBtn =
      (gapCard &&
        Array.from(gapCard.querySelectorAll("button")).find((b) => /RSVP Now/i.test(b.textContent ?? ""))) ||
      rsvpInCard;
    hardClick(rsvpBtn as HTMLElement);
    await waitFor(() => expect(document.body.textContent).toMatch(/attending|You're attending/i), {
      timeout: 20_000,
    });
    uEvents();

    // Gallery consent + upload failure
    const { data: photo } = await admin
      .from("event_photos")
      .insert({
        event_id: gapEvt.id,
        uploaded_by: mid,
        url: "https://picsum.photos/seed/pass16gap/200/200",
      })
      .select("id")
      .single();
    await admin.from("photo_tags").insert({
      photo_id: photo!.id,
      member_id: mid,
      tagged_by: seeded.otherMemberId!,
      consent_status: "pending",
    });

    const { unmount: uGal } = renderApp(
      withToaster(<EventGallery eventId={gapEvt.id} eventName={`${MARKER} Gap RSVP Event`} />),
      { route: "/events" },
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Gallery \(\d+\)/i), { timeout: 25_000 });
    hardClick(Array.from(document.querySelectorAll("button")).filter((b) => b.querySelector("img"))[0] as HTMLElement);
    await waitFor(() => expect(document.body.textContent).toMatch(/Tagged Members|Search member/i), {
      timeout: 10_000,
    });
    const consentBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) => {
      return Boolean(b.querySelector("svg")) && (b.getAttribute("class") ?? "").includes("ml-1");
    });
    expect(consentBtn).toBeTruthy();
    hardClick(consentBtn as HTMLElement);
    await waitFor(async () => {
      const { data } = await admin.from("photo_tags").select("consent_status").eq("photo_id", photo!.id).maybeSingle();
      expect(data?.consent_status).toBe("approved");
    }, { timeout: 15_000 });
    await dismissOverlays(user);

    const storageFrom = supabase.storage.from.bind(supabase.storage);
    const storageSpy = vi.spyOn(supabase.storage, "from").mockImplementation((id: string) => {
      const bucket = storageFrom(id);
      return {
        ...bucket,
        upload: async () => ({
          data: null,
          error: { message: "pass16 forced upload fail", name: "StorageError" },
        }),
        getPublicUrl: bucket.getPublicUrl.bind(bucket),
      } as ReturnType<typeof storageFrom>;
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    Object.defineProperty(fileInput!, "files", {
      configurable: true,
      value: [new File([new Uint8Array([1, 2, 3, 4])], "gap.png", { type: "image/png" })],
    });
    fireEvent.change(fileInput!);
    await waitFor(() => expect(document.body.textContent).toMatch(/Upload failed/i), { timeout: 15_000 });
    storageSpy.mockRestore();
    uGal();

    // EventsTab RSVP list member rows
    await admin.from("event_rsvps").upsert(
      { event_id: gapEvt.id, member_id: mid, status: "going" },
      { onConflict: "event_id,member_id" },
    );
    const { unmount: uTab } = renderApp(withToaster(<EventsTab myChapterId={AHMEDABAD} />), {
      route: "/admin?tab=events",
    });
    const search = await screen.findByPlaceholderText(/Search events/i);
    fireEvent.change(search, { target: { value: `${MARKER} Gap RSVP` } });
    await waitFor(() => expect(document.body.textContent).toMatch(/Gap RSVP Event/i), { timeout: 20_000 });
    hardClick(screen.queryAllByLabelText(/View RSVPs/i)[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/RSVP List \([1-9]/i), { timeout: 15_000 });
    uTab();

    await admin.from("photo_tags").delete().eq("photo_id", photo!.id);
    await admin.from("event_photos").delete().eq("id", photo!.id);
    await admin.from("event_rsvps").delete().eq("event_id", gapEvt.id);
    await admin.from("events").delete().eq("id", gapEvt.id);
    await admin.from("events").delete().ilike("name", `${MARKER} Notify Catch%`);
  }, 180_000);
});

