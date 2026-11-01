#!/usr/bin/env bash
# Copy public schema (DDL + data) from khadayata_local (:5438) into the
# Supabase CLI Postgres container that Kong/PostgREST use.
#
# Why: Vite points at http://127.0.0.1:54331; without this, PostgREST has an
# empty public schema and forms (Chapters country dropdown, geography, etc.)
# return PGRST205 / empty lists even though :5438 is fully seeded.
#
# Prerequisites:
#   - DATABASE_URL / Postgres.app khadayata_local:5438
#   - `npx supabase start` (container supabase_db_khadayata-local)
#   - Prefer running ./scripts/sync-local-auth-hashes.sh first so auth.users
#     exist for FKs (members.user_id, etc.)
#
# Usage (from repo root):
#   ./scripts/sync-local-public-from-5438.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SRC_URL="${DATABASE_URL:-postgresql://roshanshah@127.0.0.1:5438/khadayata_local}"
CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_khadayata-local}"
TMP="$(mktemp -d /tmp/khadayata-public-sync.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Missing container $CONTAINER. Start the local stack first:"
  echo "  npx supabase@2.122.0 start"
  exit 1
fi

USERS="$(docker exec "$CONTAINER" psql -U postgres -d postgres -Atc "SELECT count(*) FROM auth.users;" || echo 0)"
if [[ "${USERS:-0}" -lt 1 ]]; then
  echo "auth.users is empty in the CLI DB. Run ./scripts/sync-local-auth-hashes.sh first."
  exit 1
fi

echo "Dumping public schema from $SRC_URL …"
pg_dump "$SRC_URL" \
  --format=custom --no-owner --no-acl \
  --schema=public \
  --file="$TMP/public.dump"

echo "Replacing public schema in $CONTAINER …"
docker cp "$TMP/public.dump" "$CONTAINER:/tmp/public.dump"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
SQL

docker exec "$CONTAINER" pg_restore -U postgres -d postgres --no-owner --no-acl --schema=public /tmp/public.dump \
  || echo "pg_restore reported errors (often leftover FK noise); verifying counts…"

docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

SELECT 'countries' AS t, count(*)::text AS n FROM countries
UNION ALL SELECT 'states', count(*)::text FROM states
UNION ALL SELECT 'cities', count(*)::text FROM cities
UNION ALL SELECT 'chapters', count(*)::text FROM chapters
UNION ALL SELECT 'members', count(*)::text FROM members
UNION ALL SELECT 'roles', count(*)::text FROM roles
ORDER BY 1;
SQL

echo "Done. Spot-check:"
echo "  curl -s 'http://127.0.0.1:54331/rest/v1/countries?select=name&limit=3' \\"
echo "    -H \"apikey: \$VITE_SUPABASE_ANON_KEY\" -H \"Authorization: Bearer \$VITE_SUPABASE_ANON_KEY\""
