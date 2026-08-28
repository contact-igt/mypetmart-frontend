"use client";

import { useState } from "react";
import type { ShipmentJSON } from "@/types/shipment";
import { SHIPMENT_STATUS_LABELS as LABELS } from "@/constants/shipment-status";

const COMPLETED_STATUSES = new Set(["delivered", "cancelled"]);
const RETURNING_STATUSES = new Set(["rto_initiated", "rto_in_transit", "rto_delivered"]);
// Statuses where a courier is genuinely moving the parcel toward the
// customer — the only ones where a "no fixed estimate yet" note is useful
// context rather than noise (provider_status_unknown/ndr/delivery_exception
// already surface their own, more specific banners elsewhere).
const ACTIVE_TRANSIT_STATUSES = new Set(["pending", "created", "awb_assigned", "pickup_pending", "picked_up", "in_transit", "out_for_delivery"]);

function dateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// A DATEONLY string ("2026-08-29") formatted without ever going through a
// viewer-timezone conversion — Date.UTC + timeZone:"UTC" keeps the displayed
// day identical to the stored calendar date for every viewer, regardless of
// where they are. Malformed input degrades to the raw string rather than
// silently showing the wrong day.
function formatEstimatedDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [["day", 86_400], ["hour", 3_600], ["minute", 60]];

// A freshness/trust signal only, derived from the shipment's own last real
// courier sync — never a delivery promise.
function timeAgo(value: string): string {
  const diffSeconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    const amount = diffSeconds / secondsInUnit;
    if (Math.abs(amount) >= 1) return RELATIVE_TIME.format(Math.round(amount), unit);
  }
  return "just now";
}

function latestTrackingEvent(shipment: ShipmentJSON) {
  if (shipment.trackingEvents.length === 0) return null;
  return shipment.trackingEvents.reduce((latest, event) => (new Date(event.eventAt) > new Date(latest.eventAt) ? event : latest));
}

// Purely a visual accent for the status headline — carries no delivery
// meaning beyond echoing the same normalized status already shown as text.
function statusAccentClass(shipment: ShipmentJSON): string {
  if (shipment.status === "delivered") return "border-emerald-300 bg-emerald-50";
  if (shipment.status === "cancelled" || RETURNING_STATUSES.has(shipment.status)) return "border-rose-200 bg-rose-50";
  if (shipment.status === "ndr" || shipment.status === "delivery_exception" || shipment.status === "failed") return "border-amber-300 bg-amber-50";
  return "border-primary-orange/25 bg-peach-hero/20";
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
  // Shown only while the estimate is still forward-looking — once delivered
  // or heading back to origin, the real deliveredAt/timeline already tells
  // the actual story better than a pre-booking estimate would.
  const showEstimatedDelivery = shipment.estimatedDelivery !== null && !isCompleted && !RETURNING_STATUSES.has(shipment.status);
  const latestEvent = latestTrackingEvent(shipment);
  const latestUpdateText = latestEvent ? [latestEvent.location, latestEvent.message].filter(Boolean).join(" · ") || (LABELS[latestEvent.status] ?? latestEvent.providerStatus) : LABELS[shipment.status] ?? shipment.status.replace(/_/g, " ");

  return (
    <section className="rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="shipment-heading">
      <h3 id="shipment-heading" className="font-baloo text-lg font-bold text-deep-brown">Shipment tracking</h3>
      <div className="mt-3 space-y-4">
        <div className={`rounded-xl border p-4 ${statusAccentClass(shipment)}`}>
          {showEstimatedDelivery && shipment.estimatedDelivery && (
            <div className="mb-3 border-b border-deep-brown/10 pb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-text-primary/60">Expected Delivery</p>
              <p className="mt-0.5 font-baloo text-lg font-extrabold text-deep-brown sm:text-xl">
                {shipment.estimatedDelivery.min === shipment.estimatedDelivery.max
                  ? formatEstimatedDate(shipment.estimatedDelivery.min)
                  : `${formatEstimatedDate(shipment.estimatedDelivery.min)} – ${formatEstimatedDate(shipment.estimatedDelivery.max)}`}
              </p>
            </div>
          )}
          <p className="font-baloo text-xl font-extrabold leading-tight text-deep-brown sm:text-2xl">{LABELS[shipment.status] ?? shipment.status.replace(/_/g, " ")}</p>
          {shipment.lastSyncedAt && <p className="mt-1 text-xs font-semibold text-text-primary/60">Updated {timeAgo(shipment.lastSyncedAt)}</p>}
          {!showEstimatedDelivery && ACTIVE_TRANSIT_STATUSES.has(shipment.status) && (
            <p className="mt-2 text-xs text-text-primary/60">A fixed delivery estimate isn&apos;t available yet — this page updates as your courier scans the parcel.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-deep-brown/10 pt-3 text-xs text-text-primary/70">
            <span>{shipment.carrier ?? "Courier pending"}{shipment.serviceType ? ` · ${shipment.serviceType}` : ""}</span>
            <span className="text-right">
              <span className="block font-mono font-semibold text-deep-brown">{shipment.awbNumber ?? "AWB pending"}</span>
              <span className="block">{shipment.shipmentNumber}</span>
            </span>
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
