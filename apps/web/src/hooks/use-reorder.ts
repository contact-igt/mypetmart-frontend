"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderApi } from "@/lib/order-api";
import { CartApi } from "@/lib/cart-api";
import { useCart } from "@/context/cart-context";

export type ReorderState = "loading" | "done" | "error";

/**
 * Re-adds a past order's still-available items to the cart and navigates to
 * /cart. Unavailable items (deleted/inactive/out of stock) are skipped
 * individually rather than failing the whole reorder — only reports "error"
 * when nothing at all could be added. Shared by the order-listing card and
 * the order-detail page so both stay on one implementation.
 */
export function useReorder() {
  const router = useRouter();
  const { refresh: refreshCart } = useCart();
  const [states, setStates] = useState<Record<number, ReorderState>>({});

  async function reorder(orderId: number): Promise<void> {
    setStates((prev) => ({ ...prev, [orderId]: "loading" }));
    try {
      const detail = await OrderApi.getOrder(orderId);
      let added = 0;
      for (const item of detail.items) {
        if (!item.productId) continue;
        try {
          await CartApi.addItem({
            productId: item.productId,
            ...(item.variantId ? { variantId: item.variantId } : {}),
            quantity: item.quantity,
          });
          added += 1;
        } catch {
          // Item no longer sellable — skip and keep adding the rest.
        }
      }
      if (added > 0) {
        setStates((prev) => ({ ...prev, [orderId]: "done" }));
        await refreshCart();
        router.push("/cart");
      } else {
        setStates((prev) => ({ ...prev, [orderId]: "error" }));
      }
    } catch {
      setStates((prev) => ({ ...prev, [orderId]: "error" }));
    }
  }

  return { reorder, states };
}
