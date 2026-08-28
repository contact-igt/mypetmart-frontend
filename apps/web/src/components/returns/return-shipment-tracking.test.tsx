// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ReturnShipmentTracking } from "./return-shipment-tracking";
import type { ReturnShipmentJSON } from "@/types/return";

function returnShipment(overrides: Partial<ReturnShipmentJSON> = {}): ReturnShipmentJSON {
  return {
    id: 1,
    returnRequestId: 1,
    shipmentNumber: "RSH-000001",
    provider: "ithink",
    carrier: "Delhivery",
    awbNumber: "RAWB-1",
    serviceType: "Surface",
    status: "pickup_scheduled",
    providerStatus: "Manifested",
    trackingUrl: "https://track.example/RAWB-1",
    pickedUpAt: null,
    deliveredAt: null,
    cancelledAt: null,
    lastSyncedAt: "2026-08-20T10:00:00Z",
    createdAt: "2026-08-20T09:00:00Z",
    trackingEvents: [],
    ...overrides,
  };
}

describe("ReturnShipmentTracking", () => {
  it("renders nothing (empty state) when no return shipment exists yet", () => {
    const { container } = render(<ReturnShipmentTracking returnShipment={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current status, courier, and AWB", () => {
    render(<ReturnShipmentTracking returnShipment={returnShipment({ status: "pickup_scheduled", carrier: "Delhivery", awbNumber: "RAWB-999" })} />);

    expect(screen.getByText("Pickup scheduled")).toBeInTheDocument();
    expect(screen.getByText(/Delhivery/u)).toBeInTheDocument();
    expect(screen.getByText("RAWB-999")).toBeInTheDocument();
    expect(screen.getByText("RSH-000001")).toBeInTheDocument();
  });

  it("shows AWB pending / courier pending before a courier is assigned", () => {
    render(<ReturnShipmentTracking returnShipment={returnShipment({ status: "pending", carrier: null, awbNumber: null, serviceType: null })} />);

    expect(screen.getByText("Courier pending")).toBeInTheDocument();
    expect(screen.getByText("AWB pending")).toBeInTheDocument();
  });

  it("renders the tracking timeline when events exist", () => {
    render(
      <ReturnShipmentTracking
        returnShipment={returnShipment({
          status: "in_transit",
          trackingEvents: [
            { id: 1, status: "picked_up", providerStatus: "Picked Up", providerStatusCode: "PU", location: "Mumbai", message: "Collected", eventAt: "2026-08-21T10:00:00Z" },
          ],
        })}
      />
    );

    expect(screen.getByText("In transit")).toBeInTheDocument();
    expect(screen.getByText("Picked up")).toBeInTheDocument();
    expect(screen.getByText(/Mumbai/u)).toBeInTheDocument();
  });

  it("shows a no-events placeholder before any courier scan", () => {
    render(<ReturnShipmentTracking returnShipment={returnShipment({ trackingEvents: [] })} />);
    expect(screen.getByText(/Tracking updates will appear once the courier scans the pickup/u)).toBeInTheDocument();
  });
});
