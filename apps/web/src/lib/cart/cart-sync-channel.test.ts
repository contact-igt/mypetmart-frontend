// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  broadcastCartInvalidated,
  getCartSyncTabId,
  subscribeCartInvalidated,
  type CartInvalidationMessage,
} from "./cart-sync-channel";

const STORAGE_KEY = "mypetmart:cart-invalidated";

function dispatchRemoteStoragePing(message: Partial<CartInvalidationMessage>) {
  const full: CartInvalidationMessage = {
    type: "cart-invalidated",
    source: "cart-mutation",
    timestamp: Date.now(),
    tabId: "some-other-tab",
    ...message,
  };
  window.dispatchEvent(
    new StorageEvent("storage", { key: STORAGE_KEY, newValue: JSON.stringify(full) })
  );
}

describe("cart-sync-channel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("broadcast writes only an invalidation signal — never cart contents", () => {
    broadcastCartInvalidated("cod-confirmed");
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    expect(parsed).toMatchObject({ type: "cart-invalidated", source: "cod-confirmed" });
    expect(Object.keys(parsed).sort()).toEqual(["source", "tabId", "timestamp", "type"]);
    // No cart / items / customer fields leak into the signal.
    expect(JSON.stringify(parsed)).not.toMatch(/item|cart_?id|customer|price|quantity/i);
  });

  it("delivers a remote tab's invalidation to subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartInvalidated(listener);

    dispatchRemoteStoragePing({ source: "payment-paid" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ source: "payment-paid", type: "cart-invalidated" });
    unsubscribe();
  });

  it("ignores an echo of this tab's own broadcast (no ping-pong)", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartInvalidated(listener);

    dispatchRemoteStoragePing({ tabId: getCartSyncTabId() });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("ignores malformed / non-invalidation storage payloads", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartInvalidated(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: "not json" }));
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY, newValue: JSON.stringify({ hello: "world" }) })
    );
    window.dispatchEvent(
      new StorageEvent("storage", { key: "unrelated-key", newValue: JSON.stringify({ type: "cart-invalidated", timestamp: 1, tabId: "x" }) })
    );

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartInvalidated(listener);
    unsubscribe();

    dispatchRemoteStoragePing({});

    expect(listener).not.toHaveBeenCalled();
  });
});
