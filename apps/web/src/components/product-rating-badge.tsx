"use client";

import { useEffect, useState } from "react";
import { ReviewApi } from "@/lib/review-api";
import { StaticStars } from "./review-stars";

type RatingSummary = { averageRating: number; reviewCount: number };

// Compact above-the-fold rating. Two modes:
//  - `summary` supplied (e.g. from a Product List DTO's averageRating/
//    reviewCount): renders directly from that data, no network request —
//    used by ProductCard so a page of cards never fires one Review request
//    per card.
//  - `summary` omitted: falls back to the original per-product fetch
//    (pageSize:1 list call, whose response carries the summary) — used by
//    single-product surfaces like the PDP purchase panel and the Homepage
//    Spotlight, where one request per page is not an N+1 concern.
// `showZero` renders a genuine "0 Reviews" row instead of hiding entirely —
// never a fabricated non-zero rating (see CLAUDE.md Written Product Reviews
// §31).
export function ProductRatingBadge({
  productId,
  href = "#product-reviews",
  compact = false,
  summary: providedSummary,
  showZero = false,
}: {
  productId: number;
  href?: string;
  compact?: boolean;
  summary?: RatingSummary;
  showZero?: boolean;
}) {
  const hasProvidedSummary = providedSummary != null;
  const [fetchedSummary, setFetchedSummary] = useState<RatingSummary | null>(null);

  useEffect(() => {
    if (hasProvidedSummary) return;
    let cancelled = false;
    ReviewApi.list(productId, { pageSize: 1 })
      .then((result) => {
        if (!cancelled) setFetchedSummary(result.summary);
      })
      .catch(() => {
        if (!cancelled) setFetchedSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, hasProvidedSummary]);

  const summary = providedSummary ?? fetchedSummary;

  if (!summary) return null;

  if (summary.reviewCount === 0) {
    if (!showZero) return null;
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 text-xs text-text-muted sm:text-sm">
        <StaticStars rating={0} size={14} />
        <span aria-label="No reviews yet">0 Reviews</span>
      </span>
    );
  }

  return (
    <a href={href} className="inline-flex max-w-full items-center gap-1.5 text-xs text-text-primary hover:underline sm:text-sm">
      <StaticStars rating={summary.averageRating} size={14} />
      <span className="font-semibold">{summary.averageRating.toFixed(1)}</span>
      <span className="truncate text-text-muted">
        {compact ? `(${summary.reviewCount})` : `(${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"})`}
      </span>
    </a>
  );
}
