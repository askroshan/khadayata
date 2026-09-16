import { supabase } from "@/integrations/supabase/client";
import {
  buildEventCreatedNotification,
  buildEventCancelledNotification,
  buildEventUpdatedNotification,
  buildRSVPConfirmation,
  shouldSendEmail,
  type NotificationPref,
} from "@/lib/notification-utils";

interface EventInfo {
  id: string;
  name: string;
  chapter_id: string | null;
}

interface MemberPref {
  member_id: string;
  pref: NotificationPref | null;
}

async function getChapterOptedInMembers(
  chapterId: string,
): Promise<{ memberIds: string[]; emailMemberIds: string[] }> {
  const { data: membersData } = await supabase
    .from("members")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("deceased", false);

  if (!membersData || membersData.length === 0) {
    return { memberIds: [], emailMemberIds: [] };
  }

  const memberIds = membersData.map((m) => m.id);

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("member_id, email_enabled, whatsapp_enabled, push_enabled, chapter_notifications_enabled")
    .in("member_id", memberIds);

  const prefMap = new Map<string, NotificationPref>();
  for (const p of prefs ?? []) {
    prefMap.set(p.member_id, {
      email_enabled: p.email_enabled ?? false,
      whatsapp_enabled: p.whatsapp_enabled ?? false,
      push_enabled: p.push_enabled ?? false,
      chapter_notifications_enabled: p.chapter_notifications_enabled ?? true,
    });
  }

  const bellMemberIds: string[] = [];
  const emailMemberIds: string[] = [];

  for (const mid of memberIds) {
    bellMemberIds.push(mid);
    const pref = prefMap.get(mid) ?? null;
    if (shouldSendEmail(pref, "event_created")) {
      emailMemberIds.push(mid);
    }
  }

  return { memberIds: bellMemberIds, emailMemberIds };
}

async function getRSVPGoingMembers(eventId: string): Promise<{ memberIds: string[]; emailMemberIds: string[] }> {
  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("member_id")
    .eq("event_id", eventId)
    .eq("status", "going");

  if (!rsvps || rsvps.length === 0) {
    return { memberIds: [], emailMemberIds: [] };
  }

  const memberIds = rsvps.map((r) => r.member_id);

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("member_id, email_enabled, whatsapp_enabled, push_enabled, chapter_notifications_enabled")
    .in("member_id", memberIds);

  const prefMap = new Map<string, NotificationPref>();
  for (const p of prefs ?? []) {
    prefMap.set(p.member_id, {
      email_enabled: p.email_enabled ?? false,
      whatsapp_enabled: p.whatsapp_enabled ?? false,
      push_enabled: p.push_enabled ?? false,
      chapter_notifications_enabled: p.chapter_notifications_enabled ?? true,
    });
  }

  const emailMemberIds = memberIds.filter((mid) => {
    const pref = prefMap.get(mid) ?? null;
    return shouldSendEmail(pref, "event_cancelled");
  });

  return { memberIds, emailMemberIds };
}

async function sendEventNotification(
  memberIds: string[],
  type: "event_created" | "event_cancelled" | "event_updated",
  event: EventInfo,
): Promise<void> {
  if (memberIds.length === 0) return;

  let title: string;
  let description: string;
  switch (type) {
    case "event_created":
      title = buildEventCreatedNotification(event).title;
      description = buildEventCreatedNotification(event).description;
      break;
    case "event_cancelled":
      title = buildEventCancelledNotification(event).title;
      description = buildEventCancelledNotification(event).description;
      break;
    case "event_updated":
      title = buildEventUpdatedNotification(event).title;
      description = buildEventUpdatedNotification(event).description;
      break;
  }

  await supabase.rpc("create_notifications_batch", {
    p_member_ids: memberIds,
    p_type: type,
    p_title: title,
    p_description: description,
    p_entity_id: event.id,
    p_entity_type: "event",
  });
}

async function sendEventEmails(
  memberIds: string[],
  template: string,
  eventData: Record<string, unknown>,
): Promise<void> {
  if (memberIds.length === 0) return;

  const { data: contacts } = await supabase
    .from("member_contacts")
    .select("member_id, value")
    .in("member_id", memberIds)
    .eq("type", "email");

  if (!contacts || contacts.length === 0) return;

  const emails = contacts
    .map((c) => c.value)
    .filter((e): e is string => !!e);

  if (emails.length === 0) return;

  const promises = emails.map((email) =>
    supabase.functions.invoke("send-email", {
      body: { to: email, template, data: eventData },
    }).catch(() => {
      // Individual email failure is non-blocking
    }),
  );

  await Promise.allSettled(promises);
}

export async function notifyEventCreated(event: EventInfo): Promise<void> {
  if (!event.chapter_id) return;
  const { memberIds, emailMemberIds } = await getChapterOptedInMembers(event.chapter_id);
  await sendEventNotification(memberIds, "event_created", event);
  await sendEventEmails(emailMemberIds, "event_created", {
    event_name: event.name,
    event_id: event.id,
  });
}

export async function notifyEventCancelled(event: EventInfo): Promise<void> {
  const { memberIds, emailMemberIds } = await getRSVPGoingMembers(event.id);
  await sendEventNotification(memberIds, "event_cancelled", event);
  await sendEventEmails(emailMemberIds, "event_cancelled", {
    event_name: event.name,
    event_id: event.id,
  });
}

export async function notifyEventUpdated(event: EventInfo): Promise<void> {
  const { memberIds, emailMemberIds } = await getRSVPGoingMembers(event.id);
  await sendEventNotification(memberIds, "event_updated", event);
  await sendEventEmails(emailMemberIds, "event_updated", {
    event_name: event.name,
    event_id: event.id,
  });
}

export async function notifyRSVPConfirmation(
  event: EventInfo,
  memberId: string,
  status: string,
): Promise<void> {
  if (status !== "going") return;

  await supabase.rpc("create_notification", {
    p_member_id: memberId,
    p_type: "rsvp",
    p_title: buildRSVPConfirmation(event, memberId, status).title,
    p_description: buildRSVPConfirmation(event, memberId, status).description,
    p_entity_id: event.id,
    p_entity_type: "event",
  });

  // Send confirmation email
  const { data: contact } = await supabase
    .from("member_contacts")
    .select("value")
    .eq("member_id", memberId)
    .eq("type", "email")
    .maybeSingle();

  if (contact?.value) {
    await supabase.functions.invoke("send-email", {
      body: {
        to: contact.value,
        template: "event_rsvp_confirmation",
        data: { event_name: event.name, event_id: event.id },
      },
    }).catch(() => {
      // Email failure is non-blocking
    });
  }
}
