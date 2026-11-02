import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "@/test/helpers/e2e-accounts";
import {
  notifyEventCancelled,
  notifyEventUpdated,
  notifyEventCreated,
  notifyRSVPConfirmation,
} from "@/lib/event-notifications";

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
const emailitKey = envFromDotenv("EMAILIT_API_KEY");
const AHMEDABAD = "f1000002-0000-0000-0000-000000000002";

/** Sink address — Emailit accepts; avoid spamming real inboxes. */
const SINK = "coverage-pass7@example.invalid";

function redact(s: string) {
  return s.replace(/secret_[A-Za-z0-9]+/g, "secret_***").replace(/Bearer\s+\S+/gi, "Bearer ***");
}

describe("send-email happy path (EMAILIT_API_KEY available)", () => {
  beforeAll(() => {
    expect(emailitKey, "EMAILIT_API_KEY must be in untracked .env").toBeTruthy();
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  it("local .env has EMAILIT; WHATSAPP still absent", () => {
    expect(!!emailitKey).toBe(true);
    expect(!!envFromDotenv("EASIFY_API_TOKEN")).toBe(true);
    expect(!!(envFromDotenv("WHATSAPP_TOKEN") || envFromDotenv("WHATSAPP_ACCESS_TOKEN"))).toBe(false);
  });

  it("GA JWT: welcome + event_created + matrimonial_interest succeed via hosted Emailit", async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    if (error) throw error;
    const { data: { session } } = await supabase.auth.getSession();
    expect(session?.access_token).toBeTruthy();

    const templates: Array<{ template: string; vars: Record<string, string> }> = [
      { template: "welcome", vars: { name: "Coverage" } },
      {
        template: "event_created",
        vars: { name: "Coverage", event_name: "Pass7 Email Probe", event_date: "2026-12-01", event_location: "Ahmedabad" },
      },
      {
        template: "matrimonial_interest",
        vars: { name: "Coverage", from_name: "E2E Member", profile_link: "https://khadayataonline.com/matrimonial" },
      },
      {
        template: "chapter_admin_invite",
        vars: {
          name: "Coverage",
          chapter_name: "Ahmedabad",
          role_name: "Chapter Admin",
          effective_date: "2026-11-01",
          admin_link: "https://khadayataonline.com/admin",
        },
      },
      {
        template: "family_invitation_sent",
        vars: { name: "Coverage", inviter_name: "E2E Member", invite_link: "https://khadayataonline.com/accept-invite" },
      },
    ];

    for (const t of templates) {
      let lastStatus = 0;
      let lastText = "";
      for (let attempt = 0; attempt < 4; attempt++) {
        // Emailit: max 2 messages/sec — space requests
        if (attempt > 0 || templates.indexOf(t) > 0) {
          await new Promise((r) => setTimeout(r, 700));
        }
        const res = await fetch(`${url}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session!.access_token}`,
            apikey: anon,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ template: t.template, to: SINK, vars: t.vars }),
        });
        lastStatus = res.status;
        lastText = await res.text();
        if (res.status === 200) break;
        if (!/rate limit|too many/i.test(lastText)) break;
      }
      expect(lastStatus, redact(`${t.template}: ${lastText}`)).toBe(200);
      expect(lastText.toLowerCase()).toMatch(/success/);
    }
  }, 180_000);

  it("service-role internal caller can override subject/html", async () => {
    expect(serviceKey).toBeTruthy();
    const res = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "welcome",
        to: SINK,
        vars: { name: "Internal" },
        override_subject: "Pass7 internal override",
        override_html: "<p>Pass7 internal HTML</p>",
      }),
    });
    const text = await res.text();
    expect(res.status, redact(text)).toBe(200);
    expect(text.toLowerCase()).toMatch(/success/);
  }, 60_000);

  it("user caller rejected for multi-recipient fan-out", async () => {
    await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.member.email,
      password: E2E_PASSWORD,
    });
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session!.access_token}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "welcome",
        to: [SINK, "second@example.invalid"],
        vars: { name: "X" },
      }),
    });
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/one recipient|allowed/);
  }, 40_000);

  it("unauthenticated still 401", async () => {
    const res = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ template: "welcome", to: SINK, vars: { name: "X" } }),
    });
    expect([401, 403]).toContain(res.status);
  }, 30_000);
});

describe("event-notifications full email fan-out with Emailit live", () => {
  let eventId: string | null = null;
  let memberId: string;
  let admin: SupabaseClient;

  beforeAll(async () => {
    admin = serviceKey ? createClient(url, serviceKey) : supabase;
    const { error } = await supabase.auth.signInWithPassword({
      email: E2E_ACCOUNTS.globalAdmin.email,
      password: E2E_PASSWORD,
    });
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("members").select("id").eq("user_id", user!.id).single();
    memberId = me!.id;

    const { data: existing } = await admin
      .from("member_contacts")
      .select("id")
      .eq("member_id", memberId)
      .eq("type", "email")
      .maybeSingle();
    if (!existing) {
      await admin.from("member_contacts").insert({
        member_id: memberId,
        type: "email",
        value: E2E_ACCOUNTS.globalAdmin.email,
        primary_flag: true,
      });
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

    const starts = new Date(Date.now() + 11 * 864e5).toISOString();
    const ends = new Date(Date.now() + 11 * 864e5 + 3600_000).toISOString();
    const { data: ev, error: evErr } = await admin
      .from("events")
      .insert({
        name: "Pass7 Email Fanout Event",
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
      await admin.from("event_rsvps").delete().eq("event_id", eventId);
      await admin.from("events").delete().eq("id", eventId);
    }
    await supabase.auth.signOut();
  });

  it("notifyEventCreated / Updated / Cancelled / RSVP all resolve", async () => {
    const info = { id: eventId!, name: "Pass7 Email Fanout Event", chapter_id: AHMEDABAD };
    await expect(notifyEventCreated(info)).resolves.toBeUndefined();
    await expect(notifyEventUpdated(info)).resolves.toBeUndefined();
    await expect(notifyRSVPConfirmation(info, memberId, "going")).resolves.toBeUndefined();
    await expect(notifyEventCancelled(info)).resolves.toBeUndefined();
  }, 120_000);
});
