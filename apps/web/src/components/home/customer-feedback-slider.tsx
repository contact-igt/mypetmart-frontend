"use client";

import { TestimonialCarousel } from "@/components/testimonials/testimonial-carousel";
import type { StorefrontTestimonial } from "@/types/storefront";

/** Compatibility wrapper retained for callers that still import this component. */
export function CustomerFeedbackSlider({ testimonials }: { testimonials: StorefrontTestimonial[] }) {
  return <TestimonialCarousel testimonials={testimonials} title="Pet parent favourites" description="Things pets love. Things pet parents keep coming back for." />;
}
