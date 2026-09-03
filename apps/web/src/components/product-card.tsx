"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import type { Product as MockProduct } from "@/data/products";
import { HeartIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { ProductRatingBadge } from "@/components/product-rating-badge";
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

function formatPrice(value: string | number) {
  const price = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(price) ? price.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0";
}

interface NormalizedProduct {
  id: number | null;
  name: string;
  description: string | null;
  brand: string | null;
  slug: string;
  price: string | number;
  compareAtPrice: string | number | null;
  hasVariants: boolean;
  available: boolean;
  inStock: boolean | null;
  categoryName: string;
  categorySlug: string;
  imageUrl: string | null;
  imageAlt: string | null;
  averageRating: number;
  reviewCount: number;
}

function normalizeProduct(product: ProductListItem | MockProduct): NormalizedProduct {
  if ("id" in product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description ?? null,
      brand: product.brand,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      hasVariants: product.hasVariants,
      available: !(("available" in product) && product.available === false),
      inStock: product.inStock && product.stock > 0,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      imageUrl: product.primaryImage?.url ?? null,
      imageAlt: product.primaryImage?.alt ?? null,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
    };
  }

  return {
    id: null,
    name: product.name,
    description: null,
    brand: null,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.originalPrice > product.price ? product.originalPrice : null,
    hasVariants: false,
    available: true,
    inStock: null,
    categoryName: product.category,
    categorySlug: product.category.toLowerCase().replace(/\s+/g, "-"),
    imageUrl: null,
    imageAlt: product.imageLabel,
    // Mock fixture data never carries a real rating — see data/products.ts.
    averageRating: 0,
    reviewCount: 0,
  };
}

export function ProductCard({ product }: { product: ProductListItem | MockProduct }) {
  const normalized = normalizeProduct(product);
  const router = useRouter();
  const { status } = useCustomerAuth();
  const { add: addToCart } = useCart();
  const { isWishlisted, isPending, add, remove } = useWishlist();
  const [imageError, setImageError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const productId = normalized.id;
  const wishlisted = productId !== null && isWishlisted(productId);
  const wishlistPending = productId !== null && isPending(productId);
  const price = typeof normalized.price === "number" ? normalized.price : Number.parseFloat(normalized.price);
  const compareAtPrice = normalized.compareAtPrice == null
    ? null
    : typeof normalized.compareAtPrice === "number"
      ? normalized.compareAtPrice
      : Number.parseFloat(normalized.compareAtPrice);
  const discount = Number.isFinite(price) ? discountPercent(price, Number.isFinite(compareAtPrice) ? compareAtPrice : null) : null;
  const unavailable = !normalized.available || normalized.inStock === false;
  const productHref = `/products/${normalized.slug}`;
  const tone = TONES[normalized.categorySlug] ?? "peach";

  const handleWishlistClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (productId === null || wishlistPending) return;

    if (status !== "authenticated") {
      router.push("/signin");
      return;
    }

    void (wishlisted ? remove(productId) : add(productId));
  };

  const handleAddToCart = async () => {
    if (productId === null || unavailable || normalized.hasVariants || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      await addToCart(productId, 1);
    } catch {
      setAddError("Unable to add this product to your cart.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="group/card flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-deep-brown/15 bg-white shadow-[0_10px_30px_rgba(88,51,29,0.06)] transition-[box-shadow,transform,border-color] duration-150 hover:-translate-y-1 hover:border-deep-brown/20 hover:shadow-[0_18px_40px_rgba(88,51,29,0.12)]">
      <div className="relative aspect-square overflow-hidden rounded-t-[24px] bg-[#F8F0E6] sm:aspect-[4/3]">
        <Link
          href={productHref}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-deep-brown/50"
          aria-label={normalized.name}
        >
          {normalized.imageUrl && !imageError ? (
            <Image
              src={normalized.imageUrl}
              alt={normalized.imageAlt || normalized.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 50vw"
              className="object-contain p-3 transition-transform duration-150 ease-out group-hover/card:scale-[1.045] sm:p-5"
              onError={() => setImageError(true)}
            />
          ) : (
            <ProductImagePlaceholder label={normalized.name} tone={tone} className="absolute inset-0 h-full w-full" />
          )}
        </Link>

        {discount !== null && (
          <span className="absolute left-3 top-3 rounded-full bg-terracotta px-2.5 py-1 text-[11px] font-bold text-white shadow-sm sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-xs">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          disabled={wishlistPending}
          onClick={handleWishlistClick}
          className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-brown/10 bg-white/95 shadow-sm transition-colors duration-150 hover:border-deep-brown/25 hover:bg-cream-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 disabled:opacity-50 sm:right-4 sm:top-4 ${
            wishlisted ? "text-terracotta" : "text-text-primary"
          }`}
        >
          <HeartIcon width={19} height={19} fill={wishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-5">
        <p className="min-h-4 text-[10px] font-bold uppercase tracking-[0.1em] text-terracotta sm:text-[11px]">
          {normalized.categoryName}
        </p>
        <div className="mt-1 min-h-4">
          {normalized.brand && (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-text-primary/50 sm:text-[11px]">
              {normalized.brand}
            </p>
          )}
        </div>
        <h3 className="mt-1.5 min-h-[2.8rem] sm:mt-2 sm:min-h-[3.1rem]">
          <Link
            href={productHref}
            className="line-clamp-2 text-base font-bold leading-[1.28] text-text-primary transition-colors duration-150 hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 sm:text-[1.2rem]"
          >
            {normalized.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 min-h-[2.55rem] text-sm font-medium leading-[1.45] text-text-primary/65">
          {normalized.description || ""}
        </p>

        <div className="mt-1.5 min-h-5 sm:mt-2">
          {productId !== null && (
            <ProductRatingBadge
              productId={productId}
              href={`${productHref}#product-reviews`}
              compact
              showZero
              summary={{ averageRating: normalized.averageRating, reviewCount: normalized.reviewCount }}
            />
          )}
        </div>

        <div className="mt-2 flex min-h-8 flex-wrap items-baseline gap-x-1.5 gap-y-1 sm:mt-3 sm:gap-x-2">
          <span className="text-[1.2rem] font-bold leading-none text-text-primary sm:text-[1.45rem]">
            {normalized.hasVariants ? "Starts at ₹" : "₹"}{formatPrice(normalized.price)}
          </span>
          {normalized.compareAtPrice != null && discount !== null && (
            <span className="text-xs text-text-primary/50 line-through sm:text-base">
              ₹{formatPrice(normalized.compareAtPrice)}
            </span>
          )}
        </div>

        <div className="mt-1 min-h-4 text-[11px] font-medium text-text-primary/45 sm:text-xs">
          {normalized.hasVariants && <p>Multiple variants available</p>}
        </div>

        <div className="mt-2 min-h-5 text-xs font-semibold sm:mt-3 sm:text-sm">
          {normalized.inStock === false ? (
            <span className="inline-flex items-center gap-1.5 text-terracotta">
              <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden="true" />
              Out of Stock
            </span>
          ) : !normalized.available ? (
            <span className="inline-flex items-center gap-1.5 text-terracotta">
              <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden="true" />
              Unavailable
            </span>
          ) : normalized.inStock === true ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              In Stock
            </span>
          ) : normalized.inStock === false ? (
            <span className="inline-flex items-center gap-1.5 text-terracotta">
              <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden="true" />
              Out of Stock
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-3 sm:pt-5">
          {productId === null ? (
            <Link
              href={productHref}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-deep-brown px-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 sm:h-12 sm:px-4 sm:text-sm"
            >
              View Product
            </Link>
          ) : normalized.hasVariants ? (
            <Link
              href={productHref}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary-orange px-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 sm:h-12 sm:px-4 sm:text-sm"
            >
              View Options
            </Link>
          ) : (
            <button
              type="button"
              disabled={unavailable || adding}
              onClick={handleAddToCart}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary-orange px-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 sm:h-12 sm:px-4 sm:text-sm"
            >
              {normalized.inStock === false ? "Out of Stock" : !normalized.available ? "Unavailable" : adding ? "Adding..." : "Add to Cart"}
            </button>
          )}
          {addError && <p className="mt-2 text-xs text-terracotta sm:text-sm" role="alert">{addError}</p>}
        </div>
      </div>
    </article>
  );
}
