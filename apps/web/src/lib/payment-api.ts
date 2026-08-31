import { fetchWithAuth } from "./auth/auth-api";
import type {
  BreezeStartPaymentParamsJSON,
  CodConfirmationResultJSON,
  ConfirmCodOrderInput,
  InitiatePaymentInput,
  PaymentInitiationResultJSON,
  PaymentStatusResultJSON,
} from "@/types/payment";

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
   * Breeze online payment. Prepares a provider:"breeze" Payment Attempt for
   * an existing pending Order (customer or guest, same identity rules as
   * initiate()) and returns the server-authoritative values the Breeze Web
   * SDK needs for its `sendOTP -> verifyOTP -> startPayment` flow. The amount
   * is always Payment.amount (snapshotted from the Order) — never anything
   * the browser sends.
   */
  async breezeInitiate(input: InitiatePaymentInput): Promise<BreezeStartPaymentParamsJSON> {
    return fetchWithAuth<BreezeStartPaymentParamsJSON>("/storefront/payments/breeze/initiate", {
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

  /**
   * Confirms an existing pending Order for Cash on Delivery — creates a
   * "cod"/"pending" Payment record and moves the Order straight to
   * "confirmed". Never redirects anywhere; the customer stays on the
   * checkout success screen.
   */
  async confirmCod(input: ConfirmCodOrderInput): Promise<CodConfirmationResultJSON> {
    return fetchWithAuth<CodConfirmationResultJSON>("/storefront/payments/cod", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
