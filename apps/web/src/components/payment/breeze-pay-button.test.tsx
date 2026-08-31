// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BreezePayButton } from "./breeze-pay-button";
import { PaymentApi } from "@/lib/payment-api";
import { readGuestPaymentToken } from "@/app/order/payment/guest-payment-token";
import type { BreezeStartPaymentParamsJSON } from "@/types/payment";
import type { BreezeCallbackEvent } from "@/lib/breeze/types";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

// Capture the SDK callback so the test can drive Breeze events.
let sdkOnEvent: ((e: BreezeCallbackEvent) => void) | null = null;
const initBreezeMock = vi.fn((_: unknown, onEvent: (e: BreezeCallbackEvent) => void) => {
  sdkOnEvent = onEvent;
});
const sendOtpMock = vi.fn();
const verifyOtpMock = vi.fn();
const startPaymentMock = vi.fn();

vi.mock("@/lib/breeze/blaze-sdk", () => ({
  initBreeze: (p: unknown, cb: (e: BreezeCallbackEvent) => void) => initBreezeMock(p, cb),
  breezeSendOtp: (i: unknown) => sendOtpMock(i),
  breezeVerifyOtp: (i: unknown) => verifyOtpMock(i),
  breezeStartPayment: (i: unknown) => startPaymentMock(i),
  terminateBreeze: () => {},
  isBreezeInitialized: () => true,
  normalizeBreezeEnvironment: (v: string) => v,
}));

function params(overrides: Partial<BreezeStartPaymentParamsJSON> = {}): BreezeStartPaymentParamsJSON {
  return {
    provider: "breeze",
    merchantId: "mypetmart",
    environment: "smb-release",
    shopUrl: "https://mypetmart.org",
    orderRef: "BRZ-000042-abcdef0123",
    amountPaise: 89900,
    currency: "INR",
    customerPhone: "9876543210",
    customerEmail: "guest@example.com",
    customerName: "Jordan Rivera",
    returnUrl: "https://mypetmart.org/order/payment/result?provider=breeze&orderId=42",
    orderId: 42,
    ...overrides,
  };
}

async function startToPhone(input: Parameters<typeof BreezePayButton>[0]["input"] = { orderId: 42 }) {
  vi.spyOn(PaymentApi, "breezeInitiate").mockResolvedValue(params());
  render(<BreezePayButton input={input} />);
  fireEvent.click(screen.getByRole("button", { name: "Pay with Breeze" }));
  await waitFor(() => expect(screen.getByLabelText("Mobile number")).toBeInTheDocument());
}

describe("BreezePayButton", () => {
  beforeEach(() => {
    sdkOnEvent = null;
    pushMock.mockReset();
    initBreezeMock.mockClear();
    sendOtpMock.mockClear();
    verifyOtpMock.mockClear();
    startPaymentMock.mockClear();
    window.sessionStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it("calls the backend initiate endpoint, initializes the SDK, and shows the phone step prefilled from the server", async () => {
    await startToPhone();
    expect(PaymentApi.breezeInitiate).toHaveBeenCalledWith({ orderId: 42 });
    expect(initBreezeMock).toHaveBeenCalledWith(
      { merchantId: "mypetmart", shopUrl: "https://mypetmart.org", environment: "smb-release" },
      expect.any(Function),
    );
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("9876543210");
  });

  it("runs the documented sendOTP -> verifyOTP -> startPayment sequence with server-authoritative values", async () => {
    await startToPhone();

    fireEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    expect(sendOtpMock).toHaveBeenCalledWith({ phoneNumber: "9876543210", countryCode: "+91" });

    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "sendOTP", status: "success", otpSessionToken: "otp-sess-1" } }));
    await waitFor(() => expect(screen.getByLabelText("Enter OTP")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Enter OTP"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Continue to Payment" }));
    expect(verifyOtpMock).toHaveBeenCalledWith({ otp: "123456", otpSessionToken: "otp-sess-1" });

    act(() =>
      sdkOnEvent!({ payload: { eventName: "process", action: "verifyOTP", status: "success", customer: { customerId: "cust_1" }, token: "tok_1" } }),
    );
    await waitFor(() => expect(startPaymentMock).toHaveBeenCalledTimes(1));
    expect(startPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "BRZ-000042-abcdef0123", // provider_order_id, not the numeric id
        amount: 89900, // paise, server-authoritative
        currency: "INR",
        customerId: "cust_1",
        customerPhone: "9876543210",
      }),
    );
  });

  it("navigates to the non-authoritative result page on processResult SUCCESS (never marks paid itself)", async () => {
    await startToPhone();
    fireEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "sendOTP", status: "success", otpSessionToken: "s" } }));
    await waitFor(() => screen.getByLabelText("Enter OTP"));
    fireEvent.change(screen.getByLabelText("Enter OTP"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Continue to Payment" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "verifyOTP", status: "success", customer: { customerId: "c" } } }));
    await waitFor(() => expect(startPaymentMock).toHaveBeenCalled());

    act(() => sdkOnEvent!({ payload: { eventName: "processResult", action: "startPayment", status: "SUCCESS", orderId: "x" } }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    expect(pushMock.mock.calls[0]![0]).toContain("/order/payment/result?");
    expect(pushMock.mock.calls[0]![0]).toContain("provider=breeze");
    expect(pushMock.mock.calls[0]![0]).toContain("orderId=42");
  });

  it("routes processResult FAILED to the failure result page", async () => {
    await startToPhone();
    fireEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "sendOTP", status: "success", otpSessionToken: "s" } }));
    await waitFor(() => screen.getByLabelText("Enter OTP"));
    fireEvent.change(screen.getByLabelText("Enter OTP"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Continue to Payment" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "verifyOTP", status: "success", customer: { customerId: "c" } } }));
    await waitFor(() => expect(startPaymentMock).toHaveBeenCalled());

    act(() => sdkOnEvent!({ payload: { eventName: "processResult", status: "FAILED" } }));
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(pushMock.mock.calls[0]![0]).toContain("status=failure");
  });

  it("shows a resumable state (no dead end) when the customer exits the payment window", async () => {
    await startToPhone();
    fireEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "sendOTP", status: "success", otpSessionToken: "s" } }));
    await waitFor(() => screen.getByLabelText("Enter OTP"));
    fireEvent.change(screen.getByLabelText("Enter OTP"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Continue to Payment" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "verifyOTP", status: "success", customer: { customerId: "c" } } }));
    await waitFor(() => expect(startPaymentMock).toHaveBeenCalled());

    act(() => sdkOnEvent!({ payload: { eventName: "processResult", status: "backPressed" } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Try payment again" })).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows an inline error for an invalid mobile number and never calls the SDK", async () => {
    await startToPhone();
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(sendOtpMock).not.toHaveBeenCalled();
  });

  it("surfaces a failed OTP send and keeps the customer on the phone step", async () => {
    await startToPhone();
    fireEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "sendOTP", status: "error", message: "Number blocked" } }));
    expect(await screen.findByText("Number blocked")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toBeInTheDocument();
  });

  it("bridges a guest recovery token to sessionStorage before leaving for the result page", async () => {
    await startToPhone({ guestAccessToken: "guest-token-xyz" });
    fireEvent.click(screen.getByRole("button", { name: "Send OTP" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "sendOTP", status: "success", otpSessionToken: "s" } }));
    await waitFor(() => screen.getByLabelText("Enter OTP"));
    fireEvent.change(screen.getByLabelText("Enter OTP"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Continue to Payment" }));
    act(() => sdkOnEvent!({ payload: { eventName: "process", action: "verifyOTP", status: "success", customer: { customerId: "c" } } }));
    await waitFor(() => expect(startPaymentMock).toHaveBeenCalled());
    act(() => sdkOnEvent!({ payload: { eventName: "processResult", status: "SUCCESS" } }));
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(readGuestPaymentToken()).toBe("guest-token-xyz");
  });
});
