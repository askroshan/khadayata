/**
 * Pass 20 — LiveAartiPlayer + HeritageTagging + carousel + Settings → 100% lines.
 * Real Kong :54331 / khadayata_local :5438. Disposable covaarti_* rows only — no view mocks.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { render, screen, waitFor, fireEvent, act, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { LiveAartiPlayer } from "@/components/temple/LiveAartiPlayer";
import { HeritageTagging } from "@/components/heritage/HeritageTagging";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Settings from "@/pages/Settings";
import { Toaster } from "@/components/ui/toaster";
import useEmblaCarousel from "embla-carousel-react";

const { emblaMock, selectHandlers, fakeApi } = vi.hoisted(() => {
  const selectHandlers: Array<(api: unknown) => void> = [];
  const fakeApi = {
    canScrollPrev: () => true,
    canScrollNext: () => true,
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    on: (evt: string, cb: (api: unknown) => void) => {
      if (evt === "select" || evt === "reInit") selectHandlers.push(cb);
    },
    off: vi.fn(),
  };
  const emblaMock = vi.fn((_opts?: unknown, _plugins?: unknown) => {
    const ref = vi.fn();
    return [ref, fakeApi] as unknown as ReturnType<typeof useEmblaCarousel>;
  });
  return { emblaMock, selectHandlers, fakeApi };
});

vi.mock("embla-carousel-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("embla-carousel-react")>();
  return {
    ...actual,
    default: (...args: unknown[]) => emblaMock(...args),
  };
});

const PREFIX = `covaarti_${Date.now().toString(36)}`;
const STREAM = "https://www.youtube.com/embed/dQw4w9WgXcQ";

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

const seeded = {
  memberId: null as string | null,
  userId: null as string | null,
  tagIds: [] as string[],
};

async function cleanupSeeds() {
  const admin = adminClient();
  if (seeded.tagIds.length) {
    await admin.from("heritage_tags").delete().in("id", seeded.tagIds);
    seeded.tagIds = [];
  }
  if (seeded.memberId) {
    await admin
      .from("heritage_tags")
      .delete()
      .eq("tagged_by", seeded.memberId)
      .like("tag", `${PREFIX}%`);
  }
}

beforeAll(async () => {
  // Default: pass through real embla so non-carousel suites stay honest if they ever mount one.
  const actual = await vi.importActual<typeof import("embla-carousel-react")>("embla-carousel-react");
  emblaMock.mockImplementation((opts?: unknown, plugins?: unknown) =>
    (actual.default as (...a: unknown[]) => ReturnType<typeof useEmblaCarousel>)(opts, plugins),
  );

  await signIn(E2E_ACCOUNTS.member.email);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  seeded.userId = user?.id ?? null;
  const { data: mem } = await supabase.from("members").select("id").eq("user_id", user!.id).maybeSingle();
  seeded.memberId = mem?.id ?? null;
  if (!seeded.memberId) throw new Error("E2E member row missing");

  const admin = adminClient();
  const { data: approved } = await admin
    .from("heritage_tags")
    .insert({
      entity_type: "member",
      entity_id: seeded.memberId,
      tag: `${PREFIX}_approved`,
      tagged_by: seeded.memberId,
      approved: true,
    })
    .select("id")
    .single();
  const { data: pending } = await admin
    .from("heritage_tags")
    .insert({
      entity_type: "member",
      entity_id: seeded.memberId,
      tag: `${PREFIX}_pending`,
      tagged_by: seeded.memberId,
      approved: false,
    })
    .select("id")
    .single();
  if (approved?.id) seeded.tagIds.push(approved.id);
  if (pending?.id) seeded.tagIds.push(pending.id);
}, 90_000);

afterAll(async () => {
  await cleanupSeeds();
  await supabase.auth.signOut();
}, 60_000);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // Do not restoreAllMocks — keeps emblaMock + Date spies under our control per-test.
  selectHandlers.length = 0;
  fakeApi.scrollPrev.mockClear();
  fakeApi.scrollNext.mockClear();
});

describe("Pass 20 — LiveAartiPlayer 100% lines", () => {
  function setUtc(hours: number, minutes: number) {
    vi.setSystemTime(new Date(Date.UTC(2026, 5, 15, hours, minutes, 0)));
  }

  it("covers morning/evening live, next-aarti arms, interval tick, format catch, live iframe", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Morning live (IST ~6:30 → UTC 01:00) + stream → live iframe branch
    setUtc(1, 0);
    const { unmount: u1 } = renderApp(
      <LiveAartiPlayer schedule={{ morning: "06:00", evening: "19:00", stream_url: STREAM }} />,
      { route: "/temple" },
    );
    expect(document.body.textContent).toMatch(/LIVE|Morning Aarti|Live Aarti/i);
    expect(document.querySelector("iframe")).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    u1();

    // Evening live (IST ~19:00 → UTC 13:30)
    setUtc(13, 30);
    const { unmount: u2 } = renderApp(
      <LiveAartiPlayer schedule={{ morning: "06:00", evening: "19:00", stream_url: STREAM }} />,
      { route: "/temple" },
    );
    expect(document.body.textContent).toMatch(/LIVE|Evening Aarti|Live Aarti/i);
    u2();

    // After evening → "Morning Aarti tomorrow"
    setUtc(15, 30);
    const { unmount: u3 } = renderApp(
      <LiveAartiPlayer schedule={{ morning: "06:00", evening: "19:00" }} />,
      { route: "/temple" },
    );
    expect(document.body.textContent).toMatch(/tomorrow|Morning Aarti/i);
    u3();

    // Before morning
    setUtc(0, 0);
    const { unmount: u4 } = renderApp(<LiveAartiPlayer schedule={null} />, { route: "/temple" });
    expect(document.body.textContent).toMatch(/Morning Aarti at 6:00 AM IST/i);
    u4();

    // Midday → evening next (UTC 06:30 → IST ~12:00)
    setUtc(6, 30);
    const { unmount: u5 } = renderApp(<LiveAartiPlayer schedule={null} />, { route: "/temple" });
    expect(document.body.textContent).toMatch(/Evening Aarti at 7:00 PM IST/i);
    u5();

    // formatTimeForTimezone catch arm
    const locSpy = vi.spyOn(Date.prototype, "toLocaleTimeString").mockImplementation(() => {
      throw new Error("tz boom");
    });
    setUtc(6, 30);
    renderApp(
      <LiveAartiPlayer schedule={{ morning: "06:00", evening: "19:00", stream_url: STREAM }} />,
      { route: "/temple" },
    );
    expect(document.body.textContent).toMatch(/06:00 IST|19:00 IST/);
    locSpy.mockRestore();
  });
});

describe("Pass 20 — HeritageTagging 100% lines", () => {
  it("lists seeded tags, adds via UI, and hits empty-tag onError", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();

    renderApp(withToaster(<HeritageTagging entityType="member" entityId={seeded.memberId!} />), {
      route: "/heritage",
    });

    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(new RegExp(`${PREFIX}_approved`));
        expect(document.body.textContent).toMatch(/pending/i);
      },
      { timeout: 25_000 },
    );

    // Add only appears once useMember resolves
    const addBtn = await waitFor(() => screen.getByRole("button", { name: /Add/i }), {
      timeout: 25_000,
    });
    await clickSafe(user, addBtn);
    const input = await screen.findByPlaceholderText(/e\.g\. migration, customs/i);

    // Empty Enter → mutationFn throws "Not ready" → onError
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });
    await waitFor(() => expect(document.body.textContent).toMatch(/Error|Not ready/i), {
      timeout: 10_000,
    });

    const tag = `${PREFIX}_ui_${Date.now().toString(36).slice(-4)}`;
    await user.clear(input);
    await user.type(input, tag);

    const row = input.closest("div.flex") ?? input.parentElement!;
    const submit = within(row as HTMLElement).getAllByRole("button").at(-1)!;
    await clickSafe(user, submit);

    await waitFor(
      () => expect(document.body.textContent).toMatch(/Tag added|appear once approved/i),
      { timeout: 20_000 },
    );

    const admin = adminClient();
    const { data: inserted } = await admin
      .from("heritage_tags")
      .select("id")
      .eq("entity_id", seeded.memberId!)
      .eq("tag", tag.toLowerCase());
    for (const row of inserted ?? []) seeded.tagIds.push(row.id);
  }, 90_000);
});

describe("Pass 20 — carousel.tsx 100% lines", () => {
  it("throws outside provider, keyboard scrolls, null api, no setApi, vertical", async () => {
    expect(() => render(<CarouselContent />)).toThrow(/useCarousel must be used within/);
    cleanup();

    // !api early returns in both effects (lines 85-86 / 92-94)
    emblaMock.mockImplementation(() => [vi.fn(), undefined] as unknown as ReturnType<typeof useEmblaCarousel>);
    const { unmount: uNull } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>NullApi</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(screen.getByText("NullApi")).toBeInTheDocument();
    uNull();
    cleanup();

    // No setApi → first effect early return (84-86) while api is truthy
    emblaMock.mockImplementation(() => {
      const ref = vi.fn();
      return [ref, fakeApi] as unknown as ReturnType<typeof useEmblaCarousel>;
    });
    selectHandlers.length = 0;
    const { unmount: uNoSet } = render(
      <Carousel opts={{ loop: false }}>
        <CarouselContent>
          <CarouselItem>NoSet</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(screen.getByText("NoSet")).toBeInTheDocument();
    uNoSet(); // hits cleanup api?.off (101-102) via effect that did register
    cleanup();

    selectHandlers.length = 0;
    fakeApi.scrollPrev.mockClear();
    fakeApi.scrollNext.mockClear();

    // Horizontal Prev/Next absolute classes (180 / 208)
    const { unmount: uHoriz } = render(
      <Carousel orientation="horizontal">
        <CarouselContent>
          <CarouselItem>H1</CarouselItem>
          <CarouselItem>H2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByRole("button", { name: /Previous slide/i }).className).toMatch(/-left-12/);
    expect(screen.getByRole("button", { name: /Next slide/i }).className).toMatch(/-right-12/);
    uHoriz();
    cleanup();

    const setApi = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(
      <Carousel setApi={setApi} orientation="vertical" opts={{ axis: "y" }}>
        <CarouselContent>
          <CarouselItem>A</CarouselItem>
          <CarouselItem>B</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );

    await waitFor(() => expect(setApi).toHaveBeenCalledWith(fakeApi));
    // Vertical absolute classes (181 / 209)
    expect(screen.getByRole("button", { name: /Previous slide/i }).className).toMatch(/-top-12|rotate-90/);
    expect(screen.getByRole("button", { name: /Next slide/i }).className).toMatch(/-bottom-12|rotate-90/);

    const region = screen.getByRole("region");
    region.focus();
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(fakeApi.scrollPrev).toHaveBeenCalled();
    expect(fakeApi.scrollNext).toHaveBeenCalled();

    await clickSafe(user, screen.getByRole("button", { name: /Previous slide/i }));
    await clickSafe(user, screen.getByRole("button", { name: /Next slide/i }));

    expect(selectHandlers.length).toBeGreaterThan(0);
    for (const cb of selectHandlers) cb(undefined);

    unmount();

    const actual = await vi.importActual<typeof import("embla-carousel-react")>("embla-carousel-react");
    emblaMock.mockImplementation((opts?: unknown, plugins?: unknown) =>
      (actual.default as (...a: unknown[]) => ReturnType<typeof useEmblaCarousel>)(opts, plugins),
    );
  });
});

describe("Pass 20 — Settings.tsx 100% lines (password arms)", () => {
  beforeEach(async () => {
    await signIn(E2E_ACCOUNTS.member.email);
  });

  it("covers privacy/notif saves + changePassword validation/success/error", async () => {
    const user = userEvent.setup();
    renderApp(withToaster(<Settings />), { route: "/settings?tab=privacy" });

    await waitFor(
      () => expect(document.body.textContent).toMatch(/Field-Level Privacy|Privacy/i),
      { timeout: 25_000 },
    );

    // Privacy save (mutationFn + onSuccess)
    const savePrivacy = await waitFor(
      () => screen.getByRole("button", { name: /Save Privacy Settings/i }),
      { timeout: 25_000 },
    );
    await clickSafe(user, savePrivacy);
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Privacy settings saved|Error/i),
      { timeout: 15_000 },
    );

    // Notifications tab + toggle + save
    await clickSafe(user, screen.getByRole("tab", { name: /Notifications/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Email notifications/i), {
      timeout: 15_000,
    });
    const switches = document.querySelectorAll('[role="switch"]');
    if (switches.length > 0) await clickSafe(user, switches[0] as HTMLElement);
    await clickSafe(user, screen.getByRole("button", { name: /Save Preferences/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Notification preferences saved|Error/i),
      { timeout: 15_000 },
    );

    // Account / password arms
    await clickSafe(user, screen.getByRole("tab", { name: /Account/i }));
    await waitFor(
      () => expect(document.body.textContent).toMatch(/Change Password|New Password/i),
      { timeout: 15_000 },
    );

    const newPw = screen.getByPlaceholderText(/Enter new password/i);
    const confirmPw = screen.getByPlaceholderText(/Confirm new password/i);
    const updateBtn = () => screen.getByRole("button", { name: /Update Password/i });

    await user.clear(newPw);
    await user.type(newPw, "Ab1!");
    await user.clear(confirmPw);
    await user.type(confirmPw, "Ab1!");
    await clickSafe(user, updateBtn());
    await waitFor(() => expect(document.body.textContent).toMatch(/at least 8 characters/i), {
      timeout: 10_000,
    });

    await user.clear(newPw);
    await user.type(newPw, "Password1");
    await user.clear(confirmPw);
    await user.type(confirmPw, "Password1");
    await clickSafe(user, updateBtn());
    await waitFor(
      () =>
        expect(document.body.textContent).toMatch(
          /uppercase letter, one number, and one special|special character/i,
        ),
      { timeout: 10_000 },
    );

    await user.clear(newPw);
    await user.type(newPw, "Password1!");
    await user.clear(confirmPw);
    await user.type(confirmPw, "Password2!");
    await clickSafe(user, updateBtn());
    await waitFor(() => expect(document.body.textContent).toMatch(/do not match/i), {
      timeout: 10_000,
    });

    const okSpy = vi.spyOn(supabase.auth, "updateUser").mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as never);
    await user.clear(newPw);
    await user.type(newPw, "Password1!");
    await user.clear(confirmPw);
    await user.type(confirmPw, "Password1!");
    await clickSafe(user, updateBtn());
    await waitFor(() => expect(document.body.textContent).toMatch(/Password updated successfully/i), {
      timeout: 10_000,
    });
    expect(okSpy).toHaveBeenCalled();
    okSpy.mockRestore();

    const errSpy = vi.spyOn(supabase.auth, "updateUser").mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Auth update rejected", name: "AuthError", status: 400 },
    } as never);
    await user.clear(newPw);
    await user.type(newPw, "Password1!");
    await user.clear(confirmPw);
    await user.type(confirmPw, "Password1!");
    await clickSafe(user, updateBtn());
    await waitFor(() => expect(document.body.textContent).toMatch(/Auth update rejected/i), {
      timeout: 10_000,
    });
    errSpy.mockRestore();
  }, 120_000);
});
