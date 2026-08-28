"use client";

import type { ReturnShipmentJSON } from "@/types/return";

// Deliberately its own small component, not a reuse of shipment-tracking.tsx
// — a reverse pickup is a different business entity with a different (and
// smaller) status vocabulary than a forward ShipmentJSON, so forcing it
// through that component's prop shape would mean fabricating fields it
// doesn't have. Visual language (card, accent border, timeline dots) is
// kept identical on purpose for a consistent look across both trackers.
const RETURN_SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Preparing pickup",
  approved: "Pickup booked",
  pickup_scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered to warehouse",
  failed: "Pickup needs attention",
  cancelled: "Pickup cancelled",
};

function dateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ReturnShipmentTracking({ returnShipment }: { returnShipment: ReturnShipmentJSON | null }) {
  if (!returnShipment) return null;

  const isFailed = returnShipment.status === "failed";

  return (
    <section className="rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="return-shipment-heading">
      <h3 id="return-shipment-heading" className="font-baloo text-lg font-bold text-deep-brown">Return Pickup</h3>
      <div className="mt-3 space-y-4">
        <div className={`rounded-xl border p-4 ${isFailed ? "border-amber-300 bg-amber-50" : "border-primary-orange/25 bg-peach-hero/20"}`}>
          <p className="font-baloo text-xl font-extrabold leading-tight text-deep-brown sm:text-2xl">
            {RETURN_SHIPMENT_STATUS_LABELS[returnShipment.status] ?? returnShipment.status.replace(/_/g, " ")}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-deep-brown/10 pt-3 text-xs text-text-primary/70">
            <span>{returnShipment.carrier ?? "Courier pending"}{returnShipment.serviceType ? ` · ${returnShipment.serviceType}` : ""}</span>
            <span className="text-right">
              <span className="block font-mono font-semibold text-deep-brown">{returnShipment.awbNumber ?? "AWB pending"}</span>
              <span className="block">{returnShipment.shipmentNumber}</span>
            </span>
          </div>
        </div>

        {returnShipment.trackingEvents.length === 0 ? (
          <p className="text-sm text-text-primary/60">Tracking updates will appear once the courier scans the pickup.</p>
        ) : (
          <ol className="space-y-3 border-l-2 border-primary-orange/25 pl-4">
            {returnShipment.trackingEvents.map((event) => (
              <li key={event.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-orange" aria-hidden="true" />
                <p className="font-semibold text-deep-brown">{RETURN_SHIPMENT_STATUS_LABELS[event.status] ?? event.providerStatus}</p>
                {(event.location || event.message) && <p className="text-xs text-text-primary/65">{[event.location, event.message].filter(Boolean).join(" · ")}</p>}
                <time className="text-[11px] text-text-primary/50" dateTime={event.eventAt}>{dateTime(event.eventAt)}</time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
