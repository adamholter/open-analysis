"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconCpu, IconLayersIntersect, IconLock } from "@tabler/icons-react";
import { useLabColor } from "./palette";
import { categoryLabel } from "@/lib/categories";
import { useLightDismiss } from "@/lib/useLightDismiss";
import { useSelection } from "./Selection";
import { SearchBox } from "./SearchBox";

type Item = { kind: "model"; id: string; name: string; labId: string; sub: string } | { kind: "bench"; id: string; name: string; sub: string; community?: boolean; closed?: boolean };
const MAX = 6;

/** Header search for models and benchmarks, in two groups. ↑ ↓ move, Enter opens, / focuses. */
export function GlobalSearch() {
  const { catalog } = useSelection();
  const labColor = useLabColor();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  useLightDismiss(root, () => setOpen(false));
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) { e.preventDefault(); input.current?.focus(); setOpen(true); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const labName = useMemo(() => new Map(catalog.labs.map((l) => [l.id, l.name])), [catalog.labs]);
  const color = useMemo(() => new Map(catalog.labs.map((l) => [l.id, labColor(l.id)])), [catalog.labs, labColor]);
  const { models, benches, nModels, nBenches } = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return { models: [] as Item[], benches: [] as Item[], nModels: 0, nBenches: 0 };
    const hit = (...xs: (string | undefined)[]) => xs.some((x) => x?.toLowerCase().includes(s));
    const ms: Item[] = [
      ...catalog.models.filter((m) => hit(m.name, labName.get(m.labId), m.id)).map((m) => ({ kind: "model" as const, id: m.id, name: m.name, labId: m.labId, sub: `${labName.get(m.labId) ?? m.labId} · ${m.score != null ? `Open Index ${m.score.toFixed(1)}` : `${m.results} results`}` })),
      ...catalog.others.filter(([id, name, lab]) => hit(name, labName.get(lab), id)).map(([id, name, lab]) => ({ kind: "model" as const, id, name, labId: lab, sub: `${labName.get(lab) ?? lab} · not on the Open Index` })),
    ];
    const bs: Item[] = catalog.benchmarks.filter((b) => hit(b.name, b.publisher, categoryLabel(b.category), b.id)).sort((a, b) => b.models - a.models)
      .map((b) => ({ kind: "bench" as const, id: b.id, name: b.name, sub: `${categoryLabel(b.category)} · ${b.publisher} · ${b.models} models`, community: b.community, closed: b.access === "closed" }));
    return { models: ms.slice(0, MAX), benches: bs.slice(0, MAX), nModels: ms.length, nBenches: bs.length };
  }, [q, catalog, labName]);
  const items = [...models, ...benches];
  const go = (it: Item) => { setOpen(false); setQ(""); router.push(it.kind === "model" ? `/models/${it.id}` : `/benchmarks/${it.id}`); };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && items[at]) go(items[at]);
    else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
  };
  const row = (it: Item, i: number) => (
    <button key={`${it.kind}:${it.id}`} type="button" className="oa-gsi" data-on={i === at || undefined} onMouseEnter={() => setAt(i)} onClick={() => go(it)}>
      {it.kind === "model" ? <i className="oa-gdot" style={{ background: color.get(it.labId) }} /> : <i className="oa-gdot sq" />}
      <span><b>{it.name}{it.kind === "bench" && it.closed && <IconLock size={11} stroke={2} aria-label="Closed tasks" />}{it.kind === "bench" && it.community && <span className="oa-badge">Community</span>}</b><small>{it.sub}</small></span>
      <IconArrowRight size={13} stroke={1.8} aria-hidden="true" />
    </button>
  );
  return (
    <div ref={root} className="oa-gsearch">
      <SearchBox ref={input} value={q} onChange={(v) => { setQ(v); setAt(0); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} placeholder="Search models and benchmarks" label="Search models and benchmarks" kbd="/" />
      {open && q.trim() && (
        <div className="oa-gpop" role="listbox" aria-label="Search results">
          {items.length ? <>
            {!!models.length && <div className="oa-gsh"><IconCpu size={13} stroke={1.8} aria-hidden="true" />Models <small>{nModels}</small></div>}
            {models.map((it, i) => row(it, i))}
            {!!benches.length && <div className="oa-gsh"><IconLayersIntersect size={13} stroke={1.8} aria-hidden="true" />Benchmarks <small>{nBenches}</small></div>}
            {benches.map((it, i) => row(it, models.length + i))}
          </> : <p className="oa-gnone">No model or benchmark matches “{q.trim()}”.</p>}
          <div className="oa-gkeys"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
        </div>
      )}
    </div>
  );
}
