// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CheckoutClient } from "./checkout-client";
import { AuthTokenStore } from "@/lib/auth/auth-api";
import * as CustomerAuthContext from "@/context/customer-auth-context";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/checkout",
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

const mockCartResponse = {
  id: 1,
  status: "active",
  itemCount: 1,
  subtotal: "499.00",
  items: [
    {
      cartItemId: 50,
      productId: 20,
      variantId: null,
      productName: "Premium Dog Food",
      productSlug: "premium-dog-food",
      productType: "simple",
      sku: "DOG-FOOD-01",
      variantName: null,
      image: null,
      price: "499.00",
      compareAtPrice: null,
      quantity: 1,
      subtotal: "499.00",
      available: true,
      availabilityReason: null,
      availableQuantity: 50,
    },
  ],
};

const mockPreviewResponse = {
  readiness: { cartReady: true, addressReady: true, orderReady: false },
  shippingAddress: {
    id: 99,
    recipientName: "Jordan Rivera",
    city: "Mumbai",
  },
  billingAddress: null,
  billingSameAsShipping: true,
  cart: {
    items: [
      {
        cartItemId: 50,
        productId: 20,
        variantId: null,
        productName: "Premium Dog Food",
        price: "499.00",
        quantity: 1,
        available: true,
        availabilityReason: null,
        availableQuantity: 50,
      },
    ],
  },
  totals: {
    merchandiseSubtotal: "499.00",
    shippingAmount: null,
    payableTotal: "499.00",
  },
};

const mockCreatedOrderResponse = {
  id: 777,
  orderNumber: "ORD-987654",
  status: "pending",
  paymentStatus: "pending",
  fulfilmentStatus: "unfulfilled",
  subtotal: "499.00",
  shippingFee: "0.00",
  total: "499.00",
  guestAccessToken: "f".repeat(64),
  shippingAddress: {
    recipientName: "Jordan Rivera",
    phone: "+91 98765 43210",
    line1: "221B Baker Street",
    line2: null,
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "IN",
    latitude: 19.076,
    longitude: 72.8777,
  },
  items: [
    {
      id: 1,
      orderId: 777,
      productId: 20,
      variantId: null,
      productName: "Premium Dog Food",
      productSku: "DOG-FOOD-01",
      variantSku: null,
      unitPrice: "499.00",
      quantity: 1,
      lineTotal: "499.00",
      imageUrl: null,
      imageAlt: null,
    },
  ],
  createdAt: "2026-08-13T00:00:00Z",
  updatedAt: "2026-08-13T00:00:00Z",
};

describe("Checkout Order Handoff Tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------
  // GUEST FLOW TESTS (1-5)
  // -------------------------------------------------------------------
  describe("Guest Order Flow", () => {
    beforeEach(() => {
      vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({
        status: "unauthenticated",
        customer: null,
        accessToken: null,
        signup: vi.fn(),
        signin: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetOTP: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        loadCurrentCustomer: vi.fn(),
      });
    });

    it("1. Guest successful Preview enables Place Order button", async () => {
      vi.mocked(fetch)
        // GET /cart
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        // POST /checkout/preview
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        const placeOrderBtn = screen.getByRole("button", { name: /Place Order/i });
        expect(placeOrderBtn).not.toBeDisabled();
      });
    });

    it("2 & 3. Guest Place Order sends shippingAddress with selected coordinates", async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        // GET /cart
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        // POST /checkout/preview
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // POST /orders
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCreatedOrderResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        const orderCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/storefront/orders"));
        expect(orderCall).toBeDefined();
        const payload = JSON.parse(orderCall![1]?.body as string);

        // Verify shippingAddress payload format (manual address without coordinates)
        expect(payload.shippingAddress).toBeDefined();
        expect(payload.savedAddressId).toBeUndefined();
        expect(payload.placeId).toBeUndefined();
        expect(payload.formattedAddress).toBeUndefined();
        expect("latitude" in payload.shippingAddress).toBe(false);
        expect("longitude" in payload.shippingAddress).toBe(false);
        expect(payload.shippingAddress.recipientName).toBe("Guest User");
      });
    });

    it("4. Guest Order success shows pending Order state and note order number warning", async () => {
      vi.mocked(fetch)
        // GET /cart
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        // POST /checkout/preview
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // POST /orders
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCreatedOrderResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Jordan Rivera" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 43210" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "221B Baker Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "Maharashtra" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText(/Order #ORD-987654/i)).toBeInTheDocument();
        expect(screen.getByText(/Please note your order number/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Proceed to Payment/i })).toBeInTheDocument();
      });

      const viewOrderLink = screen.getByRole("link", { name: /View Order/i });
      expect(viewOrderLink).toHaveAttribute("href", `/order/guest/${"f".repeat(64)}`);
    });

    it("4b. Guest Order success without a guestAccessToken shows no View Order link", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { ...mockCreatedOrderResponse, guestAccessToken: undefined } }),
        } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Jordan Rivera" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 43210" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "221B Baker Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "Maharashtra" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText(/Order #ORD-987654/i)).toBeInTheDocument();
      });
      expect(screen.queryByRole("link", { name: /View Order/i })).not.toBeInTheDocument();
    });

    it("5. Guest rapid double-click issues only one POST request", async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        // GET /cart
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        // POST /checkout/preview
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // POST /orders (delayed response)
        .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: mockCreatedOrderResponse })
        } as any), 100)));

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      const btn = screen.getByRole("button", { name: /Place Order/i });
      // Rapid double click
      fireEvent.click(btn);
      fireEvent.click(btn);

      await waitFor(() => {
        const orderCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("/storefront/orders"));
        expect(orderCalls).toHaveLength(1);
      });
    });
  });

  // -------------------------------------------------------------------
  // CUSTOMER SAVED ADDRESS FLOW TESTS (6-7)
  // -------------------------------------------------------------------
  describe("Customer Saved Address Flow", () => {
    beforeEach(() => {
      AuthTokenStore.setAccessToken("customer-jwt");
      vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({
        status: "authenticated",
        customer: { id: 10, name: "Customer User" } as any,
        accessToken: "customer-jwt",
        signup: vi.fn(),
        signin: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetOTP: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        loadCurrentCustomer: vi.fn(),
      });
    });

    it("6 & 7. Customer saved Address sends savedAddressId only (no shippingAddress)", async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        // 1. GET /cart
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        // 2. GET /addresses
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 99,
                userId: 10,
                label: "Home",
                recipientName: "Jordan Rivera",
                phone: "+91 98765 43210",
                line1: "221B Baker Street",
                line2: null,
                city: "Mumbai",
                state: "Maharashtra",
                postalCode: "400001",
                country: "IN",
                isDefault: true,
              },
            ],
          }),
        } as any)
        // 3. POST /checkout/preview
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // 4. POST /orders
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCreatedOrderResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Checkout Readiness Status")).toBeInTheDocument();
      });

      const placeOrderBtn = screen.getByRole("button", { name: /Place Order/i });
      expect(placeOrderBtn).not.toBeDisabled();

      fireEvent.click(placeOrderBtn);

      await waitFor(() => {
        const orderCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/storefront/orders"));
        expect(orderCall).toBeDefined();
        const payload = JSON.parse(orderCall![1]?.body as string);

        expect(payload).toEqual({ savedAddressId: 99 });
        expect(payload.shippingAddress).toBeUndefined();
      });
    });
  });

  // -------------------------------------------------------------------
  // CUSTOMER SAVE-NEW ADDRESS FLOW TESTS (8-13)
  // -------------------------------------------------------------------
  describe("Customer Save-New Address Sequence", () => {
    beforeEach(() => {
      AuthTokenStore.setAccessToken("customer-jwt");
      vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({
        status: "authenticated",
        customer: { id: 10, name: "Customer User" } as any,
        accessToken: "customer-jwt",
        signup: vi.fn(),
        signin: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetOTP: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        loadCurrentCustomer: vi.fn(),
      });
    });

    it("10-13. Save-New Address calls AddressApi.create once -> preview uses savedAddressId -> Place Order uses same savedAddressId", async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        // 1. GET /cart
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        // 2. GET /addresses (empty)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) } as any)
        // 3. POST /addresses (create)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 205, recipientName: "New Saved User", city: "Mumbai" },
          }),
        } as any)
        // 4. POST /checkout/preview (with savedAddressId: 205)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // 5. GET /addresses (re-fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: 205, recipientName: "New Saved User", city: "Mumbai" }],
          }),
        } as any)
        // 6. POST /orders
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCreatedOrderResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("New Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "New Saved User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 99999 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "100 New St" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400002" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        // Address creation call happened exactly once (call #3)
        const addressCreateCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/storefront/addresses") && c[1]?.method === "POST");
        expect(addressCreateCalls).toHaveLength(1);

        // Order creation call (call #6) used savedAddressId: 205
        const orderCall = fetchMock.mock.calls.find((c) => String(c[0]).includes("/storefront/orders"));
        expect(orderCall).toBeDefined();
        const orderPayload = JSON.parse(orderCall![1]?.body as string);
        expect(orderPayload).toEqual({ savedAddressId: 205 });
      });
    });
  });

  // -------------------------------------------------------------------
  // STALE PREVIEW TESTS (14-15)
  // -------------------------------------------------------------------
  describe("Stale Preview Protection", () => {
    beforeEach(() => {
      vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({
        status: "unauthenticated",
        customer: null,
        accessToken: null,
        signup: vi.fn(),
        signin: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetOTP: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        loadCurrentCustomer: vi.fn(),
      });
    });

    it("14 & 15. Changing address form field invalidates preview and disables Place Order button", async () => {
      vi.mocked(fetch)
        // GET /cart
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        // POST /checkout/preview
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      // Modify form after preview
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "999 Modified Street" } });

      // Place Order button becomes disabled immediately
      expect(screen.getByRole("button", { name: /Place Order/i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------
  // BACKEND ERROR HANDLING TESTS (16-22)
  // -------------------------------------------------------------------
  describe("Backend Error Mapping", () => {
    beforeEach(() => {
      vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({
        status: "unauthenticated",
        customer: null,
        accessToken: null,
        signup: vi.fn(),
        signin: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetOTP: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        loadCurrentCustomer: vi.fn(),
      });
    });

    it("16-20. Maps cart & address errors into clear messages with Review Cart action", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // 422 ORDER_INSUFFICIENT_STOCK
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({ success: false, error: { code: "ORDER_INSUFFICIENT_STOCK", message: "Insufficient stock" } }),
        } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText("Some items no longer have enough stock. Review your cart.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Review Cart →/i })).toBeInTheDocument();
      });
    });

    it("21. Handles 409 ORDER_ALREADY_PENDING without auto retry", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // 409 ORDER_ALREADY_PENDING
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({ success: false, error: { code: "ORDER_ALREADY_PENDING", message: "Already pending" } }),
        } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText("You already have a pending order.")).toBeInTheDocument();
      });
    });

    it("22. Network uncertainty displays cautious message without automatic retry", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        // Network failure
        .mockRejectedValueOnce(new TypeError("Failed to fetch"));

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "MH" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText(/Order Status Unknown/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Place Order/i })).toBeDisabled();
      });
    });
  });

  // -------------------------------------------------------------------
  // CART PRESERVATION & PAYMENT BOUNDARY TESTS (23-25)
  // -------------------------------------------------------------------
  describe("Cart & Payment Boundaries", () => {
    beforeEach(() => {
      vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({
        status: "unauthenticated",
        customer: null,
        accessToken: null,
        signup: vi.fn(),
        signin: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetOTP: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        loadCurrentCustomer: vi.fn(),
      });
    });

    it("23-25. Order creation leaves Cart intact and does NOT invoke payment APIs", async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCreatedOrderResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Jordan Rivera" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 43210" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "221B Baker Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "Maharashtra" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText(/Order #ORD-987654/i)).toBeInTheDocument();
      });

      // Confirm DELETE /cart or clear cart was NOT called
      const cartDeleteCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("/storefront/cart") && call[1]?.method === "DELETE");
      expect(cartDeleteCalls).toHaveLength(0);

      // Confirm no payment route was called
      const paymentCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("/payment") || String(call[0]).includes("/payu"));
      expect(paymentCalls).toHaveLength(0);
    });

    it("26. ORDER_ALREADY_PENDING error shows View Pending Order link when details.orderId is provided, or View My Orders link otherwise", async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            success: false,
            error: {
              code: "ORDER_ALREADY_PENDING",
              message: "Order 'ORD-000555' is already pending payment.",
              details: { orderId: 555, orderNumber: "ORD-000555" },
            },
          }),
        } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByText("Guest Shipping Address")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Jordan Rivera" } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 43210" } });
      fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "221B Baker Street" } });
      fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
      fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "Maharashtra" } });
      fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
      fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });

      fireEvent.click(screen.getByRole("button", { name: /Verify & Preview Address/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText("You already have a pending order.")).toBeInTheDocument();
        const link = screen.getByText(/View Pending Order/i).closest("a");
        expect(link).toHaveAttribute("href", "/account/orders/555");
      });
    });

    it("27. Successful customer order creation shows View Order CTA link", async () => {
      vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({
        status: "authenticated",
        customer: { id: 1, name: "Authenticated Customer", email: "auth@example.com", referenceCode: "CUS-001" } as any,
        accessToken: "test-token",
        signin: vi.fn(),
        signup: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetOTP: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        loadCurrentCustomer: vi.fn(),
      });

      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCartResponse }) } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 10,
                recipientName: "Auth Customer",
                phone: "+91 98765 43210",
                line1: "100 Tech Park",
                city: "Bangalore",
                state: "KA",
                postalCode: "560001",
                country: "IN",
                isDefault: true,
              },
            ],
          }),
        } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPreviewResponse }) } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockCreatedOrderResponse }) } as any);

      render(<CheckoutClient />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Place Order/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

      await waitFor(() => {
        expect(screen.getByText(/Order #ORD-987654/i)).toBeInTheDocument();
        const viewOrderLink = screen.getByText("View Order").closest("a");
        expect(viewOrderLink).toHaveAttribute("href", "/account/orders/777");
      });
    });
  });
});
