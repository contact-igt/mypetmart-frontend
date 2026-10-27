"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AppAuthError } from "@/lib/auth/auth-errors";
import { breezeStartCheckout, initBreeze, terminateBreeze } from "@/lib/breeze/blaze-sdk";
import type { BreezeCallbackEvent } from "@/lib/breeze/types";
import { PaymentApi } from "@/lib/payment-api";
import type { BreezeCheckoutSessionStatusJSON } from "@/types/payment";

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
  onCheckoutClosed?: () => void;
};

export function BreezeCartCheckoutButton({ disabled, onCheckoutClosed }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Frontend double-click lock; the backend additionally retires older sessions.
  const launching = useRef(false);
  const pollToken = useRef(0);

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
              onCheckoutClosed?.();
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
    [onCheckoutClosed],
  );

  // Recover after a refresh/close: ask the server about the remembered session.
  useEffect(() => {
    if (!enabled) return;
    const pending = readPending();
    // Deferred (not synchronous in the effect body): this is an external-system
    // sync (server state), and the poll sets state as results arrive.
    const timer = pending ? window.setTimeout(() => void pollServer(pending, "Confirming your payment…"), 0) : undefined;
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      pollToken.current += 1;
    };
  }, [enabled, pollServer]);

  const close = useCallback(() => {
    terminateBreeze();
    launching.current = false;
    setStarting(false);
    onCheckoutClosed?.();
  }, [onCheckoutClosed]);

  useEffect(() => () => terminateBreeze(), []);

  const handleEvent = useCallback(
    (event: BreezeCallbackEvent) => {
      const payload = event.payload;
      if (!payload || payload.eventName !== "processResult") return;
      if (payload.error === true) {
        const code = typeof payload.errorCode === "string" ? payload.errorCode : "";
        writePending(null);
        setMessage(ERROR_MESSAGES[code] ?? "We couldn't start checkout. Please try again.");
        close();
        return;
      }
      if (payload.status === "backPressed" || payload.status === "closeApp") {
        close();
        return;
      }
      if (payload.status === "SUCCESS" || payload.status === "PAYMENT_SUCCESS") {
        // UI hint only: never treated as proof of payment. Ask the server.
        setMessage("Payment submitted. We're confirming your order…");
        const pending = readPending();
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
    launching.current = true;
    setMessage(null);
    setStarting(true);
    try {
      const session = await PaymentApi.breezeCheckoutSession();
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

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={disabled || starting}
        className="motion-press h-11 inline-flex items-center justify-center rounded-xl border border-primary-orange text-primary-orange font-semibold text-sm tracking-wide hover:bg-primary-orange/10 transition-all cursor-pointer disabled:opacity-40"
      >
        {starting ? "Opening secure checkout..." : "Express checkout"}
      </button>
      {message ? (
        <p role="status" className="text-xs text-text-muted">
          {message}
        </p>
      ) : null}
    </>
  );
}
