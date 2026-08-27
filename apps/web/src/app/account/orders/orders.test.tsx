// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AccountOrdersPage from "./page";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { CartProvider } from "@/context/cart-context";
import { OrderApi } from "@/lib/order-api";
import { CartApi } from "@/lib/cart-api";
import { AuthApi, AuthTokenStore } from "@/lib/auth/auth-api";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/account/orders";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

describe("My Orders Page & Client Tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    mockPathname = "/account/orders";
    mockPush.mockReset();
    mockReplace.mockReset();
    vi.spyOn(CartApi, "getCart").mockResolvedValue({ id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. Redirects unauthenticated customer to /signin", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue(null);

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalledWith("/signin");
      },
      { timeout: 3000 }
    );
  });

  it("2. Displays loading state initially for authenticated customer", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockImplementation(() => new Promise(() => {}));

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Loading your order history...")).toBeInTheDocument();
    });
  });

  it("3. Displays empty state when customer has no orders", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("No orders yet")).toBeInTheDocument();
      const shopLink = screen.getByText("Start Shopping").closest("a");
      expect(shopLink).toHaveAttribute("href", "/shop");
    });
  });

  it("4. Renders populated order list with statuses, totals, and links", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 10,
          orderNumber: "MPM-000010",
          status: "confirmed",
          paymentStatus: "paid",
          fulfilmentStatus: "processing",
          subtotal: "999.00",
          shippingFee: "50.00",
          total: "1049.00",
          currency: "INR",
          itemCount: 2,
          placedAt: "2026-08-10T10:00:00Z",
          products: [{ name: "Chew Toy", image: null }],
          shipment: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("#MPM-000010")).toBeInTheDocument();
      expect(screen.getByText("₹1049.00")).toBeInTheDocument();
      expect(screen.getByText("confirmed")).toBeInTheDocument();
      expect(screen.getByText("paid")).toBeInTheDocument();
      expect(screen.getByText("Chew Toy")).toBeInTheDocument();
      const viewLink = screen.getByText(/View Details/i).closest("a");
      expect(viewLink).toHaveAttribute("href", "/account/orders/10");
    });
  });

  it("5. Highlights pending order status clearly", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 11,
          orderNumber: "MPM-000011",
          status: "pending",
          paymentStatus: "pending",
          fulfilmentStatus: "unfulfilled",
          subtotal: "500.00",
          shippingFee: "0.00",
          total: "500.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-13T10:00:00Z",
          products: [{ name: "Dog Bed", image: null }],
          shipment: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("#MPM-000011")).toBeInTheDocument();
      expect(screen.getByText("Payment Pending")).toBeInTheDocument();
      expect(screen.getAllByText("pending")[0]).toBeInTheDocument();
    });
  });

  it("6. Supports pagination controls when multiple pages exist", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    const listSpy = vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 1,
          orderNumber: "MPM-000001",
          status: "confirmed",
          paymentStatus: "paid",
          fulfilmentStatus: "delivered",
          subtotal: "100.00",
          shippingFee: "0.00",
          total: "100.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-01T10:00:00Z",
          products: [{ name: "Cat Litter", image: null }],
          shipment: null,
        },
      ],
      total: 15,
      page: 1,
      pageSize: 10,
      totalPages: 2,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    const nextBtn = screen.getByText(/Next/i);
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
    });
  });

  it("7. Shows API error message and supports retry action", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    const listSpy = vi
      .spyOn(OrderApi, "list")
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load your orders. Please try again.")).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Try Again");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText("No orders yet")).toBeInTheDocument();
    });
  });

  it("8. Shows a shipment-aware primary status and product preview, never the stale fulfilment field", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 20,
          orderNumber: "MPM-000020",
          status: "shipped",
          paymentStatus: "paid",
          fulfilmentStatus: "unfulfilled",
          subtotal: "300.00",
          shippingFee: "0.00",
          total: "300.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-15T10:00:00Z",
          products: [{ name: "Cat Scratcher", image: "https://cdn.example.com/cat-scratcher.jpg" }],
          shipment: { status: "out_for_delivery", carrier: "Courier A", trackingAvailable: true },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Out for delivery")).toBeInTheDocument();
      expect(screen.getByText("Cat Scratcher")).toBeInTheDocument();
      expect(screen.queryByText("unfulfilled")).not.toBeInTheDocument();
      const trackLink = screen.getByText("Track Order").closest("a");
      expect(trackLink).toHaveAttribute("href", "/account/orders/20#shipment-heading");
    });
  });

  it("9. Hides the Track Order action when the order has no trackable shipment", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 21,
          orderNumber: "MPM-000021",
          status: "confirmed",
          paymentStatus: "paid",
          fulfilmentStatus: "unfulfilled",
          subtotal: "300.00",
          shippingFee: "0.00",
          total: "300.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-15T10:00:00Z",
          products: [{ name: "Pet Shampoo", image: null }],
          shipment: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Pet Shampoo")).toBeInTheDocument();
    });
    expect(screen.queryByText("Track Order")).not.toBeInTheDocument();
  });

  it("10. Applies the status filter and refetches with the selected value", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    const listSpy = vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 22,
          orderNumber: "MPM-000022",
          status: "delivered",
          paymentStatus: "paid",
          fulfilmentStatus: "delivered",
          subtotal: "300.00",
          shippingFee: "0.00",
          total: "300.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-15T10:00:00Z",
          products: [{ name: "Pet Brush", image: null }],
          shipment: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Pet Brush")).toBeInTheDocument();
    });

    const statusSelects = screen.getAllByLabelText("Status");
    fireEvent.change(statusSelects[0], { target: { value: "delivered" } });

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, status: "delivered" });
    });
  });

  it("11. Reorders an order's items into the cart and navigates to /cart", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 23,
          orderNumber: "MPM-000023",
          status: "delivered",
          paymentStatus: "paid",
          fulfilmentStatus: "delivered",
          subtotal: "300.00",
          shippingFee: "0.00",
          total: "300.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-15T10:00:00Z",
          products: [{ name: "Pet Bowl", image: null }],
          shipment: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 23,
      orderNumber: "MPM-000023",
      status: "delivered",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      subtotal: "300.00",
      shippingFee: "0.00",
      total: "300.00",
      currency: "INR",
      itemCount: 1,
      placedAt: "2026-08-15T10:00:00Z",
      contactEmail: "customer@example.com",
      shippingAddress: {
        recipientName: "Test Customer",
        phone: "9999999999",
        line1: "1 Test Street",
        line2: null,
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 1001,
          productId: 55,
          variantId: null,
          productName: "Pet Bowl",
          productSku: "SKU-55",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 2,
          unitPrice: "150.00",
          lineTotal: "300.00",
        },
      ],
      cancelledAt: null,
      createdAt: "2026-08-15T10:00:00Z",
      updatedAt: "2026-08-15T10:00:00Z",
      payments: [],
      refundSummary: null,
      shipment: null,
    });
    const addItemSpy = vi.spyOn(CartApi, "addItem").mockResolvedValue({ id: 1, status: "active", itemCount: 2, subtotal: "300.00", items: [] });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Pet Bowl")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Reorder"));

    await waitFor(() => {
      expect(addItemSpy).toHaveBeenCalledWith({ productId: 55, quantity: 2 });
      expect(mockPush).toHaveBeenCalledWith("/cart");
    });
  });

  it("12. Skips an unavailable item during reorder and still adds the remaining available items", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.spyOn(OrderApi, "list").mockResolvedValue({
      items: [
        {
          id: 24,
          orderNumber: "MPM-000024",
          status: "delivered",
          paymentStatus: "paid",
          fulfilmentStatus: "delivered",
          subtotal: "450.00",
          shippingFee: "0.00",
          total: "450.00",
          currency: "INR",
          itemCount: 2,
          placedAt: "2026-08-15T10:00:00Z",
          products: [
            { name: "Pet Bowl", image: null },
            { name: "Discontinued Chew Toy", image: null },
          ],
          shipment: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    vi.spyOn(OrderApi, "getOrder").mockResolvedValue({
      id: 24,
      orderNumber: "MPM-000024",
      status: "delivered",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      subtotal: "450.00",
      shippingFee: "0.00",
      total: "450.00",
      currency: "INR",
      itemCount: 2,
      placedAt: "2026-08-15T10:00:00Z",
      contactEmail: "customer@example.com",
      shippingAddress: {
        recipientName: "Test Customer",
        phone: "9999999999",
        line1: "1 Test Street",
        line2: null,
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "IN",
        latitude: null,
        longitude: null,
      },
      items: [
        {
          id: 2001,
          productId: 55,
          variantId: null,
          productName: "Pet Bowl",
          productSku: "SKU-55",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "150.00",
          lineTotal: "150.00",
        },
        {
          id: 2002,
          productId: 77,
          variantId: null,
          productName: "Discontinued Chew Toy",
          productSku: "SKU-77",
          variantName: null,
          variantSku: null,
          productImage: null,
          quantity: 1,
          unitPrice: "300.00",
          lineTotal: "300.00",
        },
      ],
      cancelledAt: null,
      createdAt: "2026-08-15T10:00:00Z",
      updatedAt: "2026-08-15T10:00:00Z",
      payments: [],
      refundSummary: null,
      shipment: null,
    });
    const addItemSpy = vi
      .spyOn(CartApi, "addItem")
      .mockImplementation(async (input) => {
        if (input.productId === 77) {
          throw new Error("Product is no longer available");
        }
        return { id: 1, status: "active", itemCount: 1, subtotal: "150.00", items: [] };
      });

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Pet Bowl")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Reorder"));

    await waitFor(() => {
      expect(addItemSpy).toHaveBeenCalledWith({ productId: 55, quantity: 1 });
      expect(addItemSpy).toHaveBeenCalledWith({ productId: 77, quantity: 1 });
      // At least one item succeeded, so the flow still completes to /cart
      // instead of reporting a full failure.
      expect(mockPush).toHaveBeenCalledWith("/cart");
    });
  });

  it("13. Clear Filters resets status/date/search and refetches the unfiltered list", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    const nonEmptyResult = {
      items: [
        {
          id: 25,
          orderNumber: "MPM-000025",
          status: "delivered",
          paymentStatus: "paid",
          fulfilmentStatus: "delivered",
          subtotal: "100.00",
          shippingFee: "0.00",
          total: "100.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-15T10:00:00Z",
          products: [{ name: "Leash", image: null }],
          shipment: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
    const listSpy = vi
      .spyOn(OrderApi, "list")
      .mockResolvedValueOnce(nonEmptyResult)
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 })
      .mockResolvedValue(nonEmptyResult);

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <AccountOrdersPage />
        </CartProvider>
      </CustomerAuthProvider>
    );

    const statusSelect = await screen.findByLabelText("Status");
    fireEvent.change(statusSelect, { target: { value: "cancelled" } });

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, status: "cancelled" });
    });

    await waitFor(() => {
      expect(screen.getByText("No orders match these filters")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Clear Filters"));

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 });
      expect(screen.getByText("Leash")).toBeInTheDocument();
    });
  });
});
