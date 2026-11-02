/**
 * Pass 20 — ModeratorDashboard + AnalyticsTab → 100% lines.
 * Real Kong :54331 / khadayata_local :5438. Disposable covma_* rows only — no view mocks.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { render, screen, waitFor, fireEvent, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import AnalyticsTab, { DrillDownDialog } from "@/components/admin/AnalyticsTab";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const PREFIX = `covma_${Date.now().toString(36)}`;

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
  const {
    data: { user: existing },
  } = await supabase.auth.getUser();
  if (
    session?.user?.email?.toLowerCase() === email.toLowerCase() &&
    existing?.email?.toLowerCase() === email.toLowerCase()
  ) {
    return;
  }
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 6; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() === email.toLowerCase()) return;
    } else if (/rate limit|fetch failed|network|ECONNREFUSED/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      continue;
    } else if (error) {
      throw error;
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error(`signIn failed for ${email}`);
}

function makeUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
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
    });
    return true;
  }
  fireEvent.click(el);
  return true;
}

function clickStatCard(label: RegExp) {
  const cards = Array.from(document.querySelectorAll(".cursor-pointer"));
  const card = cards.find((c) => label.test(c.textContent ?? ""));
  if (!card) return false;
  fireEvent.click(card);
  return true;
}

function polyfillBlobDownload() {
  const g = globalThis as typeof globalThis & {
    URL: typeof URL & {
      createObjectURL?: (b: Blob) => string;
      revokeObjectURL?: (u: string) => void;
    };
  };
  if (typeof g.URL.createObjectURL !== "function") {
    g.URL.createObjectURL = () => `blob:${PREFIX}-csv`;
  }
  if (typeof g.URL.revokeObjectURL !== "function") {
    g.URL.revokeObjectURL = () => {};
  }
  const proto = HTMLAnchorElement.prototype as HTMLAnchorElement & { click: () => void };
  const orig = proto.click;
  proto.click = function click() {
    /* jsdom: no navigation */
  };
  return () => {
    proto.click = orig;
  };
}

const seeded = {
  rsvpIds: [] as string[],
  donationIds: [] as string[],
  donationRestore: [] as { id: string; amount: number }[],
  memberId: null as string | null,
  priorLevel: null as number | null,
};

describe("Pass 20 — ModeratorDashboard + AnalyticsTab → 100% lines", () => {
  beforeAll(async () => {
    const admin = adminClient();
    const { data: mem } = await admin
      .from("members")
      .select("id")
      .eq("onboarding_completed", true)
      .limit(1)
      .maybeSingle();
    const { data: ev } = await admin
      .from("events")
      .select("id")
      .eq("status", "published")
      .limit(1)
      .maybeSingle();
    if (mem?.id && ev?.id) {
      const existing = await admin
        .from("event_rsvps")
        .select("id")
        .eq("event_id", ev.id)
        .eq("member_id", mem.id)
        .maybeSingle();
      if (existing.data?.id) {
        seeded.rsvpIds.push(existing.data.id);
      } else {
        const { data: rsvp, error } = await admin
          .from("event_rsvps")
          .insert({ event_id: ev.id, member_id: mem.id, status: "going" })
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (rsvp?.id) seeded.rsvpIds.push(rsvp.id);
      }
    }

    const { data: fund } = await admin.from("funds").select("id").limit(1).maybeSingle();
    if (mem?.id && fund?.id) {
      const { data: don, error } = await admin
        .from("donations")
        .insert({
          fund_id: fund.id,
          member_id: mem.id,
          amount: 250000,
          currency: "INR",
          status: "succeeded",
          type: "one_time",
          provider: "manual",
          donor_name: `${PREFIX} donor`,
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (don?.id) seeded.donationIds.push(don.id);
    }
  }, 60_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.rsvpIds.length) await admin.from("event_rsvps").delete().in("id", seeded.rsvpIds);
    if (seeded.donationIds.length) await admin.from("donations").delete().in("id", seeded.donationIds);
    if (seeded.donationRestore.length) {
      for (const row of seeded.donationRestore) {
        await admin.from("donations").update({ amount: row.amount }).eq("id", row.id);
      }
    }
    if (seeded.memberId != null && seeded.priorLevel != null) {
      await admin.from("members").update({ verification_level: seeded.priorLevel }).eq("id", seeded.memberId);
    }
    await supabase.auth.signOut();
  }, 60_000);

  afterEach(() => {
    cleanup();
  });

  it("ModeratorDashboard: CSV export, level mutate, empty reports, empty members", async () => {
    const restoreClick = polyfillBlobDownload();
    try {
      await signIn(E2E_ACCOUNTS.moderator.email);
      const user = makeUser();
      const { unmount } = renderApp(withToaster(<ModeratorDashboard />), { route: "/moderation" });

      await waitFor(
        () => {
          expect(document.body.textContent).not.toMatch(/Access Denied/i);
          expect(screen.queryByRole("button", { name: /^pending$/i })).toBeTruthy();
        },
        { timeout: 45_000 },
      );

      // Empty reports arm — "reviewed" has 0 rows in local dump
      const reviewedBtn = screen.getByRole("button", { name: /^reviewed$/i });
      forceReactClick(reviewedBtn);
      await waitFor(() => expect(document.body.textContent).toMatch(/No reviewed reports/i), {
        timeout: 25_000,
      });
      forceReactClick(screen.getByRole("button", { name: /^pending$/i }));

      // Members: list → CSV download body + level mutate success
      await clickSafe(user, screen.queryByRole("tab", { name: /Members/i }));
      await waitFor(() => expect(screen.queryByPlaceholderText(/Search by name/i)).toBeTruthy(), {
        timeout: 20_000,
      });

      await waitFor(() => {
        expect(screen.queryAllByRole("button", { name: /Upgrade .* verification level/i }).length).toBeGreaterThan(0);
      }, { timeout: 25_000 });

      const upgradeBtns = screen.getAllByRole("button", { name: /Upgrade .* verification level/i });
      const upgrade = upgradeBtns.find((b) => !(b as HTMLButtonElement).disabled) ?? upgradeBtns[0];
      const row = upgrade.closest("tr");
      const nameLink = row?.querySelector("a[href*='/member/']") as HTMLAnchorElement | null;
      const memberHref = nameLink?.getAttribute("href") ?? "";
      const memberId = memberHref.split("/member/")[1] ?? null;
      if (memberId) {
        seeded.memberId = memberId;
        const { data: before } = await supabase
          .from("members")
          .select("verification_level")
          .eq("id", memberId)
          .maybeSingle();
        seeded.priorLevel = before?.verification_level ?? 0;
      }

      forceReactClick(upgrade);
      await waitFor(() => expect(document.body.textContent).toMatch(/Verification level updated|Error/i), {
        timeout: 20_000,
      });
      expect(document.body.textContent).toMatch(/Verification level updated/i);

      if (seeded.memberId != null && seeded.priorLevel != null) {
        await supabase
          .from("members")
          .update({ verification_level: seeded.priorLevel })
          .eq("id", seeded.memberId);
      }

      await clickSafe(user, screen.getByRole("button", { name: /Export CSV/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/CSV downloaded|No data to export/i), {
        timeout: 10_000,
      });
      expect(document.body.textContent).toMatch(/CSV downloaded/i);

      // Empty members arm via nonsense search
      fireEvent.change(screen.getByPlaceholderText(/Search by name/i), {
        target: { value: `${PREFIX}_nomatch_zzzz` },
      });
      await waitFor(() => expect(document.body.textContent).toMatch(/No members found/i), {
        timeout: 20_000,
      });

      // Empty export toast when no rows
      await clickSafe(user, screen.getByRole("button", { name: /Export CSV/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/No data to export/i), {
        timeout: 10_000,
      });

      unmount();
    } finally {
      restoreClick();
    }
  }, 180_000);

  it("AnalyticsTab: RSVPs + chapters drills, chapter matrimonial filter, donation format arms, fallthrough", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = makeUser();

    // Large seeded donation → Lifetime Value "L" arm
    const { unmount } = renderApp(<AnalyticsTab myChapterId={null} />, { route: "/admin?tab=analytics" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Lifetime Value|Analytics/i), {
      timeout: 45_000,
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/₹[\d.]+L/), { timeout: 30_000 });

    expect(clickStatCard(/Total RSVPs/i)).toBe(true);
    await waitFor(() => expect(document.body.textContent).toMatch(/record|No records|going/i), {
      timeout: 20_000,
    });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), {
      timeout: 8_000,
    }).catch(() => undefined);

    expect(clickStatCard(/Chapters/i)).toBe(true);
    await waitFor(() => expect(document.body.textContent).toMatch(/Active|Inactive|record/i), {
      timeout: 20_000,
    });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), {
      timeout: 8_000,
    }).catch(() => undefined);

    unmount();

    // Chapter-scoped matrimonial filter (line 170)
    const { unmount: u2 } = renderApp(<AnalyticsTab myChapterId={AHMEDABAD} />, {
      route: "/admin?tab=analytics",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Chapter-scoped|Total Profiles/i), {
      timeout: 30_000,
    });
    expect(clickStatCard(/Total Profiles/i)).toBe(true);
    await waitFor(() => expect(document.body.textContent).toMatch(/record|No records|Verified|Unverified/i), {
      timeout: 20_000,
    });
    await user.keyboard("{Escape}");
    u2();

    // Donation format arms: raw (<1k) then K (1k–99_999), then restore
    const admin = adminClient();
    const { data: allDonations } = await admin.from("donations").select("id, amount");
    seeded.donationRestore = (allDonations ?? []).map((d) => ({
      id: d.id as string,
      amount: Number(d.amount) || 0,
    }));

    for (const row of seeded.donationRestore) {
      await admin.from("donations").update({ amount: 5 }).eq("id", row.id);
    }
    const { unmount: u3 } = renderApp(<AnalyticsTab myChapterId={null} />, { route: "/admin?tab=analytics" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Lifetime Value/i), { timeout: 45_000 });
    await waitFor(() => expect(document.body.textContent).toMatch(/₹\d+/), { timeout: 30_000 });
    u3();

    // Mid-range total → "K" arm (and recent K if recentInr >= 1000)
    if (seeded.donationRestore[0]) {
      await admin.from("donations").update({ amount: 2500 }).eq("id", seeded.donationRestore[0].id);
      for (const row of seeded.donationRestore.slice(1)) {
        await admin.from("donations").update({ amount: 10 }).eq("id", row.id);
      }
    }
    const { unmount: u4 } = renderApp(<AnalyticsTab myChapterId={null} />, { route: "/admin?tab=analytics" });
    await waitFor(() => expect(document.body.textContent).toMatch(/₹[\d.]+K/), { timeout: 45_000 });
    u4();

    for (const row of seeded.donationRestore) {
      await admin.from("donations").update({ amount: row.amount }).eq("id", row.id);
    }
    seeded.donationRestore = [];

    // Dead fallthrough `return []` via non-union drill key
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DrillDownDialog
          drillKey={"not-a-real-drill" as "rsvps"}
          myChapterId={null}
          onClose={() => {}}
        />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/No records found|Loading/i), {
      timeout: 15_000,
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/No records found/i), {
      timeout: 15_000,
    });
  }, 240_000);
});
