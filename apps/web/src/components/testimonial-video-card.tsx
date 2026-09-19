"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { discountPercent } from "@/lib/pricing";

const currency = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export type TestimonialVideoCardTestimonial = {
  id: number;
  mediaUrl: string;
  title: string | null;
  caption: string | null;
};

export type TestimonialVideoCardProduct = {
  name: string;
  slug: string;
  /** The Product's own current/starting price — never a value stored on the testimonial. */
  price: number;
  /** Pass null for a variant Product with no variant selected — see the discount-suppression note below. */
  compareAtPrice: number | null;
  hasVariants: boolean;
};

/**
 * Product-specific testimonial video, optionally merchandised with the linked
 * Product's real commerce data.
 *
 * Play/pause UX:
 *   - Idle / paused  → custom play-button overlay visible, no native controls
 *   - Playing        → native controls visible, play-button overlay hidden
 *   - Video ends     → pause fires → play button reappears
 *
 * White-space fix: the wrapper div owns the aspect ratio (aspect-[9/16]).
 * The <video> is absolute inset-0, so browsers can never expand the wrapper
 * height to accommodate the controls bar — the layout height is fixed by CSS.
 */
export function TestimonialVideoCard({
  testimonial,
  product,
  variant = "commerce",
}: {
  testimonial: TestimonialVideoCardTestimonial;
  product: TestimonialVideoCardProduct;
  variant?: "product-detail" | "commerce";
}) {
  const discountPct = discountPercent(product.price, product.compareAtPrice);
  const videoLabel = testimonial.title || `${product.name} customer story`;

  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Two-way playing state:
   *   false → idle / paused → play button visible, no native controls
   *   true  → playing       → native controls visible, play button hidden
   */
  const [isPlaying, setIsPlaying] = useState(false);

  function handlePlayClick() {
    videoRef.current?.play().catch(() => {
      // Browser blocked play — native controls now show so the user can
      // tap the browser's own play button to proceed.
    });
  }

  function handlePlay() {
    setIsPlaying(true);
  }

  function handlePause() {
    // Fires on manual pause AND when the video ends — both should restore
    // the custom play button and hide the native controls bar.
    setIsPlaying(false);
  }

  const hasTextContent = testimonial.title || testimonial.caption;

  return (
    <figure className="overflow-hidden rounded-[24px] border border-border-subtle bg-white shadow-[0_10px_28px_rgba(74,37,17,0.08)]">
      {/*
        The wrapper div owns the aspect ratio. The <video> is absolutely
        positioned inside it so toggling `controls` can never expand the
        wrapper height — eliminating the white-space gap below the video.
      */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-deep-brown">
        <video
          ref={videoRef}
          src={testimonial.mediaUrl}
          controls={isPlaying}
          playsInline
          preload="metadata"
          onPlay={handlePlay}
          onPause={handlePause}
          aria-label={videoLabel}
          className="absolute inset-0 h-full w-full bg-deep-brown object-contain"
        >
          Your browser does not support video playback.
        </video>

        {/* Play-button overlay — shown when idle or paused, hidden while playing */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={`Play: ${videoLabel}`}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors duration-150 hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform duration-150 hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6 translate-x-0.5 text-deep-brown"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {/* Only render figcaption when there is actual text */}
      {hasTextContent && (
        <figcaption className={`px-4 pt-3 ${variant === "commerce" ? "pb-0" : "pb-3"}`}>
          {testimonial.title && <p className="text-sm font-semibold text-text-primary">{testimonial.title}</p>}
          {testimonial.caption && <p className="mt-1 text-xs text-text-muted">{testimonial.caption}</p>}
        </figcaption>
      )}

      {variant === "commerce" && (
        <div className="p-4">
          <p className="truncate text-sm font-semibold text-text-primary">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-base font-bold text-text-primary">
              {product.hasVariants ? "From " : ""}₹{currency.format(product.price)}
            </span>
            {discountPct !== null && product.compareAtPrice !== null && (
              <>
                <span className="text-xs text-text-muted line-through">₹{currency.format(product.compareAtPrice)}</span>
                <span className="text-xs font-semibold text-primary-orange">{discountPct}% off</span>
              </>
            )}
          </div>
          <Link href={`/products/${product.slug}`} className="button-primary mt-3 w-full">
            Buy Now
          </Link>
        </div>
      )}
    </figure>
  );
}

