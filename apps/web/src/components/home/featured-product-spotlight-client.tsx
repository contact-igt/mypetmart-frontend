"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { ProductRatingBadge } from "@/components/product-rating-badge";
import { useCart } from "@/context/cart-context";
import { discountPercent as getDiscountPercent } from "@/lib/pricing";
import type { ProductDetail } from "@/types/storefront";

const TONES: Record<string, PlaceholderTone> = {
  grooming: "terracotta",
  "walking-essentials": "orange",
  "cat-essentials": "mint",
  "paw-care": "peach",
  "dog-essentials": "brown",
};

function formatPrice(value: string) {
  const price = Number.parseFloat(value);
  return Number.isFinite(price) ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0";
}

export function FeaturedProductSpotlightClient({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState<"idle" | "buying">("idle");
  const [error, setError] = useState<string | null>(null);

  const unavailable = !product.inStock || product.stock === 0;
  const price = Number.parseFloat(product.price);
  const compareAtPrice = product.compareAtPrice ? Number.parseFloat(product.compareAtPrice) : null;
  const discount = Number.isFinite(price) ? getDiscountPercent(price, Number.isFinite(compareAtPrice) ? compareAtPrice : null) : null;
  const maxQuantity = Math.max(1, Math.min(product.stock, 99));
  const tone = TONES[product.category.slug] ?? "peach";
  const productHref = `/products/${product.slug}`;
  const image = product.primaryImage || product.images[0] || null;
  const spotlightFeatures = product.features.slice(0, 4);

  const buyNow = async () => {
    if (unavailable || product.hasVariants || action !== "idle") return;
    setAction("buying");
    setError(null);
    try {
      await add(product.id, quantity);
      router.push("/cart");
    } catch {
      setError("Unable to add this product to your cart.");
    } finally {
      setAction("idle");
    }
  };

  return (
    <section className="section-block bg-cream-bg py-8 sm:py-10">
      <div className="site-container">
        <div className="mx-auto grid max-w-[1280px] overflow-hidden rounded-[26px] border border-deep-brown/15 bg-white lg:grid-cols-[1fr_1fr]">
          <Link
            href={productHref}
            className="relative block min-h-[22rem] overflow-hidden bg-surface-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-deep-brown/40 sm:min-h-[34rem] lg:min-h-[710px]"
            aria-label={product.name}
          >
            {image ? (
              <span className="absolute inset-8 sm:inset-12 lg:inset-16">
                <Image
                  src={image.url}
                  alt={image.alt || product.name}
                  fill
                  priority
                  sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 78vw"
                  className="object-contain"
                />
              </span>
            ) : (
              <ProductImagePlaceholder label={product.name} tone={tone} className="absolute inset-0 h-full w-full rounded-none" iconSize={70} />
            )}
          </Link>

          <div className="flex flex-col px-7 py-9 sm:px-12 sm:py-12 lg:px-12 lg:py-12">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-terracotta">Featured product</p>
            <h2 className="mt-4 text-[2.15rem] font-extrabold leading-[1.05] text-text-primary sm:text-[2.7rem]">
              {product.name}
            </h2>

            <div className="mt-4 min-h-5">
              <ProductRatingBadge productId={product.id} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[2.15rem] font-extrabold leading-none text-text-primary">₹{formatPrice(product.price)}</span>
              {product.compareAtPrice && discount !== null && (
                <span className="text-lg font-semibold text-text-primary/45 line-through">₹{formatPrice(product.compareAtPrice)}</span>
              )}
              {discount !== null && <span className="rounded-lg bg-terracotta px-3 py-1.5 text-sm font-bold text-white">{discount}% OFF</span>}
            </div>

            {product.description && <p className="mt-5 line-clamp-3 max-w-[28rem] text-lg font-medium leading-[1.55] text-text-primary/75">{product.description}</p>}

            {spotlightFeatures.length > 0 && (
              <ul className="mt-7 space-y-3" aria-label={`${product.name} features`}>
                {spotlightFeatures.map((feature) => (
                  <li key={feature.id} className="flex gap-3 text-base font-medium text-text-primary/90">
                    <span className="font-bold text-[#5B8C64]" aria-hidden="true">✓</span>
                    {feature.label}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap gap-3 sm:items-center">
              {product.hasVariants ? (
                <Link href={productHref} className="inline-flex h-[70px] min-w-[13rem] items-center justify-center rounded-xl bg-deep-brown px-8 text-base font-bold text-white transition-colors duration-150 hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30">
                  Choose Options
                </Link>
              ) : (
                <>
                  <div className="inline-flex h-[58px] w-[138px] items-center justify-between rounded-xl border border-deep-brown/15 bg-cream-bg px-2">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={quantity <= 1 || unavailable || action !== "idle"}
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      className="inline-flex h-11 w-10 items-center justify-center rounded-lg text-text-primary hover:bg-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
                    >
                      <Minus size={18} aria-hidden="true" />
                    </button>
                    <span aria-label="Quantity" className="w-8 text-center text-lg font-bold text-text-primary">{quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={quantity >= maxQuantity || unavailable || action !== "idle"}
                      onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                      className="inline-flex h-11 w-10 items-center justify-center rounded-lg text-text-primary hover:bg-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
                    >
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <Link
                    href={productHref}
                    className="inline-flex h-[70px] w-[148px] items-center justify-center rounded-xl bg-deep-brown px-6 text-center text-base font-bold leading-tight text-white transition-colors duration-150 hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
                  >
                    Choose Options
                  </Link>
                  <button
                    type="button"
                    disabled={unavailable || action !== "idle"}
                    onClick={() => void buyNow()}
                    className="inline-flex h-[58px] min-w-[116px] items-center justify-center rounded-xl bg-[#B86937] px-6 text-base font-bold text-white transition-colors duration-150 hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
                  >
                    {action === "buying" ? "Opening Cart..." : "Buy Now"}
                  </button>
                </>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-terracotta" role="alert">{error}</p>}

            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-deep-brown/10 pt-5 text-sm font-medium text-text-primary/70 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <span aria-hidden="true">🚚</span>
                Pan-India delivery
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">💵</span>
                COD available
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">🔒</span>
                Secure checkout
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">↩</span>
                Easy returns
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
