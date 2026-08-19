"use client";

import { useState } from "react";
import { ReturnApi } from "@/lib/return-api";
import { AppAuthError } from "@/lib/auth/auth-errors";

type RequestReturnFormProps = {
  orderId: number;
  orderItemId: number;
  purchasedQuantity: number;
  onSubmitted: () => void;
};

/**
 * Inline expand-in-place form (no modal) per CLAUDE.md's "inline form
 * errors — no modal or toast for validation" rule. Eligibility (delivery
 * state, return window, remaining quantity) is entirely backend-authoritative
 * — this form only decides whether to render the CTA at all (order is
 * delivered), never whether a specific request will be accepted.
 */
export function RequestReturnForm({ orderId, orderItemId, purchasedQuantity, onSubmitted }: RequestReturnFormProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(purchasedQuantity);
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState<"refund" | "replacement">("refund");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p className="text-xs font-bold text-deep-brown">{resolution === "replacement" ? "Replacement" : "Refund"} requested — we&apos;ll review it shortly.</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-primary-orange hover:underline">
        Request Refund or Replacement
      </button>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await ReturnApi.create({ orderId, orderItemId, quantity, reason, resolution });
      setSubmitted(true);
      setOpen(false);
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof AppAuthError ? err.message : "Unable to submit return request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2.5 rounded-xl border border-deep-brown/15 bg-cream-bg p-3">
      <div>
        <label htmlFor={`return-resolution-${orderItemId}`} className="block text-[11px] font-bold text-deep-brown mb-1">
          Preferred resolution
        </label>
        <select
          id={`return-resolution-${orderItemId}`}
          value={resolution}
          onChange={(event) => setResolution(event.target.value as "refund" | "replacement")}
          className="w-full rounded-lg border border-deep-brown/20 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-deep-brown"
        >
          <option value="refund">Refund</option>
          <option value="replacement">Replacement (same product and variant)</option>
        </select>
      </div>
      <div>
        <label htmlFor={`return-qty-${orderItemId}`} className="block text-[11px] font-bold text-deep-brown mb-1">
          Quantity
        </label>
        <input
          id={`return-qty-${orderItemId}`}
          type="number"
          min={1}
          max={purchasedQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(purchasedQuantity, Number(e.target.value) || 1)))}
          className="w-24 rounded-lg border border-deep-brown/20 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-deep-brown"
        />
      </div>
      <div>
        <label htmlFor={`return-reason-${orderItemId}`} className="block text-[11px] font-bold text-deep-brown mb-1">
          Reason
        </label>
        <textarea
          id={`return-reason-${orderItemId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={1}
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg border border-deep-brown/20 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-deep-brown"
          placeholder="e.g. Item arrived damaged"
        />
      </div>
      {error && <p className="text-xs font-semibold text-terracotta">{error}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary-orange px-4 py-1.5 text-[11px] font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] font-bold text-deep-brown/70 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
