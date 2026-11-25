---
name: khadayata-delivery-guardrails
description: Non-negotiable product, engineering, testing, and continuous-learning checklist for KhadayataOnline. Use on every feature, bug fix, or refactor in this repository.
---

# KhadayataOnline Delivery Guardrails

## Before Writing Code
1. Read the governing spec (`USER_STORIES.md`, `POV_*.md`, or `todo-*.md`) and `docs/learnings.md`.
2. Identify every UI gate and its matching **server-side** RLS policy, `BEFORE` trigger, or `SECURITY DEFINER` check.
3. Write a failing Vitest test (red) reproducing the bug or asserting the acceptance criteria.

## Implementation Rules
- **No fake/test data in production migrations.**
- **Supabase functions**: always destructure `{ data, error }` from `supabase.functions.invoke(...)`.
- **Photos/media**: reuse `AvatarUpload` and render `photo_url` with initials fallback.
- **No emojis** in UI copy or agent responses.

## Before Finishing (Non-Negotiable)
1. Run `npm run typecheck`.
2. Run `npm run build`.
3. Run `npx vitest run` (and targeted suites for live DB / edge runtime).
4. Add or update Playwright E2E specs in `e2e/` for any new or modified user flow and run `npx playwright test <spec>`.
5. Append any new root cause, gotcha, or user correction to `docs/learnings.md`.
