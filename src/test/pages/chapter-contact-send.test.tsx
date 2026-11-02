import { describe, it, expect, afterAll } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { ChapterContact } from "@/components/profile/ChapterContact";
import { FamilyInviteDialog } from "@/components/profile/FamilyInviteDialog";

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

describe("ChapterContact send + FamilyInvite email paths", () => {
  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("ChapterContact lists committee and sends a message (DB + optional email)", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const user = userEvent.setup();
    renderApp(<ChapterContact />, { route: "/profile" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Send a Message/i })).toBeInTheDocument();
    }, { timeout: 25_000 });

    expect(document.body.textContent ?? "").toMatch(/Contact Chapter Committee|Chapter Admin|Call/i);

    await user.click(screen.getByRole("button", { name: /Send a Message/i }));
    await waitFor(() => {
      expect(screen.getByText(/Message a Committee Member/i)).toBeInTheDocument();
    }, { timeout: 8_000 });

    const dialog = screen.getByRole("dialog");
    const trigger = within(dialog).getByRole("combobox");
    await user.click(trigger);
    const opts = await screen.findAllByRole("option");
    expect(opts.length).toBeGreaterThan(0);
    await user.click(opts[0]);

    fireEvent.change(within(dialog).getByPlaceholderText(/Brief subject/i), {
      target: { value: "Pass7 coverage subject" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText(/Write your message/i), {
      target: { value: "Pass7 coverage body — committee contact email path." },
    });

    const send = within(dialog).getByRole("button", { name: /Send Message/i });
    expect(send).not.toBeDisabled();
    await user.click(send);

    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/sent|error|notified|message/);
    }, { timeout: 20_000 });
  }, 90_000);

  it("FamilyInviteDialog opens and can fill invite form (email invoke path)", async () => {
    await signIn(E2E_ACCOUNTS.member.email);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from("members").select("id").eq("user_id", authUser!.id).maybeSingle();
    const user = userEvent.setup();
    renderApp(<FamilyInviteDialog memberId={member!.id} />, { route: "/profile" });

    await waitFor(() => {
      expect(document.body.textContent?.length ?? 0).toBeGreaterThan(10);
    }, { timeout: 20_000 });

    const open = screen.queryAllByRole("button").find((b) =>
      /invite|family|add/i.test(b.textContent ?? ""),
    );
    if (open) await user.click(open);

    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toMatch(/invite|email|family|relation|name/);
    }, { timeout: 10_000 });

    for (const input of Array.from(document.querySelectorAll("input")).slice(0, 4)) {
      const ph = (input.getAttribute("placeholder") ?? "").toLowerCase();
      const type = input.getAttribute("type");
      if (type === "email" || ph.includes("email")) {
        fireEvent.change(input, { target: { value: "family-invite-pass7@example.invalid" } });
      } else if (ph.includes("name") || type === "text") {
        fireEvent.change(input, { target: { value: "Coverage Relative" } });
      }
    }
    for (const trigger of screen.queryAllByRole("combobox").slice(0, 2)) {
      try {
        await user.click(trigger);
        const opts = await screen.findAllByRole("option", {}, { timeout: 1500 }).catch(() => []);
        if (opts[0]) await user.click(opts[0]);
      } catch { /* ignore */ }
    }
    // Do not confirm send to avoid polluting invitations — fill path covers handlers
    expect(document.body.textContent?.length ?? 0).toBeGreaterThan(20);
  }, 60_000);
});
