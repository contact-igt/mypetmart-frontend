"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StaticStars } from "@/components/review-stars";
import { ProductImagePlaceholder } from "@/components/image-placeholder";
import { ReviewDetailDialog } from "./review-detail-dialog";
import { resolveReviewDisplayDate } from "@/lib/review-date";
import type { StorefrontReviewFeedItem } from "@/types/review";

export function ReviewCard({ review }: { review: StorefrontReviewFeedItem }) {
  const [imageError, setImageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bodyTruncated, setBodyTruncated] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const readMoreRef = useRef<HTMLButtonElement>(null);

  const displayDate = resolveReviewDisplayDate(review);

  // Actual rendered-overflow detection after the 4-line clamp — re-checked when
  // the card is resized (viewport / breakpoint / slide width changes).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => setBodyTruncated(el.scrollHeight - el.clientHeight > 1);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [review.review]);

  return (
    <article className="flex h-full min-h-[21rem] flex-col overflow-hidden rounded-2xl border border-deep-brown/10 bg-white p-5 shadow-[0_8px_24px_rgba(74,37,17,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(74,37,17,0.1)] sm:min-h-[22rem] sm:p-6">
      <StaticStars rating={review.rating} size={16} />
      {/* Title slot is always reserved (min-height) so cards with and without a
          title keep the body / footer at the same vertical position. */}
      <h3 className="mt-4 line-clamp-2 min-h-[1.5rem] shrink-0 text-lg font-semibold leading-tight text-text-primary">{review.title}</h3>
      <p ref={bodyRef} className="mt-2 line-clamp-4 shrink-0 whitespace-pre-line text-sm leading-relaxed text-text-primary/72">{review.review}</p>
      {/* Read-more slot is reserved whether or not the body actually overflows,
          so the footer never shifts between a clamped and an unclamped card. */}
      <div className="mb-3 mt-2 flex h-4 shrink-0 items-center">
        {bodyTruncated && (
          <button
            ref={readMoreRef}
            type="button"
            onClick={() => setDialogOpen(true)}
            className="text-xs font-semibold text-primary-orange hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"
          >
            Read more
          </button>
        )}
      </div>
      <div className="mt-auto border-t border-deep-brown/10 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-text-primary">{review.customerName || "Customer"}</p>
            {displayDate && <time className="mt-1 block text-[11px] text-text-primary/50" dateTime={displayDate.machine}>{displayDate.label}</time>}
            {review.verifiedPurchase && <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">✓ Verified purchase</span>}
          </div>
          <Link href={`/products/${review.product.slug}`} className="flex min-w-0 w-full items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange sm:w-auto sm:max-w-[58%]">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#FFF8EF]">
              {review.product.image && !imageError ? <Image src={review.product.image} alt={review.product.name} fill sizes="48px" className="object-cover" onError={() => setImageError(true)} /> : <ProductImagePlaceholder label={review.product.name} className="h-full w-full rounded-lg" iconSize={15} />}
            </div>
            <span className="min-w-0 break-words text-left text-xs font-semibold text-text-primary/70">{review.product.name}</span>
          </Link>
        </div>
      </div>

      {dialogOpen && (
        <ReviewDetailDialog
          review={review}
          open
          onClose={() => {
            setDialogOpen(false);
            readMoreRef.current?.focus();
          }}
        />
      )}
    </article>
  );
}
