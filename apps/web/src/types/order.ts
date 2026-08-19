import type { CreateAddressInput } from "./address";
import type { ShipmentJSON } from "./shipment";

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

export interface CustomerOrderListQuery {
  page?: number;
  pageSize?: number;
}

export interface CustomerOrderListResult {
  items: OrderListItemJSON[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderDetailJSON extends OrderListItemJSON {
  contactEmail: string;
  shippingAddress: OrderShippingAddressJSON;
  items: OrderItemJSON[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  shipment?: ShipmentJSON | null;
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
  | { savedAddressId: number; shippingAddress?: never; contactEmail?: string }
  | { shippingAddress: CreateAddressInput; savedAddressId?: never; contactEmail?: string };

