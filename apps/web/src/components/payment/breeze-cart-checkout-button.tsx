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
const CLOSED_KEY = "mpm_breeze_drawer_closed_session";
// Machine-readable refusal codes from POST /storefront/payments/breeze/checkout-session.
const BLOCKING_CODES = ["BREEZE_ATTEMPT_IN_PROGRESS", "BREEZE_PAYMENT_VERIFYING", "BREEZE_RECONCILIATION_REQUIRED"];
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;
const BREEZE_CLOSE_SIGNALS = new Set([
  "backpressed", "closeapp", "cancelled", "cancel", "cancelpurchase", "cancel_purchase", "closed", "user_cancelled", "user_dropped", "userdropped", "aborted", "dismiss", "dismissed", "terminate", "close",
]);

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
      window.localStorage.removeItem(CLOSED_KEY);
    } else {
      window.localStorage.removeItem(PENDING_KEY);
      window.localStorage.removeItem(CLOSED_KEY);
    }
  } catch {
    // storage unavailable: the server remains the source of truth
  }
}

function markDrawerClosed(): void {
  try {
    const pending = readPending();
    if (pending) window.localStorage.setItem(CLOSED_KEY, pending);
  } catch {
    // storage unavailable: the server remains the source of truth
  }
}

function wasDrawerClosed(sessionId: string): boolean {
  try {
    return window.localStorage.getItem(CLOSED_KEY) === sessionId;
  } catch {
    return false;
  }
}

function isBreezeClosePayload(payload: Record<string, unknown>): boolean {
  return ["eventName", "status", "action", "event"].some((key) => {
    const value = payload[key];
    return typeof value === "string" && BREEZE_CLOSE_SIGNALS.has(value.toLowerCase());
  });
}

function isTrustedBreezeOrigin(origin: string): boolean {
  if (origin === window.location.origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "breeze.in" || host.endsWith(".breeze.in") || host === "breezesdk.store" || host.endsWith(".breezesdk.store");
  } catch {
    return false;
  }
}

function messagePayload(data: unknown): Record<string, unknown> | null {
  try {
    let parsed = data;
    // Breeze sends callbackEvent as a JSON string whose payload is another
    // JSON string containing the documented processResult object.
    for (let depth = 0; depth < 3; depth++) {
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return depth === 0 ? { event: parsed } : null;
        }
      }
      if (!parsed || typeof parsed !== "object") return null;
      const candidate = parsed as { payload?: unknown };
      if (candidate.payload && typeof candidate.payload === "object") {
        return candidate.payload as Record<string, unknown>;
      }
      if (typeof candidate.payload !== "string") return candidate as Record<string, unknown>;
      parsed = candidate.payload;
    }
    return null;
  } catch {
    return null;
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
  resumePending?: boolean;
  hideButton?: boolean;
};

export function BreezeCartCheckoutButton({ disabled, breezeEligible = true, onCheckoutClosed, autoStart = false, autoStartKey = 0, resumePending = true, hideButton = false }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
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
        if (!cancelled) {
          setEnabled(config.enabled === true);
          setConfigLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
          setConfigLoaded(true);
        }
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
                  ? `/order/payment/result?provider=breeze&status=success&orderId=${status.order.id}&sessionId=${sessionId}`
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
    if (wasDrawerClosed(pending)) {
      // The customer explicitly closed the drawer. Preserve the session for an
      // explicit retry, but never let a reload or stale atomsSt reopen it.
      cleanUrlAtomsState();
      terminateBreeze();
      void pollServer(pending);
      return () => {
        pollToken.current += 1;
      };
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        // Never restore the SDK solely because a browser remembers atomsSt.
        // The owner-authorized server state decides whether this session can
        // still be presented as a checkout.
        const status = await PaymentApi.breezeCheckoutSessionStatus(pending);
        const described = describe(status);
        if (described || status.processingStatus !== "awaiting_webhook" || !status.awaitingWebhook) {
          if (described) {
            setMessage(described.text);
            if (described.final) {
              writePending(null);
              cleanUrlAtomsState();
              terminateBreeze();
              broadcastCartInvalidated("payment-paid");
              onCheckoutClosed?.();
              if (status.order && (status.order.paymentStatus === "paid" || status.processingStatus === "finalized")) {
                router.push(status.order.id ? `/order/payment/result?provider=breeze&status=success&orderId=${status.order.id}&sessionId=${pending}` : "/account/orders");
              }
            }
          } else {
            void pollServer(pending, "Checking order status…");
          }
          return;
        }
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
  }, [enabled, onCheckoutClosed, pollServer, router]);

  const close = useCallback(() => {
    markDrawerClosed();
    cleanUrlAtomsState();
    terminating.current = true;
    terminateBreeze();
    // The SDK can write atomsSt as it tears down; remove that late state too.
    window.setTimeout(cleanUrlAtomsState, 0);
    launching.current = false;
    setStarting(false);
    onCheckoutClosed?.();
  }, [onCheckoutClosed]);

  useEffect(() => () => terminateBreeze(), []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedBreezeOrigin(event.origin)) return;
      const payload = messagePayload(event.data);
      if (!payload || !isBreezeClosePayload(payload)) return;
      close();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [close]);

  const handleEvent = useCallback(
    (event: BreezeCallbackEvent) => {
      const payload = event.payload;
      if (!payload) return;
      // Temporary provider-integration diagnostic. Do not log the raw payload:
      // it can contain customer and checkout data.
      console.info("[Breeze] checkout callback", {
        eventName: payload.eventName,
        status: payload.status,
        action: payload.action,
        event: payload.event,
        error: payload.error,
        errorCode: payload.errorCode,
      });
      const eventName = typeof payload.eventName === "string" ? payload.eventName.toLowerCase() : "";
      const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
      const action = typeof payload.action === "string" ? payload.action.toLowerCase() : "";
      const providerEvent = typeof payload.event === "string" ? payload.event.toLowerCase() : "";

      // Breeze sends close notifications through different callback event names
      // across Hyper bundles. A customer close is not a payment result, so stop
      // polling and allow another server-authorized checkout attempt.
      if (eventName === "terminate" && terminating.current) return;
      const isCloseOrCancel = isBreezeClosePayload({ eventName, status, action, event: providerEvent });

      if (isCloseOrCancel) {
        close();
        return;
      }
      if (eventName !== "processresult") return;
      if (payload.error === true) {
        const code = typeof payload.errorCode === "string" ? payload.errorCode : "";
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
    // A click before the capability probe completes must never fall through to
    // legacy checkout. Wait until the server tells us which checkout is valid.
    if (!configLoaded) return;
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
      const pending = resumePending ? readPending() : null;
      if (!resumePending) {
        writePending(null);
        cleanUrlAtomsState();
        terminateBreeze();
      }
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
  }, [autoStart, autoStartKey, configLoaded, disabled, enabled, start]);

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={start}
          disabled={disabled || starting || !configLoaded}
          className="motion-press h-11 inline-flex items-center justify-center rounded-xl bg-primary-orange text-white font-semibold text-sm tracking-wide hover:bg-terracotta transition-all cursor-pointer disabled:opacity-40"
        >
          {starting ? "Opening secure checkout..." : !configLoaded ? "Preparing secure checkout..." : "Buy it now"}
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
