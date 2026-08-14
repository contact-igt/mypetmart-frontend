// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OrderDetailClient } from "./order-detail-client";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { OrderApi } from "@/lib/order-api";
import { AuthApi, AuthTokenStore } from "@/lib/auth/auth-api";
import { AppAuthError } from "@/lib/auth/auth-errors";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/account/orders/101";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

describe("Order Detail Page & Client Tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    mockPathname = "/account/orders/101";
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. Validates route param and renders Order Not Found immediately for invalid non-numeric ID without API call", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    const getOrderSpy = vi.spyOn(OrderApi, "getOrder");

    render(
      <CustomerAuthProvider>
        <OrderDetailClient orderIdStr="invalid-abc" />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Order not found")).toBeInTheDocument();
      expect(getOrderSpy).not.toHaveBeenCalled();
    });
  });

  it("2. Loads and renders order detail for valid orderId", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 101,
      orderNumber: "MPM-000101",
      contactEmail: "customer@example.com",
      status: "confirmed",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      subtotal: "1500.00",
      shippingFee: "100.00",
      total: "1600.00",
      currency: "INR",
      itemCount: 2,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Aarav Sharma",
        phone: "+91 98765 12345",
        line1: "Flat 402, Sunshine Apartments",
        line2: "MG Road",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        country: "IN",
        latitude: 18.5204,
        longitude: 73.8567,
      },
      items: [
        {
          id: 1,
          productId: 10,
          variantId: 20,
          productName: "Organic Dog Shampoo",
          productSku: "SHAMP-001",
          variantName: "500ml Lavender",
          variantSku: "SHAMP-500ML",
          productImage: "https://example.com/shampoo.jpg",
          quantity: 2,
          unitPrice: "750.00",
          lineTotal: "1500.00",
        },
      ],
    });

    render(
      <CustomerAuthProvider>
        <OrderDetailClient orderIdStr="101" />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/MPM-000101/)).toBeInTheDocument();
      expect(screen.getByText("Organic Dog Shampoo")).toBeInTheDocument();
      expect(screen.getByText(/500ml Lavender/)).toBeInTheDocument();
      expect(screen.getByText(/SHAMP-500ML/)).toBeInTheDocument();
      expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
      expect(screen.getByText("Flat 402, Sunshine Apartments")).toBeInTheDocument();
      expect(screen.getByText(/Pune/)).toBeInTheDocument();
      expect(screen.getAllByText("₹1500.00")[0]).toBeInTheDocument();
      expect(screen.getByText("₹100.00")).toBeInTheDocument();
      expect(screen.getByText("₹1600.00")).toBeInTheDocument();
    });
  });

  it("3. Renders image placeholder fallback when product image is missing", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 102,
      orderNumber: "MPM-000102",
      contactEmail: "customer@example.com",
      status: "confirmed",
      paymentStatus: "paid",
      fulfilmentStatus: "processing",
      subtotal: "500.00",
      shippingFee: "0.00",
      total: "500.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Bob Smith",
        phone: "+91 98765 00000",
        line1: "123 Main St",
        line2: null,
        city: "Mumbai",
        state: "MH",
        postalCode: "400001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 2,
          productId: 12,
          variantId: null,
          productName: "Cat Scratch Post",
          productSku: "SCRATCH-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "500.00",
          lineTotal: "500.00",
        },
      ],
    });

    render(
      <CustomerAuthProvider>
        <OrderDetailClient orderIdStr="102" />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Cat Scratch Post")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: /Cat Scratch Post - Image coming soon/i })).toBeInTheDocument();
    });
  });

  it("4. Displays Order Not Found when backend returns 404", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "getOrder").mockRejectedValue(
      new AppAuthError("Order '999' was not found.", "ORDER_NOT_FOUND")
    );

    render(
      <CustomerAuthProvider>
        <OrderDetailClient orderIdStr="999" />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Order not found")).toBeInTheDocument();
      const backLink = screen.getByText("← Back to My Orders").closest("a");
      expect(backLink).toHaveAttribute("href", "/account/orders");
    });
  });

  it("5. Shows pending payment notice and an enabled Proceed to Payment button for a pending order", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 103,
      orderNumber: "MPM-000103",
      contactEmail: "customer@example.com",
      status: "pending",
      paymentStatus: "pending",
      fulfilmentStatus: "unfulfilled",
      subtotal: "300.00",
      shippingFee: "50.00",
      total: "350.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-13T10:00:00Z",
      createdAt: "2026-08-13T10:00:00Z",
      updatedAt: "2026-08-13T10:00:00Z",
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Charlie",
        phone: "+91 98765 11111",
        line1: "456 Park Ave",
        line2: null,
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 3,
          productId: 15,
          variantId: null,
          productName: "Dog Chew Toy",
          productSku: "CHEW-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "300.00",
          lineTotal: "300.00",
        },
      ],
    });

    render(
      <CustomerAuthProvider>
        <OrderDetailClient orderIdStr="103" />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Order Pending Payment/i)).toBeInTheDocument();
      const payButton = screen.getByRole("button", { name: /Proceed to Payment/i });
      expect(payButton).not.toBeDisabled();
    });
  });

  it("5b. Shows a disabled payment-unavailable button for a cancelled order", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 104,
      orderNumber: "MPM-000104",
      contactEmail: "customer@example.com",
      status: "cancelled",
      paymentStatus: "pending",
      fulfilmentStatus: "unfulfilled",
      subtotal: "300.00",
      shippingFee: "50.00",
      total: "350.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-13T10:00:00Z",
      createdAt: "2026-08-13T10:00:00Z",
      updatedAt: "2026-08-13T10:00:00Z",
      cancelledAt: "2026-08-13T11:00:00Z",
      shippingAddress: {
        recipientName: "Charlie",
        phone: "+91 98765 11111",
        line1: "456 Park Ave",
        line2: null,
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [],
    });

    render(
      <CustomerAuthProvider>
        <OrderDetailClient orderIdStr="104" />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      const payButton = screen.getByRole("button", { name: "Payment unavailable" });
      expect(payButton).toBeDisabled();
      expect(screen.queryByRole("button", { name: /Proceed to Payment/i })).not.toBeInTheDocument();
    });
  });
});
