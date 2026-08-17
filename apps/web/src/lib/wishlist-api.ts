import { fetchWithAuth } from "./auth/auth-api";
import type { Wishlist } from "@/types/wishlist";

export const WishlistApi = {
  async list(): Promise<Wishlist> {
    return fetchWithAuth<Wishlist>("/storefront/wishlist", { method: "GET" });
  },

  async add(productId: number): Promise<Wishlist> {
    return fetchWithAuth<Wishlist>("/storefront/wishlist/items", {
      method: "POST",
      body: JSON.stringify({ productId })
    });
  },

  async remove(productId: number): Promise<Wishlist> {
    return fetchWithAuth<Wishlist>(`/storefront/wishlist/items/${productId}`, {
      method: "DELETE"
    });
  }
};
