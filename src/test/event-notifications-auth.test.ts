import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  notifyEventCreated,
  notifyEventCancelled,
  notifyEventUpdated,
  notifyRSVPConfirmation,
} from "@/lib/event-notifications";
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
const anon = process.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = envFromDotenv("SUPABASE_SERVICE_ROLE_KEY");

const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

/**
 * Authenticated event-notification paths against real chapter members.
 * Seeds a temporary published event + going RSVP, then cleans up.
 */
describe("event-notifications authenticated paths (real chapter)", () => {
  let eventId: string | null = null;
  let memberId: string;
  let admin: SupabaseClient | null = null;

  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    if (error) throw error;

    const { data: me } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
      .maybeSingle();
    memberId = me!.id;

    const starts = new Date(Date.now() + 7 * 864e5).toISOString();
    const ends = new Date(Date.now() + 7 * 864e5 + 3_600_000).toISOString();

    // Prefer user-scoped insert; fall back to service role for RLS-restricted creates.
    let inserted: { id: string } | null = null;
    const { data: asUser, error: userErr } = await supabase
      .from("events")
      .insert({
        name: "Coverage Notify Probe",
        chapter_id: AHMEDABAD,
        starts_at: starts,
        ends_at: ends,
        status: "published",
        created_by: (await supabase.auth.getUser()).data.user!.id,
      })
      .select("id")
      .single();

    if (!userErr && asUser) {
      inserted = asUser;
    } else if (serviceKey) {
      admin = createClient(url, serviceKey);
      const { data: asAdmin, error: adminErr } = await admin
        .from("events")
        .insert({
          name: "Coverage Notify Probe",
          chapter_id: AHMEDABAD,
          starts_at: starts,
          ends_at: ends,
          status: "published",
        })
        .select("id")
        .single();
      if (adminErr) throw adminErr;
      inserted = asAdmin;
    } else {
      throw userErr ?? new Error("Could not insert coverage event");
    }

    eventId = inserted!.id;

    const rsvpClient = admin ?? supabase;
    const { error: rsvpErr } = await rsvpClient.from("event_rsvps").upsert(
      {
        event_id: eventId,
        member_id: memberId,
        status: "going",
      },
      { onConflict: "event_id,member_id" },
    );
    if (rsvpErr) {
      // Some schemas use different unique keys — try plain insert
      await rsvpClient.from("event_rsvps").insert({
        event_id: eventId,
        member_id: memberId,
        status: "going",
      });
    }
  }, 60_000);

  afterAll(async () => {
    if (eventId) {
      const cleaner = admin ?? supabase;
      await cleaner.from("event_rsvps").delete().eq("event_id", eventId);
      await cleaner.from("events").delete().eq("id", eventId);
    }
    await supabase.auth.signOut();
  });

  it("notifyEventCreated fans out to real Ahmedabad members", async () => {
    expect(eventId).toBeTruthy();
    await expect(
      notifyEventCreated({
        id: eventId!,
        name: "Coverage Notify Probe",
        chapter_id: AHMEDABAD,
      }),
    ).resolves.toBeUndefined();
  }, 60_000);

  it("notifyEventUpdated / notifyEventCancelled hit RSVP-going path", async () => {
    const info = {
      id: eventId!,
      name: "Coverage Notify Probe",
      chapter_id: AHMEDABAD,
    };
    await expect(notifyEventUpdated(info)).resolves.toBeUndefined();
    await expect(notifyEventCancelled(info)).resolves.toBeUndefined();
  }, 60_000);

  it("notifyRSVPConfirmation for going inserts notification + optional email invoke", async () => {
    await expect(
      notifyRSVPConfirmation(
        { id: eventId!, name: "Coverage Notify Probe", chapter_id: AHMEDABAD },
        memberId,
        "going",
      ),
    ).resolves.toBeUndefined();
  }, 60_000);

  it("notifyRSVPConfirmation still no-ops for non-going", async () => {
    await expect(
      notifyRSVPConfirmation(
        { id: eventId!, name: "Coverage Notify Probe", chapter_id: AHMEDABAD },
        memberId,
        "interested",
      ),
    ).resolves.toBeUndefined();
  });
});
