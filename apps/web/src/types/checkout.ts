import type { CartItem } from "./storefront";
import type { Address, CreateAddressInput } from "./address";

export interface CheckoutReadiness {
  cartReady: boolean;
  addressReady: boolean;
  orderReady: boolean;
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
}
