#!/usr/bin/env node
/**
 * No-WSOD + visual check script.
 * Launches headless Chromium via Playwright, visits key routes on localhost,
 * asserts visible body text, zero console/page errors, and saves screenshots
 * to .tmp/ for visual inspection.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.VERIFY_BASE_URL || "http://127.0.0.1:8080";
const ROUTES = (process.env.VERIFY_ROUTES || "/,/matrimonial").split(",").map((r) => r.trim()).filter(Boolean);
const OUT_DIR = path.resolve(".tmp/nowsod");
fs.mkdirSync(OUT_DIR, { recursive: true });

let failed = false;
const browser = await chromium.launch();

try {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      errors.push(`pageerror: ${err.message}`);
    });

    const url = `${BASE_URL}${route}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    const bodyLen = await page.evaluate(() => document.body.innerText.trim().length);
    const slug = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    const shotPath = path.join(OUT_DIR, `${slug}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });

    const ok = bodyLen > 0 && errors.length === 0;
    console.log(`${ok ? "PASS" : "FAIL"} ${url} (bodyLen=${bodyLen}, errors=${errors.length}, screenshot=${shotPath})`);
    if (!ok) {
      failed = true;
      for (const e of errors) console.error("  ", e);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (failed) process.exit(1);
