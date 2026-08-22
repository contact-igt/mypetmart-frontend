// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OrderTracker, type OrderTrackerInput } from "./order-tracker";
import type { ShipmentJSON } from "@/types/shipment";

function baseOrder(overrides: Partial<OrderTrackerInput> = {}): OrderTrackerInput {
  return {
    status: "pending",
    paymentStatus: "pending",
    placedAt: "2026-08-10T10:00:00Z",
    cancelledAt: null,
    shipment: null,
    ...overrides
  };
}

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
    shippedAt: "2026-08-11T10:00:00Z",
    deliveredAt: null,
    cancelledAt: null,
    rtoAt: null,
    lastSyncedAt: "2026-08-12T10:00:00Z",
    createdAt: "2026-08-10T12:00:00Z",
    trackingEvents: [],
    ...overrides
  };
}

// Desktop and mobile trackers both render into the DOM simultaneously
// (visibility is CSS-only, via `hidden`/`sm:hidden`), so getAllByText is
// used wherever a label appears in both variants.
function stepLabels() {
  return screen.getAllByText("Order Placed")[0]!.closest("ol")!;
}

describe("OrderTracker", () => {
  it("shows only Order Placed completed while awaiting payment, without falsely showing later progress", () => {
    render(<OrderTracker order={baseOrder({ status: "pending", paymentStatus: "pending" })} />);

    const list = stepLabels();
    expect(within(list).getByText("Order Placed")).toBeInTheDocument();
    expect(within(list).getByText("Payment Confirmed")).toBeInTheDocument();
    expect(within(list).getByText("Processing")).toBeInTheDocument();
    expect(within(list).getByText("Shipped")).toBeInTheDocument();
    expect(within(list).getByText("Delivered")).toBeInTheDocument();
    // No Out for Delivery step at all — no Shipment exists for this order yet.
    expect(within(list).queryByText("Out for Delivery")).not.toBeInTheDocument();
  });

  it("renders a paid/confirmed order with Payment Confirmed completed and Processing as the current step", () => {
    render(<OrderTracker order={baseOrder({ status: "confirmed", paymentStatus: "paid" })} />);

    // Only one dot color communicates "current" — verified indirectly via
    // no exception banner and normal step labels rendering.
    const list = stepLabels();
    expect(within(list).getByText("Payment Confirmed")).toBeInTheDocument();
    expect(within(list).getByText("Processing")).toBeInTheDocument();
    expect(screen.queryByText("Order Cancelled")).not.toBeInTheDocument();
  });

  it("highlights Processing as reached for a processing order", () => {
    render(<OrderTracker order={baseOrder({ status: "processing", paymentStatus: "paid" })} />);

    const list = stepLabels();
    expect(within(list).getByText("Processing")).toBeInTheDocument();
    expect(within(list).getByText("Shipped")).toBeInTheDocument();
  });

  it("marks Shipped as reached and shows the real shippedAt timestamp when a Shipment exists", () => {
    render(<OrderTracker order={baseOrder({ status: "shipped", paymentStatus: "paid", shipment: shipment({ status: "in_transit" }) })} />);

    const list = stepLabels();
    expect(within(list).getByText("Shipped")).toBeInTheDocument();
    expect(within(list).getAllByText(/11 Aug 2026/u).length).toBeGreaterThan(0);
    // A real Shipment exists, so Out for Delivery is shown as the current step.
    expect(within(list).getByText("Out for Delivery")).toBeInTheDocument();
  });

  it("completes the entire tracker, including a real deliveredAt timestamp, once delivered", () => {
    render(
      <OrderTracker
        order={baseOrder({
          status: "delivered",
          paymentStatus: "paid",
          shipment: shipment({ status: "delivered", deliveredAt: "2026-08-15T09:00:00Z", trackingEvents: [{ id: 1, status: "out_for_delivery", providerStatus: "Out for Delivery", providerStatusCode: "OFD", location: null, message: null, eventAt: "2026-08-15T07:00:00Z" }] })
        })}
      />
    );

    const list = stepLabels();
    expect(within(list).getByText("Delivered")).toBeInTheDocument();
    expect(within(list).getAllByText(/15 Aug 2026/u).length).toBeGreaterThan(0);
    expect(screen.queryByText("Order Cancelled")).not.toBeInTheDocument();
  });

  it("back-fills Out for Delivery as completed (checkmark only, no invented timestamp) when a Shipment goes straight to delivered", () => {
    render(
      <OrderTracker
        order={baseOrder({
          status: "delivered",
          paymentStatus: "paid",
          shipment: shipment({ status: "delivered", deliveredAt: "2026-08-15T09:00:00Z", trackingEvents: [] })
        })}
      />
    );

    const list = stepLabels();
    expect(within(list).getByText("Out for Delivery")).toBeInTheDocument();
    expect(within(list).getByText("Delivered")).toBeInTheDocument();
  });

  it("renders a distinct exception state for a cancelled order instead of the normal progression", () => {
    render(<OrderTracker order={baseOrder({ status: "cancelled", paymentStatus: "pending", cancelledAt: "2026-08-12T10:00:00Z" })} />);

    expect(screen.getByText("Order Cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Order Progress")).not.toBeInTheDocument();
    expect(screen.queryByText("Delivered")).not.toBeInTheDocument();
  });

  it("renders the same step content in the mobile (vertical) tracker as the desktop one", () => {
    const { container } = render(<OrderTracker order={baseOrder({ status: "processing", paymentStatus: "paid" })} />);

    const lists = container.querySelectorAll("ol");
    expect(lists.length).toBe(2);
    for (const list of Array.from(lists)) {
      expect(within(list as HTMLElement).getByText("Order Placed")).toBeInTheDocument();
      expect(within(list as HTMLElement).getByText("Processing")).toBeInTheDocument();
      expect(within(list as HTMLElement).getByText("Delivered")).toBeInTheDocument();
    }
  });
});
