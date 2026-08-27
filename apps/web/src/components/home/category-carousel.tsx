"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Slider, { type Settings } from "react-slick";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import type { Category } from "@/types/storefront";

const TILE_TONES: readonly PlaceholderTone[] = ["terracotta", "orange", "mint", "peach", "brown", "yellow"];

const SLIDER_SETTINGS: Settings = {
  arrows: false,
  infinite: false,
  slidesToScroll: 1,
  slidesToShow: 2,
  speed: 400,
  swipeToSlide: true,
  waitForAnimate: false,
  responsive: [
    { breakpoint: 768, settings: { slidesToShow: 1 } },
  ],
};

function categoryDescription(category: Category) {
  if (category.description) return category.description;
  if (category.petType === "dog") return "Leashes, grooming, and paw care";
  if (category.petType === "cat") return "Grooming and everyday essentials";
  return "Explore pet essentials";
}

function categoryHref(category: Category) {
  if (category.petType === "dog") return "/shop?petType=dog";
  if (category.petType === "cat") return "/shop?petType=cat";
  return `/shop?category=${category.slug}`;
}

export function CategoryCarousel({ categories }: { categories: Category[] }) {
  const sliderRef = useRef<Slider>(null);

  return (
    <div className="relative mt-7">
      <div className="absolute -top-[4.5rem] right-0 hidden gap-2 sm:flex">
        <button
          type="button"
          aria-label="Previous category"
          onClick={() => sliderRef.current?.slickPrev()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown/20 bg-white text-deep-brown transition-colors duration-150 hover:bg-deep-brown hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
        >
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next category"
          onClick={() => sliderRef.current?.slickNext()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown/20 bg-white text-deep-brown transition-colors duration-150 hover:bg-deep-brown hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
        >
          <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <Slider ref={sliderRef} {...SLIDER_SETTINGS} className="category-carousel -mx-2">
        {categories.map((category, index) => (
          <div key={category.id} className="px-2">
            <Link
              href={categoryHref(category)}
              className="group relative block aspect-[1.55] overflow-hidden rounded-[24px] bg-surface-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/40 focus-visible:ring-offset-4 focus-visible:ring-offset-cream-bg"
            >
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.imageAlt || category.name}
                  fill
                  sizes="(min-width: 768px) 42vw, 88vw"
                  className="object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02]"
                />
              ) : (
                <ProductImagePlaceholder
                  label={category.name}
                  tone={TILE_TONES[index % TILE_TONES.length] ?? "peach"}
                  className="absolute inset-0 h-full w-full"
                  iconSize={48}
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep-brown/90 via-deep-brown/35 to-transparent px-6 pb-6 pt-16">
                <p className="text-[2rem] font-semibold leading-none text-white sm:text-[2.25rem]">{category.name}</p>
                <p className="mt-2 text-sm font-medium text-white/90 sm:text-base">{categoryDescription(category)} →</p>
              </div>
            </Link>
          </div>
        ))}
      </Slider>
    </div>
  );
}
