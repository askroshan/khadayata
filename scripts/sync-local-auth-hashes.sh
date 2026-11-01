#!/usr/bin/env bash
# Copy password hashes from khadayata_local (Postgres.app :5438) into the
# local Supabase CLI Auth DB (GoTrue), then ensure email identities exist.
#
# Prerequisites:
#   - Postgres.app DB: postgresql://…@127.0.0.1:5438/khadayata_local
#   - `npx supabase start` for project_id khadayata-local (Kong :54331)
#
# Usage (from repo root):
#   ./scripts/sync-local-auth-hashes.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SRC_URL="${DATABASE_URL:-postgresql://roshanshah@127.0.0.1:5438/khadayata_local}"
CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_khadayata-local}"
TMP="$(mktemp -d /tmp/khadayata-auth-sync.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Missing container $CONTAINER. Start the local stack first:"
  echo "  npx supabase@2.122.0 start"
  exit 1
fi

echo "Exporting auth.users hashes from $SRC_URL …"
psql "$SRC_URL" -v ON_ERROR_STOP=1 -c "COPY (
  SELECT id,
         COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
         COALESCE(aud, 'authenticated'),
         COALESCE(role, 'authenticated'),
         email,
         encrypted_password,
         COALESCE(email_confirmed_at, now()),
         invited_at,
         COALESCE(confirmation_token, ''),
         confirmation_sent_at,
         COALESCE(recovery_token, ''),
         recovery_sent_at,
         COALESCE(email_change_token_new, ''),
         COALESCE(email_change, ''),
         email_change_sent_at,
         last_sign_in_at,
         COALESCE(raw_app_meta_data, '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb),
         COALESCE(raw_user_meta_data, '{}'::jsonb),
         COALESCE(is_super_admin, false),
         COALESCE(created_at, now()),
         COALESCE(updated_at, now()),
         NULLIF(phone, ''),
         phone_confirmed_at,
         COALESCE(phone_change, ''),
         COALESCE(phone_change_token, ''),
         phone_change_sent_at,
         COALESCE(email_change_token_current, ''),
         COALESCE(email_change_confirm_status, 0)::smallint,
         banned_until,
         COALESCE(reauthentication_token, ''),
         reauthentication_sent_at,
         COALESCE(is_sso_user, false),
         deleted_at,
         COALESCE(is_anonymous, false)
  FROM auth.users
  WHERE encrypted_password IS NOT NULL AND encrypted_password <> ''
) TO STDOUT WITH (FORMAT csv)" >"$TMP/users.csv"

COUNT="$(wc -l <"$TMP/users.csv" | tr -d ' ')"
echo "Imported candidate rows: $COUNT"

docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "TRUNCATE auth.identities, auth.sessions, auth.refresh_tokens, auth.users CASCADE;"

docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "COPY auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, invited_at,
  confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
  email_change_token_new, email_change, email_change_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
  email_change_token_current, email_change_confirm_status, banned_until,
  reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
) FROM STDIN WITH (FORMAT csv)" <"$TMP/users.csv"

docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);
SELECT count(*) AS auth_users FROM auth.users;
SELECT count(*) AS email_identities FROM auth.identities WHERE provider = 'email';
SQL

echo "Done. Verify with:"
echo "  curl -s http://127.0.0.1:54331/auth/v1/token?grant_type=password \\"
echo "    -H \"apikey: \$VITE_SUPABASE_ANON_KEY\" -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"global-admin@khadayataonline.com\",\"password\":\"TestPass123!\"}'"
