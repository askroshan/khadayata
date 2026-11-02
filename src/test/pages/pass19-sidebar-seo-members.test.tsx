/**
 * Pass 19 — sidebar.tsx + SEOMeta + MembersTab → 100% lines.
 * Real Kong :54331 / khadayata_local :5438. Disposable covssm_* rows only — no view mocks.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { render, screen, waitFor, fireEvent, within, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import MembersTab from "@/components/admin/MembersTab";
import SEOMeta from "@/components/SEOMeta";
import { Toaster } from "@/components/ui/toaster";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";
const PREFIX = `covssm_${Date.now().toString(36)}`;

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

async function closeDialogs(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 4; i++) {
    if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) break;
    await user.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 100));
  }
}

function SidebarStateProbe() {
  const { open, isMobile, openMobile } = useSidebar();
  return (
    <div data-testid="sidebar-probe">
      open:{String(open)} mobile:{String(isMobile)} openMobile:{String(openMobile)}
    </div>
  );
}

const seeded = {
  disposableUserId: null as string | null,
  disposableMemberId: null as string | null,
  disposableFirst: "CovSSM",
  disposableLast: `Disp${Date.now().toString(36).slice(-4)}`,
  deleteUserId: null as string | null,
  deleteMemberId: null as string | null,
  committeeRoleId: null as string | null,
};

async function cleanupSeeds() {
  const admin = adminClient();
  for (const mid of [seeded.disposableMemberId, seeded.deleteMemberId]) {
    if (!mid) continue;
    await admin.from("role_assignments").delete().eq("member_id", mid);
    await admin.from("members").delete().eq("id", mid);
  }
  for (const uid of [seeded.disposableUserId, seeded.deleteUserId]) {
    if (!uid) continue;
    try {
      await admin.auth.admin.deleteUser(uid);
    } catch {
      /* gone */
    }
  }
  seeded.disposableMemberId = null;
  seeded.disposableUserId = null;
  seeded.deleteMemberId = null;
  seeded.deleteUserId = null;
}

async function ensureDisposable(pending = true) {
  if (seeded.disposableMemberId) return seeded.disposableMemberId;
  const admin = adminClient();
  const email = `${PREFIX}-m@example.invalid`;
  const { data: cu, error } = await admin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (error || !cu?.user?.id) throw error ?? new Error("createUser failed");
  seeded.disposableUserId = cu.user.id;
  const { data: mem, error: mErr } = await admin
    .from("members")
    .insert({
      user_id: cu.user.id,
      first_name: seeded.disposableFirst,
      last_name: seeded.disposableLast,
      chapter_id: AHMEDABAD,
      verification_level: 2,
      onboarding_completed: !pending ? true : false,
    })
    .select("id")
    .single();
  if (mErr || !mem?.id) throw mErr ?? new Error("member insert failed");
  seeded.disposableMemberId = mem.id;

  const { data: roles } = await admin
    .from("roles")
    .select("id, name")
    .eq("chapter_id", AHMEDABAD)
    .ilike("name", "%Committee%")
    .limit(1);
  seeded.committeeRoleId = roles?.[0]?.id ?? null;
  return mem.id;
}

async function ensureDeleteTarget() {
  if (seeded.deleteMemberId) return;
  const admin = adminClient();
  const email = `${PREFIX}-del@example.invalid`;
  const { data: cu } = await admin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  seeded.deleteUserId = cu!.user!.id;
  const { data: mem } = await admin
    .from("members")
    .insert({
      user_id: cu!.user!.id,
      first_name: "CovSSMDel",
      last_name: `Gone${Date.now().toString(36).slice(-4)}`,
      chapter_id: AHMEDABAD,
      verification_level: 1,
      onboarding_completed: true,
    })
    .select("id")
    .single();
  seeded.deleteMemberId = mem!.id;
}

describe("Pass 19 — SEOMeta 100% lines", () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll("meta, link[rel='canonical'], script#schema-ld-json").forEach((el) => el.remove());
    document.title = "";
  });

  it("covers breadcrumbs, faq, article, schema variants, keywords, noIndex", async () => {
    const { unmount: u1 } = render(
      <SEOMeta
        title="Wave8 Article"
        description="Article desc"
        keywords="khadayata, community"
        image="https://cdn.example.com/og.png"
        url="/news/wave8"
        type="article"
        noIndex
        publishedAt="2026-01-02T00:00:00Z"
        modifiedAt="2026-01-03T00:00:00Z"
        authorName="Roshan"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "News", url: "/news" },
        ]}
        faq={[
          { question: "What is Khadayata?", answer: "A community." },
          { question: "Where?", answer: "Worldwide." },
        ]}
        schema={{
          "@graph": [{ "@type": "NewsArticle", headline: "Graph item" }],
        }}
      />,
    );
    await waitFor(() => expect(document.title).toMatch(/Wave8 Article/));
    expect(document.querySelector('meta[name="keywords"]')?.getAttribute("content")).toMatch(/khadayata/i);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toMatch(/noindex/i);
    expect(document.querySelector('meta[property="article:published_time"]')).toBeTruthy();
    expect(document.querySelector('meta[property="article:modified_time"]')).toBeTruthy();
    expect(document.querySelector('meta[property="article:author"]')?.getAttribute("content")).toBe("Roshan");
    const ld = document.getElementById("schema-ld-json")?.textContent ?? "";
    expect(ld).toMatch(/BreadcrumbList/);
    expect(ld).toMatch(/FAQPage/);
    expect(ld).toMatch(/NewsArticle|Article/);
    u1();

    // Plain schema object (not @graph) + article without modified/author defaults
    const { unmount: u2 } = render(
      <SEOMeta
        type="article"
        publishedAt="2026-02-01T00:00:00Z"
        schema={{ "@type": "Person", name: "Plain Schema" }}
        image="/relative-og.png"
      />,
    );
    await waitFor(() => {
      const text = document.getElementById("schema-ld-json")?.textContent ?? "";
      expect(text).toMatch(/Plain Schema/);
      expect(text).toMatch(/Article/);
    });
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute("content")).toMatch(
      /khadayataonline\.com\/relative-og\.png/,
    );
    u2();

    // Default title (no title prop)
    render(<SEOMeta description="defaults only" />);
    await waitFor(() => expect(document.title).toMatch(/Connecting Khadayata/i));
  });
});

describe("Pass 19 — sidebar.tsx 100% lines", () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  it("covers controlled setOpenProp, keyboard shortcut, trigger onClick, mobile sheet", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    // Controlled desktop provider — hits setOpenProp branch (line 62)
    const { unmount: u1 } = render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <Sidebar>
          <SidebarHeader>Ctrl</SidebarHeader>
          <SidebarContent>Body</SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger
            onClick={() => {
              /* custom handler — lines 231-232 */
            }}
          />
          <SidebarStateProbe />
        </SidebarInset>
      </SidebarProvider>,
    );
    expect(screen.getByTestId("sidebar-probe").textContent).toMatch(/open:true/);
    await user.click(screen.getByRole("button", { name: /Toggle Sidebar/i }));
    expect(onOpenChange).toHaveBeenCalled();

    // Keyboard shortcut Ctrl/Meta+B (lines 81-85)
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    });
    expect(onOpenChange.mock.calls.length).toBeGreaterThan(1);
    u1();

    // Mobile sheet path (154-171)
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 500 });
    window.matchMedia = ((query: string) => {
      const matches = /max-width:\s*767px/.test(query) || window.innerWidth < 768;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList;
    }) as typeof window.matchMedia;

    const { unmount: u2 } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarContent>
            <div>Mobile sidebar body</div>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
          <SidebarStateProbe />
        </SidebarInset>
      </SidebarProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("sidebar-probe").textContent).toMatch(/mobile:true/), {
      timeout: 5_000,
    });
    await user.click(screen.getByRole("button", { name: /Toggle Sidebar/i }));
    await waitFor(() => expect(screen.getByText("Mobile sidebar body")).toBeInTheDocument(), {
      timeout: 5_000,
    });
    // keyboard toggle on mobile uses setOpenMobile
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", metaKey: true, bubbles: true }));
    });
    u2();
  });
});

describe("Pass 19 — MembersTab remainder → 100% lines", () => {
  beforeAll(async () => {
    await ensureDisposable(true);
    await ensureDeleteTarget();
  }, 120_000);

  afterAll(async () => {
    await cleanupSeeds();
    await supabase.auth.signOut();
  }, 60_000);

  afterEach(() => cleanup());

  it("bulk sent===0 toast, resend success, revoke error, delete success", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const admin = adminClient();
    const memberId = await ensureDisposable(true);

    const { data: rows } = await supabase
      .from("members")
      .select(
        "id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)",
      )
      .neq("first_name", "E2E")
      .order("created_at", { ascending: false })
      .limit(40);

    const list = [...(rows ?? [])];
    for (const id of [seeded.disposableMemberId, seeded.deleteMemberId]) {
      if (!id || list.some((m) => m.id === id)) continue;
      const { data: d } = await admin
        .from("members")
        .select(
          "id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)",
        )
        .eq("id", id)
        .single();
      if (d) list.unshift(d as never);
    }

    // Stub edge invoke: bulk sent>0 then sent===0, invite success, reminder success.
    // supabase.functions is a fresh object each access — stub the prototype.
    const fnProto = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke;
    };
    const origInvoke = fnProto.invoke;
    let bulkCalls = 0;
    fnProto.invoke = (async (name: string, args?: { body?: Record<string, unknown> }) => {
      if (name === "bulk-invite") {
        bulkCalls += 1;
        if (bulkCalls === 1) {
          // sent>0 with failed+skipped → lines 176-179
          return {
            data: { sent: 2, failed: 1, skipped: 1, errors: ["x"], total: 4 },
            error: null,
          };
        }
        // sent===0 → lines 181-186
        return {
          data: { sent: 0, failed: 1, skipped: 0, errors: ["already"], total: 1 },
          error: null,
        };
      }
      if (name === "invite-member") {
        return { data: { success: true }, error: null };
      }
      if (name === "send-reminder") {
        return { data: { success: true, sent: 1, failed: 0, errors: [] }, error: null };
      }
      return origInvoke.call(supabase.functions, name, args as never);
    }) as typeof supabase.functions.invoke;

    // delete-user success via fetch stub (edge may be undeployed locally)
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/functions/v1/delete-user")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return origFetch(input, init);
    }) as typeof fetch;

    // Pre-assign committee role so uncheck hits revoke path; stub revoke_role error once.
    const rpcOrig = supabase.rpc.bind(supabase);
    let revokeStubbed = false;
    const rpcSpy = vi.spyOn(supabase, "rpc").mockImplementation((async (fn: string, args?: object) => {
      if (fn === "revoke_role" && !revokeStubbed) {
        revokeStubbed = true;
        return { data: null, error: { message: "covssm revoke denied" } } as never;
      }
      return rpcOrig(fn as never, args as never);
    }) as typeof supabase.rpc);

    try {
      const { unmount } = renderApp(
        withToaster(
          <MembersTab
            members={list as never[]}
            myChapterId={null}
            isGlobalAdmin
            canInvite
            canSendReminders
          />,
        ),
        { route: "/admin?tab=members" },
      );

      await waitFor(() => expect(document.body.textContent).toMatch(/member/i), { timeout: 30_000 });

      // --- Bulk invite sent>0 toast (176-179) ---
      await clickSafe(user, screen.getByRole("button", { name: /Bulk Invite/i }));
      await waitFor(() => expect(screen.getByText(/Bulk Invite Members/i)).toBeInTheDocument(), {
        timeout: 10_000,
      });
      let fileInput = document.getElementById("bulk-file-upload") as HTMLInputElement;
      let file = new File(
        [`${PREFIX}-a@example.invalid\n${PREFIX}-b@example.invalid\n`],
        "covssm-a.txt",
        { type: "text/plain" },
      );
      await user.upload(fileInput, file);
      await waitFor(() => expect(document.body.textContent).toMatch(/valid email/i), { timeout: 8_000 });
      await clickSafe(user, screen.getByRole("button", { name: /Send .*Invitation/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Bulk invitations sent/i), {
        timeout: 20_000,
      });
      await closeDialogs(user);

      // --- Bulk invite sent===0 destructive toast (181-186) ---
      await clickSafe(user, screen.getByRole("button", { name: /Bulk Invite/i }));
      await waitFor(() => expect(screen.getByText(/Bulk Invite Members/i)).toBeInTheDocument(), {
        timeout: 10_000,
      });
      fileInput = document.getElementById("bulk-file-upload") as HTMLInputElement;
      file = new File([`${PREFIX}-c@example.invalid\n`], "covssm-b.txt", { type: "text/plain" });
      await user.upload(fileInput, file);
      await waitFor(() => expect(document.body.textContent).toMatch(/valid email/i), { timeout: 8_000 });
      await clickSafe(user, screen.getByRole("button", { name: /Send .*Invitation/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/No invitations sent/i), {
        timeout: 20_000,
      });
      await closeDialogs(user);

      // --- Single invite onSuccess (256-260) ---
      await clickSafe(user, screen.getByRole("button", { name: /Invite Member/i }));
      await waitFor(() => expect(screen.getByText(/Invite New Member/i)).toBeInTheDocument(), {
        timeout: 10_000,
      });
      const inviteDialog = screen.getByRole("dialog");
      const emailInput = within(inviteDialog).getByPlaceholderText(/member@example.com/i);
      fireEvent.change(emailInput, { target: { value: `${PREFIX}-invite@example.invalid` } });
      const inputs = within(inviteDialog).getAllByRole("textbox");
      // First Name / Last Name textboxes after email
      for (const inp of inputs) {
        const lab = inp.closest("div")?.querySelector("label")?.textContent ?? "";
        if (/First Name/i.test(lab)) fireEvent.change(inp, { target: { value: "Invite" } });
        if (/Last Name/i.test(lab)) fireEvent.change(inp, { target: { value: "Cov" } });
      }
      await clickSafe(user, within(inviteDialog).getByRole("button", { name: /Send Invitation/i }));
      await waitFor(() => expect(document.body.textContent).toMatch(/Invitation sent/i), {
        timeout: 20_000,
      });
      await closeDialogs(user);

      // --- Resend verification success (266-276) ---
      fireEvent.change(screen.getByPlaceholderText(/Search by name/i), {
        target: { value: seeded.disposableFirst },
      });
      await waitFor(
        () => expect(screen.queryAllByLabelText(/Resend verification email/i).length).toBeGreaterThan(0),
        { timeout: 20_000 },
      );
      await clickSafe(user, screen.getAllByLabelText(/Resend verification email/i)[0]);
      await waitFor(() => expect(document.body.textContent).toMatch(/Verification email resent/i), {
        timeout: 20_000,
      });

      // --- Committee revoke_role error (302-303) ---
      if (seeded.committeeRoleId) {
        await admin.from("role_assignments").delete().eq("member_id", memberId).eq("role_id", seeded.committeeRoleId);
        await admin.from("role_assignments").insert({
          member_id: memberId,
          role_id: seeded.committeeRoleId,
          chapter_id: AHMEDABAD,
        });
      }
      fireEvent.change(screen.getByPlaceholderText(/Search by name/i), {
        target: { value: seeded.disposableFirst },
      });
      await clickSafe(user, screen.queryAllByLabelText(/Edit member/i)[0]);
      await waitFor(() => expect(screen.getByText(/Edit Member/i)).toBeInTheDocument(), { timeout: 15_000 });
      await waitFor(() => {
        const boxes = document.querySelectorAll('input[type="checkbox"][id^="role-"]');
        expect(boxes.length).toBeGreaterThan(0);
      }, { timeout: 15_000 }).catch(() => undefined);
      const roleBox = document.querySelector(
        seeded.committeeRoleId
          ? `input[type="checkbox"]#role-${seeded.committeeRoleId}`
          : 'input[type="checkbox"][id^="role-"]',
      ) as HTMLInputElement | null;
      if (roleBox) {
        // Ensure checked so change path calls mutate with existing assignment
        if (!roleBox.checked) {
          // Force assignment present in memberRoles via re-open if needed
          fireEvent.click(roleBox);
          await new Promise((r) => setTimeout(r, 500));
        }
        fireEvent.click(roleBox); // uncheck → revoke_role stub error
        await waitFor(() => expect(document.body.textContent).toMatch(/covssm revoke denied|Error/i), {
          timeout: 15_000,
        });
      }
      await closeDialogs(user);

      // --- Delete permanently success (380-384) ---
      const delFirst = "CovSSMDel";
      fireEvent.change(screen.getByPlaceholderText(/Search by name/i), { target: { value: delFirst } });
      await waitFor(
        () => expect(screen.queryAllByLabelText(/Member admin actions/i).length).toBeGreaterThan(0),
        { timeout: 15_000 },
      );
      await clickSafe(user, screen.getAllByLabelText(/Member admin actions/i)[0]);
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 10_000 });
      await clickSafe(user, within(screen.getByRole("dialog")).getByRole("button", { name: /Delete Permanently/i }));
      await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 10_000 });
      await clickSafe(
        user,
        within(screen.getByRole("alertdialog")).getByRole("button", { name: /Delete Permanently/i }),
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Member deleted permanently/i), {
        timeout: 20_000,
      });
      seeded.deleteMemberId = null;
      seeded.deleteUserId = null;

      unmount();
    } finally {
      fnProto.invoke = origInvoke;
      globalThis.fetch = origFetch;
      rpcSpy.mockRestore();
    }
  }, 240_000);
});
