// Backend errors (Postgres, PostgREST, GoTrue) carry schema, constraint and
// policy detail. They are useful in the console, never in the interface.
// Use safeErrorMessage() anywhere an error is shown to a visitor or a member.

const FRIENDLY_BY_CODE: Record<string, string> = {
  "23505": "That already exists. Please check the details and try again.",
  "23503": "Some of the linked information is missing or no longer available.",
  "23514": "Some of the information entered is not allowed here.",
  "42501": "You do not have permission to do that.",
  "22001": "One of the values entered is too long.",
};

const FRIENDLY_AUTH_MESSAGES: Record<string, string> = {
  "invalid login credentials": "The email or password you entered is incorrect.",
  "email not confirmed": "Please confirm your email address before signing in.",
  "user already registered": "If this email can be used, you will receive an email shortly.",
  "email rate limit exceeded": "Too many attempts. Please wait a few minutes and try again.",
  "over_email_send_rate_limit": "Too many attempts. Please wait a few minutes and try again.",
};

export const GENERIC_ERROR_MESSAGE =
  "Something went wrong. Please try again, and contact support if the problem continues.";

/**
 * Turns any thrown value into a message that is safe to render.
 * The original error is logged to the console for debugging.
 */
function isBackendError(err: Record<string, unknown>): boolean {
  return (
    "code" in err || "details" in err || "hint" in err ||
    "status" in err || "__isAuthError" in err
  );
}

export function safeErrorMessage(error: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
  if (error) {
    console.error("Handled error:", error);
  }

  const err = error as { code?: string; message?: string } | null;
  if (!err) return fallback;

  // Messages we raised ourselves (plain Error, no backend metadata) are written
  // for the user and are safe to show as-is.
  if (typeof err === "object" && !isBackendError(err as Record<string, unknown>)) {
    return err.message || fallback;
  }

  if (err.code && FRIENDLY_BY_CODE[err.code]) {
    return FRIENDLY_BY_CODE[err.code];
  }

  const normalized = (err.message ?? "").trim().toLowerCase();
  if (normalized && FRIENDLY_AUTH_MESSAGES[normalized]) {
    return FRIENDLY_AUTH_MESSAGES[normalized];
  }

  return fallback;
}
