"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChartPaletteContext, paletteFor } from "@/components/chart/echarts";
import { HighlightContext } from "@/components/chart/highlight";
import { presetStyle, themeById } from "@/lib/page-presets";
import { savedThemeMode } from "@/lib/site-theme";
import "@/components/page/page-themes.css";

type Mode = "system" | "light" | "dark";
const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });
const STORE = "oa:theme";

/** Header switch: flips between light and dark and remembers the choice. */
export function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeContext);
  return (
    <button type="button" className="oa-theme" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark
        ? <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.6" /><path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1M4.2 4.2l1.5 1.5M14.3 14.3l1.5 1.5M4.2 15.8l1.5-1.5M14.3 5.7l1.5-1.5" /></svg>
        : <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" /></svg>}
    </button>
  );
}

/** Runs before paint so a saved dark choice doesn't flash white. */
export const THEME_SCRIPT = `try{var m=localStorage.getItem("${STORE}");var d=m==="dark"?true:m==="light"?false:matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;

/** Every page renders inside Priors' "Analysis" theme (aa / aa-dark, following the system scheme) with one shared highlight set. */
export function Shell({ models, children }: { models: { id: string; name: string; color?: string }[]; children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("system");
  const [systemDark, setSystemDark] = useState(false);
  // The server renders the light theme; until the browser's real scheme is applied, dark visitors see a dark blank page, not a flash of white.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = savedThemeMode(localStorage.getItem(STORE));
    if (saved !== "system") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- apply an explicit saved choice after hydration
      setMode(saved);
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on(); setReady(true); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const dark = mode === "system" ? systemDark : mode === "dark";
  const theme = useMemo(() => ({ dark, toggle: () => { const next = dark ? "light" : "dark"; setMode(next); try { localStorage.setItem(STORE, next); } catch { /* private mode */ } } }), [dark]);
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
    <ThemeContext.Provider value={theme}>
    <ChartPaletteContext.Provider value={palette}>
      <HighlightContext.Provider value={highlight}>
        <div className="page-root oa-root min-h-screen" data-ready={ready || undefined} data-dark={preset.dark || undefined} data-family="aa" style={presetStyle(preset) as React.CSSProperties}>{children}</div>
      </HighlightContext.Provider>
    </ChartPaletteContext.Provider>
    </ThemeContext.Provider>
  );
}
