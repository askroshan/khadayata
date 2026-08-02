export type NotificationType =
  | "vouch"
  | "rsvp"
  | "mentorship"
  | "verification"
  | "announcement"
  | "event_created"
  | "event_cancelled"
  | "event_updated"
  | "event_reminder"
  | "chapter_message";

export interface NotificationPref {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  chapter_notifications_enabled: boolean;
}

export interface NotificationPayload {
  member_id: string;
  type: NotificationType;
  title: string;
  description: string;
  entity_id?: string | null;
  entity_type?: string | null;
}

export interface ChapterMember {
  id: string;
  first_name: string;
  last_name: string;
}

export interface EventData {
  id: string;
  name: string;
  chapter_id: string | null;
}

export interface RSVPMember {
  member_id: string;
  status: string;
  event_id: string;
}

export function shouldSendEmail(
  pref: NotificationPref | null | undefined,
  type: NotificationType,
): boolean {
  if (!pref) return false;
  if (!pref.email_enabled) return false;
  const chapterTypes: NotificationType[] = [
    "event_created",
    "event_cancelled",
    "event_updated",
    "event_reminder",
    "chapter_message",
  ];
  if (chapterTypes.includes(type) && !pref.chapter_notifications_enabled) {
    return false;
  }
  return true;
}

export function shouldCreateBellNotification(
  pref: NotificationPref | null | undefined,
  _type: NotificationType,
): boolean {
  return true;
}

export function buildEventCreatedNotification(
  event: EventData,
): NotificationPayload {
  return {
    member_id: "",
    type: "event_created",
    title: "New Event",
    description: `New event: "${event.name}"`,
    entity_id: event.id,
    entity_type: "event",
  };
}

export function buildEventCancelledNotification(
  event: EventData,
): NotificationPayload {
  return {
    member_id: "",
    type: "event_cancelled",
    title: "Event Cancelled",
    description: `"${event.name}" has been cancelled`,
    entity_id: event.id,
    entity_type: "event",
  };
}

export function buildEventUpdatedNotification(
  event: EventData,
): NotificationPayload {
  return {
    member_id: "",
    type: "event_updated",
    title: "Event Updated",
    description: `"${event.name}" has been updated`,
    entity_id: event.id,
    entity_type: "event",
  };
}

export function buildRSVPConfirmation(
  event: EventData,
  memberId: string,
  status: string,
): NotificationPayload {
  return {
    member_id: memberId,
    type: "rsvp",
    title: "Event RSVP Confirmed",
    description: `Your RSVP for "${event.name}" is confirmed as ${status}`,
    entity_id: event.id,
    entity_type: "event",
  };
}

export function filterOptedInMembers(
  members: { member_id: string; pref: NotificationPref | null }[],
  type: NotificationType,
): string[] {
  return members
    .filter((m) => shouldSendEmail(m.pref, type))
    .map((m) => m.member_id);
}

export function filterRSVPGoingMembers(rsvps: RSVPMember[]): string[] {
  return rsvps
    .filter((r) => r.status === "going")
    .map((r) => r.member_id);
}
