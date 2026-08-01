const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 500;

export interface ParsedEmailResult {
  valid: string[];
  invalid: string[];
  duplicates: number;
  totalLines: number;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export function parseEmailsFromText(rawText: string): ParsedEmailResult {
  let text = rawText.replace(/^\uFEFF/, "");
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = text.split("\n");
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let totalLines = 0;

  const firstLine = lines[0]?.trim().toLowerCase() ?? "";
  const isHeader = firstLine === "email" || firstLine === "email address" || firstLine === "e-mail";
  const startIndex = isHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) continue;
    totalLines++;

    if (line.includes(",")) {
      line = line.split(",")[0];
    }

    line = line.replace(/^["'](.+)["']$/, "$1").trim();

    if (!line) continue;

    const normalized = line.toLowerCase();

    if (!EMAIL_REGEX.test(normalized)) {
      invalid.push(line);
      continue;
    }

    if (seen.has(normalized)) {
      duplicates++;
      continue;
    }

    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, invalid, duplicates, totalLines };
}

export function capEmails(emails: string[]): { emails: string[]; overflow: number } {
  if (emails.length <= MAX_EMAILS) return { emails, overflow: 0 };
  return { emails: emails.slice(0, MAX_EMAILS), overflow: emails.length - MAX_EMAILS };
}

export const BULK_INVITE_MAX_EMAILS = MAX_EMAILS;
