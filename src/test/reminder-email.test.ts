import { describe, it, expect } from "vitest";

/**
 * TDD: Regression suite for the "Send Reminder" flows.
 *
 * Two bugs were confirmed in production:
 *
 * Bug 1 – /admin?tab=members "Send Reminder" button
 *   Error: "Edge Function returned a non-2xx status code"
 *   Root cause: invite-member returns HTTP 409 for any existing member whose
 *   name is NOT the exact stub "Pending"/"Verification", even when they have
 *   not completed onboarding yet.
 *
 * Bug 2 – /admin?tab=verification "Send Reminders" button
 *   Error: "0 reminder emails sent successfully"
 *   Root cause: same 409 path; sendReminder loop catches the error silently
 *   (no throw), increments no counter, reports 0 successes.
 *
 * Solution: New dedicated `send-reminder` edge function that:
 * - Accepts an array of member_ids
 * - Looks up email from auth.users server-side (no client-side email passing)
 * - Skips fully-onboarded members
 * - Returns { sent, failed, errors } for transparent reporting
 */

type MemberRow = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  onboarding_completed: boolean;
  chapter_id: string | null;
};

type AuthUser = {
  id: string;
  email: string;
};

type ReminderResult = {
  action: "send" | "skip_onboarded" | "skip_no_user" | "skip_no_email";
  memberId: string;
};

/**
 * Pure business logic: decide whether a member should receive a reminder.
 * This mirrors the decision logic in supabase/functions/send-reminder/index.ts.
 */
function decideReminderAction(
  member: MemberRow | null,
  authUser: AuthUser | null
): ReminderResult["action"] {
  if (!member || !member.user_id) return "skip_no_user";
  if (member.onboarding_completed) return "skip_onboarded";
  if (!authUser?.email) return "skip_no_email";
  return "send";
}

/**
 * Simulate the batch send-reminder loop.
 * Returns { sent, failed } counts matching the edge function response shape.
 */
function simulateBatchReminder(
  memberIds: string[],
  members: MemberRow[],
  authUsers: AuthUser[]
): { sent: number; failed: number } {
  let sent = 0;
  let failed = 0;
  for (const id of memberIds) {
    const member = members.find(m => m.id === id) ?? null;
    const authUser = member?.user_id
      ? authUsers.find(u => u.id === member.user_id) ?? null
      : null;
    const action = decideReminderAction(member, authUser);
    if (action === "send") sent++;
    else failed++;
  }
  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("send-reminder: decideReminderAction", () => {
  it("returns 'send' for a pending member with valid auth user", () => {
    const member: MemberRow = { id: "m1", user_id: "u1", first_name: "Kevin", last_name: "Shah", onboarding_completed: false, chapter_id: null };
    const authUser: AuthUser = { id: "u1", email: "kevin@example.com" };
    expect(decideReminderAction(member, authUser)).toBe("send");
  });

  it("returns 'send' for stub member (Pending Verification) with auth user", () => {
    const member: MemberRow = { id: "m2", user_id: "u2", first_name: "Pending", last_name: "Verification", onboarding_completed: false, chapter_id: null };
    const authUser: AuthUser = { id: "u2", email: "stub@example.com" };
    expect(decideReminderAction(member, authUser)).toBe("send");
  });

  it("returns 'skip_onboarded' for a fully onboarded member", () => {
    const member: MemberRow = { id: "m3", user_id: "u3", first_name: "Amit", last_name: "Shah", onboarding_completed: true, chapter_id: null };
    const authUser: AuthUser = { id: "u3", email: "amit@example.com" };
    expect(decideReminderAction(member, authUser)).toBe("skip_onboarded");
  });

  it("returns 'skip_no_user' when member has no user_id", () => {
    const member: MemberRow = { id: "m4", user_id: null, first_name: "Test", last_name: "User", onboarding_completed: false, chapter_id: null };
    expect(decideReminderAction(member, null)).toBe("skip_no_user");
  });

  it("returns 'skip_no_user' when member is null (bad ID)", () => {
    expect(decideReminderAction(null, null)).toBe("skip_no_user");
  });

  it("returns 'skip_no_email' when auth user has no email", () => {
    const member: MemberRow = { id: "m5", user_id: "u5", first_name: "No", last_name: "Email", onboarding_completed: false, chapter_id: null };
    const authUser: AuthUser = { id: "u5", email: "" };
    expect(decideReminderAction(member, authUser)).toBe("skip_no_email");
  });
});

describe("send-reminder: batch processing", () => {
  const members: MemberRow[] = [
    { id: "m1", user_id: "u1", first_name: "Kevin", last_name: "Shah", onboarding_completed: false, chapter_id: null },
    { id: "m2", user_id: "u2", first_name: "Priya", last_name: "Patel", onboarding_completed: false, chapter_id: null },
    { id: "m3", user_id: "u3", first_name: "Amit", last_name: "Done", onboarding_completed: true, chapter_id: null },
    { id: "m4", user_id: null, first_name: "No", last_name: "User", onboarding_completed: false, chapter_id: null },
  ];
  const authUsers: AuthUser[] = [
    { id: "u1", email: "kevin@example.com" },
    { id: "u2", email: "priya@example.com" },
    { id: "u3", email: "amit@example.com" },
  ];

  it("correctly counts sends and failures for mixed member states", () => {
    const result = simulateBatchReminder(["m1", "m2", "m3", "m4"], members, authUsers);
    expect(result.sent).toBe(2); // m1 and m2 are sendable
    expect(result.failed).toBe(2); // m3 is onboarded, m4 has no user_id
  });

  it("returns sent=0 when all members are fully onboarded (Bug 2 scenario)", () => {
    const onboarded: MemberRow[] = [
      { id: "m1", user_id: "u1", first_name: "A", last_name: "B", onboarding_completed: true, chapter_id: null },
    ];
    const result = simulateBatchReminder(["m1"], onboarded, authUsers);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it("handles select-all with all pending (Bug 1 fix scenario)", () => {
    const result = simulateBatchReminder(["m1", "m2"], members, authUsers);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("handles empty member_ids array", () => {
    const result = simulateBatchReminder([], members, authUsers);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});

describe("send-reminder: client response handling", () => {
  type SendReminderResponse = { success: boolean; sent: number; failed: number; errors: string[] };

  function interpretResponse(response: SendReminderResponse | null, error: Error | null): {
    toastType: "success" | "error";
    message: string;
  } {
    if (error) return { toastType: "error", message: error.message };
    if (!response) return { toastType: "error", message: "No response" };
    if (response.sent > 0) {
      return { toastType: "success", message: `${response.sent} reminder email${response.sent !== 1 ? "s" : ""} sent successfully.` };
    }
    return { toastType: "error", message: `All ${response.failed} attempts failed.` };
  }

  it("shows success when emails are sent", () => {
    const result = interpretResponse({ success: true, sent: 3, failed: 0, errors: [] }, null);
    expect(result.toastType).toBe("success");
    expect(result.message).toContain("3 reminder emails sent");
  });

  it("shows error when all fail (the original Bug 2 user-facing issue)", () => {
    const result = interpretResponse({ success: true, sent: 0, failed: 5, errors: ["m1: already onboarded"] }, null);
    expect(result.toastType).toBe("error");
    expect(result.message).toContain("All 5 attempts failed");
  });

  it("shows error on network/SDK failure", () => {
    const result = interpretResponse(null, new Error("Edge Function returned a non-2xx status code"));
    expect(result.toastType).toBe("error");
    expect(result.message).toContain("non-2xx");
  });

  it("shows success with partial failures", () => {
    const result = interpretResponse({ success: true, sent: 2, failed: 1, errors: ["m3: already onboarded"] }, null);
    expect(result.toastType).toBe("success");
    expect(result.message).toContain("2 reminder emails sent");
  });
});
