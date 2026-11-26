# Engineering & Product Learnings

Living log of root causes, guardrails, and regression tests. Every bug fix,
user correction, or operational gotcha must append an entry here (see
`AGENTS.md` Section 9).

## 2026-11-25 — Edge runtime 503 on local Supabase
- **Symptom**: `generate-global-id` returned HTTP `503` in both Vitest behavioral tests and Playwright E2E.
- **Root cause**: Docker container `supabase_edge_runtime_khadayata-local` was exited; Kong stayed up and returned `503`.
- **Guardrail**: Check `docker ps --filter "name=edge_runtime"` before diagnosing edge function `503`s locally.
- **Regression test**: `src/test/global-id-behavioral.test.ts`, `e2e/global-id.spec.ts`.

## 2026-11-25 — `supabase.functions.invoke` does not throw on non-2xx
- **Symptom**: `Onboarding.tsx` wrapped `supabase.functions.invoke("generate-global-id")` in `try/catch` without inspecting `{ error }`, silently swallowing failures.
- **Root cause**: `@supabase/supabase-js` returns `{ data, error }` rather than rejecting the promise on HTTP error responses.
- **Guardrail**: Always destructure `{ data, error }` from `supabase.functions.invoke(...)` and handle `error` explicitly.
- **Regression test**: `src/test/global-id-behavioral.test.ts`.

## 2026-11-25 — Matrimonial photo upload & card rendering
- **Symptom**: `ProfileForm` had no photo upload control, and signed-in `ProfileCard` / `ProfileDetailDialog` rendered initials only, ignoring `member.photo_url`.
- **Root cause**: `AvatarUpload` was only wired on `/profile` and not reused in matrimonial components.
- **Guardrail**: Reuse `AvatarUpload` for member photo uploads and always render `member.photo_url` with an initials fallback on member/matrimonial cards and dialogs.
- **Regression test**: `src/test/matrimonial-photo.test.tsx`, `e2e/matrimonial.spec.ts`.

## 2026-11-25 — VPS Migration, Dockerfile Key Alignment & Global Admin Email OTP

1. **WSOD on VPS due to missing `VITE_SUPABASE_ANON_KEY` in `Dockerfile`**
   - **Root cause:** `src/integrations/supabase/client.ts` reads `import.meta.env.VITE_SUPABASE_ANON_KEY`, while `Dockerfile` only exposed `VITE_SUPABASE_PUBLISHABLE_KEY`. `createClient(url, undefined)` threw at module load.
   - **Guardrail:** `Dockerfile` now sets `VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY` so builds using the GitHub Actions secret always populate both variables.
2. **Self-hosted Supabase loopback-only port binding on VPS**
   - **Root cause:** Putting `127.0.0.1:11903` into `POSTGRES_PORT` in `.env` broke `supabase-db`'s internal healthcheck because `POSTGRES_PORT` is also consumed as a plain integer port inside the container.
   - **Guardrail:** Keep `POSTGRES_PORT=11903` and `POOLER_PROXY_PORT_TRANSACTION=11905` as plain integers in `.env`, and bind `127.0.0.1:` in `docker-compose.yml` `ports:` entries. Verify with `ss -tlnp | grep 1190`.
3. **Global Admin Email OTP 2FA & 100% TDD Coverage**
   - **Guardrail:** Every Global Admin sign-in now triggers `supabase/functions/admin-login-otp` (`action: "send"`), storing a SHA-256 hashed 6-digit OTP in `public.admin_login_otps` (10-minute TTL, max 5 attempts, RLS denies all direct client access) and requiring verification before unlocking the app.
   - **Regression tests:** `src/test/admin-otp.test.ts` (100% statement/branch/function/line coverage on `src/lib/admin-otp.ts`) and `src/test/email-templates.test.ts` (`admin_login_otp` template).

## 2026-11-25 — Duplicate import WSOD & headless Chromium no-WSOD gate
- **Root cause**: Adding `import { Link } from "react-router-dom"` at the top of `src/pages/Matrimonial.tsx` when it was already imported at line 19 caused `SyntaxError: Identifier 'Link' has already been declared` at runtime in the browser (WSOD on `/`). Checking `curl` against Vite was not sufficient because Vite serves HTML before module execution.
- **Guardrail**: Before signing off on any frontend change, run a headless Chromium check (via Playwright) against `http://127.0.0.1:8080/` and modified routes asserting `document.body.innerText.trim().length > 0` and zero `console.error` / `pageerror` events. Always check existing imports before adding a new import line.
- **Verification**: Recorded in `AGENTS.md` Section 9 (No-WSOD live render check).

## 2026-11-25 — Ontology, Single Source of Truth & Khadayata One ID De-duplication
- **Rule**: Never deduplicate members by `(first_name, last_name, dob)` alone, because two real Khadayata community members can have the exact same name and date of birth.
- **Canonical Identity**: Uniqueness is governed by `members.user_id` and the permanent **Khadayata One ID** (`members.global_id`, format `KHD-<CC><ST><CITY>-<YY>-<SEQ>-<CHK>`), enforced as `UNIQUE` and immutable for life via `trg_prevent_global_id_change` even across chapter transfers.
- **Single Source of Truth**: Shared member attributes (such as `members.social_links` JSONB for LinkedIn, Instagram, Facebook, X, Website) live once on `public.members` and are referenced by downstream modules (Directory, Matrimonial, etc.) without duplication.
- **Canonical Ontology**: All categorical fields (`gender`, `diet`, `marital_status`, `education_level`, `country`, `chapters`) must use canonical Title Case / master-table values (no mixed-case or snake_case variants).
- **Persisted in**: `AGENTS.md` Section 3.2 and migrations `20261125134500_protect_global_id_immutable.sql`, `20261125135500_add_member_social_links.sql`, `20261125140500_normalize_ontology_values.sql`.

### 2026-11-26 — Matrimonial Shortlists, Member Email Threads, and Monthly PDF Ad Pages
- **Root cause / need**: Members needed to bookmark/shortlist matrimonial profiles, inspect email communication threads sent to other members, and admins needed to manage A4 ad PDFs appended to automated monthly matrimonial PDFs (NRI Boys/Girls, India Boys/Girls) without exposing candidate emails.
- **Guardrail**: Keep candidate emails strictly excluded from `scripts/generate_monthly_matrimonial_pdfs.py`, enforce RLS on `matrimonial_shortlists`, `member_email_messages`, and `matrimonial_ad_pdfs`, and keep `role-tab-matrix.test.ts` updated whenever an admin tab is added.
- **Regression tests**: `src/test/matrimonial-shortlist-messages-ads.test.ts`, `src/test/role-tab-matrix.test.ts`.

### 2026-11-26 — Acumbamail Primary Transactional Email with EmailIT Fallback & Pre-Send Bounce-Risk Gate
- **Root cause / need**: EmailIT delivery was unreliable/unavailable for KhadayataOnline, while Acumbamail (verified via Acumbamail MCP with 20,000 SMTP credits) is available for responsive transactional HTML emails, and every recipient must pass high-confidence bounce-risk verification before any email is sent.
- **Guardrail**: Both `supabase/functions/send-email/index.ts` and `supabase/functions/admin-login-otp/index.ts` route through the Deno-free shared module `supabase/functions/send-email/provider.ts`, which first verifies each recipient via EmailIT `/v2/email-verifications` (failing closed unless `result === "safe"`, `risk === "low"`, `score >= 80`, and `is_disposable !== true`), then sends responsive HTML via Acumbamail (`https://acumbamail.com/api/1/sendOne/` with `ACUMBAMAIL_AUTH_TOKEN`, `response_type=json`, form-urlencoded) with automatic fallback to EmailIT (`EMAILIT_API_KEY`).
- **Regression tests**: `src/test/email-provider.test.ts`, `src/test/email-templates.test.ts`, `src/test/admin-otp.test.ts`.

### 2026-11-26 — Production Supabase is Self-Hosted on VPS (Never Use supabase.com Login)
- **Root cause / correction**: `supabase/config.toml` still contains a legacy `project_id` (`zwiewldqgfqapwuqtsqb`), which led to suggesting `supabase login` / `supabase functions deploy` against Supabase Cloud. Production Supabase is **self-hosted on the VPS**.
- **Guardrail**: Never tell the user to run `supabase login` or deploy to `supabase.com`. For production edge function changes, `deploy.yml` syncs `supabase/functions/` to `/opt/khadayataonline/app/supabase/functions/`; secrets (like `ACUMBAMAIL_AUTH_TOKEN`) belong in the VPS self-hosted Supabase `.env` and are picked up by restarting the self-hosted `edge-functions` container.

### 2026-11-26 — Admin OTP Failure RCA (Deploy Heredoc + Self-Hosted Functions Sync + OTP Verification Bypass)
- **Root causes**:
  1. `.github/workflows/deploy.yml` used a single-quoted heredoc (`<<'EOF'`) without forwarding environment variables to the remote SSH shell, causing `VITE_SUPABASE_URL: unbound variable` on every deploy so production was never updated.
  2. `deploy.yml` did not sync `supabase/functions/` or `ACUMBAMAIL_AUTH_TOKEN` into the self-hosted Supabase `functions` container on the VPS, leaving production `admin-login-otp` on the old EmailIT-only code.
  3. `admin-login-otp` inherited `requireVerification: true`, which would fail closed and lock out Global Admins if EmailIT's verification API is down.
- **Guardrail**: Forward env vars safely into SSH in `deploy.yml`, auto-sync `supabase/functions/` and `ACUMBAMAIL_AUTH_TOKEN` into the self-hosted Supabase `functions` container, and keep `requireVerification: false` on `admin-login-otp` so Global Admin 2FA OTPs always send via Acumbamail directly.
