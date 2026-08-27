"use client";

import { useState } from "react";
import type { ShipmentJSON } from "@/types/shipment";
import { SHIPMENT_STATUS_LABELS as LABELS } from "@/constants/shipment-status";

const COMPLETED_STATUSES = new Set(["delivered", "cancelled"]);

function dateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function latestTrackingEvent(shipment: ShipmentJSON) {
  if (shipment.trackingEvents.length === 0) return null;
  return shipment.trackingEvents.reduce((latest, event) => (new Date(event.eventAt) > new Date(latest.eventAt) ? event : latest));
}

export function ShipmentTracking({ shipment, emptyMessage = "Your shipment has not been prepared yet." }: { shipment?: ShipmentJSON | null; emptyMessage?: string }) {
  // Completed shipments (delivered/cancelled) start collapsed — a customer
  // revisiting an old order shouldn't have to scroll past its entire event
  // history by default. Active shipments stay expanded, unchanged from
  // before. Initialized once from the shipment already loaded at mount —
  // shipment.status doesn't change under this component during a session.
  const [expanded, setExpanded] = useState(() => !(shipment && COMPLETED_STATUSES.has(shipment.status)));

  if (!shipment) {
    return (
      <section className="rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="shipment-heading">
        <h3 id="shipment-heading" className="font-baloo text-lg font-bold text-deep-brown">Shipment tracking</h3>
        <p className="mt-2 text-sm text-text-primary/65">{emptyMessage}</p>
      </section>
    );
  }

  const isCompleted = COMPLETED_STATUSES.has(shipment.status);
  const latestEvent = latestTrackingEvent(shipment);
  const latestUpdateText = latestEvent ? [latestEvent.location, latestEvent.message].filter(Boolean).join(" · ") || (LABELS[latestEvent.status] ?? latestEvent.providerStatus) : LABELS[shipment.status] ?? shipment.status.replace(/_/g, " ");

  return (
    <section className="rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="shipment-heading">
      <h3 id="shipment-heading" className="font-baloo text-lg font-bold text-deep-brown">Shipment tracking</h3>
      <div className="mt-3 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-cream-bg p-4">
          <div>
            <p className="font-bold text-deep-brown">{LABELS[shipment.status] ?? shipment.status.replace(/_/g, " ")}</p>
            <p className="mt-1 text-xs text-text-primary/65">{shipment.carrier ?? "Courier pending"}{shipment.serviceType ? ` · ${shipment.serviceType}` : ""}</p>
          </div>
          <div className="text-right text-xs text-text-primary/65">
            <p className="font-mono font-semibold text-deep-brown">{shipment.awbNumber ?? "AWB pending"}</p>
            <p>{shipment.shipmentNumber}</p>
          </div>
        </div>
        {shipment.status === "provider_status_unknown" && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">The carrier response is being reconciled. No duplicate shipment will be created.</p>}

        {isCompleted && !expanded ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-deep-brown/10 p-3">
            <p className="text-xs text-text-primary/70">
              <span className="font-semibold text-deep-brown">Latest update: </span>
              {latestUpdateText}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="shrink-0 text-xs font-bold text-primary-orange hover:underline"
            >
              View Tracking History
            </button>
          </div>
        ) : (
          <>
            {isCompleted && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-xs font-bold text-primary-orange hover:underline"
              >
                Hide Tracking History
              </button>
            )}
            {shipment.trackingEvents.length === 0 ? <p className="text-sm text-text-primary/60">Tracking updates will appear after the courier scans the parcel.</p> : (
              <ol className="space-y-3 border-l-2 border-primary-orange/25 pl-4">
                {shipment.trackingEvents.map((event) => (
                  <li key={event.id} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-orange" aria-hidden="true" />
                    <p className="font-semibold text-deep-brown">{LABELS[event.status] ?? event.providerStatus}</p>
                    {(event.location || event.message) && <p className="text-xs text-text-primary/65">{[event.location, event.message].filter(Boolean).join(" · ")}</p>}
                    <time className="text-[11px] text-text-primary/50" dateTime={event.eventAt}>{dateTime(event.eventAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </section>
  );
}
