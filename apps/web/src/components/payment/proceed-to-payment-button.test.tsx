// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProceedToPaymentButton } from "./proceed-to-payment-button";
import { PaymentApi } from "@/lib/payment-api";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { readGuestPaymentToken } from "@/app/order/payment/guest-payment-token";
import type { PaymentInitiationResultJSON } from "@/types/payment";

function mockResult(overrides: Partial<PaymentInitiationResultJSON["fields"]> = {}): PaymentInitiationResultJSON {
  return {
    provider: "payu",
    gatewayUrl: "https://test.payu.in/_payment",
    fields: {
      key: "testkey",
      txnid: "PAY-000123",
      amount: "899.00",
      productinfo: "MyPetMart Order ORD-000042",
      firstname: "Jordan",
      email: "guest@example.com",
      phone: "+919876543210",
      surl: "https://storefront.example.com/order/payment/success",
      furl: "https://storefront.example.com/order/payment/failure",
      udf1: "42",
      hash: "deadbeef",
      ...overrides,
    },
  };
}

describe("ProceedToPaymentButton", () => {
  let submitSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    submitSpy = vi.fn();
    // jsdom does not implement real form submission/navigation.
    HTMLFormElement.prototype.submit = submitSpy as unknown as typeof HTMLFormElement.prototype.submit;
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initiates payment and auto-submits a hidden form with every returned field to PayU's gatewayUrl", async () => {
    vi.spyOn(PaymentApi, "initiate").mockResolvedValue(mockResult());

    render(<ProceedToPaymentButton input={{ orderId: 42 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Proceed to Payment" }));

    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));

    expect(PaymentApi.initiate).toHaveBeenCalledWith({ orderId: 42 });

    const form = document.querySelector("form")!;
    expect(form.getAttribute("action")).toBe("https://test.payu.in/_payment");
    expect(form.getAttribute("method")?.toUpperCase()).toBe("POST");

    const result = mockResult();
    for (const [name, value] of Object.entries(result.fields)) {
      const input = form.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      expect(input?.value).toBe(value);
      expect(input?.type).toBe("hidden");
    }
  });

  it("never renders a card/CVV/UPI PIN field — only opaque hidden fields for the PayU handoff", async () => {
    vi.spyOn(PaymentApi, "initiate").mockResolvedValue(mockResult());

    render(<ProceedToPaymentButton input={{ guestAccessToken: "a".repeat(64) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Proceed to Payment" }));

    await waitFor(() => expect(submitSpy).toHaveBeenCalled());

    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cvv/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/upi/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll('input[type="hidden"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('input:not([type="hidden"])').length).toBe(0);
  });

  it("shows an inline error and does not submit any form when initiation fails", async () => {
    vi.spyOn(PaymentApi, "initiate").mockRejectedValue(new AppAuthError("Order not found.", "ORDER_NOT_FOUND"));

    render(<ProceedToPaymentButton input={{ orderId: 42 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Proceed to Payment" }));

    await waitFor(() => expect(screen.getByText("Order not found.")).toBeInTheDocument());
    expect(submitSpy).not.toHaveBeenCalled();
    expect(document.querySelector("form")).toBeNull();
  });

  it("bridges a guest's recovery token to sessionStorage before handing off to PayU, so the result page can reconcile after the round trip", async () => {
    vi.spyOn(PaymentApi, "initiate").mockResolvedValue(mockResult());

    render(<ProceedToPaymentButton input={{ guestAccessToken: "guest-token-xyz" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Proceed to Payment" }));

    await waitFor(() => expect(submitSpy).toHaveBeenCalled());
    expect(readGuestPaymentToken()).toBe("guest-token-xyz");
  });

  it("does not touch guest token storage for a customer (orderId) initiation", async () => {
    vi.spyOn(PaymentApi, "initiate").mockResolvedValue(mockResult());

    render(<ProceedToPaymentButton input={{ orderId: 42 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Proceed to Payment" }));

    await waitFor(() => expect(submitSpy).toHaveBeenCalled());
    expect(readGuestPaymentToken()).toBeNull();
  });

  it("disables the button while the initiation request is in flight", async () => {
    let resolvePromise: (value: PaymentInitiationResultJSON) => void = () => {};
    vi.spyOn(PaymentApi, "initiate").mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<ProceedToPaymentButton input={{ orderId: 42 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Proceed to Payment" }));

    expect(screen.getByRole("button", { name: "Starting payment..." })).toBeDisabled();

    resolvePromise(mockResult());
    await waitFor(() => expect(submitSpy).toHaveBeenCalled());
  });
});
