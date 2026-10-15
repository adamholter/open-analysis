# Open Analysis

Open-source AI model rankings. One fixed index, built from independent public benchmarks plus community benchmarks anyone can add by pull request.

- **Leaderboard**: the Open Index, intelligence vs. cost, intelligence vs. speed, output speed.
- **Models** and **benchmarks**: every result, linked to where it was published.
- **Community benchmarks**: a folder in `community/` with `benchmark.json` and `results.csv`. See [CONTRIBUTING.md](CONTRIBUTING.md).

Want your own weights instead of ours? Use [Priors](https://mypriors.com), which shares this engine.

## Run it

```sh
npm install
npm run data   # builds data/snapshot.json.gz
npm run dev    # http://localhost:48760
```

## How the data flows

1. Public benchmarks are scraped by [Priors](https://github.com/adamholter/priors) every two hours (`config/upstream.json` points at its latest snapshot).
2. `scripts/build-data.ts` drops the sources listed in `excludeSources`, then merges `community/*`.
3. The site is statically generated from `data/snapshot.json.gz`. The index weights are in `open-index.json`.

## Layout

- `open-index.json`: index components and weights.
- `community/<id>/`: community benchmarks.
- `src/data/community.ts`: community schema, model matching and merge (tests alongside).
- `src/engine/`, `src/data/{types,normalize,...}.ts`: shared with Priors. Change them there first.
- `src/lib/data.ts`: index rows, per-model and per-benchmark queries.
- `src/components/Chart.tsx`: ECharts bars and scatter.
