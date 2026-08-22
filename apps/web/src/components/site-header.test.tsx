// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SiteHeader } from "./site-header";
import { CustomerAuthProvider } from "../context/customer-auth-context";
import { WishlistProvider } from "../context/wishlist-context";
import { CartProvider } from "../context/cart-context";
import { AuthTokenStore } from "../lib/auth/auth-api";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => mockPathname,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => body } as any;
}

function mergeResponse() {
  return jsonResponse({
    success: true,
    data: {
      cart: { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] },
      mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] },
    },
  });
}

function renderHeader() {
  return render(
    <CustomerAuthProvider>
      <WishlistProvider>
        <CartProvider>
          <SiteHeader />
        </CartProvider>
      </WishlistProvider>
    </CustomerAuthProvider>
  );
}

describe("SiteHeader Wishlist link", () => {
  beforeEach(() => {
    mockPathname = "/";
    const fetchMock = vi.fn(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart")) {
        if (urlStr.includes("/merge") && init?.method === "POST") {
          return mergeResponse();
        }
        if (init?.method === "GET") {
          return jsonResponse({
            success: true,
            data: { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] },
          });
        }
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);
    AuthTokenStore.setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hides the desktop Search icon on the Shop page", () => {
    mockPathname = "/shop";
    renderHeader();

    // The remaining control belongs to the collapsed mobile navigation.
    expect(screen.getAllByLabelText("Search products")).toHaveLength(1);
  });

  it("points the header Wishlist icon at /signin for a logged-out visitor", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    renderHeader();

    // Desktop header and the mobile nav panel both render a "Wishlist" control.
    await waitFor(() => {
      const links = screen.getAllByLabelText("Wishlist").map((el) => el.closest("a"));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute("href", "/signin");
      }
    });

    const accountButton = screen.getByTestId("account-menu-trigger");
    expect(within(accountButton).getByText("Sign In")).toBeInTheDocument();
    expect(accountButton).toHaveAttribute("aria-label", "Sign in to MyPetMart");
    fireEvent.click(accountButton);
    const menu = within(accountButton.closest("details")!);
    expect(menu.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/signin");
    expect(menu.getByRole("link", { name: "Create Account" })).toHaveAttribute("href", "/signup");
    expect(menu.queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument();
    expect(menu.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    expect(menu.queryByRole("link", { name: "My Orders" })).not.toBeInTheDocument();
    expect(menu.queryByRole("link", { name: "My Returns" })).not.toBeInTheDocument();
    expect(menu.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    expect(menu.queryByRole("link", { name: "Address Book" })).not.toBeInTheDocument();
  });

  it("does not flash 'Sign In' while the auth check is still loading", async () => {
    // Stays pending during the assertions below, so the provider stays in "loading".
    let releasePendingFetch: (() => void) | undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          releasePendingFetch = () => reject(new Error("network error"));
        })
    );

    renderHeader();

    const accountButton = screen.getByTestId("account-menu-trigger");
    expect(within(accountButton).queryByText("Sign In")).not.toBeInTheDocument();
    expect(within(accountButton).queryByText(/^Hi,/)).not.toBeInTheDocument();
    expect(accountButton).toHaveAttribute("aria-label", "Account menu");

    // Settle the pending request so it doesn't leak the module-level
    // single-flight refresh promise into later tests.
    releasePendingFetch?.();
    await waitFor(() =>
      expect(accountButton).toHaveAttribute("aria-label", "Sign in to MyPetMart")
    );
  });

  it("shows signed-in Wishlist and account dropdown links", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: "test-token" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 5, name: "Test Customer", role: "customer" } }))
      .mockResolvedValueOnce(mergeResponse());

    renderHeader();

    await waitFor(() => {
      const links = screen.getAllByLabelText("Wishlist").map((el) => el.closest("a"));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute("href", "/wishlist");
      }
    });

    const accountButton = screen.getByTestId("account-menu-trigger");
    expect(within(accountButton).getByText("Hi, Test")).toBeInTheDocument();
    expect(accountButton).toHaveAttribute("aria-label", "Open account menu for Test");
    fireEvent.click(accountButton);
    const accountMenu = within(accountButton.closest("details")!);

    expect(accountMenu.getByText("Hi, Test Customer")).toBeInTheDocument();
    expect(accountMenu.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/account");
    expect(accountMenu.getByRole("link", { name: "My Orders" })).toHaveAttribute("href", "/account/orders");
    expect(accountMenu.getByRole("link", { name: "My Returns" })).toHaveAttribute("href", "/account/returns");
    expect(accountMenu.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/account/profile");
    expect(accountMenu.getByRole("link", { name: "Address Book" })).toHaveAttribute("href", "/account/addresses");
    expect(accountMenu.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
    expect(accountMenu.queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
  });

  it("falls back to the full name when a customer has no separate first name", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: "test-token" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 6, name: "Cher", role: "customer" } }))
      .mockResolvedValueOnce(mergeResponse());

    renderHeader();

    const accountButton = screen.getByTestId("account-menu-trigger");
    await waitFor(() => {
      expect(within(accountButton).getByText("Hi, Cher")).toBeInTheDocument();
    });
  });

  it("returns to 'Sign In' after signing out", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: "test-token" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 5, name: "Test Customer", role: "customer" } }))
      .mockResolvedValueOnce(mergeResponse());

    renderHeader();

    const accountButton = screen.getByTestId("account-menu-trigger");
    await waitFor(() => {
      expect(within(accountButton).getByText("Hi, Test")).toBeInTheDocument();
    });

    fireEvent.click(accountButton);
    const signOutButton = within(accountButton.closest("details")!).getByRole("button", { name: "Sign Out" });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(within(accountButton).getByText("Sign In")).toBeInTheDocument();
    });
  });
});
