import { describe, it, expect } from "vitest";
import {
  validateChapterMessage,
  formatCommitteeLabel,
  type CommitteeMember,
} from "@/lib/chapter-contact-utils";

describe("validateChapterMessage", () => {
  const validInput = {
    from_member_id: "mem-1",
    to_member_id: "mem-2",
    chapter_id: "ch-1",
    subject: "Question about upcoming event",
    body: "Hello, I wanted to ask about the Diwali celebration arrangements.",
  };

  it("passes with all valid fields", () => {
    const result = validateChapterMessage(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when from_member_id is missing", () => {
    const result = validateChapterMessage({ ...validInput, from_member_id: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("You must be signed in to send a message.");
  });

  it("fails when to_member_id is missing", () => {
    const result = validateChapterMessage({ ...validInput, to_member_id: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Please select a committee member to message.");
  });

  it("fails when chapter_id is missing", () => {
    const result = validateChapterMessage({ ...validInput, chapter_id: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("You must belong to a chapter to send a message.");
  });

  it("fails when subject is empty", () => {
    const result = validateChapterMessage({ ...validInput, subject: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Subject"))).toBe(true);
  });

  it("fails when subject is only whitespace", () => {
    const result = validateChapterMessage({ ...validInput, subject: "   " });
    expect(result.valid).toBe(false);
  });

  it("fails when subject exceeds 200 characters", () => {
    const result = validateChapterMessage({ ...validInput, subject: "x".repeat(201) });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("200 characters"))).toBe(true);
  });

  it("fails when body is empty", () => {
    const result = validateChapterMessage({ ...validInput, body: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("body"))).toBe(true);
  });

  it("fails when body exceeds 5000 characters", () => {
    const result = validateChapterMessage({ ...validInput, body: "x".repeat(5001) });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("5000 characters"))).toBe(true);
  });

  it("fails when sending to yourself", () => {
    const result = validateChapterMessage({ ...validInput, to_member_id: "mem-1" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("You cannot send a message to yourself.");
  });

  it("accumulates multiple errors", () => {
    const result = validateChapterMessage({ from_member_id: "", to_member_id: "", chapter_id: "", subject: "", body: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe("formatCommitteeLabel", () => {
  it("formats with role, name, and phone", () => {
    const member: CommitteeMember = {
      id: "m1",
      first_name: "Rajesh",
      last_name: "Shah",
      role_name: "Chapter Admin",
      phone: "+919876543210",
      email: null,
    };
    expect(formatCommitteeLabel(member)).toBe("Chapter Admin — Rajesh Shah · +919876543210");
  });

  it("formats without phone when null", () => {
    const member: CommitteeMember = {
      id: "m2",
      first_name: "Priya",
      last_name: "Patel",
      role_name: "Samiti President",
      phone: null,
      email: null,
    };
    expect(formatCommitteeLabel(member)).toBe("Samiti President — Priya Patel");
  });

  it("formats with empty phone as no phone", () => {
    const member: CommitteeMember = {
      id: "m3",
      first_name: "Amit",
      last_name: "Kumar",
      role_name: "Treasurer",
      phone: "",
      email: null,
    };
    expect(formatCommitteeLabel(member)).toBe("Treasurer — Amit Kumar");
  });
});
