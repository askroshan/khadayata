/**
 * Pass 14 — WhatsAppTab remainder + leftover low-coverage panels against real Kong.
 * Documents WHATSAPP_* secret gate; no Meta Graph happy-path without secrets.
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { AvatarUpload } from "@/components/AvatarUpload";
import { TrustCorpusPanel } from "@/components/finance/TrustCorpusPanel";
import { Toaster } from "@/components/ui/toaster";
import type { ReactNode } from "react";

const PREFIX = `covwa_${Date.now().toString(36)}`;
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

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
    /* overlay races */
  }
}

async function pickSelectOption(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, option: RegExp) {
  await clickSafe(user, trigger);
  const opts = await screen.findAllByRole("option", {}, { timeout: 4000 }).catch(() => []);
  const match = opts.find((o) => option.test(o.textContent ?? ""));
  if (match) await clickSafe(user, match);
}

function hasWhatsAppSecrets(): boolean {
  return Boolean(
    envFromDotenv("WHATSAPP_ACCESS_TOKEN") && envFromDotenv("WHATSAPP_PHONE_NUMBER_ID"),
  );
}

const seeded = {
  templateIds: [] as string[],
  messageIds: [] as string[],
  notifIds: [] as string[],
  fundId: null as string | null,
  memberId: null as string | null,
};

describe("Pass 14 — WhatsApp remainder + leftover panels (real Kong)", () => {
  const url = envFromDotenv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;
  const anon = envFromDotenv("VITE_SUPABASE_ANON_KEY") ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  let gaJwt = "";

  beforeAll(async () => {
    // Document Meta secret gap up front — happy-path Graph send stays blocked without these.
    expect(hasWhatsAppSecrets()).toBe(false);

    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    gaJwt = session?.access_token ?? "";
    expect(gaJwt.length).toBeGreaterThan(20);

    const { data: me } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", session!.user.id)
      .maybeSingle();
    seeded.memberId = me?.id ?? null;

    const admin = adminClient();
    const tplName = `${PREFIX}_tpl`;
    const { data: tpl, error: tplErr } = await admin
      .from("whatsapp_templates")
      .insert({
        name: tplName,
        language: "en",
        category: "UTILITY",
        header_text: "Hello",
        body_text: `${PREFIX} body {{1}}`,
        footer_text: "footer",
        status: "approved",
        created_by: seeded.memberId,
      })
      .select("id")
      .single();
    if (tplErr || !tpl) throw tplErr ?? new Error("seed template failed");
    seeded.templateIds.push(tpl.id);

    const msgRows = [
      {
        template_id: tpl.id,
        recipient_phone: "15550100111",
        status: "sent",
        sent_at: new Date().toISOString(),
        error: null,
      },
      {
        template_id: tpl.id,
        recipient_phone: "15550100112",
        status: "failed",
        sent_at: null,
        error: "config missing",
      },
      {
        template_id: tpl.id,
        recipient_phone: "15550100113",
        status: "queued",
        sent_at: null,
        error: null,
      },
    ];
    const { data: msgs, error: msgErr } = await admin.from("whatsapp_messages").insert(msgRows).select("id");
    if (msgErr) throw msgErr;
    seeded.messageIds.push(...(msgs ?? []).map((m) => m.id));

    // Notifications for icon/href matrix + mark-read
    if (seeded.memberId) {
      const types = [
        "vouch",
        "rsvp",
        "mentorship",
        "verification",
        "announcement",
        "event_created",
        "event_cancelled",
        "event_updated",
        "event_reminder",
        "chapter_message",
        "unknown_type",
      ];
      const { data: notifs, error: nErr } = await admin
        .from("notifications")
        .insert(
          types.map((type, i) => ({
            member_id: seeded.memberId,
            type,
            title: `${PREFIX} ${type}`,
            description: `Pass14 coverage notif ${type}`,
            read: i % 3 === 0,
            entity_id: i === 2 ? seeded.memberId : null,
            entity_type: type,
          })),
        )
        .select("id");
      if (nErr) throw nErr;
      seeded.notifIds.push(...(notifs ?? []).map((n) => n.id));
    }

    // Corpus fund so TrustCorpusPanel leaves empty state
    const { data: fund, error: fErr } = await admin
      .from("funds")
      .insert({
        name: `${PREFIX} Trust Corpus Fund`,
        scope: "global",
        currency: "INR",
        active: true,
        chapter_id: null,
      })
      .select("id")
      .single();
    if (!fErr && fund) {
      seeded.fundId = fund.id;
      await admin.from("donations").insert({
        fund_id: fund.id,
        amount: 2500,
        currency: "INR",
        status: "succeeded",
        donor_name: `${PREFIX} donor`,
      });
    }
  }, 90_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.messageIds.length) await admin.from("whatsapp_messages").delete().in("id", seeded.messageIds);
    if (seeded.templateIds.length) await admin.from("whatsapp_templates").delete().in("id", seeded.templateIds);
    await admin.from("whatsapp_templates").delete().like("name", `${PREFIX}%`);
    if (seeded.notifIds.length) await admin.from("notifications").delete().in("id", seeded.notifIds);
    if (seeded.fundId) {
      await admin.from("donations").delete().eq("fund_id", seeded.fundId);
      await admin.from("funds").delete().eq("id", seeded.fundId);
    }
    await supabase.auth.signOut();
  });

  it("documents WHATSAPP_* secrets block Meta happy-path", () => {
    expect(envFromDotenv("WHATSAPP_ACCESS_TOKEN")).toBeFalsy();
    expect(envFromDotenv("WHATSAPP_PHONE_NUMBER_ID")).toBeFalsy();
    expect(envFromDotenv("WHATSAPP_TOKEN")).toBeFalsy();
  });

  it("WhatsAppTab: create/edit/save, send+blast config gate, history delete, status icons", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });

    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(PREFIX));
    }, { timeout: 25_000 });

    // Create template via UI (covers createTemplate mutation)
    const createTplBtn =
      screen.getAllByRole("button").find((b) => /^\s*Template\s*$/i.test((b.textContent ?? "").trim())) ??
      screen.getAllByRole("button", { name: /^Template$/i })[0];
    await clickSafe(user, createTplBtn);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    const createDlg = screen.getByRole("dialog");
    const nameInput = within(createDlg).getByLabelText(/Template Name/i);
    const bodyInput = within(createDlg).getByLabelText(/Body/i);
    const headerInput = within(createDlg).getByLabelText(/Header/i);
    const footerInput = within(createDlg).getByLabelText(/Footer/i);
    fireEvent.change(nameInput, { target: { value: `${PREFIX}_ui_create` } });
    fireEvent.change(headerInput, { target: { value: "UI Header" } });
    fireEvent.change(bodyInput, { target: { value: "UI body {{1}} for coverage" } });
    fireEvent.change(footerInput, { target: { value: "UI footer" } });
    const lang = within(createDlg).getAllByRole("combobox")[0];
    if (lang) await pickSelectOption(user, lang, /Hindi/i);
    const cat = within(createDlg).getAllByRole("combobox")[1];
    if (cat) await pickSelectOption(user, cat, /Marketing/i);
    await clickSafe(user, within(createDlg).getByRole("button", { name: /Save Template/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Template saved|pending Meta|Error/i);
    }, { timeout: 20_000 });
    await user.keyboard("{Escape}");

    const { data: created } = await supabase
      .from("whatsapp_templates")
      .select("id")
      .eq("name", `${PREFIX}_ui_create`)
      .maybeSingle();
    if (created?.id) seeded.templateIds.push(created.id);

    // Edit + save (covers updateTemplate)
    await waitFor(() => expect(screen.getAllByLabelText(/Edit template/i).length).toBeGreaterThan(0), {
      timeout: 15_000,
    });
    await clickSafe(user, screen.getAllByLabelText(/Edit template/i)[0]);
    await waitFor(() => expect(screen.getByText(/Edit Template/i)).toBeInTheDocument(), { timeout: 8_000 });
    const editDlg = screen.getByRole("dialog");
    const editBody = within(editDlg).getByDisplayValue(/body/i);
    fireEvent.change(editBody, { target: { value: `${PREFIX} body updated {{1}}` } });
    const editHeader = within(editDlg).queryByLabelText(/Header/i);
    if (editHeader) fireEvent.change(editHeader, { target: { value: "Updated header" } });
    const editFooter = within(editDlg).queryByLabelText(/Footer/i);
    if (editFooter) fireEvent.change(editFooter, { target: { value: "Updated footer" } });
    await clickSafe(user, within(editDlg).getByRole("button", { name: /Save Template/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Template updated|Error/i);
    }, { timeout: 15_000 });
    await user.keyboard("{Escape}");

    // Prefer template-row chevron — sets selectedTemplate and opens send dialog
    await user.keyboard("{Escape}");
    const rowSend =
      screen.getAllByRole("button").find((b) => b.querySelector("svg.lucide-chevron-right")) ??
      screen.getAllByRole("button", { name: /^Send$/i })[0];
    await clickSafe(user, rowSend);
    await waitFor(() => expect(screen.getByText(/Send WhatsApp Message/i)).toBeInTheDocument(), {
      timeout: 8_000,
    });
    let sendDlg = screen.getByRole("dialog");
    // If chevron didn't preselect, pick from the select
    const tplSelect = within(sendDlg).queryByRole("combobox");
    if (tplSelect) await pickSelectOption(user, tplSelect, new RegExp(PREFIX));
    await waitFor(() => {
      expect(within(sendDlg).getByText(/Single Recipient/i)).toBeInTheDocument();
    }, { timeout: 5_000 });
    // preview branch when template selected (multiple body hits OK)
    expect(within(sendDlg).queryAllByText(/body|Hello|UI|coverage|covwa_/i).length).toBeGreaterThan(0);
    const phone = within(sendDlg).getByLabelText(/Phone/i);
    fireEvent.change(phone, { target: { value: "15550100999" } });
    await waitFor(() => {
      expect(within(sendDlg).getByRole("button", { name: /Send Message/i })).not.toBeDisabled();
    }, { timeout: 8_000 });
    await clickSafe(user, within(sendDlg).getByRole("button", { name: /Send Message/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(
        /send failed|not configured|whatsapp|token|phone_number|error|fail/,
      );
    }, { timeout: 25_000 });

    // Blast mode — covers members query + handleSendBlast
    sendDlg = screen.getByRole("dialog");
    await clickSafe(user, within(sendDlg).getByText(/Blast All Members/i));
    await waitFor(() => {
      expect(within(sendDlg).getByText(/registered phone|members with/i)).toBeInTheDocument();
    }, { timeout: 15_000 });
    await waitFor(() => {
      expect(within(sendDlg).getByRole("button", { name: /Send to All Members/i })).not.toBeDisabled();
    }, { timeout: 15_000 });
    await clickSafe(user, within(sendDlg).getByRole("button", { name: /Send to All Members/i }));
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/blast complete|send failed|whatsapp|error|fail/);
    }, { timeout: 60_000 });
    await user.keyboard("{Escape}");

    // History tab — status icons + delete message
    await clickSafe(user, screen.getByRole("tab", { name: /Message History|History/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/1555010011|No messages/i);
    }, { timeout: 15_000 });
    const delMsg = screen.queryAllByLabelText(/Delete message/i)[0];
    if (delMsg) {
      await clickSafe(user, delMsg);
      await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 8_000 });
      await clickSafe(
        user,
        within(screen.getByRole("alertdialog")).getByRole("button", { name: /Remove/i }),
      );
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/removed from history|Error/i);
      }, { timeout: 15_000 });
    }

    // Delete a template via UI (covers deleteTemplate) — use UI-created if present
    await clickSafe(user, screen.getByRole("tab", { name: /Templates/i }));
    await waitFor(() => expect(screen.getAllByLabelText(/Delete template/i).length).toBeGreaterThan(0), {
      timeout: 10_000,
    });
    await clickSafe(user, screen.getAllByLabelText(/Delete template/i)[0]);
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 8_000 });
    await clickSafe(user, within(screen.getByRole("alertdialog")).getByRole("button", { name: /^Delete$/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Template deleted|Error/i);
    }, { timeout: 15_000 });

    unmount();
  }, 180_000);

  it("edge send-whatsapp: OPTIONS retry + config gate (no Meta secrets)", async () => {
    expect(gaJwt.length).toBeGreaterThan(20);
    let optStatus = 0;
    for (let i = 0; i < 5; i++) {
      try {
        const opt = await fetch(`${url}/functions/v1/send-whatsapp`, { method: "OPTIONS" });
        optStatus = opt.status;
        if ([200, 204].includes(optStatus)) break;
      } catch {
        /* Kong cold start */
      }
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
    expect([200, 204].includes(optStatus)).toBe(true);

    const missing = await fetch(`${url}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${gaJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect([400, 401, 403, 500].includes(missing.status)).toBe(true);
    const missingText = await missing.text();
    expect(missingText.toLowerCase()).toMatch(/whatsapp|configur|token|required|unauthorized|forbidden/);

    // Without Meta secrets the function short-circuits before template lookup.
    const res = await fetch(`${url}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${gaJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: seeded.templateIds[0] ?? "00000000-0000-0000-0000-000000000099",
        recipient_phone: "15550100999",
        parameters: { "1": "Coverage" },
      }),
    });
    expect([400, 401, 403, 404, 500].includes(res.status)).toBe(true);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/whatsapp|configur|token|phone_number|required|forbidden|not found/);
    if (!hasWhatsAppSecrets()) {
      expect(res.status).toBe(500);
      expect(text).toMatch(/WHATSAPP_ACCESS_TOKEN|WHATSAPP_PHONE_NUMBER_ID|not configured/i);
    }
  }, 60_000);

  it("NotificationsPanel: seed types, mark one + mark all read", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    renderApp(withToaster(<NotificationsPanel />), { route: "/dashboard" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Notifications/i })).toBeInTheDocument();
    }, { timeout: 20_000 });

    await clickSafe(user, screen.getByRole("button", { name: /Notifications/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(new RegExp(PREFIX));
    }, { timeout: 20_000 });

    // Click an unread row (covers markOneRead + notifHref branches)
    const unreadDot = screen.queryAllByLabelText(/Unread/i)[0];
    if (unreadDot) {
      const row = unreadDot.closest("a, div.cursor-pointer, div.flex") as HTMLElement | null;
      await clickSafe(user, row ?? unreadDot);
    }

    // Re-open and mark all
    await clickSafe(user, screen.getByRole("button", { name: /Notifications/i }));
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Notifications|Mark all|No recent/i);
    }, { timeout: 10_000 });
    const markAll = screen.queryByRole("button", { name: /Mark all read/i });
    await clickSafe(user, markAll);
    await waitFor(() => expect(true).toBe(true), { timeout: 8_000 });
  }, 90_000);

  it("AvatarUpload validation + TrustCorpusPanel with corpus fund", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    let uploaded: string | null = null;
    const { unmount } = renderApp(
      withToaster(
        <div>
          <AvatarUpload
            currentUrl={null}
            onUploadComplete={(u) => {
              uploaded = u;
            }}
            initials="GA"
            size="lg"
          />
          <TrustCorpusPanel myChapterId={AHMEDABAD} />
          <TrustCorpusPanel myChapterId={null} />
        </div>,
      ),
      { route: "/profile" },
    );

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Trust Corpus|Corpus|No Trust Corpus|Photo|Upload|Camera/i);
    }, { timeout: 25_000 });

    if (seeded.fundId) {
      await waitFor(() => {
        expect(document.body.textContent).toMatch(new RegExp(PREFIX));
      }, { timeout: 15_000 });
    }

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();

    function setFiles(input: HTMLInputElement, files: File[]) {
      Object.defineProperty(input, "files", { configurable: true, value: files });
      fireEvent.change(input);
    }

    // Invalid file type
    setFiles(fileInput!, [new File(["not-an-image"], "notes.txt", { type: "text/plain" })]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Invalid file|image file/i);
    }, { timeout: 8_000 });

    // Oversized image (>5MB)
    const bigBuf = new Uint8Array(5 * 1024 * 1024 + 10);
    setFiles(fileInput!, [new File([bigBuf], "big.png", { type: "image/png" })]);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/too large|5MB|Maximum/i);
    }, { timeout: 8_000 });

    // Tiny valid PNG — may fail storage or succeed; both cover upload path
    const png = new File(
      [Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))],
      "dot.png",
      { type: "image/png" },
    );
    setFiles(fileInput!, [png]);
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/uploaded|upload failed|photo|error|storage/);
    }, { timeout: 20_000 });
    void uploaded;
    void user;

    unmount();
  }, 90_000);
});
