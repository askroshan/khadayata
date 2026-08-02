import { describe, it, expect } from "vitest";
import {
  shouldSendEmail,
  shouldCreateBellNotification,
  buildEventCreatedNotification,
  buildEventCancelledNotification,
  buildEventUpdatedNotification,
  buildRSVPConfirmation,
  filterOptedInMembers,
  filterRSVPGoingMembers,
  type NotificationPref,
  type NotificationType,
} from "@/lib/notification-utils";

const fullPref: NotificationPref = {
  email_enabled: true,
  whatsapp_enabled: false,
  push_enabled: false,
  chapter_notifications_enabled: true,
};

const noEmailPref: NotificationPref = {
  email_enabled: false,
  whatsapp_enabled: false,
  push_enabled: false,
  chapter_notifications_enabled: true,
};

const noChapterPref: NotificationPref = {
  email_enabled: true,
  whatsapp_enabled: false,
  push_enabled: false,
  chapter_notifications_enabled: false,
};

describe("shouldSendEmail", () => {
  it("returns true when email enabled and chapter notifications enabled for chapter-type notifications", () => {
    expect(shouldSendEmail(fullPref, "event_created")).toBe(true);
    expect(shouldSendEmail(fullPref, "event_cancelled")).toBe(true);
    expect(shouldSendEmail(fullPref, "event_updated")).toBe(true);
    expect(shouldSendEmail(fullPref, "chapter_message")).toBe(true);
  });

  it("returns true when email enabled for non-chapter notifications regardless of chapter toggle", () => {
    expect(shouldSendEmail(noChapterPref, "vouch")).toBe(true);
    expect(shouldSendEmail(noChapterPref, "rsvp")).toBe(true);
    expect(shouldSendEmail(noChapterPref, "mentorship")).toBe(true);
    expect(shouldSendEmail(noChapterPref, "verification")).toBe(true);
  });

  it("returns false for chapter-type notifications when chapter_notifications_enabled is false", () => {
    expect(shouldSendEmail(noChapterPref, "event_created")).toBe(false);
    expect(shouldSendEmail(noChapterPref, "event_cancelled")).toBe(false);
    expect(shouldSendEmail(noChapterPref, "event_updated")).toBe(false);
    expect(shouldSendEmail(noChapterPref, "chapter_message")).toBe(false);
  });

  it("returns false when email_enabled is false regardless of other settings", () => {
    const types: NotificationType[] = ["vouch", "rsvp", "event_created", "chapter_message"];
    for (const t of types) {
      expect(shouldSendEmail(noEmailPref, t)).toBe(false);
    }
  });

  it("returns false when pref is null or undefined", () => {
    expect(shouldSendEmail(null, "vouch")).toBe(false);
    expect(shouldSendEmail(undefined, "vouch")).toBe(false);
  });
});

describe("shouldCreateBellNotification", () => {
  it("always returns true — bell notifications are not gated by email preference", () => {
    expect(shouldCreateBellNotification(fullPref, "event_created")).toBe(true);
    expect(shouldCreateBellNotification(noEmailPref, "event_created")).toBe(true);
    expect(shouldCreateBellNotification(null, "vouch")).toBe(true);
  });
});

describe("buildEventCreatedNotification", () => {
  it("builds a notification with correct type, title, and entity linkage", () => {
    const event = { id: "evt-1", name: "Diwali Celebration", chapter_id: "ch-1" };
    const n = buildEventCreatedNotification(event);
    expect(n.type).toBe("event_created");
    expect(n.title).toBe("New Event");
    expect(n.description).toContain("Diwali Celebration");
    expect(n.entity_id).toBe("evt-1");
    expect(n.entity_type).toBe("event");
  });
});

describe("buildEventCancelledNotification", () => {
  it("builds a cancellation notification", () => {
    const event = { id: "evt-2", name: "Holi Party", chapter_id: "ch-1" };
    const n = buildEventCancelledNotification(event);
    expect(n.type).toBe("event_cancelled");
    expect(n.title).toBe("Event Cancelled");
    expect(n.description).toContain("Holi Party");
  });
});

describe("buildEventUpdatedNotification", () => {
  it("builds an update notification", () => {
    const event = { id: "evt-3", name: "Annual General Meeting", chapter_id: "ch-2" };
    const n = buildEventUpdatedNotification(event);
    expect(n.type).toBe("event_updated");
    expect(n.title).toBe("Event Updated");
    expect(n.description).toContain("Annual General Meeting");
  });
});

describe("buildRSVPConfirmation", () => {
  it("builds an RSVP confirmation for the member", () => {
    const event = { id: "evt-4", name: "Satsang", chapter_id: "ch-1" };
    const n = buildRSVPConfirmation(event, "mem-1", "going");
    expect(n.member_id).toBe("mem-1");
    expect(n.type).toBe("rsvp");
    expect(n.description).toContain("Satsang");
    expect(n.description).toContain("going");
  });
});

describe("filterOptedInMembers", () => {
  const members = [
    { member_id: "m1", pref: fullPref },
    { member_id: "m2", pref: noEmailPref },
    { member_id: "m3", pref: noChapterPref },
    { member_id: "m4", pref: null },
  ];

  it("returns only members with email enabled and chapter notifications enabled for event_created", () => {
    const result = filterOptedInMembers(members, "event_created");
    expect(result).toEqual(["m1"]);
  });

  it("returns members with email enabled for non-chapter types even if chapter notifications disabled", () => {
    const result = filterOptedInMembers(members, "vouch");
    expect(result).toEqual(["m1", "m3"]);
  });

  it("returns empty array when all members have email disabled", () => {
    const allNoEmail = [
      { member_id: "m1", pref: noEmailPref },
      { member_id: "m2", pref: noEmailPref },
    ];
    expect(filterOptedInMembers(allNoEmail, "event_created")).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(filterOptedInMembers([], "event_created")).toEqual([]);
  });
});

describe("filterRSVPGoingMembers", () => {
  const rsvps = [
    { member_id: "m1", status: "going", event_id: "e1" },
    { member_id: "m2", status: "not_going", event_id: "e1" },
    { member_id: "m3", status: "going", event_id: "e1" },
    { member_id: "m4", status: "maybe", event_id: "e1" },
  ];

  it("returns only members with 'going' status", () => {
    const result = filterRSVPGoingMembers(rsvps);
    expect(result).toEqual(["m1", "m3"]);
  });

  it("returns empty array when nobody is going", () => {
    const notGoing = [
      { member_id: "m1", status: "not_going", event_id: "e1" },
    ];
    expect(filterRSVPGoingMembers(notGoing)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(filterRSVPGoingMembers([])).toEqual([]);
  });
});
