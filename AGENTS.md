# Open Analysis

Simple, fixed-index sibling of Priors (`~/priors`, mypriors.com): "compare AI models on every public benchmark", open source, with community benchmarks. No accounts, no custom weights on the server, statically generated.

- Read `README.md` for layout. Copied from **live Priors (`origin/main`, not the local `~/priors` checkout, which can lag)**: only the data contract and engine (`src/data/`, `src/engine/`, plus `src/lib/{metrics,formula,url,filters,page-presets}.ts`). To resync: `git -C ~/priors fetch && git -C ~/priors archive origin/main src | tar -x -C /tmp/priors-live`, copy those over, run the tests. Everything on screen is Open Analysis's own (`src/components/oa/`); Priors' chart stack is no longer used.
- Design: shadcn zinc, black and white, 6 px controls, 10 px cards, Geist. Default theme Zinc dark; the header switch offers System / Light / Dark (`localStorage["oa:theme"]`). Tokens: `src/lib/oa-theme.ts` (lab colours from Priors' Analysis theme); all CSS is in `src/app/globals.css`. The design spec and decisions are `design/mockup-v1/` (`DECISIONS.md`).
- Model selection (`src/components/oa/Selection.tsx`): one selection for every chart on a page, in the URL query (short keys: `rel`, `lab`, `w`, `t`, `eoff`, `x`/`i` or `m`, `v`, `lv`, `bars`, `cov`, `p`), read on the first page load, reset on every other page. The universe is `catalog()` in `views.ts`: Open Index models plus recent models with results on at least 30 benchmarks; charts never draw a model the picker can't switch off. `ModelPicker.tsx` is the panel (filters, quick select, show on charts, list).
- Charts (`Bars.tsx`, `Scatter.tsx`, `Radar.tsx`) are plain SVG: fixed heights so nothing moves when the selection changes, hover dims other models in every chart, PNG/CSV/link export, per-chart settings. Server code turns data into plain rows (`src/lib/bars.ts`).
- Pricing is API list prices only (`costBasis: "api"`); subscription pricing is parked. The engine still fills missing index results from peers (`estimateMissing`); the Open Index composition is under review, so don't change the engine without that decision.
- `npm run data` rebuilds `data/snapshot.json.gz` from Priors' latest snapshot on GitHub raw. All Priors sources are included (`config/upstream.json` `excludeSources` is empty).
- Dev server: port 48760. Run `npm run validate` before handoff. `scripts/qa-parity.mjs` and `scripts/qa-shots.mjs` drive the running site with Playwright.
- Public repo: github.com/adamholter/open-analysis. No domain or deploy yet; ask Adam before creating either.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
