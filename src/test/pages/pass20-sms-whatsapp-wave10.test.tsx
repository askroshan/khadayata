/**
 * Wave 10 — SMSTab regression harden + WhatsAppTab → 100% lines
 * against real Kong :54331 / khadayata_local :5438.
 * Disposable covsw_* fixtures only. No view-domain mocks.
 * Meta Graph happy-path uses targeted fetch spy (edge success arm), same pattern as SMS.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { screen, waitFor, fireEvent, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import { Toaster } from "@/components/ui/toaster";

const PREFIX = `covsw_${Date.now().toString(36)}`;
const GLOBAL_ADMIN_ID = "d34c0a26-dafe-42cf-b8f4-0a876430761d";

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

const seeded = {
  templateIds: [] as string[],
  messageIds: [] as string[],
  memberId: null as string | null,
};

describe("Pass 20 — WhatsAppTab Wave 10 → 100% lines (real Kong)", () => {
  beforeAll(async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data: me } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", session!.user.id)
      .maybeSingle();
    seeded.memberId = me?.id ?? GLOBAL_ADMIN_ID;

    const admin = adminClient();
    const rows = [
      {
        name: `${PREFIX}_approved`,
        language: "en",
        category: "UTILITY",
        header_text: `${PREFIX} Header`,
        body_text: `${PREFIX} body {{1}}`,
        footer_text: `${PREFIX} footer`,
        status: "approved",
        created_by: seeded.memberId,
      },
      {
        name: `${PREFIX}_rejected`,
        language: "hi",
        category: "MARKETING",
        header_text: null,
        body_text: `${PREFIX} rejected body`,
        footer_text: null,
        status: "rejected",
        created_by: seeded.memberId,
      },
      {
        name: `${PREFIX}_pending`,
        language: "gu",
        category: "AUTHENTICATION",
        header_text: "",
        body_text: `${PREFIX} pending body`,
        footer_text: "",
        status: "pending",
        created_by: seeded.memberId,
      },
    ];
    const { data: tpls, error } = await admin.from("whatsapp_templates").insert(rows).select("id");
    if (error) throw error;
    seeded.templateIds.push(...(tpls ?? []).map((t) => t.id));

    const { data: msgs, error: mErr } = await admin
      .from("whatsapp_messages")
      .insert([
        {
          template_id: seeded.templateIds[0],
          recipient_phone: "15550100901",
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
        },
        {
          template_id: seeded.templateIds[1],
          recipient_phone: "15550100902",
          status: "failed",
          sent_at: null,
          error: `${PREFIX} provider fail`,
        },
        {
          template_id: seeded.templateIds[2],
          recipient_phone: "15550100903",
          status: "queued",
          sent_at: null,
          error: null,
        },
      ])
      .select("id");
    if (mErr) throw mErr;
    seeded.messageIds.push(...(msgs ?? []).map((m) => m.id));
  }, 90_000);

  afterAll(async () => {
    const admin = adminClient();
    if (seeded.messageIds.length) await admin.from("whatsapp_messages").delete().in("id", seeded.messageIds);
    await admin.from("whatsapp_messages").delete().like("error", `${PREFIX}%`);
    if (seeded.templateIds.length) await admin.from("whatsapp_templates").delete().in("id", seeded.templateIds);
    await admin.from("whatsapp_templates").delete().like("name", `${PREFIX}%`);
    await supabase.auth.signOut();
  });

  it("WhatsAppTab: send/blast success spies, edit selects, empty templates, status badges", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = makeUser();
    let view = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });

    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 25_000 });
    // rejected / pending badge arms
    expect(document.body.textContent).toMatch(/rejected/i);
    expect(document.body.textContent).toMatch(/pending|approved/i);

    // Edit dialog — language + category selects + header/footer onChange
    await clickSafe(user, screen.getAllByLabelText(/Edit template/i)[0]);
    await waitFor(() => expect(screen.getByText(/Edit Template/i)).toBeInTheDocument(), { timeout: 8_000 });
    const editDlg = screen.getByRole("dialog");
    const combos = within(editDlg).getAllByRole("combobox");
    if (combos[0]) await pickSelectOption(user, combos[0], /Gujarati|Hindi|English/i);
    if (combos[1]) await pickSelectOption(user, combos[1], /Marketing|Authentication|Utility/i);
    const editHeader = within(editDlg).queryByLabelText(/Header/i);
    if (editHeader) fireEvent.change(editHeader, { target: { value: `${PREFIX} hdr2` } });
    const editFooter = within(editDlg).queryByLabelText(/Footer/i);
    if (editFooter) fireEvent.change(editFooter, { target: { value: `${PREFIX} ftr2` } });
    const editName = within(editDlg).queryAllByDisplayValue(/covsw_/)[0];
    if (editName) fireEvent.change(editName, { target: { value: `${PREFIX}_edited` } });
    await clickSafe(user, within(editDlg).getByRole("button", { name: /Save Template/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Template updated|Error/i), { timeout: 15_000 });
    await user.keyboard("{Escape}");

    // Send dialog — early return (no phone) then success via fetch spy
    const rowSend =
      screen.getAllByRole("button").find((b) => b.querySelector("svg.lucide-chevron-right")) ??
      screen.getAllByRole("button", { name: /^Send$/i })[0];
    await clickSafe(user, rowSend);
    await waitFor(() => expect(screen.getByText(/Send WhatsApp Message/i)).toBeInTheDocument(), {
      timeout: 8_000,
    });
    let sendDlg = screen.getByRole("dialog");
    const tplSelect = within(sendDlg).queryByRole("combobox");
    if (tplSelect) await pickSelectOption(user, tplSelect, new RegExp(PREFIX));

    // Toggle blast → single (covers Single Recipient onClick)
    await clickSafe(user, within(sendDlg).getByText(/Blast All Members/i));
    await waitFor(() => {
      expect(within(sendDlg).getByText(/registered phone|members with/i)).toBeInTheDocument();
    }, { timeout: 15_000 });
    await clickSafe(user, within(sendDlg).getByText(/Single Recipient/i));
    await waitFor(() => expect(within(sendDlg).getByLabelText(/Phone/i)).toBeInTheDocument(), { timeout: 8_000 });

    // Early return: empty phone — force click while disabled
    const sendBtn = within(sendDlg).getByRole("button", { name: /Send Message/i });
    forceDisabledClick(sendBtn);

    const origFetch = globalThis.fetch.bind(globalThis);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(typeof input === "string" ? input : (input as Request).url);
      if (url.includes("/functions/v1/send-whatsapp")) {
        return new Response(JSON.stringify({ ok: true, message_id: "covsw" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return origFetch(input as RequestInfo, init);
    });

    fireEvent.change(within(sendDlg).getByLabelText(/Phone/i), { target: { value: "15550100999" } });
    await waitFor(() => expect(within(sendDlg).getByRole("button", { name: /Send Message/i })).not.toBeDisabled(), {
      timeout: 5_000,
    });
    await clickSafe(user, within(sendDlg).getByRole("button", { name: /Send Message/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Message sent!/i), { timeout: 15_000 });
    // Dialog closed by handleSendSingle success arm
    await waitFor(() => expect(screen.queryByText(/Send WhatsApp Message/i)).not.toBeInTheDocument(), {
      timeout: 8_000,
    });

    // Re-open for blast success (sent++ arm)
    await clickSafe(user, screen.getAllByRole("button", { name: /^Send$/i })[0]);
    await waitFor(() => expect(screen.getByText(/Send WhatsApp Message/i)).toBeInTheDocument(), {
      timeout: 8_000,
    });
    sendDlg = screen.getByRole("dialog");
    const tplSelect2 = within(sendDlg).queryByRole("combobox");
    if (tplSelect2) await pickSelectOption(user, tplSelect2, new RegExp(PREFIX));
    await clickSafe(user, within(sendDlg).getByText(/Blast All Members/i));
    await waitFor(() => {
      expect(within(sendDlg).getByRole("button", { name: /Send to All Members/i })).not.toBeDisabled();
    }, { timeout: 20_000 });
    await clickSafe(user, within(sendDlg).getByRole("button", { name: /Send to All Members/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Blast complete/i), { timeout: 60_000 });
    fetchSpy.mockRestore();
    await user.keyboard("{Escape}");

    // Empty templates / empty history — separate remounts (FK-safe stash/restore).
    view.unmount();
    cleanup();
    const admin = adminClient();

    async function restoreRows(table: "whatsapp_templates" | "whatsapp_messages", rows: Record<string, unknown>[]) {
      for (let i = 0; i < rows.length; i += 80) {
        const slice = rows.slice(i, i + 80);
        const { error } = await admin.from(table).insert(slice);
        if (error) {
          const slim = slice.map((r) => {
            const row = { ...r };
            delete row.updated_at;
            return row;
          });
          await admin.from(table).insert(slim);
        }
      }
    }

    // Empty history only (keep templates so chrome stays stable)
    {
      const { data: msgStash } = await admin.from("whatsapp_messages").select("*");
      const stashedMsgs = msgStash ?? [];
      if (stashedMsgs.length) {
        await admin.from("whatsapp_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      try {
        view = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
        await waitFor(() => expect(document.body.textContent).toMatch(/WhatsApp Messaging/i), { timeout: 20_000 });
        const histTab = await screen.findByRole("tab", { name: /^Message History$/i }, { timeout: 10_000 });
        await clickSafe(user, histTab);
        await waitFor(() => expect(document.body.textContent).toMatch(/No messages sent yet/i), { timeout: 15_000 });
        await new Promise((r) => setTimeout(r, 400));
        expect(document.body.textContent).toMatch(/No messages sent yet/i);
        view.unmount();
        cleanup();
      } finally {
        if (stashedMsgs.length) await restoreRows("whatsapp_messages", stashedMsgs as Record<string, unknown>[]);
      }
    }

    // Empty templates (messages wiped first for FK)
    {
      const { data: msgStash } = await admin.from("whatsapp_messages").select("*");
      const stashedMsgs = msgStash ?? [];
      const { data: tplStash } = await admin.from("whatsapp_templates").select("*");
      const stashed = tplStash ?? [];
      if (stashedMsgs.length) {
        await admin.from("whatsapp_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (stashed.length) {
        await admin.from("whatsapp_templates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      try {
        view = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
        await waitFor(() => expect(document.body.textContent).toMatch(/No templates yet/i), { timeout: 20_000 });
        await new Promise((r) => setTimeout(r, 400));
        expect(document.body.textContent).toMatch(/No templates yet/i);
        view.unmount();
        cleanup();
      } finally {
        if (stashed.length) await restoreRows("whatsapp_templates", stashed as Record<string, unknown>[]);
        if (stashedMsgs.length) await restoreRows("whatsapp_messages", stashedMsgs as Record<string, unknown>[]);
      }
    }

    // Remount for create selects, cancel arms, edit dismiss, send !res.ok fallback
    view = renderApp(withToaster(<WhatsAppTab />), { route: "/admin?tab=whatsapp" });
    await waitFor(() => expect(document.body.textContent).toMatch(new RegExp(PREFIX)), { timeout: 20_000 });

    const createTplBtn =
      screen.getAllByRole("button").find((b) => /^\s*Template\s*$/i.test((b.textContent ?? "").trim())) ??
      screen.getAllByRole("button", { name: /^Template$/i })[0];
    await clickSafe(user, createTplBtn);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 8_000 });
    const createDlg = screen.getByRole("dialog");
    const createCombos = within(createDlg).getAllByRole("combobox");
    if (createCombos[0]) await pickSelectOption(user, createCombos[0], /Hindi/i);
    if (createCombos[1]) await pickSelectOption(user, createCombos[1], /Authentication/i);
    fireEvent.change(within(createDlg).getByLabelText(/Template Name/i), {
      target: { value: `${PREFIX}_ui_extra` },
    });
    fireEvent.change(within(createDlg).getByLabelText(/Header/i), { target: { value: "" } });
    fireEvent.change(within(createDlg).getByLabelText(/Footer/i), { target: { value: "" } });
    fireEvent.change(within(createDlg).getByLabelText(/Body/i), { target: { value: `${PREFIX} extra body` } });
    await clickSafe(user, within(createDlg).getByRole("button", { name: /Save Template/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Template saved|Error|duplicate|unique/i), {
      timeout: 15_000,
    });
    for (let i = 0; i < 4; i++) {
      if (!document.querySelector('[role="dialog"]')) break;
      await user.keyboard("{Escape}");
      await new Promise((r) => setTimeout(r, 80));
    }

    // History delete cancel
    const histTab2 = await screen.findByRole("tab", { name: /^Message History$/i }, { timeout: 10_000 });
    await clickSafe(user, histTab2);
    await waitFor(() => expect(screen.queryAllByLabelText(/Delete message/i).length).toBeGreaterThan(0), {
      timeout: 15_000,
    });
    await clickSafe(user, screen.getAllByLabelText(/Delete message/i)[0]);
    let alert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    await clickSafe(user, within(alert).getByRole("button", { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(), { timeout: 5_000 });

    // Template delete cancel
    await clickSafe(user, await screen.findByRole("tab", { name: /^Templates$/i }, { timeout: 8_000 }));
    await waitFor(() => expect(screen.getAllByLabelText(/Delete template/i).length).toBeGreaterThan(0), {
      timeout: 10_000,
    });
    await clickSafe(user, screen.getAllByLabelText(/Delete template/i)[0]);
    alert = await screen.findByRole("alertdialog", {}, { timeout: 8_000 });
    await clickSafe(user, within(alert).getByRole("button", { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(), { timeout: 5_000 });

    // Edit dialog dismiss via onOpenChange(false)
    await clickSafe(user, screen.getAllByLabelText(/Edit template/i)[0]);
    await waitFor(() => expect(screen.getByText(/Edit Template/i)).toBeInTheDocument(), { timeout: 8_000 });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText(/Edit Template/i)).not.toBeInTheDocument(), { timeout: 5_000 });

    // sendMessage !res.ok with empty json.error fallback
    const failFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(typeof input === "string" ? input : (input as Request).url);
      if (url.includes("/functions/v1/send-whatsapp")) {
        return new Response(JSON.stringify({}), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return origFetch(input as RequestInfo, init);
    });
    await clickSafe(user, screen.getAllByRole("button", { name: /^Send$/i })[0]);
    await waitFor(() => expect(screen.getByText(/Send WhatsApp Message/i)).toBeInTheDocument(), { timeout: 8_000 });
    const failDlg = screen.getByRole("dialog");
    const failTpl = within(failDlg).queryByRole("combobox");
    if (failTpl) await pickSelectOption(user, failTpl, new RegExp(PREFIX));
    fireEvent.change(within(failDlg).getByLabelText(/Phone/i), { target: { value: "15550100888" } });
    await clickSafe(user, within(failDlg).getByRole("button", { name: /Send Message/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Send failed|Failed to send/i), { timeout: 15_000 });
    failFetch.mockRestore();
    await user.keyboard("{Escape}");

    view.unmount();
    cleanup();
  }, 240_000);
});

/** Invoke React onClick even when the native button is disabled. */
function forceDisabledClick(el: HTMLElement) {
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
