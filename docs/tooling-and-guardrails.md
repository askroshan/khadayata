# Tooling, Guardrails, HarnessRouter & Opik

This document describes the engineering guardrails, continuous learning workflow, cross-agent memory (HarnessRouter), and regression tracing (Opik) configured for KhadayataOnline.

## 1. Non-Negotiable Engineering Guardrails

Defined in `AGENTS.md` (Section 9) and `.gemini/skills/khadayata-delivery-guardrails/SKILL.md`:

- **Continuous learning log (`docs/learnings.md`)**: Every bug fix, user correction, or operational gotcha must append an entry with root cause, guardrail, and regression test path.
- **Definition of done**:
  1. `npm run typecheck` (`tsc --noEmit`)
  2. `npm run build`
  3. `npx vitest run`
  4. Relevant Playwright E2E spec in `e2e/` for UI changes
- **CI gate**: `.github/workflows/ci.yml` runs typecheck, build, and core static/unit Vitest suites on every push to `main` and every pull request.

## 2. HarnessRouter (Cross-Agent Persistent Memory)

`docker-compose.harnessrouter.yml` runs HarnessRouter locally on loopback (`http://127.0.0.1:3000`) with a persistent Docker volume (`harnessrouter:/data`) so Harness Memory, workspaces, and installed harness CLIs persist across restarts and across external agent harnesses.

### Start / Stop
```bash
# Start (override HR_AUTH_PASSWORD in .env or shell)
HR_AUTH_PASSWORD='your-strong-password' docker compose -f docker-compose.harnessrouter.yml up -d

# Follow first-boot logs until ready
docker logs -f harnessrouter

# Stop
docker compose -f docker-compose.harnessrouter.yml down
```

## 3. Opik Regression Guards (Cloud & Self-Hosted)

`scripts/opik-regression-guard.mjs` (`npm run test:regression:opik`) runs `typecheck`, `build`, and the 8 core Vitest regression suites, logging a trace and per-check spans to Opik and exiting non-zero on failure.

### Configuration (`.env`, gitignored)
```env
OPIK_API_KEY=<your-opik-api-key>
OPIK_PROJECT_NAME=khadayataonline
# Uncomment for self-hosted Docker Opik:
# OPIK_URL_OVERRIDE=http://localhost:5173/api
```

### Run Regression Guards
```bash
# Against Opik Cloud (default when OPIK_URL_OVERRIDE is unset)
npm run test:regression:opik

# Against self-hosted Docker Opik
git clone https://github.com/comet-ml/opik.git && cd opik && ./opik.sh
OPIK_URL_OVERRIDE=http://localhost:5173/api npm run test:regression:opik
```
