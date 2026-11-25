export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

const SESSION_KEY_PREFIX = "khadayata_admin_otp_verified:";

export function normalizeOtpCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isValidOtpCode(input: string): boolean {
  return /^\d{6}$/.test(input);
}

export function isOtpExpired(expiresAtIso: string, nowMs: number = Date.now()): boolean {
  const expiresMs = Date.parse(expiresAtIso);
  if (Number.isNaN(expiresMs)) return true;
  return nowMs >= expiresMs;
}

export function hasExceededOtpAttempts(
  attempts: number,
  maxAttempts: number = OTP_MAX_ATTEMPTS
): boolean {
  return attempts >= maxAttempts;
}

export function getAdminOtpVerifiedKey(userId: string): string {
  return `${SESSION_KEY_PREFIX}${userId}`;
}

export function isAdminOtpVerifiedInSession(
  userId: string,
  storage: Storage = sessionStorage
): boolean {
  try {
    return storage.getItem(getAdminOtpVerifiedKey(userId)) === "true";
  } catch {
    return false;
  }
}

export function markAdminOtpVerifiedInSession(
  userId: string,
  storage: Storage = sessionStorage
): void {
  try {
    storage.setItem(getAdminOtpVerifiedKey(userId), "true");
  } catch {
    // Ignore storage errors in restricted browser contexts
  }
}

export function clearAdminOtpVerifiedInSession(
  userId: string,
  storage: Storage = sessionStorage
): void {
  try {
    storage.removeItem(getAdminOtpVerifiedKey(userId));
  } catch {
    // Ignore storage errors in restricted browser contexts
  }
}
