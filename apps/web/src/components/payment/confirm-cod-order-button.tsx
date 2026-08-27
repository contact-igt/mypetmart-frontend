"use client";

import { useState } from "react";
import { PaymentApi } from "@/lib/payment-api";
import type { CodConfirmationResultJSON, ConfirmCodOrderInput } from "@/types/payment";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { storeGuestPaymentToken } from "@/app/order/payment/guest-payment-token";

type ConfirmCodOrderButtonProps = {
  input: ConfirmCodOrderInput;
  onConfirmed: (result: CodConfirmationResultJSON) => void;
  className?: string;
};

/**
 * Confirms an Order for Cash on Delivery — creates a "cod"/"pending" Payment
 * record and moves the Order straight to "confirmed" server-side. Unlike
 * ProceedToPaymentButton, there is no external gateway handoff: on success
 * the parent (checkout-client.tsx) swaps to a confirmation view using the
 * result returned here, never a redirect.
 */
export function ConfirmCodOrderButton({ input, onConfirmed, className }: ConfirmCodOrderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await PaymentApi.confirmCod(input);
      if ("guestAccessToken" in input && input.guestAccessToken) {
        storeGuestPaymentToken(input.guestAccessToken);
      }
      onConfirmed(result);
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        setError(err.message || "Unable to confirm Cash on Delivery. Please try again.");
      } else {
        setError("Unable to confirm Cash on Delivery. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-primary-orange py-3 text-xs font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Confirming order..." : "Confirm Cash on Delivery Order"}
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-terracotta text-center">{error}</p>}
    </div>
  );
}
