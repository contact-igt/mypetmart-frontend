// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutClient } from "./checkout-client";
import { AuthTokenStore } from "@/lib/auth/auth-api";
import * as CustomerAuthContext from "@/context/customer-auth-context";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/checkout",
}));

type Method = "payu" | "cod";
const item = { cartItemId: 50, productId: 20, variantId: null, productName: "Premium Dog Food", productSlug: "premium-dog-food", productType: "simple", sku: "DOG-FOOD-01", variantName: null, image: null, price: "1000.00", compareAtPrice: null, quantity: 1, subtotal: "1000.00", available: true, availabilityReason: null, availableQuantity: 50 };
const cart = { id: 1, status: "active", itemCount: 1, subtotal: "1000.00", items: [item], coupon: null };

// The backend decides allowedPaymentMethods; these tests only check the UI obeys it.
function preview(method: Method, allowed: Method[], extra: Record<string, unknown> = {}) {
  const allowedHere = allowed.includes(method);
  return {
    readiness: { cartReady: true, addressReady: true, shippingReady: allowedHere, paymentReady: allowedHere, orderReady: allowedHere, serviceable: allowedHere },
    shippingAddress: { id: 99, recipientName: "Guest User", phone: "+91 98765 00000", line1: "123 Street", line2: null, city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "IN", latitude: null, longitude: null },
    billingAddress: null, billingSameAsShipping: true, cart: { items: [item] },
    totals: { merchandiseSubtotal: "1000.00", eligibleMerchandiseSubtotal: "0.00", shippingAmount: "0.00", totalBeforeDiscount: "1000.00", discountAmount: "0.00", payableTotal: "1000.00" },
    coupon: null, paymentMethod: method, allowedPaymentMethods: allowed, paymentMethodConflict: null, paymentMethodMessage: null,
    serviceability: allowedHere ? { paymentMode: method === "cod" ? "cod" : "prepaid", serviceable: true } : null,
    ...extra,
  };
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

function stubFetch(previewFor: (method: Method) => unknown) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/storefront/cart")) return { ok: true, json: async () => ({ success: true, data: cart }) } as Response;
    if (url.includes("/storefront/checkout/preview")) {
      const method: Method = JSON.parse(String(init?.body ?? "{}")).paymentMethod === "cod" ? "cod" : "payu";
      return { ok: true, json: async () => ({ success: true, data: previewFor(method) }) } as Response;
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const previewMethods = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes("checkout/preview")).map(([, init]) => JSON.parse(String(init?.body)).paymentMethod);

describe("Checkout product payment-method availability", () => {
  beforeEach(() => {
    vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({ status: "unauthenticated", customer: null, accessToken: null } as unknown as ReturnType<typeof CustomerAuthContext.useCustomerAuth>);
    AuthTokenStore.setAccessToken(null);
    window.sessionStorage.clear();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  async function renderAndPreview(fetchMock: ReturnType<typeof stubFetch>, count = 1) {
    render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(previewMethods(fetchMock).length).toBeGreaterThanOrEqual(count), { timeout: 2000 });
  }

  it("shows both methods enabled when the cart allows both", async () => {
    const fetchMock = stubFetch((m) => preview(m, ["payu", "cod"]));
    await renderAndPreview(fetchMock);
    await waitFor(() => expect(screen.getByRole("button", { name: /Place Order & Pay/i })).not.toBeDisabled(), { timeout: 2000 });
    expect(screen.getByRole("radio", { name: /Pay Online/i })).not.toBeDisabled();
    expect(screen.getByRole("radio", { name: /Cash on Delivery/i })).not.toBeDisabled();
  });

  it("PayU-only cart: COD is disabled with an explanation and PayU stays selectable", async () => {
    const fetchMock = stubFetch((m) => preview(m, ["payu"]));
    await renderAndPreview(fetchMock);
    await waitFor(() => expect(screen.getByRole("radio", { name: /Cash on Delivery/i })).toBeDisabled(), { timeout: 2000 });
    expect(screen.getByText("Cash on Delivery is not available for one or more products in your cart.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Pay Online/i })).toBeChecked();
  });

  it("COD-only cart: auto-switches from PayU to COD, re-previews once for COD, and never loops back", async () => {
    const fetchMock = stubFetch((m) => preview(m, ["cod"]));
    await renderAndPreview(fetchMock);
    await waitFor(() => expect(screen.getByRole("radio", { name: /Cash on Delivery/i })).toBeChecked(), { timeout: 2000 });
    await waitFor(() => expect(previewMethods(fetchMock)).toEqual(["payu", "cod"]), { timeout: 2000 });
    expect(screen.getByRole("radio", { name: /Pay Online/i })).toBeDisabled();
    expect(screen.getByText("Online payment is not available for one or more products in your cart.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(previewMethods(fetchMock)).toEqual(["payu", "cod"]);
    expect(screen.getByRole("button", { name: /^Place Order$/i })).not.toBeDisabled();
  });

  it("conflicting cart blocks checkout with the conflict message and no method auto-selected", async () => {
    const conflict = { code: "PAYMENT_METHOD_CONFLICT", message: "Some items in your cart require different payment methods. Please purchase them separately.", incompatibleItems: [] };
    const fetchMock = stubFetch((m) => preview(m, [], { paymentMethodConflict: conflict, paymentMethodMessage: conflict.message }));
    await renderAndPreview(fetchMock);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(conflict.message), { timeout: 2000 });
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeDisabled();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(previewMethods(fetchMock)).toEqual(["payu"]);
  });

  it("never shows a coupon saving CTA for a method the cart's products cannot use", async () => {
    const coupon = { code: "PREPAID100", eligible: false, message: "This coupon is valid only for Prepaid (Pay Online).", alternativeSaving: { eligiblePaymentMethod: "payu", discountAmountPaise: 10000, code: "PREPAID100" } };
    const fetchMock = stubFetch((m) => preview(m, ["cod"], { coupon }));
    await renderAndPreview(fetchMock);
    await waitFor(() => expect(screen.getByRole("radio", { name: /Cash on Delivery/i })).toBeChecked(), { timeout: 2000 });
    await waitFor(() => expect(previewMethods(fetchMock)).toEqual(["payu", "cod"]), { timeout: 2000 });
    expect(screen.queryByRole("button", { name: /Pay Online & Save/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/by paying online/i)).not.toBeInTheDocument();
  });
});
