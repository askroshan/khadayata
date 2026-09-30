---
name: khadayata-guardrails
description: Build guardrails for the Khadayata Online membership platform — responsive design, WCAG 2.2 AA compliance, BFF architecture with Supabase, Postgres RLS, role-gated admin, and edge function conventions. Use whenever building or modifying any feature, page, API, or database object in this project, even if the user doesn't mention guardrails directly.
---

# Khadayata Online — Build Guardrails

These guardrails apply to every change in the Khadayata Online platform. They exist because the platform holds member data across 28 countries with 10 role types, and a visual or access-control miss has real-world consequences for community trust.

## Architecture

- **Frontend**: React + TypeScript + Vite. shadcn/ui components live in `src/components/ui/`. Tailwind tokens only — no raw hex in page-level code.
- **Backend-for-Frontend (BFF)**: The browser talks to Supabase (Postgres + Auth + Edge Functions + Storage) directly via the anon-key client. There is no separate API server. Edge functions handle privileged operations (email, SMS, user deletion, invites) and external API proxying.
- **Database**: Supabase Postgres. Schema changes only through `mcp__supabase__apply_migration`. Every table has RLS enabled with 4 separate policies (SELECT/INSERT/UPDATE/DELETE), never `FOR ALL`.
- **Auth**: Supabase email/password only. Email confirmation stays OFF. Do not add social providers or magic links unless explicitly asked.
- **Role model**: 10 roles (Global Admin, Chapter Admin, Data Steward, Directory Manager, Event Manager, Finance Admin, Global Publisher, Publisher, Moderator, regular member). Role checks via `has_role(uuid, text)` in the database and `useRoles`/`usePermissions`/`canAccessTab` in the frontend. Every UI gate must have a matching server-side enforcement.

## Responsive design

- Mobile-first: every page must be usable on a 375px viewport.
- Use Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`), not inline media-query hacks.
- Test layouts at 375px, 768px, 1024px, and 1280px widths.
- Navigation: collapse to a hamburger/sheet on mobile. Never let nav links overflow horizontally.
- Grids: use `auto-fill` with `minmax()` so cards reflow naturally. Set `grid-template-columns: 1fr` on mobile and multi-column at `md:`.
- Touch targets: minimum 44x44px for any interactive element per WCAG 2.2 AA.
- Images: always set `width`/`height` or `aspect-ratio` to prevent layout shift. Use WebP for generated images.

## WCAG 2.2 AA compliance

- **Color contrast**: text must have 4.5:1 contrast against its background (3:1 for large text and UI components). Check during all transition states — a button that darkens on hover must still meet contrast in both states.
- **Focus visibility**: every interactive element must have a visible focus indicator. Never use `outline: none` without a replacement. Tailwind's `focus-visible:ring` pattern is the default.
- **Keyboard navigation**: all functionality available via keyboard. Tab order follows visual order. No keyboard traps.
- **Semantic HTML**: use `<nav>`, `<main>`, `<section>`, `<article>`, `<button>`, `<a>` appropriately. Avoid `<div onClick>` for interactive elements.
- **Alt text**: every meaningful image has descriptive alt text. Decorative images use `alt=""`.
- **Form labels**: every input has an associated `<label>` or `aria-label`. Error messages use `aria-describedby` and `role="alert"`.
- **Motion and animation**: respect `prefers-reduced-motion`. Animations should be subtle and enhance, not distract. No auto-playing video or audio.
- **Skip link**: every page with a nav should have a "Skip to main content" link as the first focusable element.
- **Language**: set `lang` attribute on `<html>`. Page language matches content language.
- **Heading hierarchy**: no skipping levels (h1 to h2 to h3, never h1 to h3).

## Database and RLS

- Every new table: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + 4 policies scoped to `authenticated` (or `anon, authenticated` for genuinely public data).
- Chapter-scoped roles: policies must include the chapter predicate at the database layer, not rely on UI filtering.
- Privilege columns (verification, suspended, blocked, roles) protected by BEFORE triggers — add new privilege columns to the guard trigger in the same migration.
- `SECURITY DEFINER` functions: set `search_path`, include internal authorization check, `REVOKE EXECUTE FROM PUBLIC` and `FROM anon`.
- Never `DROP` columns, change column types destructively, or rename tables — those lose user data.
- Column-level grants: when a table is publicly readable (anon) but has sensitive columns (email, phone), revoke table-wide SELECT from anon and grant only safe columns. RLS controls rows, not columns.

## Edge functions

- Every function in `supabase/functions/<slug>/index.ts` with a `[functions.<slug>]` table in `supabase/config.toml` setting `verify_jwt`.
- CORS headers on every response including OPTIONS and errors.
- Functions holding service-role power must validate the caller's JWT/role server-side before acting.
- Email templates in `send-email/templates.ts` must stay Deno-free for Vitest. Use `{ raw: ... }` segments for trusted markup, never interpolated variables.

## Testing

- Vitest in `src/test/`. Red-green TDD for bug fixes and new features.
- `navigation-integrity.test.ts` and `rls-invariants.test.ts` must stay green — update them in the same change when adding routes or changing invariants.
- `npm run build` + `npx vitest run` must pass before finishing any work.

## Frontend conventions

- `PublicLayout` for public pages, `AppLayout`/`ChapterLayout` for signed-in pages.
- Every page sets `SEOMeta`.
- Routes: public listing and role-gated management are separate paths (e.g. `/events` vs `/events/manage`).
- No emojis in UI copy or agent responses.
- Animations and micro-interactions: tasteful hover states, smooth transitions, scroll-reveal where appropriate. Use CSS transitions and `IntersectionObserver` — no heavy animation libraries.
