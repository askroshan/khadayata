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
