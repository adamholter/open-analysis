/**
 * Automated QA: light vs dark must show the same bars at the same widths, no chart may scroll, and no page may overflow.
 * `NODE_PATH=~/priors/node_modules node scripts/qa-parity.mjs` with the dev server running.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:48760";
const PAGES = ["/", "/benchmarks", "/benchmarks/terminalbench-4", "/benchmarks/aa-ttft", "/models", "/models/claude-opus-5.5"];
const problems = [];
const browser = await chromium.launch();
for (const w of [1440, 1000, 390]) {
  const seen = {};
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    for (const path of PAGES) {
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));
      await p.goto(BASE + path, { waitUntil: "networkidle" });
      await p.waitForTimeout(1200);
      const more = p.getByRole("button", { name: /Show all \d+ benchmarks/ });
      if (await more.count()) { await more.first().click(); await p.waitForTimeout(1200); }
      const r = await p.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        scrollers: [...document.querySelectorAll("*")].filter((e) => { const s = getComputedStyle(e); return (s.overflowX === "auto" || s.overflowX === "scroll") && e.scrollWidth > e.clientWidth + 2 && !e.closest(".oa-scroll") && !e.closest(".oa-nav"); }).length,
        panels: [...document.querySelectorAll(".chart-panel")].map((e) => { const t = e.querySelector("h2")?.textContent ?? "?"; const c = e.querySelector("[role=img]"); return `${t}|${c ? Math.round(c.getBoundingClientRect().width) : 0}|${e.querySelector("p.cap:last-of-type")?.textContent?.match(/Top \d+ of \d+/)?.[0] ?? ""}`; }),
      }));
      if (r.overflow) problems.push(`${scheme} ${w} ${path}: page overflows horizontally`);
      if (r.scrollers) problems.push(`${scheme} ${w} ${path}: ${r.scrollers} scroll box(es)`);
      if (errs.length) problems.push(`${scheme} ${w} ${path}: console ${errs[0]}`);
      (seen[path] ??= {})[scheme] = r.panels;
      await p.close();
    }
    await ctx.close();
  }
  for (const path of PAGES) {
    const { light, dark } = seen[path];
    light.forEach((l, i) => { if (l !== dark[i]) problems.push(`${w} ${path}: light "${l}" vs dark "${dark[i]}"`); });
    if (light.length !== dark.length) problems.push(`${w} ${path}: ${light.length} panels in light, ${dark.length} in dark`);
  }
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "parity OK: same panels, widths and bar counts in light and dark at 1440/1000/390; no scroll boxes; no overflow; no console errors");
process.exit(problems.length ? 1 : 0);
