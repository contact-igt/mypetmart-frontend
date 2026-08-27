"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import type { ProductImage as ProductImageType } from "@/types/storefront";

// useLayoutEffect measures and applies the rail height cap before the browser
// paints, so the tall unmeasured list never flashes on screen. It's a no-op
// warning-generating call during SSR, so it falls back to useEffect there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const [selectedImage, setSelectedImage] = useState<ProductImageType | null>(
    primaryImage || (images.length > 0 ? images[0]! : null)
  );
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());

  // Thumbnail rail: vertical slider on desktop, horizontal strip on mobile.
  // Flexbox align-items:stretch alone can't cap the rail to the main image's
  // height — a taller thumbnail list just grows the row instead of scrolling
  // internally — so the main image's rendered height is measured and applied
  // as an explicit cap.
  const mainImageRef = useRef<HTMLDivElement>(null);
  const thumbRailRef = useRef<HTMLDivElement>(null);
  const thumbButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [railMaxHeight, setRailMaxHeight] = useState<number | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const handleImageError = (imageId: number) => {
    setBrokenImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

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

  // Track the main image's rendered height and cap the rail to it, so extra
  // thumbnails scroll inside the rail instead of growing the page. Measured
  // synchronously before paint (useLayoutEffect) so refreshing never shows a
  // tall list that then visibly collapses down to size.
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

  // Recompute whether the rail can scroll after the image list changes or
  // the measured cap changes (e.g. on breakpoint/viewport resize).
  useEffect(() => {
    updateRailScrollState();
  }, [images, railMaxHeight]);

  // Keep the selected thumbnail visible inside the rail without scrolling the page.
  useEffect(() => {
    if (!selectedImage) return;
    thumbButtonRefs.current.get(selectedImage.id)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedImage]);

  const mainImageToRender = selectedImage;
  const isMainImageBroken = mainImageToRender ? brokenImageIds.has(mainImageToRender.id) : true;
  const selectedImageIndex = mainImageToRender ? images.findIndex((image) => image.id === mainImageToRender.id) : -1;

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-stretch lg:gap-4">
      <div
        ref={mainImageRef}
        className="relative aspect-square overflow-hidden rounded-xl border border-deep-brown/10 bg-white lg:flex-1"
      >
        {mainImageToRender && !isMainImageBroken ? (
          <Image
            src={mainImageToRender.url}
            alt={mainImageToRender.alt || productName}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 95vw"
            className="object-contain p-3 transition-opacity duration-200 sm:p-5"
            onError={() => handleImageError(mainImageToRender.id)}
          />
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

        {images.length > 1 && selectedImageIndex >= 0 && (
          <span className="absolute bottom-3 right-3 rounded-md border border-deep-brown/10 bg-white/95 px-2.5 py-1 text-xs font-bold text-text-primary shadow-sm">
            {selectedImageIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
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
            {images.map((img) => {
              const isBroken = brokenImageIds.has(img.id);
              const isSelected = selectedImage ? selectedImage.id === img.id : false;
              return (
                <button
                  key={img.id}
                  ref={(el) => {
                    if (el) thumbButtonRefs.current.set(img.id, el);
                    else thumbButtonRefs.current.delete(img.id);
                  }}
                  type="button"
                  onClick={() => {
                    setSelectedImage(img);
                    onImageChange?.();
                  }}
                  aria-label={`View image ${img.sortOrder}`}
                  aria-current={isSelected ? "true" : "false"}
                  className={`relative aspect-square w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-150 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 ${
                    isSelected
                      ? "border-primary-orange shadow-sm"
                      : "border-border-subtle bg-white hover:border-text-primary/40"
                  }`}
                >
                  {isBroken ? (
                    <ProductImagePlaceholder label={productName} tone={tone} iconSize={16} className="h-full w-full rounded-md" />
                  ) : (
                    <Image
                      src={img.url}
                      alt={img.alt || `Thumbnail ${img.sortOrder}`}
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
