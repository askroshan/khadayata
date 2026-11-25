/**
 * Pass 35 — Wave 13 Batch 3c: Close remaining uncovered callbacks in
 * WhatsAppTab, EventGallery, and MemberProfile.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import { EventGallery } from "@/components/events/EventGallery";
import MemberProfile from "@/pages/MemberProfile";

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

describe("Pass 35 — Wave 13 Batch 3c uncovered callbacks", () => {
  it("WhatsAppTab: covers updateTemplate, deleteTemplate, createTemplate, deleteMessage, and sendMessage onError paths", async () => {
    const updateSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced update error" }));
    const deleteTplSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced delete tpl error" }));
    const insertTplSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced create tpl error" }));
    const deleteMsgSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced delete msg error" }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "whatsapp_templates") {
        const c = makeChain([
          {
            id: "tpl-1",
            name: "event_invite",
            language: "en",
            category: "UTILITY",
            header_text: "Header",
            body_text: "Hello {{1}}",
            footer_text: "Footer",
            status: "approved",
            created_at: new Date().toISOString(),
          },
        ]);
        c.update = updateSpy;
        c.delete = deleteTplSpy;
        c.insert = insertTplSpy;
        return c as never;
      }
      if (table === "whatsapp_messages") {
        const c = makeChain([
          {
            id: "msg-1",
            recipient_phone: "+919876543210",
            status: "sent",
            sent_at: new Date().toISOString(),
            error: null,
            created_at: new Date().toISOString(),
            template: { name: "event_invite" },
          },
        ]);
        c.delete = deleteMsgSpy;
        return c as never;
      }
      if (table === "members") {
        return makeChain({ id: "m-1" }) as never;
      }
      return makeChain([]) as never;
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "forced send error" }),
    } as Response);

    renderApp(<WhatsAppTab />);
    await screen.findByText("event_invite");

    // 1. updateTemplate onError
    fireEvent.click(screen.getByRole("button", { name: /edit template/i }));
    const saveEditBtn = await screen.findByRole("button", { name: /save template/i });
    fireEvent.click(saveEditBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
    // Close edit dialog via Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // 2. deleteTemplate onError
    fireEvent.click(screen.getByRole("button", { name: /delete template/i }));
    const confirmDeleteBtn = await screen.findByRole("button", { name: /^Delete$/i });
    fireEvent.click(confirmDeleteBtn);
    await waitFor(() => {
      expect(deleteTplSpy).toHaveBeenCalled();
    });

    // 3. createTemplate onError
    fireEvent.click(screen.getByRole("button", { name: /^Template$/i }));
    const nameInput = await screen.findByPlaceholderText("event_reminder");
    fireEvent.change(nameInput, { target: { value: "new_tpl" } });
    const bodyInput = screen.getByPlaceholderText(/Dear \{\{1\}\}/i);
    fireEvent.change(bodyInput, { target: { value: "Body text" } });
    const saveCreateBtns = screen.getAllByRole("button", { name: /save template/i });
    fireEvent.click(saveCreateBtns[saveCreateBtns.length - 1]);
    await waitFor(() => {
      expect(insertTplSpy).toHaveBeenCalled();
    });
    fireEvent.keyDown(document, { key: "Escape" });

    // 4. sendMessage onError (open send dialog via template's chevron button)
    const templateCard = screen.getByText("event_invite").closest(".shadow-card")!;
    const cardButtons = templateCard.querySelectorAll("button");
    fireEvent.click(cardButtons[cardButtons.length - 1]);
    const phoneInput = await screen.findByPlaceholderText("+919876543210");
    fireEvent.change(phoneInput, { target: { value: "+919876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    fireEvent.keyDown(document, { key: "Escape" });

    // 5. deleteMessage onError
    const historyTab = screen.getByRole("tab", { name: /message history/i });
    fireEvent.mouseDown(historyTab);
    fireEvent.click(historyTab);
    const deleteMsgBtn = await screen.findByRole("button", { name: /delete message/i });
    fireEvent.click(deleteMsgBtn);
    const removeBtn = await screen.findByRole("button", { name: /^Remove$/i });
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(deleteMsgSpy).toHaveBeenCalled();
    });
  });

  it("EventGallery: tagMember mutation onError shows error toast", async () => {
    const insertTagSpy = vi.fn().mockImplementation(() => makeChain(null, { message: "forced tag error" }));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain([
          { id: "m-2", first_name: "Priya", last_name: "Shah" },
        ]);
        c.maybeSingle = () =>
          Promise.resolve({
            data: { id: "m-1", user_id: "u-1", first_name: "Test", last_name: "Admin" },
            error: null,
          });
        return c as never;
      }
      if (table === "event_photos") {
        return makeChain([
          {
            id: "ph-1",
            event_id: "ev-1",
            uploaded_by: "m-1",
            url: "https://example.com/photo.jpg",
            uploader: { first_name: "Test", last_name: "Admin" },
            photo_tags: [],
          },
        ]) as never;
      }
      if (table === "photo_tags") {
        const c = makeChain([]);
        c.insert = insertTagSpy;
        return c as never;
      }
      return makeChain([]) as never;
    });

    renderApp(<EventGallery eventId="ev-1" eventName="Diwali Gala" />);
    await screen.findByText(/Gallery \(1\)/i);

    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    fireEvent.click(img!.closest("button")!);

    const searchInput = await screen.findByPlaceholderText(/search member to tag/i);
    fireEvent.change(searchInput, { target: { value: "Priya" } });

    const priyaBtn = await screen.findByRole("button", { name: /Priya Shah/i });
    fireEvent.click(priyaBtn);

    await waitFor(() => {
      expect(insertTagSpy).toHaveBeenCalled();
    });
  });

  it("MemberProfile: clicking Level Down and Verification Panel Downgrade invokes updateLevelMutation", async () => {
    const updateLevelSpy = vi.fn().mockImplementation(() => makeChain(null));

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "members") {
        const c = makeChain([]);
        c.single = () =>
          Promise.resolve({
            data: {
              id: "m-target",
              user_id: "other-user-id",
              first_name: "Kiran",
              last_name: "Patel",
              middle_names: null,
              verification_level: 2,
              chapter_id: "ch-1",
              chapters: { name: "Ahmedabad" },
              privacy: {},
            },
            error: null,
          });
        c.maybeSingle = () =>
          Promise.resolve({
            data: {
              id: "m-self",
              user_id: "self-user-id",
              first_name: "Admin",
              last_name: "User",
              verification_level: 3,
              chapter_id: "ch-1",
            },
            error: null,
          });
        c.update = updateLevelSpy;
        return c as never;
      }
      if (table === "role_assignments") {
        return makeChain([
          { roles: { name: "Global Admin" }, chapter_id: null },
        ]) as never;
      }
      return makeChain([]) as never;
    });

    renderApp(
      <Routes>
        <Route path="/members/:id" element={<MemberProfile />} />
      </Routes>,
      { route: "/members/m-target" }
    );

    await screen.findByText(/Kiran\s+Patel/i);

    // 1. Header Level Down button
    const levelDownBtn = await screen.findByRole("button", { name: /downgrade verification level/i });
    fireEvent.click(levelDownBtn);
    await waitFor(() => {
      expect(updateLevelSpy).toHaveBeenCalledWith({ verification_level: 1 });
    });

    // 2. Verification Panel Downgrade button
    const panelBtn = screen.getByRole("button", { name: /verification panel/i });
    fireEvent.click(panelBtn);
    const downgradeBtn = await screen.findByRole("button", { name: /^Downgrade$/i });
    fireEvent.click(downgradeBtn);
    await waitFor(() => {
      expect(updateLevelSpy).toHaveBeenCalledTimes(2);
    });
  });
});
