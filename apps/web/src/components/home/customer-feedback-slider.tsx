"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Slider, { type Settings } from "react-slick";
import { PlayableVideoCard, ShoppableVideoCard } from "@/components/playable-video-card";
import { useCart } from "@/context/cart-context";
import { TESTIMONIAL_VIDEOS } from "@/data/testimonials";
import type { ProductListItem } from "@/types/storefront";

const SLIDER_SETTINGS: Settings = {
  arrows: false,
  infinite: true,
  slidesToScroll: 1,
  slidesToShow: 4,
  speed: 500,
  swipeToSlide: true,
  waitForAnimate: false,
  responsive: [
    { breakpoint: 1280, settings: { slidesToShow: 3 } },
    { breakpoint: 900, settings: { slidesToShow: 2 } },
    { breakpoint: 640, settings: { slidesToShow: 1 } },
  ],
};

function toNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function CustomerFeedbackSlider({ products }: { products: ProductListItem[] }) {
  const sliderRef = useRef<Slider>(null);
  const { add: addToCart } = useCart();

  return (
    <section className="section-block bg-peach-hero py-16 sm:py-20">
      <div className="site-container">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill-label bg-white text-text-primary">Real pet parents</span>
            <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
              Real pet parents.
              <span className="accent ml-2">Real happy tails.</span>
            </h2>
            <p className="body-copy mt-3 max-w-lg text-text-primary/80">
              Watch loving pet owners share their My Pet Mart experience.
            </p>
          </div>

          <div className="flex shrink-0 justify-end gap-2">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => sliderRef.current?.slickPrev()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white"
            >
              <ArrowLeft size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => sliderRef.current?.slickNext()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white"
            >
              <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="testimonial-slider mt-8">
          <Slider ref={sliderRef} {...SLIDER_SETTINGS}>
            {TESTIMONIAL_VIDEOS.map((src, index) => {
              // Merchandised with the Pet Grooming Brush product across all testimonial cards
              const groomingProduct =
                products.find((p) => p.name.toLowerCase().includes("groom")) ?? products[0] ?? null;
              const product = groomingProduct;
              const label = `Pet parent testimonial ${index + 1}`;

              const price = product ? toNumber(product.price) : null;

              if (!product || price === null) {
                return (
                  <article key={src}>
                    <PlayableVideoCard src={src} label={label} caption="Pet parent story" />
                  </article>
                );
              }

              return (
                <article key={src}>
                  <ShoppableVideoCard
                    src={src}
                    label={label}
                    slug={product.slug}
                    product={{
                      name: product.name,
                      price,
                      compareAtPrice: toNumber(product.compareAtPrice),
                      onAddToCart: () => addToCart(product.id, 1),
                    }}
                  />
                </article>
              );
            })}
          </Slider>
        </div>
      </div>
    </section>
  );
}
