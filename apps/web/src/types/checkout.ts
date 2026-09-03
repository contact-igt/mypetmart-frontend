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
  shippingAmount: string | null;
  payableTotal: string | null;
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
  paymentMethod?: CheckoutPaymentMethod | null;
  serviceability?: CheckoutServiceability | null;
}
