#!/usr/bin/env node
/**
 * Opik Regression Guard Runner
 *
 * Runs typecheck, build, and core Vitest regression suites and logs a trace
 * with per-step spans to Opik (supports both Opik Cloud via OPIK_API_KEY and
 * self-hosted Opik via OPIK_URL_OVERRIDE=http://localhost:5173/api).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Opik } from "opik";

function loadDotenv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env optional
  }
}

loadDotenv();

const apiKey = process.env.OPIK_API_KEY;
const apiUrl = process.env.OPIK_URL_OVERRIDE;
const projectName = process.env.OPIK_PROJECT_NAME || "khadayataonline";

const client = new Opik({
  ...(apiKey ? { apiKey } : {}),
  ...(apiUrl ? { apiUrl } : {}),
  projectName,
});

const CHECKS = [
  { name: "typecheck", cmd: "npm run typecheck" },
  { name: "build", cmd: "npm run build" },
  {
    name: "vitest-regression-guards",
    cmd: "npx vitest run src/test/global-id-hardening.test.ts src/test/matrimonial-constants.test.tsx src/test/matrimonial-photo.test.tsx src/test/email-templates.test.ts src/test/navigation-integrity.test.ts src/test/role-tab-matrix.test.ts src/test/permissions-matrix.test.ts src/test/route-guards.test.ts",
  },
];

// Fix test filename if .ts
CHECKS[2].cmd = CHECKS[2].cmd.replace("matrimonial-constants.test.tsx", "matrimonial-constants.test.ts");

const trace = client.trace({
  name: "khadayata-regression-guard",
  input: {
    mode: apiUrl ? "self-hosted" : "cloud",
    apiUrl: apiUrl || "https://www.comet.com/opik/api",
    checks: CHECKS.map((c) => c.name),
  },
});

let allPassed = true;
const results = [];

for (const check of CHECKS) {
  const span = trace.span({
    name: check.name,
    type: "general",
    input: { command: check.cmd },
  });
  const started = Date.now();
  try {
    execSync(check.cmd, { stdio: "inherit" });
    const durationMs = Date.now() - started;
    span.update({ output: { status: "passed", durationMs } });
    results.push({ name: check.name, status: "passed", durationMs });
  } catch (err) {
    allPassed = false;
    const durationMs = Date.now() - started;
    span.update({
      output: { status: "failed", durationMs, error: err?.message || "Command failed" },
    });
    results.push({ name: check.name, status: "failed", durationMs });
  } finally {
    span.end();
  }
}

trace.update({
  output: {
    allPassed,
    passedCount: results.filter((r) => r.status === "passed").length,
    totalCount: results.length,
    results,
  },
});
trace.end();

await client.flush();
console.log(`\n[opik-regression-guard] Flushed trace to Opik (${apiUrl ? `self-hosted: ${apiUrl}` : "cloud"}, project: ${projectName})`);

if (!allPassed) {
  process.exit(1);
}
