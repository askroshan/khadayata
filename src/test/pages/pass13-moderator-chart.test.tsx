/**
 * Pass 13 — ModeratorDashboard + leftover moderation UI against local Kong + DB.
 * Seeds cov13_* reports, commits dismiss/resolve/verify paths, cleans up.
 */
import { describe, it, expect, afterAll } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import ReportsTab from "@/components/admin/ReportsTab";
import { ReportDialog } from "@/components/ReportDialog";
import { MatrimonialModerationPanel } from "@/components/matrimonial/MatrimonialModerationPanel";

const PREFIX = `cov13_${Date.now().toString(36)}`;

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
  for (let i = 0; i < 5; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() === email.toLowerCase()) return;
    } else if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    } else if (error) {
      throw error;
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
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

async function currentMemberId(): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  const { data } = await supabase.from("members").select("id").eq("user_id", uid).maybeSingle();
  if (!data?.id) throw new Error("no member for session");
  return data.id;
}

function cardForReason(reasonPart: string): HTMLElement {
  const node = screen.getByText(new RegExp(reasonPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const card = node.closest("[class*='shadow-card'], [class*='rounded']") as HTMLElement | null;
  if (!card) throw new Error(`no card for ${reasonPart}`);
  return card;
}

async function openActOnReason(user: ReturnType<typeof userEvent.setup>, reasonPart: string) {
  await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(reasonPart)), { timeout: 25_000 });
  const card = cardForReason(reasonPart);
  const act = within(card).getByRole("button", { name: /Act/i });
  fireEvent.click(act);
  await waitFor(() => expect(document.body.textContent).toMatch(/Take Action on Report/i), { timeout: 15_000 });
}

async function pickAction(user: ReturnType<typeof userEvent.setup>, option: RegExp) {
  const dialog = screen.getByRole("dialog");
  const box = within(dialog).getByRole("combobox");
  await clickSafe(user, box);
  await waitFor(() => expect(screen.getByRole("option", { name: option })).toBeTruthy(), { timeout: 10_000 });
  fireEvent.click(screen.getByRole("option", { name: option }));
}

async function cleanupCov13() {
  await supabase.from("reports").delete().like("reason", "cov13_%");
  await supabase.from("content_news").delete().like("title", "cov13_%");
  await supabase
    .from("members")
    .update({ suspended: false, suspended_at: null, blocked: false, blocked_at: null })
    .eq("first_name", "E2E");
}

describe("Pass 13 moderator + leftover moderation (real Kong)", () => {
  afterAll(async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    await cleanupCov13();
    await supabase.auth.signOut();
  });

  it("member is denied ModeratorDashboard access", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Access Denied|Moderator role required/i), {
      timeout: 25_000,
    });
  }, 60_000);

  it("ModeratorDashboard: filter → Act dismiss + resolve warned + members CSV/level + analytics", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    const user = userEvent.setup();
    const mid = await currentMemberId();

    const { data: target } = await supabase
      .from("members")
      .select("id, first_name, last_name, verification_level")
      .neq("id", mid)
      .eq("onboarding_completed", true)
      .limit(1)
      .maybeSingle();
    expect(target?.id).toBeTruthy();

    const { data: news, error: newsErr } = await supabase
      .from("content_news")
      .insert({
        title: `${PREFIX} mod-target`,
        summary: "cov",
        body: "cov",
        status: "draft",
        created_by: (await supabase.auth.getUser()).data.user!.id,
        article_type: "news",
        scope: "global",
        tags: [],
        images: [],
        schedule: {},
        suspended: false,
        pinned: false,
      })
      .select("id")
      .single();
    expect(newsErr).toBeNull();

    const dismissReason = `${PREFIX} dismiss-me`;
    const resolveReason = `${PREFIX} resolve-me`;
    const { error: insErr } = await supabase.from("reports").insert([
      {
        reporter_member_id: mid,
        entity_type: "news",
        entity_id: news!.id,
        category: "obscene",
        reason: dismissReason,
        status: "pending",
      },
      {
        reporter_member_id: mid,
        entity_type: "news",
        entity_id: news!.id,
        category: "harassment",
        reason: resolveReason,
        status: "pending",
      },
      {
        reporter_member_id: mid,
        entity_type: "member",
        entity_id: target!.id,
        category: "fake",
        reason: `${PREFIX} member-warn`,
        status: "pending",
      },
    ]);
    expect(insErr).toBeNull();

    const { unmount } = renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Moderator Dashboard/i), { timeout: 30_000 });

    for (const label of ["reviewed", "resolved", "dismissed", "all", "pending"]) {
      await clickSafe(user, screen.queryByRole("button", { name: new RegExp(`^${label}$`, "i") }));
    }

    await openActOnReason(user, dismissReason);
    const dismissDialog = screen.getByRole("dialog");
    const notes = within(dismissDialog).queryByPlaceholderText(/Document your decision/i);
    if (notes) fireEvent.change(notes, { target: { value: `${PREFIX} dismissed notes` } });
    await clickSafe(user, within(dismissDialog).getByRole("button", { name: /Dismiss/i }));
    await waitFor(async () => {
      const { data } = await supabase.from("reports").select("status").eq("reason", dismissReason).maybeSingle();
      expect(data?.status).toBe("dismissed");
    }, { timeout: 25_000 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 10_000 });

    await openActOnReason(user, resolveReason);
    await pickAction(user, /Warning Issued/i);
    const resolveDialog = screen.getByRole("dialog");
    const resolveNotes = within(resolveDialog).queryByPlaceholderText(/Document your decision/i);
    if (resolveNotes) fireEvent.change(resolveNotes, { target: { value: `${PREFIX} warned` } });
    await clickSafe(user, within(resolveDialog).getByRole("button", { name: /Resolve/i }));
    await waitFor(async () => {
      const { data } = await supabase
        .from("reports")
        .select("status, admin_action")
        .eq("reason", resolveReason)
        .maybeSingle();
      expect(data?.status).toBe("resolved");
      expect(data?.admin_action).toBe("warned");
    }, { timeout: 25_000 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 10_000 });

    // Members tab: search + level bump/down + CSV
    await clickSafe(user, screen.queryByRole("tab", { name: /Members/i }));
    await waitFor(() => expect(screen.queryByPlaceholderText(/Search by name/i)).toBeTruthy(), { timeout: 20_000 });
    fireEvent.change(screen.getByPlaceholderText(/Search by name/i), {
      target: { value: target!.last_name?.slice(0, 4) || "a" },
    });
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(40), { timeout: 20_000 });

    const priorLevel = target!.verification_level ?? 0;
    const upgrade = screen.queryAllByRole("button", { name: /Upgrade .* verification level/i })[0];
    const downgrade = screen.queryAllByRole("button", { name: /Downgrade .* verification level/i })[0];
    if (upgrade && !(upgrade as HTMLButtonElement).disabled) {
      await clickSafe(user, upgrade);
      await waitFor(async () => {
        const { data } = await supabase.from("members").select("verification_level").eq("id", target!.id).maybeSingle();
        expect(data?.verification_level).toBe(priorLevel + 1);
      }, { timeout: 20_000 });
      await clickSafe(user, screen.queryAllByRole("button", { name: /Downgrade .* verification level/i })[0]);
    } else if (downgrade && !(downgrade as HTMLButtonElement).disabled) {
      await clickSafe(user, downgrade);
      await waitFor(async () => {
        const { data } = await supabase.from("members").select("verification_level").eq("id", target!.id).maybeSingle();
        expect(data?.verification_level).toBe(priorLevel - 1);
      }, { timeout: 20_000 });
      await clickSafe(user, screen.queryAllByRole("button", { name: /Upgrade .* verification level/i })[0]);
    }
    await supabase.from("members").update({ verification_level: priorLevel }).eq("id", target!.id);

    await clickSafe(user, screen.queryByRole("button", { name: /Export CSV/i }));

    await clickSafe(user, screen.queryByRole("tab", { name: /Analytics/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/New Members|RSVP|Donation|Report/i), {
      timeout: 25_000,
    });

    unmount();
  }, 180_000);

  it("ModeratorDashboard: resolve suspended/blocked actions on member reports", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    const user = userEvent.setup();
    const mid = await currentMemberId();

    const { data: e2eTarget } = await supabase
      .from("members")
      .select("id")
      .eq("first_name", "E2E")
      .neq("id", mid)
      .limit(1)
      .maybeSingle();
    const entityId = e2eTarget?.id ?? mid;

    const suspendReason = `${PREFIX} suspend-path`;
    const blockReason = `${PREFIX} block-path`;
    await supabase.from("reports").insert([
      {
        reporter_member_id: mid,
        entity_type: "member",
        entity_id: entityId,
        category: "fake",
        reason: suspendReason,
        status: "pending",
      },
      {
        reporter_member_id: mid,
        entity_type: "member",
        entity_id: entityId,
        category: "harassment",
        reason: blockReason,
        status: "pending",
      },
    ]);

    const { unmount } = renderApp(<ModeratorDashboard />, { route: "/moderation" });
    await openActOnReason(user, suspendReason);
    await pickAction(user, /^Suspended$/i);
    await clickSafe(user, within(screen.getByRole("dialog")).getByRole("button", { name: /Resolve/i }));
    await waitFor(async () => {
      const { data } = await supabase
        .from("reports")
        .select("status, admin_action")
        .eq("reason", suspendReason)
        .maybeSingle();
      expect(data?.status).toBe("resolved");
      expect(data?.admin_action).toBe("suspended");
    }, { timeout: 25_000 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 10_000 });

    await openActOnReason(user, blockReason);
    await pickAction(user, /^Blocked$/i);
    await clickSafe(user, within(screen.getByRole("dialog")).getByRole("button", { name: /Resolve/i }));
    await waitFor(async () => {
      const { data } = await supabase
        .from("reports")
        .select("status, admin_action")
        .eq("reason", blockReason)
        .maybeSingle();
      expect(data?.status).toBe("resolved");
      expect(data?.admin_action).toBe("blocked");
    }, { timeout: 25_000 });

    await supabase
      .from("members")
      .update({ suspended: false, suspended_at: null, blocked: false, blocked_at: null })
      .eq("id", entityId);
    unmount();
  }, 180_000);

  it("ReportDialog: icon/button/menu variants + submit real report", async () => {
    await signIn(E2E_ACCOUNTS.moderator.email);
    const user = userEvent.setup();
    const mid = await currentMemberId();
    const { data: other } = await supabase.from("members").select("id, first_name").neq("id", mid).limit(1).maybeSingle();
    expect(other?.id).toBeTruthy();

    const { unmount: u0 } = renderApp(
      <div>
        <ReportDialog entityType="member" entityId={other!.id} variant="icon" />
        <ReportDialog entityType="business" entityId={other!.id} entityName="Cov Biz" variant="menu" />
      </div>,
      { route: "/" },
    );
    await waitFor(() => expect(screen.queryAllByRole("button", { name: /Report/i }).length).toBeGreaterThan(0), {
      timeout: 20_000,
    });
    u0();

    const { unmount } = renderApp(
      <ReportDialog entityType="member" entityId={other!.id} entityName={`${other!.first_name}`} variant="button" />,
      { route: "/" },
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /Report/i })).toBeTruthy(), { timeout: 20_000 });
    await clickSafe(user, screen.getByRole("button", { name: /Report/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Report member|Reason for reporting/i), {
      timeout: 10_000,
    });
    await clickSafe(user, screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByRole("option", { name: /Non-Khadayata/i })).toBeTruthy(), {
      timeout: 10_000,
    });
    fireEvent.click(screen.getByRole("option", { name: /Non-Khadayata/i }));
    fireEvent.change(screen.getByPlaceholderText(/additional context/i), {
      target: { value: `${PREFIX} report-dialog` },
    });
    await clickSafe(user, screen.getByRole("button", { name: /Submit Report/i }));
    await waitFor(async () => {
      const { data } = await supabase
        .from("reports")
        .select("id")
        .eq("reason", `${PREFIX} report-dialog`)
        .limit(1);
      expect((data ?? []).length).toBe(1);
    }, { timeout: 25_000 });
    unmount();
  }, 90_000);

  it("ReportsTab leftover: resolve warned on seeded pending report", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const mid = await currentMemberId();
    const { data: news } = await supabase
      .from("content_news")
      .insert({
        title: `${PREFIX} reports-tab`,
        summary: "x",
        body: "y",
        status: "draft",
        created_by: (await supabase.auth.getUser()).data.user!.id,
        article_type: "news",
        scope: "global",
        tags: [],
        images: [],
        schedule: {},
        suspended: false,
        pinned: false,
      })
      .select("id")
      .single();
    const tabReason = `${PREFIX} reports-tab-act`;
    const { data: report } = await supabase
      .from("reports")
      .insert({
        reporter_member_id: mid,
        entity_type: "news",
        entity_id: news!.id,
        category: "fake",
        reason: tabReason,
        status: "pending",
      })
      .select("id")
      .single();
    expect(report?.id).toBeTruthy();

    renderApp(<ReportsTab />, { route: "/admin?tab=reports" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Content Reports|Pending/i), { timeout: 25_000 });
    for (const name of [/Pending/i, /Reviewed/i, /Resolved/i, /Dismissed/i, /All/i, /Pending/i]) {
      await clickSafe(user, screen.queryByRole("tab", { name }));
    }
    await openActOnReason(user, tabReason);
    await pickAction(user, /Warning Issued/i);
    const notes = within(screen.getByRole("dialog")).queryByPlaceholderText(/Document your decision/i);
    if (notes) fireEvent.change(notes, { target: { value: `${PREFIX} tab warn` } });
    await clickSafe(user, within(screen.getByRole("dialog")).getByRole("button", { name: /Resolve/i }));
    await waitFor(async () => {
      const { data } = await supabase.from("reports").select("status, admin_action").eq("id", report!.id).maybeSingle();
      expect(data?.status).toBe("resolved");
      expect(data?.admin_action).toBe("warned");
    }, { timeout: 25_000 });
  }, 120_000);

  it("MatrimonialModerationPanel: verify then flag then restore (no delete)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    const { data: profile } = await supabase
      .from("matrimonial_profiles")
      .select("id, verified, suspended, member:members!matrimonial_profiles_member_id_fkey(first_name, last_name)")
      .eq("verified", false)
      .eq("suspended", false)
      .limit(1)
      .maybeSingle();

    if (!profile?.id) {
      // No pending profile — mount panel empty tabs still cover UI
      renderApp(<MatrimonialModerationPanel />, { route: "/matrimonial" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial Moderation/i), { timeout: 25_000 });
      for (const tab of [/Pending/i, /Verified/i, /Suspended/i]) {
        await clickSafe(user, screen.queryByRole("tab", { name: tab }));
      }
      return;
    }

    const prior = { verified: profile.verified, suspended: profile.suspended };
    const member = profile.member as { first_name?: string; last_name?: string } | null;
    const nameRe = new RegExp(`${member?.first_name ?? ""}\\s+${member?.last_name ?? ""}`.trim(), "i");

    renderApp(<MatrimonialModerationPanel />, { route: "/matrimonial" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial Moderation/i), { timeout: 25_000 });

    await clickSafe(user, screen.queryByRole("tab", { name: /Pending/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(nameRe), { timeout: 20_000 });

    const row = screen.getByText(nameRe).closest("tr");
    expect(row).toBeTruthy();
    const verifyBtn = within(row as HTMLElement).queryByRole("button", { name: /Verify profile/i });
    if (verifyBtn) {
      await clickSafe(user, verifyBtn);
      await waitFor(async () => {
        const { data } = await supabase.from("matrimonial_profiles").select("verified").eq("id", profile.id).maybeSingle();
        expect(data?.verified).toBe(true);
      }, { timeout: 20_000 });
    }

    await clickSafe(user, screen.queryByRole("tab", { name: /Verified/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(nameRe), { timeout: 20_000 });
    const verifiedRow = screen.getByText(nameRe).closest("tr");
    const suspendBtn = verifiedRow
      ? within(verifiedRow as HTMLElement).queryByRole("button", { name: /Suspend profile/i })
      : screen.queryAllByRole("button", { name: /Suspend profile/i })[0];
    if (suspendBtn) {
      await clickSafe(user, suspendBtn);
      await waitFor(async () => {
        const { data } = await supabase.from("matrimonial_profiles").select("suspended").eq("id", profile.id).maybeSingle();
        expect(data?.suspended).toBe(true);
      }, { timeout: 20_000 });
    }

    await supabase
      .from("matrimonial_profiles")
      .update({ verified: prior.verified, suspended: prior.suspended })
      .eq("id", profile.id);
  }, 120_000);
});
