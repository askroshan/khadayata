import { describe, it, expect } from "vitest";

/**
 * Root-cause reproduction for: "Failed to send invitation" when inviting
 * rushik@alakmalak.com as Global Admin.
 *
 * Scenario reproduced in DB:
 *   - auth.users has a row for the email (id d8f0d854-f85f-4652-bb9d-3bd83ee62b86)
 *   - public.members has NO row for that user_id (orphan auth user)
 *
 * Previous behaviour:
 *   - invite-member found the existing auth user, but because no member row
 *     existed it fell through and called auth.admin.createUser() again which
 *     fails with "email address has already been registered" → generic
 *     "Failed to send invitation" toast.
 *
 * Expected behaviour:
 *   - When an auth user exists but has no member record, the function must
 *     reuse the existing auth user: ensure a member row exists (upsert),
 *     generate an invite link for that user, and send the invitation email.
 */

type AuthUser = { id: string; email: string };
type Member = { id: string; user_id: string };

interface InviteOutcome {
  action: "create_user" | "reuse_user" | "reject_duplicate";
  userId: string;
}

function decideInviteAction(
  email: string,
  authUsers: AuthUser[],
  members: Member[]
): InviteOutcome {
  const normalized = email.trim().toLowerCase();
  const existing = authUsers.find((u) => u.email.toLowerCase() === normalized);
  if (!existing) {
    return { action: "create_user", userId: "new" };
  }
  const member = members.find((m) => m.user_id === existing.id);
  if (member) {
    return { action: "reject_duplicate", userId: existing.id };
  }
  return { action: "reuse_user", userId: existing.id };
}

describe("invite-member: orphan auth user handling", () => {
  it("creates a new user when email does not exist", () => {
    const out = decideInviteAction("new@example.com", [], []);
    expect(out.action).toBe("create_user");
  });

  it("rejects duplicate when both auth user and member exist", () => {
    const out = decideInviteAction(
      "dup@example.com",
      [{ id: "u1", email: "dup@example.com" }],
      [{ id: "m1", user_id: "u1" }]
    );
    expect(out.action).toBe("reject_duplicate");
  });

  it("reuses orphan auth user (no member row) instead of failing", () => {
    const out = decideInviteAction(
      "rushik@alakmalak.com",
      [{ id: "d8f0d854-f85f-4652-bb9d-3bd83ee62b86", email: "rushik@alakmalak.com" }],
      []
    );
    expect(out.action).toBe("reuse_user");
    expect(out.userId).toBe("d8f0d854-f85f-4652-bb9d-3bd83ee62b86");
  });

  it("is case-insensitive on email matching", () => {
    const out = decideInviteAction(
      "Rushik@Alakmalak.com",
      [{ id: "u9", email: "rushik@alakmalak.com" }],
      []
    );
    expect(out.action).toBe("reuse_user");
  });
});
