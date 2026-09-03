"use client";

/**
 * Storefront cart cross-surface invalidation signal.
 *
 * This is deliberately a *signal only* — it never carries cart contents,
 * customer identity, or any other private data. Every receiver reacts by
 * re-fetching the authoritative cart from the backend (`GET /storefront/cart`).
 * The server remains the single source of truth.
 *
 * Transport: `BroadcastChannel` when available, with a `localStorage` "ping"
 * as the always-on fallback (older browsers, and environments where
 * `BroadcastChannel` is unavailable). The `localStorage` write is a no-op for
 * the tab that made it — `storage` events only fire in *other* documents — so
 * it is safe to always write both.
 */

export type CartInvalidationSource =
  | "cart-mutation"
  | "merge"
  | "cod-confirmed"
  | "payment-paid"
  | "order-cart-empty"
  | "unknown";

export interface CartInvalidationMessage {
  type: "cart-invalidated";
  source: CartInvalidationSource;
  timestamp: number;
  /** Identifies the browsing context that produced the message, so a tab can ignore its own echo. */
  tabId: string;
}

const CHANNEL_NAME = "mypetmart-cart";
const STORAGE_KEY = "mypetmart:cart-invalidated";

// One id per browsing context (module instance). Regenerated on full reload,
// which is fine — a reloaded tab re-fetches its cart on mount anyway.
const TAB_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function getCartSyncTabId(): string {
  return TAB_ID;
}

let sharedChannel: BroadcastChannel | null = null;
let channelUnavailable = false;

function getChannel(): BroadcastChannel | null {
  if (sharedChannel || channelUnavailable) return sharedChannel;
  try {
    if (typeof window === "undefined" || typeof BroadcastChannel !== "function") {
      channelUnavailable = true;
      return null;
    }
    sharedChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channelUnavailable = true;
    sharedChannel = null;
  }
  return sharedChannel;
}

function isInvalidationMessage(value: unknown): value is CartInvalidationMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "cart-invalidated" &&
    typeof (value as { timestamp?: unknown }).timestamp === "number" &&
    typeof (value as { tabId?: unknown }).tabId === "string"
  );
}

/**
 * Announce that this tab changed the cart (or observed a server-side change),
 * so every other open tab/window re-fetches the authoritative cart.
 *
 * MUST be called only AFTER the underlying server mutation has succeeded.
 */
export function broadcastCartInvalidated(source: CartInvalidationSource): void {
  if (typeof window === "undefined") return;

  const message: CartInvalidationMessage = {
    type: "cart-invalidated",
    source,
    timestamp: Date.now(),
    tabId: TAB_ID,
  };

  try {
    getChannel()?.postMessage(message);
  } catch {
    /* transport is best-effort */
  }

  try {
    // Same-doc no-op; delivers to other tabs via the `storage` event.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    /* private mode / quota — invalidation is best-effort */
  }
}

/**
 * Subscribe to cart invalidation signals from other tabs/windows.
 *
 * The listener is never called for this tab's own broadcasts. Receiving a
 * signal must only trigger a re-fetch — it must NOT be re-broadcast, or tabs
 * would ping-pong forever.
 *
 * Returns an unsubscribe function; callers MUST invoke it on unmount.
 */
export function subscribeCartInvalidated(
  listener: (message: CartInvalidationMessage) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleChannelMessage = (event: MessageEvent) => {
    if (!isInvalidationMessage(event.data)) return;
    if (event.data.tabId === TAB_ID) return;
    listener(event.data);
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.newValue);
    } catch {
      return;
    }
    if (!isInvalidationMessage(parsed)) return;
    if (parsed.tabId === TAB_ID) return;
    listener(parsed);
  };

  const channel = getChannel();
  channel?.addEventListener("message", handleChannelMessage);
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.removeEventListener("message", handleChannelMessage);
    window.removeEventListener("storage", handleStorage);
  };
}
