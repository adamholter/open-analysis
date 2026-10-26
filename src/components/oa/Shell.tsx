"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { presetStyle } from "@/lib/page-presets";
import { ZINC, ZINC_DARK } from "@/lib/oa-theme";
import { LabColors } from "./palette";

type Mode = "system" | "light" | "dark";
const ThemeContext = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({ mode: "dark", setMode: () => {} });
const STORE = "oa:theme";
/** Zinc dark until the visitor picks something else. */
const savedMode = (v: string | null): Mode => (v === "light" || v === "system" ? v : "dark");

const ICONS: Record<Mode, ReactNode> = {
  system: <><rect x="2.5" y="3.5" width="15" height="10" rx="1.5" /><path d="M7 17h6M10 13.5V17" /></>,
  light: <><circle cx="10" cy="10" r="3.4" /><path d="M10 2v1.8M10 16.2V18M2 10h1.8M16.2 10H18M4.3 4.3l1.3 1.3M14.4 14.4l1.3 1.3M4.3 15.7l1.3-1.3M14.4 5.6l1.3-1.3" /></>,
  dark: <path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" />,
};
const NAMES: Record<Mode, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };

/** Header switch: system, light or dark; the choice is remembered. */
export function ThemeToggle() {
  const { mode, setMode } = useContext(ThemeContext);
  return (
    <div className="oa-theme" role="group" aria-label="Color theme">
      {(["system", "light", "dark"] as const).map((m) => (
        <button key={m} type="button" aria-pressed={mode === m} aria-label={NAMES[m]} title={NAMES[m]} onClick={() => setMode(m)}>
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[m]}</svg>
        </button>
      ))}
    </div>
  );
}

/** Runs before paint so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `try{var m=localStorage.getItem("${STORE}");var d=m==="light"?false:m==="system"?matchMedia("(prefers-color-scheme: dark)").matches:true;document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="dark"}`;

/** Every page renders inside the zinc theme, light or dark. */
export function Shell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("dark");
  const [systemDark, setSystemDark] = useState(true);
  // The server renders dark; until the saved choice is applied, light visitors see a blank page, not a flash of dark.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply the saved choice after hydration
    setMode(savedMode(localStorage.getItem(STORE)));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on(); setReady(true); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const dark = mode === "system" ? systemDark : mode === "dark";
  const theme = useMemo(() => ({ mode, setMode: (next: Mode) => { setMode(next); try { localStorage.setItem(STORE, next); } catch { /* private mode */ } } }), [mode]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  const preset = dark ? ZINC_DARK : ZINC;
  return (
    <ThemeContext.Provider value={theme}>
      <LabColors.Provider value={preset.labColors ?? {}}>
        <div className="oa-root min-h-screen" data-ready={ready || undefined} data-dark={preset.dark || undefined} style={presetStyle(preset) as React.CSSProperties}>{children}</div>
      </LabColors.Provider>
    </ThemeContext.Provider>
  );
}
