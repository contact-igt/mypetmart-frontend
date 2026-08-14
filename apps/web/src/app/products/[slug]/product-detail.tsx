"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeartIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/cart-context";
import { AppAuthError } from "@/lib/auth/auth-errors";
import type { ProductDetail, ProductVariant, ProductImage } from "@/types/storefront";

const TONES: Record<string, PlaceholderTone> = {
  grooming: "terracotta",
  "walking-essentials": "orange",
  "cat-essentials": "mint",
  "paw-care": "peach",
  "dog-essentials": "brown",
};

const formatPrice = (priceVal: number | string) => {
  const num = typeof priceVal === "number" ? priceVal : parseFloat(priceVal);
  return isNaN(num) ? "0" : num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export function ProductDetailClient({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { status } = useCustomerAuth();
  const { isWishlisted, isPending, add, remove } = useWishlist();
  const { add: addToCart } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(
    product.primaryImage || (product.images && product.images.length > 0 ? product.images[0] : null)
  );
  const [quantity, setQuantity] = useState(1);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());

  // Cart interaction states
  const [cartStatus, setCartStatus] = useState<"idle" | "adding" | "success" | "error">("idle");
  const [cartError, setCartError] = useState<string | null>(null);

  const productId = product.id;
  const wishlisted = isWishlisted(productId);
  const wishlistPending = isPending(productId);

  const tone = TONES[product.category.slug] || "peach";

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (wishlistPending) return;

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

  // Safe pricing configuration
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentComparePrice = selectedVariant
    ? selectedVariant.compareAtPrice
    : product.hasVariants
    ? null
    : product.compareAtPrice;

  const priceVal = Math.round((typeof currentPrice === "number" ? currentPrice : parseFloat(currentPrice)) * 100);
  const compareVal = currentComparePrice
    ? Math.round((typeof currentComparePrice === "number" ? currentComparePrice : parseFloat(currentComparePrice)) * 100)
    : 0;
  const hasDiscount = currentComparePrice !== null && compareVal > priceVal;

  const isOutOfStock = selectedVariant
    ? selectedVariant.stock === 0
    : product.hasVariants
    ? product.variants.length > 0 && product.variants.every((v) => v.stock === 0)
    : product.stock === 0;

  const maxQuantity = selectedVariant
    ? Math.min(selectedVariant.stock, 20)
    : product.hasVariants
    ? 0
    : Math.min(product.stock, 20);

  // Synchronous render-phase adjustment when the variant changes.
  const [prevVariant, setPrevVariant] = useState<ProductVariant | null>(null);
  if (selectedVariant !== prevVariant) {
    setPrevVariant(selectedVariant);
    if (selectedVariant) {
      const variantMax = Math.min(selectedVariant.stock, 20);
      if (quantity > variantMax) {
        setQuantity(Math.max(1, variantMax));
      }
    }
  }

  const handleMinus = () => {
    setQuantity((q) => Math.max(1, q - 1));
    setCartStatus("idle");
    setCartError(null);
  };

  const handlePlus = () => {
    setQuantity((q) => Math.min(maxQuantity, q + 1));
    setCartStatus("idle");
    setCartError(null);
  };

  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setCartStatus("idle");
    setCartError(null);
  };

  const handleImageError = (imageId: number) => {
    setBrokenImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  const handleAddToCart = async () => {
    if (product.hasVariants && !selectedVariant) return;

    setCartStatus("adding");
    setCartError(null);

    try {
      await addToCart(
        product.id,
        quantity,
        product.hasVariants ? selectedVariant?.id : undefined
      );
      setCartStatus("success");
    } catch (error) {
      setCartStatus("error");
      if (error instanceof AppAuthError) {
        if (error.code === "CART_INSUFFICIENT_STOCK") {
          const available = error.details?.availableQuantity ?? 0;
          setCartError(`Only ${available} unit(s) are currently available.`);
        } else if (error.code === "CART_QUANTITY_LIMIT_EXCEEDED") {
          const limit = error.details?.max ?? 20;
          setCartError(`Cart line quantity cannot exceed ${limit} units.`);
        } else if (error.code === "CART_PRODUCT_NOT_AVAILABLE") {
          setCartError("Product currently unavailable.");
        } else if (error.code === "CART_VARIANT_NOT_AVAILABLE") {
          setCartError("Selected option unavailable.");
        } else {
          setCartError(error.message || "Something went wrong. Please try again.");
        }
      } else {
        const err = error as Error;
        setCartError(err.message || "Something went wrong. Please try again.");
      }
    }
  };

  const mainImageToRender = selectedImage;
  const isMainImageBroken = mainImageToRender ? brokenImageIds.has(mainImageToRender.id) : true;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-12 lg:px-[96px]">
      {/* Breadcrumb */}
      <nav className="text-sm font-medium text-text-muted mb-8 flex flex-wrap items-center gap-2" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
        <span className="text-text-muted/40">/</span>
        <Link href="/shop" className="hover:text-text-primary transition-colors">Shop</Link>
        <span className="text-text-muted/40">/</span>
        <Link
          href={`/shop?category=${product.category.slug}`}
          className="hover:text-text-primary transition-colors"
        >
          {product.category.name}
        </Link>
        <span className="text-text-muted/40">/</span>
        <span className="text-text-primary font-medium" aria-current="page">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[26px] bg-[#FFF8EF] border border-border-subtle shadow-[0_10px_22px_rgba(88,51,29,0.02)]">
            {mainImageToRender && !isMainImageBroken ? (
              <Image
                src={mainImageToRender.url}
                alt={mainImageToRender.alt || product.name}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 95vw"
                className="object-cover transition-opacity duration-200"
                onError={() => handleImageError(mainImageToRender.id)}
              />
            ) : (
              <ProductImagePlaceholder
                label={product.name}
                tone={tone}
                className="absolute inset-0 h-full w-full"
              />
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <span className="rounded-full bg-white/90 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Navigation */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto py-2 scrollbar-none snap-x snap-mandatory">
              {product.images.map((img) => {
                const isBroken = brokenImageIds.has(img.id);
                const isSelected = selectedImage ? selectedImage.id === img.id : false;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      setSelectedImage(img);
                      setCartStatus("idle");
                      setCartError(null);
                    }}
                    aria-label={`View image ${img.sortOrder}`}
                    aria-current={isSelected ? "true" : "false"}
                    className={`relative aspect-square w-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-[14px] border-2 transition-all duration-150 snap-start ${
                      isSelected
                        ? "border-primary-orange shadow-sm"
                        : "border-border-subtle bg-[#FFF8EF] hover:border-text-primary/40"
                    }`}
                  >
                    {isBroken ? (
                      <ProductImagePlaceholder
                        label={product.name}
                        tone={tone}
                        iconSize={16}
                        className="h-full w-full rounded-md"
                      />
                    ) : (
                      <Image
                        src={img.url}
                        alt={img.alt || `Thumbnail ${img.sortOrder}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                        onError={() => handleImageError(img.id)}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Content and Purchase Panel */}
        <div className="flex flex-col">
          {/* Pet type & category context */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-orange bg-[#FFE9D6] px-3 py-1 rounded-full">
              {product.petType === "all" ? "For Dogs & Cats" : `For ${product.petType}s`}
            </span>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {product.category.name}
            </span>
          </div>

          {/* Title and Wishlist */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <h1
              className="text-3xl sm:text-4xl text-text-primary leading-tight font-medium"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              {product.name}
            </h1>
            <button
              type="button"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              disabled={wishlistPending}
              onClick={handleWishlistClick}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer ${
                wishlisted
                  ? "border-terracotta bg-[#FFF0ED] text-terracotta"
                  : "border-border-subtle bg-white text-text-primary hover:border-text-primary/50"
              } disabled:opacity-50`}
            >
              <HeartIcon className="h-5 w-5" fill={wishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Price Block */}
          <div className="flex items-baseline gap-3 mb-4">
            <span
              className="text-3xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
            >
              {product.hasVariants && !selectedVariant ? "From " : ""}₹{formatPrice(currentPrice)}
            </span>
            {hasDiscount && currentComparePrice && (
              <span className="text-lg text-text-muted line-through">
                ₹{formatPrice(currentComparePrice)}
              </span>
            )}
          </div>

          {/* Stock State */}
          <div className="mb-8" aria-live="polite">
            {product.hasVariants && product.variants.length === 0 ? (
              <span className="inline-flex items-center rounded-lg bg-[#FFF0ED] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-terracotta">
                Product currently unavailable
              </span>
            ) : product.hasVariants && !selectedVariant ? (
              <span className="text-sm text-text-muted italic">
                Choose an option below to view availability.
              </span>
            ) : isOutOfStock ? (
              <span className="inline-flex items-center rounded-lg bg-[#FFF0ED] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-terracotta">
                Out of Stock
              </span>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-[#EDFBF0] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                In Stock ({selectedVariant ? selectedVariant.stock : product.stock} available)
              </span>
            )}
          </div>

          {/* Variant Selector */}
          {product.hasVariants && product.variants.length > 0 && (
            <div className="mb-8">
              <span className="block text-sm font-semibold text-text-primary mb-3">
                Select Option
              </span>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleVariantChange(v)}
                      aria-pressed={isSelected}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "border-primary-orange bg-[#FFE9D6] text-primary-orange shadow-sm"
                          : "border-border-subtle bg-white text-text-primary hover:border-text-primary/50"
                      }`}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector & Add to Cart */}
          {!(product.hasVariants && product.variants.length === 0) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
              <div className="flex items-center justify-between border border-border-subtle rounded-xl bg-white p-1 h-12 w-32 shrink-0">
                <button
                  type="button"
                  onClick={handleMinus}
                  disabled={isOutOfStock || (product.hasVariants && !selectedVariant) || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 inline-flex items-center justify-center text-text-primary hover:bg-[#FFF8EF] rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-text-primary" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handlePlus}
                  disabled={isOutOfStock || (product.hasVariants && !selectedVariant) || quantity >= maxQuantity}
                  aria-label="Increase quantity"
                  className="w-10 h-10 inline-flex items-center justify-center text-text-primary hover:bg-[#FFF8EF] rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={
                  isOutOfStock ||
                  (product.hasVariants && !selectedVariant) ||
                  cartStatus === "adding"
                }
                className="flex-1 h-12 inline-flex items-center justify-center rounded-xl bg-primary-orange hover:bg-terracotta text-white font-semibold text-sm tracking-wide transition-all duration-150 disabled:opacity-40 disabled:hover:bg-primary-orange cursor-pointer"
              >
                {cartStatus === "adding" ? "Adding..." : "Add to Cart"}
              </button>
            </div>
          )}

          {/* Inline Feedback */}
          {cartStatus === "success" && (
            <div className="mb-8 p-4 rounded-xl bg-[#EDFBF0] text-[#1E7F3C] text-sm font-semibold flex items-center gap-2 border border-emerald-100" aria-live="polite">
              <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Added to cart successfully!
            </div>
          )}
          {cartStatus === "error" && cartError && (
            <div className="mb-8 p-4 rounded-xl bg-[#FFF0ED] text-terracotta text-sm font-semibold border border-red-100" aria-live="assertive">
              {cartError}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="border-t border-border-subtle pt-6 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3">
                Description
              </h2>
              <div className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Specifications */}
          <div className="border-t border-border-subtle pt-6 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3">
              Specifications
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-text-muted">SKU:</dt>
                <dd className="text-text-primary font-semibold">{selectedVariant ? selectedVariant.sku : product.sku}</dd>
              </div>
              {(selectedVariant ? selectedVariant.weightGrams : product.weightGrams) && (
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-text-muted">Weight:</dt>
                  <dd className="text-text-primary font-semibold">
                    {selectedVariant ? selectedVariant.weightGrams : product.weightGrams}g
                  </dd>
                </div>
              )}
              {/* Dimensions */}
              {(selectedVariant
                ? selectedVariant.lengthCm && selectedVariant.widthCm && selectedVariant.heightCm
                : product.lengthCm && product.widthCm && product.heightCm) && (
                <div className="flex items-baseline gap-1.5 sm:col-span-2">
                  <dt className="text-text-muted">Dimensions (L x W x H):</dt>
                  <dd className="text-text-primary font-semibold">
                    {selectedVariant
                      ? `${selectedVariant.lengthCm} × ${selectedVariant.widthCm} × ${selectedVariant.heightCm}`
                      : `${product.lengthCm} × ${product.widthCm} × ${product.heightCm}`}{" "}
                    cm
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Tags */}
          {(() => {
            const rawTags = product.tags as unknown;
            let parsedTags: string[] = [];
            if (Array.isArray(rawTags)) {
              parsedTags = rawTags.map((t) => String(t));
            } else if (typeof rawTags === "string" && rawTags.trim()) {
              try {
                const parsed = JSON.parse(rawTags);
                if (Array.isArray(parsed)) {
                  parsedTags = parsed.map((t) => String(t));
                } else {
                  parsedTags = [rawTags];
                }
              } catch {
                if (rawTags.includes(",")) {
                  parsedTags = rawTags.split(",").map((t: string) => t.trim());
                } else {
                  parsedTags = [rawTags.trim()];
                }
              }
            }
            if (parsedTags.length === 0) return null;

            return (
              <div className="border-t border-border-subtle pt-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {parsedTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-[#FFF8EF] border border-[#E7CFB9] text-text-primary/70 px-3 py-1.5 rounded-full font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
