import type { ShipmentJSON } from "@/types/shipment";

// Deliberately narrower than OrderDetailJSON — only the fields this tracker
// actually reads — so both the authenticated (OrderDetailJSON) and guest
// (GuestOrderDetailJSON) Order Detail pages can pass their order straight
// through without a shape mismatch on shippingAddress (guest strips lat/lng).
export interface OrderTrackerInput {
  status: string;
  paymentStatus: string;
  placedAt: string;
  cancelledAt: string | null;
  shipment?: ShipmentJSON | null;
}

type StepId = "placed" | "payment" | "processing" | "shipped" | "out_for_delivery" | "delivered";
type StepState = "completed" | "current" | "upcoming";

interface TrackerStep {
  id: StepId;
  label: string;
  state: StepState;
  timestamp: string | null;
  caption?: string;
}

// Matches shipment-tracking.tsx's LABELS map — kept identical so a shipment
// status reads the same way in both places.
const SHIPMENT_STATUS_LABELS: Record<string, string> = {
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
  failed: "Shipment setup needs attention"
};

// order.status values that mean "at least Processing" / "at least Shipped" /
// "Delivered" — real backend enum values only (OrderModels/order.constants.ts
// on the backend), never invented ones.
const PROCESSING_OR_BEYOND = new Set(["processing", "shipped", "delivered", "return_requested"]);
const SHIPPED_OR_BEYOND = new Set(["shipped", "delivered", "return_requested"]);

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function buildSteps(order: OrderTrackerInput): TrackerStep[] {
  const shipment = order.shipment ?? null;
  const paid = order.paymentStatus === "paid" || order.paymentStatus === "refunded" || order.paymentStatus === "partially_refunded";
  const processingOrBeyond = PROCESSING_OR_BEYOND.has(order.status);
  const shippedOrBeyond = SHIPPED_OR_BEYOND.has(order.status) || Boolean(shipment?.shippedAt);
  const delivered = order.status === "delivered" || order.status === "return_requested";

  const outForDeliveryEvent = shipment?.trackingEvents.find((event) => event.status === "out_for_delivery") ?? null;
  const outForDeliveryReached = Boolean(outForDeliveryEvent) || shipment?.status === "out_for_delivery" || shipment?.status === "delivered" || Boolean(shipment?.deliveredAt);

  type Raw = { id: StepId; label: string; reached: boolean; timestamp: string | null; caption?: string };
  const raw: Raw[] = [
    { id: "placed", label: "Order Placed", reached: true, timestamp: order.placedAt },
    { id: "payment", label: "Payment Confirmed", reached: paid, timestamp: null },
    { id: "processing", label: "Processing", reached: processingOrBeyond, timestamp: null },
    { id: "shipped", label: "Shipped", reached: shippedOrBeyond, timestamp: shipment?.shippedAt ?? null }
  ];

  // "Out for Delivery" only appears once a real Shipment exists for this
  // Order — omitted entirely (not shown as a perpetual "upcoming" ghost
  // step) when no courier shipment has ever been created for it, since we
  // have no real signal that one ever will be.
  if (shipment) {
    raw.push({
      id: "out_for_delivery",
      label: "Out for Delivery",
      reached: outForDeliveryReached,
      timestamp: outForDeliveryEvent?.eventAt ?? null,
      caption: !outForDeliveryReached ? SHIPMENT_STATUS_LABELS[shipment.status] : undefined
    });
  }

  raw.push({ id: "delivered", label: "Delivered", reached: delivered, timestamp: shipment?.deliveredAt ?? null });

  // Monotonic closure: the Order status graph allows some transitions to
  // skip a discrete intermediate event (e.g. Processing -> Delivered in one
  // admin action, or a courier reporting Delivered without ever reporting
  // Out for Delivery) — a later milestone being real always implies the
  // earlier ones logically happened. This only ever adds a checkmark, never
  // a timestamp, to a step lacking real event data of its own.
  let sawReached = false;
  for (let i = raw.length - 1; i >= 0; i--) {
    const step = raw[i];
    if (!step) continue;
    if (step.reached) sawReached = true;
    else if (sawReached) step.reached = true;
  }

  const lastReachedIndex = raw.reduce((last, step, index) => (step.reached ? index : last), -1);

  return raw.map((step, index) => ({
    ...step,
    state: step.reached ? "completed" : index === lastReachedIndex + 1 ? "current" : "upcoming"
  }));
}

function StepDot({ state }: { state: StepState }) {
  if (state === "completed") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-orange text-white" aria-hidden="true">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary-orange bg-white" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-primary-orange" />
      </span>
    );
  }
  return <span className="h-7 w-7 shrink-0 rounded-full border-2 border-deep-brown/15 bg-white" aria-hidden="true" />;
}

function stepTextColor(state: StepState): string {
  if (state === "upcoming") return "text-text-primary/40";
  return "text-deep-brown";
}

export function OrderTracker({ order }: { order: OrderTrackerInput }) {
  if (order.status === "cancelled") {
    return (
      <section className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-5 sm:p-6" aria-labelledby="order-tracker-heading">
        <h3 id="order-tracker-heading" className="font-baloo text-lg font-bold text-deep-brown">
          Order Cancelled
        </h3>
        <p className="mt-1 text-sm text-text-primary/70">
          This order was cancelled{order.cancelledAt ? ` on ${formatDate(order.cancelledAt)}` : ""} and is no longer being processed.
        </p>
      </section>
    );
  }

  const steps = buildSteps(order);

  return (
    <section className="rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="order-tracker-heading">
      <h3 id="order-tracker-heading" className="font-baloo text-lg font-bold text-deep-brown">
        Order Progress
      </h3>

      {/* Desktop: horizontal point-to-point tracker */}
      <ol className="mt-5 hidden sm:flex sm:items-start">
        {steps.map((step, index) => (
          <li key={step.id} className="flex flex-1 items-start last:flex-initial">
            <div className="flex flex-col items-center text-center">
              <StepDot state={step.state} />
              <p className={`mt-2 max-w-[7rem] text-xs font-bold ${stepTextColor(step.state)}`}>{step.label}</p>
              {step.timestamp && <p className="mt-0.5 text-[11px] text-text-primary/50">{formatDate(step.timestamp)}</p>}
              {step.caption && !step.timestamp && <p className="mt-0.5 max-w-[7rem] text-[11px] text-text-primary/50">{step.caption}</p>}
            </div>
            {index < steps.length - 1 && (
              <div className={`mt-3.5 h-0.5 flex-1 ${step.state === "completed" ? "bg-primary-orange" : "bg-deep-brown/15"}`} aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      {/* Mobile: vertical point-to-point tracker */}
      <ol className="mt-5 space-y-0 sm:hidden">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepDot state={step.state} />
              {index < steps.length - 1 && <div className={`w-0.5 flex-1 ${step.state === "completed" ? "bg-primary-orange" : "bg-deep-brown/15"}`} aria-hidden="true" />}
            </div>
            <div className={`pb-4 ${index === steps.length - 1 ? "pb-0" : ""}`}>
              <p className={`text-sm font-bold ${stepTextColor(step.state)}`}>{step.label}</p>
              {step.timestamp && <p className="text-xs text-text-primary/50">{formatDate(step.timestamp)}</p>}
              {step.caption && !step.timestamp && <p className="text-xs text-text-primary/50">{step.caption}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
