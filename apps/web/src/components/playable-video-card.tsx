"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import { CloseIcon } from "@/components/icons";

/**
 * Shared testimonial/product-demo video card. Clicking opens the clip in a
 * full-size lightbox rather than playing inline in the small card — native
 * browser video chrome never matched the warm-card brand language at card
 * size, and a lightbox also guarantees only one clip ever plays at a time
 * (opening one closes/blocks any other, there's no shared "now playing"
 * state to manage across cards).
 */
export function PlayableVideoCard({
  src,
  label,
  caption,
  aspect = "aspect-[9/16]",
  className = "",
}: {
  src: string;
  label: string;
  caption?: string;
  aspect?: string;
  className?: string;
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
        aria-label={`Play: ${label}`}
        className={`group relative block cursor-pointer overflow-hidden rounded-[22px] border border-border-subtle bg-deep-brown shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange ${className}`}
      >
        <video
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className={`pointer-events-none w-full bg-deep-brown object-cover ${aspect}`}
        >
          <source src={src} type="video/mp4" />
        </video>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep-brown/80 via-deep-brown/10 to-transparent"
        />

        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary-orange shadow-lg transition-transform duration-150 group-hover:scale-105">
            <Play size={20} strokeWidth={2} fill="currentColor" aria-hidden="true" className="translate-x-0.5" />
          </span>
        </span>

        {caption && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 text-xs font-semibold tracking-wide text-white"
          >
            {caption}
          </span>
        )}
      </div>

      {open && (
        <VideoLightbox
          src={src}
          label={label}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function VideoLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-deep-brown/90 p-4 sm:p-8"
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-150 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-8 sm:top-8"
      >
        <CloseIcon width={20} height={20} />
      </button>

      <video
        controls
        autoPlay
        playsInline
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-2xl bg-black object-contain shadow-2xl"
      >
        <source src={src} type="video/mp4" />
        Your browser does not support video playback.
      </video>
    </div>,
    document.body,
  );
}
