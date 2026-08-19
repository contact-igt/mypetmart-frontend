export type ReturnStatus = "requested" | "approved" | "rejected" | "resolved";
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
  refunds: ReturnRefundSummaryJSON[];
  replacement: ReplacementJSON | null;
}

export interface ReturnNoteJSON {
  id: number;
  message: string;
  authorName: string;
  createdAt: string;
}

export interface ReturnRequestDetailJSON extends ReturnRequestJSON {
  notes: ReturnNoteJSON[];
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
