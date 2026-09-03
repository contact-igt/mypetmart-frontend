"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { HeartIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { useCart } from "@/context/cart-context";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useWishlist } from "@/context/wishlist-context";
import { discountPercent } from "@/lib/pricing";
import type { ProductListItem } from "@/types/storefront";

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

export function FeaturedProductCard({ product, index = 0 }: { product: ProductListItem; index?: number }) {
  const router = useRouter();
  const { status } = useCustomerAuth();
  const { add: addToCart } = useCart();
  const { isWishlisted, isPending, add, remove } = useWishlist();
  const [imageError, setImageError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const wishlisted = isWishlisted(product.id);
  const wishlistPending = isPending(product.id);
  const price = Number.parseFloat(product.price);
  const compareAtPrice = product.compareAtPrice ? Number.parseFloat(product.compareAtPrice) : null;
  const discount = Number.isFinite(price) ? discountPercent(price, Number.isFinite(compareAtPrice) ? compareAtPrice : null) : null;
  const unavailable = !product.inStock || product.stock === 0;
  const productHref = `/products/${product.slug}`;
  const tone = TONES[product.category.slug] ?? "peach";

  const handleWishlist = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (wishlistPending) return;
    if (status !== "authenticated") {
      router.push("/signin");
      return;
    }
    void (wishlisted ? remove(product.id) : add(product.id));
  };

  const handleAddToCart = async () => {
    if (unavailable || product.hasVariants || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      await addToCart(product.id, 1);
    } catch {
      setAddError("Unable to add this product to your cart.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="motion-enter h-full" style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}>
      <article className="group/card flex h-full min-h-[30rem] min-w-0 flex-col overflow-hidden rounded-[24px] border border-deep-brown/15 bg-white shadow-[0_10px_30px_rgba(88,51,29,0.06)] transition-[box-shadow,transform,border-color] duration-150 hover:-translate-y-1 hover:border-deep-brown/20 hover:shadow-[0_18px_40px_rgba(88,51,29,0.12)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-[24px] bg-[#F8F0E6]">
          <Link href={productHref} className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-deep-brown/50" aria-label={product.name}>
            {product.primaryImage && !imageError ? (
              <Image
                src={product.primaryImage.url}
                alt={product.primaryImage.alt || product.name}
                fill
                sizes="(min-width: 1280px) 21vw, (min-width: 768px) 29vw, (min-width: 640px) 45vw, 85vw"
                className="object-contain p-5 transition-transform duration-150 ease-out group-hover/card:scale-[1.045]"
                onError={() => setImageError(true)}
              />
            ) : (
              <ProductImagePlaceholder label={product.name} tone={tone} className="absolute inset-0 h-full w-full" />
            )}
          </Link>

          {discount !== null && (
            <span className="absolute left-4 top-4 rounded-full bg-terracotta px-3 py-1.5 text-xs font-bold text-white shadow-sm">
              {discount}% OFF
            </span>
          )}
          <button
            type="button"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wishlisted}
            disabled={wishlistPending}
            onClick={handleWishlist}
            className={`absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown/10 bg-white/95 shadow-sm transition-colors duration-150 hover:border-deep-brown/25 hover:bg-cream-bg disabled:opacity-50 ${
              wishlisted ? "text-terracotta" : "text-text-primary"
            }`}
          >
            <HeartIcon width={19} height={19} fill={wishlisted ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-terracotta">{product.category.name}</p>
          <Link href={productHref} className="mt-2 line-clamp-2 min-h-[3.1rem] text-[1.2rem] font-bold leading-[1.28] text-text-primary transition-colors duration-150 hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30">
            {product.name}
          </Link>
          <p className="mt-2 line-clamp-2 min-h-[2.55rem] text-sm font-medium leading-[1.45] text-text-primary/65">
            {product.description || ""}
          </p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[1.45rem] font-bold leading-none text-text-primary">
              {product.hasVariants ? "Starts at " : ""}₹{formatPrice(product.price)}
            </span>
            {product.compareAtPrice && discount !== null && (
              <span className="text-base text-text-primary/50 line-through">₹{formatPrice(product.compareAtPrice)}</span>
            )}
          </div>
          {product.hasVariants && (
            <p className="mt-1 text-xs font-medium text-text-primary/45">Multiple variants available</p>
          )}
          <div className="mt-auto pt-5">
            {product.hasVariants ? (
              <Link href={productHref} className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-deep-brown px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30">
                View Options
              </Link>
            ) : (
              <button
                type="button"
                disabled={unavailable || adding}
                onClick={handleAddToCart}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-deep-brown px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
              >
                {unavailable ? "Out of Stock" : adding ? "Adding..." : "Add to Cart"}
              </button>
            )}
            {addError && <p className="mt-2 text-sm text-terracotta" role="alert">{addError}</p>}
          </div>
        </div>
      </article>
    </div>
  );
}
