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
