"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReturnApi } from "@/lib/return-api";
import type { ListReturnsResultJSON, ReturnStatus } from "@/types/return";
import { AppAuthError } from "@/lib/auth/auth-errors";

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateString;
  }
}

const RETURN_STATUS_STYLE: Record<ReturnStatus, string> = {
  requested: "bg-amber-50 text-amber-800 border-amber-300",
  approved: "bg-blue-50 text-blue-800 border-blue-300",
  rejected: "bg-rose-50 text-rose-800 border-rose-300",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-300",
};

export function ReturnsClient() {
  const [data, setData] = useState<ListReturnsResultJSON | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    ReturnApi.list({ page, pageSize: 10 })
      .then((result) => {
        if (isSubscribed) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isSubscribed) {
          setError(err instanceof AppAuthError ? err.message : "Failed to load your returns. Please try again.");
          setLoading(false);
        }
      });
    return () => {
      isSubscribed = false;
    };
  }, [page]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent mb-4"></div>
        <p className="font-medium text-deep-brown">Loading your returns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-terracotta/30 bg-terracotta/10 p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-terracotta">{error}</p>
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center sm:p-12 shadow-xs">
        <h2 className="font-baloo text-2xl font-bold text-deep-brown">No return requests yet</h2>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          If you need to return a delivered item, use the &ldquo;Request Return&rdquo; option on the order detail page.
        </p>
        <Link href="/account/orders" className="mt-6 inline-block rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-baloo text-2xl font-bold text-deep-brown">My Returns</h2>
        <span className="text-xs font-semibold text-deep-brown/60">
          Showing {items.length} of {data?.total ?? items.length}
        </span>
      </div>

      <div className="space-y-4">
        {items.map((r) => {
          const refund = r.refunds[0];
          return (
            <Link
              key={r.id}
              href={`/account/returns/${r.id}`}
              className="block rounded-2xl border border-deep-brown/15 bg-white p-5 sm:p-6 shadow-xs hover:border-deep-brown/30 transition-all"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-baloo text-base font-extrabold text-deep-brown">{r.returnNumber}</span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${RETURN_STATUS_STYLE[r.status]}`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary-orange">{r.resolution}</span>
                    {refund && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-text-primary/60">
                        Refund: {refund.status}
                      </span>
                    )}
                    {r.replacement && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-text-primary/60">
                        Replacement: {r.replacement.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-text-primary/70 mt-0.5">
                    {r.productName} &bull; Qty {r.quantity} &bull; Order #{r.orderNumber}
                  </p>
                  <p className="text-[11px] text-text-primary/60 mt-0.5">Requested {formatDate(r.requestedAt)}</p>
                </div>
                <span className="text-xs font-bold text-primary-orange">View Details &rarr;</span>
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
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
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-xl border border-deep-brown/20 px-4 py-2 text-xs font-bold text-deep-brown hover:bg-cream-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
