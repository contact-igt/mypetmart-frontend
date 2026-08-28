"use client";

import { useEffect, useState } from "react";
import { ReviewApi } from "@/lib/review-api";
import { ReviewCarousel } from "@/components/reviews/review-carousel";
import { StaticStars } from "@/components/review-stars";
import type { PublicReviewJSON, ReviewSummaryJSON, StorefrontReviewFeedItem } from "@/types/review";

const REVIEW_LIMIT = 8;

function legacyReviewToFeed(review: PublicReviewJSON, productId: number): StorefrontReviewFeedItem {
  return { id: review.id, rating: review.rating, title: review.title, review: review.review, customerName: review.customerName || review.customerDisplayName || "Customer", verifiedPurchase: review.verifiedPurchase, product: { id: productId, name: "My Pet Mart product", slug: "", image: null } };
}

export function CustomerReviewsClient({ productId }: { productId: number | null }) {
  const [reviews, setReviews] = useState<StorefrontReviewFeedItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummaryJSON | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const request = productId === null
      ? ReviewApi.listGlobal({ page: 1, pageSize: REVIEW_LIMIT, sort: "newest" })
      : ReviewApi.list(productId, { page: 1, pageSize: 4, sort: "newest" });
    request.then((result) => {
      if (cancelled) return;
      if (productId === null) {
        const globalResult = result as { reviews?: StorefrontReviewFeedItem[] };
        setReviews(Array.isArray(globalResult.reviews) ? globalResult.reviews : []);
        setSummary(null);
      } else {
        const legacy = result as { items?: PublicReviewJSON[]; summary?: ReviewSummaryJSON };
        setReviews(Array.isArray(legacy.items) ? legacy.items.map((item) => legacyReviewToFeed(item, productId)) : []);
        setSummary(legacy.summary ?? null);
      }
    }).catch(() => {
      if (!cancelled) { setReviews([]); setSummary(null); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) {
    return <section className="section-block bg-cream-bg py-14 sm:py-16"><div className="site-container"><div className="h-24 max-w-xl animate-pulse rounded-2xl bg-surface-secondary/40" /><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="h-72 animate-pulse rounded-2xl bg-white" /><div className="hidden h-72 animate-pulse rounded-2xl bg-white sm:block" /><div className="hidden h-72 animate-pulse rounded-2xl bg-white lg:block" /></div></div></section>;
  }

  if (productId !== null) {
    const legacyItems = reviews;
    return (
      <section className="section-block bg-cream-bg py-14 sm:py-16"><div className="site-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Real pet parents</p><h2 className="mt-4 text-[2.6rem] leading-[0.96] tracking-[-0.04em] text-text-primary sm:text-[3.6rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>Real happy tails.</h2></div>{summary && summary.reviewCount > 0 && <div className="flex w-full min-w-0 items-center gap-5 rounded-[18px] border border-deep-brown/15 bg-surface-secondary/45 px-6 py-4 sm:w-auto sm:min-w-[20rem]"><div><p className="text-4xl leading-none text-text-primary" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>{summary.averageRating.toFixed(1)}</p><div className="mt-2 text-primary-orange"><StaticStars rating={summary.averageRating} size={15} /></div></div><p className="max-w-[13rem] text-base leading-[1.45] text-text-primary/75">Based on {summary.reviewCount} review{summary.reviewCount === 1 ? "" : "s"}</p></div>}</div>
        {legacyItems.length > 0 ? <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{legacyItems.map((item) => <article key={item.id} className="flex min-h-[21rem] flex-col rounded-[20px] border border-deep-brown/15 bg-white p-6 sm:p-7"><StaticStars rating={item.rating} size={17} />{item.title && <h3 className="mt-5 text-xl font-bold leading-[1.2] text-text-primary">{item.title}</h3>}<p className="mt-4 whitespace-pre-line text-base leading-[1.7] text-text-primary/75">{item.review}</p><div className="mt-auto border-t border-deep-brown/15 pt-4"><p className="font-bold text-text-primary">{item.customerName || "Customer"}</p></div></article>)}</div> : <p className="mt-8 rounded-[20px] border border-deep-brown/15 bg-white px-6 py-7 text-text-primary/70">No approved reviews yet.</p>}
      </div></section>
    );
  }

  const description = summary && summary.reviewCount > 0 ? `Based on ${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"}` : "Honest words from the My Pet Mart community.";
  return <ReviewCarousel reviews={reviews} title="Loved by pets. Trusted by parents." description={description} />;
}
