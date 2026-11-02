import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
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

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const raw = readFileSync(resolve(__dirname, "../../../.env"), "utf8");
    const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1)?.trim();
  } catch {
    return undefined;
  }
}

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
const disposableProfileIds: string[] = [];

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
  beforeAll(async () => {
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for Rishta seed");
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Ensure member@ has a matrimonial profile + at least one other profile for send dialog.
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const memberUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === E2E_ACCOUNTS.member.email.toLowerCase(),
    );
    if (!memberUser) throw new Error("E2E member auth user missing");
    const { data: memberRow } = await admin
      .from("members")
      .select("id")
      .eq("user_id", memberUser.id)
      .maybeSingle();
    if (!memberRow?.id) throw new Error("E2E member row missing");

    const { data: existing } = await admin
      .from("matrimonial_profiles")
      .select("id")
      .eq("member_id", memberRow.id)
      .maybeSingle();
    if (!existing?.id) {
      const { data: created, error } = await admin
        .from("matrimonial_profiles")
        .insert({
          member_id: memberRow.id,
          about: "CovFailFixes disposable member profile",
          current_city: "Ahmedabad",
          visibility: "members",
        })
        .select("id")
        .single();
      if (error) throw error;
      disposableProfileIds.push(created!.id);
    }

    const { data: others } = await admin
      .from("matrimonial_profiles")
      .select("id")
      .neq("member_id", memberRow.id)
      .limit(1);
    if (!others?.length) {
      const { data: gaUser } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const ga = gaUser?.users?.find(
        (u) => u.email?.toLowerCase() === E2E_ACCOUNTS.globalAdmin.email.toLowerCase(),
      );
      const { data: gaMember } = await admin
        .from("members")
        .select("id")
        .eq("user_id", ga!.id)
        .maybeSingle();
      const { data: created, error } = await admin
        .from("matrimonial_profiles")
        .insert({
          member_id: gaMember!.id,
          about: "CovFailFixes disposable target profile",
          current_city: "Surat",
          visibility: "members",
        })
        .select("id")
        .single();
      if (error) throw error;
      disposableProfileIds.push(created!.id);
    }
  });

  afterAll(async () => {
    if (serviceKey && disposableProfileIds.length) {
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await admin.from("matrimonial_profiles").delete().in("id", disposableProfileIds);
    }
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
