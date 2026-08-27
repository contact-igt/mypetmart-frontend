"use client";

import { useEffect, useState } from "react";
import { StaticStars } from "@/components/review-stars";
import { ReviewApi } from "@/lib/review-api";
import { getReviewCustomerName, type PublicReviewJSON, type ReviewSummaryJSON } from "@/types/review";

const REVIEW_LIMIT = 4;

function ReviewCard({ review }: { review: PublicReviewJSON }) {
  return (
    <article className="flex min-h-[21rem] flex-col rounded-[20px] border border-deep-brown/15 bg-white p-6 sm:p-7">
      <StaticStars rating={review.rating} size={17} />
      {review.title && <h3 className="mt-5 text-xl font-bold leading-[1.2] text-text-primary">{review.title}</h3>}
      <p className="mt-4 whitespace-pre-line text-base leading-[1.7] text-text-primary/75">{review.review}</p>
      <div className="mt-auto border-t border-deep-brown/15 pt-4">
        <p className="font-bold text-text-primary">{getReviewCustomerName(review)}</p>
      </div>
    </article>
  );
}

export function CustomerReviewsClient({ productId }: { productId: number | null }) {
  const [reviews, setReviews] = useState<PublicReviewJSON[]>([]);
  const [summary, setSummary] = useState<ReviewSummaryJSON | null>(null);
  const [loading, setLoading] = useState(productId !== null);

  useEffect(() => {
    if (productId === null) {
      return;
    }

    let cancelled = false;
    ReviewApi.list(productId, { page: 1, pageSize: REVIEW_LIMIT, sort: "newest" })
      .then((result) => {
        if (cancelled) return;
        setReviews(Array.isArray(result.items) ? result.items.slice(0, REVIEW_LIMIT) : []);
        setSummary(result.summary ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const hasReviews = Boolean(summary && summary.reviewCount > 0 && reviews.length > 0);

  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Real pet parents</p>
            <h2 className="mt-4 text-[2.6rem] leading-[0.96] tracking-[-0.04em] text-text-primary sm:text-[3.6rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
              Real happy tails.
            </h2>
          </div>

          {hasReviews && summary && (
            <div className="flex min-w-[20rem] items-center gap-5 rounded-[18px] border border-deep-brown/15 bg-surface-secondary/45 px-6 py-4">
              <div>
                <p className="text-4xl leading-none text-text-primary" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
                  {summary.averageRating.toFixed(1)}
                </p>
                <div className="mt-2 text-primary-orange"><StaticStars rating={summary.averageRating} size={15} /></div>
              </div>
              <p className="max-w-[13rem] text-base leading-[1.45] text-text-primary/75">
                Based on {summary.reviewCount} review{summary.reviewCount === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading reviews">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-80 animate-pulse rounded-[20px] bg-white" />)}
          </div>
        ) : hasReviews ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        ) : (
          <p className="mt-8 rounded-[20px] border border-deep-brown/15 bg-white px-6 py-7 text-text-primary/70">
            No approved reviews yet.
          </p>
        )}
      </div>
    </section>
  );
}
