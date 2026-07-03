// Smoke test of the core planning loop against a running preview server.
//
//   npm run build && npm run preview   (in one terminal)
//   npm run e2e                        (in another)
//
// Uses playwright-core with, in order: $CHROME_PATH, a cached ms-playwright
// Chromium, or the system Edge/Chrome channel.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const URL = process.env.APP_URL ?? "http://localhost:4173/";

function findExecutable() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH };
  const cache = join(
    process.env.LOCALAPPDATA ?? "",
    "ms-playwright",
  );
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      if (!dir.startsWith("chromium-")) continue;
      for (const sub of ["chrome-win64", "chrome-win"]) {
        const exe = join(cache, dir, sub, "chrome.exe");
        if (existsSync(exe)) return { executablePath: exe };
      }
    }
  }
  return { channel: "msedge" };
}

const failures = [];
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL  ${name}: ${e.message?.split("\n")[0]}`);
  }
};

const browser = await chromium.launch(findExecutable());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// Fresh profile each run — no leftover plans. The immediate reload can abort
// the first page's in-flight catalog fetches, so errors before this point
// don't count.
await page.goto(URL);
await page.evaluate(() => localStorage.removeItem("degree-map"));
await page.reload();
consoleErrors.length = 0;

await step("catalog index loads", async () => {
  await page.waitForSelector('input[placeholder*="7,269"]', { timeout: 15000 });
});

await step("search finds CPSC 110 and adds it to Year 1 Winter 1", async () => {
  await page.fill('input[type="search"]', "CPSC 110");
  await page.waitForSelector("text=Computation, Programs, and Programming", { timeout: 5000 });
  await page.hover('div:has(> div > div > span:text-is("CPSC 110"))');
  await page.click('button:has-text("+ Add")');
  await page.waitForSelector('main span.font-mono:text-is("CPSC 110")', { timeout: 5000 });
});

await step("course tab shows detail with unlocks", async () => {
  await page.waitForSelector("aside >> text=Unlocks", { timeout: 5000 });
  await page.waitForSelector('aside button:text-is("CPSC 210")', { timeout: 5000 });
});

await step("CPSC 210 in the same term is flagged, with a rule tree", async () => {
  await page.fill('input[type="search"]', "CPSC 210");
  await page.waitForSelector("text=Software Construction");
  await page.hover('div:has(> div > div > span:text-is("CPSC 210"))');
  await page.click('button:has-text("+ Add")');
  await page.waitForSelector('button:has-text("Plan") >> text=1', { timeout: 5000 });
  await page.waitForSelector("aside >> text=one of", { timeout: 5000 });
});

await step("moving CPSC 210 to Winter 2 clears the conflict", async () => {
  await page.hover('main span.font-mono:text-is("CPSC 210")');
  await page.click(
    'main div.group:has(span.font-mono:text-is("CPSC 210")) button[title="Remove from plan"]',
  );
  await page.click('button:has(span:text-is("Winter 2"))');
  await page.fill('input[type="search"]', "CPSC 210");
  await page.hover('div:has(> div > div > span:text-is("CPSC 210"))');
  await page.click('button:has-text("+ Add")');
  await page.click('button:has-text("Plan")');
  await page.waitForSelector("text=No conflicts", { timeout: 5000 });
});

await step("degree tab tracks the CS major", async () => {
  await page.click('button:has-text("Degree")');
  await page.click('aside button:has-text("Major (0376): Computer Science")');
  await page.waitForSelector("text=of 120 credits", { timeout: 5000 });
});

await step("plan survives a reload", async () => {
  await page.reload();
  await page.waitForSelector('main span.font-mono:text-is("CPSC 210")', { timeout: 15000 });
});

if (consoleErrors.length) {
  console.log("\nConsole errors:");
  for (const e of consoleErrors) console.log("  " + e);
}
console.log(failures.length ? `\n${failures.length} step(s) failed` : "\nAll steps passed");
await browser.close();
process.exit(failures.length || consoleErrors.length ? 1 : 0);
