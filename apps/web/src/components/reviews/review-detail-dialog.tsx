"use client";

import { useEffect, useRef } from "react";
import { StaticStars } from "@/components/review-stars";
import { resolveReviewDisplayDate } from "@/lib/review-date";
import type { StorefrontReviewFeedItem } from "@/types/review";

// One selected review, shown in full. Native <dialog> + showModal() — the
// platform gives us the top-layer, focus capture, Tab trapping, ::backdrop and
// Escape-to-close for free; we wire up backdrop-click, body scroll lock and
// focus restoration. No modal library.
export function ReviewDetailDialog({
  review,
  open,
  onClose,
}: {
  review: StorefrontReviewFeedItem;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `review-dialog-title-${review.id}`;
  const displayDate = resolveReviewDisplayDate(review);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      if (!el.open) el.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    if (el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-deep-brown/10 bg-white p-0 text-text-primary shadow-[0_24px_60px_rgba(74,37,17,0.22)] backdrop:bg-deep-brown/40"
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-deep-brown/10 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-primary/50">Customer review</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="-m-1.5 rounded-full p-1.5 text-text-primary/60 transition-colors hover:bg-cream-bg hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <StaticStars rating={review.rating} size={16} />
          {review.title && (
            <h2 id={titleId} className="mt-3 text-lg font-semibold leading-tight text-text-primary">
              {review.title}
            </h2>
          )}
          {!review.title && (
            <h2 id={titleId} className="sr-only">
              Review by {review.customerName || "Customer"}
            </h2>
          )}
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-primary/80">{review.review}</p>

          <div className="mt-5 border-t border-deep-brown/10 pt-4">
            <p className="text-sm font-semibold text-text-primary">{review.customerName || "Customer"}</p>
            {displayDate && (
              <time className="mt-1 block text-[11px] text-text-primary/50" dateTime={displayDate.machine}>
                {displayDate.label}
              </time>
            )}
            {review.verifiedPurchase && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">✓ Verified purchase</span>
            )}
            {review.product?.name && (
              <p className="mt-2 text-xs text-text-primary/50">On {review.product.name}</p>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
