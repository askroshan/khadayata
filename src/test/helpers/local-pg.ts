/**
 * Real Postgres helper for khadayata_local (no mocks).
 * Connection: DATABASE_URL or postgresql://…@127.0.0.1:5438/khadayata_local
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      out[t.slice(0, i)] = t.slice(i + 1);
    }
    return out;
  } catch {
    return {};
  }
}

const fileEnv = loadEnvFile();

export function databaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    fileEnv.DATABASE_URL ||
    "postgresql://127.0.0.1:5438/khadayata_local"
  );
}

export async function withPg<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Simulate a Supabase JWT so auth.uid() / RLS policies apply under role authenticated. */
export async function asUser<T>(
  client: pg.Client,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await client.query(
      "SELECT set_config('request.jwt.claims', $1, true)",
      [JSON.stringify({ sub: userId, role: "authenticated" })],
    );
    const result = await fn();
    await client.query("ROLLBACK");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

export async function asAnon<T>(client: pg.Client, fn: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL ROLE anon");
    const result = await fn();
    await client.query("ROLLBACK");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

export async function findUserWithRole(
  client: pg.Client,
  roleName: string,
): Promise<{ userId: string; memberId: string } | null> {
  const { rows } = await client.query<{ user_id: string; member_id: string }>(
    `SELECT m.user_id, m.id AS member_id
     FROM members m
     JOIN role_assignments ra ON ra.member_id = m.id
       AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
     JOIN roles r ON r.id = ra.role_id
     WHERE r.name = $1
     LIMIT 1`,
    [roleName],
  );
  if (!rows[0]) return null;
  return { userId: rows[0].user_id, memberId: rows[0].member_id };
}

export async function findRegularMember(
  client: pg.Client,
): Promise<{ userId: string; memberId: string } | null> {
  const { rows } = await client.query<{ user_id: string; member_id: string }>(
    `SELECT m.user_id, m.id AS member_id
     FROM members m
     WHERE m.user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM role_assignments ra
         JOIN roles r ON r.id = ra.role_id
         WHERE ra.member_id = m.id
           AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
       )
     LIMIT 1`,
  );
  if (!rows[0]) return null;
  return { userId: rows[0].user_id, memberId: rows[0].member_id };
}
