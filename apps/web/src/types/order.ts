import type { CreateAddressInput } from "./address";
import type { ShipmentJSON, ShipmentStatus } from "./shipment";

export interface OrderItemJSON {
  id: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantName: string | null;
  variantSku: string | null;
  productImage: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  discountAllocated?: string;
  orderId?: number;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface OrderShippingAddressJSON {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface OrderListItemJSON {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  subtotal: string;
  shippingFee: string;
  total: string;
  currency: string;
  itemCount: number;
  placedAt: string;
}

export interface OrderProductPreviewJSON {
  name: string;
  image: string | null;
}

export interface CustomerOrderShipmentSummaryJSON {
  status: ShipmentStatus;
  carrier: string | null;
  trackingAvailable: boolean;
}

export interface CustomerOrderListItemJSON extends OrderListItemJSON {
  products: OrderProductPreviewJSON[];
  shipment: CustomerOrderShipmentSummaryJSON | null;
}

export interface CustomerOrderListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface CustomerOrderListResult {
  items: CustomerOrderListItemJSON[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Deliberately its own type, not reused from any admin-facing shape — mirrors
// backend order.types.ts's CustomerOrderPaymentJSON field-for-field.
export interface CustomerOrderPaymentJSON {
  provider: string;
  method: string | null;
  status: string;
  providerOrderId: string | null;
  paidAt: string | null;
  refundedAt: string | null;
}

// null when the Order has no Refund at all.
export interface CustomerOrderRefundSummaryJSON {
  totalRefunded: string;
  status: "processing" | "succeeded" | "failed";
}

export interface OrderCouponJSON {
  code: string;
  eligibleMerchandiseSubtotal: string;
  discountAmount: string;
}

export interface OrderDetailJSON extends OrderListItemJSON {
  contactEmail: string;
  shippingAddress: OrderShippingAddressJSON;
  items: OrderItemJSON[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  shipment?: ShipmentJSON | null;
  payments: CustomerOrderPaymentJSON[];
  refundSummary: CustomerOrderRefundSummaryJSON | null;
  totalBeforeDiscount?: string;
  coupon?: OrderCouponJSON | null;
}

// Order Creation's response: identical to OrderDetailJSON for a customer;
// for a guest it additionally carries the one-time raw recovery token used
// to view the order later via /order/guest/[token] (guestAccessToken is
// never returned by any other endpoint).
export interface CreateOrderResultJSON extends OrderDetailJSON {
  guestAccessToken?: string;
}

// The guest recovery lookup (GET /storefront/orders/guest/:token) omits
// shipping coordinates — see backend order.service.ts's toGuestOrderDetailJSON.
export type GuestOrderShippingAddressJSON = Omit<OrderShippingAddressJSON, "latitude" | "longitude">;

export interface GuestOrderDetailJSON extends Omit<OrderDetailJSON, "shippingAddress"> {
  shippingAddress: GuestOrderShippingAddressJSON;
}

export type CreateOrderInput =
  | { savedAddressId: number; shippingAddress?: never; contactEmail?: string; paymentMethod?: "payu" | "cod" }
  | { shippingAddress: CreateAddressInput; savedAddressId?: never; contactEmail?: string; paymentMethod?: "payu" | "cod" };

