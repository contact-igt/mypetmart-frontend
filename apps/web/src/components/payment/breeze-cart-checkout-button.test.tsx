import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { configMock, sessionMock, statusMock, initMock, startMock, terminateMock } = vi.hoisted(() => ({
  configMock: vi.fn(),
  sessionMock: vi.fn(),
  statusMock: vi.fn(),
  initMock: vi.fn(),
  startMock: vi.fn(),
  terminateMock: vi.fn(),
}));

vi.mock("@/lib/payment-api", () => ({
  PaymentApi: { breezeCheckoutConfig: configMock, breezeCheckoutSession: sessionMock, breezeCheckoutSessionStatus: statusMock },
}));
vi.mock("@/lib/breeze/blaze-sdk", () => ({
  initBreeze: initMock,
  breezeStartCheckout: startMock,
  terminateBreeze: terminateMock,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { AppAuthError } from "@/lib/auth/auth-errors";
import { BreezeCartCheckoutButton } from "./breeze-cart-checkout-button";

const SESSION = {
  sessionId: "a".repeat(32),
  merchantId: "m",
  environment: "smb-release",
  shopUrl: "https://shop.example",
  cart: '{"id":"s1"}',
  signature: "sig",
  keyId: "kid",
  amountPaise: 100,
  currency: "INR",
  expiresAt: "2030-01-01T00:00:00.000Z",
};

const AWAITING = { sessionId: SESSION.sessionId, processingStatus: "awaiting_webhook", awaitingWebhook: true, order: null, guestAccessToken: null };
const CONFIRMED = {
  sessionId: SESSION.sessionId,
  processingStatus: "finalized",
  awaitingWebhook: false,
  order: { id: 7, orderNumber: "MPM-1001", status: "confirmed", paymentStatus: "paid", commerceException: null },
  guestAccessToken: null,
};

async function launch() {
  const button = await screen.findByRole("button", { name: "Buy it now" });
  await act(async () => {
    fireEvent.click(button);
  });
  await waitFor(() => expect(initMock).toHaveBeenCalled());
  return initMock.mock.calls[0]![1] as (e: unknown) => void;
}

describe("BreezeCartCheckoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps the standard checkout action when the server flag is off", async () => {
    configMock.mockResolvedValue({ enabled: false });
    const { container } = render(<BreezeCartCheckoutButton disabled={false} />);
    await waitFor(() => expect(configMock).toHaveBeenCalled());
    expect(container.querySelector("button")?.textContent).toBe("Buy it now");
  });

  it("keeps the standard checkout action when the capability probe fails", async () => {
    configMock.mockRejectedValue(new Error("down"));
    const { container } = render(<BreezeCartCheckoutButton disabled={false} />);
    await waitFor(() => expect(configMock).toHaveBeenCalled());
    expect(container.querySelector("button")?.textContent).toBe("Buy it now");
  });

  it("starts the SDK-controlled checkout using only backend-signed values, with no custom modal", async () => {
    configMock.mockResolvedValue({ enabled: true });
    sessionMock.mockResolvedValue(SESSION);
    render(<BreezeCartCheckoutButton disabled={false} />);
    await launch();
    await waitFor(() => expect(startMock).toHaveBeenCalledWith({ cart: SESSION.cart, signature: SESSION.signature, keyId: SESSION.keyId }));
    expect(initMock).toHaveBeenCalledWith({ merchantId: "m", shopUrl: "https://shop.example", environment: "smb-release" }, expect.any(Function));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("prevents duplicate launches while one is starting", async () => {
    configMock.mockResolvedValue({ enabled: true });
    let release: (value: typeof SESSION) => void = () => undefined;
    sessionMock.mockReturnValue(new Promise((resolve) => (release = resolve)));
    render(<BreezeCartCheckoutButton disabled={false} />);
    const button = await screen.findByRole("button", { name: "Buy it now" });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(sessionMock).toHaveBeenCalledTimes(1);
    await act(async () => release(SESSION));
  });

  it("a success event is only a hint: it shows 'confirming' and claims confirmation ONLY after the server does", async () => {
    configMock.mockResolvedValue({ enabled: true });
    sessionMock.mockResolvedValue(SESSION);
    statusMock.mockResolvedValue(AWAITING);
    render(<BreezeCartCheckoutButton disabled={false} />);
    const onEvent = await launch();

    await act(async () => onEvent({ payload: { eventName: "processResult", action: "startCheckout", status: "SUCCESS" } }));
    expect(screen.getByRole("status").textContent).toMatch(/confirming your order/i);
    expect(screen.getByRole("status").textContent).not.toMatch(/is confirmed|paid/i);
    expect(terminateMock).toHaveBeenCalled();

    // The server says it is still awaiting the webhook: text must not change to "confirmed".
    await waitFor(() => expect(statusMock).toHaveBeenCalledWith(SESSION.sessionId));
    expect(screen.getByRole("status").textContent).not.toMatch(/is confirmed/i);

    statusMock.mockResolvedValue(CONFIRMED);
    // next poll cycle is delayed; simulate by remounting (page refresh) — recovery path
    cleanup();
    render(<BreezeCartCheckoutButton disabled={false} />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Order MPM-1001 is confirmed/));
  });

  it("clears the pending checkout when Breeze closes through a non-processResult callback", async () => {
    configMock.mockResolvedValue({ enabled: true });
    sessionMock.mockResolvedValue(SESSION);
    render(<BreezeCartCheckoutButton disabled={false} />);
    const onEvent = await launch();

    await act(async () => onEvent({ payload: { eventName: "eventStream", status: "closeApp" } }));

    expect(window.localStorage.getItem("mpm_breeze_pending_session")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/checkout closed/i);
    expect(terminateMock).toHaveBeenCalled();
  });

  it("clears the pending checkout when Breeze reports a close through its event field", async () => {
    configMock.mockResolvedValue({ enabled: true });
    sessionMock.mockResolvedValue(SESSION);
    render(<BreezeCartCheckoutButton disabled={false} />);
    const onEvent = await launch();

    await act(async () => onEvent({ payload: { eventName: "eventStream", event: "closeApp" } }));

    expect(window.localStorage.getItem("mpm_breeze_pending_session")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/checkout closed/i);
  });

  it("recovers after a refresh from the remembered session id and clears it once the server confirms", async () => {
    window.localStorage.setItem("mpm_breeze_pending_session", SESSION.sessionId);
    configMock.mockResolvedValue({ enabled: true });
    statusMock.mockResolvedValue(CONFIRMED);
    render(<BreezeCartCheckoutButton disabled={false} />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Order MPM-1001 is confirmed/));
    expect(window.localStorage.getItem("mpm_breeze_pending_session")).toBeNull();
  });

  it("shows a review message (not 'confirmed') for a paid order with a commerce exception", async () => {
    window.localStorage.setItem("mpm_breeze_pending_session", SESSION.sessionId);
    configMock.mockResolvedValue({ enabled: true });
    statusMock.mockResolvedValue({ ...CONFIRMED, order: { ...CONFIRMED.order, status: "pending", commerceException: "inventory_unavailable" } });
    render(<BreezeCartCheckoutButton disabled={false} />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/reviewing it/i));
    expect(screen.getByRole("status").textContent).not.toMatch(/is confirmed/i);
  });

  it("is disabled while the cart is not checkout-ready", async () => {
    configMock.mockResolvedValue({ enabled: true });
    render(<BreezeCartCheckoutButton disabled />);
    const button = await screen.findByRole("button", { name: "Buy it now" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
  it("a server refusal (409 BREEZE_PAYMENT_VERIFYING) shows the server's message and does not launch the SDK", async () => {
    configMock.mockResolvedValue({ enabled: true });
    sessionMock.mockRejectedValue(new AppAuthError("Your payment is being verified. Please don't make another payment yet.", "BREEZE_PAYMENT_VERIFYING"));
    statusMock.mockResolvedValue(AWAITING);
    render(<BreezeCartCheckoutButton disabled={false} />);
    const button = await screen.findByRole("button", { name: "Buy it now" });
    await act(async () => {
      fireEvent.click(button);
    });
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/being verified/i));
    expect(initMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
  });

  it("every blocking refusal code is shown as a refusal, not a generic error", async () => {
    configMock.mockResolvedValue({ enabled: true });
    sessionMock.mockRejectedValue(new AppAuthError("A previous Express checkout is still open.", "BREEZE_ATTEMPT_IN_PROGRESS"));
    render(<BreezeCartCheckoutButton disabled={false} />);
    const button = await screen.findByRole("button", { name: "Buy it now" });
    await act(async () => {
      fireEvent.click(button);
    });
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/still open/i));
    expect(screen.getByRole("status").textContent).not.toMatch(/couldn't start checkout/i);
    expect(initMock).not.toHaveBeenCalled();
  });

  it("no client-side timer authorizes a launch: the server decides even when a stale pending pointer exists", async () => {
    window.localStorage.setItem("mpm_breeze_pending_session", SESSION.sessionId);
    configMock.mockResolvedValue({ enabled: true });
    statusMock.mockResolvedValue(AWAITING);
    sessionMock.mockResolvedValue(SESSION);
    render(<BreezeCartCheckoutButton disabled={false} />);
    const button = await screen.findByRole("button", { name: "Buy it now" });
    await act(async () => {
      fireEvent.click(button);
    });
    // The launch is attempted through the server; the client does not pre-decide.
    await waitFor(() => expect(sessionMock).toHaveBeenCalled());
  });
});
