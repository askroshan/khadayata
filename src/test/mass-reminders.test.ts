import { describe, it, expect } from "vitest";

/**
 * TDD: Suite for the "Send Reminders to All Pending" mass reminder feature.
 *
 * The admin should be able to send reminder emails to ALL pending-verification
 * members in one action, without having to select each one individually.
 *
 * The send-reminder edge function gains a new mode: when `send_to_all: true`
 * is passed instead of `member_ids`, it queries all members with
 * onboarding_completed = false and sends reminders to each one.
 */

interface MemberRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  onboarding_completed: boolean;
  chapter_id: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
}

type ReminderMode = "selected" | "all";

interface ReminderRequest {
  member_ids?: string[];
  send_to_all?: boolean;
  chapter_id?: string | null;
}

interface ReminderResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
  total_attempted: number;
}

/**
 * Determines which members should receive reminders based on the mode.
 * Mirrors the logic in the send-reminder edge function.
 */
function selectMembersForReminders(
  mode: ReminderMode,
  allMembers: MemberRow[],
  selectedIds?: string[]
): MemberRow[] {
  if (mode === "all") {
    return allMembers.filter((m) => !m.onboarding_completed);
  }
  if (!selectedIds) return [];
  return allMembers.filter(
    (m) => selectedIds.includes(m.id) && !m.onboarding_completed
  );
}

/**
 * Simulates the batch send-reminder loop for a given set of members.
 */
function simulateMassReminder(
  members: MemberRow[],
  authUsers: AuthUser[]
): ReminderResponse {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const member of members) {
    if (member.onboarding_completed) {
      errors.push(`${member.id}: already onboarded`);
      failed++;
      continue;
    }
    if (!member.user_id) {
      errors.push(`${member.id}: no user_id`);
      failed++;
      continue;
    }
    const authUser = authUsers.find((u) => u.id === member.user_id);
    if (!authUser?.email) {
      errors.push(`${member.id}: no email`);
      failed++;
      continue;
    }
    sent++;
  }

  return {
    success: true,
    sent,
    failed,
    errors: errors.slice(0, 10),
    total_attempted: members.length,
  };
}

/**
 * Parses a ReminderRequest to determine the mode.
 */
function parseReminderMode(req: ReminderRequest): ReminderMode {
  if (req.send_to_all === true) return "all";
  return "selected";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Mass Reminders: Mode Parsing", () => {
  it("returns 'all' mode when send_to_all is true", () => {
    expect(parseReminderMode({ send_to_all: true })).toBe("all");
  });

  it("returns 'selected' mode when member_ids is provided", () => {
    expect(parseReminderMode({ member_ids: ["m1", "m2"] })).toBe("selected");
  });

  it("returns 'selected' mode when send_to_all is false", () => {
    expect(parseReminderMode({ send_to_all: false, member_ids: ["m1"] })).toBe("selected");
  });

  it("returns 'selected' mode when neither is provided (default)", () => {
    expect(parseReminderMode({})).toBe("selected");
  });
});

describe("Mass Reminders: Member Selection", () => {
  const allMembers: MemberRow[] = [
    { id: "m1", user_id: "u1", first_name: "Kevin", last_name: "Shah", onboarding_completed: false, chapter_id: "ch1" },
    { id: "m2", user_id: "u2", first_name: "Priya", last_name: "Patel", onboarding_completed: false, chapter_id: "ch1" },
    { id: "m3", user_id: "u3", first_name: "Amit", last_name: "Done", onboarding_completed: true, chapter_id: "ch1" },
    { id: "m4", user_id: null, first_name: "No", last_name: "User", onboarding_completed: false, chapter_id: "ch1" },
    { id: "m5", user_id: "u5", first_name: "Pending", last_name: "Verification", onboarding_completed: false, chapter_id: "ch2" },
  ];

  it("selects all non-onboarded members in 'all' mode", () => {
    const selected = selectMembersForReminders("all", allMembers);
    expect(selected).toHaveLength(4);
    expect(selected.map((m) => m.id)).toEqual(["m1", "m2", "m4", "m5"]);
  });

  it("excludes onboarded members in 'all' mode", () => {
    const selected = selectMembersForReminders("all", allMembers);
    expect(selected.find((m) => m.id === "m3")).toBeUndefined();
  });

  it("selects only specified members in 'selected' mode", () => {
    const selected = selectMembersForReminders("selected", allMembers, ["m1", "m2"]);
    expect(selected).toHaveLength(2);
    expect(selected.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("excludes onboarded members even in 'selected' mode", () => {
    const selected = selectMembersForReminders("selected", allMembers, ["m1", "m3"]);
    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe("m1");
  });

  it("returns empty array for empty selection", () => {
    const selected = selectMembersForReminders("selected", allMembers, []);
    expect(selected).toHaveLength(0);
  });
});

describe("Mass Reminders: Batch Processing", () => {
  const authUsers: AuthUser[] = [
    { id: "u1", email: "kevin@example.com", email_confirmed_at: null },
    { id: "u2", email: "priya@example.com", email_confirmed_at: "2026-01-01" },
    { id: "u5", email: "pending@example.com", email_confirmed_at: null },
  ];

  const pendingMembers: MemberRow[] = [
    { id: "m1", user_id: "u1", first_name: "Kevin", last_name: "Shah", onboarding_completed: false, chapter_id: "ch1" },
    { id: "m2", user_id: "u2", first_name: "Priya", last_name: "Patel", onboarding_completed: false, chapter_id: "ch1" },
    { id: "m4", user_id: null, first_name: "No", last_name: "User", onboarding_completed: false, chapter_id: "ch1" },
    { id: "m5", user_id: "u5", first_name: "Pending", last_name: "Verification", onboarding_completed: false, chapter_id: "ch2" },
  ];

  it("sends to all pending members with emails", () => {
    const result = simulateMassReminder(pendingMembers, authUsers);
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.total_attempted).toBe(4);
  });

  it("reports correct total_attempted count", () => {
    const result = simulateMassReminder(pendingMembers, authUsers);
    expect(result.total_attempted).toBe(4);
  });

  it("handles empty member list", () => {
    const result = simulateMassReminder([], authUsers);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.total_attempted).toBe(0);
  });

  it("includes error messages for failed sends", () => {
    const result = simulateMassReminder(pendingMembers, authUsers);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("m4");
  });
});

describe("Mass Reminders: UI Response Handling", () => {
  function interpretMassReminderResponse(
    response: ReminderResponse | null,
    error: Error | null
  ): { toastType: "success" | "error"; message: string } {
    if (error) return { toastType: "error", message: error.message };
    if (!response) return { toastType: "error", message: "No response from server" };
    if (response.sent > 0) {
      const failedNote = response.failed > 0 ? ` ${response.failed} failed.` : "";
      return {
        toastType: "success",
        message: `${response.sent} reminder email${response.sent !== 1 ? "s" : ""} sent to pending members.${failedNote}`,
      };
    }
    return {
      toastType: "error",
      message: `No emails were sent. ${response.failed} member${response.failed !== 1 ? "s" : ""} could not be reached.`,
    };
  }

  it("shows success with count when emails are sent", () => {
    const result = interpretMassReminderResponse(
      { success: true, sent: 5, failed: 1, errors: ["m4: no email"], total_attempted: 6 },
      null
    );
    expect(result.toastType).toBe("success");
    expect(result.message).toContain("5 reminder emails sent");
    expect(result.message).toContain("1 failed");
  });

  it("shows success without failed note when all succeed", () => {
    const result = interpretMassReminderResponse(
      { success: true, sent: 3, failed: 0, errors: [], total_attempted: 3 },
      null
    );
    expect(result.toastType).toBe("success");
    expect(result.message).not.toContain("failed");
  });

  it("shows error when all fail", () => {
    const result = interpretMassReminderResponse(
      { success: true, sent: 0, failed: 5, errors: ["no email", "no email"], total_attempted: 5 },
      null
    );
    expect(result.toastType).toBe("error");
    expect(result.message).toContain("No emails were sent");
  });

  it("shows error on network failure", () => {
    const result = interpretMassReminderResponse(null, new Error("Network error"));
    expect(result.toastType).toBe("error");
    expect(result.message).toContain("Network error");
  });
});
