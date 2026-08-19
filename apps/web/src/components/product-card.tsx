"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import type { Product as MockProduct } from "@/data/products";
import type { ProductListItem } from "@/types/storefront";
import { HeartIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useWishlist } from "@/context/wishlist-context";

const CARD_SURFACES: Record<string, string> = {
  grooming: "bg-[#F7D09D]",
  "walking-essentials": "bg-[#FFF8EF]",
  "paw-care": "bg-[#F4BD84]",
  "dog-essentials": "bg-[#F3C496]",
  "cat-essentials": "bg-[#FFF8ED]",
};

const TONES: Record<string, PlaceholderTone> = {
  grooming: "terracotta",
  "walking-essentials": "orange",
  "cat-essentials": "mint",
  "paw-care": "peach",
  "dog-essentials": "brown",
};

const MOCK_IMAGES: Record<string, string> = {
  Grooming: "/assest/Grooming.png",
  "Walking Essentials": "/assest/Walking Essentials.png",
  "Paw Care": "/assest/Paw Care.png",
  "Dog Essentials": "/assest/Dog Essentials.png",
  "Cat Essentials": "/assest/Cat Essentials.png",
};

const formatPrice = (priceVal: number | string) => {
  const num = typeof priceVal === "number" ? priceVal : parseFloat(priceVal);
  return isNaN(num) ? "0" : num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

interface NormalizedProduct {
  id: number | null;
  name: string;
  brand: string | null;
  slug: string;
  price: string | number;
  compareAtPrice: string | number | null;
  hasVariants: boolean;
  inStock: boolean;
  stock: number;
  categorySlug: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

function normalizeProduct(p: ProductListItem | MockProduct): NormalizedProduct {
  if ("id" in p) {
    // Real ProductListItem
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      hasVariants: p.hasVariants,
      inStock: p.inStock,
      stock: p.stock,
      categorySlug: p.category.slug,
      imageUrl: p.primaryImage ? p.primaryImage.url : null,
      imageAlt: p.primaryImage ? p.primaryImage.alt : null,
    };
  } else {
    // Mock Product — no numeric id from the backend, so it cannot be wishlisted.
    return {
      id: null,
      name: p.name,
      brand: null,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.originalPrice > p.price ? p.originalPrice : null,
      hasVariants: false,
      inStock: true,
      stock: 10,
      categorySlug: p.category.toLowerCase().replace(/\s+/g, "-"),
      imageUrl: MOCK_IMAGES[p.category] || null,
      imageAlt: p.imageLabel,
    };
  }
}

export function ProductCard({ product }: { product: ProductListItem | MockProduct }) {
  const normalized = normalizeProduct(product);
  const isOutOfStock = !normalized.inStock || normalized.stock === 0;
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { status } = useCustomerAuth();
  const { isWishlisted, isPending, add, remove } = useWishlist();

  const productId = normalized.id;
  const wishlisted = productId !== null && isWishlisted(productId);
  const wishlistPending = productId !== null && isPending(productId);

  const handleWishlistClick = (e: MouseEvent<HTMLButtonElement>) => {
    // The whole card is a Link to the Product Detail route — stop the heart
    // click from also triggering that navigation.
    e.preventDefault();
    e.stopPropagation();

    if (productId === null || wishlistPending) return;

    if (status !== "authenticated") {
      router.push("/signin");
      return;
    }

    if (wishlisted) {
      void remove(productId);
    } else {
      void add(productId);
    }
  };

  // Safe decimal comparison via paise
  const priceVal = Math.round((typeof normalized.price === "number" ? normalized.price : parseFloat(normalized.price)) * 100);
  const compareVal = normalized.compareAtPrice
    ? Math.round((typeof normalized.compareAtPrice === "number" ? normalized.compareAtPrice : parseFloat(normalized.compareAtPrice)) * 100)
    : 0;
  const hasDiscount = normalized.compareAtPrice !== null && compareVal > priceVal;

  const cardSurfaceClass = CARD_SURFACES[normalized.categorySlug] || "bg-[#FFF8EF]";
  const tone = TONES[normalized.categorySlug] || "peach";

  return (
    <Link href={`/products/${normalized.slug}`} className="group block focus:outline-none">
      <article className="overflow-hidden rounded-[26px] bg-[#FFF8EF] shadow-[0_10px_22px_rgba(88,51,29,0.04)] transition-transform duration-200 group-hover:-translate-y-1">
        <div className="relative aspect-[4/5] overflow-hidden bg-cream-bg">
          {normalized.imageUrl && !imageError ? (
            <Image
              src={normalized.imageUrl}
              alt={normalized.imageAlt || normalized.name}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <ProductImagePlaceholder label={normalized.name} tone={tone} className="absolute inset-0 h-full w-full" />
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-primary">
                Out of Stock
              </span>
            </div>
          )}

          <button
            type="button"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wishlisted}
            disabled={wishlistPending}
            className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center transition-opacity duration-150 hover:opacity-60 disabled:opacity-50 ${
              wishlisted ? "text-terracotta" : "text-text-primary"
            }`}
            onClick={handleWishlistClick}
          >
            <HeartIcon width={19} height={19} fill={wishlisted ? "currentColor" : "none"} />
          </button>
        </div>

        <div className={`${cardSurfaceClass} min-h-[143px] p-5 transition-colors duration-200`}>
          <div className="flex flex-col justify-between h-full">
            <div>
              {normalized.brand && (
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-primary/50">
                  {normalized.brand}
                </p>
              )}
              <h3
                className="min-h-[3rem] text-[1.2rem] leading-[1.15] text-text-primary"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                {normalized.name}
              </h3>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span
                className="text-[1.2rem] leading-none text-text-primary"
                style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
              >
                {normalized.hasVariants ? "From " : ""}₹{formatPrice(normalized.price)}
              </span>
              {hasDiscount && normalized.compareAtPrice && (
                <span className="text-sm text-text-primary/55 line-through">
                  ₹{formatPrice(normalized.compareAtPrice)}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}