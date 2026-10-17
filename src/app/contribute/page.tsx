import type { Metadata } from "next";
import Link from "next/link";
import { REPO } from "@/lib/site";

export const metadata: Metadata = { title: "Add a benchmark" };

const SPEC = `{
  "id": "my-bench",
  "name": "My Bench",
  "description": "What a model has to do, and how it is scored.",
  "url": "https://my-bench.example.com",
  "maintainer": "Your Name",
  "category": "reasoning",
  "unit": "percent",
  "higherIsBetter": true,
  "lastUpdated": "2026-10-15"
}`;

const CSV = `model,effort,score,cost_usd,duration_sec,harness,source_url
claude-opus-5.5,xhigh,43.0,0.19,103,Claude Code,https://example.com/run-1
gpt-6.1-sol,high,23.0,0.008,29,Codex,
gemini-4,medium,43.0,0.023,33,,https://example.com/run-3`;

export default function Contribute() {
  return (
    <div className="oa-body no-side">
    <main className="oa-main">
      <section className="oa-prose">
        <h1>Add a benchmark</h1>
        <p className="oa-lede">A community benchmark is a folder with two files. Open a pull request and it appears on the site once checks pass and a maintainer merges it.</p>
        <h2>1. <code>community/my-bench/benchmark.json</code></h2>
        <pre><code>{SPEC}</code></pre>
        <p>Categories: coding, agentic, reasoning, knowledge, math, long-context, instruction, creative (shown as 3D), safety (shown as Cyber), economics (shown as Professional), other. Units: percent, score (add <code>&quot;scale&quot;: {"{"}&quot;min&quot;: 0, &quot;max&quot;: 10{"}"}</code>), elo, usd, seconds, count.</p>
        <h2>2. <code>community/my-bench/results.csv</code></h2>
        <pre><code>{CSV}</code></pre>
        <ul>
          <li><b>model</b>: an id from the <Link href="/models">models page</Link>. Common names like &quot;Claude Opus 5.5&quot; also work.</li>
          <li><b>effort</b>: none, minimal, low, medium, high, xhigh or max. Leave it blank if you didn&apos;t set one; the model&apos;s highest effort is assumed.</li>
          <li><b>score</b> is required. <b>cost_usd</b> (per task), <b>duration_sec</b> (per task) and <b>harness</b> are optional.</li>
          <li><b>source_url</b>: a link to this result&apos;s source, optional. If blank, the benchmark&apos;s <code>url</code> is used.</li>
          <li>Blank cells are ignored. <code>model</code> and <code>score</code> are required; blank effort uses the model&apos;s highest known effort. Blank cost, duration and harness are omitted.</li>
          <li>One row per model and effort. Only publish complete runs.</li>
        </ul>
        <h2>3. Check it</h2>
        <pre><code>npm install{"\n"}npm run check:community</code></pre>
        <p>The same check runs on every pull request. It reports unknown models, duplicate rows and out-of-range scores by line number.</p>
        <h2>What gets accepted</h2>
        <ul>
          <li>A public page explaining the task and scoring, linked in <code>url</code>.</li>
          <li>Results you ran yourself or that your benchmark publishes. No copies of other leaderboards.</li>
          <li>Joining the Open Index is a separate pull request to <code>open-index.json</code>, decided on coverage and how much the benchmark adds.</li>
        </ul>
        <p><a className="oa-cta" href={`${REPO}/tree/main/community`}>Browse community benchmarks on GitHub</a></p>
      </section>
    </main>
    </div>
  );
}
