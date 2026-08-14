"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { OrderApi } from "@/lib/order-api";
import type { CustomerOrderListResult, OrderListItemJSON } from "@/types/order";
import { AppAuthError } from "@/lib/auth/auth-errors";

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

export function StatusBadge({
  label,
  type,
}: {
  label: string;
  type: "order" | "payment" | "fulfilment";
}) {
  const normalized = label.toLowerCase();
  let colorStyle = "bg-gray-100 text-gray-800 border-gray-300";

  if (type === "order") {
    if (normalized === "pending") {
      colorStyle = "bg-amber-50 text-amber-800 border-amber-300";
    } else if (normalized === "confirmed") {
      colorStyle = "bg-emerald-50 text-emerald-800 border-emerald-300";
    } else if (normalized === "cancelled") {
      colorStyle = "bg-rose-50 text-rose-800 border-rose-300";
    }
  } else if (type === "payment") {
    if (normalized === "pending") {
      colorStyle = "bg-amber-50 text-amber-800 border-amber-300";
    } else if (normalized === "paid") {
      colorStyle = "bg-emerald-50 text-emerald-800 border-emerald-300";
    } else if (normalized === "failed") {
      colorStyle = "bg-rose-50 text-rose-800 border-rose-300";
    } else if (normalized === "refunded") {
      colorStyle = "bg-blue-50 text-blue-800 border-blue-300";
    }
  } else if (type === "fulfilment") {
    if (normalized === "unfulfilled") {
      colorStyle = "bg-slate-100 text-slate-700 border-slate-300";
    } else if (normalized === "processing") {
      colorStyle = "bg-blue-50 text-blue-800 border-blue-300";
    } else if (normalized === "shipped") {
      colorStyle = "bg-indigo-50 text-indigo-800 border-indigo-300";
    } else if (normalized === "delivered") {
      colorStyle = "bg-emerald-50 text-emerald-800 border-emerald-300";
    } else if (normalized === "cancelled") {
      colorStyle = "bg-rose-50 text-rose-800 border-rose-300";
    }
  }

  const typePrefix =
    type === "order" ? "Order: " : type === "payment" ? "Payment: " : "Fulfilment: ";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${colorStyle}`}
    >
      <span className="opacity-60 capitalize mr-1">{typePrefix}</span>
      {label}
    </span>
  );
}

export function OrdersClient() {
  const [data, setData] = useState<CustomerOrderListResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await OrderApi.list({ page: targetPage, pageSize: 10 });
      setData(result);
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        setError(err.message);
      } else {
        setError("Failed to load your orders. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    async function load() {
      setError(null);
      try {
        const result = await OrderApi.list({ page, pageSize: 10 });
        if (isSubscribed) {
          setData(result);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          if (err instanceof AppAuthError) {
            setError(err.message);
          } else {
            setError("Failed to load your orders. Please try again.");
          }
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isSubscribed = false;
    };
  }, [page]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent mb-4"></div>
        <p className="font-medium text-deep-brown">Loading your order history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-terracotta/30 bg-terracotta/10 p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-terracotta">{error}</p>
        <button
          type="button"
          onClick={() => fetchOrders(page)}
          className="rounded-xl bg-terracotta px-5 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  const items: OrderListItemJSON[] = data?.items || [];

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center sm:p-12 shadow-xs">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-peach-hero/40 text-primary-orange mb-4">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h2 className="font-baloo text-2xl font-bold text-deep-brown">No orders yet</h2>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          When you place an order, its details and status updates will appear here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-baloo text-2xl font-bold text-deep-brown">Order History</h2>
        <span className="text-xs font-semibold text-deep-brown/60">
          Showing {items.length} of {data?.total ?? items.length} order(s)
        </span>
      </div>

      <div className="space-y-4">
        {items.map((order) => {
          const isPendingOrder = order.status === "pending" || order.paymentStatus === "pending";

          return (
            <div
              key={order.id}
              className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition-all ${
                isPendingOrder ? "border-amber-400/80 bg-amber-50/20" : "border-deep-brown/15 hover:border-deep-brown/30"
              }`}
            >
              {/* Header Info */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-deep-brown/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-baloo text-lg font-extrabold text-deep-brown">
                      #{order.orderNumber}
                    </span>
                    {isPendingOrder && (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                        Pending Payment Setup
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-text-primary/70 mt-0.5">
                    Placed on {formatDate(order.placedAt)} &bull; {order.itemCount} item(s)
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-deep-brown/50">
                    Total Amount
                  </span>
                  <span className="font-baloo text-xl font-extrabold text-primary-orange">
                    ₹{order.total}
                  </span>
                </div>
              </div>

              {/* Status Badges & Link */}
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <StatusBadge label={order.status} type="order" />
                  <StatusBadge label={order.paymentStatus} type="payment" />
                  <StatusBadge label={order.fulfilmentStatus} type="fulfilment" />
                </div>

                <Link
                  href={`/account/orders/${order.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-deep-brown/20 bg-cream-bg px-4 py-2 text-xs font-bold text-deep-brown hover:bg-primary-orange hover:text-white hover:border-primary-orange transition-all"
                >
                  View Order &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-deep-brown/10 pt-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-xl border border-deep-brown/20 px-4 py-2 text-xs font-bold text-deep-brown hover:bg-cream-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Previous
          </button>
          <span className="text-xs font-semibold text-deep-brown/70">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages || loading}
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
            className="rounded-xl border border-deep-brown/20 px-4 py-2 text-xs font-bold text-deep-brown hover:bg-cream-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
