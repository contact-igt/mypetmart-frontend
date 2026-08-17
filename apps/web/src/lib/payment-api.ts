import { fetchWithAuth } from "./auth/auth-api";
import type { InitiatePaymentInput, PaymentInitiationResultJSON, PaymentStatusResultJSON } from "@/types/payment";

export const PaymentApi = {
  /**
   * Initiates a PayU Hosted Checkout Payment Attempt for an existing pending
   * Order — customer (orderId, session-authenticated) or guest
   * (guestAccessToken, the same one-time recovery token issued at Order
   * creation / shown on the guest Order recovery page). Returns only the
   * safe browser-handoff fields; the merchant salt never leaves the backend.
   */
  async initiate(input: InitiatePaymentInput): Promise<PaymentInitiationResultJSON> {
    return fetchWithAuth<PaymentInitiationResultJSON>("/storefront/payments/initiate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Browser-return reconciliation: asks the backend for the current,
   * server-verified payment/order state (triggering a Verify Payment API
   * check if the local state is still pending). This is the only source of
   * truth the payment result page trusts — PayU's own redirect never marks
   * anything paid.
   */
  async getStatus(input: InitiatePaymentInput): Promise<PaymentStatusResultJSON> {
    return fetchWithAuth<PaymentStatusResultJSON>("/storefront/payments/status", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
