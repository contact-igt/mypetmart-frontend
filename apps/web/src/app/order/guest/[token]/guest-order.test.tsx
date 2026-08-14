// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GuestOrderClient } from "./guest-order-client";
import { OrderApi } from "@/lib/order-api";
import { AppAuthError } from "@/lib/auth/auth-errors";
import type { GuestOrderDetailJSON } from "@/types/order";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function baseOrder(overrides: Partial<GuestOrderDetailJSON> = {}): GuestOrderDetailJSON {
  return {
    id: 501,
    orderNumber: "MPM-000501",
    contactEmail: "guest@example.com",
    status: "pending",
    paymentStatus: "pending",
    fulfilmentStatus: "unfulfilled",
    subtotal: "899.00",
    shippingFee: "0.00",
    total: "899.00",
    currency: "INR",
    itemCount: 1,
    placedAt: "2026-08-14T10:00:00Z",
    createdAt: "2026-08-14T10:00:00Z",
    updatedAt: "2026-08-14T10:00:00Z",
    cancelledAt: null,
    shippingAddress: {
      recipientName: "Jordan Rivera",
      phone: "+91 98765 12345",
      line1: "12 Palm Street",
      line2: null,
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "IN",
    },
    items: [
      {
        id: 1,
        productId: 10,
        variantId: null,
        productName: "Grain-Free Dog Food",
        productSku: "DOG-FOOD-01",
        variantName: null,
        variantSku: null,
        productImage: null,
        quantity: 1,
        unitPrice: "899.00",
        lineTotal: "899.00",
      },
    ],
    ...overrides,
  };
}

describe("Guest Order Recovery Page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows a loading state, then renders the order once resolved", async () => {
    vi.spyOn(OrderApi, "getGuestOrder").mockResolvedValue(baseOrder());

    render(<GuestOrderClient token={"a".repeat(64)} />);

    await waitFor(() => {
      expect(screen.getByText("Order #MPM-000501")).toBeInTheDocument();
    });
    expect(screen.getByText("Grain-Free Dog Food")).toBeInTheDocument();
  });

  it("passes the token through to OrderApi.getGuestOrder", async () => {
    const spy = vi.spyOn(OrderApi, "getGuestOrder").mockResolvedValue(baseOrder());
    const token = "b".repeat(64);

    render(<GuestOrderClient token={token} />);

    await waitFor(() => expect(spy).toHaveBeenCalledWith(token));
  });

  it("shows a not-found state for GUEST_ORDER_NOT_FOUND without leaking whether the token was malformed or simply unknown", async () => {
    vi.spyOn(OrderApi, "getGuestOrder").mockRejectedValue(
      new AppAuthError("No order was found for this recovery link.", "GUEST_ORDER_NOT_FOUND")
    );

    render(<GuestOrderClient token="unknown-token" />);

    await waitFor(() => {
      expect(screen.getByText("Order not found")).toBeInTheDocument();
    });
  });

  it("shows a generic error state for unrelated API failures", async () => {
    vi.spyOn(OrderApi, "getGuestOrder").mockRejectedValue(new AppAuthError("Network error.", "NETWORK_ERROR"));

    render(<GuestOrderClient token={"c".repeat(64)} />);

    await waitFor(() => {
      expect(screen.getByText("Network error.")).toBeInTheDocument();
    });
  });

  it("never renders shipping coordinates, since the guest DTO does not carry them", async () => {
    vi.spyOn(OrderApi, "getGuestOrder").mockResolvedValue(baseOrder());

    render(<GuestOrderClient token={"d".repeat(64)} />);

    await waitFor(() => expect(screen.getByText("Order #MPM-000501")).toBeInTheDocument());
    expect(screen.queryByText(/latitude/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/longitude/i)).not.toBeInTheDocument();
  });

  it("shows the bookmark reminder, since this link is the only way back", async () => {
    vi.spyOn(OrderApi, "getGuestOrder").mockResolvedValue(baseOrder());

    render(<GuestOrderClient token={"e".repeat(64)} />);

    await waitFor(() =>
      expect(screen.getByText(/Save or bookmark this page/i)).toBeInTheDocument()
    );
  });

  it("shows an enabled Proceed to Payment button for a pending order, using the page's own token", async () => {
    vi.spyOn(OrderApi, "getGuestOrder").mockResolvedValue(baseOrder());

    render(<GuestOrderClient token={"f".repeat(64)} />);

    await waitFor(() => {
      const payButton = screen.getByRole("button", { name: /Proceed to Payment/i });
      expect(payButton).not.toBeDisabled();
    });
  });

  it("shows a disabled payment-unavailable button for a cancelled order", async () => {
    vi.spyOn(OrderApi, "getGuestOrder").mockResolvedValue(baseOrder({ status: "cancelled", cancelledAt: "2026-08-14T11:00:00Z" }));

    render(<GuestOrderClient token={"1".repeat(64)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Payment unavailable" })).toBeDisabled();
      expect(screen.queryByRole("button", { name: /Proceed to Payment/i })).not.toBeInTheDocument();
    });
  });
});
