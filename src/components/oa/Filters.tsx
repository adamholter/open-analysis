"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconAdjustmentsHorizontal, IconRotate, IconSearch, IconX } from "@tabler/icons-react";
import type { Lab } from "@/data/types";
import { reasoningEffortChips } from "@/lib/filters";
import type { RankedVariant } from "@/engine";
import type { MetricPoint } from "@/lib/metrics";
import type { CostBasis } from "@/data/subscription";
import { markColor, useChartPalette } from "@/components/chart/echarts";
import { useLightDismiss } from "@/lib/useLightDismiss";

/** A model as the picker sees it: best Open Index score over the data window, for ordering and grouping. */
export interface PickerModel { id: string; name: string; labId: string; releaseDate?: string; score: number }
/** Server rows carry the API-priced cost beside the default (subscription) one. */
export type Priced = RankedVariant & { costApi?: number };

export const WINDOWS = [3, 6, 12] as const;
export type Months = (typeof WINDOWS)[number];
const DEFAULTS = { months: 3 as Months, basis: "subscription" as CostBasis, effortsOff: ["none"], excluded: [] as string[], included: [] as string[] };
const STORE = "oa:filters";

type State = typeof DEFAULTS;
interface Filters extends State {
  asOf: string;
  cutoff: string;
  models: PickerModel[];
  efforts: string[];
  set: (patch: Partial<State>) => void;
  reset: () => void;
  isDefault: boolean;
  /** Is this model on the charts? In the release window (or switched on by hand) and not switched off. */
  visible: (modelId: string) => boolean;
  visibleCount: number;
  toggleModel: (modelId: string) => void;
  toggleEffort: (effort: string) => void;
  priced: <T extends Priced>(r: T) => T;
  /** Window + model picker + reasoning efforts + pricing applied to ranked rows; `best` keeps each model's top effort that is still on. */
  ranked: (rows: Priced[], mode: "all" | "best") => RankedVariant[];
  points: <T extends MetricPoint>(pts: T[]) => T[];
}

const Ctx = createContext<Filters | null>(null);

function monthsBefore(date: string, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function FiltersProvider({ asOf, models, efforts, dates: extraDates, children }: { asOf: string; models: PickerModel[]; efforts: string[]; /** Release dates of models that are charted but not ranked (benchmark-only models). */ dates?: Record<string, string>; children: ReactNode }) {
  const [state, setState] = useState<State>(DEFAULTS);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<State> | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read saved filters after hydration
      if (saved) setState({ ...DEFAULTS, ...saved });
    } catch { /* ignore */ }
  }, []);
  const set = useCallback((patch: Partial<State>) => setState((s) => {
    const next = { ...s, ...patch };
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  }), []);
  const reset = useCallback(() => { setState(DEFAULTS); try { localStorage.removeItem(STORE); } catch { /* ignore */ } }, []);
  const cutoff = monthsBefore(asOf, state.months);
  const dates = useMemo(() => new Map<string, string | undefined>([...Object.entries(extraDates ?? {}), ...models.map((m) => [m.id, m.releaseDate] as const)]), [models, extraDates]);
  const excluded = useMemo(() => new Set(state.excluded), [state.excluded]);
  const included = useMemo(() => new Set(state.included), [state.included]);
  const effortsOff = useMemo(() => new Set(state.effortsOff), [state.effortsOff]);
  const visible = useCallback((id: string) => {
    if (excluded.has(id)) return false;
    const date = dates.get(id);
    return !date || date >= cutoff || included.has(id);
  }, [excluded, included, dates, cutoff]);
  const visibleCount = useMemo(() => models.filter((m) => visible(m.id)).length, [models, visible]);
  const toggleModel = useCallback((id: string) => {
    const on = visible(id);
    const date = dates.get(id);
    const inWindow = !date || date >= cutoff;
    set(on
      ? { excluded: [...new Set([...state.excluded, id])], included: state.included.filter((x) => x !== id) }
      : { excluded: state.excluded.filter((x) => x !== id), included: inWindow ? state.included : [...new Set([...state.included, id])] });
  }, [visible, dates, cutoff, set, state.excluded, state.included]);
  const toggleEffort = useCallback((effort: string) => set({ effortsOff: state.effortsOff.includes(effort) ? state.effortsOff.filter((e) => e !== effort) : [...state.effortsOff, effort] }), [set, state.effortsOff]);
  const priced = useCallback(<T extends Priced>(r: T): T => state.basis === "api" && r.costApi != null ? { ...r, costUsd: r.costApi } : r, [state.basis]);
  const effortOn = useCallback((effort: string) => !effortsOff.has(effort), [effortsOff]);
  const ranked = useCallback((rows: Priced[], mode: "all" | "best") => {
    let keep = rows.filter((r) => visible(r.model.id) && effortOn(r.variant.effort)).map(priced);
    if (mode === "best") {
      const best = new Map<string, RankedVariant>();
      for (const r of keep) { const cur = best.get(r.model.id); if (!cur || r.score > cur.score) best.set(r.model.id, r); }
      keep = [...best.values()];
    }
    return keep.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [visible, effortOn, priced]);
  const points = useCallback(<T extends MetricPoint>(pts: T[]): T[] => pts.filter((p) => visible(p.r.model.id) && effortOn(p.r.variant.effort)), [visible, effortOn]);
  const isDefault = state.months === DEFAULTS.months && state.basis === DEFAULTS.basis && !state.excluded.length && !state.included.length
    && state.effortsOff.length === 1 && state.effortsOff[0] === "none";
  const value = useMemo<Filters>(() => ({ ...state, asOf, cutoff, models, efforts, set, reset, isDefault, visible, visibleCount, toggleModel, toggleEffort, priced, ranked, points }),
    [state, asOf, cutoff, models, efforts, set, reset, isDefault, visible, visibleCount, toggleModel, toggleEffort, priced, ranked, points]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters(): Filters {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFilters needs <FiltersProvider>");
  return v;
}

/** Charts outside the provider (model pages) fall back to showing everything. */
export const useOptionalFilters = () => useContext(Ctx);

const EFFORT_LABEL: Record<string, string> = { none: "none", minimal: "minimal", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max", default: "default" };

/** Models drawer: the same selection every chart on the page follows. */
function ModelsDrawer({ labs, onClose, within }: { labs: Lab[]; onClose: () => void; /** Clicks inside this element (the filter bar, including its Models button) don't dismiss. */ within: React.RefObject<HTMLElement | null> }) {
  const f = useFilters();
  const pal = useChartPalette();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const dismiss = useCallback(() => onClose(), [onClose]);
  useLightDismiss(within, dismiss);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const color = useMemo(() => new Map(labs.map((l) => [l.id, markColor(l.color, pal, l.id)])), [labs, pal]);
  const labName = useMemo(() => new Map(labs.map((l) => [l.id, l.name])), [labs]);
  const ordered = useMemo(() => f.models.slice().sort((a, b) => b.score - a.score), [f.models]);
  // Frontier: each lab's best model (the 12 strongest labs); Notable: everyone else by score.
  const frontier = useMemo(() => {
    const seen = new Set<string>(), out: PickerModel[] = [];
    for (const m of ordered) if (!seen.has(m.labId)) { seen.add(m.labId); out.push(m); }
    return out.slice(0, 12);
  }, [ordered]);
  const frontierIds = useMemo(() => new Set(frontier.map((m) => m.id)), [frontier]);
  const notable = useMemo(() => ordered.filter((m) => !frontierIds.has(m.id)), [ordered, frontierIds]);
  const q = query.trim().toLowerCase();
  const match = (m: PickerModel) => !q || m.name.toLowerCase().includes(q) || (labName.get(m.labId) ?? "").toLowerCase().includes(q);
  const setGroup = (group: PickerModel[], on: boolean) => {
    const ids = new Set(group.map((m) => m.id));
    const cutoff = f.cutoff;
    const dateOf = new Map(group.map((m) => [m.id, m.releaseDate]));
    f.set(on
      ? { excluded: f.excluded.filter((id) => !ids.has(id)), included: [...new Set([...f.included, ...group.filter((m) => m.releaseDate && m.releaseDate < cutoff).map((m) => m.id)])] }
      : { excluded: [...new Set([...f.excluded, ...group.map((m) => m.id)])], included: f.included.filter((id) => !ids.has(id) && !dateOf.has(id)) });
  };
  const row = (m: PickerModel) => {
    const on = f.visible(m.id);
    return <button key={m.id} type="button" role="checkbox" aria-checked={on} className="oa-mrow" data-on={on} title={`${m.name} · ${labName.get(m.labId) ?? m.labId}`} onClick={() => f.toggleModel(m.id)}>
      <span>{m.name}</span><i aria-hidden="true" style={{ borderColor: color.get(m.labId), background: on ? color.get(m.labId) : "transparent" }} />
    </button>;
  };
  const shownNotable = (all || q ? notable : notable.slice(0, 8)).filter(match);
  const shownFrontier = frontier.filter(match);
  return (
    <div className="oa-drawer" role="dialog" aria-label="Models and filters">
      <div className="oa-drawer-head"><h2>Models <small>{f.visibleCount}</small></h2>
        <button type="button" aria-label="Reset filters" title="Reset filters" disabled={f.isDefault} onClick={f.reset}><IconRotate size={16} stroke={1.5} aria-hidden="true" /></button>
        <button type="button" aria-label="Close" onClick={onClose}><IconX size={16} stroke={1.5} aria-hidden="true" /></button></div>
      <label className="oa-msearch"><IconSearch size={15} stroke={1.5} aria-hidden="true" /><input type="search" aria-label="Find models" placeholder="Find models" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <section><h3>Reasoning</h3>
        <div className="oa-mchips">{reasoningEffortChips(f.efforts).map((e) => {
          const on = !f.effortsOff.includes(e);
          return <button key={e} type="button" aria-pressed={on} onClick={() => f.toggleEffort(e)}>{EFFORT_LABEL[e] ?? e}</button>;
        })}</div></section>
      <section><h3>Released</h3>
        <div className="oa-mchips radio">{WINDOWS.map((m) => <button key={m} type="button" aria-pressed={f.months === m} onClick={() => f.set({ months: m })}>{m === 12 ? "1 year" : `${m} months`}</button>)}</div></section>
      {!!shownFrontier.length && <section><h3>Frontier <span><button type="button" onClick={() => setGroup(frontier, true)}>All</button><button type="button" onClick={() => setGroup(frontier, false)}>None</button></span></h3>
        {shownFrontier.map(row)}</section>}
      {!!shownNotable.length && <section><h3>Notable <span><button type="button" onClick={() => setGroup(notable, true)}>All</button><button type="button" onClick={() => setGroup(notable, false)}>None</button></span></h3>
        {shownNotable.map(row)}</section>}
      {!q && notable.length > 8 && <button type="button" className="oa-mmore" onClick={() => setAll(!all)}>{all ? "Show fewer models" : "Show all models"}</button>}
      {q && !shownFrontier.length && !shownNotable.length && <p className="cap">No matching models.</p>}
    </div>
  );
}

/** Filter strip under the hero: models drawer, release window, pricing basis. Every chart below follows it. */
export function FilterBar({ labs }: { labs: Lab[] }) {
  const f = useFilters();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const bar = useRef<HTMLDivElement>(null);
  return (
    <div ref={bar} className="oa-filterbar">
      <button type="button" className="oa-fbtn" aria-expanded={open} onClick={() => setOpen(!open)}><IconAdjustmentsHorizontal size={15} stroke={1.5} aria-hidden="true" />Models<small>{f.visibleCount}</small></button>
      <label className="oa-fsel"><span>Released</span>
        <select aria-label="Release window" value={f.months} onChange={(e) => f.set({ months: +e.target.value as Months })}>{WINDOWS.map((m) => <option key={m} value={m}>{m === 12 ? "Last year" : `Last ${m} months`}</option>)}</select></label>
      <div className="oa-fsel"><span>Pricing</span>
        <div className="seg" role="group" aria-label="Pricing basis">{(["subscription", "api"] as const).map((b) => <button key={b} type="button" aria-pressed={f.basis === b} onClick={() => f.set({ basis: b })}>{b === "api" ? "API" : "Subscription"}</button>)}</div></div>
      {!f.isDefault && <button type="button" className="oa-freset" onClick={f.reset}>Reset</button>}
      {open && <ModelsDrawer labs={labs} onClose={close} within={bar} />}
    </div>
  );
}
