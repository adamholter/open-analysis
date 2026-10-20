"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Catalog, CatModel } from "@/lib/views";

/**
 * One model selection for every chart on a page. It lives in the URL query (survives a reload, can be shared) and
 * starts over on every other page. Filters narrow the list and the charts; quick select ticks models for you.
 */
export const WINDOWS = [3, 6, 12] as const;
export type Months = (typeof WINDOWS)[number];
export interface SelState {
  months: Months; labsOff: string[]; weights: "all" | "open" | "closed"; tasks: "all" | "public" | "closed";
  effortsOff: string[]; off: string[]; on: string[]; variantsOff: string[];
  levels: "best" | "all"; bars: "top" | "all"; cov: number; preset: string | null;
}
export const DEFAULTS: SelState = { months: 3, labsOff: [], weights: "all", tasks: "all", effortsOff: ["none"], off: [], on: [], variantsOff: [], levels: "best", bars: "top", cov: 1, preset: null };

/** Query keys, kept short so shared links stay readable. Other keys (hl, b, yi…) belong to the page and are left alone. */
const KEYS = { months: "rel", labsOff: "lab", weights: "w", tasks: "t", effortsOff: "eoff", off: "x", on: "i", variantsOff: "v", levels: "lv", bars: "bars", cov: "cov", preset: "p" } as const;
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

/** Ticked models as one explicit list, when that is shorter than the switched-off list. */
const PICKED = "m";
const cutoffOf = (asOf: string, months: number) => monthsBefore(asOf, months);

export function readQuery(q: URLSearchParams, catalog: Catalog): SelState {
  const s = { ...DEFAULTS };
  const rel = Number(q.get(KEYS.months)); if (WINDOWS.includes(rel as Months)) s.months = rel as Months;
  if (q.has(KEYS.labsOff)) s.labsOff = list(q.get(KEYS.labsOff));
  const w = q.get(KEYS.weights); if (w === "open" || w === "closed") s.weights = w;
  const t = q.get(KEYS.tasks); if (t === "public" || t === "closed") s.tasks = t;
  if (q.has(KEYS.effortsOff)) s.effortsOff = list(q.get(KEYS.effortsOff));
  s.off = list(q.get(KEYS.off)); s.on = list(q.get(KEYS.on)); s.variantsOff = list(q.get(KEYS.variantsOff));
  s.preset = q.get(KEYS.preset);
  if (q.has(PICKED)) { const ticked = new Set(list(q.get(PICKED))); s.off = catalog.models.filter((m) => !ticked.has(m.id)).map((m) => m.id); s.on = [...ticked].filter((id) => { const d = catalog.models.find((m) => m.id === id)?.releaseDate; return !!d && d < cutoffOf(catalog.asOf, s.months); }); }
  else if (s.preset && !q.has(KEYS.off)) { const p = PRESETS.find((x) => x.id === s.preset)?.pick(catalog.models, catalog.asOf); if (p) Object.assign(s, tickOnlyIn(catalog, cutoffOf(catalog.asOf, s.months), p, s.preset)); }
  if (q.get(KEYS.levels) === "all") s.levels = "all";
  if (q.get(KEYS.bars) === "all") s.bars = "all";
  const cov = Number(q.get(KEYS.cov)); if (Number.isInteger(cov) && cov > 1) s.cov = cov;
  return s;
}

export function writeQuery(s: SelState, q: URLSearchParams, catalog: Catalog) {
  for (const k of Object.values(KEYS)) q.delete(k);
  if (s.months !== DEFAULTS.months) q.set(KEYS.months, String(s.months));
  if (s.labsOff.length) q.set(KEYS.labsOff, s.labsOff.join(","));
  if (s.weights !== "all") q.set(KEYS.weights, s.weights);
  if (s.tasks !== "all") q.set(KEYS.tasks, s.tasks);
  if (s.effortsOff.join(",") !== DEFAULTS.effortsOff.join(",")) q.set(KEYS.effortsOff, s.effortsOff.join(","));
  q.delete(PICKED);
  const cutoff = cutoffOf(catalog.asOf, s.months), off = new Set(s.off), on = new Set(s.on);
  const ticked = catalog.models.filter((m) => !off.has(m.id) && (!m.releaseDate || m.releaseDate >= cutoff || on.has(m.id))).map((m) => m.id);
  const preset = s.preset ? PRESETS.find((x) => x.id === s.preset) : undefined;
  // A preset (other than Saved, which lives in this browser) is enough to rebuild its ticks.
  if (preset && preset.id !== "saved" && !s.variantsOff.length) { /* p= below says it all */ }
  else if (ticked.length && ticked.join(",").length < s.off.join(",").length + s.on.join(",").length) q.set(PICKED, ticked.join(","));
  else { if (s.off.length) q.set(KEYS.off, s.off.join(",")); if (s.on.length) q.set(KEYS.on, s.on.join(",")); }
  if (s.variantsOff.length) q.set(KEYS.variantsOff, s.variantsOff.join(","));
  if (s.levels !== "best") q.set(KEYS.levels, s.levels);
  if (s.bars !== "top") q.set(KEYS.bars, s.bars);
  if (s.cov > 1) q.set(KEYS.cov, String(s.cov));
  if (s.preset) q.set(KEYS.preset, s.preset);
}

/** A chart row as the selection sees it. */
export interface SelRow { modelId: string; labId: string; effort: string; releaseDate?: string }

export interface Selection extends SelState {
  catalog: Catalog;
  cutoff: string;
  set: (patch: Partial<SelState>) => void;
  reset: () => void;
  isDefault: boolean;
  byId: Map<string, CatModel>;
  /** Model passes the filters (lab, weights, coverage); release date and ticks aside. */
  passes: (m: CatModel) => boolean;
  ticked: (m: CatModel) => boolean;
  /** Model is on the charts (only catalog models ever are). */
  visible: (modelId: string) => boolean;
  effortOn: (modelId: string, effort: string) => boolean;
  /** Rows on the charts, one per model at its best allowed level unless "All levels" is on. */
  rows: <T extends SelRow>(rows: T[], better?: (a: T, b: T) => boolean) => T[];
  /** Benchmarks that pass the Tasks filter. */
  benchOk: (access?: "public" | "closed") => boolean;
  shown: CatModel[];
  setModels: (group: CatModel[], on: boolean) => void;
  toggleVariant: (modelId: string, effort: string) => void;
  toggleEffort: (effort: string) => void;
}

const Ctx = createContext<Selection | null>(null);

function monthsBefore(date: string, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function SelectionProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const [state, setState] = useState<SelState>(DEFAULTS);
  const pathname = usePathname();
  const page = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  // The first page reads the link; every other page starts over. (Keyed on the path, so a re-run of the effect changes nothing.)
  useEffect(() => {
    if (page.current === pathname) return;
    const firstPage = page.current == null;
    page.current = pathname;
    setState(firstPage ? readQuery(new URLSearchParams(window.location.search), catalog) : DEFAULTS);
    setReady(true);
  }, [pathname, catalog]);
  const set = useCallback((patch: Partial<SelState>) => setState((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setState(DEFAULTS), []);
  useEffect(() => {
    // Before the link is read there is nothing to write.
    if (!ready) return;
    const url = new URL(window.location.href);
    writeQuery(state, url.searchParams, catalog);
    const next = url.pathname + (url.searchParams.size ? `?${url.searchParams}` : "") + url.hash;
    if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.replaceState(window.history.state, "", next);
  }, [state, ready, catalog]);

  const value = useMemo<Selection>(() => {
    const s = state;
    const cutoff = monthsBefore(catalog.asOf, s.months);
    const byId = new Map(catalog.models.map((m) => [m.id, m]));
    const off = new Set(s.off), on = new Set(s.on), labsOff = new Set(s.labsOff), effortsOff = new Set(s.effortsOff), variantsOff = new Set(s.variantsOff);
    const passes = (m: CatModel) => !labsOff.has(m.labId) && (s.weights === "all" || (s.weights === "open" ? m.open === true : m.open === false)) && (s.cov <= 1 || m.measured >= s.cov);
    const inWindow = (date?: string) => !date || date >= cutoff;
    const ticked = (m: CatModel) => !off.has(m.id) && (inWindow(m.releaseDate) || on.has(m.id));
    const effortOn = (id: string, e: string) => !effortsOff.has(e) && !variantsOff.has(`${id}:${e}`);
    const visible = (id: string) => {
      const m = byId.get(id);
      // Charts draw only models the picker offers, so every bar can be switched off.
      return !!m && passes(m) && ticked(m);
    };
    const shown = catalog.models.filter((m) => passes(m) && ticked(m) && m.efforts.some((e) => effortOn(m.id, e)));
    const rows = <T extends SelRow>(rows: T[], better?: (a: T, b: T) => boolean) => {
      const keep = rows.filter((r) => visible(r.modelId) && effortOn(r.modelId, r.effort));
      if (s.levels === "all" || !better) return keep;
      const best = new Map<string, T>();
      for (const r of keep) { const cur = best.get(r.modelId); if (!cur || better(r, cur)) best.set(r.modelId, r); }
      return keep.filter((r) => best.get(r.modelId) === r);
    };
    const benchOk = (access?: "public" | "closed") => s.tasks === "all" || access === s.tasks;
    const setModels = (group: CatModel[], turnOn: boolean) => {
      const ids = new Set(group.map((m) => m.id));
      const own = (k: string) => ids.has(k.slice(0, k.lastIndexOf(":")));
      setState((cur) => turnOn
        ? { ...cur, preset: null, off: cur.off.filter((id) => !ids.has(id)), on: [...new Set([...cur.on, ...group.filter((m) => !inWindow(m.releaseDate)).map((m) => m.id)])], variantsOff: cur.variantsOff.filter((k) => !own(k)) }
        : { ...cur, preset: null, off: [...new Set([...cur.off, ...ids])], on: cur.on.filter((id) => !ids.has(id)) });
    };
    const toggleVariant = (id: string, e: string) => {
      const key = `${id}:${e}`, m = byId.get(id);
      if (m && ticked(m) && effortOn(id, e)) { set({ variantsOff: [...s.variantsOff, key], preset: null }); return; }
      // Ticking one level of an unticked model ticks the model at that level only.
      const others = m && !ticked(m) ? m.efforts.filter((x) => x !== e).map((x) => `${id}:${x}`) : [];
      set({ preset: null, variantsOff: [...new Set([...s.variantsOff.filter((k) => k !== key), ...others])], effortsOff: s.effortsOff.filter((x) => x !== e),
        ...(m && !ticked(m) ? { off: s.off.filter((x) => x !== id), on: inWindow(m.releaseDate) ? s.on : [...s.on, id] } : {}) });
    };
    const toggleEffort = (e: string) => set({ effortsOff: effortsOff.has(e) ? s.effortsOff.filter((x) => x !== e) : [...s.effortsOff, e] });
    const isDefault = JSON.stringify(s) === JSON.stringify(DEFAULTS);
    return { ...s, catalog, cutoff, set, reset, isDefault, byId, passes, ticked, visible, effortOn, rows, benchOk, shown, setModels, toggleVariant, toggleEffort };
  }, [state, catalog, set, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelection(): Selection {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSelection needs <SelectionProvider>");
  return v;
}

/** Quick selects: each ticks a set of models and replaces the current ticks. */
export interface Preset { id: string; name: string; description: string; pick: (models: CatModel[], asOf: string) => CatModel[] | null }
export const SAVED_KEY = "oa:saved-models";
export const PRESETS: Preset[] = [
  { id: "frontier", name: "Frontier", description: "The best model from each lab", pick: (ms) => { const seen = new Set<string>(); return ms.filter((m) => m.score != null && !seen.has(m.labId) && !!seen.add(m.labId)); } },
  { id: "open", name: "Open weights", description: "Models whose weights you can download and run", pick: (ms) => ms.filter((m) => m.open === true) },
  { id: "value", name: "Best value", description: "Nothing else is both cheaper and better (the cost Pareto frontier)", pick: (ms) => {
    const out: CatModel[] = []; let best = -Infinity;
    for (const m of ms.filter((x) => x.cost != null && x.score != null).sort((a, b) => a.cost! - b.cost!)) if (m.score! > best) { out.push(m); best = m.score!; }
    return out;
  } },
  { id: "fast", name: "Fastest", description: "The 8 models with the highest output speed", pick: (ms) => ms.filter((m) => m.speed).sort((a, b) => b.speed! - a.speed!).slice(0, 8) },
  { id: "latest", name: "Latest", description: "Released in the last 30 days", pick: (ms, asOf) => ms.filter((m) => m.releaseDate && m.releaseDate >= monthsBefore(asOf, 1)) },
  { id: "saved", name: "Saved", description: "The models you saved in this browser. Tick models, then click Save.", pick: (ms) => {
    try { const ids = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null") as string[] | null; return ids ? ms.filter((m) => ids.includes(m.id)) : null; } catch { return null; }
  } },
];

/** Tick exactly these models (any release date) and switch everything else off. */
function tickOnlyIn(catalog: Catalog, cutoff: string, picked: CatModel[], preset: string | null): Partial<SelState> {
  const ids = new Set(picked.map((m) => m.id));
  return { off: catalog.models.filter((m) => !ids.has(m.id)).map((m) => m.id), on: picked.filter((m) => m.releaseDate && m.releaseDate < cutoff).map((m) => m.id),
    variantsOff: [], labsOff: [], weights: "all", preset };
}
export const tickOnly = (sel: Selection, picked: CatModel[], preset: string | null) => tickOnlyIn(sel.catalog, sel.cutoff, picked, preset);
