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
  // Captured once at booking from the courier candidate iThink's Rate API
  // returned (not refreshed from tracking) — null on any shipment iThink
  // didn't supply an estimate for, or created before this field existed.
  deliveryTat: number | null;
  estimatedDelivery: { min: string; max: string } | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  rtoAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  trackingEvents: ShipmentTrackingEventJSON[];
}
