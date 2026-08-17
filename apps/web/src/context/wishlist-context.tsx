"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCustomerAuth } from "./customer-auth-context";
import { WishlistApi } from "../lib/wishlist-api";
import type { WishlistItem } from "../types/wishlist";

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  isWishlisted: (productId: number) => boolean;
  isPending: (productId: number) => boolean;
  add: (productId: number) => Promise<void>;
  remove: (productId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { status } = useCustomerAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  // Reset Wishlist state synchronously during render when auth status changes —
  // React's documented "adjusting state when a prop changes" pattern. This is
  // deliberately done here rather than as a synchronous setState at the top of
  // an effect, which the project's lint rules flag as cascading-render-prone.
  const [statusAtLastReset, setStatusAtLastReset] = useState(status);
  if (status !== statusAtLastReset) {
    setStatusAtLastReset(status);
    setItems([]);
    setError(null);
    setLoaded(false);
  }

  // Wishlist is authenticated-only: fetch once per sign-in (tracked by `loaded`),
  // never for guests. All state updates happen inside the promise callbacks, not
  // synchronously in the effect body.
  useEffect(() => {
    if (status !== "authenticated" || loaded) {
      return;
    }
    let active = true;
    WishlistApi.list()
      .then((wishlist) => {
        if (!active) return;
        setItems(wishlist.items);
        setError(null);
      })
      .catch(() => {
        if (active) setError("Unable to load your Wishlist.");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [status, loaded]);

  const loading = status === "authenticated" && !loaded;

  const refresh = async (): Promise<void> => {
    if (status !== "authenticated") return;
    setError(null);
    try {
      const wishlist = await WishlistApi.list();
      setItems(wishlist.items);
    } catch {
      setError("Unable to load your Wishlist.");
    }
  };

  const isWishlisted = (productId: number): boolean => items.some((item) => item.product.id === productId);
  const isPending = (productId: number): boolean => pendingIds.has(productId);

  const withPending = async (productId: number, mutate: () => Promise<{ items: WishlistItem[] }>): Promise<void> => {
    setPendingIds((prev) => new Set(prev).add(productId));
    try {
      const wishlist = await mutate();
      setItems(wishlist.items);
      setError(null);
    } catch {
      setError("Something went wrong updating your Wishlist. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const add = async (productId: number): Promise<void> => {
    // Guards against duplicate network mutations from repeated clicks on the same heart.
    if (isPending(productId) || isWishlisted(productId)) return;
    await withPending(productId, () => WishlistApi.add(productId));
  };

  const remove = async (productId: number): Promise<void> => {
    if (isPending(productId) || !isWishlisted(productId)) return;
    await withPending(productId, () => WishlistApi.remove(productId));
  };

  return (
    <WishlistContext.Provider value={{ items, loading, error, isWishlisted, isPending, add, remove, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
