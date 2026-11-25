/**
 * Pass 53 — Wave 19: Branch coverage burn-down for BulkContentTab and WhatsAppTab.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import BulkContentTab from "@/components/admin/BulkContentTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";

beforeAll(async () => {
  await supabase.auth.signInWithPassword({
    email: E2E_ACCOUNTS.globalAdmin.email,
    password: E2E_PASSWORD,
  });
});

afterAll(async () => {
  await supabase.auth.signOut();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeChain(data: unknown, error: unknown = null) {
  const result = { data, error, count: Array.isArray(data) ? data.length : 0 };
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    not: () => chain,
    in: () => chain,
    is: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function activateTab(el: HTMLElement) {
  fireEvent.mouseDown(el, { button: 0, ctrlKey: false });
  fireEvent.click(el);
}

describe("Pass 53 — Wave 19: BulkContentTab branches", () => {
  it("handles null data response (returns empty list)", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null) as never);

    renderApp(<BulkContentTab />);
    expect(await screen.findByText("No records found")).toBeInTheDocument();
  });

  it("renders all 6 content types with null/missing optional fields and fallback branches", async () => {
    const now = new Date().toISOString();
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "events") {
        return makeChain([
          { id: "ev-1", name: "Null Status Event", status: null, created_at: now },
          { id: "ev-2", name: "Cancelled Event", status: "cancelled", created_at: now },
          { id: "ev-3", name: "Unknown Status Event", status: "custom", created_at: now },
        ]) as never;
      }
      if (table === "businesses") {
        return makeChain([
          { id: "biz-1", name: "Unverified Biz", sector: null, verified: false, created_at: now },
          { id: "biz-2", name: "Verified Biz", sector: "Tech", verified: true, created_at: now },
        ]) as never;
      }
      if (table === "jobs") {
        return makeChain([
          { id: "job-1", title: "Null Fields Job", location: null, status: null, created_at: now },
          { id: "job-2", title: "Open Job", location: "Mumbai", status: "open", created_at: now },
        ]) as never;
      }
      if (table === "content_news") {
        return makeChain([
          { id: "news-1", title: "Null Status News", status: null, created_at: now },
          { id: "news-2", title: "Published News", status: "published", created_at: now },
        ]) as never;
      }
      if (table === "matrimonial_profiles") {
        return makeChain([
          { id: "mat12345-abcd", members: null, status: null, created_at: now },
          { id: "mat67890-efgh", members: { first_name: "Aarav", last_name: "Shah" }, status: "published", created_at: now },
        ]) as never;
      }
      if (table === "oral_histories") {
        return makeChain([
          { id: "oral1234-abcd", title: null, status: null, created_at: now },
          { id: "oral5678-efgh", title: "Named Story", status: "draft", created_at: now },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<BulkContentTab />);

    // 1. Events tab (default)
    expect(await screen.findByText("Null Status Event")).toBeInTheDocument();
    expect(screen.getByText("Cancelled Event")).toBeInTheDocument();
    expect(screen.getByText("Unknown Status Event")).toBeInTheDocument();

    // 2. Businesses tab
    activateTab(screen.getByRole("tab", { name: /businesses/i }));
    expect(await screen.findByText("Unverified Biz")).toBeInTheDocument();
    expect(screen.getByText("Verified Biz")).toBeInTheDocument();
    expect(screen.getByText("unverified")).toBeInTheDocument();
    expect(screen.getByText("verified")).toBeInTheDocument();

    // 3. Jobs tab
    activateTab(screen.getByRole("tab", { name: /jobs/i }));
    expect(await screen.findByText("Null Fields Job")).toBeInTheDocument();
    expect(screen.getByText("Open Job")).toBeInTheDocument();

    // 4. News Articles tab
    activateTab(screen.getByRole("tab", { name: /news articles/i }));
    expect(await screen.findByText("Null Status News")).toBeInTheDocument();
    expect(screen.getByText("Published News")).toBeInTheDocument();

    // 5. Matrimonial Profiles tab
    activateTab(screen.getByRole("tab", { name: /matrimonial profiles/i }));
    expect(await screen.findByText("mat12345")).toBeInTheDocument();
    expect(screen.getByText("Aarav Shah")).toBeInTheDocument();

    // 6. Oral Histories tab
    activateTab(screen.getByRole("tab", { name: /oral histories/i }));
    expect(await screen.findByText("oral1234")).toBeInTheDocument();
    expect(screen.getByText("Named Story")).toBeInTheDocument();
  });
});

describe("Pass 53 — Wave 19: WhatsAppTab branches", () => {
  it("handles null data for templates, messages, and blast members", async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => makeChain(null) as never);

    renderApp(<WhatsAppTab />);
    expect(await screen.findByText(/no templates yet/i)).toBeInTheDocument();

    // Switch to history tab (null messages -> empty)
    activateTab(screen.getByRole("tab", { name: /message history/i }));
    expect(await screen.findByText(/no messages sent yet/i)).toBeInTheDocument();

    // Open send dialog and switch to bulk mode (null members -> empty)
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /blast all members/i }));
    await waitFor(() => {
      expect(screen.getByText(/members with registered phone numbers/i)).toBeInTheDocument();
    });
  });

  it("handles editTemplate with null header/footer, createTemplate with null member, deleteMessage error, and blast with empty members", async () => {
    const now = new Date().toISOString();
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null));
    const insertSpy = vi.fn().mockImplementation(() => makeChain(null));
    const deleteMsgSpy = vi.fn().mockImplementation(() => makeChain(null, new Error("delete msg failed")));

    let membersCallCount = 0;
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "whatsapp_templates") {
        const c = makeChain([
          {
            id: "tpl-1",
            name: "welcome_msg",
            language: "en",
            category: "UTILITY",
            header_text: null,
            body_text: "Hello {{1}}",
            footer_text: null,
            status: "approved",
            created_at: now,
          },
        ]);
        c.update = updateSpy;
        c.insert = insertSpy;
        return c as never;
      }
      if (table === "whatsapp_messages") {
        const c = makeChain([
          {
            id: "msg-1",
            recipient_phone: "+919876543210",
            status: "failed",
            sent_at: null,
            error: "Rate limited",
            created_at: now,
            template: { name: "welcome_msg" },
          },
        ]);
        c.delete = deleteMsgSpy;
        return c as never;
      }
      if (table === "members") {
        membersCallCount++;
        // First call: createTemplate member lookup -> null
        // Subsequent call: bulkMode members query -> empty or member with null member_contacts
        if (membersCallCount === 1) {
          return makeChain(null) as never;
        }
        return makeChain([]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<WhatsAppTab />);
    expect(await screen.findByText("welcome_msg")).toBeInTheDocument();

    // 1. Edit template with null header_text and null footer_text
    fireEvent.click(screen.getByRole("button", { name: /edit template/i }));
    const saveEditBtn = await screen.findByRole("button", { name: /save template/i });
    fireEvent.click(saveEditBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });

    // 2. Create template when member lookup returns null (created_by: null)
    fireEvent.click(screen.getByRole("button", { name: /^template$/i }));
    fireEvent.change(await screen.findByLabelText(/template name/i), { target: { value: "new_tpl" } });
    fireEvent.change(screen.getByLabelText(/body \*/i), { target: { value: "Body text" } });
    fireEvent.click(screen.getByRole("button", { name: /save template/i }));
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalled();
    });

    // 3. Delete message error path (if (error) throw error + onError toast)
    activateTab(screen.getByRole("tab", { name: /message history/i }));
    const delMsgBtn = await screen.findByRole("button", { name: /delete message/i });
    fireEvent.click(delMsgBtn);
    const confirmRemoveBtn = await screen.findByRole("button", { name: /^remove$/i });
    fireEvent.click(confirmRemoveBtn);
    await waitFor(() => {
      expect(deleteMsgSpy).toHaveBeenCalled();
    });

    // 4. Open send dialog via template quick-send button, switch to bulkMode with empty members, click Send to All Members
    activateTab(screen.getByRole("tab", { name: /templates/i }));
    const sendButtons = await screen.findAllByRole("button");
    // Click the ChevronRight quick-send button on the template card (sets selectedTemplate = "tpl-1" & opens dialog)
    const quickSendBtn = sendButtons.find((b) => b.querySelector("svg.lucide-chevron-right"));
    expect(quickSendBtn).toBeTruthy();
    fireEvent.click(quickSendBtn!);

    fireEvent.click(await screen.findByRole("button", { name: /blast all members/i }));
    const blastBtn = await screen.findByRole("button", { name: /send to all members/i });
    fireEvent.click(blastBtn);
  });

  it("handles bulkMode members with null member_contacts", async () => {
    const now = new Date().toISOString();
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "whatsapp_templates") {
        return makeChain([
          {
            id: "tpl-2",
            name: "alert_msg",
            language: "en",
            category: "UTILITY",
            header_text: "Header",
            body_text: "Alert body",
            footer_text: "Footer",
            status: "rejected",
            created_at: now,
          },
        ]) as never;
      }
      if (table === "members") {
        return makeChain([
          { id: "m-1", first_name: "No", last_name: "Contacts", member_contacts: null },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<WhatsAppTab />);
    expect(await screen.findByText("alert_msg")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /blast all members/i }));
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });
});
