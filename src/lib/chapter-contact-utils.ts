export interface CommitteeMember {
  id: string;
  first_name: string;
  last_name: string;
  role_name: string;
  phone: string | null;
  email: string | null;
}

export interface ChapterMessageInput {
  from_member_id: string;
  to_member_id: string;
  chapter_id: string;
  subject: string;
  body: string;
}

export interface ChapterMessageValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateChapterMessage(
  input: Partial<ChapterMessageInput>,
): ChapterMessageValidationResult {
  const errors: string[] = [];

  if (!input.from_member_id) {
    errors.push("You must be signed in to send a message.");
  }

  if (!input.to_member_id) {
    errors.push("Please select a committee member to message.");
  }

  if (!input.chapter_id) {
    errors.push("You must belong to a chapter to send a message.");
  }

  const subject = (input.subject ?? "").trim();
  if (!subject) {
    errors.push("Subject cannot be empty.");
  } else if (subject.length > 200) {
    errors.push("Subject must be 200 characters or less.");
  }

  const body = (input.body ?? "").trim();
  if (!body) {
    errors.push("Message body cannot be empty.");
  } else if (body.length > 5000) {
    errors.push("Message body must be 5000 characters or less.");
  }

  if (input.from_member_id && input.to_member_id && input.from_member_id === input.to_member_id) {
    errors.push("You cannot send a message to yourself.");
  }

  return { valid: errors.length === 0, errors };
}

export function formatCommitteeLabel(member: CommitteeMember): string {
  const name = `${member.first_name} ${member.last_name}`.trim();
  const phonePart = member.phone ? ` · ${member.phone}` : "";
  return `${member.role_name} — ${name}${phonePart}`;
}
