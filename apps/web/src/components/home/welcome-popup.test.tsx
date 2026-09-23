import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPopup: vi.fn(),
  subscribe: vi.fn(),
  applyCoupon: vi.fn(),
  push: vi.fn()
}));

vi.mock("@/lib/storefront-api", () => ({ getStorefrontWelcomePopup: mocks.getPopup }));
vi.mock("@/lib/newsletter-api", () => ({ NewsletterApi: { subscribe: mocks.subscribe } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/context/cart-context", () => ({ useCart: () => ({ applyCoupon: mocks.applyCoupon, isUpdatingCoupon: false }) }));

import { WelcomePopup } from "./welcome-popup";

const popup = {
  id: 11,
  template: "template_1" as const,
  heading: "A little welcome for your pet",
  description: "New arrivals, useful essentials, and pet-parent tips.",
  offerLabel: null,
  ctaLabel: "Unlock offers",
  ctaUrl: null,
  ctaMode: "email_signup" as const,
  consentText: "You can unsubscribe at any time.",
  dismissLabel: "No thanks",
  displayDelayMs: 0,
  dismissalCooldownDays: 7,
  desktopImageUrl: "https://example.test/popup.jpg",
  desktopImageAlt: "A happy dog",
  mobileImageUrl: null,
  mobileImageAlt: null
};

describe("WelcomePopup", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
    HTMLDialogElement.prototype.close = function close() { this.open = false; this.dispatchEvent(new Event("close")); };
    window.localStorage.clear();
    window.sessionStorage.clear();
    mocks.getPopup.mockReset();
    mocks.subscribe.mockReset();
    mocks.applyCoupon.mockReset();
    mocks.push.mockReset();
    mocks.getPopup.mockResolvedValue(popup);
    mocks.subscribe.mockResolvedValue({ message: "Check your inbox to confirm your subscription." });
  });

  afterEach(() => vi.clearAllMocks());

  it("renders nothing when there is no active popup or the fetch fails", async () => {
    mocks.getPopup.mockResolvedValueOnce(null);
    const { unmount } = render(<WelcomePopup delayMs={0} fetchPopup={mocks.getPopup} />);
    await waitFor(() => expect(mocks.getPopup).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    unmount();
    mocks.getPopup.mockRejectedValueOnce(new Error("offline"));
    render(<WelcomePopup delayMs={0} fetchPopup={mocks.getPopup} />);
    await waitFor(() => expect(mocks.getPopup).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows template 1, dismisses it, and subscribes with the popup source", async () => {
    render(<WelcomePopup delayMs={0} dismissalCooldownMs={60_000} initialPopup={popup} />);
    const email = await screen.findByLabelText("Email address");
    expect(screen.queryByText("Welcome to MyPetMart")).not.toBeInTheDocument();
    expect(screen.getByText("A little welcome for your pet")).toBeInTheDocument();
    expect(screen.getByText("No thanks")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("mypetmart:welcome-popup:shown:11")).toBe("1");

    fireEvent.change(email, { target: { value: "petparent@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock offers" }));
    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalledWith("petparent@example.com", "welcome_popup"));
    expect(await screen.findByRole("status")).toHaveTextContent("Check your inbox to confirm your subscription.");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss welcome offer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.localStorage.getItem("mypetmart:welcome-popup:dismissed:11")).not.toBeNull();
  });

  it("renders the rectangular template 2 layout", async () => {
    render(<WelcomePopup delayMs={0} initialPopup={{ ...popup, template: "template_2", heading: "PARTAKE", offerLabel: "15% OFF", description: "When you sign up for email and texts." }} />);
    expect(await screen.findByText("15% OFF")).toBeInTheDocument();
    expect(screen.getByText("PARTAKE")).toBeInTheDocument();
    expect(screen.getByText("When you sign up for email and texts.")).toBeInTheDocument();
    expect(screen.getByText("PARTAKE").compareDocumentPosition(screen.getByText("15% OFF")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("15% OFF").compareDocumentPosition(screen.getByText("When you sign up for email and texts.")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unlock offers" }).compareDocumentPosition(screen.getByText("When you sign up for email and texts.")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses the configured navigation CTA without rendering signup controls", async () => {
    render(<WelcomePopup initialPopup={{ ...popup, ctaMode: "navigation", ctaLabel: "Shop now", ctaUrl: "/shop" }} />);

    const link = await screen.findByRole("link", { name: "Shop now" });
    expect(link).toHaveAttribute("href", "/shop");
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByText("You can unsubscribe at any time.")).not.toBeInTheDocument();
    expect(screen.getByText(popup.description).compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(link);
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it("validates an associated coupon through the cart before navigating", async () => {
    mocks.applyCoupon.mockResolvedValue({});
    render(<WelcomePopup delayMs={0} initialPopup={{ ...popup, couponCode: "WELCOME10" }} />);

    expect(await screen.findByText("WELCOME10")).toBeInTheDocument();
    expect(mocks.applyCoupon).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Apply in cart" }));
    await waitFor(() => expect(mocks.applyCoupon).toHaveBeenCalledWith("WELCOME10"));
    expect(mocks.push).toHaveBeenCalledWith("/cart");
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it("uses the saved delay and keeps each popup's cooldown independent", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-09-22T10:00:00.000Z").valueOf();
    vi.setSystemTime(now);
    window.localStorage.setItem("mypetmart:welcome-popup:dismissed:11", String(now));

    const { unmount } = render(<WelcomePopup initialPopup={{ ...popup, displayDelayMs: 500, dismissalCooldownDays: 1 }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();

    window.sessionStorage.clear();
    render(<WelcomePopup initialPopup={{ ...popup, id: 12, displayDelayMs: 500, dismissalCooldownDays: 1 }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(499); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("shows again after the configured cooldown has expired", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-09-22T10:00:00.000Z").valueOf();
    vi.setSystemTime(now);
    window.localStorage.setItem("mypetmart:welcome-popup:dismissed:11", String(now - 24 * 60 * 60 * 1_000));

    render(<WelcomePopup initialPopup={{ ...popup, displayDelayMs: 300, dismissalCooldownDays: 1 }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
