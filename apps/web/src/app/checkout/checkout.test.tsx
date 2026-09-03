// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutClient } from "./checkout-client";
import { AuthTokenStore } from "@/lib/auth/auth-api";
import { OrderApi } from "@/lib/order-api";
import * as CustomerAuthContext from "@/context/customer-auth-context";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/checkout",
}));

const cart = {
  id: 1, status: "active", itemCount: 1, subtotal: "499.00",
  items: [{ cartItemId: 50, productId: 20, variantId: null, productName: "Premium Dog Food", productSlug: "premium-dog-food", productType: "simple", sku: "DOG-FOOD-01", variantName: null, image: null, price: "499.00", compareAtPrice: null, quantity: 1, subtotal: "499.00", available: true, availabilityReason: null, availableQuantity: 50 }],
};

const order = {
  id: 777, orderNumber: "ORD-987654", status: "pending", paymentStatus: "pending", fulfilmentStatus: "unfulfilled", subtotal: "499.00", shippingFee: "0.00", total: "499.00", guestAccessToken: "f".repeat(64), contactEmail: "guest@example.com",
  shippingAddress: { recipientName: "Guest User", phone: "+91 98765 00000", line1: "123 Street", line2: null, city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "IN", latitude: null, longitude: null },
  items: [{ id: 1, orderId: 777, productId: 20, variantId: null, productName: "Premium Dog Food", productSku: "DOG-FOOD-01", variantName: null, variantSku: null, productImage: null, quantity: 1, unitPrice: "499.00", lineTotal: "499.00" }],
  payments: [], refundSummary: null, cancelledAt: null, placedAt: "2026-08-13T00:00:00Z", createdAt: "2026-08-13T00:00:00Z", updatedAt: "2026-08-13T00:00:00Z",
};

function preview(paymentMethod: "payu" | "cod", serviceable = true) {
  return {
    readiness: { cartReady: true, addressReady: true, shippingReady: serviceable, paymentReady: serviceable, orderReady: serviceable, serviceable },
    shippingAddress: { id: 99, recipientName: "Guest User", phone: "+91 98765 00000", line1: "123 Street", line2: null, city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "IN", latitude: null, longitude: null },
    billingAddress: null, billingSameAsShipping: true, cart: { items: cart.items },
    totals: { merchandiseSubtotal: "499.00", shippingAmount: "0.00", payableTotal: "499.00" }, paymentMethod,
    serviceability: { paymentMode: paymentMethod === "cod" ? "cod" : "prepaid", serviceable },
  };
}

function auth(status: "unauthenticated" | "authenticated" = "unauthenticated") {
  return { status, customer: status === "authenticated" ? { id: 10, name: "Customer User" } : null, accessToken: status === "authenticated" ? "customer-jwt" : null, signup: vi.fn(), signin: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn(), forgotPassword: vi.fn(), verifyResetOTP: vi.fn(), resetPassword: vi.fn(), logout: vi.fn(), refreshSession: vi.fn(), loadCurrentCustomer: vi.fn() } as ReturnType<typeof CustomerAuthContext.useCustomerAuth>;
}

function fillGuestAddress() {
  fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Guest User" } });
  fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 98765 00000" } });
  fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "123 Street" } });
  fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Mumbai" } });
  fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "Maharashtra" } });
  fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "400001" } });
  fireEvent.change(screen.getByLabelText(/Contact Email \*/i), { target: { value: "guest@example.com" } });
}

function setupFetch(options: { codServiceable?: boolean; initiateFails?: boolean; pendingError?: boolean } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/storefront/addresses")) return { ok: true, json: async () => ({ success: true, data: [{ id: 12, userId: 10, label: "Home", recipientName: "Saved User", phone: "+91 98765 00000", line1: "12 Saved Street", line2: null, city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "IN", isDefault: true, latitude: null, longitude: null }] }) } as Response;
    if (url.includes("/storefront/cart")) return { ok: true, json: async () => ({ success: true, data: cart }) } as Response;
    if (url.includes("/storefront/checkout/preview")) {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const method = body.paymentMethod === "cod" ? "cod" : "payu";
      return { ok: true, json: async () => ({ success: true, data: preview(method, method === "cod" ? options.codServiceable !== false : true) }) } as Response;
    }
    if (url.endsWith("/storefront/orders")) {
      if (options.pendingError) return { ok: false, status: 409, json: async () => ({ success: false, error: { message: "An order is already pending.", code: "ORDER_ALREADY_PENDING", details: { orderId: 777, orderNumber: order.orderNumber } } }) } as Response;
      return { ok: true, json: async () => ({ success: true, data: order }) } as Response;
    }
    if (url.includes("/storefront/payments/initiate")) {
      if (options.initiateFails) return { ok: false, status: 503, json: async () => ({ success: false, error: { message: "Payment unavailable", code: "PAYMENT_UNAVAILABLE" } }) } as Response;
      return { ok: true, json: async () => ({ success: true, data: { provider: "payu", gatewayUrl: "https://payu.example/checkout", fields: { key: "k", txnid: "t", amount: "499.00", productinfo: "Cart", firstname: "Guest", email: "guest@example.com", phone: "9876500000", surl: "http://localhost/success", furl: "http://localhost/failure", udf1: "", hash: "h" } } }) } as Response;
    }
    if (url.includes("/storefront/payments/cod")) return { ok: true, json: async () => ({ success: true, data: { provider: "cod", paymentId: 4, orderId: 777, orderStatus: "confirmed", paymentStatus: "pending", amount: "499.00", currency: "INR" } }) } as Response;
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Stage 2 consolidated checkout", () => {
  beforeEach(() => {
    vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue(auth());
    AuthTokenStore.setAccessToken(null);
    mockPush.mockReset();
    vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => undefined);
    window.sessionStorage.clear();
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("automatically previews a valid inline address without a Verify button", async () => {
    const fetchMock = setupFetch(); render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("checkout/preview"))).toHaveLength(1), { timeout: 2000 });
    expect(screen.queryByRole("button", { name: /Verify & Preview/i })).not.toBeInTheDocument();
    expect(screen.getByText("✓ Delivery available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled();
    const body = JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).includes("checkout/preview"))?.[1]?.body));
    expect(body.paymentMethod).toBe("payu");
  });

  it("automatically previews the authenticated customer's selected saved address", async () => {
    vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue(auth("authenticated"));
    AuthTokenStore.setAccessToken("customer-jwt");
    const fetchMock = setupFetch(); render(<CheckoutClient />);
    await waitFor(() => expect(screen.getByText("Saved User")).toBeInTheDocument());
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("checkout/preview"))).toHaveLength(1));
    const body = JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).includes("checkout/preview"))?.[1]?.body));
    expect(body.savedAddressId).toBe(12);
    expect(body.paymentMethod).toBe("payu");
    expect(screen.queryByRole("button", { name: /Verify & Preview/i })).not.toBeInTheDocument();
  });

  it("re-previews when payment method changes and blocks unavailable COD", async () => {
    const fetchMock = setupFetch({ codServiceable: false }); render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("checkout/preview"))).toHaveLength(1), { timeout: 2000 });
    fireEvent.click(screen.getByRole("radio", { name: /Cash on Delivery/i }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("checkout/preview"))).toHaveLength(2), { timeout: 2000 });
    expect(screen.getByText(/Cash on Delivery is not available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Place Order$/i })).toBeDisabled();
    const bodies = fetchMock.mock.calls.filter(([url]) => String(url).includes("checkout/preview")).map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies.at(-1).paymentMethod).toBe("cod");
  });

  it("creates one PayU Order with paymentMethod and starts hosted payment automatically", async () => {
    const fetchMock = setupFetch(); render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/i }));
    await waitFor(() => expect(screen.getByText(/Order #ORD-987654/i)).toBeInTheDocument());
    const orderCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/storefront/orders"));
    expect(orderCalls).toHaveLength(1); expect(JSON.parse(String(orderCalls[0][1]?.body)).paymentMethod).toBe("payu");
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("payments/initiate"))).toHaveLength(1));
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).includes("payments/initiate"))?.[1]?.body)).guestAccessToken).toBe(order.guestAccessToken);
    expect(window.sessionStorage.getItem("mypetmart_pending_guest_payment_token")).toBe(order.guestAccessToken);
  });

  it("creates and confirms a COD Order from the same CTA", async () => {
    const fetchMock = setupFetch(); render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("radio", { name: /Cash on Delivery/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Place Order$/i })).not.toBeDisabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /^Place Order$/i }));
    await waitFor(() => expect(screen.getByText("Order confirmed")).toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/storefront/orders"))).toHaveLength(1);
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).endsWith("/storefront/orders"))?.[1]?.body)).paymentMethod).toBe("cod");
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("payments/cod"))).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Confirm Cash on Delivery Order/i })).not.toBeInTheDocument();
  });

  it("preserves the created Order and offers Retry Payment when PayU initiation fails", async () => {
    const fetchMock = setupFetch({ initiateFails: true }); render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Retry Payment/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(/payment could not be started/i).length).toBeGreaterThan(0));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/storefront/orders"))).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Retry Payment/i }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("payments/initiate"))).toHaveLength(2));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/storefront/orders"))).toHaveLength(1);
  });

  it("does not create a second Order on a rapid double click", async () => {
    const fetchMock = setupFetch(); render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled(), { timeout: 2000 });
    const button = screen.getByRole("button", { name: /Place Order & Pay/i }); fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/storefront/orders"))).toHaveLength(1));
  });

  it("does not let an older preview response overwrite the latest address", async () => {
    const resolvers: Array<() => void> = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/storefront/cart")) return Promise.resolve({ ok: true, json: async () => ({ success: true, data: cart }) } as Response);
      if (url.includes("/storefront/checkout/preview")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const serviceable = body.shippingAddress?.postalCode === "600034";
        return new Promise<Response>((resolve) => {
          resolvers.push(() => resolve({ ok: true, json: async () => ({ success: true, data: preview(body.paymentMethod, serviceable) }) } as Response));
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(resolvers).toHaveLength(1), { timeout: 2000 });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "600034" } });
    await waitFor(() => expect(resolvers).toHaveLength(2), { timeout: 3000 });
    resolvers[1]();
    await waitFor(() => expect(screen.getByText("✓ Delivery available")).toBeInTheDocument());
    resolvers[0]();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("✓ Delivery available")).toBeInTheDocument();
  });
  it("turns ORDER_ALREADY_PENDING into a recoverable card and re-previews after cancellation without creating a new Order", async () => {
    vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue(auth("authenticated"));
    AuthTokenStore.setAccessToken("customer-jwt");
    const fetchMock = setupFetch({ pendingError: true });
    const cancelSpy = vi.spyOn(OrderApi, "cancelPendingOrder").mockResolvedValue({ ...order, status: "cancelled", cancelledAt: "2026-08-14T11:00:00Z" } as never);

    render(<CheckoutClient />);
    await waitFor(() => expect(screen.getByText("Saved User")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/i }));

    await waitFor(() => {
      expect(screen.getByText("You have an unfinished order")).toBeInTheDocument();
      expect(screen.getByText("Order #ORD-987654 still has a pending payment.")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Complete Payment" })).toHaveAttribute("href", "/account/orders/777");

    fireEvent.click(screen.getByRole("button", { name: "Cancel Order & Continue" }));
    expect(screen.getByRole("heading", { name: "Cancel this unfinished order?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("dialog").querySelector("button[data-cancel-dialog-autofocus]") as HTMLButtonElement);

    await waitFor(() => expect(cancelSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("checkout/preview"))).toHaveLength(2));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/storefront/orders"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled();
  });
});
