// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SiteHeader } from "./site-header";
import { CustomerAuthProvider } from "../context/customer-auth-context";
import { WishlistProvider } from "../context/wishlist-context";
import { CartProvider } from "../context/cart-context";
import { AuthTokenStore } from "../lib/auth/auth-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => body } as any;
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
    const fetchMock = vi.fn(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart")) {
        if (urlStr.includes("/merge") && init?.method === "POST") {
          return jsonResponse({
            cart: { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] },
            mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] },
          });
        }
        if (init?.method === "GET") {
          return jsonResponse({ id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] });
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
  });

  it("points the header Wishlist icon at /wishlist for a signed-in customer", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: "test-token" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 5, name: "Test Customer", role: "customer" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }));

    renderHeader();

    await waitFor(() => {
      const links = screen.getAllByLabelText("Wishlist").map((el) => el.closest("a"));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute("href", "/wishlist");
      }
    });
  });
});
