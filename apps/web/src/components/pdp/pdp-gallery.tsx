"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import type { ProductImage as ProductImageType } from "@/types/storefront";

// useLayoutEffect measures and applies the rail height cap before the browser
// paints, so the tall unmeasured list never flashes on screen. It's a no-op
// warning-generating call during SSR, so it falls back to useEffect there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Auto-rotation cadence. One timeout per advance (never a setInterval), rebuilt
// on every selectedIndex change so a manual pick always gets a full interval.
const ROTATE_INTERVAL_MS = 4500;

function keepThumbnailVisible(rail: HTMLDivElement, thumbnail: HTMLButtonElement) {
  const railRect = rail.getBoundingClientRect();
  const thumbnailRect = thumbnail.getBoundingClientRect();
  let top = rail.scrollTop;
  let left = rail.scrollLeft;

  if (thumbnailRect.top < railRect.top) {
    top += thumbnailRect.top - railRect.top;
  } else if (thumbnailRect.bottom > railRect.bottom) {
    top += thumbnailRect.bottom - railRect.bottom;
  }

  if (thumbnailRect.left < railRect.left) {
    left += thumbnailRect.left - railRect.left;
  } else if (thumbnailRect.right > railRect.right) {
    left += thumbnailRect.right - railRect.right;
  }

  if (top === rail.scrollTop && left === rail.scrollLeft) return;

  // Scroll only the thumbnail rail. In particular, do not use
  // Element.scrollIntoView(), which may also move the document viewport.
  if (typeof rail.scrollTo === "function") {
    rail.scrollTo({ top, left, behavior: "smooth" });
  } else {
    rail.scrollTop = top;
    rail.scrollLeft = left;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export function PdpGallery({
  images,
  primaryImage,
  productName,
  tone,
  isOutOfStock,
  onImageChange,
}: {
  images: ProductImageType[];
  primaryImage: ProductImageType | null;
  productName: string;
  tone: PlaceholderTone;
  isOutOfStock: boolean;
  onImageChange?: () => void;
}) {
  // The navigable image set. Thumbnails, arrows, swipe and auto-rotation all
  // operate on this one list; `primaryImage` only decides the starting index.
  const galleryImages = images;
  const imagesKey = useMemo(() => galleryImages.map((img) => img.id).join(","), [galleryImages]);

  const resolveInitialIndex = useCallback(() => {
    if (primaryImage) {
      const found = galleryImages.findIndex((img) => img.id === primaryImage.id);
      if (found >= 0) return found;
    }
    return 0;
  }, [galleryImages, primaryImage]);

  // The single authoritative selection — both the main image and the active
  // thumbnail derive from this.
  const [selectedIndex, setSelectedIndex] = useState(resolveInitialIndex);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());

  // A new product (route change / a variant that swaps the image set) resets
  // the gallery to that product's intended first image — never keeps a stale
  // index. Render-phase adjustment on a change of inputs, the same
  // "information from previous renders" pattern product-detail.tsx already uses
  // for the variant/quantity clamp.
  const [prevImagesKey, setPrevImagesKey] = useState(imagesKey);
  const [prevPrimaryId, setPrevPrimaryId] = useState<number | null>(primaryImage?.id ?? null);
  if (imagesKey !== prevImagesKey || (primaryImage?.id ?? null) !== prevPrimaryId) {
    setPrevImagesKey(imagesKey);
    setPrevPrimaryId(primaryImage?.id ?? null);
    setSelectedIndex(resolveInitialIndex());
    setBrokenImageIds(new Set());
  }

  // Indices that are safe to show / rotate into — a broken image is skipped by
  // auto-rotation so it never lands on a blank slot.
  const usableIndices = useMemo(
    () => galleryImages.map((_, index) => index).filter((index) => !brokenImageIds.has(galleryImages[index]!.id)),
    [galleryImages, brokenImageIds]
  );
  const usableKey = usableIndices.join(",");
  const canRotate = usableIndices.length > 1;
  const hasMultiple = galleryImages.length > 1;

  const currentImage = galleryImages[selectedIndex] ?? primaryImage ?? null;
  const isCurrentBroken = currentImage ? brokenImageIds.has(currentImage.id) : true;
  const currentNumber = galleryImages.findIndex((img) => img.id === (currentImage?.id ?? -1)) + 1;

  const step = useCallback(
    (delta: 1 | -1) => {
      setSelectedIndex((current) => {
        if (usableIndices.length === 0) return current;
        if (usableIndices.length === 1) return usableIndices[0]!;
        const pos = usableIndices.indexOf(current);
        if (pos !== -1) {
          return usableIndices[(pos + delta + usableIndices.length) % usableIndices.length]!;
        }
        // The current image is broken — walk raw indices in the travel
        // direction to the next usable one, wrapping.
        const total = galleryImages.length;
        for (let i = 1; i <= total; i += 1) {
          const candidate = (((current + delta * i) % total) + total) % total;
          if (usableIndices.includes(candidate)) return candidate;
        }
        return usableIndices[0]!;
      });
    },
    [usableIndices, galleryImages.length]
  );

  const selectIndex = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      onImageChange?.();
    },
    [onImageChange]
  );

  const handleImageError = (imageId: number) => {
    setBrokenImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  // --- Auto-rotation ------------------------------------------------------
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => setIsPageHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const autoplayActive = canRotate && !isHovered && !isFocusWithin && !isPageHidden && !prefersReducedMotion;

  useEffect(() => {
    if (!autoplayActive) return;
    const timerId = window.setTimeout(() => step(1), ROTATE_INTERVAL_MS);
    return () => window.clearTimeout(timerId);
    // selectedIndex + usableKey are intentional deps: any image change (manual
    // or auto) tears down this timeout and schedules a fresh full interval, so
    // there is only ever one pending advance and a manual pick is never
    // immediately overridden by a timer that was already about to fire.
  }, [autoplayActive, selectedIndex, usableKey, step]);

  // --- Touch swipe (native, no dependency) ------------------------------
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !hasMultiple) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return; // let vertical scroll win
    step(dx < 0 ? 1 : -1);
    onImageChange?.(); // user-initiated change
  };

  // --- Thumbnail rail (unchanged behaviour) -----------------------------
  const mainImageRef = useRef<HTMLDivElement>(null);
  const thumbRailRef = useRef<HTMLDivElement>(null);
  const thumbButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [railMaxHeight, setRailMaxHeight] = useState<number | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateRailScrollState = () => {
    const el = thumbRailRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  };

  const scrollRail = (direction: "up" | "down") => {
    const el = thumbRailRef.current;
    if (!el) return;
    const amount = el.clientHeight * 0.8 || 160;
    el.scrollBy({ top: direction === "down" ? amount : -amount, behavior: "smooth" });
  };

  useIsomorphicLayoutEffect(() => {
    const el = mainImageRef.current;
    if (!el) return;
    setRailMaxHeight(el.getBoundingClientRect().height);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRailMaxHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    updateRailScrollState();
  }, [images, railMaxHeight]);

  // Keep the active thumbnail visible inside the rail (never scrolls the page)
  // — follows the selection whether it moved by click, arrow, swipe or the
  // auto-rotation timer.
  useEffect(() => {
    const selected = galleryImages[selectedIndex];
    const rail = thumbRailRef.current;
    const thumbnail = selected ? thumbButtonRefs.current.get(selected.id) : undefined;
    if (!rail || !thumbnail) return;
    keepThumbnailVisible(rail, thumbnail);
  }, [selectedIndex, galleryImages]);

  const fadeClass = prefersReducedMotion ? "" : "motion-safe:animate-[gentle-fade_240ms_ease-out]";

  return (
    <div
      className="flex flex-col gap-3 lg:flex-row-reverse lg:items-stretch lg:gap-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocusWithin(false);
      }}
    >
      <div
        ref={mainImageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="group relative aspect-square overflow-hidden rounded-xl border border-deep-brown/10 bg-white lg:flex-1"
      >
        {currentImage && !isCurrentBroken ? (
          <div key={currentImage.id} className={`absolute inset-0 ${fadeClass}`}>
            <Image
              src={currentImage.url}
              alt={currentImage.alt || productName}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 95vw"
              className="object-contain p-3 sm:p-5"
              onError={() => handleImageError(currentImage.id)}
            />
          </div>
        ) : (
          <ProductImagePlaceholder label={productName} tone={tone} className="absolute inset-0 h-full w-full" />
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <span className="rounded-full bg-white/90 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-text-primary">
              Out of Stock
            </span>
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => {
                step(-1);
                onImageChange?.();
              }}
              aria-label="Previous product image"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-deep-brown/10 bg-white/90 p-1.5 text-text-primary opacity-0 shadow-sm transition-opacity duration-150 hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 group-hover:opacity-100"
            >
              <ChevronIcon className="h-4 w-4 -rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => {
                step(1);
                onImageChange?.();
              }}
              aria-label="Next product image"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-deep-brown/10 bg-white/90 p-1.5 text-text-primary opacity-0 shadow-sm transition-opacity duration-150 hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 group-hover:opacity-100"
            >
              <ChevronIcon className="h-4 w-4 rotate-90" />
            </button>
          </>
        )}

        {hasMultiple && currentNumber > 0 && (
          <span className="absolute bottom-3 right-3 rounded-md border border-deep-brown/10 bg-white/95 px-2.5 py-1 text-xs font-bold text-text-primary shadow-sm">
            {currentNumber} / {galleryImages.length}
          </span>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {hasMultiple && (
        <div
          className="flex flex-col gap-2 lg:w-16 lg:min-h-0 lg:max-h-[75vh] lg:flex-shrink-0"
          style={railMaxHeight != null ? { maxHeight: `${railMaxHeight}px` } : undefined}
        >
          <button
            type="button"
            onClick={() => scrollRail("up")}
            disabled={!canScrollUp}
            aria-label="Scroll product images up"
            tabIndex={canScrollUp ? 0 : -1}
            className={`hidden shrink-0 items-center justify-center rounded-md border border-border-subtle bg-white py-1 text-text-primary transition-opacity duration-150 lg:flex ${
              canScrollUp ? "opacity-100 hover:border-text-primary/40 cursor-pointer" : "pointer-events-none opacity-0"
            }`}
          >
            <ChevronIcon className="h-4 w-4" />
          </button>

          <div
            ref={thumbRailRef}
            onScroll={updateRailScrollState}
            className="scrollbar-none flex gap-2 overflow-x-auto py-1 snap-x snap-mandatory lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:py-0 lg:snap-none"
          >
            {galleryImages.map((img, index) => {
              const isBroken = brokenImageIds.has(img.id);
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={img.id}
                  ref={(el) => {
                    if (el) thumbButtonRefs.current.set(img.id, el);
                    else thumbButtonRefs.current.delete(img.id);
                  }}
                  type="button"
                  onClick={() => selectIndex(index)}
                  aria-label={`View product image ${index + 1}`}
                  aria-current={isSelected ? "true" : undefined}
                  className={`relative aspect-square w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-150 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 ${
                    isSelected
                      ? "border-primary-orange shadow-sm ring-1 ring-primary-orange/40"
                      : "border-border-subtle bg-white hover:border-text-primary/40"
                  }`}
                >
                  {isBroken ? (
                    <ProductImagePlaceholder label={productName} tone={tone} iconSize={16} className="h-full w-full rounded-md" />
                  ) : (
                    <Image
                      src={img.url}
                      alt={img.alt || `Thumbnail ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                      onError={() => handleImageError(img.id)}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollRail("down")}
            disabled={!canScrollDown}
            aria-label="Scroll product images down"
            tabIndex={canScrollDown ? 0 : -1}
            className={`hidden shrink-0 items-center justify-center rounded-md border border-border-subtle bg-white py-1 text-text-primary transition-opacity duration-150 lg:flex ${
              canScrollDown ? "opacity-100 hover:border-text-primary/40 cursor-pointer" : "pointer-events-none opacity-0"
            }`}
          >
            <ChevronIcon className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
