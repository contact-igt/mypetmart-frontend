import { fetchWithAuth } from "./auth/auth-api";
import type { CheckoutPreviewPayload, CheckoutPreviewResult } from "@/types/checkout";

export const CheckoutApi = {
  /**
   * Previews checkout readiness, normalized shipping address, item availability, and order totals.
   */
  async preview(payload: CheckoutPreviewPayload): Promise<CheckoutPreviewResult> {
    return fetchWithAuth<CheckoutPreviewResult>("/storefront/checkout/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
