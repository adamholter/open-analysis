# Contributing

## Add a benchmark

Create `community/<id>/` with two files. The folder name must equal `id`.

`benchmark.json`

```json
{
  "id": "my-bench",
  "name": "My Bench",
  "description": "What a model has to do, and how it is scored.",
  "url": "https://my-bench.example.com",
  "maintainer": "Your Name",
  "category": "reasoning",
  "unit": "percent",
  "higherIsBetter": true,
  "lastUpdated": "2026-10-15"
}
```

- `category`: coding, agentic (shown as Agents & tools), reasoning, knowledge, math, long-context (Long inputs), instruction (Instruction following), creative (Creative work), safety (Cyber security), economics (Professional work), other.
- `unit`: percent, score (needs `"scale": {"min": 0, "max": 10}`), elo, usd, seconds, count.
- Optional `costNote`: how `cost_usd` was priced.

`results.csv`

```csv
model,effort,score,cost_usd,duration_sec,harness,source_url
claude-opus-5.5,xhigh,43.0,0.19,103,Claude Code,https://example.com/run-1
```

- `model`: an id from the site's Models page. Common names usually match too.
- `effort`: none, minimal, low, medium, high, xhigh, max. Blank means the model's highest effort.
- `score` is required. `cost_usd` and `duration_sec` are per task and can't be negative. `source_url` (per row) is optional; a blank value uses the benchmark's `url`.
- Blank cells are ignored. Blank `model` or `score` fails validation. Blank `effort` uses the model's highest known effort; blank `cost_usd`, `duration_sec`, and `harness` are omitted.
- One row per model and effort. Publish complete runs only.

Run `npm run check:community` before opening the pull request. CI runs the same check.

## Change the Open Index

Edit `open-index.json` in its own pull request. Say what the change adds and how many current models the benchmark covers.

## Model not recognized?

Open an issue with the exact label. Aliases live in Priors' `src/data/normalize.ts`, shared by both projects.
