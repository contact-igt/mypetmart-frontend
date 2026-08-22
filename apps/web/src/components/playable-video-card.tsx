"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Share2, Volume2, VolumeX } from "lucide-react";
import { CloseIcon } from "@/components/icons";

const currency = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export type VideoCardProduct = {
  name: string;
  price: number;
  compareAtPrice?: number | null;
  onAddToCart: () => Promise<unknown>;
};

function discountPercent(price: number, compareAtPrice?: number | null): number | null {
  if (compareAtPrice == null || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/**
 * Shared testimonial/product-demo video card — shoppable-video-style card +
 * lightbox (reference: superyou.in's product video carousel), restyled to
 * MyPetMart's warm palette. Deliberately does NOT copy the reference's view/
 * like counters: those are fabricated engagement numbers we have no real
 * data for (CLAUDE.md's no-invented-claims rule). The optional `product`
 * prop (name/price/real add-to-cart handler) drives the reference's
 * name+price+"Add to cart" panel — omit it for plain testimonial clips that
 * aren't tied to one product.
 */
export function PlayableVideoCard({
  src,
  label,
  caption,
  aspect = "aspect-[9/16]",
  className = "",
  product,
  chrome = true,
}: {
  src: string;
  label: string;
  caption?: string;
  aspect?: string;
  className?: string;
  product?: VideoCardProduct;
  /** false when a wrapping card (e.g. ShoppableVideoCard) already owns the rounded corners/shadow. */
  chrome?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-haspopup="dialog"
        aria-label={`Watch with sound: ${label}`}
        className={`group relative block cursor-pointer overflow-hidden bg-deep-brown focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange ${
          chrome
            ? "rounded-[24px] shadow-[0_10px_28px_rgba(74,37,17,0.14)] transition-shadow duration-200 ease-out hover:shadow-[0_16px_36px_rgba(74,37,17,0.2)]"
            : ""
        } ${className}`}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          className={`pointer-events-none w-full bg-deep-brown object-cover ${aspect}`}
        >
          <source src={src} type="video/mp4" />
        </video>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep-brown/85 via-deep-brown/5 to-deep-brown/25"
        />

        {caption && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
            <span className="block text-[15px] font-bold uppercase leading-tight tracking-wide text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.45)]">
              {caption}
            </span>
          </span>
        )}
      </div>

      {open && (
        <VideoLightbox
          src={src}
          label={label}
          caption={caption}
          product={product}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function ShareButton({
  src,
  label,
  size = "sm",
  className = "",
}: {
  src: string;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const sizeClasses = size === "md" ? "h-10 w-10 bg-black/40 hover:bg-black/60" : "h-9 w-9 bg-black/35 hover:bg-black/50";

  async function handleShare(event: MouseEvent) {
    event.stopPropagation();
    const absoluteUrl = typeof window !== "undefined" ? new URL(src, window.location.origin).toString() : src;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: label, url: absoluteUrl });
        return;
      } catch {
        // User cancelled the native share sheet, or it's unsupported for this
        // payload — fall through to the clipboard-copy fallback below.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(absoluteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // No clipboard permission — nothing more we can honestly offer here.
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "Link copied" : `Share: ${label}`}
      className={`inline-flex items-center justify-center rounded-full text-white backdrop-blur-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${sizeClasses} ${className}`}
    >
      {copied ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : <Share2 size={16} strokeWidth={2} aria-hidden="true" />}
    </button>
  );
}

function AddToCartPanel({ product }: { product: VideoCardProduct }) {
  const [status, setStatus] = useState<"idle" | "adding" | "success" | "error">("idle");

  async function handleAdd(event: MouseEvent) {
    event.stopPropagation();
    setStatus("adding");
    try {
      await product.onAddToCart();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const discountPct = discountPercent(product.price, product.compareAtPrice);

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:inset-x-4 sm:bottom-4 sm:p-4"
    >
      <div className="min-w-0 flex-1">
        {discountPct !== null && (
          <span className="mb-1 inline-flex rounded-full bg-primary-orange/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-orange">
            {discountPct}% off
          </span>
        )}
        <p className="truncate text-sm font-semibold text-text-primary">{product.name}</p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-text-primary">₹{currency.format(product.price)}</span>
          {discountPct !== null && (
            <span className="text-xs text-text-muted line-through">₹{currency.format(product.compareAtPrice!)}</span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={status === "adding"}
        className="shrink-0 rounded-xl bg-primary-orange px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-terracotta disabled:opacity-60"
      >
        {status === "adding" ? "Adding…" : status === "success" ? "Added ✓" : status === "error" ? "Try again" : "Add to cart"}
      </button>
    </div>
  );
}

function VideoLightbox({
  src,
  label,
  caption,
  product,
  onClose,
}: {
  src: string;
  label: string;
  caption?: string;
  product?: VideoCardProduct;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (videoRef.current) {
      videoRef.current.muted = false;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback if browser blocks unmuted autoplay
        });
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function toggleMute(event: MouseEvent) {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-deep-brown/90 p-4 sm:p-8"
    >
      <div className="relative" onClick={(event) => event.stopPropagation()}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          aria-label={label}
          className="max-h-[85vh] max-w-full rounded-2xl bg-black object-contain shadow-2xl"
        >
          <source src={src} type="video/mp4" />
          Your browser does not support video playback.
        </video>

        {product ? (
          <AddToCartPanel product={product} />
        ) : (
          caption && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/70 to-transparent px-5 pb-5 pt-10"
            >
              <span className="block text-sm font-bold uppercase tracking-wide text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
                {caption}
              </span>
            </div>
          )
        )}

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
          </button>
          <ShareButton src={src} label={label} size="md" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * A video card with a real product always merchandised below it — name,
 * price/compare-price/discount, and a "Buy Now" link straight to that
 * product's page. Reference: superyou.in's shop grid (video card + product
 * footer). Unlike the plain caption-only `PlayableVideoCard`, this always
 * needs a real product — every field here is genuine catalog data, never
 * invented per-clip engagement numbers.
 */
export function ShoppableVideoCard({
  src,
  label,
  caption,
  slug,
  product,
}: {
  src: string;
  label: string;
  caption?: string;
  slug: string;
  product: VideoCardProduct;
}) {
  const discountPct = discountPercent(product.price, product.compareAtPrice);

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_28px_rgba(74,37,17,0.14)] transition-shadow duration-200 ease-out hover:shadow-[0_16px_36px_rgba(74,37,17,0.2)]">
      <PlayableVideoCard src={src} label={label} caption={caption} product={product} chrome={false} />

      <div className="p-3 sm:p-4">
        <p className="truncate text-sm font-semibold text-text-primary">{product.name}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-base font-bold text-text-primary">₹{currency.format(product.price)}</span>
          {discountPct !== null && (
            <>
              <span className="text-xs text-text-muted line-through">₹{currency.format(product.compareAtPrice!)}</span>
              <span className="text-xs font-semibold text-primary-orange">{discountPct}% off</span>
            </>
          )}
        </div>
        <Link href={`/products/${slug}`} className="button-primary mt-3 w-full">
          Buy Now
        </Link>
      </div>
    </div>
  );
}
