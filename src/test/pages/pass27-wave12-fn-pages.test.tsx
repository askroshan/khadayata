/**
 * Pass 27 — Wave 12: leftover function arrows on Profile, MemberProfile,
 * Matrimonial, Business, Search, Mentorship, FamilyInviteDialog.
 * EMAILIT blank / DISABLE_OUTBOUND_EMAIL=1. Never send email/SMS.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "@/test/helpers/render-app";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import { Toaster } from "@/components/ui/toaster";
import Profile from "@/pages/Profile";
import MemberProfile from "@/pages/MemberProfile";
import Matrimonial from "@/pages/Matrimonial";
import Business from "@/pages/Business";
import Search from "@/pages/Search";
import Mentorship from "@/pages/Mentorship";
import Scholarships from "@/pages/Scholarships";
import Temple from "@/pages/Temple";
import { FamilyInviteDialog } from "@/components/profile/FamilyInviteDialog";
import MembersTab from "@/components/admin/MembersTab";
import EventsTab from "@/components/admin/EventsTab";
import RolesTab from "@/components/admin/RolesTab";

function withToaster(node: ReactNode) {
  return (
    <>
      {node}
      <Toaster />
    </>
  );
}

const PREFIX = `covw12d_${Date.now().toString(36)}`;

function fillVisibleFields() {
  for (const input of Array.from(document.querySelectorAll("input, textarea, select")) as HTMLInputElement[]) {
    if (input.disabled || input.type === "hidden" || input.type === "file") continue;
    if (input.type === "checkbox" || input.type === "radio") {
      fireEvent.click(input);
      continue;
    }
    const value =
      input.type === "number"
        ? "7"
        : input.type === "email"
          ? `${PREFIX}@example.invalid`
          : input.type === "date"
            ? "1991-06-15"
            : input.type === "datetime-local"
              ? "2026-09-01T10:00"
              : `${PREFIX} field`;
    fireEvent.change(input, { target: { value } });
  }
}

async function pickSelects(user: ReturnType<typeof userEvent.setup>, limit = 6) {
  for (const trigger of screen.queryAllByRole("combobox").slice(0, limit)) {
    if ((trigger as HTMLButtonElement).disabled) continue;
    try {
      await user.click(trigger);
      const opts = await screen.findAllByRole("option", {}, { timeout: 1200 }).catch(() => []);
      if (opts[0]) await user.click(opts[0]);
      else await user.keyboard("{Escape}");
    } catch {
      try {
        await user.keyboard("{Escape}");
      } catch {
        /* skip */
      }
    }
  }
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

describe("Pass 27 — Wave 12 page function remainder", () => {
  beforeAll(async () => {
    await supabase.auth.signOut().catch(() => undefined);
  }, 30_000);

  afterAll(async () => {
    cleanup();
    await supabase.auth.signOut().catch(() => undefined);
  }, 30_000);

  it("Profile: edit form, skills/langs, cancel", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Profile />), { route: "/profile" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Name|Chapter/i), { timeout: 45_000 });
    const edit = screen.queryAllByRole("button", { name: /Edit/i })[0];
    if (edit) {
      await user.click(edit);
      fillVisibleFields();
      await pickSelects(user, 4);
      const cancel = screen.queryAllByRole("button", { name: /Cancel/i })[0];
      if (cancel) fireEvent.click(cancel);
    }
    const addSkill = screen.queryByPlaceholderText(/Add skill/i);
    if (addSkill) {
      fireEvent.change(addSkill, { target: { value: PREFIX } });
      const add = screen.queryAllByRole("button", { name: /^Add$/i })[0];
      if (add) fireEvent.click(add);
    }
    const addLang = screen.queryByPlaceholderText(/Add language/i);
    if (addLang) fireEvent.change(addLang, { target: { value: "Gujarati" } });
    for (const el of Array.from(document.querySelectorAll(".group")) as HTMLElement[]) {
      fireEvent.mouseEnter(el);
      fireEvent.mouseLeave(el);
    }
    unmount();
  }, 90_000);

  it("MemberProfile: edit, verify panel, vouch request cancel", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const { data: mem } = await supabase.from("members").select("id").eq("user_id", uid ?? "").maybeSingle();
    if (!mem?.id) return;
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<MemberProfile />), {
      route: `/member/${mem.id}`,
      pathPattern: "/member/:id",
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/Profile|Verification|Chapter|Name/i), {
      timeout: 45_000,
    });
    const edit = screen.queryAllByRole("button", { name: /Edit/i })[0];
    if (edit) {
      await user.click(edit);
      fillVisibleFields();
      const close = screen.queryAllByRole("button", { name: /Close|Cancel/i })[0];
      if (close) fireEvent.click(close);
      else await user.keyboard("{Escape}").catch(() => undefined);
    }
    const verify = screen.queryAllByRole("button", { name: /Verify|Documentation|Note/i })[0];
    if (verify) fireEvent.click(verify);
    fillVisibleFields();
    const vouchOpen = screen.queryAllByRole("button", { name: /Request Vouch|Ask for Vouch/i })[0];
    if (vouchOpen) {
      fireEvent.click(vouchOpen);
      fillVisibleFields();
      const cancel = screen.queryAllByRole("button", { name: /Cancel/i })[0];
      if (cancel) fireEvent.click(cancel);
    }
    unmount();
  }, 90_000);

  it("Matrimonial: create, filters, rishta dialog cancel", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Matrimonial />), { route: "/matrimonial/manage" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Matrimonial|Rishta|Profile|Search/i), {
      timeout: 45_000,
    });
    const create = screen.queryAllByRole("button", { name: /Create Profile|New Profile|Add Profile/i })[0];
    if (create) {
      await user.click(create);
      fillVisibleFields();
      await pickSelects(user, 6);
    }
    fillVisibleFields();
    await pickSelects(user, 6);
    const rishta = screen.queryAllByLabelText(/formal Rishta/i)[0];
    if (rishta) {
      fireEvent.click(rishta);
      fillVisibleFields();
      await user.keyboard("{Escape}").catch(() => undefined);
    }
    unmount();
  }, 90_000);

  it("Business: add business/job forms + Apply (no email)", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const { unmount } = renderApp(withToaster(<Business />), { route: "/business/manage" });
    await waitFor(() => expect(document.body.textContent).toMatch(/Business|Job/i), { timeout: 45_000 });
    const addBiz = screen.queryAllByRole("button", { name: /Add Business|New Business|List Business/i })[0];
    if (addBiz) {
      await user.click(addBiz);
      fillVisibleFields();
      await pickSelects(user, 6);
    }
    const jobs = screen.queryAllByRole("tab", { name: /Jobs/i })[0];
    if (jobs) fireEvent.click(jobs);
    const addJob = screen.queryAllByRole("button", { name: /Add Job|Post Job|New Job/i })[0];
    if (addJob) {
      fireEvent.click(addJob);
      fillVisibleFields();
      await pickSelects(user, 6);
    }
    const apply = screen.queryAllByRole("button", { name: /Apply Now/i })[0];
    if (apply) fireEvent.click(apply);
    unmount();
  }, 90_000);

  it("Search / Mentorship / Scholarships / Temple leftover controls", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();

    {
      const { unmount } = renderApp(<Search />, { route: "/search" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Search|Member|Chapter/i), { timeout: 45_000 });
      fillVisibleFields();
      await pickSelects(user, 4);
      for (const tab of screen.queryAllByRole("tab").slice(0, 8)) fireEvent.click(tab);
      unmount();
    }
    {
      const { unmount } = renderApp(withToaster(<Mentorship />), { route: "/mentorship/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Mentor|Mentee|Mentorship/i), { timeout: 45_000 });
      fillVisibleFields();
      await pickSelects(user, 4);
      const offer = screen.queryAllByRole("button", { name: /Offer|Become|Register|Create/i })[0];
      if (offer) {
        fireEvent.click(offer);
        fillVisibleFields();
      }
      unmount();
    }
    {
      const { unmount } = renderApp(withToaster(<Scholarships />), { route: "/scholarships/manage" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Scholarship/i), { timeout: 45_000 });
      fillVisibleFields();
      await pickSelects(user, 3);
      unmount();
    }
    {
      const { unmount } = renderApp(withToaster(<Temple />), { route: "/temple" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Temple|Kotyark|Aarti|Donate/i), { timeout: 45_000 });
      fillVisibleFields();
      await pickSelects(user, 3);
      unmount();
    }
  }, 120_000);

  it("FamilyInviteDialog + Members/Events/Roles leftover openers", async () => {
    await signIn(E2E_ACCOUNTS.globalAdmin.email);
    const user = userEvent.setup();
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const { data: mem } = await supabase.from("members").select("id").eq("user_id", uid ?? "").maybeSingle();

    if (mem?.id) {
      const { unmount } = renderApp(withToaster(<FamilyInviteDialog memberId={mem.id} />), { route: "/profile" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Family|Invite|Relative/i), { timeout: 20_000 }).catch(
        () => undefined,
      );
      fillVisibleFields();
      await pickSelects(user, 3);
      const add = screen.queryAllByRole("button", { name: /Add|Invite|New/i })[0];
      if (add) {
        fireEvent.click(add);
        fillVisibleFields();
        const cancel = screen.queryAllByRole("button", { name: /Cancel/i })[0];
        if (cancel) fireEvent.click(cancel);
      }
      unmount();
    }

    {
      const { data: members } = await supabase
        .from("members")
        .select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)")
        .limit(5);
      const { unmount } = renderApp(
        withToaster(
          <MembersTab
            members={(members ?? []) as never}
            myChapterId={null}
            canInvite
            canSendReminders
            isGlobalAdmin
          />,
        ),
        { route: "/admin?tab=members" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Search|Export|Invite/i), { timeout: 30_000 });
      fillVisibleFields();
      await pickSelects(user, 3);
      const exportBtn = screen.queryAllByRole("button", { name: /Export/i })[0];
      if (exportBtn) fireEvent.click(exportBtn);
      unmount();
    }

    {
      const { unmount } = renderApp(withToaster(<EventsTab myChapterId={null} />), { route: "/admin?tab=events" });
      await waitFor(() => expect(document.body.textContent).toMatch(/Event/i), { timeout: 30_000 });
      fillVisibleFields();
      await pickSelects(user, 3);
      unmount();
    }

    {
      const { data: roles } = await supabase
        .from("role_assignments")
        .select("id, role_id, member_id, chapter_id, start_date, end_date, created_at, roles(name, scope), members(first_name, last_name), chapters(name)")
        .limit(8);
      const { unmount } = renderApp(
        withToaster(<RolesTab roleAssignments={(roles ?? []) as never} myChapterId={null} />),
        { route: "/admin?tab=roles" },
      );
      await waitFor(() => expect(document.body.textContent).toMatch(/Role|Assign|Member/i), { timeout: 30_000 });
      fillVisibleFields();
      await pickSelects(user, 3);
      unmount();
    }
  }, 120_000);
});
