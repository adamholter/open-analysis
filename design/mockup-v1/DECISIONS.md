# Open Analysis redesign decisions
Mockup: `design/mockup-v1/index.html` (round 7). The picker panel on the right shows the same state.
## Locked in rounds 1–6
| Element | Pick | Round |
| --- | --- | --- |
| Overall direction | shadcn: clean black and white, cards, 6 px corners | 1 |
| Theme | Zinc dark | 2 |
| Accent | Ink (black or white) | 1 |
| Density | Comfortable | 1 |
| Chart style | Vertical bars, top 12; "All" is set in the model picker | 1 |
| Chart colours | Lab colours | 1 |
| Home page | One long page with side nav | 1 |
| Community benchmarks place | Own section and a badge on each one | 1 |
| Add a benchmark | Page with a ready prompt to copy | 1 |
| Model picker | Top right of every chart, one shared selection in the URL; benchmark cards follow it and show "16 of 26" | 2 |
| Reasoning level on charts | Second line under the name | 2 |
| Public or closed tasks | Filter (All · Public · Closed) and a lock on closed ones | 2 |
| Community benchmarks | Big chart, benchmark list on the right | 2 |
| Home page content | Index, your index, capabilities, cost, speed, benchmarks, community | 3 |
| Capability categories | Capability tabs over one big chart, its benchmarks under it | 3 |
| My benchmarks | "Build your index" only: benchmarks + weights, own chart, share link | 3 |
| Highlight on hover | Dim the other bars and labels | 3 |
| Cost per task | One bar per model, plus the Pareto chart | 3 |
| Inside the model picker | Labelled rows: icon, name, dropdown; Quick select on its own row | 5 |
| Model page | Facts, then capability scores, then every result grouped by capability | 5 |
| Benchmarks page | List on the left with search and filters, the chosen benchmark on the right | 6 |
| Compare page | Capability radar on top, then the benchmarks where they differ most | 6 |
| Methodology page | One page with a table of contents on the left | 6 |
## Open in round 7 (first option = recommendation)
| Decision | You said | Options |
| --- | --- | --- |
| Missing results (no estimates) | I don't think estimating results is good. I really don't like that. | Average what exists, show coverage (8/10) on the bar, fade models with fewer than 8 · Rank only models with all 10, list the others under the chart · Average what exists, you set the minimum in the model picker (Coverage) |
| Models page | The models page right now is pretty boring. It needs to be better. | Rich table (levels, Open Index bar, best capability, cost, speed) with a radar preview on hover · Cards by lab with the index over release dates · Landscape: Open Index vs cost, the list under it |
## Fixed without a decision (round 7)
- Nothing is estimated. The Open Index is the average of the index benchmarks a model has results on; coverage (7–10 of 10 in this data) shows how many. Methodology, the FAQ and the step-by-step text say so. Per-level scores keep their gap to the best level (a mockup shortcut).
- Every category has a plain name and a one-line description: tooltips everywhere, and a line under the category chips. Composite → Combined indexes, Agentic → Agents & tools, Economics → Professional work, Safety → Cyber security, Long context → Long inputs, Creative → Creative work.
- "Your models" is now "Selected models": the models ticked in the Models picker. "My picks" is now "Saved", with a Save button in Quick select.
- Benchmarks page: the chosen benchmark is in the link (`?b=…`), is marked in the list, and is scrolled into view after a reload. A big All · Publishers · Community switch; category chips with descriptions; Source, Tasks, Models and Has cost filters; cost per task on the benchmark (the 10 index benchmarks; the split is sample data); a real Website link.
- One search component everywhere. The header search finds models and benchmarks in two groups (↑ ↓ to move, Enter to open, / to focus). A model opens its page; a benchmark opens the Benchmarks page with it selected.
- Compare: Your index first (or a prompt to build one), then the radar, then side by side (facts and key numbers), then the biggest differences.
- "On this page" and the home side nav follow the scroll. A click in the contents stays marked until you scroll yourself.
- Layout stability: opening the header search, the picker, a preset, a Benchmarks filter menu and hovering a Models row moved 0 boxes and did not change the scroll.
## Parked for later
- Subscription pricing (share of a plan used per task).
- First-visit onboarding: choose your benchmarks and models.
- User-defined capability indexes.
## Sample data
- Closed-task flags, 5 community benchmarks, the cost split by benchmark, confidence intervals, the "How it works" text, the benchmark one-line descriptions on the home page, the per-benchmark cost on the Benchmarks page (same split).
- Benchmark descriptions, sources, model counts and results on the Benchmarks and Compare pages are real (snapshot of 16 Oct 2026).
