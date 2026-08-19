"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReturnApi } from "@/lib/return-api";
import type { ReturnRequestDetailJSON } from "@/types/return";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { ShipmentTracking } from "@/components/shipment-tracking";

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateString;
  }
}

const RETURN_STATUS_COPY: Record<string, { title: string; body: string }> = {
  requested: { title: "Return requested", body: "We're reviewing your return request." },
  approved: { title: "Return approved", body: "Your return has been approved. A refund will be initiated by our team." },
  rejected: { title: "Return rejected", body: "This return request was not approved." },
  resolved: { title: "Return resolved", body: "This return has been fully processed." },
};

// Deliberately no promise of immediate bank credit — matches the spec's
// "refund initiated ≠ money in hand yet" copy discipline (§26). PayU
// internal IDs (mihpayid, request_id, refund token) are never surfaced here.
const REFUND_STATUS_COPY: Record<string, string> = {
  pending: "Refund initiated — awaiting confirmation from our payment provider.",
  processing: "Refund processing with our payment provider.",
  succeeded: "Refund completed.",
  failed: "Refund attempt failed — our team has been notified and will follow up.",
};

const REPLACEMENT_STATUS_COPY: Record<string, string> = {
  stock_unavailable: "Replacement approved, but the same item is currently unavailable. No refund has been started.",
  processing: "Replacement inventory is allocated and your replacement is being processed.",
  completed: "Replacement completed.",
};

export function ReturnDetailClient({ returnIdStr }: { returnIdStr: string }) {
  const cleanStr = (returnIdStr || "").trim();
  const numericId = parseInt(cleanStr, 10);
  const isValidId = !isNaN(numericId) && numericId > 0 && String(numericId) === cleanStr;

  const [detail, setDetail] = useState<ReturnRequestDetailJSON | null>(null);
  const [loading, setLoading] = useState(isValidId);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(!isValidId);

  useEffect(() => {
    if (!isValidId) return;
    let isSubscribed = true;
    ReturnApi.getReturn(numericId)
      .then((result) => {
        if (isSubscribed) {
          setDetail(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isSubscribed) return;
        if (err instanceof AppAuthError && (err.code === "RETURN_REQUEST_NOT_FOUND" || err.code === "NOT_FOUND")) {
          setIsNotFound(true);
        } else if (err instanceof AppAuthError) {
          setError(err.message);
        } else {
          setError("Failed to load return details.");
        }
        setLoading(false);
      });
    return () => {
      isSubscribed = false;
    };
  }, [numericId, isValidId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent mb-4"></div>
        <p className="font-medium text-deep-brown">Loading return details...</p>
      </div>
    );
  }

  if (isNotFound || error || !detail) {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center sm:p-12 shadow-xs space-y-4">
        <h2 className="font-baloo text-2xl font-bold text-deep-brown">{isNotFound ? "Return not found" : "Something went wrong"}</h2>
        <p className="text-sm text-text-primary/75 max-w-md mx-auto">
          {isNotFound ? "This return request does not exist or you do not have permission to view it." : error}
        </p>
        <Link href="/account/returns" className="inline-block rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
          &larr; Back to My Returns
        </Link>
      </div>
    );
  }

  const statusCopy = detail.resolution === "replacement"
    ? {
        title: detail.status === "requested" ? "Replacement requested" : detail.status === "rejected" ? "Replacement rejected" : detail.status === "resolved" ? "Replacement completed" : "Replacement approved",
        body: detail.status === "requested" ? "We're reviewing your replacement request." : detail.status === "rejected" ? "This replacement request was not approved." : detail.replacement ? REPLACEMENT_STATUS_COPY[detail.replacement.status] : "Your replacement has been approved.",
      }
    : RETURN_STATUS_COPY[detail.status] ?? { title: detail.status, body: "" };

  return (
    <div className="space-y-6">
      <Link href="/account/returns" className="inline-flex items-center gap-1 text-xs font-bold text-primary-orange hover:underline">
        &larr; Back to My Returns
      </Link>

      <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-deep-brown/10 pb-4">
          <div>
            <h2 className="font-baloo text-2xl font-extrabold text-deep-brown">{detail.returnNumber}</h2>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary-orange">{detail.resolution}</p>
            <p className="text-xs text-text-primary/70 mt-0.5">
              {detail.productName} &bull; Qty {detail.quantity} &bull; Order{" "}
              <Link href={`/account/orders/${detail.orderId}`} className="font-bold text-primary-orange hover:underline">
                #{detail.orderNumber}
              </Link>
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-baloo text-lg font-bold text-deep-brown">{statusCopy.title}</h3>
          <p className="text-sm text-text-primary/75 mt-1">{statusCopy.body}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block font-bold text-deep-brown/50 uppercase tracking-wide text-[10px]">Requested</span>
            <span className="text-deep-brown">{formatDate(detail.requestedAt)}</span>
          </div>
          <div>
            <span className="block font-bold text-deep-brown/50 uppercase tracking-wide text-[10px]">Resolved</span>
            <span className="text-deep-brown">{formatDate(detail.resolvedAt)}</span>
          </div>
        </div>

        <div>
          <span className="block font-bold text-deep-brown/50 uppercase tracking-wide text-[10px] mb-1">Reason</span>
          <p className="text-sm text-deep-brown">{detail.reason}</p>
        </div>

        {detail.resolutionNote && (
          <div>
            <span className="block font-bold text-deep-brown/50 uppercase tracking-wide text-[10px] mb-1">Note from our team</span>
            <p className="text-sm text-deep-brown">{detail.resolutionNote}</p>
          </div>
        )}
      </div>

      {/* Refund status — deliberately visually distinct from Return status above. */}
      {detail.refunds.length > 0 && (
        <div className="rounded-2xl border border-deep-brown/15 bg-cream-bg p-6 shadow-xs space-y-4">
          <h3 className="font-baloo text-base font-bold text-deep-brown">Refund status</h3>
          {detail.refunds.map((refund) => (
            <div key={refund.id} className="rounded-xl border border-deep-brown/10 bg-white p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-deep-brown text-sm">
                  {refund.status === "succeeded" ? `₹${refund.amount} refunded` : `₹${refund.amount} refund ${refund.status}`}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-primary/60">{refund.status}</span>
              </div>
              <p className="text-xs text-text-primary/75">{REFUND_STATUS_COPY[refund.status]}</p>
              <p className="text-[11px] text-text-primary/50">
                Initiated {formatDate(refund.initiatedAt)}
                {refund.completedAt ? ` · Completed ${formatDate(refund.completedAt)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {detail.replacement && (
        <div className="space-y-4">
        <div className="rounded-2xl border border-deep-brown/15 bg-cream-bg p-6 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-baloo text-base font-bold text-deep-brown">Replacement status</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide text-text-primary/60">{detail.replacement.status.replace(/_/g, " ")}</span>
          </div>
          <p className="font-mono text-xs text-text-primary/60">{detail.replacement.replacementNumber}</p>
          <p className="text-xs text-text-primary/75">{REPLACEMENT_STATUS_COPY[detail.replacement.status]}</p>
        </div>
        <ShipmentTracking shipment={detail.replacement.shipment} emptyMessage="Your replacement shipment has not been prepared yet." />
        </div>
      )}
    </div>
  );
}
