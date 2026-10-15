"use client";
import { useEffect, useState } from "react";

/** Height of the sticky header; content under it doesn't count as visible. */
const HEADER = 76;

/**
 * Section index (squares turn solid for the section you're reading). The active section is the one with the most
 * of the viewport on screen, so it follows the scroll exactly: seeing only the top of Providers no longer leaves
 * Speed & Latency highlighted.
 */
export function SideNav({ items }: { items: { id: string; label: string; tag?: string }[] }) {
  const [on, setOn] = useState(items[0]?.id);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = HEADER, bottom = window.innerHeight;
      let best = items[0]?.id, bestVisible = -1;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        // The section's own box runs to the start of the next one (its gap belongs to neither).
        const visible = Math.max(0, Math.min(r.bottom, bottom) - Math.max(r.top, top));
        if (visible > bestVisible) { best = item.id; bestVisible = visible; }
      }
      // Scrolled to the very end: the last section is where you are, even if a taller one still fills more of the screen.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) best = items[items.length - 1]?.id ?? best;
      setOn((prev) => (prev === best ? prev : best));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Sections grow as charts mount; re-measure when the page height changes.
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); ro.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [items]);
  return (
    <nav className="oa-side" aria-label="Sections">
      {items.map((i) => <a key={i.id} href={`#${i.id}`} className={on === i.id ? "on" : undefined} aria-current={on === i.id ? "location" : undefined}>{i.label}{i.tag && <small>· {i.tag}</small>}</a>)}
    </nav>
  );
}
