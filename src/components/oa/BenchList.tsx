"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { categoryDescription, categoryLabel } from "@/lib/categories";
import { useSelection } from "./Selection";
import { SearchBox } from "./SearchBox";

type Origin = "all" | "publishers" | "community";
const MIN = [0, 10, 25, 50] as const;

function Seg<T extends string | number | boolean>({ value, options, onChange, label }: { value: T; options: [T, string, string?][]; onChange: (v: T) => void; label: string }) {
  return <div className="oa-seg" role="group" aria-label={label}>{options.map(([v, n, t]) => <button key={String(v)} type="button" aria-pressed={value === v} title={t} onClick={() => onChange(v)}>{n}</button>)}</div>;
}

/** The Benchmarks page list: search and filters on top, every benchmark below; the open one is marked and stays in view. */
export function BenchList() {
  const { catalog } = useSelection();
  const path = usePathname();
  const current = path.startsWith("/benchmarks/") ? decodeURIComponent(path.slice("/benchmarks/".length)) : null;
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<Origin>("all");
  const [cat, setCat] = useState<string>("all");
  const [tasks, setTasks] = useState<"all" | "public" | "closed">("all");
  const [min, setMin] = useState<(typeof MIN)[number]>(0);
  const [cost, setCost] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const s = q.trim().toLowerCase();
  const cats = useMemo(() => [...new Set(catalog.benchmarks.map((b) => b.category))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b))), [catalog.benchmarks]);
  const shown = catalog.benchmarks.filter((b) => (!s || `${b.name} ${b.publisher} ${categoryLabel(b.category)}`.toLowerCase().includes(s))
    && (origin === "all" || (origin === "community") === !!b.community) && (cat === "all" || b.category === cat)
    && (tasks === "all" || b.access === tasks) && b.models >= min && (!cost || b.cost));
  const active = (origin !== "all" ? 1 : 0) + (cat !== "all" ? 1 : 0) + (tasks !== "all" ? 1 : 0) + (min ? 1 : 0) + (cost ? 1 : 0);
  useEffect(() => { list.current?.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest" }); }, [current]);
  return (
    <aside className="oa-card oa-blrail" aria-label="Benchmarks">
      <SearchBox value={q} onChange={setQ} placeholder="Search benchmarks, sources, categories" label="Search benchmarks" />
      <Seg label="Source" value={origin} onChange={setOrigin} options={[["all", "All"], ["publishers", "Publishers", "Benchmarks collected from their publishers"], ["community", "Community", "Benchmarks added by their authors with a pull request"]]} />
      <div className="oa-blf">
        <label title={cat === "all" ? "Every category" : categoryDescription(cat)}><span>Category</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
        <label title="Public: anyone can read the questions. Closed: the questions are kept private."><span>Tasks</span>
          <select value={tasks} onChange={(e) => setTasks(e.target.value as typeof tasks)}><option value="all">All</option><option value="public">Public</option><option value="closed">Closed</option></select></label>
        <label title="Benchmarks with results for at least this many models"><span>Models</span>
          <select value={min} onChange={(e) => setMin(+e.target.value as (typeof MIN)[number])}>{MIN.map((n) => <option key={n} value={n}>{n ? `${n}+` : "Any"}</option>)}</select></label>
        <label className="oa-blcheck" title="Only benchmarks that report what a run costs"><input type="checkbox" checked={cost} onChange={(e) => setCost(e.target.checked)} />Has cost</label>
      </div>
      <div className="oa-blcount"><span>{shown.length} of {catalog.benchmarks.length} benchmarks</span>{active > 0 && <button type="button" className="oa-link" onClick={() => { setOrigin("all"); setCat("all"); setTasks("all"); setMin(0); setCost(false); }}>Clear filters</button>}</div>
      <div ref={list} className="oa-bllist">
        {shown.map((b) => (
          <Link key={b.id} href={`/benchmarks/${b.id}`} aria-current={b.id === current ? "page" : undefined}>
            <b>{b.name}{b.access === "closed" && <IconLock size={11} stroke={2} className="oa-lock" aria-label="Closed tasks" />}{b.community && <span className="oa-badge">Community</span>}</b>
            <small>{categoryLabel(b.category)} · {b.publisher} · {b.models} models</small>
          </Link>
        ))}
        {!shown.length && <p className="oa-muted" style={{ padding: 10 }}>No benchmark matches.</p>}
      </div>
    </aside>
  );
}
