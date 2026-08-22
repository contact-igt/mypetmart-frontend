"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { ProductImagePlaceholder } from "@/components/image-placeholder";
import { AppAuthError } from "@/lib/auth/auth-errors";

const formatPrice = (priceVal: number | string) => {
  const num = typeof priceVal === "number" ? priceVal : parseFloat(priceVal);
  return isNaN(num) ? "0" : num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export function CartClient() {
  const {
    cart,
    loading,
    error,
    mergeReport,
    updatingItemIds,
    removingItemIds,
    isClearing,
    update,
    remove,
    clear,
    refresh,
    setMergeReport,
  } = useCart();

  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const handleImageError = (itemId: number) => {
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  };

  const handleQuantityChange = async (itemId: number, currentQty: number, newQty: number, maxQty: number) => {
    if (newQty < 1 || newQty > 20 || newQty > maxQty) return;

    setLineErrors((prev) => ({ ...prev, [itemId]: "" }));

    try {
      await update(itemId, newQty);
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        if (err.code === "CART_INSUFFICIENT_STOCK") {
          const available = err.details?.availableQuantity ?? 0;
          setLineErrors((prev) => ({
            ...prev,
            [itemId]: `Only ${available} unit(s) are currently available.`,
          }));
        } else if (err.code === "CART_QUANTITY_LIMIT_EXCEEDED") {
          const limit = err.details?.max ?? 20;
          setLineErrors((prev) => ({
            ...prev,
            [itemId]: `Cart line quantity cannot exceed ${limit} units.`,
          }));
        } else if (err.code === "CART_ITEM_NOT_FOUND") {
          // Local cart is stale, refresh
          await refresh();
          setLineErrors((prev) => ({
            ...prev,
            [itemId]: "This item was no longer found in the cart.",
          }));
        } else {
          setLineErrors((prev) => ({
            ...prev,
            [itemId]: err.message || "Failed to update quantity. Please try again.",
          }));
        }
      } else {
        setLineErrors((prev) => ({
          ...prev,
          [itemId]: "Failed to update quantity. Please try again.",
        }));
      }
    }
  };

  const handleRemove = async (itemId: number) => {
    setLineErrors((prev) => ({ ...prev, [itemId]: "" }));
    try {
      await remove(itemId);
    } catch {
      setLineErrors((prev) => ({
        ...prev,
        [itemId]: "Failed to remove item. Please try again.",
      }));
    }
  };

  const handleClearCart = async () => {
    try {
      await clear();
    } catch {
      alert("Failed to clear cart. Please try again.");
    }
  };

  // Re-fetch helper for page-level retry
  const handleRetry = async () => {
    await refresh();
  };

  const hasUnavailableItems = cart.items.some((item) => !item.available);
  const isCheckoutDisabled = cart.itemCount === 0 || hasUnavailableItems;

  if (loading) {
    return (
      <div className="site-container py-12 text-center" aria-live="polite">
        <div className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent"></div>
        <p className="mt-4 text-text-muted font-medium text-sm">Loading your shopping cart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="site-container py-12 text-center" aria-live="assertive">
        <div className="motion-enter rounded-2xl bg-[#FFF0ED] border border-red-100 p-8 max-w-md mx-auto">
          <p className="text-terracotta font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="motion-press px-5 py-2.5 bg-primary-orange text-white rounded-xl text-sm font-semibold hover:bg-terracotta transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="site-container py-16 text-center" aria-live="polite">
        <div className="motion-enter max-w-md mx-auto rounded-3xl bg-white border border-border-subtle p-10 shadow-[0_8px_20px_rgba(88,51,29,0.02)]">
          <span className="text-4xl block mb-4">🛒</span>
          <h1
            className="text-2xl text-text-primary leading-tight font-medium mb-3"
            style={{ fontFamily: "var(--font-display-italic)" }}
          >
            Your cart is waiting for something pawsome.
          </h1>
          <p className="text-text-muted text-sm mb-6 leading-relaxed">
            Fill it with premium pet-care essentials, nutritious treats, or groom accessories.
          </p>
          <Link
            href="/shop"
            className="motion-press inline-flex h-11 items-center justify-center rounded-xl bg-primary-orange px-6 text-sm font-semibold text-white hover:bg-terracotta transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container py-8">
      {/* Title */}
      <h1
        className="motion-enter text-3xl sm:text-4xl text-text-primary leading-tight font-medium mb-8"
        style={{ fontFamily: "var(--font-display-italic)" }}
      >
        Shopping Cart
      </h1>

      {/* Merge notices */}
      {mergeReport && (
        <div
          className="mb-6 rounded-2xl bg-white border border-[#E7CFB9] p-4 flex justify-between items-start gap-4 shadow-sm"
          aria-live="polite"
        >
          <div className="text-sm text-text-primary leading-relaxed">
            {mergeReport.adjustedItems.length > 0 && (
              <p className="font-semibold text-primary-orange">
                ✓ Some quantities were adjusted to available stock.
              </p>
            )}
            {mergeReport.skippedItems.length > 0 && (
              <p className="text-text-muted mt-1">
                ✓ Some items in your guest cart could no longer be added.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMergeReport(null)}
            className="text-text-muted hover:text-text-primary text-xs font-bold shrink-0 cursor-pointer"
            aria-label="Dismiss notice"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Cart items list */}
        <div className="motion-enter motion-enter-delay-1 flex flex-col gap-4">
          {cart.items.map((item) => {
            const isUpdating = updatingItemIds.has(item.cartItemId);
            const isRemoving = removingItemIds.has(item.cartItemId);
            const hasImage = item.image !== null && !imageErrors.has(item.cartItemId);

            // Paise comparison helper
            const priceVal = Math.round(parseFloat(item.price) * 100);
            const compareVal = item.compareAtPrice ? Math.round(parseFloat(item.compareAtPrice) * 100) : 0;
            const hasDiscount = item.compareAtPrice !== null && compareVal > priceVal;

            const isItemOutOfStock = item.availableQuantity === 0;
            const itemMaxQuantity = Math.min(item.availableQuantity, 20);

            return (
              <div
                key={item.cartItemId}
                className={`relative flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-border-subtle shadow-[0_4px_12px_rgba(88,51,29,0.02)] transition-opacity duration-150 ${
                  isRemoving ? "opacity-40 pointer-events-none" : "opacity-100"
                }`}
                aria-busy={isUpdating || isRemoving}
              >
                {/* Product Image */}
                <div className="relative aspect-square w-20 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-[#FFF8EF]">
                  {hasImage && item.image ? (
                    <Image
                      src={item.image.url}
                      alt={item.image.alt || item.productName}
                      fill
                      className="object-cover"
                      sizes="96px"
                      onError={() => handleImageError(item.cartItemId)}
                    />
                  ) : (
                    <ProductImagePlaceholder
                      label={item.productName}
                      tone="peach"
                      iconSize={20}
                      className="h-full w-full"
                    />
                  )}
                </div>

                {/* Content info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="text-base font-semibold text-text-primary hover:text-primary-orange transition-colors min-w-0 truncate block"
                      >
                        {item.productName}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.cartItemId)}
                        disabled={isRemoving || isUpdating || isClearing}
                        aria-label={`Remove ${item.productName}`}
                        className="text-xs font-bold text-terracotta/70 hover:text-terracotta hover:underline transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>

                    {item.variantName && (
                      <span className="block text-xs font-semibold text-text-muted mt-0.5">
                        Option: {item.variantName}
                      </span>
                    )}

                    <span className="block text-xs text-text-muted mt-0.5 select-all">
                      SKU: {item.sku}
                    </span>
                  </div>

                  {/* Pricing info */}
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-text-primary">
                      ₹{formatPrice(item.price)}
                    </span>
                    {hasDiscount && item.compareAtPrice && (
                      <span className="text-xs text-text-muted line-through">
                        ₹{formatPrice(item.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  {/* Availability warnings */}
                  {!item.available && (
                    <div className="mt-2.5 text-xs font-semibold text-terracotta" aria-live="assertive">
                      {item.availabilityReason === "PRODUCT_UNAVAILABLE" && (
                        <span>This product is no longer available.</span>
                      )}
                      {item.availabilityReason === "VARIANT_UNAVAILABLE" && (
                        <span>This option is no longer available.</span>
                      )}
                      {item.availabilityReason === "OUT_OF_STOCK" && isItemOutOfStock && (
                        <span>Out of stock.</span>
                      )}
                      {item.availabilityReason === "OUT_OF_STOCK" && !isItemOutOfStock && (
                        <span>Only {item.availableQuantity} available. Reduce the quantity to continue.</span>
                      )}
                    </div>
                  )}

                  {/* Line item error alerts */}
                  {lineErrors[item.cartItemId] && (
                    <div className="mt-2 text-xs font-bold text-terracotta" aria-live="assertive">
                      {lineErrors[item.cartItemId]}
                    </div>
                  )}
                </div>

                {/* Controls (Quantity + subtotal) */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 shrink-0 sm:min-w-[120px] border-t sm:border-t-0 border-border-subtle pt-3 sm:pt-0">
                  {/* Quantity selector */}
                  <div className="flex items-center justify-between border border-border-subtle rounded-xl bg-[#FFF8EF] p-1 h-10 w-28 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          item.cartItemId,
                          item.quantity,
                          item.quantity - 1,
                          itemMaxQuantity
                        )
                      }
                      disabled={
                        !item.available ||
                        isUpdating ||
                        isRemoving ||
                        isClearing ||
                        item.quantity <= 1
                      }
                      aria-label={`Decrease quantity of ${item.productName}`}
                      className="w-8 h-8 inline-flex items-center justify-center text-text-primary hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-text-primary" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          item.cartItemId,
                          item.quantity,
                          item.quantity + 1,
                          itemMaxQuantity
                        )
                      }
                      disabled={
                        !item.available ||
                        isUpdating ||
                        isRemoving ||
                        isClearing ||
                        item.quantity >= itemMaxQuantity ||
                        item.quantity >= 20
                      }
                      aria-label={`Increase quantity of ${item.productName}`}
                      className="w-8 h-8 inline-flex items-center justify-center text-text-primary hover:bg-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <span className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Subtotal
                    </span>
                    <span className="block text-sm font-bold text-text-primary mt-0.5">
                      ₹{formatPrice(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary side panel */}
        <div className="motion-enter motion-enter-delay-2 rounded-3xl bg-white border border-border-subtle p-5 sm:p-6 shadow-[0_6px_20px_rgba(88,51,29,0.02)]">
          <h2
            className="text-xl text-text-primary leading-tight font-medium mb-4"
            style={{ fontFamily: "var(--font-display-italic)" }}
          >
            Order Summary
          </h2>

          <div className="flex justify-between items-baseline border-b border-border-subtle pb-4 mb-5">
            <span className="text-sm font-medium text-text-muted">Subtotal</span>
            <span
              className="text-xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
            >
              ₹{formatPrice(cart.subtotal)}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={isCheckoutDisabled ? "#" : "/checkout"}
              aria-disabled={isCheckoutDisabled}
              className={`motion-press h-11 inline-flex items-center justify-center rounded-xl bg-primary-orange hover:bg-terracotta text-white font-semibold text-sm tracking-wide transition-all cursor-pointer select-none ${
                isCheckoutDisabled ? "opacity-40 pointer-events-none" : "opacity-100"
              }`}
            >
              Proceed to Checkout
            </Link>

            <button
              type="button"
              onClick={handleClearCart}
              disabled={isClearing || updatingItemIds.size > 0 || removingItemIds.size > 0}
              className="motion-press h-11 inline-flex items-center justify-center rounded-xl border border-border-subtle text-text-primary font-semibold text-sm hover:border-text-primary/50 transition-all cursor-pointer disabled:opacity-50"
            >
              {isClearing ? "Clearing Cart..." : "Clear Cart"}
            </button>
          </div>

          {hasUnavailableItems && (
            <p className="mt-4 text-xs font-semibold text-terracotta leading-relaxed">
              ⚠️ Please remove or update any unavailable items before proceeding.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
