"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { ProductDetail, ProductVariant } from "@/types/storefront";

const formatPrice = (value: number | string) => {
  const num = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(num) ? "0" : num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

/**
 * Mobile-only bottom-sticky Add to Cart bar for the PDP.
 *
 * Pure presentation: every piece of state and every handler is owned by
 * ProductDetailClient and shared with PdpPurchasePanel — this component only
 * mirrors that state, so there is no second cart state machine and no
 * duplicate cart request path. Hidden from `md:` upward, where the existing
 * desktop purchase panel is the primary Add to Cart surface.
 *
 * The CTA shows the product's real current price (`currentPrice`, already
 * variant-aware in ProductDetailClient) beneath the action label, so it stays
 * in sync automatically when the selected variant changes.
 */
export function PdpStickyCta({
  product,
  selectedVariant,
  quantity,
  onMinus,
  onPlus,
  maxQuantity,
  isOutOfStock,
  currentPrice,
  currentComparePrice,
  hasDiscount,
  cartStatus,
  onAddToCart,
}: {
  product: ProductDetail;
  selectedVariant: ProductVariant | null;
  quantity: number;
  onMinus: () => void;
  onPlus: () => void;
  maxQuantity: number;
  isOutOfStock: boolean;
  currentPrice: string | number;
  currentComparePrice: string | number | null;
  hasDiscount: boolean;
  cartStatus: "idle" | "adding" | "success" | "error";
  onAddToCart: () => void;
}) {
  // Mirrors the purchase panel: a variant product with no options at all has
  // no purchasable action to surface.
  if (product.hasVariants && product.variants.length === 0) return null;

  const needsVariant = product.hasVariants && !selectedVariant;
  const disabled = isOutOfStock || needsVariant || cartStatus === "adding";

  const label = isOutOfStock
    ? "Out of Stock"
    : needsVariant
      ? "Select an option"
      : cartStatus === "adding"
        ? "Adding..."
        : cartStatus === "success"
          ? "Added to Cart"
          : "Add to Cart";

  const numericPrice = typeof currentPrice === "number" ? currentPrice : parseFloat(currentPrice);
  const numericComparePrice =
    currentComparePrice != null
      ? typeof currentComparePrice === "number"
        ? currentComparePrice
        : parseFloat(currentComparePrice)
      : null;

  const effectiveQty = needsVariant ? 1 : Math.max(1, quantity);
  const totalPrice = Number.isNaN(numericPrice) ? currentPrice : numericPrice * effectiveQty;
  const totalComparePrice =
    numericComparePrice != null && !Number.isNaN(numericComparePrice)
      ? numericComparePrice * effectiveQty
      : null;

  // "From ₹…" until a variant is chosen — mirrors the desktop panel's
  // starting-price treatment. Never a hardcoded amount.
  const pricePrefix = needsVariant ? "From " : "";
  const priceText = `₹${formatPrice(totalPrice)}`;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-deep-brown/15 bg-white pt-3 shadow-[0_-6px_24px_rgba(62,35,25,0.10)] md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      data-testid="pdp-sticky-cta"
    >
      <div className="flex items-stretch gap-3 px-4">
        <div className="flex h-16 shrink-0 items-center justify-between rounded-lg border border-deep-brown/15 bg-[#FFF9F1] px-0.5">
          <button
            type="button"
            onClick={onMinus}
            disabled={disabled || quantity <= 1}
            aria-label="Decrease quantity"
            className="inline-flex h-11 w-9 cursor-pointer items-center justify-center rounded-md text-text-primary transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <Minus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="w-7 text-center text-sm font-bold text-text-primary" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={onPlus}
            disabled={disabled || quantity >= maxQuantity}
            aria-label="Increase quantity"
            className="inline-flex h-11 w-9 cursor-pointer items-center justify-center rounded-md text-text-primary transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={onAddToCart}
          disabled={disabled}
          aria-label={`${label}, ${pricePrefix}${priceText}`}
          className="inline-flex h-16 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg bg-primary-orange px-4 text-white transition-colors duration-150 hover:bg-terracotta active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-bold leading-none">
            <ShoppingBag className="shrink-0" size={15} strokeWidth={1.9} aria-hidden="true" />
            {label}
          </span>
          <span aria-hidden="true" className="flex items-baseline gap-1.5 whitespace-nowrap leading-none">
            <span className="text-xs font-semibold text-white/95">
              {pricePrefix}
              {priceText}
            </span>
            {hasDiscount && totalComparePrice != null && (
              <span className="text-[11px] font-medium text-white/60 line-through">
                ₹{formatPrice(totalComparePrice)}
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
