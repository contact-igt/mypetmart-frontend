// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ShipmentTracking } from "./shipment-tracking";
import type { ShipmentJSON } from "@/types/shipment";

function shipment(overrides: Partial<ShipmentJSON> = {}): ShipmentJSON {
  return {
    id: 1,
    shipmentNumber: "SHP-000001",
    sourceType: "order",
    sourceId: 1,
    orderId: 1,
    replacementId: null,
    provider: "ithink",
    providerOrderId: "REF-1",
    carrier: "Delhivery",
    awbNumber: "AWB-1",
    serviceType: "Surface",
    status: "in_transit",
    providerStatus: "In Transit",
    providerStatusCode: "IT",
    providerCost: "50.00",
    currency: "INR",
    package: { weightGrams: 500, lengthCm: "10.00", widthCm: "8.00", heightCm: "6.00" },
    deliveryTat: null,
    estimatedDelivery: null,
    shippedAt: "2026-08-25T10:00:00Z",
    deliveredAt: null,
    cancelledAt: null,
    rtoAt: null,
    lastSyncedAt: "2026-08-26T10:00:00Z",
    createdAt: "2026-08-24T12:00:00Z",
    trackingEvents: [],
    ...overrides,
  };
}

describe("ShipmentTracking", () => {
  it("renders the empty state when no shipment exists yet", () => {
    render(<ShipmentTracking shipment={null} />);
    expect(screen.getByText("Your shipment has not been prepared yet.")).toBeInTheDocument();
  });

  it("leads with the real current status and a freshness signal, never a fabricated delivery date", () => {
    render(<ShipmentTracking shipment={shipment({ status: "in_transit" })} />);

    expect(screen.getByText("In transit")).toBeInTheDocument();
    expect(screen.getByText(/^Updated /u)).toBeInTheDocument();
    // No fixed delivery date/range is ever rendered — iThink does not supply one.
    expect(screen.queryByText(/estimated delivery/iu)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2} Aug\s*[-–]\s*\d{1,2} Aug/u)).not.toBeInTheDocument();
  });

  it("shows the honest no-estimate note while a shipment is actively in transit", () => {
    render(<ShipmentTracking shipment={shipment({ status: "out_for_delivery" })} />);
    expect(screen.getByText(/fixed delivery estimate isn.t available yet/iu)).toBeInTheDocument();
  });

  it("omits the no-estimate note once a shipment is delivered", () => {
    render(<ShipmentTracking shipment={shipment({ status: "delivered", deliveredAt: "2026-08-26T09:00:00Z" })} />);
    expect(screen.queryByText(/fixed delivery estimate isn.t available yet/iu)).not.toBeInTheDocument();
  });

  it("still shows carrier and AWB details alongside the status headline", () => {
    render(<ShipmentTracking shipment={shipment({ carrier: "Delhivery", awbNumber: "AWB-999" })} />);
    expect(screen.getByText(/Delhivery/u)).toBeInTheDocument();
    expect(screen.getByText("AWB-999")).toBeInTheDocument();
  });

  it("shows the real Expected Delivery date range when iThink supplied one, and hides the no-estimate note", () => {
    render(<ShipmentTracking shipment={shipment({ status: "in_transit", estimatedDelivery: { min: "2026-08-29", max: "2026-09-01" } })} />);
    expect(screen.getByText("Expected Delivery")).toBeInTheDocument();
    expect(screen.getByText(/29 Aug.*1 Sep/u)).toBeInTheDocument();
    expect(screen.queryByText(/fixed delivery estimate isn.t available yet/iu)).not.toBeInTheDocument();
  });

  it("shows a single date instead of a redundant range when min and max are the same day", () => {
    render(<ShipmentTracking shipment={shipment({ status: "in_transit", estimatedDelivery: { min: "2026-08-29", max: "2026-08-29" } })} />);
    expect(screen.getByText("29 Aug")).toBeInTheDocument();
  });

  it("hides the Expected Delivery band entirely when no estimate exists (null, never fabricated)", () => {
    render(<ShipmentTracking shipment={shipment({ status: "in_transit", estimatedDelivery: null })} />);
    expect(screen.queryByText("Expected Delivery")).not.toBeInTheDocument();
  });

  it("does not show a stale pre-booking estimate once the shipment has already been delivered", () => {
    render(<ShipmentTracking shipment={shipment({ status: "delivered", deliveredAt: "2026-09-01T09:00:00Z", estimatedDelivery: { min: "2026-08-29", max: "2026-09-01" } })} />);
    expect(screen.queryByText("Expected Delivery")).not.toBeInTheDocument();
  });
});
