import { fetchWithAuth } from "./auth/auth-api";
import type { DeliveryCheckResult } from "@/types/storefront";

export const DeliveryApi = {
  /**
   * Pre-purchase serviceability + ETA check for a Product Detail pincode.
   * Public (guest + customer) — read-only, never creates an order or shipment.
   * A non-serviceable pincode resolves normally with `serviceable: false`;
   * a provider/technical failure rejects with an AppAuthError
   * (`code: "DELIVERY_CHECK_UNAVAILABLE"`).
   */
  async check(input: {
    pincode: string;
    productId: number;
    variantId?: number;
    quantity?: number;
  }): Promise<DeliveryCheckResult> {
    return fetchWithAuth<DeliveryCheckResult>("/storefront/delivery/check", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
