# Local Supabase Auth (self-hosted)

Use the **CLI stack on localhost** for Auth/API — not hosted Supabase Auth.

| Concern | Where |
|--------|--------|
| App Auth + PostgREST gateway | Kong `http://127.0.0.1:54331` |
| Password hashes source of truth (SQL) | `khadayata_local` on Postgres.app **`:5438`** (`DATABASE_URL`) |
| GoTrue’s working `auth.users` copy | CLI Postgres container `supabase_db_khadayata-local` |
| Studio | `http://127.0.0.1:54335` |
| Mailpit (local SMTP UI) | `http://127.0.0.1:54336` |

Vite reads untracked `.env`:

```bash
DATABASE_URL=postgresql://roshanshah@127.0.0.1:5438/khadayata_local
VITE_SUPABASE_URL=http://127.0.0.1:54331
VITE_SUPABASE_ANON_KEY=<anon from `npx supabase status -o env`>
SUPABASE_SERVICE_ROLE_KEY=<service_role from status>
```

After `supabase start`, copy keys from `npx supabase@2.122.0 status -o env` (`ANON_KEY`, `SERVICE_ROLE_KEY`). Local demo JWTs match the stock CLI secrets unless you rotated them.

## Start the stack

Ports in `supabase/config.toml` (`project_id = "khadayata-local"`):

- API/Kong: **54331** (avoids `world-immigration` on 54321)
- Studio: **54335**
- Mailpit: **54336**
- Analytics: **54337**
- `[db] port` is set to **54332**, but the CLI often still publishes the DB container on host **5432**

### Before start — free conflicts

1. Stop any other compose stack bound to host **5432** (e.g. `mobileapptesters`), or Kong/Auth cannot finish DB init.
2. Do **not** use host `127.0.0.1:5432` for this project’s app data — Homebrew Postgres may also listen there. App SQL stays on **`:5438`**. Inspect the CLI DB with:

```bash
docker exec -it supabase_db_khadayata-local psql -U postgres -d postgres
```

3. Inbucket/Mailpit on **54324** is often taken; this repo uses **54336**.

```bash
cd ~/Projects/khadayata
npx supabase@2.122.0 start
npx supabase@2.122.0 status -o env   # copy ANON_KEY / SERVICE_ROLE_KEY / API_URL into .env
```

`[db.migrations] enabled = false` and seed disabled so start does not replay project migrations that assume a different Auth/DB layout. Schema for SQL work remains on `khadayata_local` via `local-install/` (see `local-install/README.md`).

### Sync password hashes into GoTrue

GoTrue does **not** read Postgres.app `:5438` directly. After start (or whenever hashes change on `:5438`):

```bash
./scripts/sync-local-auth-hashes.sh
```

This copies `auth.users.encrypted_password` from `khadayata_local` into the CLI Auth DB and creates `email` identities.

### Verify login against local hashes

```bash
# hashes in GoTrue container must match :5438
docker exec supabase_db_khadayata-local psql -U postgres -d postgres -Atc \
  "SELECT left(encrypted_password,20) FROM auth.users WHERE email='global-admin@khadayataonline.com'"

psql "$DATABASE_URL" -Atc \
  "SELECT left(encrypted_password,20) FROM auth.users WHERE email='global-admin@khadayataonline.com'"

# password grant via local Kong
curl -s 'http://127.0.0.1:54331/auth/v1/token?grant_type=password' \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H 'Content-Type: application/json' \
  -d '{"email":"global-admin@khadayataonline.com","password":"TestPass123!"}'
```

Documented role passwords: `TestPass123!` (see `docs/test-data.md`).

### Stop

```bash
npx supabase@2.122.0 stop
```

## Notes

- Browser/`npm run dev` Auth must hit **54331**, not `*.supabase.co`.
- Direct SQL, `local-pg` tests, and dumps keep using **`DATABASE_URL` → `:5438`**.
- CLI PostgREST serves the container DB (migrations off → empty `public` until you load schema there). Prefer `:5438` for data/RLS SQL; use Kong for Auth verification and edge/gateway work against the local stack.
