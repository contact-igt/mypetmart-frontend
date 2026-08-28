"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TestimonialVideoPlayer } from "./testimonial-video-player";
import { ProductImagePlaceholder } from "@/components/image-placeholder";
import type { StorefrontTestimonial } from "@/types/storefront";

export function TestimonialCard({ testimonial }: { testimonial: StorefrontTestimonial }) {
  const [imageError, setImageError] = useState(false);
  const product = testimonial.product;
  const label = testimonial.title || `${product.name} customer story`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-deep-brown/10 bg-white shadow-[0_8px_24px_rgba(74,37,17,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(74,37,17,0.12)]">
      <TestimonialVideoPlayer src={testimonial.videoUrl} label={label} poster={product.image} />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {testimonial.title && <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-text-primary">{testimonial.title}</h3>}
        {testimonial.caption && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-primary/65">{testimonial.caption}</p>}
        <Link href={`/products/${product.slug}`} className="mt-4 flex items-center gap-3 rounded-xl border border-deep-brown/10 bg-[#FFF8EF] p-2.5 transition-colors hover:border-primary-orange/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-orange">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
            {product.image && !imageError ? (
              <Image src={product.image} alt={product.name} fill sizes="48px" className="object-cover" onError={() => setImageError(true)} />
            ) : (
              <ProductImagePlaceholder label={product.name} className="h-full w-full rounded-lg" iconSize={18} />
            )}
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta">Product</span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-text-primary">{product.name}</span>
          </div>
        </Link>
      </div>
    </article>
  );
}
