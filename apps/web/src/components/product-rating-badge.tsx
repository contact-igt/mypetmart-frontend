"use client";

import { useEffect, useState } from "react";
import { ReviewApi } from "@/lib/review-api";
import { StaticStars } from "./review-stars";

// Compact above-the-fold rating, shown only once real approved Reviews exist
// (never a fabricated/zero rating — see CLAUDE.md Written Product Reviews
// §31). A cheap pageSize:1 list call is enough since the summary always
// rides along with the list response.
export function ProductRatingBadge({ productId }: { productId: number }) {
  const [summary, setSummary] = useState<{ averageRating: number; reviewCount: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    ReviewApi.list(productId, { pageSize: 1 })
      .then((result) => {
        if (!cancelled) setSummary(result.summary);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!summary || summary.reviewCount === 0) return null;

  return (
    <a href="#product-reviews" className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:underline">
      <StaticStars rating={summary.averageRating} size={14} />
      <span className="font-semibold">{summary.averageRating.toFixed(1)}</span>
      <span className="text-text-muted">
        ({summary.reviewCount} review{summary.reviewCount === 1 ? "" : "s"})
      </span>
    </a>
  );
}
