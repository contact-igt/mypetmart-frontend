// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AccountOrdersPage from "./page";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { OrderApi } from "@/lib/order-api";
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. Redirects unauthenticated customer to /signin", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue(null);

    render(
      <CustomerAuthProvider>
        <AccountOrdersPage />
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
        <AccountOrdersPage />
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
        <AccountOrdersPage />
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
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <CustomerAuthProvider>
        <AccountOrdersPage />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("#MPM-000010")).toBeInTheDocument();
      expect(screen.getByText("₹1049.00")).toBeInTheDocument();
      expect(screen.getByText("confirmed")).toBeInTheDocument();
      expect(screen.getByText("paid")).toBeInTheDocument();
      expect(screen.getByText("processing")).toBeInTheDocument();
      const viewLink = screen.getByText(/View Order/i).closest("a");
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
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <CustomerAuthProvider>
        <AccountOrdersPage />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("#MPM-000011")).toBeInTheDocument();
      expect(screen.getByText("Pending Payment Setup")).toBeInTheDocument();
      expect(screen.getAllByText("pending")[0]).toBeInTheDocument();
      expect(screen.getByText("unfulfilled")).toBeInTheDocument();
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
        },
      ],
      total: 15,
      page: 1,
      pageSize: 10,
      totalPages: 2,
    });

    render(
      <CustomerAuthProvider>
        <AccountOrdersPage />
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
        <AccountOrdersPage />
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
});
