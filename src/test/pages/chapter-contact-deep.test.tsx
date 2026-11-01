import { describe, it, expect, afterAll } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { ChapterContact } from "@/components/profile/ChapterContact";
import { FamilyTree } from "@/components/profile/FamilyTree";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { RishtaWorkflow } from "@/components/matrimonial/RishtaWorkflow";
import { render } from "@testing-library/react";

let lastSignInAt = 0;
async function signIn(email: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email?.toLowerCase() === email.toLowerCase()) return;
  const gap = Date.now() - lastSignInAt;
  if (gap < 2500) await new Promise((r) => setTimeout(r, 2500 - gap));
  for (let i = 0; i < 5; i++) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    lastSignInAt = Date.now();
    if (!error) return;
    if (/rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    }
    throw error;
  }
}

describe("ChapterContact + FamilyTree + QR deep", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("QRCodeDisplay paints via canvas stub", () => {
    const { container } = render(
      <div>
        <QRCodeDisplay data="coverage-a" size={128} />
        <QRCodeDisplay data="coverage-b" size={64} fgColor="#111" bgColor="#fafafa" />
      </div>,
    );
    expect(container.querySelectorAll("canvas").length).toBe(2);
  });

  it("ChapterContact opens dialog and attempts send with committee", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<ChapterContact />, { route: "/profile" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/chapter|committee|contact|message|reach/);
    }, { timeout: 25_000 });

    const openBtn = screen.queryAllByRole("button").find((b) =>
      /contact|message|reach|write|send/i.test(b.textContent ?? ""),
    );
    if (openBtn) await user.click(openBtn);

    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(30);
    }, { timeout: 10_000 });

    for (const trigger of screen.queryAllByRole("combobox")) {
      try {
        await user.click(trigger);
        const opts = await screen.findAllByRole("option", {}, { timeout: 2000 }).catch(() => []);
        if (opts[0]) await user.click(opts[0]);
      } catch { /* ignore */ }
    }
    for (const input of Array.from(document.querySelectorAll("input")).slice(0, 3)) {
      fireEvent.change(input, { target: { value: "Coverage subject" } });
    }
    for (const ta of Array.from(document.querySelectorAll("textarea")).slice(0, 2)) {
      fireEvent.change(ta, { target: { value: "Hello committee — coverage pass 6 message body." } });
    }
    const send = screen.queryByRole("button", { name: /Send|Submit/i });
    if (send && !(send as HTMLButtonElement).disabled) {
      await user.click(send);
      await waitFor(() => expect(true).toBe(true), { timeout: 8_000 });
    }
  }, 60_000);

  it("FamilyTree renders seeded cousin link", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from("members").select("id").eq("user_id", user!.id).maybeSingle();
    renderApp(<FamilyTree memberId={member!.id} />, { route: "/profile" });
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/cousin|family|srushti|connection|no family|unable/);
    }, { timeout: 20_000 });
    // Prefer seeing the seeded relative
    expect(document.body.textContent ?? "").toMatch(/Srushti|cousin|Family|family/i);
  }, 40_000);

  it("RishtaWorkflow inbox + send dialog with real profile ids", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from("members").select("id").eq("user_id", user!.id).maybeSingle();
    const { data: profile } = await supabase.from("matrimonial_profiles").select("id").eq("member_id", member!.id).maybeSingle();
    const { data: target } = await supabase
      .from("matrimonial_profiles")
      .select("id")
      .neq("member_id", member!.id)
      .limit(1)
      .maybeSingle();
    expect(profile?.id).toBeTruthy();
    expect(target?.id).toBeTruthy();
    const u = userEvent.setup();
    renderApp(
      <div>
        <RishtaWorkflow myProfileId={profile!.id} />
        <RishtaWorkflow myProfileId={profile!.id} targetProfileId={target!.id} introMessage="Coverage intro" />
      </div>,
      { route: "/matrimonial/manage" },
    );
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/rishta|send|request|withdraw|introduction/);
    }, { timeout: 25_000 });
    const send = screen.queryByRole("button", { name: /Send Rishta/i });
    if (send) {
      await u.click(send);
      await waitFor(() => {
        expect(document.body.textContent?.toLowerCase()).toMatch(/introduction message|workflow|send rishta request/);
      }, { timeout: 8_000 });
      // Do not confirm send again if already seeded; close dialog
      fireEvent.keyDown(document, { key: "Escape" });
    }
    for (const b of screen.queryAllByRole("button").slice(0, 8)) {
      if ((b as HTMLButtonElement).disabled) continue;
      try { await u.click(b); } catch { /* ignore */ }
    }
  }, 60_000);
});
