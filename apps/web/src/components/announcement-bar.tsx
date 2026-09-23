"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getStorefrontAnnouncementBarItems } from "@/lib/storefront-api";
import type { AnnouncementBarItem } from "@/types/storefront";

// Matches colourpop.com's own announcement bar (checked directly: a Swiper
// carousel, slides-per-view 1, loop, autoplay-delay 4000, and its wrapper's
// computed style is `transition: transform 300ms ease`) — a horizontal
// slide, not a fade. Reproduced here with plain CSS transforms (no swiper
// dependency, per the "no dependency for trivial functionality" rule): one
// clone of the last item is prepended and one clone of the first item is
// appended, so both Next and Prev can slide continuously across the loop
// seam; once the transition lands on a clone, the track snaps back to the
// matching real slide with transitions off for one frame, invisibly.
const AUTOPLAY_MS = 4000;
const SLIDE_MS = 300;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

// Renders as a flex row's children (see the slide wrapper below), not a
// single element — so a long message can truncate with an ellipsis on its
// own without ever pushing the "Shop Now →" button off-screen or cutting it
// away along with the message's tail.
function MessageContent({ item }: { item: AnnouncementBarItem }) {
  if (!item.linkUrl) return <span className="min-w-0 truncate">{item.message}</span>;
  const isExternal = /^https?:\/\//iu.test(item.linkUrl);
  const externalProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

  // With a button label, the message stays plain text and only the label
  // itself becomes the link (e.g. "Free shipping … Shop Now →"). Without
  // one, the whole message is the link, same as before.
  if (item.linkLabel) {
    return (
      <>
        <span className="min-w-0 truncate">{item.message}</span>
        <Link
          href={item.linkUrl}
          {...externalProps}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-orange px-3 py-1 text-xs font-bold text-white transition-colors duration-150 ease-out hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:text-sm"
        >
          {item.linkLabel}
          <ArrowRight aria-hidden="true" size={14} className="shrink-0" />
        </Link>
      </>
    );
  }

  return (
    <Link href={item.linkUrl} {...externalProps} className="min-w-0 truncate underline-offset-2 hover:underline">
      {item.message}
    </Link>
  );
}

export function AnnouncementBar() {
  const [items, setItems] = useState<AnnouncementBarItem[] | null>(null);
  // `offset` indexes into the extended (clone-padded) track: 0 is the
  // prepended last-item clone, 1..n are the real items, n+1 is the
  // appended first-item clone. Starts at 1 (the real first item).
  const [offset, setOffset] = useState(1);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getStorefrontAnnouncementBarItems()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        // A failed fetch just leaves the bar hidden — never blocks the rest
        // of the page or shows a broken/empty strip.
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    countRef.current = items?.length ?? 0;
  }, [items]);

  const step = useCallback((direction: 1 | -1) => {
    const count = countRef.current;
    if (count === 0) return;
    setTransitionEnabled(true);
    setOffset((prev) => {
      const next = prev + direction;
      // Browser timers can queue while a tab is backgrounded. Keep the
      // clone-padded track in range so a delayed burst never translates past
      // every slide and leaves an empty announcement bar.
      if (next > count + 1) return 1;
      if (next < 0) return count;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!items || items.length < 2 || paused || reducedMotion) return;
    timerRef.current = setInterval(() => step(1), AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items, paused, reducedMotion, step]);

  // After a slide onto a clone finishes, snap back to the equivalent real
  // slide with the transition switched off for one frame — the track jumps,
  // but to the exact same visual position, so nothing appears to move.
  function handleTransitionEnd() {
    if (!items || items.length === 0) return;
    if (offset === items.length + 1) {
      setTransitionEnabled(false);
      setOffset(1);
    } else if (offset === 0) {
      setTransitionEnabled(false);
      setOffset(items.length);
    }
  }

  if (!items || items.length === 0) return null;

  const showControls = items.length > 1;
  const extended = showControls ? [items[items.length - 1]!, ...items, items[0]!] : items;
  const current = items[((offset - 1) % items.length + items.length) % items.length]!;

  return (
    <div
      // Deliberately no entrance animation here (this previously used the
      // site's .motion-enter fade-in — see globals.css's gentle-enter
      // keyframe). That animation starts at opacity:0 with fill-mode:
      // "both", so anything that interrupts it before it completes — a
      // dev-server Fast Refresh remount, a backgrounded-tab repaint, a
      // delayed animation frame on a slow device — could leave the bar
      // stuck invisible while still fully occupying its space: exactly the
      // "content not visible" bug this was reported as. The bar's whole job
      // is showing its message, so that must never depend on a decorative
      // animation finishing; it now renders fully visible the moment its
      // content is ready.
      className="relative flex items-center bg-deep-brown text-sm font-semibold text-white sm:text-base"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {showControls && (
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous announcement"
          className="absolute left-2 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:left-4"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
      )}

      <div className="w-full overflow-hidden px-12 py-3 text-center sm:px-14">
        <div
          className="flex"
          style={{
            transform: `translateX(-${offset * 100}%)`,
            transition: transitionEnabled ? `transform ${SLIDE_MS}ms ease` : "none"
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extended.map((item, i) => (
            <p key={`${item.id}-${i}`} className="flex w-full shrink-0 items-center justify-center gap-2.5 px-2" aria-hidden={item.id !== current.id}>
              <MessageContent item={item} />
            </p>
          ))}
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {current.message}
      </span>

      {showControls && (
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next announcement"
          className="absolute right-2 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-4"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      )}
    </div>
  );
}
