import { describe, it, expect } from "vitest";
import { parseEmailsFromText, isValidEmail, capEmails } from "@/lib/bulk-invite-utils";

/**
 * TDD: Bulk invite file parsing and validation.
 *
 * Admins can upload a .txt or .csv file containing one email per line.
 * The file is parsed client-side, emails are validated and deduplicated,
 * then sent to the bulk-invite edge function in a single batch.
 *
 * Supported formats:
 * - Plain text: one email per line
 * - CSV: single column with header "email" (or first row treated as data
 *   if it looks like an email)
 *
 * Edge cases handled:
 * - Empty lines and whitespace
 * - Lines with commas (CSV with multiple columns — only first column used)
 * - BOM character at start of file
 * - CRLF line endings
 * - Quoted emails in CSV ("email@example.com")
 * - Duplicate emails (deduplicated, case-insensitive)
 * - Invalid email formats (filtered out, reported to user)
 * - Empty files
 * - Very large files (capped at 500 emails)
 */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Bulk Invite: File Parsing", () => {
  it("parses a plain text file with one email per line", () => {
    const text = "john@example.com\njane@example.com\nbob@test.org\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com", "bob@test.org"]);
    expect(result.invalid).toHaveLength(0);
    expect(result.duplicates).toBe(0);
  });

  it("handles CRLF line endings", () => {
    const text = "john@example.com\r\njane@example.com\r\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toHaveLength(2);
  });

  it("handles old Mac CR line endings", () => {
    const text = "john@example.com\rjane@example.com\r";
    const result = parseEmailsFromText(text);
    expect(result.valid).toHaveLength(2);
  });

  it("strips BOM character at start of file", () => {
    const text = "\uFEFFjohn@example.com\njane@example.com\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
  });

  it("skips empty lines and whitespace-only lines", () => {
    const text = "john@example.com\n\n   \n\njane@example.com\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toHaveLength(2);
  });

  it("trims whitespace around emails", () => {
    const text = "  john@example.com  \n\tjane@example.com\t\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
  });
});

describe("Bulk Invite: CSV Parsing", () => {
  it("parses a single-column CSV with header 'email'", () => {
    const text = "email\njohn@example.com\njane@example.com\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
  });

  it("parses a single-column CSV with header 'Email Address'", () => {
    const text = "Email Address\njohn@example.com\njane@example.com\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
  });

  it("treats first row as data if it looks like an email (no header)", () => {
    const text = "john@example.com\njane@example.com\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toHaveLength(2);
    expect(result.valid).toContain("john@example.com");
  });

  it("handles multi-column CSV — uses only first column", () => {
    const text = "email,name\njohn@example.com,John\njane@example.com,Jane\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
  });

  it("strips quoted emails in CSV format", () => {
    const text = 'email\n"john@example.com"\n"jane@example.com"\n';
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
  });
});

describe("Bulk Invite: Validation", () => {
  it("separates valid and invalid emails", () => {
    const text = "john@example.com\nnotanemail\njane@example.com\n@missing.com\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
    expect(result.invalid).toEqual(["notanemail", "@missing.com"]);
  });

  it("deduplicates emails case-insensitively", () => {
    const text = "John@Example.com\njohn@example.com\nJANE@example.com\njane@example.com\n";
    const result = parseEmailsFromText(text);
    expect(result.valid).toEqual(["john@example.com", "jane@example.com"]);
    expect(result.duplicates).toBe(2);
  });

  it("isValidEmail accepts standard format", () => {
    expect(isValidEmail("john@example.com")).toBe(true);
  });

  it("isValidEmail rejects missing domain", () => {
    expect(isValidEmail("john@")).toBe(false);
  });

  it("isValidEmail rejects missing @", () => {
    expect(isValidEmail("johnexample.com")).toBe(false);
  });

  it("isValidEmail rejects spaces", () => {
    expect(isValidEmail("john @example.com")).toBe(false);
  });
});

describe("Bulk Invite: Edge Cases", () => {
  it("handles empty file", () => {
    const result = parseEmailsFromText("");
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
    expect(result.totalLines).toBe(0);
  });

  it("handles file with only whitespace", () => {
    const result = parseEmailsFromText("   \n\n\t\n");
    expect(result.valid).toHaveLength(0);
    expect(result.totalLines).toBe(0);
  });

  it("handles file with only a header row", () => {
    const result = parseEmailsFromText("email\n");
    expect(result.valid).toHaveLength(0);
  });

  it("reports totalLines as count of non-empty lines (excluding header)", () => {
    const text = "email\njohn@example.com\n\njane@example.com\n";
    const result = parseEmailsFromText(text);
    expect(result.totalLines).toBe(2);
  });
});

describe("Bulk Invite: Max Email Cap", () => {
  it("does not truncate when under the limit", () => {
    const emails = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);
    const result = capEmails(emails);
    expect(result.emails).toHaveLength(100);
    expect(result.overflow).toBe(0);
  });

  it("truncates and reports overflow when over the limit", () => {
    const emails = Array.from({ length: 600 }, (_, i) => `user${i}@example.com`);
    const result = capEmails(emails);
    expect(result.emails).toHaveLength(500);
    expect(result.overflow).toBe(100);
  });

  it("exactly at the limit is not truncated", () => {
    const emails = Array.from({ length: 500 }, (_, i) => `user${i}@example.com`);
    const result = capEmails(emails);
    expect(result.emails).toHaveLength(500);
    expect(result.overflow).toBe(0);
  });
});

describe("Bulk Invite: UI Response Interpretation", () => {
  interface BulkInviteResponse {
    sent: number;
    failed: number;
    skipped: number;
    errors: string[];
    total: number;
  }

  function interpretBulkResult(
    response: BulkInviteResponse | null,
    error: Error | null
  ): { type: "success" | "error"; message: string } {
    if (error) return { type: "error", message: error.message };
    if (!response) return { type: "error", message: "No response from server" };
    if (response.sent > 0) {
      const parts: string[] = [`${response.sent} invitation${response.sent !== 1 ? "s" : ""} sent`];
      if (response.failed > 0) parts.push(`${response.failed} failed`);
      if (response.skipped > 0) parts.push(`${response.skipped} already registered`);
      return { type: "success", message: parts.join(", ") + "." };
    }
    return {
      type: "error",
      message: `No invitations were sent. ${response.failed} failed, ${response.skipped} already registered.`,
    };
  }

  it("shows success with count when invitations are sent", () => {
    const result = interpretBulkResult(
      { sent: 15, failed: 2, skipped: 3, errors: [], total: 20 },
      null
    );
    expect(result.type).toBe("success");
    expect(result.message).toContain("15 invitations sent");
    expect(result.message).toContain("2 failed");
    expect(result.message).toContain("3 already registered");
  });

  it("shows success without failed/skipped when all succeed", () => {
    const result = interpretBulkResult(
      { sent: 10, failed: 0, skipped: 0, errors: [], total: 10 },
      null
    );
    expect(result.type).toBe("success");
    expect(result.message).toBe("10 invitations sent.");
  });

  it("shows singular form for one invitation", () => {
    const result = interpretBulkResult(
      { sent: 1, failed: 0, skipped: 0, errors: [], total: 1 },
      null
    );
    expect(result.message).toContain("1 invitation sent");
  });

  it("shows error when all fail", () => {
    const result = interpretBulkResult(
      { sent: 0, failed: 5, skipped: 0, errors: ["err1"], total: 5 },
      null
    );
    expect(result.type).toBe("error");
    expect(result.message).toContain("No invitations were sent");
  });

  it("shows error on network failure", () => {
    const result = interpretBulkResult(null, new Error("Network error"));
    expect(result.type).toBe("error");
    expect(result.message).toContain("Network error");
  });
});
