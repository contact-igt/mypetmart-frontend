"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { OrderApi } from "@/lib/order-api";
import type { GuestOrderDetailJSON } from "@/types/order";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { ProductImagePlaceholder } from "@/components/image-placeholder";
import { ProceedToPaymentButton } from "@/components/payment/proceed-to-payment-button";
import { StatusBadge } from "@/app/account/orders/orders-client";
import { ShipmentTracking } from "@/components/shipment-tracking";

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function GuestOrderClient({ token }: { token: string }) {
  const [order, setOrder] = useState<GuestOrderDetailJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const handleImageError = (itemId: number) => {
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  };

  useEffect(() => {
    let isSubscribed = true;

    async function loadOrder() {
      setLoading(true);
      setError(null);
      setIsNotFound(false);
      try {
        const data = await OrderApi.getGuestOrder(token);
        if (isSubscribed) setOrder(data);
      } catch (err: unknown) {
        if (isSubscribed) {
          if (err instanceof AppAuthError && err.code === "GUEST_ORDER_NOT_FOUND") {
            setIsNotFound(true);
          } else if (err instanceof AppAuthError) {
            setError(err.message);
          } else {
            setError("Failed to load order details.");
          }
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      isSubscribed = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent mb-4"></div>
        <p className="font-medium text-deep-brown">Loading your order...</p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center sm:p-12 shadow-xs space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-peach-hero/40 text-deep-brown mb-2">
          <svg className="h-8 w-8 text-deep-brown/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="font-baloo text-2xl font-bold text-deep-brown">Order not found</h2>
        <p className="text-sm text-text-primary/75 max-w-md mx-auto">
          This link is invalid or has expired. If you just placed an order, please use the link from your order
          confirmation screen.
        </p>
        <div className="pt-2">
          <Link
            href="/shop"
            className="inline-block rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-terracotta/30 bg-terracotta/10 p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-terracotta">{error || "Failed to load order."}</p>
        <Link
          href="/shop"
          className="inline-block rounded-xl bg-terracotta px-5 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const isPendingOrder = order.status === "pending" || order.paymentStatus === "pending";
  const canPay = order.paymentStatus === "pending" && order.status !== "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-deep-brown/15 pb-4">
        <div>
          <h2 className="font-baloo text-2xl font-extrabold text-deep-brown sm:text-3xl">
            Order #{order.orderNumber}
          </h2>
          <p className="text-xs text-text-primary/75 mt-0.5">
            Placed on {formatDate(order.placedAt || order.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={order.status} type="order" />
          <StatusBadge label={order.paymentStatus} type="payment" />
          <StatusBadge label={order.fulfilmentStatus} type="fulfilment" />
        </div>
      </div>

      {/* Bookmark reminder — this link is the only way back to this page */}
      <div className="rounded-2xl border border-primary-orange/30 bg-peach-hero/20 p-4 text-xs font-semibold text-deep-brown">
        📌 Save or bookmark this page&apos;s link — it&apos;s the only way to check this order&apos;s status later.
      </div>

      {/* Pending Order Status Banner (No payment action) */}
      {isPendingOrder && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-deep-brown space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm uppercase tracking-wider">
            <span>📌 Order Pending Payment</span>
          </div>
          <p className="text-xs font-medium text-amber-900/90 leading-relaxed">
            {canPay
              ? "Your order has been recorded in pending state. Complete payment to confirm your order."
              : "Your order has been recorded in pending state."}
          </p>
          {canPay ? (
            <div className="max-w-xs">
              <ProceedToPaymentButton input={{ guestAccessToken: token }} />
            </div>
          ) : (
            <button
              type="button"
              disabled={true}
              className="rounded-xl bg-deep-brown/20 px-4 py-2 text-xs font-bold text-deep-brown/60 cursor-not-allowed"
            >
              Payment unavailable
            </button>
          )}
        </div>
      )}

      <ShipmentTracking shipment={order.shipment} />

      {/* Grid: Order Items & Order Summary */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-baloo text-lg font-bold text-deep-brown border-b border-deep-brown/10 pb-3">
              Order Items ({order.items.length})
            </h3>

            <div className="divide-y divide-deep-brown/10">
              {order.items.map((item) => {
                const imgUrl = item.productImage || item.imageUrl;
                const hasImgError = imageErrors.has(item.id);
                const sku = item.variantSku || item.productSku;

                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-deep-brown/10 bg-cream-bg flex items-center justify-center">
                      {imgUrl && !hasImgError ? (
                        <Image
                          src={imgUrl}
                          alt={item.imageAlt || item.productName}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                          onError={() => handleImageError(item.id)}
                        />
                      ) : (
                        <ProductImagePlaceholder label={item.productName} iconSize={28} className="h-full w-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-deep-brown text-sm sm:text-base leading-snug">
                        {item.productName}
                      </h4>
                      {item.variantName && (
                        <p className="text-xs font-medium text-primary-orange mt-0.5">
                          Variant: {item.variantName}
                        </p>
                      )}
                      {sku && (
                        <p className="text-[11px] font-mono text-text-primary/60 mt-0.5">SKU: {sku}</p>
                      )}
                      <p className="text-xs text-text-primary/75 mt-1">
                        Qty: {item.quantity} &times; ₹{item.unitPrice}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-baloo font-bold text-deep-brown text-base">₹{item.lineTotal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Shipping Address & Totals */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="font-baloo text-base font-bold text-deep-brown border-b border-deep-brown/10 pb-3">
              Shipping Address
            </h3>
            <div className="text-xs text-text-primary/80 space-y-1">
              <p className="font-bold text-deep-brown text-sm">{order.shippingAddress.recipientName}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p className="uppercase">{order.shippingAddress.country}</p>
              <p className="pt-1 font-semibold text-deep-brown/70">Phone: {order.shippingAddress.phone}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-deep-brown/15 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="font-baloo text-base font-bold text-deep-brown border-b border-deep-brown/10 pb-3">
              Payment Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-text-primary/80">
                <span>Subtotal</span>
                <span className="font-semibold text-deep-brown">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-text-primary/80">
                <span>Shipping Fee</span>
                <span className="font-semibold text-deep-brown">₹{order.shippingFee}</span>
              </div>
              <div className="flex justify-between border-t border-deep-brown/10 pt-3 text-sm font-bold text-deep-brown">
                <span>Total</span>
                <span className="font-baloo text-lg font-extrabold text-primary-orange">₹{order.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
