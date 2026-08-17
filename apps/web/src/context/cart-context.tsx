"use client";

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { useCustomerAuth } from "./customer-auth-context";
import { CartApi } from "../lib/cart-api";
import type { Cart, CartMergeReport } from "../types/storefront";

interface CartContextType {
  cart: Cart;
  itemCount: number;
  loading: boolean;
  error: string | null;
  mergeReport: CartMergeReport | null;
  updatingItemIds: Set<number>;
  removingItemIds: Set<number>;
  isClearing: boolean;
  refresh: () => Promise<void>;
  add: (productId: number, quantity: number, variantId?: number) => Promise<Cart>;
  update: (cartItemId: number, quantity: number) => Promise<Cart>;
  remove: (cartItemId: number) => Promise<Cart>;
  clear: () => Promise<Cart>;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, accessToken } = useCustomerAuth();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mergeReport, setMergeReport] = useState<CartMergeReport | null>(null);

  // Keep track of the session token we merged for, to prevent loops
  const lastMergedTokenRef = useRef<string | null>(null);

  // Sync state synchronously during render when auth status/token changes to avoid cascading-renders warning
  const [statusAtLastReset, setStatusAtLastReset] = useState(status);
  const [tokenAtLastReset, setTokenAtLastReset] = useState(accessToken);

  if (status !== statusAtLastReset || accessToken !== tokenAtLastReset) {
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
    setError(null);
  } else if (status === "loading" && !loading) {
    setLoading(true);
  }

  // Line-item specific mutation pending states
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<number>>(new Set());
  const [removingItemIds, setRemovingItemIds] = useState<Set<number>>(new Set());
  const [isClearing, setIsClearing] = useState(false);

  // Helper to fetch/refresh the cart
  const refresh = async (): Promise<void> => {
    try {
      const currentCart = await CartApi.getCart();
      setCart(currentCart);
      setError(null);
    } catch {
      setError("Unable to load your cart.");
    }
  };

  // Manage Cart loading & guest/customer merge transitions
  useEffect(() => {
    let active = true;

    // Reset session tracking when logged out
    if (status === "unauthenticated") {
      lastMergedTokenRef.current = null;
      CartApi.getCart()
        .then((guestCart) => {
          if (!active) return;
          setCart(guestCart);
          setError(null);
        })
        .catch(() => {
          if (active) setError("Unable to load guest cart.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else if (status === "authenticated" && accessToken) {
      if (lastMergedTokenRef.current !== accessToken) {
        lastMergedTokenRef.current = accessToken;
        CartApi.merge()
          .then((res) => {
            if (!active) return;
            setCart(res.cart);
            setError(null);
            if (
              res.mergeReport.adjustedItems.length > 0 ||
              res.mergeReport.skippedItems.length > 0
            ) {
              setMergeReport(res.mergeReport);
            }
          })
          .catch(() => {
            // Revert to normal getCart if merge endpoint fails
            if (!active) return;
            CartApi.getCart()
              .then((c) => {
                if (active) {
                  setCart(c);
                  setError(null);
                }
              })
              .catch(() => {
                if (active) setError("Unable to load customer cart.");
              });
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      }
    }

    return () => {
      active = false;
    };
  }, [status, accessToken]);

  // Mutations
  const add = async (productId: number, quantity: number, variantId?: number): Promise<Cart> => {
    setError(null);
    try {
      const updatedCart = await CartApi.addItem({ productId, quantity, variantId });
      setCart(updatedCart);
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
      setCart(updatedCart);
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
      setCart(updatedCart);
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
      setCart(updatedCart);
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
        error,
        mergeReport,
        updatingItemIds,
        removingItemIds,
        isClearing,
        refresh,
        add,
        update,
        remove,
        clear,
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
