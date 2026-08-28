"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Slider, { type Settings } from "react-slick";
import { ReviewCard } from "./review-card";
import type { StorefrontReviewFeedItem } from "@/types/review";

export function ReviewCarousel({ reviews, eyebrow = "Customer reviews", title = "Loved by pets. Trusted by parents.", description = "Honest words from the My Pet Mart community.", compact = false, showHeader = true, singleCard = false, fullReview = false, loading = false, showArrows = false }: { reviews: StorefrontReviewFeedItem[]; eyebrow?: string; title?: string; description?: string; compact?: boolean; showHeader?: boolean; singleCard?: boolean; fullReview?: boolean; loading?: boolean; showArrows?: boolean }) {
  const sliderRef = useRef<Slider>(null);
  const canNavigate = reviews.length > 1;
  const settings: Settings = {
    arrows: false,
    dots: singleCard ? false : canNavigate,
    infinite: reviews.length > 3,
    slidesToScroll: 1,
    slidesToShow: singleCard ? 1 : 3,
    speed: 450,
    swipeToSlide: true,
    waitForAnimate: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: singleCard ? 1 : 2 } },
      { breakpoint: 640, settings: singleCard ? { slidesToShow: 1, centerMode: false, centerPadding: "0" } : { slidesToShow: 1, centerMode: true, centerPadding: "8%" } },
    ],
  };

  return (
    <section className={compact ? "" : "section-block bg-cream-bg py-14 sm:py-16"} aria-labelledby={showHeader ? "review-carousel-heading" : undefined} aria-label={showHeader ? undefined : "Product reviews"}>
      <div className={compact ? "" : "site-container"}>
        {showHeader && <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill-label border border-deep-brown/10 bg-white text-text-primary">{eyebrow}</span>
            <h2 id="review-carousel-heading" className="mt-4 text-[2.6rem] leading-[0.96] tracking-[-0.04em] text-text-primary sm:text-[3.5rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>{title}</h2>
            <p className="body-copy mt-4 max-w-xl text-base text-text-primary/70 sm:text-lg">{description}</p>
          </div>
          {canNavigate && <div className="flex shrink-0 gap-2"><button type="button" aria-label="Previous review" onClick={() => sliderRef.current?.slickPrev()} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"><ArrowLeft size={18} aria-hidden="true" /></button><button type="button" aria-label="Next review" onClick={() => sliderRef.current?.slickNext()} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"><ArrowRight size={18} aria-hidden="true" /></button></div>}
        </div>}
        {loading ? <div className="min-h-[18rem] animate-pulse rounded-2xl border border-deep-brown/10 bg-white" aria-label="Loading reviews" /> : reviews.length === 0 ? <p className="mt-8 rounded-2xl border border-deep-brown/10 bg-white px-5 py-6 text-sm text-text-primary/65">No approved reviews yet.</p> : <div className={`relative testimonial-slider ${compact ? "" : "mt-8 sm:mt-10"}`}>
          {showArrows && canNavigate && <div className="absolute right-4 top-4 z-10 flex gap-2">
            <button type="button" aria-label="Previous review" onClick={() => sliderRef.current?.slickPrev()} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown bg-white/95 text-deep-brown shadow-sm transition-colors hover:bg-deep-brown hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"><ArrowLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Next review" onClick={() => sliderRef.current?.slickNext()} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown bg-white/95 text-deep-brown shadow-sm transition-colors hover:bg-deep-brown hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"><ArrowRight size={18} aria-hidden="true" /></button>
          </div>}
          <Slider ref={sliderRef} {...settings}>{reviews.map((review) => <div key={review.id} className={`h-full ${singleCard ? "px-0" : "px-2"} pb-5`}><ReviewCard review={review} fullReview={fullReview} /></div>)}</Slider>
        </div>}
      </div>
    </section>
  );
}
