"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCustomerAuth } from "./customer-auth-context";
import { CartApi } from "../lib/cart-api";
import {
  broadcastCartInvalidated,
  subscribeCartInvalidated,
  type CartInvalidationSource,
} from "../lib/cart/cart-sync-channel";
import type { Cart, CartMergeReport } from "../types/storefront";

/**
 * How trustworthy the currently-held `cart` value is:
 *
 * - `loading`    — first authoritative load in progress; no cart known yet.
 * - `ready`      — `cart` matches a successful authoritative server response.
 * - `refreshing` — a background revalidation is in flight; `cart` is the last
 *                  known-good value and may be shown, but a newer one is coming.
 * - `stale`      — a revalidation failed; `cart` is a *previous* good value and
 *                  MUST NOT be treated as authoritative (e.g. for checkout).
 * - `error`      — we have never successfully loaded a cart.
 *
 * Critical rule: a network/transport failure is NEVER converted into an empty
 * cart. "The server returned an empty cart" (`ready`, 0 items) and "we could
 * not reach the server" (`stale`/`error`) are different states.
 */
export type CartSyncState = "loading" | "ready" | "refreshing" | "stale" | "error";

interface CartContextType {
  cart: Cart;
  itemCount: number;
  loading: boolean;
  /** True only while `syncState === "ready"` — safe to drive checkout / order placement. */
  isCartAuthoritative: boolean;
  syncState: CartSyncState;
  error: string | null;
  mergeReport: CartMergeReport | null;
  updatingItemIds: Set<number>;
  removingItemIds: Set<number>;
  isClearing: boolean;
  /** Force an authoritative re-fetch. Resolves `true` when the cart is now authoritative. */
  refresh: () => Promise<boolean>;
  /** Revalidate, but skip if the cart was just refreshed (used by mount/focus/visibility). */
  revalidate: (reason: string) => Promise<boolean>;
  add: (productId: number, quantity: number, variantId?: number) => Promise<Cart>;
  update: (cartItemId: number, quantity: number) => Promise<Cart>;
  remove: (cartItemId: number) => Promise<Cart>;
  clear: () => Promise<Cart>;
  /**
   * Apply a cart the caller already fetched authoritatively (e.g. the checkout
   * page's own `GET /storefront/cart`) so the header/context stay consistent
   * without issuing a second request.
   */
  applyServerCart: (cart: Cart) => void;
  /**
   * The backend explicitly told us there is no active cart (`*_CART_EMPTY`).
   * That response is itself authoritative, so clear the local cache.
   */
  markAuthoritativelyEmpty: () => void;
  setMergeReport: (report: CartMergeReport | null) => void;
  setError: (error: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const EMPTY_CART: Cart = {
  id: null,
  status: "active",
  itemCount: 0,
  subtotal: "0.00",
  items: [],
};

// Focus + visibility + a cross-tab ping can all land within a few hundred ms of
// each other. A non-forced revalidation inside this window is a no-op, so those
// collapse into (at most) one real request.
const CART_FRESH_WINDOW_MS = 1200;

const SYNC_ERROR_MESSAGE =
  "We couldn't refresh your cart. Your cart information may be out of date.";

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, accessToken } = useCustomerAuth();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<CartSyncState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [mergeReport, setMergeReport] = useState<CartMergeReport | null>(null);

  // Keep track of the session token we merged for, to prevent loops
  const lastMergedTokenRef = useRef<string | null>(null);

  // Authoritative-refresh coordination.
  const refreshGenerationRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<boolean> | null>(null);
  const lastSyncedAtRef = useRef<number | null>(null);
  const hasLoadedOnceRef = useRef(false);
  // De-dupes a BroadcastChannel message and its localStorage twin (same payload).
  const lastHandledInvalidationRef = useRef<string | null>(null);

  // Sync state synchronously during render when auth status/token changes to avoid cascading-renders warning
  const [statusAtLastReset, setStatusAtLastReset] = useState(status);
  const [tokenAtLastReset, setTokenAtLastReset] = useState(accessToken);

  if (status !== statusAtLastReset || accessToken !== tokenAtLastReset) {
    // Any identity change invalidates an in-flight authoritative refresh and the
    // freshness stamp — the next load must actually run against the new identity.
    refreshGenerationRef.current += 1;
    inFlightRefreshRef.current = null;
    lastSyncedAtRef.current = null;

    // Logging out (transitioning away from an authenticated session) must never leave the
    // previous customer's Cart contents visible while the guest Cart fetch is still in
    // flight — or indefinitely, if that fetch fails. Clear synchronously, in the same
    // render that observes the transition, before any async guest fetch can even start.
    if (statusAtLastReset === "authenticated" && status !== "authenticated") {
      setCart(EMPTY_CART);
      setMergeReport(null);
    }
    setStatusAtLastReset(status);
    setTokenAtLastReset(accessToken);
    setLoading(true);
    setSyncState("loading");
    setError(null);
  } else if (status === "loading" && !loading) {
    setLoading(true);
  }

  // Line-item specific mutation pending states
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<number>>(new Set());
  const [removingItemIds, setRemovingItemIds] = useState<Set<number>>(new Set());
  const [isClearing, setIsClearing] = useState(false);

  const applyServerCart = useCallback((next: Cart) => {
    // Supersede any in-flight authoritative refresh — this value is newer.
    refreshGenerationRef.current += 1;
    inFlightRefreshRef.current = null;
    lastSyncedAtRef.current = Date.now();
    hasLoadedOnceRef.current = true;
    setCart(next);
    setError(null);
    setSyncState("ready");
    setLoading(false);
  }, []);

  const markAuthoritativelyEmpty = useCallback(() => {
    applyServerCart(EMPTY_CART);
  }, [applyServerCart]);

  // The one authoritative cart re-fetch. Single-flight + freshness-gated.
  const runAuthoritativeRefresh = useCallback(
    async (opts: { force: boolean }): Promise<boolean> => {
      if (inFlightRefreshRef.current) return inFlightRefreshRef.current;

      if (
        !opts.force &&
        lastSyncedAtRef.current !== null &&
        Date.now() - lastSyncedAtRef.current < CART_FRESH_WINDOW_MS
      ) {
        return true;
      }

      const generation = ++refreshGenerationRef.current;
      setSyncState(hasLoadedOnceRef.current ? "refreshing" : "loading");

      const doRefresh = async (): Promise<boolean> => {
        try {
          const fresh = await CartApi.getCart();
          if (generation !== refreshGenerationRef.current) return false;
          lastSyncedAtRef.current = Date.now();
          hasLoadedOnceRef.current = true;
          setCart(fresh);
          setError(null);
          setSyncState("ready");
          setLoading(false);
          return true;
        } catch {
          if (generation !== refreshGenerationRef.current) return false;
          // Do NOT touch `cart` — a failed request is not an empty cart.
          setSyncState(hasLoadedOnceRef.current ? "stale" : "error");
          setError(SYNC_ERROR_MESSAGE);
          setLoading(false);
          return false;
        } finally {
          // Only clear the slot if a newer refresh hasn't already claimed it.
          if (generation === refreshGenerationRef.current) {
            inFlightRefreshRef.current = null;
          }
        }
      };

      const promise = doRefresh();
      inFlightRefreshRef.current = promise;
      return promise;
    },
    []
  );

  const refresh = useCallback(
    () => runAuthoritativeRefresh({ force: true }),
    [runAuthoritativeRefresh]
  );

  const revalidate = useCallback(
    (_reason: string) => runAuthoritativeRefresh({ force: false }),
    [runAuthoritativeRefresh]
  );

  // Manage Cart loading & guest/customer merge transitions
  useEffect(() => {
    let active = true;

    // Reset session tracking when logged out
    if (status === "unauthenticated") {
      lastMergedTokenRef.current = null;
      void runAuthoritativeRefresh({ force: true }).finally(() => {
        if (active) setLoading(false);
      });
    } else if (status === "authenticated" && accessToken) {
      if (lastMergedTokenRef.current !== accessToken) {
        lastMergedTokenRef.current = accessToken;
        CartApi.merge()
          .then((res) => {
            if (!active) return;
            applyServerCart(res.cart);
            if (
              res.mergeReport.adjustedItems.length > 0 ||
              res.mergeReport.skippedItems.length > 0
            ) {
              setMergeReport(res.mergeReport);
            }
            // Tell other tabs the (now authenticated) cart changed.
            broadcastCartInvalidated("merge");
          })
          .catch(() => {
            if (!active) return;
            // Merge failed — fall back to an authoritative customer getCart.
            // If THAT also fails, runAuthoritativeRefresh marks the cart
            // stale/error and blocks checkout; it never fabricates an empty
            // cart, and the pre-login guest items are no longer authoritative.
            void runAuthoritativeRefresh({ force: true });
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      }
    }

    return () => {
      active = false;
    };
  }, [status, accessToken, applyServerCart, runAuthoritativeRefresh]);

  // Cross-surface revalidation: window focus, tab becoming visible, bfcache
  // restore, and cross-tab invalidation signals. All routed through the single
  // freshness-gated / single-flight refresh so they never storm the backend.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onFocus = () => {
      void runAuthoritativeRefresh({ force: false });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runAuthoritativeRefresh({ force: false });
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      // bfcache restore — the page was frozen and may show a long-stale cart.
      if (event.persisted) void runAuthoritativeRefresh({ force: false });
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    const unsubscribe = subscribeCartInvalidated((message) => {
      const key = `${message.tabId}:${message.timestamp}`;
      if (lastHandledInvalidationRef.current === key) return;
      lastHandledInvalidationRef.current = key;
      // A received invalidation must only re-fetch — never re-broadcast.
      void runAuthoritativeRefresh({ force: true });
    });

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      unsubscribe();
    };
  }, [runAuthoritativeRefresh]);

  // Keep `loading` from getting stuck if syncState settled through a path that
  // did not explicitly clear it.
  useEffect(() => {
    if (syncState !== "loading" && loading) setLoading(false);
  }, [syncState, loading]);

  // Mutations. On server success the returned cart IS authoritative, so it is
  // applied directly (no extra GET); other tabs are then told to revalidate.
  const afterMutationSuccess = useCallback(
    (updatedCart: Cart, source: CartInvalidationSource) => {
      applyServerCart(updatedCart);
      broadcastCartInvalidated(source);
    },
    [applyServerCart]
  );

  const add = async (productId: number, quantity: number, variantId?: number): Promise<Cart> => {
    setError(null);
    try {
      const updatedCart = await CartApi.addItem({ productId, quantity, variantId });
      afterMutationSuccess(updatedCart, "cart-mutation");
      return updatedCart;
    } catch (err) {
      setError("Failed to add item to cart.");
      throw err;
    }
  };

  const update = async (cartItemId: number, quantity: number): Promise<Cart> => {
    setError(null);
    setUpdatingItemIds((prev) => {
      const next = new Set(prev);
      next.add(cartItemId);
      return next;
    });
    try {
      const updatedCart = await CartApi.updateItem(cartItemId, quantity);
      afterMutationSuccess(updatedCart, "cart-mutation");
      return updatedCart;
    } catch (err) {
      throw err;
    } finally {
      setUpdatingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const remove = async (cartItemId: number): Promise<Cart> => {
    setError(null);
    setRemovingItemIds((prev) => {
      const next = new Set(prev);
      next.add(cartItemId);
      return next;
    });
    try {
      const updatedCart = await CartApi.removeItem(cartItemId);
      afterMutationSuccess(updatedCart, "cart-mutation");
      return updatedCart;
    } catch (err) {
      setError("Failed to remove item from cart.");
      throw err;
    } finally {
      setRemovingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const clear = async (): Promise<Cart> => {
    setError(null);
    setIsClearing(true);
    try {
      const updatedCart = await CartApi.clearCart();
      afterMutationSuccess(updatedCart, "cart-mutation");
      return updatedCart;
    } catch (err) {
      setError("Failed to clear cart.");
      throw err;
    } finally {
      setIsClearing(false);
    }
  };

  const itemCount = cart.itemCount;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        isCartAuthoritative: syncState === "ready",
        syncState,
        error,
        mergeReport,
        updatingItemIds,
        removingItemIds,
        isClearing,
        refresh,
        revalidate,
        add,
        update,
        remove,
        clear,
        applyServerCart,
        markAuthoritativelyEmpty,
        setMergeReport,
        setError,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

/**
 * Lets leaf flows (such as checkout recovery) refresh the storefront cart
 * when they are rendered outside the app provider in an isolated test or
 * embedded surface. Normal application renders should use the provider.
 */
export function useOptionalCart() {
  return useContext(CartContext);
}
