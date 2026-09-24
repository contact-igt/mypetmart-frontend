import type { CartItem } from "./storefront";
import type { Address, CreateAddressInput } from "./address";

export interface CheckoutReadiness {
  cartReady: boolean;
  addressReady: boolean;
  shippingReady?: boolean;
  paymentReady?: boolean;
  orderReady: boolean;
  serviceable?: boolean;
}

export type CheckoutPaymentMethod = "payu" | "cod";

export interface CheckoutServiceability {
  paymentMode: "prepaid" | "cod";
  serviceable: boolean;
}

export interface CheckoutTotals {
  merchandiseSubtotal: string;
  discountAmount?: string;
  shippingAmount: string | null;
  payableTotal: string | null;
}

export interface CheckoutAlternativeSaving {
  eligiblePaymentMethod: "payu" | "cod";
  discountAmountPaise: number;
  code: string;
}

export interface CheckoutCoupon {
  code: string;
  eligible: boolean;
  message: string | null;
  // Present when the coupon failed only because of the current payment
  // method. The amount is server-calculated — never client-derived.
  alternativeSaving?: CheckoutAlternativeSaving;
}

export interface CheckoutPreviewPayload {
  savedAddressId?: number;
  shippingAddress?: CreateAddressInput;
  contactEmail?: string;
  billingSameAsShipping?: boolean;
  paymentMethod?: CheckoutPaymentMethod;
}

export interface CheckoutPreviewResult {
  readiness: CheckoutReadiness;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  billingSameAsShipping: boolean;
  cart: {
    items: CartItem[];
  };
  totals: CheckoutTotals;
  coupon?: CheckoutCoupon | null;
  paymentMethod?: CheckoutPaymentMethod | null;
  serviceability?: CheckoutServiceability | null;
}
