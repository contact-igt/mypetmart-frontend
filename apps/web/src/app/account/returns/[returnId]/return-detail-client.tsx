"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReturnApi } from "@/lib/return-api";
import type { ReturnRequestDetailJSON } from "@/types/return";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { ShipmentTracking } from "@/components/shipment-tracking";
import { ReturnShipmentTracking } from "@/components/returns/return-shipment-tracking";

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
  cancelled: { title: "Return cancelled", body: "This return request has been cancelled. No refund was initiated by this action." },
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
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const canCancel = detail.canCancel === true;

  async function handleCancel() {
    if (!canCancel || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await ReturnApi.cancel(numericId, cancelReason.trim() || undefined);
      setDetail(updated);
      setCancelConfirmOpen(false);
      setCancelReason("");
    } catch (err: unknown) {
      setCancelError(err instanceof AppAuthError ? err.message : "Could not cancel this return. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const statusCopy = detail.resolution === "replacement"
      ? {
        title: detail.status === "requested" ? "Replacement requested" : detail.status === "rejected" ? "Replacement rejected" : detail.status === "resolved" ? "Replacement completed" : detail.status === "cancelled" ? "Replacement request cancelled" : "Replacement approved",
        body: detail.status === "requested" ? "We're reviewing your replacement request." : detail.status === "rejected" ? "This replacement request was not approved." : detail.status === "cancelled" ? "This replacement request has been cancelled." : detail.replacement ? REPLACEMENT_STATUS_COPY[detail.replacement.status] : "Your replacement has been approved.",
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
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelConfirmOpen(true)}
              className="rounded-xl border border-terracotta/40 px-3 py-2 text-xs font-bold text-terracotta hover:bg-terracotta/10"
            >
              Cancel Return
            </button>
          )}
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
          {detail.cancelledAt && (
            <div>
              <span className="block font-bold text-deep-brown/50 uppercase tracking-wide text-[10px]">Cancelled</span>
              <span className="text-deep-brown">{formatDate(detail.cancelledAt)}</span>
            </div>
          )}
        </div>

        {detail.cancellationReason && (
          <div>
            <span className="block font-bold text-deep-brown/50 uppercase tracking-wide text-[10px] mb-1">Cancellation note</span>
            <p className="text-sm text-deep-brown">{detail.cancellationReason}</p>
          </div>
        )}

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

      <ReturnShipmentTracking returnShipment={detail.returnShipment} />

      {/* Refund status — deliberately visually distinct from Return status above. */}
      {detail.refunds.length > 0 && (
        <div className="rounded-2xl border border-deep-brown/15 bg-cream-bg p-6 shadow-xs space-y-4">
          <h3 className="font-baloo text-base font-bold text-deep-brown">Refund status</h3>
          {detail.refunds.map((refund) => (
            <div key={refund.id} className="rounded-xl border border-deep-brown/10 bg-white p-4 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 font-bold text-deep-brown text-sm">
                  {refund.status === "succeeded" ? `₹${refund.amount} refunded` : `₹${refund.amount} refund ${refund.status}`}
                </span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-text-primary/60">{refund.status}</span>
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

      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-deep-brown/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-return-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="cancel-return-title" className="font-baloo text-xl font-bold text-deep-brown">Cancel this return?</h2>
            <p className="mt-2 text-sm text-text-primary/75">This only cancels the return request. It does not initiate or reverse a refund.</p>
            <label htmlFor="cancel-return-reason" className="mt-4 block text-xs font-bold uppercase tracking-wide text-deep-brown/60">Reason (optional)</label>
            <textarea
              id="cancel-return-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full resize-none rounded-xl border border-deep-brown/15 px-3 py-2 text-sm text-deep-brown focus:border-primary-orange focus:outline-none"
            />
            {cancelError && <p className="mt-2 text-xs font-semibold text-terracotta">{cancelError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelConfirmOpen(false)} disabled={cancelling} className="rounded-xl border border-deep-brown/15 px-4 py-2 text-xs font-bold text-deep-brown disabled:opacity-50">Keep Return</button>
              <button type="button" onClick={() => { void handleCancel(); }} disabled={cancelling} className="rounded-xl bg-terracotta px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{cancelling ? "Cancelling..." : "Cancel Return"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
