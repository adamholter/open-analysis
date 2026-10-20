"use client";
import { useEffect, useRef, useState } from "react";

/** "On this page": the last heading above the reading line is marked; at the end of the page, the last one. A clicked entry stays marked until you scroll yourself. */
export function Toc({ items }: { items: { id: string; label: string }[] }) {
  const [on, setOn] = useState(items[0]?.id);
  const pinned = useRef(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (pinned.current) return;
      const line = 140;
      let cur = items[0]?.id;
      for (const i of items) { const el = document.getElementById(i.id); if (el && el.getBoundingClientRect().top <= line) cur = i.id; }
      // Short sections at the end never reach the line: once the page can't scroll further, the last heading on screen wins.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        const visible = items.filter((i) => { const el = document.getElementById(i.id); return el && el.getBoundingClientRect().top < window.innerHeight; });
        if (visible.length) cur = visible[visible.length - 1].id;
      }
      setOn(cur);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const unpin = () => { pinned.current = false; schedule(); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", unpin, { passive: true }); window.addEventListener("touchmove", unpin, { passive: true }); window.addEventListener("keydown", unpin);
    return () => {
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", unpin); window.removeEventListener("touchmove", unpin); window.removeEventListener("keydown", unpin);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);
  return (
    <nav className="oa-side oa-toc" aria-label="On this page">
      <span className="oa-tochead">On this page</span>
      {items.map((i) => <a key={i.id} href={`#${i.id}`} className={on === i.id ? "on" : undefined} aria-current={on === i.id ? "location" : undefined} onClick={() => { pinned.current = true; setOn(i.id); }}>{i.label}</a>)}
    </nav>
  );
}
