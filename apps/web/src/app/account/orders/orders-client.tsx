"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { OrderApi } from "@/lib/order-api";
import type { CustomerOrderListItemJSON, CustomerOrderListResult } from "@/types/order";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { ProductImagePlaceholder } from "@/components/image-placeholder";
import { SHIPMENT_STATUS_LABELS } from "@/constants/shipment-status";
import { useReorder } from "@/hooks/use-reorder";

const PAGE_SIZE = 10;

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

const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "return_requested", label: "Return Requested" },
  { value: "cancelled", label: "Cancelled" },
];

// Short, non-committal helper text per shipment status — deliberately vague
// on timing (no ETAs, no "arrives by" promises) per the unconfirmed-claims
// discipline already applied elsewhere in this app.
const SHIPMENT_STATUS_HINTS: Record<string, string> = {
  pending: "We're preparing your shipment.",
  provider_status_unknown: "Confirming the latest update with our courier.",
  created: "Your shipment has been created.",
  awb_assigned: "A courier has been assigned to your order.",
  pickup_pending: "Waiting for courier pickup.",
  picked_up: "Your order has been picked up by the courier.",
  in_transit: "Your order is on its way.",
  out_for_delivery: "Your order is out for delivery.",
  delivered: "Your order has been delivered.",
  delivery_exception: "There's an issue with delivery — our team is on it.",
  ndr: "A delivery attempt was unsuccessful.",
  rto_initiated: "This shipment is being returned to us.",
  rto_in_transit: "This shipment is on its way back to us.",
  rto_delivered: "This shipment has been returned to us.",
  cancelled: "This shipment was cancelled.",
  failed: "There's an issue setting up this shipment — our team is on it.",
};

type StatusTone = "default" | "warning" | "success" | "danger";

const TONE_CLASSES: Record<StatusTone, string> = {
  default: "border-deep-brown/20 bg-cream-bg text-deep-brown",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  danger: "border-rose-300 bg-rose-50 text-rose-900",
};

const DANGER_SHIPMENT_STATUSES = new Set(["delivery_exception", "ndr", "failed", "rto_initiated", "rto_in_transit", "rto_delivered"]);

interface PrimaryStatus {
  label: string;
  description: string;
  tone: StatusTone;
}

// Derives one customer-facing "what's happening now" status from real order/
// payment/shipment fields only — never fulfilmentStatus, which no Shipping
// event in this codebase ever advances away from "unfulfilled" (see
// order-detail-client.tsx's equivalent note).
function derivePrimaryStatus(order: CustomerOrderListItemJSON): PrimaryStatus {
  if (order.status === "cancelled") {
    return { label: "Order Cancelled", description: "This order is no longer being processed.", tone: "danger" };
  }
  if (order.status === "pending" || order.paymentStatus === "pending") {
    return { label: "Payment Pending", description: "Complete payment to confirm this order.", tone: "warning" };
  }
  if (order.shipment) {
    const label = SHIPMENT_STATUS_LABELS[order.shipment.status] ?? order.shipment.status.replace(/_/g, " ");
    const description = SHIPMENT_STATUS_HINTS[order.shipment.status] ?? "";
    const tone: StatusTone = order.shipment.status === "delivered" ? "success" : DANGER_SHIPMENT_STATUSES.has(order.shipment.status) ? "danger" : "default";
    return { label, description, tone };
  }
  if (order.status === "return_requested") {
    return { label: "Return Requested", description: "We're reviewing your return request.", tone: "default" };
  }
  if (order.status === "delivered") {
    return { label: "Delivered", description: "Your order has been delivered.", tone: "success" };
  }
  if (order.status === "processing") {
    return { label: "Processing", description: "Your order is being prepared.", tone: "default" };
  }
  return { label: "Order Confirmed", description: "We're getting your order ready.", tone: "default" };
}

interface OrderFilters {
  status: string;
  from: string;
  to: string;
  search: string;
}

const EMPTY_FILTERS: OrderFilters = { status: "", from: "", to: "", search: "" };

function ProductPreview({ order }: { order: CustomerOrderListItemJSON }) {
  const primary = order.products[0];
  const extras = order.products.slice(1, 3);
  const moreItems = order.itemCount - 1;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <div className="h-16 w-16 overflow-hidden rounded-xl border border-deep-brown/10 bg-cream-bg flex items-center justify-center">
          {primary?.image ? (
            <Image src={primary.image} alt={primary.name} width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            <ProductImagePlaceholder label={primary?.name ?? "Order item"} iconSize={22} className="h-full w-full" />
          )}
        </div>
        {extras.length > 0 && (
          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border border-white bg-deep-brown px-1 text-[10px] font-bold text-white">
            +{extras.length}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-deep-brown">{primary?.name ?? "Order item"}</p>
        {moreItems > 0 && <p className="text-xs text-text-primary/60">+{moreItems} more item{moreItems > 1 ? "s" : ""}</p>}
      </div>
    </div>
  );
}

function OrderCard({ order, onReorder, reorderState }: { order: CustomerOrderListItemJSON; onReorder: (orderId: number) => void; reorderState?: "loading" | "done" | "error" }) {
  const isPendingOrder = order.status === "pending" || order.paymentStatus === "pending";
  const primaryStatus = derivePrimaryStatus(order);
  const canTrack = order.shipment?.trackingAvailable === true;

  return (
    <div
      className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition-all ${
        isPendingOrder ? "border-amber-400/80 bg-amber-50/20" : "border-deep-brown/15 hover:border-deep-brown/30"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ProductPreview order={order} />

        <div className="flex flex-col gap-1 sm:items-end sm:text-right">
          <span className="font-baloo text-lg font-extrabold text-deep-brown">#{order.orderNumber}</span>
          <span className="text-xs font-medium text-text-primary/70">
            Placed on {formatDate(order.placedAt)} &bull; {order.itemCount} item(s)
          </span>
          <span className="font-baloo text-xl font-extrabold text-primary-orange">₹{order.total}</span>
        </div>
      </div>

      <div className={`mt-4 rounded-xl border px-4 py-3 ${TONE_CLASSES[primaryStatus.tone]}`}>
        <p className="text-sm font-bold">{primaryStatus.label}</p>
        {primaryStatus.description && <p className="mt-0.5 text-xs opacity-80">{primaryStatus.description}</p>}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <StatusBadge label={order.status} type="order" />
          <StatusBadge label={order.paymentStatus} type="payment" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canTrack && (
            <Link
              href={`/account/orders/${order.id}#shipment-heading`}
              className="inline-flex items-center justify-center rounded-xl border border-deep-brown/20 bg-cream-bg px-4 py-2 text-xs font-bold text-deep-brown hover:bg-primary-orange hover:text-white hover:border-primary-orange transition-all"
            >
              Track Order
            </Link>
          )}
          <button
            type="button"
            onClick={() => onReorder(order.id)}
            disabled={reorderState === "loading"}
            className="inline-flex items-center justify-center rounded-xl border border-deep-brown/20 bg-cream-bg px-4 py-2 text-xs font-bold text-deep-brown hover:bg-primary-orange hover:text-white hover:border-primary-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reorderState === "loading" ? "Adding..." : reorderState === "error" ? "Try Again" : "Reorder"}
          </button>
          <Link
            href={`/account/orders/${order.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-primary-orange px-4 py-2 text-xs font-bold text-white hover:bg-terracotta transition-all"
          >
            View Details &rarr;
          </Link>
        </div>
      </div>
      {reorderState === "error" && <p className="mt-2 text-xs font-semibold text-terracotta">Some items from this order are no longer available.</p>}
    </div>
  );
}

function FilterFields({
  filters,
  searchValue,
  onSearchChange,
  onFilterChange,
}: {
  filters: OrderFilters;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (next: Omit<OrderFilters, "search">) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <label htmlFor="order-search" className="block text-[11px] font-bold text-deep-brown mb-1">
          Search order number
        </label>
        <input
          id="order-search"
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="e.g. MPM-000123"
          className="w-full rounded-xl border border-deep-brown/20 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-orange"
        />
      </div>
      <div>
        <label htmlFor="order-status-filter" className="block text-[11px] font-bold text-deep-brown mb-1">
          Status
        </label>
        <select
          id="order-status-filter"
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value, from: filters.from, to: filters.to })}
          className="w-full rounded-xl border border-deep-brown/20 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-orange"
        >
          {ORDER_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="order-from-date" className="block text-[11px] font-bold text-deep-brown mb-1">
          Placed from
        </label>
        <input
          id="order-from-date"
          type="date"
          value={filters.from}
          onChange={(e) => onFilterChange({ status: filters.status, from: e.target.value, to: filters.to })}
          className="w-full rounded-xl border border-deep-brown/20 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-orange"
        />
      </div>
      <div>
        <label htmlFor="order-to-date" className="block text-[11px] font-bold text-deep-brown mb-1">
          Placed until
        </label>
        <input
          id="order-to-date"
          type="date"
          value={filters.to}
          onChange={(e) => onFilterChange({ status: filters.status, from: filters.from, to: e.target.value })}
          className="w-full rounded-xl border border-deep-brown/20 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-orange"
        />
      </div>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i];
    if (page === undefined) continue;
    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev !== undefined && page - prev > 1) result.push("ellipsis");
    }
    result.push(page);
  }
  return result;
}

export function OrdersClient() {
  const { reorder, states: reorderStates } = useReorder();
  const [data, setData] = useState<CustomerOrderListResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce the search box only — status/date filters apply immediately.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchDraft) return prev;
        return { ...prev, search: searchDraft };
      });
      setPage((prev) => (prev === 1 ? prev : 1));
    }, 300);
    return () => clearTimeout(handle);
  }, [searchDraft]);

  const queryArgs = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    }),
    [page, filters]
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await OrderApi.list(queryArgs);
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
  }, [queryArgs]);

  useEffect(() => {
    let isSubscribed = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await OrderApi.list(queryArgs);
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
  }, [queryArgs]);

  function updateFilters(next: OrderFilters) {
    setFilters(next);
    setPage(1);
  }

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
          onClick={() => fetchOrders()}
          className="rounded-xl bg-terracotta px-5 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  const items: CustomerOrderListItemJSON[] = data?.items || [];
  const hasActiveFilters = Boolean(filters.status || filters.from || filters.to || filters.search);

  if (items.length === 0 && !hasActiveFilters) {
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

  const pageNumbers = data ? buildPageNumbers(data.page, data.totalPages) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-baloo text-2xl font-bold text-deep-brown">Order History</h2>
        <span className="text-xs font-semibold text-deep-brown/60">
          Showing {items.length} of {data?.total ?? items.length} order(s)
        </span>
      </div>

      {/* Desktop filter bar */}
      <div className="hidden rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs sm:block">
        <FilterFields
          filters={filters}
          searchValue={searchDraft}
          onSearchChange={setSearchDraft}
          onFilterChange={(next) => updateFilters({ ...next, search: filters.search })}
        />
      </div>

      {/* Mobile filter drawer trigger */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          className="w-full rounded-xl border border-deep-brown/20 bg-white px-4 py-2.5 text-xs font-bold text-deep-brown flex items-center justify-between"
        >
          <span>Filters{hasActiveFilters ? " (active)" : ""}</span>
          <span aria-hidden="true">{mobileFiltersOpen ? "▲" : "▼"}</span>
        </button>
        {mobileFiltersOpen && (
          <div className="mt-3 rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs">
            <FilterFields
              filters={filters}
              searchValue={searchDraft}
              onSearchChange={setSearchDraft}
              onFilterChange={(next) => updateFilters({ ...next, search: filters.search })}
            />
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center sm:p-12 shadow-xs">
          <h2 className="font-baloo text-xl font-bold text-deep-brown">No orders match these filters</h2>
          <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">Try adjusting or clearing your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              updateFilters(EMPTY_FILTERS);
            }}
            className="mt-6 inline-block rounded-xl border border-deep-brown/20 bg-cream-bg px-6 py-2.5 text-xs font-bold text-deep-brown hover:bg-primary-orange hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((order) => (
            <OrderCard key={order.id} order={order} onReorder={reorder} reorderState={reorderStates[order.id]} />
          ))}
        </div>
      )}

      {/* Numbered pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-deep-brown/10 pt-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-xl border border-deep-brown/20 px-3 py-2 text-xs font-bold text-deep-brown hover:bg-cream-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Previous
          </button>

          {pageNumbers.map((entry, idx) =>
            entry === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-deep-brown/40">
                &hellip;
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => setPage(entry)}
                aria-current={entry === page ? "page" : undefined}
                className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-colors ${
                  entry === page ? "bg-primary-orange text-white" : "text-deep-brown hover:bg-cream-bg"
                }`}
              >
                {entry}
              </button>
            )
          )}

          <span className="sr-only" aria-live="polite">
            Page {data.page} of {data.totalPages}
          </span>

          <button
            type="button"
            disabled={page >= data.totalPages || loading}
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
            className="rounded-xl border border-deep-brown/20 px-3 py-2 text-xs font-bold text-deep-brown hover:bg-cream-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
