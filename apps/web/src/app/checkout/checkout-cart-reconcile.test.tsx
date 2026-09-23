// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutClient } from "./checkout-client";
import { AuthTokenStore } from "@/lib/auth/auth-api";
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

function preview(paymentMethod: "payu" | "cod") {
  return {
    readiness: { cartReady: true, addressReady: true, shippingReady: true, paymentReady: true, orderReady: true, serviceable: true },
    shippingAddress: { id: 99, recipientName: "Guest User", phone: "+91 98765 00000", line1: "123 Street", line2: null, city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "IN", latitude: null, longitude: null },
    billingAddress: null, billingSameAsShipping: true, cart: { items: cart.items },
    totals: { merchandiseSubtotal: "499.00", shippingAmount: "0.00", payableTotal: "499.00" }, paymentMethod,
    serviceability: { paymentMode: paymentMethod === "cod" ? "cod" : "prepaid", serviceable: true },
  };
}

function auth() {
  return { status: "unauthenticated", customer: null, accessToken: null, signup: vi.fn(), signin: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn(), forgotPassword: vi.fn(), verifyResetOTP: vi.fn(), resetPassword: vi.fn(), logout: vi.fn(), refreshSession: vi.fn(), loadCurrentCustomer: vi.fn() } as ReturnType<typeof CustomerAuthContext.useCustomerAuth>;
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

const cartEmptyError = (code: "ORDER_CART_EMPTY" | "CHECKOUT_CART_EMPTY") => ({
  ok: false, status: 422,
  json: async () => ({ success: false, error: { code, message: "Your cart is empty." } }),
});

describe("checkout — cart-empty reconciliation", () => {
  beforeEach(() => {
    vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue(auth());
    AuthTokenStore.setAccessToken(null);
    mockPush.mockReset();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("ORDER_CART_EMPTY on place order shows a cart message + Review Cart, and flips to the empty state", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/storefront/cart")) return { ok: true, json: async () => ({ success: true, data: cart }) } as Response;
      if (url.includes("/storefront/checkout/preview")) return { ok: true, json: async () => ({ success: true, data: preview("payu") }) } as Response;
      if (url.endsWith("/storefront/orders")) return cartEmptyError("ORDER_CART_EMPTY") as Response;
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutClient />);
    await screen.findByText("Guest Shipping Address");
    fillGuestAddress();
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/i }));

    await waitFor(() => expect(screen.getByText(/Your cart is empty\. Add an item before placing your order\./i)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /Review Cart/i })).toHaveAttribute("href", "/cart");
    // The checkout body reconciles to the authoritative empty state.
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your cart is empty" })).toBeInTheDocument());
  });

  it("CHECKOUT_CART_EMPTY from the pre-order preview is shown as a cart error, never a delivery error", async () => {
    let previewCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/storefront/cart")) return { ok: true, json: async () => ({ success: true, data: cart }) } as Response;
      if (url.includes("/storefront/checkout/preview")) {
        previewCalls += 1;
        // First preview (auto, on address completion) succeeds; the
        // authoritative re-preview at Place Order time finds the cart empty.
        if (previewCalls === 1) return { ok: true, json: async () => ({ success: true, data: preview("payu") }) } as Response;
        return cartEmptyError("CHECKOUT_CART_EMPTY") as Response;
      }
      if (url.endsWith("/storefront/orders")) throw new Error("order create must not be reached");
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutClient />);
    await screen.findByText("Guest Shipping Address");
    fillGuestAddress();
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled(), { timeout: 2000 });

    // Force the pre-order re-preview by changing the address after the first preview.
    fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "456 New Street" } });
    // The stale preview is discarded, so the CTA no longer promises a total.
    fireEvent.click(screen.getByRole("button", { name: /^Place Order/i }));

    await waitFor(() => expect(screen.getByText(/Your cart is empty\. Add an item before checking out\./i)).toBeInTheDocument());
    expect(screen.queryByText(/delivery availability/i)).not.toBeInTheDocument();
  });
});
