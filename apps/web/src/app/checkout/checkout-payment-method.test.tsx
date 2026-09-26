// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutClient } from "./checkout-client";
import { AuthTokenStore } from "@/lib/auth/auth-api";
import * as CustomerAuthContext from "@/context/customer-auth-context";
import * as CartContextModule from "@/context/cart-context";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/checkout",
}));

const item = { cartItemId: 50, productId: 20, variantId: null, productName: "Premium Dog Food", productSlug: "premium-dog-food", productType: "simple", sku: "DOG-FOOD-01", variantName: null, image: null, price: "1000.00", compareAtPrice: null, quantity: 1, subtotal: "1000.00", available: true, availabilityReason: null, availableQuantity: 50 };
const couponCart = { id: 1, status: "active", itemCount: 1, subtotal: "1000.00", items: [item], coupon: { code: "PREPAID100", eligible: true, discountAmount: "100.00", eligibleMerchandiseSubtotal: "1000.00", message: null } };
const emptyNextCart = { id: 1, status: "active", itemCount: 0, subtotal: "0.00", items: [], coupon: null };

// PREPAID100 is PayU-only: PayU gets ₹100 off; COD gets ₹0 plus a
// backend-computed alternative saving.
function preview(paymentMethod: "payu" | "cod") {
  const payu = paymentMethod === "payu";
  return {
    readiness: { cartReady: true, addressReady: true, shippingReady: true, paymentReady: true, orderReady: true, serviceable: true },
    shippingAddress: { id: 99, recipientName: "Guest User", phone: "+91 98765 00000", line1: "123 Street", line2: null, city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "IN", latitude: null, longitude: null },
    billingAddress: null, billingSameAsShipping: true, cart: { items: [item] },
    totals: { merchandiseSubtotal: "1000.00", eligibleMerchandiseSubtotal: "1000.00", shippingAmount: "0.00", totalBeforeDiscount: "1000.00", discountAmount: payu ? "100.00" : "0.00", payableTotal: payu ? "900.00" : "1000.00" },
    coupon: payu
      ? { code: "PREPAID100", eligible: true, message: null }
      : { code: "PREPAID100", eligible: false, message: "This coupon is valid only for Prepaid (Pay Online).", alternativeSaving: { eligiblePaymentMethod: "payu", discountAmountPaise: 10000, code: "PREPAID100" } },
    paymentMethod,
    serviceability: { paymentMode: payu ? "prepaid" : "cod", serviceable: true },
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

const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) }) as Response;

describe("Checkout payment-method coupon state", () => {
  beforeEach(() => {
    vi.spyOn(CustomerAuthContext, "useCustomerAuth").mockReturnValue({ status: "unauthenticated", customer: null, accessToken: null } as unknown as ReturnType<typeof CustomerAuthContext.useCustomerAuth>);
    AuthTokenStore.setAccessToken(null);
    window.sessionStorage.clear();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("a late PayU preview never overwrites the COD selection that replaced it", async () => {
    const pending: Array<{ method: string; resolve: () => void }> = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/storefront/cart")) return Promise.resolve(ok(couponCart));
      if (url.includes("/storefront/checkout/preview")) {
        const method = JSON.parse(String(init?.body ?? "{}")).paymentMethod === "cod" ? "cod" : "payu";
        return new Promise<Response>((resolve) => pending.push({ method, resolve: () => resolve(ok(preview(method))) }));
      }
      throw new Error(`Unexpected request: ${url}`);
    }));

    render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    await waitFor(() => expect(pending.map((p) => p.method)).toEqual(["payu"]), { timeout: 2000 });

    fireEvent.click(screen.getByRole("radio", { name: /Cash on Delivery/i }));
    await waitFor(() => expect(pending.map((p) => p.method)).toEqual(["payu", "cod"]), { timeout: 2000 });

    pending[1]!.resolve(); // current COD preview arrives first
    const saveCta = await screen.findAllByRole("button", { name: /Pay Online & Save ₹100\.00/i });
    expect(saveCta.length).toBeGreaterThan(0);

    pending[0]!.resolve(); // stale PayU preview arrives late
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByRole("radio", { name: /Cash on Delivery/i })).toBeChecked();
    expect(screen.queryByText("-₹100.00")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Pay Online & Save ₹100\.00/i }).length).toBeGreaterThan(0);
  });

  it("after a successful COD order the checkout pushes the authoritative next cart (coupon null) into CartContext", async () => {
    const applyServerCart = vi.fn();
    vi.spyOn(CartContextModule, "useOptionalCart").mockReturnValue({ applyServerCart, refresh: vi.fn(async () => true), markAuthoritativelyEmpty: vi.fn() } as unknown as ReturnType<typeof CartContextModule.useOptionalCart>);
    let codConfirmed = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/storefront/cart")) return ok(codConfirmed ? emptyNextCart : { ...couponCart, coupon: { code: "BOTH10", eligible: true, discountAmount: "100.00", eligibleMerchandiseSubtotal: "1000.00", message: null } });
      if (url.includes("/storefront/checkout/preview")) {
        const method = JSON.parse(String(init?.body ?? "{}")).paymentMethod === "cod" ? "cod" : "payu";
        return ok({ ...preview(method), coupon: { code: "BOTH10", eligible: true, message: null }, totals: { ...preview("payu").totals } });
      }
      if (url.endsWith("/storefront/orders")) return ok({ id: 777, orderNumber: "ORD-1", status: "pending", paymentStatus: "pending", fulfilmentStatus: "unfulfilled", subtotal: "1000.00", shippingFee: "0.00", total: "900.00", guestAccessToken: "f".repeat(64), contactEmail: "guest@example.com", shippingAddress: preview("cod").shippingAddress, items: [], payments: [], refundSummary: null, cancelledAt: null, placedAt: "2026-09-25T00:00:00Z", createdAt: "2026-09-25T00:00:00Z", updatedAt: "2026-09-25T00:00:00Z" });
      if (url.includes("/storefront/payments/cod")) { codConfirmed = true; return ok({ provider: "cod", paymentId: 4, orderId: 777, orderStatus: "confirmed", paymentStatus: "pending", amount: "900.00", currency: "INR" }); }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutClient />); await screen.findByText("Guest Shipping Address"); fillGuestAddress();
    fireEvent.click(screen.getByRole("radio", { name: /Cash on Delivery/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Place Order$/i })).not.toBeDisabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /^Place Order$/i }));
    await waitFor(() => expect(screen.getByText("Order confirmed")).toBeInTheDocument());

    await waitFor(() => expect(applyServerCart).toHaveBeenLastCalledWith(expect.objectContaining({ coupon: null, itemCount: 0 })));
    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calls.lastIndexOf(calls.find((u) => u.includes("/storefront/cart"))!)).toBeGreaterThan(calls.findIndex((u) => u.includes("payments/cod")));
  });
});
