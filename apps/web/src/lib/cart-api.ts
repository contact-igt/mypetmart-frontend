import { fetchWithAuth } from "./auth/auth-api";
import type { Cart, AddCartItemInput, CartMergeResult } from "@/types/storefront";

export const CartApi = {
  /**
   * Retrieves the current storefront cart.
   * If authenticated, it returns the customer's cart.
   * If a guest, it returns the guest's cart associated with the httpOnly session cookie.
   */
  async getCart(): Promise<Cart> {
    return fetchWithAuth<Cart>("/storefront/cart", {
      method: "GET",
    });
  },

  /**
   * Adds an item (simple product or specific variant) to the cart.
   */
  async addItem(input: AddCartItemInput): Promise<Cart> {
    return fetchWithAuth<Cart>("/storefront/cart/items", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Updates the quantity of a specific cart item line.
   */
  async updateItem(cartItemId: number, quantity: number): Promise<Cart> {
    return fetchWithAuth<Cart>(`/storefront/cart/items/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  },

  /**
   * Removes a specific cart item line by its cartItemId.
   */
  async removeItem(cartItemId: number): Promise<Cart> {
    return fetchWithAuth<Cart>(`/storefront/cart/items/${cartItemId}`, {
      method: "DELETE",
    });
  },

  /**
   * Clears all items currently in the cart.
   */
  async clearCart(): Promise<Cart> {
    return fetchWithAuth<Cart>("/storefront/cart/items", {
      method: "DELETE",
    });
  },

  /**
   * Merges the guest cart (linked to cookie) into the authenticated customer cart.
   */
  async merge(): Promise<CartMergeResult> {
    return fetchWithAuth<CartMergeResult>("/storefront/cart/merge", {
      method: "POST",
    });
  },
};
