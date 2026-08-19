"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentApi } from "@/lib/payment-api";
import type { InitiatePaymentInput, PaymentInitiationResultJSON } from "@/types/payment";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { storeGuestPaymentToken } from "@/app/order/payment/guest-payment-token";

type ProceedToPaymentButtonProps = {
  input: InitiatePaymentInput;
  className?: string;
};

/**
 * Initiates a PayU Hosted Checkout Payment Attempt, then hands the browser
 * off to PayU by auto-submitting a real HTML form POST with the fields the
 * backend returned — MyPetMart never renders a card/UPI form itself and
 * never sees card data. The initiation call and the redirect are two
 * distinct steps: this component's only job is the handoff; it never marks
 * anything paid.
 */
export function ProceedToPaymentButton({ input, className }: ProceedToPaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<PaymentInitiationResultJSON | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (handoff && formRef.current) {
      formRef.current.submit();
    }
  }, [handoff]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await PaymentApi.initiate(input);
      if (input.guestAccessToken) {
        storeGuestPaymentToken(input.guestAccessToken);
      }
      setHandoff(result);
    } catch (err: unknown) {
      if (err instanceof AppAuthError && err.code === "ORDER_ALREADY_PAID") {
        // The backend just reconciled this order with PayU and found it was
        // already paid on a previous attempt (the one that would otherwise
        // resubmit the same txnid and get bounced by PayU's own duplicate
        // check) — send the customer to their order status instead of
        // showing a dead-end "try again" error.
        setError("This order has already been paid. Redirecting you to your order status…");
        const query = new URLSearchParams({ status: "success" });
        if ("orderId" in input && input.orderId !== undefined) {
          query.set("orderId", String(input.orderId));
        }
        router.push(`/order/payment/result?${query.toString()}`);
        return;
      }
      if (err instanceof AppAuthError) {
        setError(err.message || "Unable to start payment. Please try again.");
      } else {
        setError("Unable to start payment. Please try again.");
      }
      setLoading(false);
    }
  };

  if (handoff) {
    return (
      <div>
        <p className="text-xs font-medium text-deep-brown/70 text-center">Redirecting you to PayU to complete payment&hellip;</p>
        {/* Real browser form POST directly to PayU's Hosted Checkout endpoint. PayU owns all payment-method collection. */}
        <form ref={formRef} method="POST" action={handoff.gatewayUrl} className="hidden">
          {Object.entries(handoff.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </form>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-primary-orange py-3 text-xs font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Starting payment..." : "Proceed to Payment"}
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-terracotta text-center">{error}</p>}
    </div>
  );
}
