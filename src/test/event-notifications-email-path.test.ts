import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { notifyEventCreated, notifyRSVPConfirmation } from "@/lib/event-notifications";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";

function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const raw = readFileSync(resolve(__dirname, "../../.env"), "utf8");
    const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1)?.trim();
  } catch {
    return undefined;
  }
}

const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

/**
 * Exercises email fan-out branches by ensuring member_contacts + prefs exist,
 * then calling notify helpers as Global Admin.
 */
describe("event-notifications email contact fan-out", () => {
  let eventId: string | null = null;
  let memberId: string;
  let contactId: string | null = null;

  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("members").select("id").eq("user_id", user!.id).single();
    memberId = me!.id;

    const admin = serviceKey ? createClient(url, serviceKey) : supabase;
    // Ensure email contact for emailMemberIds path
    const { data: existing } = await admin
      .from("member_contacts")
      .select("id")
      .eq("member_id", memberId)
      .eq("type", "email")
      .maybeSingle();
    if (!existing) {
      const { data: inserted } = await admin
        .from("member_contacts")
        .insert({
          member_id: memberId,
          type: "email",
          value: "global-admin@khadayataonline.com",
          is_primary: true,
        })
        .select("id")
        .single();
      contactId = inserted?.id ?? null;
    }

    await admin.from("notification_preferences").upsert(
      {
        member_id: memberId,
        email_enabled: true,
        chapter_notifications_enabled: true,
        whatsapp_enabled: false,
        push_enabled: false,
      },
      { onConflict: "member_id" },
    );

    const starts = new Date(Date.now() + 9 * 864e5).toISOString();
    const ends = new Date(Date.now() + 9 * 864e5 + 3600_000).toISOString();
    const { data: ev, error: evErr } = await admin
      .from("events")
      .insert({
        name: "Pass6 Email Notify Probe",
        chapter_id: AHMEDABAD,
        starts_at: starts,
        ends_at: ends,
        status: "published",
      })
      .select("id")
      .single();
    if (evErr) throw evErr;
    eventId = ev!.id;
    await admin.from("event_rsvps").upsert(
      { event_id: eventId, member_id: memberId, status: "going" },
      { onConflict: "event_id,member_id" },
    );
  }, 60_000);

  afterAll(async () => {
    if (eventId) {
      const admin = serviceKey ? createClient(url, serviceKey) : supabase;
      await admin.from("event_rsvps").delete().eq("event_id", eventId);
      await admin.from("events").delete().eq("id", eventId);
    }
    if (contactId) {
      const admin = serviceKey ? createClient(url, serviceKey) : supabase;
      await admin.from("member_contacts").delete().eq("id", contactId);
    }
    await supabase.auth.signOut();
  });

  it("notifyEventCreated hits email invoke path for opted-in members", async () => {
    await expect(
      notifyEventCreated({
        id: eventId!,
        name: "Pass6 Email Notify Probe",
        chapter_id: AHMEDABAD,
      }),
    ).resolves.toBeUndefined();
  }, 60_000);

  it("notifyRSVPConfirmation email path with contact", async () => {
    await expect(
      notifyRSVPConfirmation(
        { id: eventId!, name: "Pass6 Email Notify Probe", chapter_id: AHMEDABAD },
        memberId,
        "going",
      ),
    ).resolves.toBeUndefined();
  }, 60_000);
});
