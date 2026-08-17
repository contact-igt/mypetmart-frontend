// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PaymentResultClient } from "./payment-result-client";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { AuthApi, AuthTokenStore } from "@/lib/auth/auth-api";
import { storeGuestPaymentToken, readGuestPaymentToken } from "../guest-payment-token";
import * as CartContextModule from "@/context/cart-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/order/payment/result",
}));

const mockRefresh = vi.fn();
vi.mock("@/context/cart-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/context/cart-context")>();
  return {
    ...actual,
    useCart: vi.fn(() => ({ refresh: mockRefresh })),
  };
});

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

describe("PaymentResultClient (real backend reconciliation, never trusts the browser return alone)", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows a verifying state before the status call resolves", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue(null);
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // never resolves

    render(
      <CustomerAuthProvider>
        <PaymentResultClient status="success" txnid="PAY-000123" orderId="42" />
      </CustomerAuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/Verifying your payment/i)).toBeInTheDocument());
  });

  it("an authenticated customer's status call queries by orderId and renders the confirmed success state, never trusting the URL status param alone", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/storefront/payments/status")) {
        return Promise.resolve(
          jsonResponse({ success: true, data: { paymentStatus: "paid", orderId: 42, orderStatus: "confirmed", amount: "500.00", currency: "INR", commerceException: null } })
        );
      }
      return Promise.resolve(jsonResponse({ success: true, data: null }));
    });

    render(
      <CustomerAuthProvider>
        {/* Deliberately pass a "failure" display hint from the URL — the resolved state must still win. */}
        <PaymentResultClient status="failure" txnid="PAY-000123" orderId="42" />
      </CustomerAuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/Payment confirmed/i)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /View Order Status/i })).toHaveAttribute("href", "/account/orders/42");

    const statusCall = vi.mocked(fetch).mock.calls.find((call) => String(call[0]).includes("/storefront/payments/status"));
    expect(statusCall).toBeDefined();
    const requestBody = JSON.parse(String(statusCall?.[1]?.body));
    expect(requestBody).toEqual({ orderId: 42 });
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders the failed state with a retry action, and does not treat a stale success hint as authoritative", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/storefront/payments/status")) {
        return Promise.resolve(
          jsonResponse({ success: true, data: { paymentStatus: "failed", orderId: 42, orderStatus: "pending", amount: "500.00", currency: "INR", commerceException: null } })
        );
      }
      return Promise.resolve(jsonResponse({ success: true, data: null }));
    });

    render(
      <CustomerAuthProvider>
        <PaymentResultClient status="success" txnid="PAY-000123" orderId="42" />
      </CustomerAuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/Payment failed/i)).toBeInTheDocument());
    expect(screen.queryByText(/Payment confirmed/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Proceed to Payment/i })).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("renders the pending state with a manual recheck action, not an automatic retry loop", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/storefront/payments/status")) {
        return Promise.resolve(
          jsonResponse({ success: true, data: { paymentStatus: "pending", orderId: 42, orderStatus: "pending", amount: "500.00", currency: "INR", commerceException: null } })
        );
      }
      return Promise.resolve(jsonResponse({ success: true, data: null }));
    });

    render(
      <CustomerAuthProvider>
        <PaymentResultClient status="success" txnid="PAY-000123" orderId="42" />
      </CustomerAuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/still processing/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Check Again/i })).toBeInTheDocument();
  });

  it("surfaces a captured-but-unresolved commerce exception distinctly from a normal success", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue("test-token");
    vi.spyOn(AuthApi, "getMe").mockResolvedValue({ id: 1, name: "Test Customer" });
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/storefront/payments/status")) {
        return Promise.resolve(
          jsonResponse({ success: true, data: { paymentStatus: "paid", orderId: 42, orderStatus: "pending", amount: "500.00", currency: "INR", commerceException: "inventory_unavailable" } })
        );
      }
      return Promise.resolve(jsonResponse({ success: true, data: null }));
    });

    render(
      <CustomerAuthProvider>
        <PaymentResultClient status="success" txnid="PAY-000123" orderId="42" />
      </CustomerAuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/We need to finalize your order manually/i)).toBeInTheDocument());
    expect(screen.queryByText(/Payment confirmed/i)).not.toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("a guest with no bridged recovery token in this browser tab cannot be reconciled, and no backend call is made", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue(null);

    render(
      <CustomerAuthProvider>
        <PaymentResultClient status="success" txnid="PAY-000123" orderId="42" />
      </CustomerAuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/Payment status is being verified/i)).toBeInTheDocument());
    const statusCalls = vi.mocked(fetch).mock.calls.filter((call) => String(call[0]).includes("/storefront/payments/status"));
    expect(statusCalls).toHaveLength(0);
    expect(screen.getByText(/order link from your order confirmation screen/i)).toBeInTheDocument();
  });

  it("a guest with a bridged recovery token (stored before the PayU redirect) is reconciled by that token, and the token is cleared once resolved", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue(null);
    storeGuestPaymentToken("guest-recovery-token-abc");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/storefront/payments/status")) {
        return Promise.resolve(
          jsonResponse({ success: true, data: { paymentStatus: "paid", orderId: 42, orderStatus: "confirmed", amount: "500.00", currency: "INR", commerceException: null } })
        );
      }
      return Promise.resolve(jsonResponse({ success: true, data: null }));
    });

    render(
      <CustomerAuthProvider>
        <PaymentResultClient status="success" txnid="PAY-000123" orderId="42" />
      </CustomerAuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/Payment confirmed/i)).toBeInTheDocument());
    const statusCall = vi.mocked(fetch).mock.calls.find((call) => String(call[0]).includes("/storefront/payments/status"));
    const requestBody = JSON.parse(String(statusCall?.[1]?.body));
    expect(requestBody).toEqual({ guestAccessToken: "guest-recovery-token-abc" });
    // No deep-link is offered to an unauthenticated caller — same as before.
    expect(screen.queryByRole("link", { name: /View Order Status/i })).not.toBeInTheDocument();
    await waitFor(() => expect(readGuestPaymentToken()).toBeNull());
  });
});
