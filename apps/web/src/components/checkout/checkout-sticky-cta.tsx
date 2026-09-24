"use client";

import { AlertCircle } from "lucide-react";

/**
 * Mobile-only sticky "Place Order" bar for the pre-order checkout screen.
 *
 * Presentation only: it renders the same payable total shown in the Order
 * Summary card and calls the page's existing `handlePlaceOrder` — no cart,
 * pricing, or order-submission logic lives here. Mounted only below the
 * checkout's `lg` two-column breakpoint (see CheckoutClient), where the
 * in-card Place Order button is hidden, so exactly one Place Order control
 * exists at any viewport.
 */
export function CheckoutStickyCta({
  total,
  disabled,
  submitting,
  label,
  error,
  couponMismatch,
  onPlaceOrder,
}: {
  total: string | null;
  disabled: boolean;
  submitting: boolean;
  label: string;
  error?: string | null;
  couponMismatch?: {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    continueLabel: string;
    onContinue: () => void;
  } | null;
  onPlaceOrder: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-deep-brown/15 bg-white px-4 pt-3 shadow-[0_-6px_24px_rgba(62,35,25,0.10)] lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      data-testid="checkout-sticky-cta"
    >
      {couponMismatch ? (
        <div className="mx-auto max-w-[1100px] mb-2 p-2.5 rounded-xl border border-primary-orange/30 bg-peach-hero/50 text-xs">
          <p className="font-bold text-deep-brown text-[11px] mb-1.5">{couponMismatch.message}</p>
          <div className="flex gap-2">
            {couponMismatch.onAction && couponMismatch.actionLabel && (
              <button
                type="button"
                onClick={couponMismatch.onAction}
                className="flex-1 rounded-lg bg-primary-orange px-2 py-1.5 text-[11px] font-bold text-white text-center"
              >
                {couponMismatch.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={couponMismatch.onContinue}
              className="flex-1 rounded-lg border border-deep-brown/20 bg-white px-2 py-1.5 text-[11px] font-bold text-deep-brown text-center"
            >
              {couponMismatch.continueLabel}
            </button>
          </div>
        </div>
      ) : error ? (
        <div className="mx-auto max-w-[1100px] mb-2 flex items-center gap-1.5 rounded-lg border border-terracotta/30 bg-terracotta/10 px-2.5 py-1.5 text-xs font-semibold text-terracotta">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-terracotta" aria-hidden="true" />
          <span className="truncate">{error}</span>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-[1100px] items-center gap-3">
        <div className="shrink-0">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-deep-brown/60">
            Total
          </span>
          <span className="block text-base font-extrabold leading-none text-primary-orange">
            {total ? `₹${total}` : "To be calculated"}
          </span>
        </div>
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={disabled}
          aria-disabled={disabled}
          className={`inline-flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold text-white shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary-orange focus:ring-offset-2 ${
            disabled
              ? "cursor-not-allowed bg-deep-brown/20 text-deep-brown/50"
              : "cursor-pointer bg-primary-orange hover:bg-terracotta"
          }`}
        >
          {submitting ? "Creating Order..." : label}
        </button>
      </div>
    </div>
  );
}
