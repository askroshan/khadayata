/**
 * Local E2E / QA seed members (see docs/test-data.md).
 *
 * Seeded with first_name = "E2E" and *@khadayataonline.com emails so role
 * accounts can sign in for tests. They must stay in the DB for E2E/login,
 * but should not appear on public or member-facing rosters/directories.
 */
export const E2E_MEMBER_FIRST_NAME = "E2E";

export function isE2ETestMember(member: {
  first_name?: string | null;
}): boolean {
  return (member.first_name ?? "").trim().toUpperCase() === E2E_MEMBER_FIRST_NAME;
}
