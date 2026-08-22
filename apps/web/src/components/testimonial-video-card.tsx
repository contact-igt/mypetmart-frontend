"use client";

import Link from "next/link";
import { discountPercent } from "@/lib/pricing";

const currency = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export type TestimonialVideoCardTestimonial = {
  id: number;
  mediaUrl: string;
  title: string | null;
  caption: string | null;
};

export type TestimonialVideoCardProduct = {
  name: string;
  slug: string;
  /** The Product's own current/starting price — never a value stored on the testimonial. */
  price: number;
  /** Pass null for a variant Product with no variant selected — see the discount-suppression note below. */
  compareAtPrice: number | null;
  hasVariants: boolean;
};

/**
 * Product-specific testimonial video, optionally merchandised with the linked
 * Product's real commerce data. Every price/name/URL field is read from the
 * `product` prop at render time — nothing commerce-related is ever stored on
 * the testimonial assignment itself (see ProductMediaAssignment: only
 * mediaAssetId/title/caption/displayOrder/active exist there).
 *
 * `variant="product-detail"`: restrained — video + title/caption only. Used
 * on the Product Detail Page, where the shopper is already on this Product's
 * page and a full repeated commerce footer would be redundant.
 * `variant="commerce"`: full card per the approved design — video, Product
 * name, price (+ compare-at/discount when a real one applies), and a
 * "Buy Now" link to the Product page. Reusable later for Homepage/collection
 * placements without any change to this pricing logic.
 */
export function TestimonialVideoCard({
  testimonial,
  product,
  variant = "commerce",
}: {
  testimonial: TestimonialVideoCardTestimonial;
  product: TestimonialVideoCardProduct;
  variant?: "product-detail" | "commerce";
}) {
  // A variant Product's compareAtPrice is only ever a specific variant's MRP —
  // showing it against the generic "From" starting price would misrepresent a
  // discount that may not apply to every option, so it is suppressed here
  // (the caller is expected to pass null for compareAtPrice on a variant
  // Product, mirroring the same convention already used by the PDP's own
  // price block before a variant is selected).
  const discountPct = discountPercent(product.price, product.compareAtPrice);
  const videoLabel = testimonial.title || `${product.name} customer story`;

  return (
    <figure className="overflow-hidden rounded-[24px] border border-border-subtle bg-white shadow-[0_10px_28px_rgba(74,37,17,0.08)]">
      <video
        src={testimonial.mediaUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={videoLabel}
        className="aspect-[9/16] w-full bg-deep-brown object-contain"
      >
        Your browser does not support video playback.
      </video>

      {(testimonial.title || testimonial.caption) && (
        <figcaption className="px-4 pt-3">
          {testimonial.title && <p className="text-sm font-semibold text-text-primary">{testimonial.title}</p>}
          {testimonial.caption && <p className="mt-1 text-xs text-text-muted">{testimonial.caption}</p>}
        </figcaption>
      )}

      {variant === "commerce" && (
        <div className="p-4">
          <p className="truncate text-sm font-semibold text-text-primary">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-base font-bold text-text-primary">
              {product.hasVariants ? "From " : ""}₹{currency.format(product.price)}
            </span>
            {discountPct !== null && product.compareAtPrice !== null && (
              <>
                <span className="text-xs text-text-muted line-through">₹{currency.format(product.compareAtPrice)}</span>
                <span className="text-xs font-semibold text-primary-orange">{discountPct}% off</span>
              </>
            )}
          </div>
          <Link href={`/products/${product.slug}`} className="button-primary mt-3 w-full">
            Buy Now
          </Link>
        </div>
      )}
    </figure>
  );
}
