"use client";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Dense comparisons keep their label size; arrows expose the off-screen models. */
export function BarChartScroll({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ overflow: false, start: true, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const next = { overflow: max > 2, start: el.scrollLeft < 2, end: el.scrollLeft >= max - 2 };
      setEdges((prev) => prev.overflow === next.overflow && prev.start === next.start && prev.end === next.end ? prev : next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); el.removeEventListener("scroll", update); };
  }, []);
  const scroll = (direction: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <div className={`bar-chart-frame ${className}`}>
    <div ref={ref} className="bar-chart-scroll" role="region" aria-label={`${label} chart`} tabIndex={0}>{children}</div>
    {edges.overflow && <div className="bar-chart-nav">
      <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={`Scroll ${label} left`} title="Scroll chart left"><IconChevronLeft size={16} /></button>
      <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={`Scroll ${label} right`} title="Scroll chart right"><IconChevronRight size={16} /></button>
    </div>}
  </div>;
}
