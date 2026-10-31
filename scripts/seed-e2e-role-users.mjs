#!/usr/bin/env node
/**
 * Seed dedicated E2E role accounts on hosted Supabase Auth + public schema,
 * and mirror password hashes / members / roles into local khadayata_local.
 *
 * Password for all: TestPass123!
 * Emails: * @khadayataonline.com (documented test accounts)
 *
 * Usage: node scripts/seed-e2e-role-users.mjs
 * Requires .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const PASSWORD = "TestPass123!";
const CHAPTER_ID = "f1000002-0000-0000-0000-000000000002"; // Ahmedabad

const ACCOUNTS = [
  { email: "global-admin@khadayataonline.com", role: "Global Admin", first: "E2E", last: "GlobalAdmin", level: 3, onboarded: true },
  { email: "chapter-admin@khadayataonline.com", role: "Chapter Admin", first: "E2E", last: "ChapterAdmin", level: 2, onboarded: true, chapterScoped: true },
  { email: "data-steward@khadayataonline.com", role: "Data Steward", first: "E2E", last: "DataSteward", level: 2, onboarded: true },
  { email: "dir-manager@khadayataonline.com", role: "Directory Manager", first: "E2E", last: "DirManager", level: 2, onboarded: true },
  { email: "event-manager@khadayataonline.com", role: "Event Manager", first: "E2E", last: "EventManager", level: 2, onboarded: true },
  { email: "finance-admin@khadayataonline.com", role: "Finance Admin", first: "E2E", last: "FinanceAdmin", level: 2, onboarded: true },
  { email: "publisher@khadayataonline.com", role: "Global Publisher", first: "E2E", last: "Publisher", level: 2, onboarded: true },
  { email: "moderator@khadayataonline.com", role: "Moderator", first: "E2E", last: "Moderator", level: 2, onboarded: true },
  { email: "member@khadayataonline.com", role: null, first: "E2E", last: "Member", level: 1, onboarded: true },
  { email: "unverified@khadayataonline.com", role: null, first: "E2E", last: "Unverified", level: 0, onboarded: false },
];

function loadEnv() {
  const out = {};
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

async function findUserIdByEmail(url, key, email) {
  // Hosted GoTrue listUsers pagination errors; filter= works.
  const res = await fetch(
    `${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    },
  );
  if (!res.ok) return null;
  const body = await res.json();
  const users = body.users ?? [];
  const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return hit?.id ?? null;
}

async function ensureAuthUser(admin, url, key, email) {
  let userId = await findUserIdByEmail(url, key, email);
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`update ${email}: ${error.message}`);
    return userId;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { e2e_seed: true },
  });
  if (error) {
    // Race / filter miss: try lookup again
    userId = await findUserIdByEmail(url, key, email);
    if (userId) {
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
      return userId;
    }
    throw new Error(`create ${email}: ${error.message}`);
  }
  return data.user.id;
}

async function ensureMemberAndRole(admin, account, userId) {
  const { data: existing } = await admin
    .from("members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let memberId = existing?.id;
  // Do not change verification_level via PostgREST: the privileged-column trigger
  // fires even for service_role when auth.uid() is null. Set level only on INSERT.
  const base = {
    user_id: userId,
    first_name: account.first,
    last_name: account.last,
    chapter_id: CHAPTER_ID,
    onboarding_completed: account.onboarded,
    gender: "Other",
    privacy: {},
  };

  if (memberId) {
    const { error } = await admin.from("members").update(base).eq("id", memberId);
    if (error) throw new Error(`member update ${account.email}: ${error.message}`);
  } else {
    const { data, error } = await admin
      .from("members")
      .insert({ ...base, verification_level: account.level })
      .select("id")
      .single();
    if (error) throw new Error(`member insert ${account.email}: ${error.message}`);
    memberId = data.id;
  }

  if (!account.role) return { userId, memberId };

  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("name", account.role)
    .limit(1)
    .maybeSingle();
  if (roleErr || !role) throw new Error(`role missing ${account.role}: ${roleErr?.message}`);

  // End any prior active assignment of this role for this member, then insert
  await admin
    .from("role_assignments")
    .update({ end_date: new Date().toISOString().slice(0, 10) })
    .eq("member_id", memberId)
    .eq("role_id", role.id)
    .is("end_date", null);

  const assignment = {
    member_id: memberId,
    role_id: role.id,
    chapter_id: account.chapterScoped ? CHAPTER_ID : null,
    start_date: new Date().toISOString().slice(0, 10),
  };
  const { error: raErr } = await admin.from("role_assignments").insert(assignment);
  if (raErr) throw new Error(`role_assignment ${account.email}: ${raErr.message}`);

  return { userId, memberId };
}

async function mirrorLocal(env, seeded) {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    for (const row of seeded) {
      const hashRes = await client.query(`SELECT crypt($1, gen_salt('bf')) AS h`, [PASSWORD]);
      const hash = hashRes.rows[0].h;

      await client.query(
        `INSERT INTO auth.users (
           id, instance_id, aud, role, email, encrypted_password,
           email_confirmed_at, created_at, updated_at,
           raw_app_meta_data, raw_user_meta_data, is_super_admin,
           confirmation_token, recovery_token, email_change_token_new, email_change
         ) VALUES (
           $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           $2, $3, now(), now(), now(),
           '{"provider":"email","providers":["email"]}'::jsonb, '{"e2e_seed":true}'::jsonb,
           false, '', '', '', ''
         )
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           encrypted_password = EXCLUDED.encrypted_password,
           email_confirmed_at = now(),
           updated_at = now()`,
        [row.userId, row.email, hash],
      );

      await client.query(
        `INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
         VALUES (
           gen_random_uuid(),
           $1::uuid,
           jsonb_build_object('sub', $1::text, 'email', $2::text),
           'email',
           $2,
           now(), now(), now()
         )
         ON CONFLICT (provider, provider_id) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [row.userId, row.email],
      );

      await client.query(
        `INSERT INTO members (
           id, user_id, first_name, last_name, gender, chapter_id,
           onboarding_completed, verification_level, privacy
         ) VALUES (
           coalesce($5::uuid, gen_random_uuid()),
           $1::uuid, $2, $3, 'Other', $4::uuid, $6, $7, '{}'::jsonb
         )
         ON CONFLICT (user_id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           chapter_id = EXCLUDED.chapter_id,
           onboarding_completed = EXCLUDED.onboarding_completed,
           updated_at = now()`,
        [
          row.userId,
          row.first,
          row.last,
          CHAPTER_ID,
          row.memberId ?? null,
          row.onboarded,
          row.level,
        ],
      );

      if (row.role) {
        const roleRes = await client.query(
          `SELECT id FROM roles WHERE name = $1 ORDER BY scope NULLS LAST LIMIT 1`,
          [row.role],
        );
        const roleId = roleRes.rows[0]?.id;
        if (!roleId) continue;
        const memRes = await client.query(`SELECT id FROM members WHERE user_id = $1`, [row.userId]);
        const memberId = memRes.rows[0].id;
        await client.query(
          `UPDATE role_assignments SET end_date = CURRENT_DATE
           WHERE member_id = $1 AND role_id = $2 AND end_date IS NULL`,
          [memberId, roleId],
        );
        await client.query(
          `INSERT INTO role_assignments (member_id, role_id, chapter_id, start_date)
           VALUES ($1, $2, $3, CURRENT_DATE)`,
          [memberId, roleId, row.chapterScoped ? CHAPTER_ID : null],
        );
      }
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or service role key");
  if (!env.DATABASE_URL) throw new Error("Missing DATABASE_URL for local mirror");

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const seeded = [];
  for (const account of ACCOUNTS) {
    const userId = await ensureAuthUser(admin, url, key, account.email);
    const { memberId } = await ensureMemberAndRole(admin, account, userId);
    seeded.push({ ...account, userId, memberId });
    console.log(`OK ${account.email} → ${account.role ?? "(member)"} (${userId})`);
  }

  // Verify password works via anon client
  const anon = createClient(url, env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const probe = await anon.auth.signInWithPassword({
    email: "global-admin@khadayataonline.com",
    password: PASSWORD,
  });
  if (probe.error) throw new Error(`login probe failed: ${probe.error.message}`);
  await anon.auth.signOut();
  console.log("Login probe OK for global-admin@khadayataonline.com");

  await mirrorLocal(env, seeded);
  console.log(`Mirrored ${seeded.length} accounts into local Postgres`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
