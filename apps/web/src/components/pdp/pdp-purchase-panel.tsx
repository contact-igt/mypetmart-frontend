"use client";

import type { MouseEvent } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { HeartIcon, ShieldCheckIcon, TruckIcon } from "@/components/icons";
import { PdpTags } from "@/components/pdp/pdp-tags";
import { ProductRatingBadge } from "@/components/product-rating-badge";
import type { ProductDetail, ProductVariant } from "@/types/storefront";

const formatPrice = (priceVal: number | string) => {
  const num = typeof priceVal === "number" ? priceVal : parseFloat(priceVal);
  return isNaN(num) ? "0" : num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export function PdpPurchasePanel({
  product,
  selectedVariant,
  onVariantChange,
  quantity,
  onMinus,
  onPlus,
  maxQuantity,
  isOutOfStock,
  currentPrice,
  currentComparePrice,
  hasDiscount,
  cartStatus,
  cartError,
  onAddToCart,
  wishlisted,
  wishlistPending,
  onWishlistClick,
}: {
  product: ProductDetail;
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
  quantity: number;
  onMinus: () => void;
  onPlus: () => void;
  maxQuantity: number;
  isOutOfStock: boolean;
  currentPrice: string | number;
  currentComparePrice: string | number | null;
  hasDiscount: boolean;
  cartStatus: "idle" | "adding" | "success" | "error";
  cartError: string | null;
  onAddToCart: () => void;
  wishlisted: boolean;
  wishlistPending: boolean;
  onWishlistClick: (e: MouseEvent) => void;
}) {
  const priceNumber = typeof currentPrice === "number" ? currentPrice : parseFloat(currentPrice);
  const comparePriceNumber =
    typeof currentComparePrice === "number"
      ? currentComparePrice
      : currentComparePrice
        ? parseFloat(currentComparePrice)
        : 0;
  const discountPercent =
    hasDiscount && Number.isFinite(priceNumber) && Number.isFinite(comparePriceNumber) && comparePriceNumber > priceNumber
      ? Math.round(((comparePriceNumber - priceNumber) / comparePriceNumber) * 100)
      : null;

  return (
    <div className="flex h-full flex-col px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10 xl:px-11">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary-orange/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.09em] text-primary-orange">
          {product.petType === "all" ? "For Dogs & Cats" : `For ${product.petType}s`}
        </span>
      </div>

      <PdpTags tags={product.tags} fallbackTags={[product.category.name]} />

      {product.brand && (
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-terracotta">{product.brand}</p>
      )}

      <div className={`${product.brand ? "mt-2" : "mt-5"} flex items-start justify-between gap-4`}>
        <h1
          className="max-w-[34rem] text-[2rem] leading-[1.12] tracking-[-0.025em] text-text-primary sm:text-[2.45rem] lg:text-[2.3rem] xl:text-[2.55rem]"
          style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}
        >
          {product.name}
        </h1>
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          disabled={wishlistPending}
          onClick={onWishlistClick}
          className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 ${
            wishlisted
              ? "border-terracotta bg-terracotta/10 text-terracotta"
              : "border-deep-brown/15 bg-cream-bg/70 text-text-primary hover:border-primary-orange hover:text-primary-orange"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <HeartIcon className="h-[21px] w-[21px]" fill={wishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-3 min-h-5">
        <ProductRatingBadge productId={product.id} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-deep-brown/10 py-4">
        <span className="text-[2rem] font-bold leading-none text-text-primary sm:text-[2.2rem]">
          {product.hasVariants && !selectedVariant ? "From " : ""}₹{formatPrice(currentPrice)}
        </span>
        {hasDiscount && currentComparePrice && (
          <span className="text-base text-text-muted line-through">₹{formatPrice(currentComparePrice)}</span>
        )}
        {discountPercent !== null && (
          <span className="rounded-md bg-terracotta px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-white">
            {discountPercent}% off
          </span>
        )}
      </div>

      <div className="mt-4" aria-live="polite">
        {product.hasVariants && product.variants.length === 0 ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta">
            <span className="h-2 w-2 rounded-full bg-terracotta" aria-hidden="true" />
            Product currently unavailable
          </span>
        ) : product.hasVariants && !selectedVariant ? (
          <span className="text-sm text-text-muted">Choose an option below to view availability.</span>
        ) : isOutOfStock ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta">
            <span className="h-2 w-2 rounded-full bg-terracotta" aria-hidden="true" />
            Out of Stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
            In Stock ({selectedVariant ? selectedVariant.stock : product.stock} available)
          </span>
        )}
      </div>

      {product.hasVariants && product.variants.length > 0 && (
        <fieldset className="mt-6">
          <legend className="mb-3 block text-sm font-bold text-text-primary">Select option</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onVariantChange(variant)}
                  aria-pressed={isSelected}
                  className={`min-h-11 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 ${
                    isSelected
                      ? "border-deep-brown bg-deep-brown text-white"
                      : "border-deep-brown/15 bg-cream-bg/60 text-text-primary hover:border-primary-orange"
                  }`}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {!(product.hasVariants && product.variants.length === 0) && (
        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-14 w-full shrink-0 items-center justify-between rounded-lg border border-deep-brown/15 bg-[#FFF9F1] px-1 sm:w-36">
            <button
              type="button"
              onClick={onMinus}
              disabled={isOutOfStock || (product.hasVariants && !selectedVariant) || quantity <= 1}
              aria-label="Decrease quantity"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-text-primary transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
            >
              <Minus size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="w-8 text-center text-base font-bold text-text-primary" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={onPlus}
              disabled={isOutOfStock || (product.hasVariants && !selectedVariant) || quantity >= maxQuantity}
              aria-label="Increase quantity"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-text-primary transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={onAddToCart}
            disabled={isOutOfStock || (product.hasVariants && !selectedVariant) || cartStatus === "adding"}
            className="inline-flex h-14 min-w-0 w-full flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary-orange px-5 text-base font-semibold text-white transition-colors duration-150 hover:bg-terracotta active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 sm:px-7"
          >
            <ShoppingBag className="shrink-0" size={18} strokeWidth={1.9} aria-hidden="true" />
            {cartStatus === "adding" ? "Adding..." : "Add to Cart"}
          </button>
        </div>
      )}

      {cartStatus === "success" && (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-[#EDFBF0] p-4 text-sm font-semibold text-[#1E7F3C]"
          aria-live="polite"
        >
          <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Added to cart successfully!
        </div>
      )}
      {cartStatus === "error" && cartError && (
        <div className="mt-4 rounded-xl border border-red-100 bg-[#FFF0ED] p-4 text-sm font-semibold text-terracotta" aria-live="assertive">
          {cartError}
        </div>
      )}

      <div className="mt-7 grid grid-cols-2 gap-3 border-t border-deep-brown/10 pt-5">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-text-primary/75">
          <ShieldCheckIcon className="h-5 w-5 shrink-0 text-primary-orange" />
          Secure shopping
        </div>
        <div className="flex items-center gap-2.5 text-xs font-semibold text-text-primary/75">
          <TruckIcon className="h-5 w-5 shrink-0 text-primary-orange" />
          Thoughtfully selected
        </div>
      </div>
    </div>
  );
}
