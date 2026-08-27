// Single source of truth for how a ShipmentStatus value is displayed to
// customers. Both order-tracker.tsx (lifecycle stepper) and
// shipment-tracking.tsx (courier event timeline) must read from here so a
// status always reads the same way in both places.
export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Preparing shipment",
  provider_status_unknown: "Provider confirmation pending",
  created: "Shipment created",
  awb_assigned: "AWB assigned",
  pickup_pending: "Pickup pending",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_exception: "Delivery exception",
  ndr: "Delivery attempt unsuccessful",
  rto_initiated: "Return to origin initiated",
  rto_in_transit: "Returning to origin",
  rto_delivered: "Returned to origin",
  cancelled: "Shipment cancelled",
  failed: "Shipment setup needs attention",
};
