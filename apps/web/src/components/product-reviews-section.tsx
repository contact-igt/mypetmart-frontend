"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReviewCarousel } from "@/components/reviews/review-carousel";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { ReviewApi } from "@/lib/review-api";
import { StarRatingInput, StaticStars } from "./review-stars";
import { AppAuthError } from "@/lib/auth/auth-errors";
import type { OwnReviewJSON, PublicReviewJSON, ReviewEligibilityJSON, ReviewSummaryJSON, StorefrontReviewFeedItem } from "@/types/review";

const PAGE_SIZE = 50;

function ReviewStatusNote({ status }: { status: OwnReviewJSON["status"] }) {
  if (status === "approved") {
    return <span className="text-xs font-semibold text-emerald-700">Published</span>;
  }
  if (status === "rejected") {
    return <span className="text-xs font-semibold text-terracotta">Not approved</span>;
  }
  return <span className="text-xs font-semibold text-text-muted">Pending approval</span>;
}

function DistributionBar({ label, count, total }: { label: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span className="w-10 shrink-0">{label} ★</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#FFF0E5]">
        <div className="h-full rounded-full bg-primary-orange" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right">{count}</span>
    </div>
  );
}

type WriteFormState = { rating: number; title: string; review: string };

function ReviewForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: WriteFormState;
  submitting: boolean;
  onSubmit: (values: WriteFormState) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<WriteFormState>(initial);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 flex flex-col gap-3 rounded-[18px] border border-border-subtle bg-[#FFF8EF] p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (values.rating < 1) {
          setError("Select a rating from 1 to 5 stars.");
          return;
        }
        if (!values.review.trim()) {
          setError("Write a few words about your experience.");
          return;
        }
        setError(null);
        onSubmit(values);
      }}
    >
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
          Rating <span aria-hidden="true">*</span>
        </span>
        <StarRatingInput value={values.rating} onChange={(rating) => setValues((v) => ({ ...v, rating }))} disabled={submitting} />
      </div>
      <label className="text-sm">
        <span className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
          Review title <span className="font-normal normal-case text-text-muted">(optional)</span>
        </span>
        <input
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          maxLength={160}
          disabled={submitting}
          className="w-full rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-orange focus:outline-none"
          placeholder="Sum up your experience"
        />
      </label>
      <label className="text-sm">
        <span className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
          Your review <span aria-hidden="true">*</span>
        </span>
        <textarea
          value={values.review}
          onChange={(e) => setValues((v) => ({ ...v, review: e.target.value }))}
          maxLength={5000}
          rows={4}
          disabled={submitting}
          className="w-full resize-y rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-orange focus:outline-none"
          placeholder="What did you like or dislike? How did your pet take to it?"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-terracotta">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl bg-primary-orange px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-terracotta disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-sm font-semibold text-text-muted hover:text-text-primary"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function ProductReviewsSection({ productId, product }: { productId: number; product?: { name: string; slug: string; image: string | null } }) {
  const { status } = useCustomerAuth();

  const [items, setItems] = useState<PublicReviewJSON[]>([]);
  const [summary, setSummary] = useState<ReviewSummaryJSON | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [eligibility, setEligibility] = useState<ReviewEligibilityJSON | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ReviewApi.list(productId, { page: 1, pageSize: PAGE_SIZE, sort: "newest" })
      .then((result) => {
        if (cancelled) return;
        const nextItems = Array.isArray(result.items) ? result.items : [];
        setItems(nextItems);
        setSummary(result.summary ?? null);
      })
      .catch(() => {
        // Public list — degrade to "no reviews shown" rather than surface an error UI.
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    // Rendering already gates every use of `eligibility` behind
    // `status === "authenticated"` below, so a stale value from a previous
    // session is never shown once status flips away — no reset needed here.
    if (status !== "authenticated") {
      return;
    }
    let cancelled = false;
    ReviewApi.getEligibility(productId)
      .then((result) => {
        if (!cancelled) setEligibility(result);
      })
      .catch(() => {
        if (!cancelled) setEligibility(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, status]);

  async function handleSubmit(values: WriteFormState) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const hasExisting = Boolean(eligibility?.hasReview);
      const saved = hasExisting
        ? await ReviewApi.updateOwn(productId, { rating: values.rating, title: values.title.trim() || null, review: values.review })
        : await ReviewApi.create(productId, { rating: values.rating, title: values.title.trim() || null, review: values.review });
      setEligibility((current) =>
        current
          ? { ...current, hasReview: true, reviewStatus: saved.status, review: saved }
          : { authenticated: true, eligible: true, hasReview: true, reviewStatus: saved.status, review: saved }
      );
      setFormOpen(false);
      setSuccessNote(
        hasExisting
          ? "Your updated review has been submitted for approval."
          : "Thanks. Your review has been submitted for approval."
      );
    } catch (error) {
      const message = error instanceof AppAuthError ? error.message : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const distribution = summary?.distribution;
  const reviewCount = summary?.reviewCount ?? 0;
  const carouselReviews: StorefrontReviewFeedItem[] = items.map((item) => ({
    id: item.id,
    rating: item.rating,
    title: item.title,
    review: item.review,
    customerName: item.customerName ?? item.customerDisplayName ?? "Customer",
    verifiedPurchase: item.verifiedPurchase,
    reviewDate: item.reviewDate ?? null,
    createdAt: item.createdAt,
    product: { id: productId, name: product?.name ?? "This product", slug: product?.slug ?? "", image: product?.image ?? null },
  }));

  return (
    <section id="product-reviews" className="mt-20 scroll-mt-24 sm:mt-24">
      <div className="mb-7 max-w-2xl">
        <span className="pill-label border border-deep-brown/10 bg-white text-text-primary">Ratings &amp; Reviews</span>
        <h2
          className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl"
          style={{ fontFamily: "var(--font-display-italic)" }}
        >
          What pet parents think.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="flex flex-col gap-5">
          {reviewCount > 0 && summary ? (
            <div className="rounded-[22px] border border-border-subtle bg-white p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-text-primary" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
                  {summary.averageRating.toFixed(1)}
                </span>
                <StaticStars rating={summary.averageRating} />
              </div>
              <p className="mt-1 text-sm text-text-muted">
                Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </p>
              {distribution && (
                <div className="mt-4 flex flex-col gap-1.5">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <DistributionBar key={star} label={star} count={distribution[star as 1 | 2 | 3 | 4 | 5]} total={reviewCount} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            !loadingList && <p className="text-sm text-text-muted">No reviews yet.</p>
          )}

          <div className="rounded-[22px] border border-border-subtle bg-[#FFF8EF] p-5">
            {status === "loading" ? null : status !== "authenticated" ? (
              <div>
                <p className="text-sm text-text-primary">Bought this product?</p>
                <Link href="/signin" className="mt-2 inline-block text-sm font-semibold text-primary-orange hover:underline">
                  Sign in to review
                </Link>
              </div>
            ) : eligibility === null ? null : eligibility.hasReview && eligibility.review ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">Your review</p>
                  <ReviewStatusNote status={eligibility.reviewStatus ?? "pending"} />
                </div>
                {!formOpen && (
                  <button
                    type="button"
                    onClick={() => setFormOpen(true)}
                    className="mt-2 text-sm font-semibold text-primary-orange hover:underline"
                  >
                    Edit Your Review
                  </button>
                )}
                {formOpen && (
                  <ReviewForm
                    initial={{ rating: eligibility.review.rating, title: eligibility.review.title ?? "", review: eligibility.review.review }}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onCancel={() => setFormOpen(false)}
                  />
                )}
                {submitError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-terracotta">
                    {submitError}
                  </p>
                )}
              </div>
            ) : eligibility.eligible ? (
              <div>
                {!formOpen ? (
                  <>
                    <p className="text-sm text-text-primary">Bought this product? Share your experience.</p>
                    <button
                      type="button"
                      onClick={() => setFormOpen(true)}
                      className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary-orange px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-terracotta"
                    >
                      Write a Review
                    </button>
                  </>
                ) : (
                  <ReviewForm initial={{ rating: 0, title: "", review: "" }} submitting={submitting} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} />
                )}
                {submitError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-terracotta">
                    {submitError}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">You can write a review once your delivered order for this product arrives.</p>
            )}
            {successNote && (
              <p className="mt-3 rounded-lg bg-[#EDFBF0] px-3 py-2 text-sm font-medium text-[#1E7F3C]" aria-live="polite">
                {successNote}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <ReviewCarousel reviews={carouselReviews} compact showHeader={false} singleCard showArrows loading={loadingList && carouselReviews.length === 0} />
        </div>
      </div>
    </section>
  );
}
