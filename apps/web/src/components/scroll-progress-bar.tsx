"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Global scroll-progress line pinned to the very top edge of the viewport.
 *
 * Width tracks `scrollY / (documentHeight - viewportHeight)`, clamped to 0–1,
 * and is applied as `transform: scaleX(...)` on its own fixed layer — no
 * document layout is affected and no React re-render happens while scrolling.
 * Scroll/resize handlers are coalesced through a single requestAnimationFrame.
 */
export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let frame = 0;

    const render = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      const progress = Math.min(1, Math.max(0, ratio));
      bar.style.transform = `scaleX(${progress})`;
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(render);
    };

    // Reflect the current position immediately (initial load, client-side
    // navigation, and browser back/forward scroll restoration).
    render();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-primary-orange transition-transform duration-100 ease-out motion-reduce:transition-none"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
