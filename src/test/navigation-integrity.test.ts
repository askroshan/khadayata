import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Navigation integrity: every internal link target used in pages/components
 * must resolve to a route declared in App.tsx. Catches links that 404
 * (fall through to the catch-all NotFound route) because a page was renamed
 * or a route was removed.
 */

const PROJECT_ROOT = join(__dirname, "../..");
const APP_TSX = join(PROJECT_ROOT, "src/App.tsx");
const SCAN_DIRS = [
  join(PROJECT_ROOT, "src/pages"),
  join(PROJECT_ROOT, "src/components"),
];

// Route patterns from App.tsx (static + dynamic), as regex sources.
const ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/auth$/,
  /^\/onboarding$/,
  /^\/dashboard$/,
  /^\/reset-password$/,
  /^\/directory$/,
  /^\/member\/[^/]+$/,
  /^\/events$/,
  /^\/events\/manage$/,
  /^\/business$/,
  /^\/business\/manage$/,
  /^\/matrimonial$/,
  /^\/matrimonial\/manage$/,
  /^\/temple$/,
  /^\/search$/,
  /^\/admin$/,
  /^\/moderation$/,
  /^\/settings$/,
  /^\/news$/,
  /^\/news\/manage$/,
  /^\/news\/[^/]+$/,
  /^\/profile$/,
  /^\/mentorship$/,
  /^\/mentorship\/manage$/,
  /^\/scholarships$/,
  /^\/scholarships\/manage$/,
  /^\/services$/,
  /^\/oral-history$/,
  /^\/oral-history\/full$/,
  /^\/emergency$/,
  /^\/chapters$/,
  /^\/chapters\/[^/]+$/,
  /^\/elders-council$/,
  /^\/elders-council\/full$/,
  /^\/archives$/,
  /^\/archives\/full$/,
  /^\/accept-family-invite\/[^/]+$/,
  /^\/obituaries$/,
  /^\/contact$/,
  /^\/terms$/,
  /^\/privacy$/,
  /^\/accessibility$/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "ui") continue; // shadcn primitives have no links
      out.push(...walk(full));
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function extractStaticTargets(source: string): { target: string }[] {
  const targets: { target: string }[] = [];
  // to="/literal" and to={`/literal?${...}`} — capture the path portion only
  const staticRe = /to=\{?"(\/[^"?]*)/g;
  let m: RegExpExecArray | null;
  while ((m = staticRe.exec(source)) !== null) targets.push({ target: m[1] });
  return targets;
}

function extractTemplateTargets(source: string): { target: string }[] {
  const targets: { target: string }[] = [];
  // to={`/segment/${expr}`} — static prefix followed by one dynamic segment
  const templateRe = /to=\{`\/([^`]*)`\}/g;
  let m: RegExpExecArray | null;
  while ((m = templateRe.exec(source)) !== null) {
    const raw = m[1];
    // Skip pure-query templates like `?id=${x}` (handled by base routes)
    if (!raw.startsWith("?")) targets.push({ target: "/" + raw });
  }
  return targets;
}

function resolves(target: string): boolean {
  // Replace template expressions with a placeholder segment, then strip query/hash
  const cleaned = target
    .replace(/\$\{[^}]*\}/g, "_DYNAMIC_")
    .split(/[?#]/)[0];
  return ROUTE_PATTERNS.some((re) => re.test(cleaned));
}

describe("Navigation integrity (links resolve to declared routes)", () => {
  const files = SCAN_DIRS.flatMap(walk);

  it("scans a reasonable number of source files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("every internal link target matches a route in App.tsx", () => {
    const broken: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const targets = [
        ...extractStaticTargets(source),
        ...extractTemplateTargets(source),
      ];
      for (const { target } of targets) {
        if (!resolves(target)) {
          broken.push(`${file.replace(PROJECT_ROOT + "/", "")} -> "${target}"`);
        }
      }
    }
    expect(broken, `Broken link targets:\n${broken.join("\n")}`).toEqual([]);
  });

  it("does not link to the cookie policy until that route exists", () => {
    // Known-broken historical case: pages linked /cookie-policy with no route.
    // If the page is ever added, add its route to ROUTE_PATTERNS and remove this.
    const offenders = files.filter((f) =>
      readFileSync(f, "utf8").includes('"/cookie-policy"')
    );
    expect(offenders, "Links to non-existent /cookie-policy route").toEqual([]);
  });

  it("does not link to the removed /businesses/:id path", () => {
    const offenders = files.filter((f) =>
      readFileSync(f, "utf8").includes("/businesses/")
    );
    expect(offenders, "Links to non-existent /businesses/:id route").toEqual([]);
  });
});
