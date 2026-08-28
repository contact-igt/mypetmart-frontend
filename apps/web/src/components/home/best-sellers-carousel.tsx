"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Slider, { type Settings } from "react-slick";
import type { ProductListItem } from "@/types/storefront";
import { FeaturedProductCard } from "./featured-product-card";

const SLIDER_SETTINGS: Settings = {
  arrows: false,
  infinite: false,
  slidesToScroll: 1,
  slidesToShow: 4,
  speed: 400,
  swipeToSlide: true,
  waitForAnimate: false,
  accessibility: true,
  responsive: [
    { breakpoint: 1280, settings: { slidesToShow: 3 } },
    // react-slick breakpoints are inclusive; 767 keeps the requested three cards at 768px.
    { breakpoint: 767, settings: { slidesToShow: 2 } },
    { breakpoint: 640, settings: { slidesToShow: 1.18 } },
  ],
};

export function BestSellersCarousel({ products }: { products: ProductListItem[] }) {
  const sliderRef = useRef<Slider>(null);

  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-primary/55 sm:hidden">
          Swipe to explore
        </p>
        <div className="ml-auto hidden items-center gap-2 sm:flex" aria-label="Best sellers carousel controls">
          <button
            type="button"
            aria-label="Previous best seller"
            onClick={() => sliderRef.current?.slickPrev()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-brown/20 bg-white text-deep-brown transition-colors duration-150 hover:border-deep-brown hover:bg-deep-brown hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <ArrowLeft size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next best seller"
            onClick={() => sliderRef.current?.slickNext()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-brown/20 bg-white text-deep-brown transition-colors duration-150 hover:border-deep-brown hover:bg-deep-brown hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <ArrowRight size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="best-sellers-carousel cursor-grab active:cursor-grabbing"
        role="region"
        aria-roledescription="carousel"
        aria-label="Best sellers products"
      >
        <Slider ref={sliderRef} {...SLIDER_SETTINGS}>
          {products.map((product, index) => (
            <div key={product.id} className="h-full px-2 py-1">
              <FeaturedProductCard product={product} index={index} />
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
}
