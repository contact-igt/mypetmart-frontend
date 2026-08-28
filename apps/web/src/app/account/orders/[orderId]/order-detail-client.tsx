"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { OrderApi } from "@/lib/order-api";
import type { OrderDetailJSON } from "@/types/order";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { ProductImagePlaceholder } from "@/components/image-placeholder";
import { ProceedToPaymentButton } from "@/components/payment/proceed-to-payment-button";
import { RequestReturnForm } from "@/components/returns/request-return-form";
import { ReturnApi } from "@/lib/return-api";
import type { ReturnRequestJSON } from "@/types/return";
import { StatusBadge } from "../orders-client";
import { ShipmentTracking } from "@/components/shipment-tracking";
import { OrderTracker } from "@/components/order-tracker";
import { DownloadReceiptButton } from "@/components/download-receipt-button";
import { OrderReturnSummary } from "@/components/returns/order-return-summary";
import { useReorder } from "@/hooks/use-reorder";
import type { CustomerOrderPaymentJSON } from "@/types/order";

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  payu: "Online Payment",
  cod: "Cash on Delivery",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
};

const REFUND_SUMMARY_LABELS: Record<string, string> = {
  processing: "Refund processing",
  succeeded: "Refund completed",
  failed: "Refund failed",
};

// A failed/retried attempt shouldn't be what the customer sees as "the"
// payment for this order — prefer whichever attempt actually moved money
// (paid or refunded), falling back to the most recent attempt (e.g. a
// still-pending COD confirmation, or an order with only failed attempts).
function pickDisplayPayment(payments: CustomerOrderPaymentJSON[]): CustomerOrderPaymentJSON | null {
  return payments.find((p) => p.status === "paid" || p.status === "refunded") ?? payments[payments.length - 1] ?? null;
}

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

export function OrderDetailClient({ orderIdStr }: { orderIdStr: string }) {
  const cleanStr = (orderIdStr || "").trim();
  const numericId = parseInt(cleanStr, 10);
  const isValidId = !isNaN(numericId) && numericId > 0 && String(numericId) === cleanStr;

  const [order, setOrder] = useState<OrderDetailJSON | null>(null);
  const [loading, setLoading] = useState(isValidId);
  const [isNotFound, setIsNotFound] = useState(!isValidId);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [returnsByItem, setReturnsByItem] = useState<Map<number, ReturnRequestJSON[]>>(new Map());
  const [returnsRefreshKey, setReturnsRefreshKey] = useState(0);
  const { reorder, states: reorderStates } = useReorder();

  useEffect(() => {
    if (!isValidId) return;
    let isSubscribed = true;
    ReturnApi.list({ pageSize: 100 })
      .then((result) => {
        if (!isSubscribed) return;
        const map = new Map<number, ReturnRequestJSON[]>();
        for (const r of result.items) {
          if (r.orderId !== numericId) continue;
          const existing = map.get(r.orderItemId) ?? [];
          existing.push(r);
          map.set(r.orderItemId, existing);
        }
        setReturnsByItem(map);
      })
      .catch(() => {
        // Non-critical for order-detail rendering — the "Request Return" CTA
        // simply falls back to backend-enforced eligibility if this fails.
      });
    return () => {
      isSubscribed = false;
    };
  }, [numericId, isValidId, returnsRefreshKey]);

  const handleImageError = (itemId: number) => {
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  };

  useEffect(() => {
    if (!isValidId) return;

    let isSubscribed = true;

    async function loadOrder() {
      setLoading(true);
      setError(null);
      setIsNotFound(false);
      try {
        const data = await OrderApi.getOrder(numericId);
        if (isSubscribed) setOrder(data);
      } catch (err: unknown) {
        if (isSubscribed) {
          if (err instanceof AppAuthError && (err.code === "ORDER_NOT_FOUND" || err.code === "NOT_FOUND")) {
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
  }, [numericId, isValidId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent mb-4"></div>
        <p className="font-medium text-deep-brown">Loading order details...</p>
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
          The requested order does not exist or you do not have permission to view it.
        </p>
        <div className="pt-2">
          <Link
            href="/account/orders"
            className="inline-block rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
          >
            &larr; Back to My Orders
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
          href="/account/orders"
          className="inline-block rounded-xl bg-terracotta px-5 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          Back to My Orders
        </Link>
      </div>
    );
  }

  // COD funds are collected at the door, not upfront — a COD Order's
  // paymentStatus stays "pending" all the way through delivery by design
  // (see backend PaymentService.confirmCodOrder/markCodDelivered). That
  // "pending" must never be read as "still owes an online payment": the
  // retry-payment banner/button below is PayU-only.
  const isCodOrder = order.payments.some((p) => p.provider === "cod");
  const isPendingOrder = !isCodOrder && (order.status === "pending" || order.paymentStatus === "pending");
  const canPay = order.paymentStatus === "pending" && order.status !== "cancelled" && !isCodOrder;
  const showCodPendingNotice = isCodOrder && order.paymentStatus === "pending";
  const displayPayment = pickDisplayPayment(order.payments);

  return (
    <div className="space-y-6">
      {/* Header Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-deep-brown/15 pb-4">
        <div>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary-orange hover:underline mb-2"
          >
            &larr; Back to My Orders
          </Link>
          <h2 className="font-baloo text-2xl font-extrabold text-deep-brown sm:text-3xl">
            Order #{order.orderNumber}
          </h2>
          <p className="text-xs text-text-primary/75 mt-0.5">
            Placed on {formatDate(order.placedAt || order.createdAt)}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={order.status} type="order" />
            <StatusBadge label={order.paymentStatus} type="payment" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadReceiptButton download={() => OrderApi.downloadReceipt(order.id)} fallbackFilename={`Receipt-${order.orderNumber}.pdf`} />
            <button
              type="button"
              onClick={() => reorder(order.id)}
              disabled={reorderStates[order.id] === "loading"}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-deep-brown/20 bg-cream-bg px-4 py-2 text-xs font-bold text-deep-brown transition-all hover:border-primary-orange hover:bg-primary-orange hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reorderStates[order.id] === "loading" ? "Adding..." : reorderStates[order.id] === "error" ? "Try Again" : "Reorder"}
            </button>
          </div>
        </div>
      </div>

      {reorderStates[order.id] === "error" && (
        <p className="text-xs font-semibold text-terracotta">Some items from this order are no longer available.</p>
      )}

      {/* Pending Order Status Banner (No payment action) */}
      {isPendingOrder && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-deep-brown space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm uppercase tracking-wider">
            <span>Order Pending Payment</span>
          </div>
          <p className="text-xs font-medium text-amber-900/90 leading-relaxed">
            {canPay
              ? "Your order has been recorded in pending state. Complete payment to confirm your order."
              : "Your order has been recorded in pending state."}
          </p>
          {canPay ? (
            <div className="max-w-xs">
              <ProceedToPaymentButton input={{ orderId: order.id }} />
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

      {showCodPendingNotice && (
        <div className="rounded-2xl border border-deep-brown/15 bg-cream-bg p-4 text-xs font-medium text-deep-brown/80">
          Payment will be collected via Cash on Delivery.
        </div>
      )}

      <OrderTracker order={order} />

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
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-3 sm:gap-4">
                    {/* Item Image */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-deep-brown/10 bg-cream-bg flex items-center justify-center sm:h-20 sm:w-20">
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

                    {/* Item Info */}
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
                        <p className="text-[11px] font-mono text-text-primary/60 mt-0.5">
                          SKU: {sku}
                        </p>
                      )}
                      <p className="text-xs text-text-primary/75 mt-1">
                        Qty: {item.quantity} &times; ₹{item.unitPrice}
                      </p>

                      {/* Keyed off order.status, not fulfilmentStatus — no Shipping
                          module exists yet to ever set fulfilmentStatus away from
                          "unfulfilled", so that field can never reflect a real
                          delivery. order.status is what the real Admin "Order
                          status" control actually advances (see return.service.ts
                          on the backend for the matching authoritative check). */}
                      {/* Return/refund/replacement status for an already-requested return now
                          lives in the Returns & Refunds section below, not duplicated here —
                          this stays purely the entry point for requesting a NEW return, gated
                          on how much of this item's quantity isn't already covered by one. */}
                      {(order.status === "delivered" || order.status === "return_requested") && (
                        <div className="mt-2">
                          {(() => {
                            const itemReturns = returnsByItem.get(item.id) ?? [];
                            const activeReturns = itemReturns.filter((r) => r.status !== "rejected");
                            const remaining = item.quantity - activeReturns.reduce((total, r) => total + r.quantity, 0);
                            return (
                              remaining > 0 && (
                                <RequestReturnForm
                                  orderId={order.id}
                                  orderItemId={item.id}
                                  purchasedQuantity={remaining}
                                  onSubmitted={() => setReturnsRefreshKey((k) => k + 1)}
                                />
                              )
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0">
                      <span className="font-baloo font-bold text-deep-brown text-base">
                        ₹{item.lineTotal}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Shipping Address & Totals */}
        <div className="lg:col-span-4 space-y-6">
          {/* Shipping Snapshot */}
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

          {/* Price Totals */}
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="font-baloo text-base font-bold text-deep-brown border-b border-deep-brown/10 pb-3">
              Payment Summary
            </h3>
            <div className="space-y-2 text-xs">
              {displayPayment && (
                <>
                  <div className="flex items-start justify-between gap-3 text-text-primary/80">
                    <span className="min-w-0">Payment Method</span>
                    <span className="max-w-[58%] break-words text-right font-semibold text-deep-brown">
                      {(displayPayment.method && PAYMENT_METHOD_LABELS[displayPayment.method]) ?? PAYMENT_PROVIDER_LABELS[displayPayment.provider] ?? displayPayment.provider}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-text-primary/80">
                    <span className="min-w-0">Payment Status</span>
                    <span className="max-w-[58%] break-words text-right font-semibold text-deep-brown capitalize">{displayPayment.status}</span>
                  </div>
                  {displayPayment.providerOrderId && (
                    <div className="flex items-start justify-between gap-3 text-text-primary/80">
                      <span className="min-w-0">Transaction Reference</span>
                      <span className="max-w-[58%] break-all text-right font-mono font-semibold text-deep-brown">{displayPayment.providerOrderId}</span>
                    </div>
                  )}
                </>
              )}
              {order.refundSummary && (
                <div className="flex items-start justify-between gap-3 text-text-primary/80">
                  <span>{REFUND_SUMMARY_LABELS[order.refundSummary.status]}</span>
                  <span className="shrink-0 font-semibold text-deep-brown">₹{order.refundSummary.totalRefunded}</span>
                </div>
              )}
              <div className="flex justify-between text-text-primary/80 border-t border-deep-brown/10 pt-2">
                <span>Subtotal</span>
                <span className="font-semibold text-deep-brown">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-text-primary/80">
                <span>Shipping Fee</span>
                <span className="font-semibold text-deep-brown">₹{order.shippingFee}</span>
              </div>
              <div className="flex justify-between border-t border-deep-brown/10 pt-3 text-sm font-bold text-deep-brown">
                <span>Total</span>
                <span className="font-baloo text-lg font-extrabold text-primary-orange">
                  ₹{order.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OrderReturnSummary returns={Array.from(returnsByItem.values()).flat()} />
    </div>
  );
}
