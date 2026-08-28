"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StaticStars } from "@/components/review-stars";
import { ProductImagePlaceholder } from "@/components/image-placeholder";
import type { StorefrontReviewFeedItem } from "@/types/review";

function formatReviewDate(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ReviewCard({ review, fullReview = false }: { review: StorefrontReviewFeedItem; fullReview?: boolean }) {
  const [imageError, setImageError] = useState(false);
  const reviewDate = formatReviewDate(review.createdAt);
  return (
    <article className="flex h-full min-h-[14rem] flex-col rounded-2xl border border-deep-brown/10 bg-white p-5 shadow-[0_8px_24px_rgba(74,37,17,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(74,37,17,0.1)] sm:p-6">
      <StaticStars rating={review.rating} size={16} />
      {review.title && <h3 className={`mt-4 text-lg font-semibold leading-tight text-text-primary ${fullReview ? "" : "line-clamp-2"}`}>{review.title}</h3>}
      <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-text-primary/72 ${fullReview ? "" : "line-clamp-4"}`}>{review.review}</p>
      <div className="mt-auto border-t border-deep-brown/10 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-text-primary">{review.customerName || "Customer"}</p>
            {reviewDate && <time className="mt-1 block text-[11px] text-text-primary/50" dateTime={review.createdAt}>{reviewDate}</time>}
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
    </article>
  );
}
