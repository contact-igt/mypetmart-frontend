"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Slider, { type Settings } from "react-slick";
import { TestimonialCard } from "./testimonial-card";
import type { StorefrontTestimonial } from "@/types/storefront";

export function TestimonialCarousel({ testimonials, eyebrow = "Real pet parents", title = "Pet parent favourites", description = "Stories from people and pets who found something to love.", compact = false }: { testimonials: StorefrontTestimonial[]; eyebrow?: string; title?: string; description?: string; compact?: boolean }) {
  const sliderRef = useRef<Slider>(null);
  const canNavigate = testimonials.length > 1;
  const settings: Settings = {
    arrows: false,
    dots: false,
    infinite: testimonials.length > 3,
    slidesToScroll: 1,
    slidesToShow: 3,
    speed: 450,
    swipeToSlide: true,
    waitForAnimate: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1, centerMode: true, centerPadding: "5%" } },
    ],
  };

  return (
    <section className={compact ? "" : "section-block bg-peach-hero py-16 sm:py-20"} aria-labelledby="testimonial-carousel-heading">
      <div className={compact ? "" : "site-container"}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill-label bg-white text-text-primary">{eyebrow}</span>
            <h2 id="testimonial-carousel-heading" className="mt-4 text-[2.6rem] leading-[0.98] tracking-[-0.03em] text-text-primary sm:text-[3.5rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>{title}</h2>
            <p className="body-copy mt-4 max-w-xl text-base text-text-primary/75 sm:text-lg">{description}</p>
          </div>
          {canNavigate && <div className="flex shrink-0 gap-2">
            <button type="button" aria-label="Previous testimonial" onClick={() => sliderRef.current?.slickPrev()} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"><ArrowLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Next testimonial" onClick={() => sliderRef.current?.slickNext()} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange"><ArrowRight size={18} aria-hidden="true" /></button>
          </div>}
        </div>
        {testimonials.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-deep-brown/10 bg-white/70 px-5 py-6 text-sm text-text-primary/65">No customer stories are available yet.</p>
        ) : (
          <div className="testimonial-slider mt-8 sm:mt-10">
            <Slider ref={sliderRef} {...settings}>{testimonials.map((testimonial) => <div key={testimonial.id} className="h-full px-0 pb-5 sm:px-2"><TestimonialCard testimonial={testimonial} /></div>)}</Slider>
          </div>
        )}
      </div>
    </section>
  );
}
