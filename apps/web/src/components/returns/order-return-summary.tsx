import Link from "next/link";
import type { ReturnRequestJSON } from "@/types/return";

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: "Return requested",
  approved: "Return approved",
  rejected: "Return rejected",
  resolved: "Return resolved",
  cancelled: "Return cancelled",
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  pending: "Refund pending",
  processing: "Refund processing",
  succeeded: "Refund completed",
  failed: "Refund failed",
};

/**
 * Surfaces this order's return/refund/replacement activity as its own
 * section, using the same returnsByItem data order-detail-client.tsx already
 * fetches via ReturnApi — no new API calls, no fake data. Renders nothing
 * when the order has no returns at all.
 */
export function OrderReturnSummary({ returns }: { returns: ReturnRequestJSON[] }) {
  if (returns.length === 0) return null;

  return (
    <section className="rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="returns-summary-heading">
      <h3 id="returns-summary-heading" className="font-baloo text-lg font-bold text-deep-brown border-b border-deep-brown/10 pb-3">
        Returns &amp; Refunds
      </h3>
      <div className="mt-3 divide-y divide-deep-brown/10">
        {returns.map((r) => {
          const refund = r.refunds[0];
          return (
            <div key={r.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <p className="text-sm font-bold text-deep-brown">{r.productName}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-primary/75">
                <span className="font-semibold text-deep-brown">
                  {r.resolution === "replacement" ? "Replacement" : "Return"}: {RETURN_STATUS_LABELS[r.status] ?? r.status}
                </span>
                {refund && (
                  <span>
                    {REFUND_STATUS_LABELS[refund.status] ?? refund.status}
                    {refund.status === "succeeded" ? ` — ₹${refund.amount}` : ""}
                  </span>
                )}
                {r.replacement && <span>Replacement {r.replacement.status.replace(/_/g, " ")}</span>}
              </div>
              <Link href={`/account/returns/${r.id}`} className="inline-block text-xs font-bold text-primary-orange hover:underline">
                View Return Details &rarr;
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
