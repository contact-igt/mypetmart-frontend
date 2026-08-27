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

export function FeaturedProductCard({ product }: { product: ProductListItem }) {
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
    <article className="flex min-h-[31rem] min-w-0 flex-col overflow-hidden rounded-[24px] border border-deep-brown/15 bg-white">
      <div className="relative h-56 overflow-hidden rounded-t-[24px] bg-[#F8F0E6] sm:h-[14.5rem]">
        <Link href={productHref} className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-deep-brown/50" aria-label={product.name}>
          {product.primaryImage && !imageError ? (
            <Image
              src={product.primaryImage.url}
              alt={product.primaryImage.alt || product.name}
              fill
              sizes="(min-width: 1280px) 21vw, (min-width: 640px) 42vw, 100vw"
              className="object-contain p-4 transition-transform duration-150 ease-out hover:scale-[1.02]"
              onError={() => setImageError(true)}
            />
          ) : (
            <ProductImagePlaceholder label={product.name} tone={tone} className="absolute inset-0 h-full w-full" />
          )}
        </Link>

        {discount !== null && (
          <span className="absolute left-4 top-4 rounded-lg bg-terracotta px-3 py-1.5 text-sm font-bold text-white">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          disabled={wishlistPending}
          onClick={handleWishlist}
          className={`absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-brown/10 bg-white/95 transition-colors duration-150 hover:bg-cream-bg disabled:opacity-50 ${
            wishlisted ? "text-terracotta" : "text-text-primary"
          }`}
        >
          <HeartIcon width={19} height={19} fill={wishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-primary/55">{product.category.name}</p>
        <Link href={productHref} className="mt-2 line-clamp-2 min-h-[3rem] text-[1.2rem] font-bold leading-[1.25] text-text-primary hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30">
          {product.name}
        </Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[1.45rem] font-bold leading-none text-text-primary">
            {product.hasVariants ? "From " : ""}₹{formatPrice(product.price)}
          </span>
          {product.compareAtPrice && discount !== null && (
            <span className="text-base text-text-primary/50 line-through">₹{formatPrice(product.compareAtPrice)}</span>
          )}
        </div>
        <p className="mt-3 line-clamp-3 min-h-[4.35rem] text-sm font-medium leading-[1.45] text-text-primary/70">{product.description || ""}</p>

        <div className="mt-auto pt-5">
          {product.hasVariants ? (
            <Link href={productHref} className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-deep-brown px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30">
              Choose Options
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
  );
}
