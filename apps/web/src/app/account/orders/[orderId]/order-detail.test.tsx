// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OrderDetailClient } from "./order-detail-client";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { CartProvider } from "@/context/cart-context";
import { OrderApi } from "@/lib/order-api";
import { CartApi } from "@/lib/cart-api";
import { ReturnApi } from "@/lib/return-api";
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
    vi.spyOn(CartApi, "getCart").mockResolvedValue({ id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] });
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
        <CartProvider>
          <OrderDetailClient orderIdStr="invalid-abc" />
        </CartProvider>
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
      payments: [],
      refundSummary: null,
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
      shipment: {
        id: 91,
        shipmentNumber: "SHP-000091",
        sourceType: "order",
        sourceId: 101,
        orderId: 101,
        replacementId: null,
        provider: "ithink",
        providerOrderId: "REF-91",
        carrier: "Delhivery",
        awbNumber: "AWB-123456",
        serviceType: "Surface",
        status: "delivered",
        providerStatus: "Delivered",
        providerStatusCode: "DL",
        providerCost: "87.50",
        currency: "INR",
        package: { weightGrams: 500, lengthCm: "10.00", widthCm: "8.00", heightCm: "10.00" },
        deliveryTat: null,
        estimatedDelivery: null,
        shippedAt: "2026-08-13T10:00:00Z",
        deliveredAt: "2026-08-15T10:00:00Z",
        cancelledAt: null,
        rtoAt: null,
        lastSyncedAt: "2026-08-15T10:00:00Z",
        createdAt: "2026-08-12T11:00:00Z",
        trackingEvents: [{ id: 1, status: "delivered", providerStatus: "Delivered", providerStatusCode: "DL", location: "Pune", message: "Handed to customer", eventAt: "2026-08-15T10:00:00Z" }],
      },
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="101" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/MPM-000101/)).toBeInTheDocument();
      expect(screen.getByText("Organic Dog Shampoo")).toBeInTheDocument();
      expect(screen.getByText(/500ml Lavender/)).toBeInTheDocument();
      expect(screen.getByText(/SHAMP-500ML/)).toBeInTheDocument();
      expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
      expect(screen.getByText("Flat 402, Sunshine Apartments")).toBeInTheDocument();
      expect(screen.getAllByText(/Pune/)[0]).toBeInTheDocument();
      expect(screen.getByText("AWB-123456")).toBeInTheDocument();
      expect(screen.getByText(/Handed to customer/)).toBeInTheDocument();
      expect(screen.getAllByText("₹1500.00")[0]).toBeInTheDocument();
      expect(screen.getByText("₹100.00")).toBeInTheDocument();
      expect(screen.getByText("₹1600.00")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Download Receipt" })).toBeInTheDocument();
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
      payments: [],
      refundSummary: null,
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
        <CartProvider>
          <OrderDetailClient orderIdStr="102" />
        </CartProvider>
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
        <CartProvider>
          <OrderDetailClient orderIdStr="999" />
        </CartProvider>
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
      payments: [],
      refundSummary: null,
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
        <CartProvider>
          <OrderDetailClient orderIdStr="103" />
        </CartProvider>
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
      payments: [],
      refundSummary: null,
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
        <CartProvider>
          <OrderDetailClient orderIdStr="104" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      const payButton = screen.getByRole("button", { name: "Payment unavailable" });
      expect(payButton).toBeDisabled();
      expect(screen.queryByRole("button", { name: /Proceed to Payment/i })).not.toBeInTheDocument();
    });
  });

  it("6. Collapses the tracking history for a delivered shipment, expandable via View Tracking History", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(ReturnApi, "list").mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 105,
      orderNumber: "MPM-000105",
      contactEmail: "customer@example.com",
      status: "delivered",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      subtotal: "500.00",
      shippingFee: "0.00",
      total: "500.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [],
      refundSummary: null,
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Dana",
        phone: "+91 98765 22222",
        line1: "1 Rose St",
        line2: null,
        city: "Chennai",
        state: "Tamil Nadu",
        postalCode: "600001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 4,
          productId: 20,
          variantId: null,
          productName: "Pet Bed",
          productSku: "BED-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "500.00",
          lineTotal: "500.00",
        },
      ],
      shipment: {
        id: 95,
        shipmentNumber: "SHP-000095",
        sourceType: "order",
        sourceId: 105,
        orderId: 105,
        replacementId: null,
        provider: "ithink",
        providerOrderId: "REF-95",
        carrier: "Delhivery",
        awbNumber: "AWB-999999",
        serviceType: "Surface",
        status: "delivered",
        providerStatus: "Delivered",
        providerStatusCode: "DL",
        providerCost: "50.00",
        currency: "INR",
        package: { weightGrams: 300, lengthCm: "10.00", widthCm: "8.00", heightCm: "8.00" },
        deliveryTat: null,
        estimatedDelivery: null,
        shippedAt: "2026-08-13T10:00:00Z",
        deliveredAt: "2026-08-14T10:00:00Z",
        cancelledAt: null,
        rtoAt: null,
        lastSyncedAt: "2026-08-14T10:00:00Z",
        createdAt: "2026-08-12T11:00:00Z",
        trackingEvents: [
          { id: 1, status: "picked_up", providerStatus: "Picked up", providerStatusCode: "PU", location: "Chennai Hub", message: "Picked up by courier", eventAt: "2026-08-13T10:00:00Z" },
          { id: 2, status: "delivered", providerStatus: "Delivered", providerStatusCode: "DL", location: "Chennai", message: "Handed to customer", eventAt: "2026-08-14T10:00:00Z" },
        ],
      },
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="105" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("AWB-999999")).toBeInTheDocument();
      expect(screen.getByText(/Handed to customer/)).toBeInTheDocument();
      // The full event list (including the earlier pickup event) starts collapsed.
      expect(screen.queryByText(/Picked up by courier/)).not.toBeInTheDocument();
      expect(screen.getByText("View Tracking History")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("View Tracking History"));

    await waitFor(() => {
      expect(screen.getByText(/Picked up by courier/)).toBeInTheDocument();
      expect(screen.getByText("Hide Tracking History")).toBeInTheDocument();
    });
  });

  it("7. Shows the Returns & Refunds summary with product name, status, and a link to return details", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(ReturnApi, "list").mockResolvedValue({
      items: [
        {
          id: 501,
          returnNumber: "RET-000501",
          orderId: 106,
          orderNumber: "MPM-000106",
          orderItemId: 5,
          productName: "Royal Canin Food",
          variantName: null,
          purchasedQuantity: 1,
          quantity: 1,
          resolution: "refund",
          status: "requested",
          reason: "Wrong item",
          resolutionNote: null,
          requestedAt: "2026-08-16T10:00:00Z",
          resolvedAt: null,
          refunds: [{ id: 1, refundNumber: "RFD-000001", status: "pending", amount: "500.00", currency: "INR", initiatedAt: "2026-08-16T10:05:00Z", completedAt: null, failedAt: null, failureMessage: null }],
          replacement: null,
          returnShipment: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 106,
      orderNumber: "MPM-000106",
      contactEmail: "customer@example.com",
      status: "return_requested",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      subtotal: "500.00",
      shippingFee: "0.00",
      total: "500.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [],
      refundSummary: null,
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Erin",
        phone: "+91 98765 33333",
        line1: "2 Lotus St",
        line2: null,
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 5,
          productId: 30,
          variantId: null,
          productName: "Royal Canin Food",
          productSku: "RC-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "500.00",
          lineTotal: "500.00",
        },
      ],
      shipment: null,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="106" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Returns & Refunds")).toBeInTheDocument();
      expect(screen.getByText(/Return requested/)).toBeInTheDocument();
      expect(screen.getByText(/Refund pending/)).toBeInTheDocument();
      const returnLink = screen.getByText(/View Return Details/i).closest("a");
      expect(returnLink).toHaveAttribute("href", "/account/returns/501");
    });
  });

  it("8. Reorders the order's items into the cart and navigates to /cart", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(ReturnApi, "list").mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    const orderDetail = {
      id: 107,
      orderNumber: "MPM-000107",
      contactEmail: "customer@example.com",
      status: "delivered",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      subtotal: "200.00",
      shippingFee: "0.00",
      total: "200.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [],
      refundSummary: null,
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Farah",
        phone: "+91 98765 44444",
        line1: "3 Jasmine St",
        line2: null,
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 6,
          productId: 40,
          variantId: null,
          productName: "Pet Comb",
          productSku: "COMB-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "200.00",
          lineTotal: "200.00",
        },
      ],
      shipment: null,
    };
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue(orderDetail);
    const addItemSpy = vi.spyOn(CartApi, "addItem").mockResolvedValue({ id: 1, status: "active", itemCount: 1, subtotal: "200.00", items: [] });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="107" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Pet Comb")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reorder" }));

    await waitFor(() => {
      expect(addItemSpy).toHaveBeenCalledWith({ productId: 40, quantity: 1 });
      expect(mockPush).toHaveBeenCalledWith("/cart");
    });
  });

  it("9. Shows Cash on Delivery as the payment method for a COD order", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(ReturnApi, "list").mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 108,
      orderNumber: "MPM-000108",
      contactEmail: "customer@example.com",
      status: "confirmed",
      paymentStatus: "pending",
      fulfilmentStatus: "unfulfilled",
      subtotal: "300.00",
      shippingFee: "0.00",
      total: "300.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [{ provider: "cod", method: "cod", status: "pending", providerOrderId: null, paidAt: null, refundedAt: null }],
      refundSummary: null,
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Gita",
        phone: "+91 98765 55555",
        line1: "4 Marigold St",
        line2: null,
        city: "Kolkata",
        state: "West Bengal",
        postalCode: "700001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 7,
          productId: 50,
          variantId: null,
          productName: "Dog Leash",
          productSku: "LEASH-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "300.00",
          lineTotal: "300.00",
        },
      ],
      shipment: null,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="108" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Cash on Delivery")).toBeInTheDocument();
      // A COD Order's paymentStatus stays "pending" until delivery by design
      // (funds are collected at the door, not upfront) — it must never be
      // read as "still owes an online payment".
      expect(screen.queryByText(/Order Pending Payment/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Proceed to Payment/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Payment will be collected via Cash on Delivery\./i)).toBeInTheDocument();
    });
  });

  it("9b. Shows no pending-payment warning or retry button for a DELIVERED COD order still pending collection", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(ReturnApi, "list").mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 108,
      orderNumber: "MPM-000108",
      contactEmail: "customer@example.com",
      status: "delivered",
      paymentStatus: "pending",
      fulfilmentStatus: "delivered",
      subtotal: "300.00",
      shippingFee: "0.00",
      total: "300.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [{ provider: "cod", method: "cod", status: "pending", providerOrderId: null, paidAt: null, refundedAt: null }],
      refundSummary: null,
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Gita",
        phone: "+91 98765 55555",
        line1: "4 Marigold St",
        line2: null,
        city: "Kolkata",
        state: "West Bengal",
        postalCode: "700001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 7,
          productId: 50,
          variantId: null,
          productName: "Dog Leash",
          productSku: "LEASH-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "300.00",
          lineTotal: "300.00",
        },
      ],
      shipment: null,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="108" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Payment will be collected via Cash on Delivery\./i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Order Pending Payment/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Proceed to Payment/i })).not.toBeInTheDocument();
  });

  it("10. Shows the transaction reference for a paid PayU order", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(ReturnApi, "list").mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 109,
      orderNumber: "MPM-000109",
      contactEmail: "customer@example.com",
      status: "confirmed",
      paymentStatus: "paid",
      fulfilmentStatus: "unfulfilled",
      subtotal: "400.00",
      shippingFee: "0.00",
      total: "400.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [{ provider: "payu", method: "UPI", status: "paid", providerOrderId: "PAY-000109-abc123", paidAt: "2026-08-12T10:05:00Z", refundedAt: null }],
      refundSummary: null,
      cancelledAt: null,
      shippingAddress: {
        recipientName: "Hari",
        phone: "+91 98765 66666",
        line1: "5 Tulip St",
        line2: null,
        city: "Jaipur",
        state: "Rajasthan",
        postalCode: "302001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 8,
          productId: 60,
          variantId: null,
          productName: "Cat Tree",
          productSku: "TREE-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "400.00",
          lineTotal: "400.00",
        },
      ],
      shipment: null,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="109" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("PAY-000109-abc123")).toBeInTheDocument();
    });
  });

  it("11. Shows the refund summary total and status for a refunded order", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(ReturnApi, "list").mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 110,
      orderNumber: "MPM-000110",
      contactEmail: "customer@example.com",
      status: "cancelled",
      paymentStatus: "refunded",
      fulfilmentStatus: "unfulfilled",
      subtotal: "600.00",
      shippingFee: "0.00",
      total: "600.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [{ provider: "payu", method: "UPI", status: "refunded", providerOrderId: "PAY-000110-def456", paidAt: "2026-08-12T10:05:00Z", refundedAt: "2026-08-13T10:00:00Z" }],
      refundSummary: { totalRefunded: "550.00", status: "succeeded" },
      cancelledAt: "2026-08-13T09:00:00Z",
      shippingAddress: {
        recipientName: "Ira",
        phone: "+91 98765 77777",
        line1: "6 Orchid St",
        line2: null,
        city: "Lucknow",
        state: "Uttar Pradesh",
        postalCode: "226001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 9,
          productId: 70,
          variantId: null,
          productName: "Pet Carrier",
          productSku: "CARRY-01",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "600.00",
          lineTotal: "600.00",
        },
      ],
      shipment: null,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="110" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Refund completed")).toBeInTheDocument();
      expect(screen.getByText("₹550.00")).toBeInTheDocument();
    });
  });

  it("clicking Download Receipt calls OrderApi.downloadReceipt for this order's id and downloads the returned PDF", async () => {
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
      itemCount: 1,
      placedAt: "2026-08-12T10:00:00Z",
      createdAt: "2026-08-12T10:00:00Z",
      updatedAt: "2026-08-12T10:00:00Z",
      payments: [],
      refundSummary: null,
      cancelledAt: null,
      shippingAddress: { recipientName: "Aarav Sharma", phone: "+91 98765 12345", line1: "Flat 402", line2: null, city: "Pune", state: "Maharashtra", postalCode: "411001", country: "IN", latitude: null, longitude: null },
      items: [{ id: 1, productId: 10, variantId: null, productName: "Organic Dog Shampoo", productSku: "SHAMP-001", variantName: null, variantSku: null, productImage: null, quantity: 1, unitPrice: "1500.00", lineTotal: "1500.00" }],
    });
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const downloadSpy = vi.spyOn(OrderApi, "downloadReceipt").mockResolvedValue({ blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }), filename: "REC-000001.pdf" });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <OrderDetailClient orderIdStr="101" />
        </CartProvider>
      </CustomerAuthProvider>
    );

    const button = await screen.findByRole("button", { name: "Download Receipt" });
    fireEvent.click(button);

    await waitFor(() => expect(downloadSpy).toHaveBeenCalledWith(101));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
