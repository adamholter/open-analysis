"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChartPaletteContext, paletteFor } from "@/components/chart/echarts";
import { HighlightContext } from "@/components/chart/highlight";
import { presetStyle, themeById } from "@/lib/page-presets";
import "@/components/page/page-themes.css";

/** Every page renders inside Priors' "Analysis" theme (aa / aa-dark, following the system scheme) with one shared highlight set. */
export function Shell({ models, children }: { models: { id: string; name: string; color?: string }[]; children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setDark(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  const preset = themeById(dark ? "aa-dark" : "aa")!;
  const palette = paletteFor(preset);
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    const hl = new URL(window.location.href).searchParams.get("hl");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the shared highlight from the URL after hydration
    if (hl) setItems(hl.split(",").filter(Boolean));
  }, []);
  const highlight = useMemo(() => ({ items, models, set: (next: string[]) => {
    setItems(next);
    const url = new URL(window.location.href);
    if (next.length) url.searchParams.set("hl", next.join(",")); else url.searchParams.delete("hl");
    window.history.replaceState(null, "", url.toString());
  } }), [items, models]);
  return (
    <ChartPaletteContext.Provider value={palette}>
      <HighlightContext.Provider value={highlight}>
        <div className="page-root oa-root min-h-screen" data-dark={preset.dark || undefined} data-family="aa" style={presetStyle(preset) as React.CSSProperties}>{children}</div>
      </HighlightContext.Provider>
    </ChartPaletteContext.Provider>
  );
}
