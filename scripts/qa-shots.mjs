/**
 * Visual QA capture: every chart panel on the main pages, light + dark, desktop + mobile.
 * Needs a running dev server (npm run dev) and Playwright (run from a checkout that has it, e.g.
 * `NODE_PATH=~/priors/node_modules node scripts/qa-shots.mjs /tmp/oa-qa`).
 * Writes PNGs plus manifest.json; split the manifest into batches for reviewers.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:48760";
const OUT = process.argv[2] ?? "/tmp/oa-qa";
const PAGES = ["/", "/models", "/models/claude-opus-5.5", "/models/gpt-6-luna", "/benchmarks", "/benchmarks/hearing-bench", "/benchmarks/terminalbench-4", "/benchmarks/aa-gdpval-aa", "/benchmarks/aa-ttft", "/benchmarks/minebench", "/methodology", "/contribute"];
const MOBILE = new Set(["/", "/benchmarks/terminalbench-4", "/models/claude-opus-5.5"]);
const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "home";

fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
let n = 0;
const browser = await chromium.launch();
try {
for (const scheme of ["light", "dark"]) for (const vp of [{ w: 1440, h: 900, tag: "desktop" }, { w: 390, h: 844, tag: "mobile" }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: scheme });
  for (const path of PAGES) {
    if (vp.tag === "mobile" && !MOBILE.has(path)) continue;
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    const name = (what) => `${OUT}/${String(++n).padStart(4, "0")}-${scheme}-${vp.tag}-${slug(path)}-${slug(what)}.png`;
    const top = name("top");
    await p.screenshot({ path: top });
    manifest.push({ file: top, scheme, viewport: vp.tag, page: path, what: "top of page (header + hero)" });
    // Element shots scroll the panel under the sticky header; unpin it so captures aren't covered.
    await p.addStyleTag({ content: ".oa-header { position: relative !important; }" });
    const shot = async (loc, what) => {
      const file = name(what);
      try { await loc.scrollIntoViewIfNeeded({ timeout: 5000 }); await p.waitForTimeout(250); await loc.screenshot({ path: file, timeout: 10000 }); manifest.push({ file, scheme, viewport: vp.tag, page: path, what }); }
      catch (e) { manifest.push({ file: null, scheme, viewport: vp.tag, page: path, what, error: String(e).slice(0, 120) }); }
    };
    if (path === "/") {
      const more = p.getByRole("button", { name: /Show all \d+ benchmarks/ });
      if (await more.count()) { await more.first().click(); await p.waitForTimeout(1500); }
      const tabs = p.locator("#capabilities .oa-chips [role=tab]");
      for (let i = 0; i < await tabs.count(); i++) {
        const label = await tabs.nth(i).innerText();
        await tabs.nth(i).click({ timeout: 5000 }); await p.waitForTimeout(600);
        await shot(p.locator("#capabilities .chart-panel").first(), `capability tab ${label}`);
      }
    }
    const panels = p.locator(".chart-panel");
    for (let i = 0; i < await panels.count(); i++) {
      const panel = panels.nth(i);
      if (path === "/" && await panel.evaluate((el) => !!el.closest("#capabilities"))) continue;
      const title = (await panel.locator("h2").first().innerText({ timeout: 2000 }).catch(() => "")) || `panel ${i}`;
      await shot(panel, title);
    }
    if (errs.length) manifest.push({ page: path, scheme, viewport: vp.tag, consoleErrors: errs });
    await p.close();
  }
  await ctx.close();
}
} finally { await browser.close(); }
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log("shots", manifest.filter((m) => m.file).length, "failed", manifest.filter((m) => m.error).length, "console error sets", manifest.filter((m) => m.consoleErrors).length);
