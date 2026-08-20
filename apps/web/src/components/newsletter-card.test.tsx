// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NewsletterCard } from "./newsletter-card";
import { AuthTokenStore } from "../lib/auth/auth-api";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => body } as any;
}

describe("NewsletterCard", () => {
  beforeEach(() => {
    AuthTokenStore.setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("submits the entered email and shows the confirmation message on success", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: true, data: { message: "Check your inbox to confirm your subscription." } })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<NewsletterCard />);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => {
      expect(screen.getByText("Check your inbox to confirm your subscription.")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5000/api/v1/storefront/newsletter/subscribe",
      expect.objectContaining({ method: "POST" })
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ email: "reader@example.com", source: "footer" });
  });

  it("shows an inline error and keeps the form when the request fails", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: false, error: { code: "NEWSLETTER_EMAIL_DELIVERY_FAILED", message: "We couldn't send the confirmation email. Please try again later." } }, false)
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<NewsletterCard />);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't send the confirmation email. Please try again later.");
    });
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
  });

  it("does not call the API for an empty email", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<NewsletterCard />);

    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address.");
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
