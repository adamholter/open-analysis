"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconBrain, IconBuilding, IconCalendar, IconChartBar, IconCheck, IconChecks, IconChevronDown, IconDeviceFloppy, IconEye, IconFilter, IconLayersSubtract, IconListCheck, IconLockOpen, IconRotate, IconSelector, IconShieldCheck, IconSquareOff, IconWand, IconX } from "@tabler/icons-react";
import { useLabColor } from "./palette";
import { reasoningEffortChips } from "@/lib/filters";
import type { CatModel } from "@/lib/views";
import { useLightDismiss } from "@/lib/useLightDismiss";
import { PRESETS, SAVED_KEY, WINDOWS, tickOnly, useSelection, type SelState } from "./Selection";
import { SearchBox } from "./SearchBox";

export const EFFORT_NAME: Record<string, string> = { none: "No reasoning", minimal: "Minimal", low: "Low", medium: "Medium", high: "High", xhigh: "Xhigh", max: "Max", default: "Default" };
export const effortName = (e: string) => EFFORT_NAME[e] ?? e;
type Check = "on" | "off" | "mixed";

function Box({ state, color }: { state: Check; color?: string }) {
  return <i className="oa-cb" data-state={state} aria-hidden="true" style={color ? { "--c": color } as React.CSSProperties : undefined}>{state === "on" && <IconCheck size={11} stroke={3} />}</i>;
}

/** Labelled filter row: icon, name, a dropdown chip with the current value, and a reset. Its body opens under it. */
function FilterRow({ icon, label, value, help, active, open, onToggle, onClear, children }: { icon: ReactNode; label: string; value: string; help: string; active: boolean; open: boolean; onToggle: () => void; onClear: () => void; children: ReactNode }) {
  return <>
    <div className="oa-prow2" title={help}>
      <span className="oa-pl">{icon}{label}</span>
      <button type="button" className="oa-dchip" data-active={active || undefined} aria-expanded={open} onClick={onToggle}><span>{value}</span><IconChevronDown size={13} stroke={1.8} aria-hidden="true" /></button>
      {active ? <button type="button" className="oa-px" onClick={onClear} title={`Reset ${label.toLowerCase()}`} aria-label={`Reset ${label.toLowerCase()}`}><IconX size={12} stroke={2} /></button> : <span className="oa-px" />}
    </div>
    {open && <div className="oa-pdrop">{children}<p>{help}</p></div>}
  </>;
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string, string?][]; onChange: (v: T) => void; label: string }) {
  return <div className="oa-seg" role="group" aria-label={label}>{options.map(([v, name, title]) => <button key={String(v)} type="button" aria-pressed={value === v} title={title} onClick={() => onChange(v)}>{name}</button>)}</div>;
}

/** The model picker panel: filters, quick select, what charts show, and the model list. */
function PickerPanel({ onClose, within, maxHeight, align, above }: { onClose: () => void; within: React.RefObject<HTMLElement | null>; maxHeight: number; align: "left" | "right"; above: boolean }) {
  const sel = useSelection();
  const labColor = useLabColor();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const dismiss = useCallback(() => onClose(), [onClose]);
  useLightDismiss(within, dismiss);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const { catalog } = sel;
  const color = useMemo(() => new Map(catalog.labs.map((l) => [l.id, labColor(l.id)])), [catalog.labs, labColor]);
  const labName = useMemo(() => new Map(catalog.labs.map((l) => [l.id, l.name])), [catalog.labs]);
  const labs = useMemo(() => catalog.labs.filter((l) => catalog.models.some((m) => m.labId === l.id)), [catalog]);
  const efforts = useMemo(() => reasoningEffortChips([...new Set(catalog.models.flatMap((m) => m.efforts))]), [catalog.models]);
  const q = query.trim().toLowerCase();
  const recent = (m: CatModel) => !m.releaseDate || m.releaseDate >= sel.cutoff;
  const inList = catalog.models.filter((m) => sel.passes(m));
  const hidden = catalog.models.length - inList.length;
  const shown = inList.filter((m) => !q || m.name.toLowerCase().includes(q) || (labName.get(m.labId) ?? "").toLowerCase().includes(q))
    .sort((a, b) => Number(recent(b)) - Number(recent(a)) || (b.score ?? -1) - (a.score ?? -1) || b.results - a.results);
  const stateOf = (m: CatModel): Check => {
    if (!sel.ticked(m)) return "off";
    const on = m.efforts.filter((e) => sel.effortOn(m.id, e)).length;
    const allowed = m.efforts.filter((e) => !sel.effortsOff.includes(e) || sel.effortOn(m.id, e)).length;
    return on === 0 ? "off" : on >= allowed ? "on" : "mixed";
  };
  const toggle = (k: string) => setOpen(open === k ? null : k);
  const months = (n: number) => (n === 12 ? "Last year" : `Last ${n} months`);
  const labsOn = labs.length - sel.labsOff.length;
  const effOn = efforts.filter((e) => !sel.effortsOff.includes(e)).length;
  const allModels = !sel.preset && sel.shown.length === catalog.models.length;
  const applyPreset = (id: string) => {
    if (sel.preset === id) { sel.reset(); return; }
    const p = PRESETS.find((x) => x.id === id)!, picked = p.pick(catalog.models, catalog.asOf);
    if (!picked) { setSavedNote(true); return; }
    sel.set(tickOnly(sel, picked, id));
  };
  const save = () => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(sel.shown.map((m) => m.id))); setSavedNote(false); } catch { /* private mode */ } };
  const patch = (p: Partial<SelState>) => sel.set(p);
  return (
    <div className="oa-picker" data-align={align} data-above={above || undefined} role="dialog" aria-label="Choose models" style={{ maxHeight }}>
      <div className="oa-ppad"><SearchBox value={query} onChange={setQuery} placeholder="Search models or labs" label="Search models" autoFocus /></div>
      <div className="oa-pscroll">
        <section className="oa-pblk">
          <h4><IconFilter size={13} stroke={1.8} aria-hidden="true" />Filters <small>narrow the list and the charts</small></h4>
          <FilterRow icon={<IconBuilding size={15} stroke={1.6} />} label="Lab" value={sel.labsOff.length ? `${labsOn} of ${labs.length} labs` : "All labs"} help="Only list and chart models from these labs." active={!!sel.labsOff.length} open={open === "lab"} onToggle={() => toggle("lab")} onClear={() => patch({ labsOff: [] })}>
            <div className="oa-pchips">{labs.map((l) => { const on = !sel.labsOff.includes(l.id); return <button key={l.id} type="button" aria-pressed={on} onClick={() => patch({ labsOff: on ? [...sel.labsOff, l.id] : sel.labsOff.filter((x) => x !== l.id) })}><i style={{ background: color.get(l.id) }} />{l.name}</button>; })}</div>
          </FilterRow>
          <FilterRow icon={<IconCalendar size={15} stroke={1.6} />} label="Released" value={months(sel.months)} help="Models released in this window are ticked. Older ones stay in the list; tick them to add them." active={sel.months !== 3} open={open === "rel"} onToggle={() => toggle("rel")} onClear={() => patch({ months: 3 })}>
            <Seg label="Release window" value={sel.months} options={WINDOWS.map((n) => [n, n === 12 ? "1 year" : `${n} months`])} onChange={(n) => patch({ months: n })} />
          </FilterRow>
          <FilterRow icon={<IconBrain size={15} stroke={1.6} />} label="Levels allowed" value={effOn === efforts.length ? "All levels" : `${effOn} of ${efforts.length} levels`} help="Which reasoning levels count on every chart. Each model shows its best level that is allowed." active={sel.effortsOff.join(",") !== "none"} open={open === "eff"} onToggle={() => toggle("eff")} onClear={() => patch({ effortsOff: ["none"] })}>
            <div className="oa-pchips">{efforts.map((e) => <button key={e} type="button" aria-pressed={!sel.effortsOff.includes(e)} onClick={() => sel.toggleEffort(e)}>{e === "none" ? "None" : effortName(e)}</button>)}</div>
          </FilterRow>
          <FilterRow icon={<IconLockOpen size={15} stroke={1.6} />} label="Weights" value={{ all: "All", open: "Open only", closed: "Closed only" }[sel.weights]} help="Open weights: you can download and run the model yourself." active={sel.weights !== "all"} open={open === "wts"} onToggle={() => toggle("wts")} onClear={() => patch({ weights: "all" })}>
            <Seg label="Weights" value={sel.weights} options={[["all", "All"], ["open", "Open", "Weights you can download"], ["closed", "Closed", "API only"]]} onChange={(w) => patch({ weights: w })} />
          </FilterRow>
          <FilterRow icon={<IconEye size={15} stroke={1.6} />} label="Tasks" value={{ all: "All", public: "Public only", closed: "Closed only" }[sel.tasks]} help="Public: anyone can read the questions. Closed: the questions are kept private. Applies to benchmarks; ones we have no record for show only under All." active={sel.tasks !== "all"} open={open === "tasks"} onToggle={() => toggle("tasks")} onClear={() => patch({ tasks: "all" })}>
            <Seg label="Tasks" value={sel.tasks} options={[["all", "All"], ["public", "Public", "Benchmarks whose questions anyone can read"], ["closed", "Closed", "Benchmarks whose questions are not published"]]} onChange={(t) => patch({ tasks: t })} />
          </FilterRow>
          <FilterRow icon={<IconShieldCheck size={15} stroke={1.6} />} label="Coverage" value={sel.cov > 1 ? `${sel.cov}+ of ${catalog.indexSize}` : "Any"} help={`The Open Index averages the index benchmarks a model has results on. Hide models with results on fewer of the ${catalog.indexSize}.`} active={sel.cov > 1} open={open === "cov"} onToggle={() => toggle("cov")} onClear={() => patch({ cov: 1 })}>
            <Seg label="Minimum coverage" value={sel.cov} options={[1, Math.ceil(catalog.indexSize / 2), catalog.indexSize - 2, catalog.indexSize - 1, catalog.indexSize].filter((n, i, a) => a.indexOf(n) === i).map((n) => [n, n === 1 ? "Any" : `${n}+`])} onChange={(n) => patch({ cov: n })} />
          </FilterRow>
        </section>
        <section className="oa-pblk">
          <h4><IconWand size={13} stroke={1.8} aria-hidden="true" />Select <small>ticks models for you</small></h4>
          <div className="oa-qline" role="group" aria-label="Quick select">
            <button type="button" aria-pressed={allModels} title={`Every model, any release date (${catalog.models.length} models)`} onClick={() => sel.set(tickOnly(sel, catalog.models, null))}>All models</button>
            {PRESETS.map((p) => <button key={p.id} type="button" aria-pressed={sel.preset === p.id} title={p.description} onClick={() => applyPreset(p.id)}>{p.name}</button>)}
            <button type="button" className="oa-qsave" onClick={save} title="Save the ticked models in this browser; Saved brings them back"><IconDeviceFloppy size={13} stroke={1.8} aria-hidden="true" />Save</button>
          </div>
          {savedNote && <p className="oa-pnote">Nothing saved yet. Tick the models you want, then click Save.</p>}
        </section>
        <section className="oa-pblk">
          <h4><IconChartBar size={13} stroke={1.8} aria-hidden="true" />Show on charts <small>every chart on this page</small></h4>
          <div className="oa-prow2" title="Best per model: one bar per model at its best reasoning level (shown under the name). All levels: a bar for every level that is on.">
            <span className="oa-pl"><IconLayersSubtract size={15} stroke={1.6} />Reasoning levels</span>
            <Seg label="Reasoning levels" value={sel.levels} options={[["best", "Best per model", "One bar per model, at its best level"], ["all", "All levels", "A bar for every reasoning level that is on"]]} onChange={(v) => patch({ levels: v })} />
          </div>
          <div className="oa-prow2" title="Big charts show the 12 best bars, or every model you ticked. Benchmark cards show their top 8.">
            <span className="oa-pl"><IconChartBar size={15} stroke={1.6} />Bars</span>
            <Seg label="Bars" value={sel.bars} options={[["top", "Top 12", "The 12 best bars on each big chart"], ["all", `All ${sel.shown.length} models`, "A bar for every ticked model"]]} onChange={(v) => patch({ bars: v })} />
          </div>
        </section>
        <section className="oa-pblk">
          <h4><IconListCheck size={13} stroke={1.8} aria-hidden="true" />Models <small><b>{sel.shown.length}</b> of {catalog.models.length} on the charts{hidden ? ` · ${hidden} hidden by filters` : ""}</small></h4>
          <div className="oa-plist">
            {shown.map((m) => {
              const st = stateOf(m);
              return <div key={m.id} className="oa-pgroup">
                <button type="button" role="checkbox" aria-checked={st === "mixed" ? "mixed" : st === "on"} className="oa-pmodel" data-state={st} onClick={() => sel.setModels([m], st !== "on")}>
                  <Box state={st} color={color.get(m.labId)} /><span>{m.name}</span><small>{labName.get(m.labId) ?? m.labId}{recent(m) ? "" : " · older"}</small>
                </button>
                {m.efforts.length > 1 && m.efforts.map((e) => { const on = sel.ticked(m) && sel.effortOn(m.id, e); return (
                  <button key={e} type="button" role="checkbox" aria-checked={on} className="oa-pmodel" data-level="1" data-state={on ? "on" : "off"} onClick={() => sel.toggleVariant(m.id, e)}>
                    <Box state={on ? "on" : "off"} color={color.get(m.labId)} /><span>{effortName(e)}</span>
                  </button>); })}
              </div>;
            })}
            {!shown.length && <p className="oa-pnote">{q ? `No models match “${query}”.` : "Every model is hidden by the filters."}</p>}
          </div>
        </section>
      </div>
      <div className="oa-pfoot">
        <button type="button" onClick={() => sel.setModels(shown, false)} disabled={!shown.length} title="Untick the models in this list"><IconSquareOff size={14} stroke={1.7} aria-hidden="true" />{q ? "Clear matches" : "Clear"}</button>
        <button type="button" onClick={() => sel.setModels(shown, true)} disabled={!shown.length} title="Tick the models in this list"><IconChecks size={14} stroke={1.7} aria-hidden="true" />{q ? `Select ${shown.length} matches` : "Select all"}</button>
        <button type="button" onClick={sel.reset} disabled={sel.isDefault} title="Back to the default models and filters"><IconRotate size={14} stroke={1.7} aria-hidden="true" />Reset</button>
      </div>
    </div>
  );
}

/** "Models · N of M" button at the top right of a chart. Every chart's button opens the same shared selection. */
export function ModelsButton({ align = "right" }: { align?: "left" | "right" }) {
  const sel = useSelection();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ maxHeight: 560, above: false });
  const close = useCallback(() => setOpen(false), []);
  const root = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    if (open) { setOpen(false); return; }
    // The panel overlays the page and fits the space next to the button (below, or above when that is roomier); the page itself never moves.
    const r = btn.current!.getBoundingClientRect(), header = 64;
    const below = window.innerHeight - r.bottom - 18, over = r.top - header - 18;
    const above = below < 420 && over > below;
    setPlace({ maxHeight: Math.max(280, Math.min(640, above ? over : below)), above });
    setOpen(true);
  };
  return (
    <div ref={root} className="oa-pwrap">
      <button ref={btn} type="button" className="oa-pbtn" aria-expanded={open} aria-haspopup="dialog" onClick={toggle} title="Choose which models every chart on this page shows">
        <span>Models · <b>{sel.shown.length}</b> of {sel.catalog.models.length}</span><IconSelector size={14} stroke={1.7} aria-hidden="true" />
      </button>
      {open && <PickerPanel onClose={close} within={root} maxHeight={place.maxHeight} above={place.above} align={align} />}
    </div>
  );
}
