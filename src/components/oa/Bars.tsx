"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { IconAdjustmentsHorizontal, IconInfoCircle, IconLink, IconPhoto, IconRotate, IconTable } from "@tabler/icons-react";
import { useLabColor } from "./palette";
import { useLightDismiss } from "@/lib/useLightDismiss";
import { useSelection } from "./Selection";
import { ModelsButton, effortName } from "./ModelPicker";

/* ---------- hover: one model lights up in every chart; nothing re-lays out ---------- */
let hovered: string | null = null;
const listeners = new Set<() => void>();
export function setHover(id: string | null) { if (hovered !== id) { hovered = id; listeners.forEach((l) => l()); } }
export const useHover = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => hovered, () => null);

/* ---------- scales ---------- */
const STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const TICK_STEPS = [1, 2, 2.5, 5, 10];
/** A round axis top just above the largest value, so the bars on screen fill the chart. */
export function niceMax(v: number) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (STEPS.find((s) => s >= n - 1e-9) ?? 10) * p;
}
export function linearTicks(max: number, min = 0) {
  const span = max - min, raw = span / 4, p = 10 ** Math.floor(Math.log10(raw)), step = (TICK_STEPS.find((s) => s * p >= raw - 1e-9) ?? 10) * p;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-6; t += step) out.push(+t.toPrecision(10));
  return out;
}
const logLo = (v: number) => 10 ** Math.floor(Math.log10(v));
const logHi = (v: number) => 10 ** Math.ceil(Math.log10(v));
export function logTicks(lo: number, hi: number) {
  const out: number[] = [], ks = hi / lo > 1000 ? [1] : [1, 2, 5];
  for (let p = lo; p <= hi * 1.0001; p *= 10) for (const k of ks) if (p * k <= hi * 1.0001) out.push(+(p * k).toPrecision(3));
  return out;
}
export const tickText = (v: number) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : Math.abs(v) >= 1 || v === 0 ? `${+v.toFixed(2)}` : `${+v.toPrecision(2)}`);

/* ---------- text fitting ---------- */
let ctx: CanvasRenderingContext2D | null = null;
function textWidth(s: string, px: number) {
  if (typeof document === "undefined") return s.length * px * 0.55;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return s.length * px * 0.55;
  ctx.font = `500 ${px}px Geist, Inter, system-ui, sans-serif`;
  return ctx.measureText(s).width;
}
/** Model names wrap to at most two lines in the bar's slot; a cut name keeps its full text in the tooltip. */
function wrap(name: string, width: number, px: number): string[] {
  const words = name.split(/\s+/), lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (textWidth(next, px) <= width || !cur) cur = next; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length <= 2) return lines.map((l) => fit(l, width, px));
  return [lines[0], fit(lines.slice(1).join(" "), width, px)];
}
function fit(s: string, width: number, px: number) {
  if (textWidth(s, px) <= width) return s;
  let t = s;
  while (t.length > 2 && textWidth(`${t}…`, px) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/* ---------- bars ---------- */
export interface Bar {
  key: string; modelId: string; name: string; labId: string; effort: string; value: number; releaseDate?: string;
  /** Extra tooltip lines (already formatted). */ tip?: string[];
  /** Faded: e.g. fewer index results than the rest. */ fade?: boolean;
  /** Small note above the value (e.g. coverage "8/10"). */ note?: string;
  /** For metrics that aren't scores (cost, speed): the level's Open Index score, so "best per model" means the model's best level, not its cheapest. */ pick?: number;
}
export interface BarSettings { vals: boolean; sort: "value" | "name" | "date"; log: boolean }
export const levelText = (e: string) => (e === "default" ? "" : e === "none" ? "no reasoning" : e);

export function sortBars(bars: Bar[], better: "higher" | "lower", sort: BarSettings["sort"]) {
  const v = bars.slice();
  if (sort === "name") return v.sort((a, b) => a.name.localeCompare(b.name) || (better === "higher" ? b.value - a.value : a.value - b.value));
  if (sort === "date") return v.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || (better === "higher" ? b.value - a.value : a.value - b.value));
  return v.sort((a, b) => (better === "higher" ? b.value - a.value : a.value - b.value));
}

/** Vertical bars, best first, value above, model name and reasoning level under each bar. Fixed height: nothing moves when the selection changes. */
export function VBars({ bars: all, format, axis, height = 320, max: cap, log, vals = true, aria, svgRef, empty, scroll = false }: {
  bars: Bar[]; /** Every bar, scrolling sideways when they don't fit; otherwise the best ones that fit. */ scroll?: boolean; format: (v: number) => string; axis?: (v: number) => string; height?: number; max?: number; log?: boolean; vals?: boolean; aria: string;
  svgRef?: React.RefObject<SVGSVGElement | null>; empty?: ReactNode;
}) {
  const labColor = useLabColor();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const hov = useHover();
  const [tip, setTip] = useState<{ x: number; y: number; b: Bar } | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const color = labColor;
  const left = 40, minBand = 54;
  const bars = scroll || !w ? all : all.slice(0, Math.max(1, Math.floor((w - left) / minBand)));
  const n = bars.length;
  // Many bars scroll sideways inside the card instead of squeezing names together.
  const width = Math.max(w, left + n * minBand);
  const band = n ? (width - left) / n : 0, bw = Math.min(56, band * 0.66);
  const px = band < 64 ? 10.5 : 11.5;
  const names = bars.map((b) => wrap(b.name, band - 6, px));
  const anyLevel = bars.some((b) => levelText(b.effort));
  const lines = Math.max(1, ...names.map((l) => l.length));
  const anyNote = bars.some((b) => b.note);
  const top = anyNote ? 34 : 22, bottom = 14 + lines * 14 + (anyLevel ? 14 : 0);
  const pos = bars.map((b) => b.value).filter((v) => v > 0);
  const useLog = !!log && pos.length === n && n > 0;
  const hi = Math.max(0, ...bars.map((b) => b.value));
  const lo = useLog ? logLo(Math.min(...pos) * 0.9) : 0;
  const max = useLog ? logHi(hi * 1.08) : Math.min(cap ?? Infinity, niceMax(hi * 1.06));
  const plot = height - top - bottom;
  const y = (v: number) => (useLog
    ? top + plot * (1 - (Math.log10(Math.max(lo, v)) - Math.log10(lo)) / (Math.log10(max) - Math.log10(lo) || 1))
    : top + plot * (1 - (Math.max(0, v) - lo) / (max - lo || 1)));
  const ticks = useLog ? logTicks(lo, max) : linearTicks(max);
  const fmtAxis = axis ?? tickText;
  return (
    <div ref={box} className="oa-chart" style={{ height }} onMouseLeave={() => { setTip(null); setHover(null); }}>
      {!n ? <div className="oa-chempty" style={{ height }}>{empty ?? "No model matches the selection."}</div> : w > 0 && (
        <div className="oa-chscroll" style={{ overflowX: width > w ? "auto" : "hidden" }}>
          <svg ref={svgRef} width={width} height={height} role="img" aria-label={aria} className="oa-svg" data-hov={hov && bars.some((b) => b.modelId === hov) ? "" : undefined}>
            {ticks.map((t) => <g key={t}><line className="oa-grid" x1={left} x2={width} y1={y(t)} y2={y(t)} /><text className="oa-tick" x={left - 8} y={y(t) + 4} textAnchor="end">{fmtAxis(t)}</text></g>)}
            {bars.map((b, i) => {
              const cx = left + band * (i + 0.5), yv = y(b.value), on = hov === b.modelId;
              return (
                <g key={b.key} className="oa-bar" data-on={on || undefined} data-fade={b.fade || undefined}
                  onMouseEnter={(e) => { setHover(b.modelId); const r = box.current!.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: yv, b }); }}
                  onMouseMove={(e) => { const r = box.current!.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: yv, b }); }}>
                  <rect x={cx - band / 2} y={0} width={band} height={height} fill="transparent" />
                  <rect className="oa-barfill" x={cx - bw / 2} y={yv} width={bw} height={Math.max(1, y(lo) - yv)} rx={3} fill={color(b.labId)} />
                  {vals && <text className="oa-val" x={cx} y={yv - 6} textAnchor="middle" style={{ fontSize: band < 44 ? 9.5 : 11.5 }}>{format(b.value)}</text>}
                  {b.note && <text className="oa-note" x={cx} y={yv - (vals ? 21 : 6)} textAnchor="middle">{b.note}</text>}
                  {names[i].map((l, k) => <text key={k} className="oa-name" x={cx} y={height - bottom + 16 + k * 14} textAnchor="middle" style={{ fontSize: px }}>{l}</text>)}
                  {levelText(b.effort) && <text className="oa-level" x={cx} y={height - bottom + 16 + names[i].length * 14} textAnchor="middle">{levelText(b.effort)}</text>}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      {tip && <div className="oa-tip" style={{ left: Math.min(Math.max(8, tip.x + 12), Math.max(8, w - 220)), top: Math.max(4, tip.y - 10) }}>
        <b>{tip.b.name}</b>{levelText(tip.b.effort) && <span> · {effortName(tip.b.effort)}</span>}
        <div>{format(tip.b.value)}</div>
        {tip.b.tip?.map((t) => <div key={t} className="oa-tipsub">{t}</div>)}
      </div>}
    </div>
  );
}

/** Horizontal bars, names on the left: for long rankings such as Build your index. */
export function HBars({ bars, format, max: cap, aria, svgRef, empty, rows: minRows = 0 }: { bars: Bar[]; format: (v: number) => string; max?: number; aria: string; svgRef?: React.RefObject<SVGSVGElement | null>; empty?: ReactNode;
  /** Keep room for this many rows, so the page doesn't move when fewer models are selected. */ rows?: number }) {
  const labColor = useLabColor();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const hov = useHover();
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const row = 26, label = Math.min(220, Math.max(130, w * 0.24)), right = 56;
  const max = Math.min(cap ?? Infinity, niceMax(Math.max(0, ...bars.map((b) => b.value)) * 1.02));
  const x = (v: number) => label + (w - label - right) * (Math.max(0, v) / (max || 1));
  const height = Math.max(row, Math.max(bars.length, minRows) * row + 8);
  return (
    <div ref={box} className="oa-chart" style={{ minHeight: minRows ? height : undefined }} onMouseLeave={() => setHover(null)}>
      {!bars.length && <div className="oa-chempty" style={{ height: minRows ? height : 160 }}>{empty ?? "No model matches the selection."}</div>}
      {w > 0 && !!bars.length && <svg ref={svgRef} width={w} height={height} role="img" aria-label={aria} className="oa-svg" data-hov={hov && bars.some((b) => b.modelId === hov) ? "" : undefined}>
        {bars.map((b, i) => {
          const yy = 4 + i * row, on = hov === b.modelId, lvl = levelText(b.effort);
          return (
            <g key={b.key} className="oa-bar" data-on={on || undefined} onMouseEnter={() => setHover(b.modelId)}>
              <title>{`${b.name}${lvl ? ` · ${effortName(b.effort)}` : ""}: ${format(b.value)}${b.tip?.length ? `\n${b.tip.join("\n")}` : ""}`}</title>
              <rect x={0} y={yy} width={w} height={row} fill="transparent" />
              <text className="oa-name" x={label - 10} y={yy + 17} textAnchor="end" style={{ fontSize: 12.5 }}>{fit(b.name, label - (lvl ? 70 : 16), 12.5)}{lvl && <tspan className="oa-level" dx={6}>{lvl}</tspan>}</text>
              <rect className="oa-barfill" x={label} y={yy + 5} width={Math.max(1, x(b.value) - label)} height={row - 10} rx={3} fill={labColor(b.labId)} />
              <text className="oa-val" x={x(b.value) + 6} y={yy + 17}>{format(b.value)}</text>
            </g>
          );
        })}
      </svg>}
    </div>
  );
}

/* ---------- export ---------- */
function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** The chart as a PNG: the SVG with its computed colours, on the card background, at 2×. */
export function savePng(svg: SVGSVGElement | null, title: string) {
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = svg.querySelectorAll("*"), dst = clone.querySelectorAll("*");
  src.forEach((el, i) => { const cs = getComputedStyle(el), d = dst[i] as SVGElement; for (const p of ["fill", "stroke", "opacity", "font-size", "font-weight", "font-family", "stroke-dasharray", "fill-opacity"]) d.style.setProperty(p, cs.getPropertyValue(p)); });
  const w = svg.width.baseVal.value, h = svg.height.baseVal.value, bg = getComputedStyle(svg.closest(".oa-card") ?? document.body).backgroundColor;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = w * 2; c.height = (h + 40) * 2;
    const g = c.getContext("2d")!; g.scale(2, 2); g.fillStyle = bg; g.fillRect(0, 0, w, h + 40);
    g.fillStyle = getComputedStyle(svg).color; g.font = "600 15px Geist, Inter, sans-serif"; g.fillText(title, 12, 24);
    g.drawImage(img, 0, 36);
    c.toBlob((b) => b && download(`${slug(title)}.png`, b));
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
}
export function saveCsv(title: string, header: string[], rows: (string | number | undefined)[][]) {
  const cell = (v: string | number | undefined) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  download(`${slug(title)}.csv`, new Blob([[header, ...rows].map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" }));
}

/* ---------- card ---------- */
function Settings({ title, settings, onChange, canLog, defaults, sortBest }: { title: string; settings: BarSettings; onChange: (s: BarSettings) => void; canLog: boolean; defaults: BarSettings; sortBest: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useLightDismiss(root, useCallback(() => setOpen(false), []));
  const seg = <T extends string | boolean>(value: T, opts: [T, string, string][], set: (v: T) => void, label: string) =>
    <div className="oa-seg" role="group" aria-label={label}>{opts.map(([v, n, t]) => <button key={String(v)} type="button" aria-pressed={value === v} title={t} onClick={() => set(v)}>{n}</button>)}</div>;
  return (
    <div ref={root} className="oa-pwrap">
      <button type="button" className="oa-ibtn sm" aria-expanded={open} aria-label={`${title} settings`} title="Chart settings: values, sort, scale" onClick={() => setOpen(!open)}><IconAdjustmentsHorizontal size={16} stroke={1.6} /></button>
      {open && <div className="oa-menu oa-settings" role="dialog" aria-label={`${title} settings`}>
        <div className="oa-mhead"><b>{title}</b><span>Only this chart. Hover a setting for what it does.</span></div>
        <div className="oa-srow" title="Print the number above each bar."><span>Values on bars<small>Print the number above each bar.</small></span>{seg(settings.vals, [[true, "On", "Show the numbers"], [false, "Off", "Hide the numbers"]], (v) => onChange({ ...settings, vals: v }), "Values on bars")}</div>
        <div className="oa-srow" title="Order of the bars."><span>Sort<small>Order of the bars.</small></span>{seg(settings.sort, [["value", sortBest, "By the chart's value"], ["name", "A–Z", "By model name"], ["date", "Newest", "By release date"]], (v) => onChange({ ...settings, sort: v }), "Sort")}</div>
        {canLog && <div className="oa-srow" title="Log spreads values that differ a lot, like $0.01 and $5, or 1 s and 600 s."><span>Scale<small>Log spreads values that differ a lot.</small></span>{seg(settings.log, [[false, "Linear", "Even steps"], [true, "Log", "Each step is ×10"]], (v) => onChange({ ...settings, log: v }), "Scale")}</div>}
        <div className="oa-mfoot"><button type="button" className="oa-btn sm" onClick={() => onChange(defaults)} title="Back to this chart's defaults"><IconRotate size={14} stroke={1.7} aria-hidden="true" />Reset this chart</button></div>
      </div>}
    </div>
  );
}

export function Info({ text }: { text: string }) {
  return <span className="oa-info" tabIndex={0} aria-label={text} data-tip={text}><IconInfoCircle size={14} stroke={1.7} aria-hidden="true" /></span>;
}

/** A chart card: title, one short line, an (i) for the rest, and the toolbar (models, link, image, data, settings). */
export function ChartCard({ id, title, desc, info, extra, models = true, onPng, onCsv, settings, children, small }: {
  id?: string; title: ReactNode; desc?: ReactNode; info?: string; extra?: ReactNode; models?: boolean; small?: boolean;
  onPng?: () => void; onCsv?: () => void; settings?: ReactNode; children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const link = () => {
    const url = new URL(window.location.href); if (id) url.hash = id;
    navigator.clipboard?.writeText(url.toString()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }, () => {});
  };
  return (
    <div id={id} className="oa-card" data-small={small || undefined}>
      <div className="oa-chead">
        <div className="oa-ctitle"><h3>{title}{info && <Info text={info} />}</h3>{desc && <p>{desc}</p>}</div>
        <div className="oa-ctools">
          {extra}
          {models && <ModelsButton />}
          {!small && <span className="oa-tbar">
            {id && <button type="button" className="oa-ibtn sm" onClick={link} title={copied ? "Link copied" : "Copy a link to this chart"} aria-label="Copy a link to this chart"><IconLink size={16} stroke={1.6} /></button>}
            {onPng && <button type="button" className="oa-ibtn sm" onClick={onPng} title="Download as image (PNG)" aria-label="Download as image"><IconPhoto size={16} stroke={1.6} /></button>}
            {onCsv && <button type="button" className="oa-ibtn sm" onClick={onCsv} title="Download the data (CSV)" aria-label="Download the data"><IconTable size={16} stroke={1.6} /></button>}
          </span>}
          {settings}
        </div>
      </div>
      {copied && <span className="oa-toast" role="status">Link copied</span>}
      {children}
    </div>
  );
}

/** Rows → bars under the shared selection: the right models and levels, best first, top 12 unless "All" is on. */
export function useBars(all: Bar[], better: "higher" | "lower", opts: { limit?: number; settings: BarSettings }) {
  const sel = useSelection();
  return useMemo(() => {
    const kept = sel.rows(all, (a, b) => (a.pick != null && b.pick != null ? a.pick > b.pick : better === "higher" ? a.value > b.value : a.value < b.value));
    const ordered = sortBars(sortBars(kept, better, "value").slice(0, opts.limit ?? (sel.bars === "all" ? Infinity : 12)), better, opts.settings.sort);
    return { bars: ordered, total: new Set(kept.map((b) => b.modelId)).size };
  }, [all, better, sel, opts.limit, opts.settings.sort]);
}

/** A complete bar chart card under the shared selection. */
export function BarCard({ id, title, desc, info, rows, better, format, axis, height, max, logDefault = false, canLog = false, small, limit, valueName = "Value", extra, empty, models = true }: {
  id?: string; models?: boolean; title: string; desc?: ReactNode; info?: string; rows: Bar[]; better: "higher" | "lower"; format: (v: number) => string; axis?: (v: number) => string;
  height?: number; max?: number; logDefault?: boolean; canLog?: boolean; small?: boolean; limit?: number; valueName?: string; extra?: ReactNode; empty?: ReactNode;
}) {
  const defaults: BarSettings = { vals: true, sort: "value", log: logDefault };
  const [settings, setSettings] = useState<BarSettings>(defaults);
  const svg = useRef<SVGSVGElement | null>(null);
  const sel = useSelection();
  const { bars } = useBars(rows, better, { limit, settings });
  return (
    <ChartCard id={id} title={title} desc={desc} info={info} small={small} extra={extra} models={models}
      onPng={() => savePng(svg.current, title)}
      onCsv={() => saveCsv(title, ["rank", "model", "reasoning level", valueName], bars.map((b, i) => [i + 1, b.name, b.effort, b.value]))}
      settings={<Settings title={title} settings={settings} onChange={setSettings} canLog={canLog} defaults={defaults} sortBest={better === "higher" ? "Best first" : "Lowest first"} />}>
      <VBars bars={bars} format={format} axis={axis} height={height ?? (small ? 260 : 320)} max={max} log={canLog && settings.log} vals={settings.vals} aria={`${title}, ${bars.length} models`} svgRef={svg} empty={empty} scroll={!small && sel.bars === "all"} />
    </ChartCard>
  );
}
