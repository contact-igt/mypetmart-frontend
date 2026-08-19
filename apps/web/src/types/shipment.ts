export type ShipmentStatus = "pending" | "provider_status_unknown" | "created" | "awb_assigned" | "pickup_pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "delivery_exception" | "ndr" | "rto_initiated" | "rto_in_transit" | "rto_delivered" | "cancelled" | "failed";

export interface ShipmentTrackingEventJSON {
  id: number;
  status: ShipmentStatus;
  providerStatus: string;
  providerStatusCode: string | null;
  location: string | null;
  message: string | null;
  eventAt: string;
}

export interface ShipmentJSON {
  id: number;
  shipmentNumber: string;
  sourceType: "order" | "replacement";
  sourceId: number;
  orderId: number;
  replacementId: number | null;
  provider: string;
  providerOrderId: string | null;
  carrier: string | null;
  awbNumber: string | null;
  serviceType: string | null;
  status: ShipmentStatus;
  providerStatus: string | null;
  providerStatusCode: string | null;
  providerCost: string | null;
  currency: string;
  package: { weightGrams: number; lengthCm: string; widthCm: string; heightCm: string };
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  rtoAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  trackingEvents: ShipmentTrackingEventJSON[];
}
