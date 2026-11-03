"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppAuthError } from "@/lib/auth/auth-errors";
import { breezeStartCheckout, cleanUrlAtomsState, initBreeze, terminateBreeze } from "@/lib/breeze/blaze-sdk";
import { broadcastCartInvalidated } from "@/lib/cart/cart-sync-channel";
import type { BreezeCallbackEvent } from "@/lib/breeze/types";
import { PaymentApi } from "@/lib/payment-api";
import type { BreezeCheckoutSessionJSON, BreezeCheckoutSessionStatusJSON } from "@/types/payment";

// Breeze full 1-Click Checkout launcher for the cart page.
//
// Rendered ONLY when the backend reports the feature enabled and configured
// (GET /storefront/payments/breeze/checkout-config). The cart/signature/keyId
// come from the backend checkout-session endpoint; nothing price-related is
// computed or sent from here. Breeze SDK events are UI hints only — a "success"
// event NEVER marks anything paid. The customer is told an order is confirmed
// only after the backend (which created it from the authenticated Order Create
// webhook) reports it for this session; the browser keeps just a pointer to the
// session id so a refresh can ask the server again.
//
// Breeze owns checkout presentation. Do not wrap or reposition its UI: Breeze
// support confirmed the default side drawer is the supported presentation.

const ERROR_MESSAGES: Record<string, string> = {
  outOfStock: "One or more items are out of stock.",
  emptyCart: "Your cart is empty.",
  exceededMaxQuantity: "A quantity is higher than allowed.",
  productNotPublished: "A product in your cart is no longer available.",
  serviceUnavailable: "Checkout is temporarily unavailable. Please try again shortly.",
};

const PENDING_KEY = "mpm_breeze_pending_session";
// Machine-readable refusal codes from POST /storefront/payments/breeze/checkout-session.
const BLOCKING_CODES = ["BREEZE_ATTEMPT_IN_PROGRESS", "BREEZE_PAYMENT_VERIFYING", "BREEZE_RECONCILIATION_REQUIRED"];
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

function readPending(): string | null {
  try {
    return window.localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function isBrowserReload(): boolean {
  return performance.getEntriesByType("navigation").some(
    (entry) => (entry as PerformanceNavigationTiming).type === "reload",
  );
}


function writePending(sessionId: string | null): void {
  try {
    if (sessionId) {
      window.localStorage.setItem(PENDING_KEY, sessionId);
    } else {
      window.localStorage.removeItem(PENDING_KEY);
    }
  } catch {
    // storage unavailable: the server remains the source of truth
  }
}

function describe(status: BreezeCheckoutSessionStatusJSON): { text: string; final: boolean } | null {
  if (status.order && status.order.paymentStatus === "paid") {
    if (status.order.commerceException) {
      return { text: `We received your payment for order ${status.order.orderNumber}. Our team is reviewing it and will contact you shortly.`, final: true };
    }
    return { text: `Order ${status.order.orderNumber} is confirmed. Thank you!`, final: true };
  }
  if (status.processingStatus === "reconciliation_required") {
    return { text: "We received your payment details and are verifying them. Our team will contact you if anything is needed.", final: true };
  }
  if (status.processingStatus === "failed") {
    return { text: "Your payment did not complete. You have not been charged for an order — please try again.", final: true };
  }
  return null; // still waiting for the server-side confirmation
}

type Props = {
  disabled: boolean;
  breezeEligible?: boolean;
  onCheckoutClosed?: () => void;
  autoStart?: boolean;
  autoStartKey?: number;
  hideButton?: boolean;
};

export function BreezeCartCheckoutButton({ disabled, breezeEligible = true, onCheckoutClosed, autoStart = false, autoStartKey = 0, hideButton = false }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Frontend double-click lock; the backend additionally retires older sessions.
  const launching = useRef(false);
  const pollToken = useRef(0);
  const terminating = useRef(false);
  const lastAutoStartKey = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    PaymentApi.breezeCheckoutConfig()
      .then((config) => {
        if (!cancelled) setEnabled(config.enabled === true);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pollServer = useCallback(
    async (sessionId: string, announce?: string) => {
      const token = ++pollToken.current;
      if (announce) setMessage(announce);
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        if (pollToken.current !== token) return;
        try {
          const status = await PaymentApi.breezeCheckoutSessionStatus(sessionId);
          const described = describe(status);
          if (described) {
            if (pollToken.current !== token) return;
            setMessage(described.text);
            if (described.final) {
              writePending(null);
              cleanUrlAtomsState();
              terminateBreeze();
              broadcastCartInvalidated("payment-paid");
              onCheckoutClosed?.();

              if (status.order && (status.order.paymentStatus === "paid" || status.processingStatus === "finalized")) {
                const targetUrl = status.order.id
                  ? `/order/payment/result?provider=breeze&status=success&orderId=${status.order.id}`
                  : `/account/orders`;
                router.push(targetUrl);
              }
            }
            return;
          }
        } catch (err: unknown) {
          if (err instanceof AppAuthError && err.code === "BREEZE_SESSION_NOT_FOUND") {
            writePending(null);
            return;
          }
          // transient: keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (pollToken.current === token) {
        setMessage("We're still confirming your order. You'll receive an email once it is verified.");
      }
    },
    [onCheckoutClosed, router],
  );

  // Recover after a refresh: if a pending session exists, try to reopen the
  // Breeze drawer with the same signed cart. Falls back to polling (status-only)
  // if the session has already expired or resolved on the server.
  useEffect(() => {
    if (!enabled || !isBrowserReload()) return;
    const pending = readPending();
    if (!pending) {
      cleanUrlAtomsState();
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const session = await PaymentApi.breezeResumeCheckoutSession(pending);
        if (cancelled) return;
        // Session is still open — reopen the drawer seamlessly.
        launching.current = true;
        terminating.current = false;
        setStarting(true);
        setMessage(null);
        initBreeze({ merchantId: session.merchantId, shopUrl: session.shopUrl, environment: session.environment }, handleEvent);
        breezeStartCheckout({ cart: session.cart, signature: session.signature, keyId: session.keyId });
      } catch {
        if (cancelled) return;
        // Session expired or order already resolved: clean URL immediately so Breeze cannot reopen completed order screens.
        cleanUrlAtomsState();
        terminateBreeze();
        void pollServer(pending, "Checking order status…");
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      pollToken.current += 1;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const close = useCallback(() => {
    writePending(null);
    cleanUrlAtomsState();
    terminating.current = true;
    terminateBreeze();
    launching.current = false;
    setStarting(false);
    onCheckoutClosed?.();
  }, [onCheckoutClosed]);

  useEffect(() => () => terminateBreeze(), []);

  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data || typeof data !== "object") return;
        const str = JSON.stringify(data).toLowerCase();
        if (
          str.includes("cancel") ||
          str.includes("closeapp") ||
          str.includes("backpressed") ||
          str.includes("merchantexit") ||
          str.includes("dismiss") ||
          str.includes("user_dropped")
        ) {
          close();
        }
      } catch {
        // Non-JSON message, ignore
      }
    };
    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [close]);


  const handleEvent = useCallback(
    (event: BreezeCallbackEvent) => {
      const payload = event.payload;
      if (!payload) return;
      const eventName = typeof payload.eventName === "string" ? payload.eventName.toLowerCase() : "";
      const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
      const action = typeof payload.action === "string" ? payload.action.toLowerCase() : "";
      const providerEvent = typeof payload.event === "string" ? payload.event.toLowerCase() : "";

      // Breeze sends close notifications through different callback event names
      // across Hyper bundles. A customer close is not a payment result, so stop
      // polling and allow another server-authorized checkout attempt.
      if (eventName === "terminate" && terminating.current) return;
      const isCloseOrCancel =
        status === "backpressed" ||
        status === "closeapp" ||
        status === "cancelled" ||
        status === "cancel" ||
        status === "closed" ||
        status === "user_cancelled" ||
        status === "aborted" ||
        status === "dismiss" ||
        status === "dismissed" ||
        providerEvent === "backpressed" ||
        providerEvent === "closeapp" ||
        providerEvent === "cancelled" ||
        providerEvent === "cancel" ||
        providerEvent === "closed" ||
        action === "close" ||
        action === "cancel" ||
        action === "terminate" ||
        eventName === "terminate" ||
        eventName === "close" ||
        eventName === "cancel" ||
        eventName === "dismiss";

      if (isCloseOrCancel) {
        writePending(null);
        cleanUrlAtomsState();
        setMessage("Checkout closed. No payment was submitted.");
        close();
        return;
      }
      if (eventName !== "processresult") return;
      if (payload.error === true) {
        const code = typeof payload.errorCode === "string" ? payload.errorCode : "";
        writePending(null);
        setMessage(ERROR_MESSAGES[code] ?? "We couldn't start checkout. Please try again.");
        close();
        return;
      }
      if (status === "success" || status === "payment_success") {
        // UI hint only: never treated as proof of payment. Ask the server.
        setMessage("Payment submitted. We're confirming your order…");
        const pending = readPending();
        cleanUrlAtomsState();
        terminateBreeze();
        broadcastCartInvalidated("payment-paid");
        close();
        if (pending) void pollServer(pending);
      }
    },
    [close, pollServer],
  );

  // Server-authoritative launch. The backend refuses a new session while an
  // earlier attempt may still be paid (409 with a machine-readable reason). No
  // client-side timer or pre-check can authorize a launch; a refusal shows the
  // server's own message and the remembered session's current state.
  const start = async () => {
    if (launching.current) return;
    // Standard checkout remains the fallback while Breeze is unavailable or a
    // coupon makes its signed-cart amount unsuitable for Express checkout.
    if (enabled !== true || !breezeEligible) {
      router.push("/checkout");
      return;
    }
    launching.current = true;
    terminating.current = false;
    setMessage(null);
    setStarting(true);
    try {
      const pending = readPending();
      let session: BreezeCheckoutSessionJSON;
      if (pending) {
        try {
          session = await PaymentApi.breezeResumeCheckoutSession(pending);
        } catch (err) {
          if (!(err instanceof AppAuthError) || err.code !== "BREEZE_SESSION_NOT_FOUND") throw err;
          writePending(null);
          session = await PaymentApi.breezeCheckoutSession();
        }
      } else {
        session = await PaymentApi.breezeCheckoutSession();
      }
      writePending(session.sessionId);
      initBreeze({ merchantId: session.merchantId, shopUrl: session.shopUrl, environment: session.environment }, handleEvent);
      breezeStartCheckout({ cart: session.cart, signature: session.signature, keyId: session.keyId });
    } catch (err: unknown) {
      launching.current = false;
      setStarting(false);
      if (err instanceof AppAuthError && BLOCKING_CODES.includes(err.code)) {
        setMessage(err.message);
        const pending = readPending();
        if (pending) void pollServer(pending);
        return;
      }
      setMessage(err instanceof AppAuthError ? err.message : "We couldn't start checkout. Please try again.");
    }
  };

  useEffect(() => {
    if (!autoStart || disabled || !enabled || lastAutoStartKey.current === autoStartKey) return;
    lastAutoStartKey.current = autoStartKey;
    void start();
  }, [autoStart, autoStartKey, disabled, enabled, start]);

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={start}
          disabled={disabled || starting}
          className="motion-press h-11 inline-flex items-center justify-center rounded-xl bg-primary-orange text-white font-semibold text-sm tracking-wide hover:bg-terracotta transition-all cursor-pointer disabled:opacity-40"
        >
          {starting ? "Opening secure checkout..." : "Buy it now"}
        </button>
      )}
      {message ? (
        <p role="status" className="text-xs text-text-muted">
          {message}
        </p>
      ) : null}
    </>
  );
}
