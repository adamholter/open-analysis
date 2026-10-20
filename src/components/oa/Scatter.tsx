"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconAdjustmentsHorizontal, IconRotate } from "@tabler/icons-react";
import { useLabColor } from "./palette";
import { useLightDismiss } from "@/lib/useLightDismiss";
import { useSelection } from "./Selection";
import { effortName } from "./ModelPicker";
import { ChartCard, levelText, linearTicks, logTicks, niceMax, saveCsv, savePng, setHover, tickText, useHover } from "./Bars";

export interface Point { key: string; modelId: string; name: string; labId: string; effort: string; releaseDate?: string; x: number; y: number }
interface ScatterSettings { names: boolean; frontier: boolean; log: boolean }

/** Points nothing beats: no other point is both cheaper (lower x) and better (higher y). */
export function frontier(pts: Point[]) {
  const out: Point[] = []; let best = -Infinity;
  for (const p of pts.slice().sort((a, b) => a.x - b.x || b.y - a.y)) if (p.y > best) { out.push(p); best = p.y; }
  return out;
}

interface Box { x: number; y: number; w: number; h: number }
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Score vs cost (or any lower-is-better metric): dots, the frontier, names placed so they never overlap. */
export function Scatter({ points, xName, yName, formatX, height = 420, log, names = true, showFrontier = true, svgRef }: {
  points: Point[]; xName: string; yName: string; formatX: (v: number) => string; height?: number; log?: boolean; names?: boolean; showFrontier?: boolean; svgRef?: React.RefObject<SVGSVGElement | null>;
}) {
  const labColor = useLabColor();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const hov = useHover();
  const [tip, setTip] = useState<Point | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const pad = { l: 46, r: 16, t: 14, b: 40 };
  const xs = points.map((p) => p.x).filter((v) => v > 0), ys = points.map((p) => p.y);
  const useLog = !!log && xs.length === points.length && xs.length > 0;
  const xlo = useLog ? 10 ** Math.floor(Math.log10(Math.min(...xs) * 0.9)) : 0;
  const xhi = useLog ? 10 ** Math.ceil(Math.log10(Math.max(...xs) * 1.1)) : niceMax(Math.max(0, ...xs) * 1.05);
  const ylo = Math.max(0, Math.floor((Math.min(...ys, 100) - 5) / 10) * 10), yhi = niceMax(Math.max(0, ...ys) * 1.04);
  const X = (v: number) => pad.l + (w - pad.l - pad.r) * (useLog ? (Math.log10(Math.max(xlo, v)) - Math.log10(xlo)) / (Math.log10(xhi) - Math.log10(xlo) || 1) : (v - xlo) / (xhi - xlo || 1));
  const Y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - (v - ylo) / (yhi - ylo || 1));
  const front = useMemo(() => frontier(points), [points]);
  const frontKeys = new Set(front.map((p) => p.key));
  // Names: frontier and best scores first; each tries right, left, above, below, and is skipped if all overlap.
  const labels = useMemo(() => {
    if (!names || !w) return new Map<string, { x: number; y: number; anchor: "start" | "end" | "middle"; text: string }>();
    const placed: Box[] = points.map((p) => ({ x: X(p.x) - 5, y: Y(p.y) - 5, w: 10, h: 10 }));
    const out = new Map<string, { x: number; y: number; anchor: "start" | "end" | "middle"; text: string }>();
    const order = points.slice().sort((a, b) => Number(frontKeys.has(b.key)) - Number(frontKeys.has(a.key)) || b.y - a.y);
    for (const p of order) {
      const text = levelText(p.effort) ? `${p.name} ${levelText(p.effort)}` : p.name;
      const tw = text.length * 6.1, th = 13, cx = X(p.x), cy = Y(p.y);
      const tries: [number, number, "start" | "end" | "middle", Box][] = [
        [cx + 8, cy + 4, "start", { x: cx + 7, y: cy - 7, w: tw, h: th }], [cx - 8, cy + 4, "end", { x: cx - 7 - tw, y: cy - 7, w: tw, h: th }],
        [cx, cy - 9, "middle", { x: cx - tw / 2, y: cy - 21, w: tw, h: th }], [cx, cy + 17, "middle", { x: cx - tw / 2, y: cy + 6, w: tw, h: th }],
      ];
      const ok = tries.find(([, , , b]) => b.x >= pad.l && b.x + b.w <= w - 2 && b.y >= 0 && b.y + b.h <= height - pad.b && !placed.some((q) => hit(b, q)));
      if (ok) { placed.push(ok[3]); out.set(p.key, { x: ok[0], y: ok[1], anchor: ok[2], text }); }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- X and Y follow from w, height and the points
  }, [points, names, w, height, useLog]);
  const xt = useLog ? logTicks(xlo, xhi) : linearTicks(xhi);
  const yt = linearTicks(yhi, ylo);
  return (
    <div ref={box} className="oa-chart" style={{ height }} onMouseLeave={() => { setTip(null); setHover(null); }}>
      {!points.length ? <div className="oa-chempty" style={{ height }}>No model matches the selection.</div> : w > 0 && (
        <svg ref={svgRef} width={w} height={height} role="img" aria-label={`${yName} versus ${xName}`} className="oa-svg" data-hov={hov && points.some((p) => p.modelId === hov) ? "" : undefined}>
          {yt.map((t) => <g key={`y${t}`}><line className="oa-grid" x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} /><text className="oa-tick" x={pad.l - 8} y={Y(t) + 4} textAnchor="end">{tickText(t)}</text></g>)}
          {xt.map((t) => <g key={`x${t}`}><line className="oa-grid" x1={X(t)} x2={X(t)} y1={pad.t} y2={height - pad.b} /><text className="oa-tick" x={X(t)} y={height - pad.b + 16} textAnchor="middle">{formatX(t)}</text></g>)}
          <text className="oa-axis" x={(pad.l + w - pad.r) / 2} y={height - 6} textAnchor="middle">{xName}{useLog ? " (log scale)" : ""}</text>
          <text className="oa-axis" x={12} y={(pad.t + height - pad.b) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(pad.t + height - pad.b) / 2})`}>{yName}</text>
          {showFrontier && front.length > 1 && <polyline className="oa-front" points={front.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} />}
          {points.map((p) => {
            const l = labels.get(p.key), on = hov === p.modelId;
            return (
              <g key={p.key} className="oa-bar" data-on={on || undefined} onMouseEnter={() => { setHover(p.modelId); setTip(p); }}>
                <circle cx={X(p.x)} cy={Y(p.y)} r={12} fill="transparent" />
                <circle className="oa-dot2" cx={X(p.x)} cy={Y(p.y)} r={frontKeys.has(p.key) ? 5.5 : 4.5} fill={labColor(p.labId)} />
                {l && <text className="oa-plabel" x={l.x} y={l.y} textAnchor={l.anchor}>{l.text}</text>}
              </g>
            );
          })}
        </svg>
      )}
      {tip && <div className="oa-tip" style={{ left: Math.min(Math.max(8, X(tip.x) + 14), Math.max(8, w - 220)), top: Math.max(4, Y(tip.y) - 12) }}>
        <b>{tip.name}</b>{levelText(tip.effort) && <span> · {effortName(tip.effort)}</span>}
        <div>{yName}: {tip.y.toFixed(1)}</div><div>{xName}: {formatX(tip.x)}</div>
        {frontKeys.has(tip.key) && <div className="oa-tipsub">On the frontier: nothing is both cheaper and better.</div>}
      </div>}
    </div>
  );
}

function ScatterMenu({ title, s, set, defaults }: { title: string; s: ScatterSettings; set: (s: ScatterSettings) => void; defaults: ScatterSettings }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useLightDismiss(root, useCallback(() => setOpen(false), []));
  const seg = (value: boolean, a: [string, string], b: [string, string], onSet: (v: boolean) => void, label: string) =>
    <div className="oa-seg" role="group" aria-label={label}><button type="button" aria-pressed={value} title={a[1]} onClick={() => onSet(true)}>{a[0]}</button><button type="button" aria-pressed={!value} title={b[1]} onClick={() => onSet(false)}>{b[0]}</button></div>;
  return (
    <div ref={root} className="oa-pwrap">
      <button type="button" className="oa-ibtn sm" aria-expanded={open} aria-label={`${title} settings`} title="Chart settings: names, frontier, scale" onClick={() => setOpen(!open)}><IconAdjustmentsHorizontal size={16} stroke={1.6} /></button>
      {open && <div className="oa-menu oa-settings" role="dialog" aria-label={`${title} settings`}>
        <div className="oa-mhead"><b>{title}</b><span>Only this chart. Hover a setting for what it does.</span></div>
        <div className="oa-srow" title="Write the model name next to each dot. Off leaves only the dots; hover still shows them."><span>Names<small>Name next to each dot.</small></span>{seg(s.names, ["On", "Names next to the dots"], ["Off", "Dots only"], (v) => set({ ...s, names: v }), "Names")}</div>
        <div className="oa-srow" title="The dotted line joins the models nothing beats: none is both cheaper and better."><span>Frontier line<small>Models nothing beats.</small></span>{seg(s.frontier, ["On", "Show the frontier"], ["Off", "Hide the frontier"], (v) => set({ ...s, frontier: v }), "Frontier line")}</div>
        <div className="oa-srow" title="Log spreads values that differ a lot, like $0.01 and $5."><span>Horizontal scale<small>Log spreads values that differ a lot.</small></span>{seg(s.log, ["Log", "Each step is ×10"], ["Linear", "Even steps"], (v) => set({ ...s, log: v }), "Horizontal scale")}</div>
        <div className="oa-mfoot"><button type="button" className="oa-btn sm" onClick={() => set(defaults)} title="Back to this chart's defaults"><IconRotate size={14} stroke={1.7} aria-hidden="true" />Reset this chart</button></div>
      </div>}
    </div>
  );
}

/** A Pareto card under the shared selection. */
export function ScatterCard({ id, title, desc, info, points, xName, yName, formatX, height }: { id?: string; title: string; desc?: string; info?: string; points: Point[]; xName: string; yName: string; formatX: (v: number) => string; height?: number }) {
  const sel = useSelection();
  const defaults: ScatterSettings = { names: true, frontier: true, log: true };
  const [s, set] = useState<ScatterSettings>(defaults);
  const svg = useRef<SVGSVGElement | null>(null);
  const shown = useMemo(() => sel.rows(points, (a, b) => a.y > b.y), [sel, points]);
  return (
    <ChartCard id={id} title={title} desc={desc} info={info}
      onPng={() => savePng(svg.current, title)} onCsv={() => saveCsv(title, ["model", "reasoning level", yName, xName], shown.map((p) => [p.name, p.effort, p.y, p.x]))}
      settings={<ScatterMenu title={title} s={s} set={set} defaults={defaults} />}>
      <Scatter points={shown} xName={xName} yName={yName} formatX={formatX} height={height} log={s.log} names={s.names} showFrontier={s.frontier} svgRef={svg} />
    </ChartCard>
  );
}
