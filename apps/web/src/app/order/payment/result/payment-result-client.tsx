"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useCart } from "@/context/cart-context";
import { PaymentApi } from "@/lib/payment-api";
import { ProceedToPaymentButton } from "@/components/payment/proceed-to-payment-button";
import { clearGuestPaymentToken, readGuestPaymentToken } from "../guest-payment-token";
import type { InitiatePaymentInput, PaymentStatusResultJSON } from "@/types/payment";

type PaymentResultClientProps = {
  // Display hints from PayU's own browser redirect only — never trusted as
  // proof of anything. The real outcome always comes from
  // PaymentApi.getStatus(), which asks the backend for its server-verified
  // state (reconciling against PayU's Verify Payment API when uncertain).
  status: "success" | "failure";
  txnid: string | null;
  orderId: string | null;
};

type ReconciliationState =
  | { kind: "loading" }
  | { kind: "no-identity" }
  | { kind: "error" }
  | { kind: "resolved"; result: PaymentStatusResultJSON; retryInput: InitiatePaymentInput | null };

function SpinnerIcon() {
  return <div className="h-7 w-7 animate-spin rounded-full border-4 border-deep-brown/30 border-t-deep-brown" />;
}

function ReferenceBox({ orderId, txnid }: { orderId: string | number | null; txnid: string | null }) {
  if (!orderId && !txnid) return null;
  return (
    <div className="rounded-xl bg-cream-bg border border-deep-brown/10 p-4 text-xs text-deep-brown/80 space-y-1">
      {orderId && (
        <p>
          Order reference: <span className="font-bold">#{orderId}</span>
        </p>
      )}
      {txnid && (
        <p>
          Payment reference: <span className="font-mono">{txnid}</span>
        </p>
      )}
    </div>
  );
}

export function PaymentResultClient({ status, txnid, orderId }: PaymentResultClientProps) {
  const { status: authStatus, customer } = useCustomerAuth();
  const { refresh } = useCart();
  const refreshRef = useRef(refresh);
  
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const isAuthenticated = authStatus === "authenticated" && Boolean(customer);
  const [state, setState] = useState<ReconciliationState>({ kind: "loading" });
  // Bumped by the manual "Check Again" button to re-trigger the effect below
  // without the effect itself needing to call an externally-defined,
  // memoized reconciliation function (see order-detail-client.tsx for the
  // same fetch-in-effect shape used elsewhere in this app).
  const [retryToken, setRetryToken] = useState(0);

  const recheck = useCallback(() => {
    setState({ kind: "loading" });
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    // Wait for CustomerAuthProvider's own bootstrap to settle first — calling
    // before authStatus resolves could wrongly treat an about-to-be-
    // authenticated customer as a guest with no identity to reconcile with.
    if (authStatus === "loading") return;

    let cancelled = false;

    async function runReconciliation() {
      const input: InitiatePaymentInput | null =
        isAuthenticated && orderId
          ? { orderId: Number(orderId) }
          : (() => {
              const token = readGuestPaymentToken();
              return token ? { guestAccessToken: token } : null;
            })();

      if (!input) {
        if (!cancelled) setState({ kind: "no-identity" });
        return;
      }

      try {
        const result = await PaymentApi.getStatus(input);
        if (result.paymentStatus !== "pending") {
          // Terminal (or exception) outcome reached — drop the bridged guest
          // token so it never leaks into a later, unrelated result-page visit.
          clearGuestPaymentToken();
        }
        if (result.paymentStatus === "paid" && !result.commerceException) {
          // The backend finalized the exact order-producing cart. Inform the
          // CartContext to refresh so that the stale finalized cart is discarded
          // and a new active cart is fetched, updating the cart count to 0.
          void refreshRef.current();
        }
        if (!cancelled) setState({ kind: "resolved", result, retryInput: input });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    }

    void runReconciliation();

    return () => {
      cancelled = true;
    };
  }, [authStatus, isAuthenticated, orderId, retryToken]);

  if (state.kind === "loading" || authStatus === "loading") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${status === "success" ? "bg-mint-sage" : "bg-peach-hero/50"}`}>
          <SpinnerIcon />
        </div>
        <div>
          <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Verifying your payment&hellip;</h1>
          <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
            We&apos;re confirming the final result with PayU now — this page is not the final word on your payment.
          </p>
        </div>
        <ReferenceBox orderId={orderId} txnid={txnid} />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-peach-hero/50">
          <SpinnerIcon />
        </div>
        <div>
          <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Still verifying your payment</h1>
          <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
            We couldn&apos;t reach MyPetMart just now. This does not mean your payment failed — please check again in a
            moment.
          </p>
        </div>
        <ReferenceBox orderId={orderId} txnid={txnid} />
        <button
          type="button"
          onClick={recheck}
          className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
        >
          Check Again
        </button>
      </div>
    );
  }

  if (state.kind === "no-identity") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <div>
          <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Payment status is being verified</h1>
          <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
            We&apos;re still verifying the final status — please don&apos;t assume it definitely failed.
          </p>
        </div>
        <ReferenceBox orderId={orderId} txnid={txnid} />
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <Link
              href="/account/orders"
              className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
            >
              View My Orders
            </Link>
          ) : (
            <p className="text-xs font-medium text-deep-brown/70 max-w-sm">
              Use the order link from your order confirmation screen (the one you were asked to save) to check your
              order&apos;s latest status.
            </p>
          )}
          <Link href="/shop" className="text-xs font-bold text-primary-orange hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const { result, retryInput } = state;
  const orderLink = isAuthenticated ? `/account/orders/${result.orderId}` : null;

  if (result.commerceException) {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">We need to finalize your order manually</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          Your payment of {result.currency} {result.amount} was received. One or more items in your order need a quick
          manual check from our team before we can confirm it — we&apos;ll be in touch shortly. No further action is
          needed from you right now.
        </p>
        <ReferenceBox orderId={result.orderId} txnid={txnid} />
        {orderLink && (
          <Link href={orderLink} className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
            View Order Status
          </Link>
        )}
      </div>
    );
  }

  if (result.paymentStatus === "paid") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-sage">
          <span className="text-2xl">&#10003;</span>
        </div>
        <div>
          <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Payment confirmed</h1>
          <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
            Thank you! Your payment of {result.currency} {result.amount} was successful and your order is confirmed.
          </p>
        </div>
        <ReferenceBox orderId={result.orderId} txnid={txnid} />
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {orderLink ? (
            <Link href={orderLink} className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
              View Order Status
            </Link>
          ) : (
            <p className="text-xs font-medium text-deep-brown/70 max-w-sm">
              Use the order link from your order confirmation screen (the one you were asked to save) to check your
              order&apos;s latest status.
            </p>
          )}
          <Link href="/shop" className="text-xs font-bold text-primary-orange hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (result.paymentStatus === "failed" || result.paymentStatus === "cancelled") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">
          {result.paymentStatus === "cancelled" ? "Payment cancelled" : "Payment failed"}
        </h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          Your order is still saved — you can try paying again whenever you&apos;re ready.
        </p>
        <ReferenceBox orderId={result.orderId} txnid={txnid} />
        {retryInput && (
          <div className="max-w-xs mx-auto">
            <ProceedToPaymentButton input={retryInput} />
          </div>
        )}
        {orderLink && (
          <Link href={orderLink} className="text-xs font-bold text-primary-orange hover:underline">
            View Order Status
          </Link>
        )}
      </div>
    );
  }

  // paymentStatus is "pending" — genuinely still processing, not a failure.
  return (
    <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-peach-hero/50">
        <SpinnerIcon />
      </div>
      <div>
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Payment still processing</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          PayU hasn&apos;t confirmed the final result yet. This can take a little while for some payment methods —
          please check again shortly.
        </p>
      </div>
      <ReferenceBox orderId={result.orderId} txnid={txnid} />
      <button
        type="button"
        onClick={recheck}
        className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
      >
        Check Again
      </button>
    </div>
  );
}
