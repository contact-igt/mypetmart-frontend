export type ReturnStatus = "requested" | "approved" | "rejected" | "resolved" | "cancelled";
export type ReturnShipmentStatus = "pending" | "approved" | "pickup_scheduled" | "picked_up" | "in_transit" | "delivered" | "failed" | "cancelled";
export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";
export type ReturnResolution = "refund" | "replacement";
export type ReplacementStatus = "stock_unavailable" | "processing" | "completed";

export interface ReplacementJSON {
  id: number;
  replacementNumber: string;
  status: ReplacementStatus;
  productId: number;
  productVariantId: number | null;
  quantity: number;
  stockConsumedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  shipment?: ShipmentJSON | null;
}

export interface ReturnRefundSummaryJSON {
  id: number;
  refundNumber: string;
  status: RefundStatus;
  amount: string;
  currency: string;
  initiatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  failureMessage: string | null;
}

export interface ReturnRequestJSON {
  id: number;
  returnNumber: string;
  orderId: number;
  orderNumber: string;
  orderItemId: number;
  productName: string;
  variantName: string | null;
  purchasedQuantity: number;
  quantity: number;
  resolution: ReturnResolution;
  status: ReturnStatus;
  reason: string;
  resolutionNote: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancellationSource?: "customer" | "admin" | null;
  refunds: ReturnRefundSummaryJSON[];
  replacement: ReplacementJSON | null;
  // null when no reverse pickup has been created yet for this return —
  // never fabricated.
  returnShipment: ReturnShipmentJSON | null;
}

export interface ReturnShipmentTrackingEventJSON {
  id: number;
  status: ReturnShipmentStatus;
  providerStatus: string;
  providerStatusCode: string | null;
  location: string | null;
  message: string | null;
  eventAt: string;
}

// Mirrors backend/src/models/ReturnShipmentModels/return-shipment.types.ts's
// ReturnShipmentJSON — a reverse (customer -> warehouse) pickup, distinct
// from the forward ShipmentJSON already used elsewhere on this order.
export interface ReturnShipmentJSON {
  id: number;
  returnRequestId: number;
  shipmentNumber: string;
  provider: string;
  carrier: string | null;
  awbNumber: string | null;
  serviceType: string | null;
  status: ReturnShipmentStatus;
  providerStatus: string | null;
  trackingUrl: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  trackingEvents: ReturnShipmentTrackingEventJSON[];
}

export interface ReturnNoteJSON {
  id: number;
  message: string;
  authorName: string;
  createdAt: string;
}

export interface ReturnRequestDetailJSON extends ReturnRequestJSON {
  notes: ReturnNoteJSON[];
  // Detail GET responses include this backend-computed field. It stays
  // optional at the client boundary because the create endpoint intentionally
  // returns the lighter ReturnRequestJSON shape.
  canCancel?: boolean;
  maxRefundableAmount: string;
  currency: string;
}

export interface CreateReturnRequestInput {
  orderId: number;
  orderItemId: number;
  quantity: number;
  reason: string;
  resolution: ReturnResolution;
}

export interface ListReturnsResultJSON {
  items: ReturnRequestJSON[];
  page: number;
  pageSize: number;
  total: number;
}
import type { ShipmentJSON } from "./shipment";
