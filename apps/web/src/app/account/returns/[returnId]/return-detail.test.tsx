// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ReturnDetailClient } from "./return-detail-client";
import { ReturnApi } from "@/lib/return-api";
import type { ReturnRequestDetailJSON } from "@/types/return";

function baseDetail(overrides: Partial<ReturnRequestDetailJSON> = {}): ReturnRequestDetailJSON {
  return {
    id: 701,
    returnNumber: "RET-000701",
    orderId: 101,
    orderNumber: "MPM-000101",
    orderItemId: 5,
    productName: "Organic Dog Shampoo",
    variantName: null,
    purchasedQuantity: 1,
    quantity: 1,
    resolution: "refund",
    status: "approved",
    reason: "Wrong item",
    resolutionNote: null,
    requestedAt: "2026-08-18T10:00:00Z",
    resolvedAt: null,
    refunds: [],
    replacement: null,
    returnShipment: null,
    notes: [],
    maxRefundableAmount: "750.00",
    currency: "INR",
    ...overrides,
  };
}

describe("ReturnDetailClient — return shipment tracking", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render a Return Pickup card when no return shipment has been created yet", async () => {
    vi.spyOn(ReturnApi, "getReturn").mockResolvedValue(baseDetail({ returnShipment: null }));

    render(<ReturnDetailClient returnIdStr="701" />);

    await waitFor(() => expect(screen.getByText("RET-000701")).toBeInTheDocument());
    expect(screen.queryByText("Return Pickup")).not.toBeInTheDocument();
  });

  it("shows the Return Pickup tracking card once a return shipment exists", async () => {
    vi.spyOn(ReturnApi, "getReturn").mockResolvedValue(
      baseDetail({
        returnShipment: {
          id: 1,
          returnRequestId: 701,
          shipmentNumber: "RSH-000042",
          provider: "ithink",
          carrier: "Delhivery",
          awbNumber: "RAWB-777",
          serviceType: "Surface",
          status: "pickup_scheduled",
          providerStatus: "Manifested",
          trackingUrl: "https://track.example/RAWB-777",
          pickedUpAt: null,
          deliveredAt: null,
          cancelledAt: null,
          lastSyncedAt: "2026-08-19T10:00:00Z",
          createdAt: "2026-08-19T09:00:00Z",
          trackingEvents: [],
        },
      })
    );

    render(<ReturnDetailClient returnIdStr="701" />);

    await waitFor(() => expect(screen.getByText("Return Pickup")).toBeInTheDocument());
    expect(screen.getByText("Pickup scheduled")).toBeInTheDocument();
    expect(screen.getByText(/Delhivery/u)).toBeInTheDocument();
    expect(screen.getByText("RAWB-777")).toBeInTheDocument();
  });
});
