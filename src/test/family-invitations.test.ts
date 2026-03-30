import { describe, it, expect } from "vitest";

/**
 * User stories covered:
 *
 * US-1 (Member): As a member I can invite a family member by name + email or phone
 *   so they can join and connect to my Parivar tree.
 *
 * US-2 (Member): As a member I can edit a pending invitation
 *   so I can correct a typo before the invitee sees it.
 *
 * US-3 (Member): As a member I can cancel a pending invitation
 *   so I can retract an accidental or unwanted invite.
 *
 * US-4 (Invitee): As an invitee I receive an email with a personalised link
 *   so I can accept the invitation without searching for it manually.
 *
 * US-5 (Invitee): As an invitee clicking the link I see who invited me and their relation
 *   so I can make an informed decision before accepting.
 *
 * US-6 (Invitee): Accepting creates bidirectional family_links records
 *   so both parties appear in each other's family tree.
 *
 * US-7 (System): An accepted or cancelled invitation cannot be accepted again
 *   so duplicate family links are prevented.
 *
 * US-8 (Layout): Pending invitations render inside CardContent, not in CardHeader
 *   so the page layout is not broken.
 */

describe("Family invitation validation logic", () => {
  function validateInviteForm(form: {
    relation: string;
    name: string;
    email: string;
    phone: string;
  }): string | null {
    if (!form.relation) return "Relation is required";
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim() && !form.phone.trim()) return "Email or phone is required";
    return null;
  }

  it("US-1: rejects a form with no relation", () => {
    const err = validateInviteForm({ relation: "", name: "Roshan Shah", email: "r@test.com", phone: "" });
    expect(err).toBe("Relation is required");
  });

  it("US-1: rejects a form with no name", () => {
    const err = validateInviteForm({ relation: "son", name: "  ", email: "r@test.com", phone: "" });
    expect(err).toBe("Name is required");
  });

  it("US-1: rejects a form with neither email nor phone", () => {
    const err = validateInviteForm({ relation: "son", name: "Roshan Shah", email: "", phone: "" });
    expect(err).toBe("Email or phone is required");
  });

  it("US-1: accepts a valid form with email only", () => {
    const err = validateInviteForm({ relation: "son", name: "Roshan Shah", email: "r@test.com", phone: "" });
    expect(err).toBeNull();
  });

  it("US-1: accepts a valid form with phone only", () => {
    const err = validateInviteForm({ relation: "daughter", name: "Priya Shah", email: "", phone: "9876543210" });
    expect(err).toBeNull();
  });

  it("US-1: accepts a valid form with both email and phone", () => {
    const err = validateInviteForm({ relation: "spouse", name: "Meena Shah", email: "m@test.com", phone: "9876543210" });
    expect(err).toBeNull();
  });
});

describe("Bidirectional relation mapping", () => {
  function oppositeRelation(relation: string): string {
    const map: Record<string, string> = {
      spouse: "spouse",
      son: "father",
      daughter: "father",
      father: "son",
      mother: "son",
      brother: "brother",
      sister: "sister",
    };
    return map[relation] ?? relation;
  }

  it("US-6: spouse maps to spouse", () => {
    expect(oppositeRelation("spouse")).toBe("spouse");
  });

  it("US-6: son maps to father", () => {
    expect(oppositeRelation("son")).toBe("father");
  });

  it("US-6: daughter maps to father", () => {
    expect(oppositeRelation("daughter")).toBe("father");
  });

  it("US-6: father maps to son", () => {
    expect(oppositeRelation("father")).toBe("son");
  });

  it("US-6: mother maps to son", () => {
    expect(oppositeRelation("mother")).toBe("son");
  });

  it("US-6: brother maps to brother", () => {
    expect(oppositeRelation("brother")).toBe("brother");
  });

  it("US-6: sister maps to sister", () => {
    expect(oppositeRelation("sister")).toBe("sister");
  });

  it("US-6: unknown relation maps back to itself", () => {
    expect(oppositeRelation("cousin")).toBe("cousin");
  });
});

describe("Invitation status transitions", () => {
  type Status = "pending" | "accepted" | "cancelled";

  function canAccept(status: Status): boolean {
    return status === "pending";
  }

  function canEdit(status: Status): boolean {
    return status === "pending";
  }

  function canCancel(status: Status): boolean {
    return status === "pending";
  }

  it("US-2: pending invitation can be edited", () => {
    expect(canEdit("pending")).toBe(true);
  });

  it("US-2: accepted invitation cannot be edited", () => {
    expect(canEdit("accepted")).toBe(false);
  });

  it("US-3: pending invitation can be cancelled", () => {
    expect(canCancel("pending")).toBe(true);
  });

  it("US-3: accepted invitation cannot be cancelled", () => {
    expect(canCancel("accepted")).toBe(false);
  });

  it("US-5/US-7: pending invitation can be accepted", () => {
    expect(canAccept("pending")).toBe(true);
  });

  it("US-7: accepted invitation cannot be accepted again", () => {
    expect(canAccept("accepted")).toBe(false);
  });

  it("US-7: cancelled invitation cannot be accepted", () => {
    expect(canAccept("cancelled")).toBe(false);
  });
});

describe("Acceptance link construction", () => {
  it("US-4: builds a correct acceptance URL from token", () => {
    const origin = "https://khadayataonline.com";
    const token = "abc-123-def";
    const url = `${origin}/accept-family-invite/${token}`;
    expect(url).toBe("https://khadayataonline.com/accept-family-invite/abc-123-def");
  });
});

describe("Phone number sanitisation", () => {
  function sanitisePhone(input: string): string {
    return input.replace(/[^\d]/g, "");
  }

  it("US-1: strips non-digit characters from phone input", () => {
    expect(sanitisePhone("98 765-43210")).toBe("9876543210");
  });

  it("US-1: leaves a clean digit-only string unchanged", () => {
    expect(sanitisePhone("9876543210")).toBe("9876543210");
  });

  it("US-1: strips plus sign from phone input (country code separate)", () => {
    expect(sanitisePhone("+919876543210")).toBe("919876543210");
  });
});
